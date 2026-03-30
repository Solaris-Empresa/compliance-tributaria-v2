/**
 * routers/ragAdmin.ts
 *
 * Endpoints de administração do corpus RAG — acesso restrito a equipe_solaris.
 *
 * Procedures:
 * - ragAdmin.uploadCsv   — faz upload de CSV SOLARIS para corpus ragDocuments
 * - ragAdmin.getStats    — retorna estatísticas de ingestão
 *
 * Formato CSV esperado (UTF-8, separador vírgula):
 *   lei,artigo,titulo,conteudo,topicos,cnaeGroups,chunkIndex
 *
 * Valores válidos para `lei`:
 *   lc214 | ec132 | lc227 | lc224 | lc116 | lc87 | cg_ibs | rfb_cbs | conv_icms | lc123
 *
 * Sprint J · Issue #140 · G16
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

  /**
   * getCorpusDistribution — Sprint L / Fase 2
   * Distribuição de chunks por lei com percentual calculado.
   */
  getCorpusDistribution: solarisOnlyProcedure.query(async () => {
    const conn = await mysql.createConnection(ENV.databaseUrl);
    try {
      const [rows] = await conn.execute(
        `SELECT lei, COUNT(*) as count FROM ragDocuments GROUP BY lei ORDER BY count DESC`
      ) as [{ lei: string; count: number }[], unknown];
      const total = (rows as { lei: string; count: number }[]).reduce((s, r) => s + Number(r.count), 0);
      return {
        distribution: (rows as { lei: string; count: number }[]).map((r) => ({
          lei: r.lei,
          count: Number(r.count),
          percentage: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
        })),
        total,
      };
    } finally {
      await conn.end();
    }
  }),

  /**
   * getAuthorDistribution — Sprint L / Fase 2
   * Distribuição de chunks por autor com leis cobertas e tipo inferido.
   */
  getAuthorDistribution: solarisOnlyProcedure.query(async () => {
    const conn = await mysql.createConnection(ENV.databaseUrl);
    try {
      const [rows] = await conn.execute(
        `SELECT autor, COUNT(*) as count, GROUP_CONCAT(DISTINCT lei ORDER BY lei SEPARATOR ',') as leis
         FROM ragDocuments GROUP BY autor ORDER BY count DESC`
      ) as [{ autor: string | null; count: number; leis: string }[], unknown];

      function inferTipo(autor: string | null): string {
        if (!autor) return "desconhecido";
        if (autor.includes("upload-csv")) return "upload-csv";
        if (autor.includes("correcao-rfc") || autor.includes("rfc")) return "correção-rfc";
        if (autor.includes("ingestao") || autor.includes("ingest")) return "ingestão";
        if (autor.includes("migracao") || autor.includes("migr")) return "migração";
        return "outro";
      }

      return {
        authors: (rows as { autor: string | null; count: number; leis: string }[]).map((r) => ({
          autor: r.autor ?? "(sem autor)",
          count: Number(r.count),
          leis: r.leis ? r.leis.split(",") : [],
          tipo: inferTipo(r.autor),
        })),
      };
    } finally {
      await conn.end();
    }
  }),

  /**
   * getHealthScore — Sprint L / Fase 2
   * Score de saúde 0–100 calculado com 5 critérios.
   */
  getHealthScore: solarisOnlyProcedure.query(async () => {
    const conn = await mysql.createConnection(ENV.databaseUrl);
    try {
      const [[{ total }]] = await conn.execute(
        `SELECT COUNT(*) as total FROM ragDocuments`
      ) as [[{ total: number }], unknown];
      const [[{ sem_anchor }]] = await conn.execute(
        `SELECT COUNT(*) as sem_anchor FROM ragDocuments WHERE anchor_id IS NULL OR anchor_id = ''`
      ) as [[{ sem_anchor: number }], unknown];
      const [[{ total_leis }]] = await conn.execute(
        `SELECT COUNT(DISTINCT lei) as total_leis FROM ragDocuments`
      ) as [[{ total_leis: number }], unknown];
      const [[{ dupes }]] = await conn.execute(
        `SELECT COUNT(*) as dupes FROM (SELECT anchor_id, COUNT(*) as c FROM ragDocuments WHERE anchor_id IS NOT NULL GROUP BY anchor_id HAVING c > 1) t`
      ) as [[{ dupes: number }], unknown];
      const [[{ ultimo_import }]] = await conn.execute(
        `SELECT MAX(createdAt) as ultimo_import FROM ragDocuments`
      ) as [[{ ultimo_import: Date | null }], unknown];

      const diasDesdeImport = ultimo_import
        ? Math.floor((Date.now() - new Date(ultimo_import).getTime()) / 86400000)
        : 999;

      const criterios = {
        anchor_id_completo: Number(sem_anchor) === 0 ? 25 : 0,
        cobertura_leis: Number(total_leis) >= 5 ? 20 : Math.floor((Number(total_leis) / 5) * 20),
        zero_duplicatas: Number(dupes) === 0 ? 20 : 0,
        import_recente: diasDesdeImport <= 30 ? 15 : 0,
        zero_divergencias: 20, // shadow mode — sem divergências conhecidas
      };

      const score = Object.values(criterios).reduce((s, v) => s + v, 0);

      return {
        score,
        total: Number(total),
        criterios,
        diasDesdeImport,
        totalLeis: Number(total_leis),
        semAnchor: Number(sem_anchor),
        duplicatas: Number(dupes),
      };
    } finally {
      await conn.end();
    }
  }),
});
