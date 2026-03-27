/**
 * routers/ragAdmin.ts
 *
 * Endpoints de administração do corpus RAG — acesso restrito a equipe_solaris.
 *
 * Procedures:
 * - ragAdmin.uploadCsv   — faz upload de CSV SOLARIS para corpus ragDocuments
 * - ragAdmin.getStats    — retorna estatísticas de ingestão
 * - ragAdmin.diagAnexos  — TEMPORÁRIO — Diagnóstico Dúvida 1 (P.O.) — remover após confirmação
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
   * diagAnexos — TEMPORÁRIO — Diagnóstico Dúvida 1 (P.O.)
   * Responde: os 837 chunks de Anexos LC 214 existem com conteúdo real de NCM?
   * ZERO alterações — apenas leitura.
   * Remover após confirmação do P.O.
   */
  diagAnexos: solarisOnlyProcedure.query(async () => {
    const conn = await mysql.createConnection(ENV.databaseUrl);
    try {
      // Q1: Distribuição por Anexo (artigo)
      const [q1] = await conn.execute(`
        SELECT
          artigo,
          COUNT(*) as total_chunks,
          ROUND(AVG(LENGTH(conteudo))) as tamanho_medio_chars,
          MIN(id) as primeiro_id,
          MAX(id) as ultimo_id
        FROM ragDocuments
        WHERE lei = 'lc214'
          AND (artigo LIKE '%Anexo%' OR titulo LIKE '%Anexo%')
        GROUP BY artigo
        ORDER BY artigo
        LIMIT 30
      `) as any;

      // Q2: Chunks com NCM ou keywords de Anexos no conteúdo/tópicos
      const [q2] = await conn.execute(`
        SELECT
          id,
          artigo,
          titulo,
          LEFT(conteudo, 400) as primeiros_400_chars,
          topicos,
          cnaeGroups,
          LENGTH(conteudo) as tamanho_total
        FROM ragDocuments
        WHERE lei = 'lc214'
          AND (
            conteudo LIKE '%NCM%'
            OR topicos LIKE '%NCM%'
            OR topicos LIKE '%alíquota zero%'
            OR topicos LIKE '%cesta básica%'
            OR topicos LIKE '%medicamento%'
            OR topicos LIKE '%insumo agropecuário%'
            OR conteudo LIKE '%cesta básica%'
            OR conteudo LIKE '%medicamento%'
            OR conteudo LIKE '%insumo agropecuário%'
          )
        LIMIT 10
      `) as any;

      // Q3: Integridade anchor_id nos Anexos
      const [[q3]] = await conn.execute(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN anchor_id IS NOT NULL AND anchor_id != '' THEN 1 ELSE 0 END) as com_anchor,
          SUM(CASE WHEN anchor_id IS NULL OR anchor_id = '' THEN 1 ELSE 0 END) as sem_anchor
        FROM ragDocuments
        WHERE lei = 'lc214'
          AND (artigo LIKE '%Anexo%' OR titulo LIKE '%Anexo%')
      `) as any;

      // Q4: Cobertura por Anexo relevante
      const [q4] = await conn.execute(`
        SELECT
          CASE
            WHEN artigo LIKE 'Anexo I,%' OR artigo = 'Anexo I' OR artigo LIKE 'Anexo I %' THEN 'Anexo I — Cesta Básica/Alíquota Zero'
            WHEN artigo LIKE 'Anexo II,%' OR artigo = 'Anexo II' OR artigo LIKE 'Anexo II %' THEN 'Anexo II — Redução de Alíquota'
            WHEN artigo LIKE 'Anexo III,%' OR artigo = 'Anexo III' OR artigo LIKE 'Anexo III %' THEN 'Anexo III — Serviços com Redução'
            WHEN artigo LIKE 'Anexo IV,%' OR artigo = 'Anexo IV' OR artigo LIKE 'Anexo IV %' THEN 'Anexo IV'
            WHEN artigo LIKE 'Anexo V,%' OR artigo = 'Anexo V' OR artigo LIKE 'Anexo V %' THEN 'Anexo V — Medicamentos'
            WHEN artigo LIKE 'Anexo VI,%' OR artigo = 'Anexo VI' OR artigo LIKE 'Anexo VI %' THEN 'Anexo VI'
            WHEN artigo LIKE 'Anexo VIII,%' OR artigo = 'Anexo VIII' OR artigo LIKE 'Anexo VIII %' THEN 'Anexo VIII'
            WHEN artigo LIKE 'Anexo IX,%' OR artigo = 'Anexo IX' OR artigo LIKE 'Anexo IX %' THEN 'Anexo IX — Insumos Agropecuários'
            WHEN artigo LIKE 'Anexo X,%' OR artigo = 'Anexo X' OR artigo LIKE 'Anexo X %' THEN 'Anexo X'
            WHEN artigo LIKE 'Anexo XI,%' OR artigo = 'Anexo XI' OR artigo LIKE 'Anexo XI %' THEN 'Anexo XI'
            WHEN artigo LIKE 'Anexo XII,%' OR artigo = 'Anexo XII' OR artigo LIKE 'Anexo XII %' THEN 'Anexo XII — Imóveis'
            WHEN artigo LIKE 'Anexo XIII,%' OR artigo = 'Anexo XIII' OR artigo LIKE 'Anexo XIII %' THEN 'Anexo XIII'
            WHEN artigo LIKE 'Anexo XIV,%' OR artigo = 'Anexo XIV' OR artigo LIKE 'Anexo XIV %' THEN 'Anexo XIV — Medicamentos NCM'
            WHEN artigo LIKE 'Anexo XV,%' OR artigo = 'Anexo XV' OR artigo LIKE 'Anexo XV %' THEN 'Anexo XV — Combustíveis'
            WHEN artigo LIKE 'Anexo XVI,%' OR artigo = 'Anexo XVI' OR artigo LIKE 'Anexo XVI %' THEN 'Anexo XVI — Redução gradual'
            WHEN artigo LIKE 'Anexo XVII,%' OR artigo = 'Anexo XVII' OR artigo LIKE 'Anexo XVII %' THEN 'Anexo XVII — IS Categorias'
            ELSE CONCAT('Outro: ', LEFT(artigo, 40))
          END as anexo_identificado,
          COUNT(*) as chunks
        FROM ragDocuments
        WHERE lei = 'lc214'
          AND (artigo LIKE '%Anexo%' OR titulo LIKE '%Anexo%')
        GROUP BY 1
        ORDER BY 1
      `) as any;

      // Q5: Confirmar ambiente (produção) — total corpus
      const [[q5]] = await conn.execute(`
        SELECT
          COUNT(*) as total_corpus,
          COUNT(DISTINCT lei) as total_leis,
          MIN(id) as primeiro_id,
          MAX(id) as ultimo_id
        FROM ragDocuments
      `) as any;

      // Q6: Retriever consegue achar Anexos? (keywords dos 5 casos UAT)
      const [q6] = await conn.execute(`
        SELECT
          id, lei, artigo, titulo,
          LEFT(topicos, 200) as topicos_preview,
          cnaeGroups
        FROM ragDocuments
        WHERE lei = 'lc214'
          AND (
            topicos LIKE '%Anexo I%'
            OR topicos LIKE '%cesta básica%'
            OR topicos LIKE '%alíquota zero%'
            OR topicos LIKE '%medicamento%'
            OR topicos LIKE '%Anexo V%'
            OR topicos LIKE '%insumo agropecuário%'
            OR topicos LIKE '%Anexo IX%'
            OR topicos LIKE '%Imposto Seletivo%'
            OR topicos LIKE '%bebida%'
            OR topicos LIKE '%cerveja%'
          )
        LIMIT 20
      `) as any;

      return {
        ambiente: process.env.NODE_ENV ?? 'unknown',
        q1_distribuicao_por_anexo: q1,
        q2_chunks_com_ncm_keywords: q2,
        q3_integridade_anchor: q3,
        q4_cobertura_por_anexo: q4,
        q5_confirmacao_producao: q5,
        q6_retriever_keywords_uат: q6,
      };
    } finally {
      await conn.end();
    }
  }),
});
