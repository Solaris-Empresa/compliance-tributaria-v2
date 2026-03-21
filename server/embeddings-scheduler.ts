/**
 * embeddings-scheduler.ts
 *
 * Agendamento automático de rebuild dos embeddings CNAE 2.3.
 * Executa toda segunda-feira às 03:00 (horário de Brasília, UTC-3).
 *
 * Cron: "0 3 * * 1" (seg, 03:00)
 * Timezone: America/Sao_Paulo
 *
 * Funcionalidades:
 * - Rebuild completo dos 1.332 CNAEs via OpenAI text-embedding-3-small
 * - Registro de cada execução na tabela embeddingRebuildLogs
 * - Notificação ao owner via notifyOwner() ao concluir ou falhar
 * - Proteção contra execução dupla (verifica rebuildState.running)
 * - Alerta imediato se OPENAI_API_KEY expirar no meio do rebuild (HTTP 401)
 * - Alerta de falha parcial se >10% dos batches falharem
 */

/** Threshold de erros de batch acima do qual emite alerta de falha parcial (10%) */
const ERROR_RATE_THRESHOLD = 0.10;

import cron from "node-cron";
import { getDb } from "./db";
import { embeddingRebuildLogs, cnaeEmbeddings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { invalidateEmbeddingCache } from "./cnae-embeddings";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { CNAE_TABLE } from "../shared/cnae-table";
import { rebuildState } from "./routers-admin-embeddings";

const BATCH_SIZE = 95;

/**
 * Executa o rebuild completo dos embeddings CNAE e registra no banco.
 * Disparado pelo cron job (triggeredBy = "cron") ou chamado manualmente para testes.
 */
export async function runScheduledRebuild(): Promise<void> {
  // Evitar execução dupla
  if (rebuildState.running) {
    console.log("[embeddings-scheduler] Rebuild já em andamento, pulando execução agendada.");
    return;
  }

  const db = await getDb();
  if (!db) {
    console.error("[embeddings-scheduler] Banco de dados não disponível, rebuild cancelado.");
    await notifyOwner({
      title: "⚠️ Rebuild Embeddings CNAE — Falha",
      content: "O rebuild automático agendado falhou: banco de dados não disponível.",
    }).catch(() => {});
    return;
  }

  const OPENAI_API_KEY = ENV.openAiApiKey;
  if (!OPENAI_API_KEY) {
    console.error("[embeddings-scheduler] OPENAI_API_KEY não configurada, rebuild cancelado.");
    await notifyOwner({
      title: "⚠️ Rebuild Embeddings CNAE — Falha",
      content: "O rebuild automático agendado falhou: OPENAI_API_KEY não configurada.",
    }).catch(() => {});
    return;
  }

  // Criar registro de log no banco
  let logId: number | null = null;
  const startedAt = new Date();

  try {
    const [inserted] = await db
      .insert(embeddingRebuildLogs)
      .values({
        triggeredBy: "cron",
        triggeredByUserId: null,
        status: "running",
        totalCnaes: CNAE_TABLE.length,
        processedCnaes: 0,
        errorCount: 0,
        startedAt,
      });
    logId = (inserted as any).insertId ?? null;
  } catch (err) {
    console.error("[embeddings-scheduler] Erro ao criar log de rebuild:", err);
  }

  console.log(
    `[embeddings-scheduler] Iniciando rebuild automático de ${CNAE_TABLE.length} CNAEs (logId=${logId})`
  );

  let processed = 0;
  let errors = 0;
  let lastError: string | null = null;

  // Processar em batches
  for (let batchIdx = 0; batchIdx < Math.ceil(CNAE_TABLE.length / BATCH_SIZE); batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batch = CNAE_TABLE.slice(batchStart, batchStart + BATCH_SIZE);

    try {
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
        // ── Alerta imediato para chave expirada/inválida (HTTP 401/403) ──────
        if (response.status === 401 || response.status === 403) {
          console.error(
            `[embeddings-scheduler] 🔑 OPENAI_API_KEY inválida ou expirada (HTTP ${response.status}) no batch ${batchIdx + 1} — abortando rebuild`
          );
          await notifyOwner({
            title: "🔑 Rebuild Embeddings CNAE — Chave OpenAI Inválida",
            content: `O rebuild automático foi **abortado** porque a OPENAI_API_KEY retornou HTTP ${response.status} (não autorizado).\n\n**Batch:** ${batchIdx + 1}/${Math.ceil(CNAE_TABLE.length / BATCH_SIZE)}\n**Processados até o momento:** ${processed}/${CNAE_TABLE.length} CNAEs\n\n**Ação necessária:** Verifique e atualize a OPENAI_API_KEY nos secrets do projeto.`,
          }).catch(() => {});
          // Abortar o rebuild imediatamente — não faz sentido continuar
          break;
        }
        // ─────────────────────────────────────────────────────────────────────
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
        processed++;
      }

      // Atualizar progresso no log a cada 5 batches
      if (logId && batchIdx % 5 === 0) {
        await db
          .update(embeddingRebuildLogs)
          .set({ processedCnaes: processed, errorCount: errors })
          .where(eq(embeddingRebuildLogs.id, logId))
          .catch(() => {});
      }

      console.log(
        `[embeddings-scheduler] Batch ${batchIdx + 1}/${Math.ceil(CNAE_TABLE.length / BATCH_SIZE)} — ${processed}/${CNAE_TABLE.length} CNAEs`
      );

      // Pausa para não sobrecarregar a API
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      errors++;
      lastError = String(err);
      console.error(`[embeddings-scheduler] Erro no batch ${batchIdx + 1}:`, err);
    }
  }

  // Invalidar cache em memória
  invalidateEmbeddingCache();

  const finishedAt = new Date();
  const durationSeconds = Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000);
  const totalBatches = Math.ceil(CNAE_TABLE.length / BATCH_SIZE);
  const errorRate = totalBatches > 0 ? errors / totalBatches : 0;
  const status = errors > 0 && processed === 0 ? "failed" : "completed";

  // ── Alerta de falha parcial se taxa de erros superar threshold ────────────
  if (status === "completed" && errorRate > ERROR_RATE_THRESHOLD) {
    console.warn(
      `[embeddings-scheduler] ⚠️ Alta taxa de erros: ${errors}/${totalBatches} batches falharam (${(errorRate * 100).toFixed(1)}%)`
    );
    await notifyOwner({
      title: "⚠️ Rebuild Embeddings CNAE — Falha Parcial",
      content: `O rebuild foi concluído mas com **alta taxa de erros**.\n\n**Processados:** ${processed}/${CNAE_TABLE.length} CNAEs\n**Batches com erro:** ${errors}/${totalBatches} (${(errorRate * 100).toFixed(1)}%)\n**Último erro:** ${lastError ?? "desconhecido"}\n**Duração:** ${durationSeconds}s\n\nVerifique os logs do servidor para mais detalhes.`,
    }).catch(() => {});
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Atualizar log final no banco
  if (logId) {
    await db
      .update(embeddingRebuildLogs)
      .set({
        status,
        processedCnaes: processed,
        errorCount: errors,
        lastError,
        durationSeconds,
        finishedAt,
      })
      .where(eq(embeddingRebuildLogs.id, logId))
      .catch((err) => console.error("[embeddings-scheduler] Erro ao finalizar log:", err));
  }

  console.log(
    `[embeddings-scheduler] Rebuild ${status}: ${processed}/${CNAE_TABLE.length} CNAEs em ${durationSeconds}s (${errors} erros)`
  );

  // Notificar owner
  if (status === "completed") {
    await notifyOwner({
      title: "✅ Rebuild Embeddings CNAE — Concluído",
      content: `Rebuild automático concluído com sucesso.\n\n**Resultado:** ${processed}/${CNAE_TABLE.length} CNAEs atualizados em ${durationSeconds}s${errors > 0 ? ` (${errors} erros de batch)` : ""}.\n\n**Modelo:** text-embedding-3-small (1536 dimensões)\n**Disparado por:** Cron automático (toda segunda-feira às 03:00)`,
    }).catch(() => {});
  } else {
    await notifyOwner({
      title: "❌ Rebuild Embeddings CNAE — Falha",
      content: `Rebuild automático falhou.\n\n**Processados:** ${processed}/${CNAE_TABLE.length} CNAEs\n**Erros:** ${errors}\n**Último erro:** ${lastError ?? "desconhecido"}\n**Duração:** ${durationSeconds}s`,
    }).catch(() => {});
  }
}

/**
 * Inicializa o cron job de rebuild automático.
 * Agenda: toda segunda-feira às 03:00 (America/Sao_Paulo).
 */
export function initEmbeddingsScheduler(): void {
  // Cron: seg às 03:00 (America/Sao_Paulo = UTC-3)
  // Expressão: minuto hora dia-do-mês mês dia-da-semana
  const cronExpression = "0 3 * * 1"; // 03:00 toda segunda-feira

  const task = cron.schedule(cronExpression, async () => {
    console.log("[embeddings-scheduler] 🕒 Cron disparado — iniciando rebuild automático de embeddings CNAE");
    try {
      await runScheduledRebuild();
    } catch (err) {
      console.error("[embeddings-scheduler] Erro fatal no cron:", err);
    }
  }, {
    timezone: "America/Sao_Paulo",
  });

  console.log("[embeddings-scheduler] ✅ Cron job registrado: toda segunda-feira às 03:00 (America/Sao_Paulo)");

  // Graceful shutdown
  process.on("SIGTERM", () => {
    task.stop();
    console.log("[embeddings-scheduler] Cron job encerrado (SIGTERM)");
  });
}
