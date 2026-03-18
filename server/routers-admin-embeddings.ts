/**
 * routers-admin-embeddings.ts
 *
 * Endpoint de administração para reconstruir os embeddings CNAE 2.3.
 * Acesso restrito a equipe_solaris.
 *
 * Procedures:
 * - admin.embeddings.getStatus   — status atual do banco de embeddings
 * - admin.embeddings.rebuild     — dispara rebuild completo (async, progresso via WebSocket)
 * - admin.embeddings.invalidateCache — invalida o cache em memória
 */

import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { cnaeEmbeddings } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { invalidateEmbeddingCache } from "./cnae-embeddings";
import { notifyUser } from "./_core/websocket";
import { CNAE_TABLE } from "../shared/cnae-table";
import { count, max, desc } from "drizzle-orm";
import { embeddingRebuildLogs } from "../drizzle/schema";

// ─── Estado global do rebuild (singleton por processo) ────────────────────────
interface RebuildState {
  running: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  total: number;
  processed: number;
  errors: number;
  lastError: string | null;
  triggeredBy: number | null; // userId
}

export let rebuildState: RebuildState = {
  running: false,
  startedAt: null,
  finishedAt: null,
  total: 0,
  processed: 0,
  errors: 0,
  lastError: null,
  triggeredBy: null,
};

// ─── Função de rebuild (executa em background) ────────────────────────────────
export async function runRebuild(triggeredByUserId: number): Promise<void> {
  if (rebuildState.running) return; // evitar execução dupla

  rebuildState = {
    running: true,
    startedAt: Date.now(),
    finishedAt: null,
    total: CNAE_TABLE.length,
    processed: 0,
    errors: 0,
    lastError: null,
    triggeredBy: triggeredByUserId,
  };

  const BATCH_SIZE = 95;
  const OPENAI_API_KEY = ENV.openAiApiKey;

  if (!OPENAI_API_KEY) {
    rebuildState.running = false;
    rebuildState.lastError = "OPENAI_API_KEY não configurada";
    notifyUser(triggeredByUserId, "embeddings:rebuild:error", {
      message: "OPENAI_API_KEY não configurada",
    });
    return;
  }

  const db = await getDb();
  if (!db) {
    rebuildState.running = false;
    rebuildState.lastError = "Banco de dados não disponível";
    notifyUser(triggeredByUserId, "embeddings:rebuild:error", {
      message: "Banco de dados não disponível",
    });
    return;
  }

  // Notificar início
  notifyUser(triggeredByUserId, "embeddings:rebuild:started", {
    total: rebuildState.total,
    batchSize: BATCH_SIZE,
  });

  const batches: typeof CNAE_TABLE = [];
  for (let i = 0; i < CNAE_TABLE.length; i += BATCH_SIZE) {
    batches.push(...CNAE_TABLE.slice(i, i + BATCH_SIZE));
  }

  // Processar em batches
  for (let batchIdx = 0; batchIdx < Math.ceil(CNAE_TABLE.length / BATCH_SIZE); batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batch = CNAE_TABLE.slice(batchStart, batchStart + BATCH_SIZE);

    try {
      // Gerar embeddings para o batch
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: batch.map((c) => c.description),
          encoding_format: "float",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as {
        data: { index: number; embedding: number[] }[];
      };

      // Upsert no banco
      for (const item of data.data) {
        const cnae = batch[item.index];
        await db
          .insert(cnaeEmbeddings)
          .values({
            cnaeCode: cnae.code,
            cnaeDescription: cnae.description,
            embeddingJson: JSON.stringify(item.embedding),
          })
          .onDuplicateKeyUpdate({
            set: {
              cnaeDescription: cnae.description,
              embeddingJson: JSON.stringify(item.embedding),
            },
          });
        rebuildState.processed++;
      }

      // Emitir progresso
      notifyUser(triggeredByUserId, "embeddings:rebuild:progress", {
        processed: rebuildState.processed,
        total: rebuildState.total,
        batch: batchIdx + 1,
        totalBatches: Math.ceil(CNAE_TABLE.length / BATCH_SIZE),
        percent: Math.round((rebuildState.processed / rebuildState.total) * 100),
      });

      // Pequena pausa para não sobrecarregar a API
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      rebuildState.errors++;
      rebuildState.lastError = String(err);
      console.error(`[admin-embeddings] Erro no batch ${batchIdx + 1}:`, err);

      notifyUser(triggeredByUserId, "embeddings:rebuild:batchError", {
        batch: batchIdx + 1,
        error: String(err),
      });
    }
  }

  // Finalizar
  rebuildState.running = false;
  rebuildState.finishedAt = Date.now();

  // Invalidar cache em memória para forçar recarga
  invalidateEmbeddingCache();

  const duration = Math.round((rebuildState.finishedAt - (rebuildState.startedAt ?? 0)) / 1000);

  notifyUser(triggeredByUserId, "embeddings:rebuild:completed", {
    processed: rebuildState.processed,
    total: rebuildState.total,
    errors: rebuildState.errors,
    durationSeconds: duration,
  });

  console.log(
    `[admin-embeddings] Rebuild concluído: ${rebuildState.processed}/${rebuildState.total} CNAEs em ${duration}s (${rebuildState.errors} erros)`
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

/** Middleware: apenas equipe_solaris */
const solarisOnly = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "equipe_solaris") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito à equipe SOLARIS",
    });
  }
  return next({ ctx });
});

export const adminEmbeddingsRouter = router({
  /**
   * Retorna o status atual do banco de embeddings e do processo de rebuild.
   */
  getStatus: solarisOnly.query(async () => {
    const db = await getDb();
    let totalInDb = 0;
    let lastUpdated: Date | null = null;

    if (db) {
      try {
        const [countRow] = await db
          .select({ total: count() })
          .from(cnaeEmbeddings);
        totalInDb = Number(countRow?.total ?? 0);

        const [maxRow] = await db
          .select({ lastUpdated: max(cnaeEmbeddings.createdAt) })
          .from(cnaeEmbeddings);
        lastUpdated = maxRow?.lastUpdated ?? null;
      } catch (err) {
        console.error("[admin-embeddings] Erro ao buscar status:", err);
      }
    }

    return {
      // Estado do banco
      totalInDb,
      totalCnaes: CNAE_TABLE.length,
      coverage: totalInDb > 0 ? Math.round((totalInDb / CNAE_TABLE.length) * 100) : 0,
      lastUpdated,
      // Estado do rebuild
      rebuild: {
        running: rebuildState.running,
        startedAt: rebuildState.startedAt,
        finishedAt: rebuildState.finishedAt,
        processed: rebuildState.processed,
        total: rebuildState.total,
        errors: rebuildState.errors,
        lastError: rebuildState.lastError,
        percent:
          rebuildState.total > 0
            ? Math.round((rebuildState.processed / rebuildState.total) * 100)
            : 0,
      },
    };
  }),

  /**
   * Dispara o rebuild completo dos embeddings em background.
   * Progresso é emitido via WebSocket (evento embeddings:rebuild:progress).
   */
  rebuild: solarisOnly.mutation(async ({ ctx }) => {
    if (rebuildState.running) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Rebuild já em andamento (${rebuildState.processed}/${rebuildState.total} CNAEs processados)`,
      });
    }

    // Disparar em background (não aguardar)
    runRebuild(ctx.user.id).catch((err) => {
      console.error("[admin-embeddings] Erro fatal no rebuild:", err);
      rebuildState.running = false;
      rebuildState.lastError = String(err);
    });

    return {
      success: true,
      message: `Rebuild iniciado para ${CNAE_TABLE.length} CNAEs. Acompanhe o progresso em tempo real.`,
      total: CNAE_TABLE.length,
    };
  }),

  /**
   * Invalida o cache em memória, forçando recarga do banco na próxima consulta.
   */
  invalidateCache: solarisOnly.mutation(() => {
    invalidateEmbeddingCache();
    return { success: true, message: "Cache de embeddings invalidado com sucesso." };
  }),

  /**
   * Retorna o histórico das últimas 20 execuções de rebuild (manual + cron).
   */
  getHistory: solarisOnly.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      return await db
        .select()
        .from(embeddingRebuildLogs)
        .orderBy(desc(embeddingRebuildLogs.startedAt))
        .limit(20);
    } catch (err) {
      console.error("[admin-embeddings] Erro ao buscar histórico:", err);
      return [];
    }
  }),
});
