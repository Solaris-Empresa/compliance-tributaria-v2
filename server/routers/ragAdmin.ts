/**
 * routers/ragAdmin.ts
 *
 * Endpoints de administração do corpus RAG — acesso restrito a equipe_solaris.
 *
 * Procedures:
 * - ragAdmin.uploadCsv          — faz upload de CSV SOLARIS para corpus ragDocuments
 * - ragAdmin.getStats           — retorna estatísticas de ingestão
 * - ragAdmin.getChunkUsageStats — L-RAG-01: estatísticas de uso por chunk
 * - ragAdmin.getTopChunks       — L-RAG-01: top-20 chunks mais recuperados
 * - ragAdmin.getUnusedChunks    — L-RAG-01: chunks nunca recuperados (invisíveis)
 * - ragAdmin.getUsageByLei      — L-RAG-01: distribuição de uso por lei
 *
 * Formato CSV esperado (UTF-8, separador vírgula):
 *   lei,artigo,titulo,conteudo,topicos,cnaeGroups,chunkIndex
 *
 * Valores válidos para `lei`:
 *   lc214 | ec132 | lc227 | lc224 | lc116 | lc87 | cg_ibs | rfb_cbs | conv_icms | lc123
 *
 * Sprint J · Issue #140 · G16
 * Sprint L · L-RAG-01 — Telemetria de uso do RAG
 */
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import mysql from "mysql2/promise";
import { ENV } from "../_core/env";

// ─── Tipos ────────────────────────────────────────────────────────────────────

const LEI_VALUES = [
  "lc214", "ec132", "lc227", "lc224", "lc116",
  "lc87", "cg_ibs", "rfb_cbs", "conv_icms", "lc123",
] as const;

const CsvRowSchema = z.object({
  lei: z.enum(LEI_VALUES),
  artigo: z.string().min(1).max(300),
  titulo: z.string().min(1).max(500),
  conteudo: z.string().min(10),
  topicos: z.string().default(""),
  cnaeGroups: z.string().default(""),
  chunkIndex: z.coerce.number().int().min(0).default(0),
});

type CsvRow = z.infer<typeof CsvRowSchema>;

// ─── Parser CSV simples (sem dependências externas) ───────────────────────────

function parseCsv(raw: string): Record<string, string>[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  // Remove BOM UTF-8 se presente
  const headerLine = lines[0].startsWith("\uFEFF")
    ? lines[0].slice(1)
    : lines[0];

  const headers = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parser simples: suporta campos entre aspas com vírgulas internas
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current);

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return rows;
}

// ─── Guard: apenas equipe_solaris ─────────────────────────────────────────────

const solarisOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "equipe_solaris") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito à equipe SOLARIS (role: equipe_solaris)",
    });
  }
  return next({ ctx });
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const ragAdminRouter = router({
  /**
   * uploadCsv — recebe conteúdo CSV como string, valida e insere no corpus RAG.
   *
   * Input:
   *   csvContent: string — conteúdo bruto do arquivo CSV (UTF-8)
   *   dryRun: boolean    — se true, valida mas não insere no banco
   *
   * Output:
   *   total: number      — total de linhas no CSV
   *   valid: number      — linhas que passaram na validação
   *   inserted: number   — linhas inseridas (0 se dryRun)
   *   errors: { row, message }[] — erros de validação por linha
   */
  uploadCsv: solarisOnlyProcedure
    .input(
      z.object({
        csvContent: z.string().min(1).max(10_000_000), // 10MB máximo
        dryRun: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const rawRows = parseCsv(input.csvContent);

      if (rawRows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CSV vazio ou sem linhas de dados após o cabeçalho",
        });
      }

      const validRows: CsvRow[] = [];
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < rawRows.length; i++) {
        const result = CsvRowSchema.safeParse(rawRows[i]);
        if (result.success) {
          validRows.push(result.data);
        } else {
          errors.push({
            row: i + 2, // +2: linha 1 = cabeçalho, linhas de dados começam em 2
            message: result.error.issues.map((e) => `${String(e.path.join("."))}: ${e.message}`).join("; "),
          });
        }
      }

      if (input.dryRun) {
        return {
          total: rawRows.length,
          valid: validRows.length,
          inserted: 0,
          errors,
          dryRun: true,
        };
      }

      if (validRows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Nenhuma linha válida encontrada. ${errors.length} erros de validação.`,
        });
      }

      // Inserção em lote via mysql2 (padrão do projeto)
      const conn = await mysql.createConnection(ENV.databaseUrl);
      let inserted = 0;

      try {
        const BATCH_SIZE = 50;
        for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
          const batch = validRows.slice(i, i + BATCH_SIZE);
          const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
          const values = batch.flatMap((r) => [
            r.lei,
            r.artigo,
            r.titulo,
            r.conteudo,
            r.topicos,
            r.cnaeGroups,
            r.chunkIndex,
          ]);

          await conn.execute(
            `INSERT INTO ragDocuments (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex)
             VALUES ${placeholders}`,
            values
          );
          inserted += batch.length;
        }
      } finally {
        await conn.end();
      }

      return {
        total: rawRows.length,
        valid: validRows.length,
        inserted,
        errors,
        dryRun: false,
      };
    }),

  /**
   * getStats — retorna estatísticas de ingestão do corpus RAG por lei.
   */
  getStats: solarisOnlyProcedure.query(async () => {
    const conn = await mysql.createConnection(ENV.databaseUrl);
    try {
      const [rows] = await conn.execute(
        `SELECT lei, COUNT(*) as chunks, MIN(id) as id_min, MAX(id) as id_max
         FROM ragDocuments GROUP BY lei ORDER BY id_min`
      );
      return { stats: rows as { lei: string; chunks: number; id_min: number; id_max: number }[] };
    } finally {
      await conn.end();
    }
  }),

  // =========================================================================
  // L-RAG-01 — Endpoints de Telemetria de Uso do RAG
  // =========================================================================

  /**
   * getChunkUsageStats — L-RAG-01
   * Retorna estatísticas gerais de uso: total de logs, chunks únicos usados,
   * total de chunks no corpus e percentual de cobertura.
   */
  getChunkUsageStats: solarisOnlyProcedure.query(async () => {
    const conn = await mysql.createConnection(ENV.databaseUrl);
    try {
      const [[totals]] = await conn.execute(
        `SELECT
           COUNT(*)                          AS total_logs,
           COUNT(DISTINCT anchor_id)         AS unique_chunks_used,
           MIN(retrieved_at)                 AS first_retrieval,
           MAX(retrieved_at)                 AS last_retrieval
         FROM rag_usage_log`
      ) as [{ total_logs: number; unique_chunks_used: number; first_retrieval: string | null; last_retrieval: string | null }[], unknown];

      const [[corpus]] = await conn.execute(
        `SELECT COUNT(*) AS total_chunks FROM ragDocuments`
      ) as [{ total_chunks: number }[], unknown];

      const totalChunks = corpus.total_chunks ?? 0;
      const usedChunks  = totals.unique_chunks_used ?? 0;
      const coverage    = totalChunks > 0 ? Math.round((usedChunks / totalChunks) * 100) : 0;

      return {
        total_logs:          totals.total_logs ?? 0,
        unique_chunks_used:  usedChunks,
        total_chunks:        totalChunks,
        coverage_pct:        coverage,
        first_retrieval:     totals.first_retrieval ?? null,
        last_retrieval:      totals.last_retrieval ?? null,
      };
    } finally {
      await conn.end();
    }
  }),

  /**
   * getTopChunks — L-RAG-01
   * Retorna os top-20 chunks mais recuperados com contagem de usos.
   */
  getTopChunks: solarisOnlyProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      const conn = await mysql.createConnection(ENV.databaseUrl);
      try {
        const [rows] = await conn.execute(
          `SELECT
             u.anchor_id,
             d.lei,
             d.artigo,
             d.titulo,
             COUNT(*) AS usos,
             AVG(u.score) AS avg_score,
             MAX(u.retrieved_at) AS last_used
           FROM rag_usage_log u
           LEFT JOIN ragDocuments d ON d.anchor_id = u.anchor_id
           GROUP BY u.anchor_id, d.lei, d.artigo, d.titulo
           ORDER BY usos DESC
           LIMIT ?`,
          [limit]
        );
        return { chunks: rows as { anchor_id: string; lei: string; artigo: string; titulo: string; usos: number; avg_score: number; last_used: string }[] };
      } finally {
        await conn.end();
      }
    }),

  /**
   * getUnusedChunks — L-RAG-01
   * Retorna chunks que nunca foram recuperados (invisíveis ao usuário).
   * Crítico para o Gate Q3 do RAG-QUALITY-GATE.
   */
  getUnusedChunks: solarisOnlyProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(50) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const conn = await mysql.createConnection(ENV.databaseUrl);
      try {
        const [rows] = await conn.execute(
          `SELECT
             d.id,
             d.anchor_id,
             d.lei,
             d.artigo,
             d.titulo,
             d.createdAt
           FROM ragDocuments d
           LEFT JOIN rag_usage_log u ON d.anchor_id = u.anchor_id
           WHERE u.anchor_id IS NULL
             AND d.anchor_id IS NOT NULL
           ORDER BY d.lei, d.id
           LIMIT ?`,
          [limit]
        );
        const [countResult] = await conn.execute(
          `SELECT COUNT(*) AS total
           FROM ragDocuments d
           LEFT JOIN rag_usage_log u ON d.anchor_id = u.anchor_id
           WHERE u.anchor_id IS NULL AND d.anchor_id IS NOT NULL`
        ) as [{ total: number }[], unknown];
        return {
          chunks: rows as { id: number; anchor_id: string; lei: string; artigo: string; titulo: string; createdAt: string }[],
          total_invisible: (countResult as unknown as { total: number }[])[0]?.total ?? 0,
        };
      } finally {
        await conn.end();
      }
    }),

  /**
   * getUsageByLei — L-RAG-01
   * Distribuição de uso por lei: quantos logs e chunks únicos por lei.
   */
  getUsageByLei: solarisOnlyProcedure.query(async () => {
    const conn = await mysql.createConnection(ENV.databaseUrl);
    try {
      const [rows] = await conn.execute(
        `SELECT
           lei,
           COUNT(*)                  AS total_logs,
           COUNT(DISTINCT anchor_id) AS unique_chunks,
           AVG(score)                AS avg_score
         FROM rag_usage_log
         GROUP BY lei
         ORDER BY total_logs DESC`
      );
      return { usage: rows as { lei: string; total_logs: number; unique_chunks: number; avg_score: number }[] };
    } finally {
      await conn.end();
    }
  }),
});
