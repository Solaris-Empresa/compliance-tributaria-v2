/**
 * health.ts — Gate POST-DEPLOY · Endpoint /api/health
 *
 * Endpoint PÚBLICO (sem autenticação) que retorna:
 *   - status: "healthy" | "degraded"
 *   - sha: git hash curto do deploy atual (7 chars)
 *   - sha_full: git hash completo
 *   - version: versão semântica do pipeline
 *   - timestamp: ISO 8601
 *   - checks.database: "ok" | "failed"
 *   - checks.routes: presença dos componentes críticos
 *
 * Origem: Z-02 mergeado com 47/47 PASS mas produção exibia QC legado.
 * Gate POST-DEPLOY detecta o mesmo problema em < 3 minutos.
 *
 * Referência: MANUS-GOVERNANCE.md v4.6 · ADR: N/A (governança)
 */

import { Router } from "express";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { getDb } from "../db";

export const healthRouter = Router();

/** Obtém o SHA do commit atual (short, 7 chars) */
function getDeploySha(): { short: string; full: string } {
  // Prioridade: variáveis injetadas por plataformas de deploy
  const full =
    process.env.DEPLOY_SHA ??
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.RENDER_GIT_COMMIT ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VITE_BUILD_HASH ??
    (() => {
      try {
        return execSync("git rev-parse HEAD", { timeout: 3000 }).toString().trim();
      } catch {
        return "unknown";
      }
    })();

  const short = full === "unknown" ? "unknown" : full.slice(0, 7);
  return { short, full };
}

/**
 * Verifica se um componente crítico de rota existe no filesystem.
 * Proxy de "rota ativa" — se o arquivo existe, a rota foi deployada.
 */
function checkRouteRegistered(componentPath: string): "ok" | "not_found" {
  try {
    // Usar process.cwd() para garantir o root correto em qualquer runtime (tsx, ts-node, node)
    const root = process.cwd();
    return existsSync(join(root, componentPath)) ? "ok" : "not_found";
  } catch {
    return "not_found";
  }
}

// ── GET /api/health ──────────────────────────────────────────────────────────
healthRouter.get("/health", async (_req, res) => {
  const { short: sha, full: sha_full } = getDeploySha();

  // S-01: Verificar conexão com banco
  let dbStatus: "ok" | "failed" = "ok";
  try {
    const db = await getDb();
    if (!db) {
      dbStatus = "failed";
    } else {
      await db.execute("SELECT 1");
    }
  } catch {
    dbStatus = "failed";
  }

  // S-03/S-04: Verificar rotas críticas (Z-02 — questionários novos)
  const routeChecks = {
    // S-03: /questionario-produto (Z-02 — rota nova)
    questionario_produto: checkRouteRegistered(
      "client/src/pages/QuestionarioProduto.tsx"
    ),
    // S-04: /questionario-servico (Z-02 — rota nova)
    questionario_servico: checkRouteRegistered(
      "client/src/pages/QuestionarioServico.tsx"
    ),
    // Riscos V3 (compliance engine v3)
    risks_v3: checkRouteRegistered(
      "client/src/pages/compliance-v3/RisksV3.tsx"
    ),
  };

  const allHealthy = dbStatus === "ok";

  const version =
    process.env.npm_package_version ??
    (() => {
      try {
        const pkg = require(join(__dirname, "../../package.json"));
        return pkg.version ?? "unknown";
      } catch {
        return "unknown";
      }
    })();

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "healthy" : "degraded",
    version,
    sha,
    sha_full,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbStatus,
      ...routeChecks,
    },
  });
});
