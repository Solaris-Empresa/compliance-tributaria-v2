/**
 * cnae-health.ts — Health Check do Pipeline CNAE Discovery
 *
 * Expõe informações de diagnóstico do pipeline de identificação automática de CNAEs:
 * - Presença e validade da OPENAI_API_KEY
 * - Status do cache de embeddings em memória
 * - Contagem de embeddings no banco de dados
 * - Latência de uma chamada de embedding de teste
 * - Última execução do rebuild (cron)
 *
 * Usado pelo endpoint GET /api/health/cnae para diagnósticos sem acesso a logs.
 *
 * Sprint v5.4.0
 */

import { ENV } from "./_core/env";
import { getDb } from "./db";
import { cnaeEmbeddings, embeddingRebuildLogs } from "../drizzle/schema";
import { count, max, desc } from "drizzle-orm";
import { CNAE_TABLE } from "../shared/cnae-table";

export interface CnaeHealthStatus {
  /** Timestamp ISO da verificação */
  checkedAt: string;
  /** Versão do pipeline */
  version: string;
  /** Status geral: "ok" | "degraded" | "down" */
  status: "ok" | "degraded" | "down";
  /** Detalhes de cada componente */
  components: {
    openaiKey: ComponentStatus;
    embeddingsDb: ComponentStatus & { count: number; coverage: number; lastUpdated: string | null };
    embeddingsCache: ComponentStatus & { cacheLoaded: boolean; cacheSize: number };
    lastRebuild: ComponentStatus & {
      triggeredBy: string | null;
      status: string | null;
      processedCnaes: number | null;
      totalCnaes: number | null;
      durationSeconds: number | null;
      startedAt: string | null;
    };
  };
  /** Resumo legível para humanos */
  summary: string;
}

interface ComponentStatus {
  ok: boolean;
  message: string;
}

/**
 * Executa o health check completo do pipeline CNAE.
 * Não faz chamadas à OpenAI API — apenas verifica presença da chave e estado do banco.
 * Tempo de execução esperado: < 500ms.
 */
export async function checkCnaeHealth(): Promise<CnaeHealthStatus> {
  const checkedAt = new Date().toISOString();
  const version = "5.4.0";

  // ── 1. Verificar OPENAI_API_KEY ───────────────────────────────────────────
  const keyPresent = Boolean(ENV.openAiApiKey && ENV.openAiApiKey.length > 20);
  const keyPrefix = keyPresent ? ENV.openAiApiKey.substring(0, 7) + "..." : "(ausente)";
  const openaiKey: ComponentStatus = {
    ok: keyPresent,
    message: keyPresent
      ? `Chave configurada (prefixo: ${keyPrefix})`
      : "OPENAI_API_KEY não configurada — pipeline CNAE inoperante",
  };

  // ── 2. Verificar banco de dados (contagem de embeddings) ──────────────────
  let embeddingsDbCount = 0;
  let embeddingsDbLastUpdated: string | null = null;
  let embeddingsDbOk = false;
  let embeddingsDbMessage = "Banco não disponível";

  const db = await getDb();
  if (db) {
    try {
      const [countRow] = await db
        .select({ total: count() })
        .from(cnaeEmbeddings);
      embeddingsDbCount = Number(countRow?.total ?? 0);

      const [maxRow] = await db
        .select({ lastUpdated: max(cnaeEmbeddings.createdAt) })
        .from(cnaeEmbeddings);
      embeddingsDbLastUpdated = maxRow?.lastUpdated
        ? new Date(maxRow.lastUpdated).toISOString()
        : null;

      const expectedCount = CNAE_TABLE.length;
      const coverage = expectedCount > 0
        ? Math.round((embeddingsDbCount / expectedCount) * 100)
        : 0;

      embeddingsDbOk = embeddingsDbCount >= Math.floor(expectedCount * 0.95); // OK se ≥95% dos CNAEs têm embedding
      embeddingsDbMessage = embeddingsDbOk
        ? `${embeddingsDbCount}/${expectedCount} CNAEs com embedding (${coverage}%)`
        : `Apenas ${embeddingsDbCount}/${expectedCount} CNAEs com embedding (${coverage}%) — rebuild necessário`;
    } catch (err) {
      embeddingsDbMessage = `Erro ao consultar banco: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const embeddingsDb = {
    ok: embeddingsDbOk,
    message: embeddingsDbMessage,
    count: embeddingsDbCount,
    coverage: CNAE_TABLE.length > 0
      ? Math.round((embeddingsDbCount / CNAE_TABLE.length) * 100)
      : 0,
    lastUpdated: embeddingsDbLastUpdated,
  };

  // ── 3. Verificar cache em memória ─────────────────────────────────────────
  // Importação dinâmica para acessar o estado interno do módulo
  const { getCacheStatus } = await import("./cnae-embeddings");
  const cacheStatus = getCacheStatus();
  const embeddingsCache = {
    ok: cacheStatus.loaded && cacheStatus.size > 0,
    message: cacheStatus.loaded
      ? `Cache carregado: ${cacheStatus.size} CNAEs (carregado há ${cacheStatus.ageMinutes} min)`
      : "Cache não carregado — será carregado na primeira consulta",
    cacheLoaded: cacheStatus.loaded,
    cacheSize: cacheStatus.size,
  };

  // ── 4. Verificar último rebuild ───────────────────────────────────────────
  let lastRebuildOk = false;
  let lastRebuildMessage = "Nenhum rebuild encontrado";
  let lastRebuildData = {
    triggeredBy: null as string | null,
    status: null as string | null,
    processedCnaes: null as number | null,
    totalCnaes: null as number | null,
    durationSeconds: null as number | null,
    startedAt: null as string | null,
  };

  if (db) {
    try {
      const [lastLog] = await db
        .select()
        .from(embeddingRebuildLogs)
        .orderBy(desc(embeddingRebuildLogs.startedAt))
        .limit(1);

      if (lastLog) {
        lastRebuildOk = lastLog.status === "completed";
        lastRebuildMessage = lastLog.status === "completed"
          ? `Último rebuild: ${lastLog.processedCnaes}/${lastLog.totalCnaes} CNAEs em ${lastLog.durationSeconds}s (${lastLog.triggeredBy})`
          : `Último rebuild falhou: ${lastLog.lastError ?? "erro desconhecido"}`;

        lastRebuildData = {
          triggeredBy: lastLog.triggeredBy,
          status: lastLog.status,
          processedCnaes: lastLog.processedCnaes,
          totalCnaes: lastLog.totalCnaes,
          durationSeconds: lastLog.durationSeconds,
          startedAt: lastLog.startedAt ? new Date(lastLog.startedAt).toISOString() : null,
        };
      }
    } catch (err) {
      lastRebuildMessage = `Erro ao consultar histórico: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const lastRebuild = {
    ok: lastRebuildOk,
    message: lastRebuildMessage,
    ...lastRebuildData,
  };

  // ── 5. Status geral ───────────────────────────────────────────────────────
  const criticalOk = openaiKey.ok && embeddingsDb.ok;
  const allOk = criticalOk && embeddingsCache.ok;

  const status: "ok" | "degraded" | "down" = !criticalOk
    ? "down"
    : !allOk
    ? "degraded"
    : "ok";

  const summary = status === "ok"
    ? `Pipeline CNAE operacional: ${embeddingsDbCount} embeddings, cache carregado, chave OpenAI configurada`
    : status === "degraded"
    ? `Pipeline CNAE degradado: ${[
        !embeddingsCache.ok ? "cache não carregado" : null,
        !lastRebuildOk ? "rebuild pendente" : null,
      ].filter(Boolean).join(", ")}`
    : `Pipeline CNAE inoperante: ${[
        !openaiKey.ok ? "OPENAI_API_KEY ausente" : null,
        !embeddingsDb.ok ? "embeddings insuficientes no banco" : null,
      ].filter(Boolean).join(", ")}`;

  return {
    checkedAt,
    version,
    status,
    components: {
      openaiKey,
      embeddingsDb,
      embeddingsCache,
      lastRebuild,
    },
    summary,
  };
}
