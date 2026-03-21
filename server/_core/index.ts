import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeWebSocket } from "./websocket";
import "./deadline-checker"; // Inicializar verificador de prazos
import { initEmbeddingsScheduler } from "../embeddings-scheduler"; // Cron de rebuild de embeddings CNAE
import { initMonthlyReportJob } from "../jobs/monthlyReportJob"; // Sprint L2: Cron de relatório mensal CPIE
import { checkCnaeHealth } from "../cnae-health"; // Health check do pipeline CNAE
import { getBuildVersionInfo } from "../build-version"; // Informações de versão do build
import { validateCnaePipeline } from "../cnae-pipeline-validator"; // Validação on-demand do pipeline
import { warmUpEmbeddingCache } from "../cnae-embeddings"; // Warm-up do cache de embeddings
import { notifyOwner } from "./notification"; // Notificações ao owner

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ── Health check do pipeline CNAE Discovery ─────────────────────────────
  // GET /api/health/cnae — retorna status do pipeline sem autenticação
  // Útil para diagnósticos rápidos sem acesso a logs de produção
  app.get("/api/health/cnae", async (_req, res) => {
    try {
      const health = await checkCnaeHealth();
      const httpStatus = health.status === "ok" ? 200 : health.status === "degraded" ? 200 : 503;
      res.status(httpStatus).json(health);
    } catch (err) {
      res.status(500).json({
        checkedAt: new Date().toISOString(),
        status: "down",
        summary: `Erro interno no health check: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────

  // ── Validação on-demand do pipeline CNAE ──────────────────────────────
  // GET /api/health/cnae/validate — executa os 4 casos canônicos de busca semântica
  // Permite verificar o pipeline imediatamente após deploy ou rebuild manual
  // ATENÇÃO: consome tokens da OpenAI (4 embeddings + 0 LLM calls) — use com parcimônia
  app.get("/api/health/cnae/validate", async (_req, res) => {
    const startedAt = new Date().toISOString();
    try {
      const result = await validateCnaePipeline();
      const httpStatus = result.success ? 200 : 503;
      res.status(httpStatus).json({
        startedAt,
        finishedAt: new Date().toISOString(),
        ...result,
      });
    } catch (err) {
      res.status(500).json({
        startedAt,
        finishedAt: new Date().toISOString(),
        passed: false,
        error: `Erro interno na validação: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────

  // ── Versão do build e controle de deploy ───────────────────────────────
  // GET /api/version — retorna git hash, timestamp do build e versão semântica
  // Permite confirmar que o deploy em produção está rodando o código correto
  app.get("/api/version", (_req, res) => {
    try {
      const info = getBuildVersionInfo();
      res.status(200).json(info);
    } catch (err) {
      res.status(500).json({
        error: `Erro ao obter versão: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Inicializar WebSocket
  initializeWebSocket(server);
  console.log("[WebSocket] Servidor WebSocket inicializado");

  // Inicializar cron de rebuild automático de embeddings CNAE (toda segunda-feira às 03:00)
  initEmbeddingsScheduler();
  // Sprint L2: Cron de relatório mensal CPIE (todo dia às 08:00, verifica se é o dia configurado)
  initMonthlyReportJob();

  // ── Warm-up do cache de embeddings CNAE ───────────────────────────────────
  // Elimina o cold start: carrega os 1.332 embeddings em memória durante o startup
  // para que a primeira requisição do usuário não precise esperar o carregamento
  setImmediate(async () => {
    try {
      const warmup = await warmUpEmbeddingCache();
      if (warmup.loaded) {
        console.log(`[startup] ✅ Cache de embeddings pré-carregado: ${warmup.size} CNAEs em ${warmup.durationMs}ms`);
      } else {
        console.warn("[startup] ⚠️ Cache de embeddings não carregado (banco indisponível?)");
      }
    } catch (err) {
      console.error("[startup] Erro no warm-up do cache de embeddings:", err);
    }
  });
  // ─────────────────────────────────────────────────────────────────────────

  // ── Alerta automático de versão pós-deploy ────────────────────────────────
  // Notifica o owner sempre que o servidor reinicia em produção,
  // confirmando qual versão está rodando e facilitando controle de deploy
  if (process.env.NODE_ENV === "production") {
    setImmediate(async () => {
      try {
        const { getBuildVersionInfo } = await import("../build-version");
        const info = getBuildVersionInfo();
        await notifyOwner({
          title: `🚀 Deploy detectado — IA Solaris v${info.version}`,
          content: [
            `**Versão:** ${info.version}`,
            `**Git Hash:** ${info.gitHash}`,
            `**Commit:** ${info.commitMessage}`,
            `**Ambiente:** ${info.env}`,
            `**Node:** ${info.nodeVersion}`,
            `**Uptime:** ${new Date().toISOString()}`,
            ``,
            `Para verificar: \`curl https://iasolaris.manus.space/api/version\``,
          ].join("\n"),
        });
        console.log(`[startup] ✅ Alerta de deploy enviado ao owner (v${info.version})`);
      } catch (err) {
        console.warn("[startup] Não foi possível enviar alerta de deploy:", err);
      }
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Timeout de 5 minutos para suportar chamadas LLM longas (ex: generateActionPlan com 4 áreas paralelas)
  server.timeout = 300_000; // 300s = 5 min
  server.keepAliveTimeout = 310_000; // ligeiramente maior que timeout

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
