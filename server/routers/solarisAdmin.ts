/**
 * routers/solarisAdmin.ts
 *
 * Endpoints de administração das perguntas SOLARIS (Onda 1).
 * Acesso restrito a equipe_solaris.
 *
 * Procedures:
 * - solarisAdmin.uploadCsv    — importa perguntas curadas em lote via CSV
 * - solarisAdmin.listQuestions — lista com filtros combinados + paginação
 * - solarisAdmin.deleteQuestions — soft delete (ativo = 0)
 * - solarisAdmin.restoreQuestions — restaura após undo (ativo = 1)
 * - solarisAdmin.listBatches  — lista lotes de upload
 * - solarisAdmin.deleteBatch  — soft delete de lote inteiro
 *
 * Formato CSV esperado (UTF-8, separador vírgula):
 *   titulo,conteudo,topicos,cnaeGroups,lei,artigo,categoria,severidade_base,vigencia_inicio[,risk_category_code[,classification_scope]]
 *
 * Mapeamento CSV → tabela solaris_questions (DEC-002):
 *   titulo          → titulo
 *   conteudo        → texto
 *   topicos         → topicos
 *   cnaeGroups      → cnae_groups (JSON array)
 *   lei             → fonte (fixo 'solaris' — validado, não inserido como coluna)
 *   artigo          → codigo (SOL-001..N)
 *   categoria       → categoria
 *   severidade_base → severidade_base
 *   vigencia_inicio      → vigencia_inicio (opcional)
 *   risk_category_code   → risk_category_code (opcional, FK → risk_categories.codigo)
 *   classification_scope → classification_scope (opcional, default 'risk_engine')
 *
 * Sprint L · DEC-002 · Issue #191
 * Sprint Z-11 · ENTREGA 2 — suporte a risk_category_code + classification_scope
 */
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import mysql from "mysql2/promise";
import { ENV } from "../_core/env";
import { randomUUID } from "crypto";

// ── CSV Schema DEC-002 ────────────────────────────────────────────────────────

const AREA_VALUES = ["contabilidade_fiscal", "negocio", "ti", "juridico"] as const;
const SEVERIDADE_VALUES = ["baixa", "media", "alta", "critica"] as const;
const CLASSIFICATION_SCOPE_VALUES = ["risk_engine", "diagnostic_only"] as const;

const CsvRowSchema = z.object({
  titulo: z.string().min(1, "Campo 'titulo' é obrigatório"),
  conteudo: z.string().min(1, "Campo 'conteudo' é obrigatório"),
  topicos: z.string().min(1, "Campo 'topicos' é obrigatório"),
  cnaeGroups: z.string(),
  lei: z.literal("solaris"),
  artigo: z.string().min(1, "Campo 'artigo' é obrigatório (ex: SOL-001)"),
  categoria: z.enum(AREA_VALUES),
  severidade_base: z.enum(SEVERIDADE_VALUES),
  vigencia_inicio: z.string().optional(),
  // Z-11 ENTREGA 2 — campos opcionais novos
  risk_category_code: z.string().optional(),
  classification_scope: z.enum(CLASSIFICATION_SCOPE_VALUES).optional(),
});

type CsvRow = z.infer<typeof CsvRowSchema>;

// ── CSV Parser ────────────────────────────────────────────────────────────────

interface ParsedRow {
  line: number;
  data: CsvRow | null;
  error: string | null;
}

export function parseCsv(csvContent: string): ParsedRow[] {
  const lines = csvContent
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) return [];

  // Z-11 ENTREGA 2: usar parseCSVLine no header também para suportar campos entre aspas
  const header = parseCSVLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ""));

  const results: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i];

    const values = parseCSVLine(raw);

    if (values.length !== header.length) {
      results.push({
        line: lineNum,
        data: null,
        error: `Número de colunas inválido: esperado ${header.length}, encontrado ${values.length}`,
      });
      continue;
    }

    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = values[idx];
    });

    const parsed = CsvRowSchema.safeParse(obj);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      results.push({
        line: lineNum,
        data: null,
        error: firstError.message,
      });
    } else {
      results.push({ line: lineNum, data: parsed.data, error: null });
    }
  }

  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Router ────────────────────────────────────────────────────────────────────

export const solarisAdminRouter = router({
  // ── Listagem com filtros combinados + paginação ──────────────────────────
  listQuestions: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        categoria: z.string().optional(),
        severidade_base: z.string().optional(),
        vigencia: z.enum(["todas", "com", "sem", "vencida", "a_vencer"]).optional().default("todas"),
        upload_batch_id: z.string().optional(),
        ativo: z.boolean().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const conn = await mysql.createConnection(ENV.databaseUrl);
      try {
        const conditions: string[] = [];
        const params: unknown[] = [];
        const now = Date.now();

        if (input.search) {
          conditions.push("(titulo LIKE ? OR texto LIKE ?)");
          params.push(`%${input.search}%`, `%${input.search}%`);
        }
        if (input.categoria) {
          conditions.push("categoria = ?");
          params.push(input.categoria);
        }
        if (input.severidade_base) {
          conditions.push("severidade_base = ?");
          params.push(input.severidade_base);
        }
        if (input.upload_batch_id) {
          conditions.push("upload_batch_id = ?");
          params.push(input.upload_batch_id);
        }
        if (input.ativo !== undefined) {
          conditions.push("ativo = ?");
          params.push(input.ativo ? 1 : 0);
        } else {
          // por padrão mostrar apenas ativas
          conditions.push("ativo = 1");
        }
        if (input.vigencia && input.vigencia !== "todas") {
          if (input.vigencia === "com") {
            // vigencia_inicio preenchida (não NULL e não string vazia)
            conditions.push("(vigencia_inicio IS NOT NULL AND vigencia_inicio != '')");
          } else if (input.vigencia === "sem") {
            // vigencia_inicio ausente (NULL ou string vazia — compatibilidade com dados legados)
            conditions.push("(vigencia_inicio IS NULL OR vigencia_inicio = '')");
          } else if (input.vigencia === "vencida") {
            conditions.push("(vigencia_inicio IS NOT NULL AND vigencia_inicio != '' AND vigencia_inicio < ?)");
            params.push(now);
          } else if (input.vigencia === "a_vencer") {
            conditions.push("(vigencia_inicio IS NOT NULL AND vigencia_inicio != '' AND vigencia_inicio >= ?)");
            params.push(now);
          }
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const offset = (input.page - 1) * input.pageSize;

        const [countRows] = await conn.execute(
          `SELECT COUNT(*) as total FROM solaris_questions ${where}`,
          params
        );
        const total = (countRows as { total: number }[])[0].total;

        // BUG-C fix: TiDB rejeita LIMIT ? OFFSET ? via conn.execute().
        // Usar parseInt() para garantir inteiros seguros antes de interpolar.
        const limitSafe = parseInt(String(input.pageSize), 10);
        const offsetSafe = parseInt(String(offset), 10);
        const [rows] = await conn.execute(
          `SELECT id, codigo, titulo, texto, categoria, severidade_base,
                  vigencia_inicio, upload_batch_id, ativo, criado_em
           FROM solaris_questions ${where}
           ORDER BY codigo ASC
           LIMIT ${limitSafe} OFFSET ${offsetSafe}`,
          params
        );

        return {
          questions: rows as {
            id: number; codigo: string; titulo: string; texto: string;
            categoria: string; severidade_base: string | null;
            vigencia_inicio: number | null; upload_batch_id: string | null;
            ativo: number; criado_em: number;
          }[],
          total,
          page: input.page,
          pageSize: input.pageSize,
        };
      } finally {
        await conn.end();
      }
    }),

  // ── Soft delete (ativo = 0) ───────────────────────────────────────────────
  deleteQuestions: protectedProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "equipe_solaris") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas a equipe SOLARIS pode excluir perguntas." });
      }
      const conn = await mysql.createConnection(ENV.databaseUrl);
      try {
        const placeholders = input.ids.map(() => "?").join(",");
        await conn.execute(
          `UPDATE solaris_questions SET ativo = 0, atualizado_em = ? WHERE id IN (${placeholders})`,
          [Date.now(), ...input.ids]
        );
        return { deleted: input.ids.length, ids: input.ids };
      } finally {
        await conn.end();
      }
    }),

  // ── Restaurar após undo (ativo = 1) ──────────────────────────────────────
  restoreQuestions: protectedProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "equipe_solaris") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas a equipe SOLARIS pode restaurar perguntas." });
      }
      const conn = await mysql.createConnection(ENV.databaseUrl);
      try {
        const placeholders = input.ids.map(() => "?").join(",");
        await conn.execute(
          `UPDATE solaris_questions SET ativo = 1, atualizado_em = ? WHERE id IN (${placeholders})`,
          [Date.now(), ...input.ids]
        );
        return { restored: input.ids.length };
      } finally {
        await conn.end();
      }
    }),

  // ── Listar lotes de upload ────────────────────────────────────────────────
  listBatches: protectedProcedure.query(async () => {
    const conn = await mysql.createConnection(ENV.databaseUrl);
    try {
      const [rows] = await conn.execute(
        `SELECT upload_batch_id as batch_id,
                MIN(criado_em) as created_at,
                COUNT(*) as count,
                'sistema' as uploaded_by
         FROM solaris_questions
         WHERE upload_batch_id IS NOT NULL
           AND ativo = 1
         GROUP BY upload_batch_id
         ORDER BY created_at DESC`
      );
      return rows as { batch_id: string; created_at: number; count: number; uploaded_by: string }[];
    } finally {
      await conn.end();
    }
  }),

  // ── Soft delete de lote inteiro ───────────────────────────────────────────
  deleteBatch: protectedProcedure
    .input(z.object({ upload_batch_id: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "equipe_solaris") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas a equipe SOLARIS pode excluir lotes." });
      }
      const conn = await mysql.createConnection(ENV.databaseUrl);
      try {
        const [result] = await conn.execute(
          `UPDATE solaris_questions SET ativo = 0, atualizado_em = ? WHERE upload_batch_id = ?`,
          [Date.now(), input.upload_batch_id]
        );
        const affected = (result as { affectedRows: number }).affectedRows;
        return { deleted: affected };
      } finally {
        await conn.end();
      }
    }),

  // ── Upload CSV ───────────────────────────────────────────────────────────
  uploadCsv: protectedProcedure
    .input(
      z.object({
        csvContent: z.string().min(1),
        dryRun: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "equipe_solaris") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas a equipe SOLARIS pode importar perguntas.",
        });
      }

      const parsed = parseCsv(input.csvContent);
      const errors = parsed
        .filter((r) => r.error !== null)
        .map((r) => ({ line: r.line, field: "—", message: r.error! }));
      const valid = parsed.filter((r) => r.data !== null);

      if (input.dryRun) {
        return {
          total: parsed.length,
          valid: valid.length,
          inserted: 0,
          updated: 0,
          errors,
          preview: valid.slice(0, 20).map((r) => ({
            artigo: r.data!.artigo,
            titulo: r.data!.titulo,
            categoria: r.data!.categoria,
            severidade_base: r.data!.severidade_base,
            vigencia_inicio: r.data!.vigencia_inicio ?? null,
          })),
        };
      }

      if (valid.length === 0) {
        return { total: parsed.length, valid: 0, inserted: 0, updated: 0, errors, preview: [] };
      }

      const batchId = randomUUID();
      const now = Date.now();
      let inserted = 0;
      let updated = 0;
      const importErrors: typeof errors = [];

      const conn = await mysql.createConnection(ENV.databaseUrl);
      try {
        // Z-11 ENTREGA 2: pré-carregar códigos válidos de risk_categories para validação FK
        const [rcRows] = await conn.execute(
          "SELECT codigo FROM risk_categories WHERE status = 'ativo'"
        );
        const validRiskCodes = new Set(
          (rcRows as { codigo: string }[]).map((r) => r.codigo)
        );

        for (const row of valid) {
          const r = row.data!;

          // Z-11 ENTREGA 2: validar risk_category_code se preenchido
          const rcc = r.risk_category_code && r.risk_category_code.trim() !== ""
            ? r.risk_category_code.trim()
            : null;
          if (rcc !== null && !validRiskCodes.has(rcc)) {
            importErrors.push({
              line: row.line,
              field: "risk_category_code",
              message: `risk_category_code '${rcc}' não existe em risk_categories (status=ativo)`,
            });
            continue;
          }

          // Z-11 ENTREGA 2: classification_scope — default 'risk_engine'
          const scope = (r.classification_scope && r.classification_scope.trim() !== "")
            ? r.classification_scope.trim()
            : "risk_engine";

          let cnaeGroupsJson: string | null = null;
          if (r.cnaeGroups && r.cnaeGroups.trim() !== "") {
            const groups = r.cnaeGroups
              .split(";")
              .map((g) => g.trim())
              .filter((g) => g.length > 0);
            cnaeGroupsJson = JSON.stringify(groups);
          }

          try {
            const [existing] = await conn.execute(
              "SELECT id FROM solaris_questions WHERE codigo = ?",
              [r.artigo]
            );
            const rows = existing as { id: number }[];

            if (rows.length > 0) {
              await conn.execute(
                `UPDATE solaris_questions SET
                  ativo = 1,
                  texto = ?, categoria = ?, cnae_groups = ?,
                  titulo = ?, topicos = ?, severidade_base = ?,
                  vigencia_inicio = ?, upload_batch_id = ?, atualizado_em = ?,
                  risk_category_code = ?, classification_scope = ?
                WHERE codigo = ?`,
                [
                  r.conteudo, r.categoria, cnaeGroupsJson,
                  r.titulo, r.topicos, r.severidade_base,
                  (r.vigencia_inicio && r.vigencia_inicio.trim() !== '' ? r.vigencia_inicio : null),
                  batchId, now,
                  rcc, scope,
                  r.artigo,
                ]
              );
              updated++;
            } else {
              await conn.execute(
                `INSERT INTO solaris_questions
                  (texto, categoria, cnae_groups, obrigatorio, ativo, fonte,
                   criado_em, atualizado_em, upload_batch_id, codigo,
                   titulo, topicos, severidade_base, vigencia_inicio,
                   risk_category_code, classification_scope)
                VALUES (?, ?, ?, 1, 1, 'solaris', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  r.conteudo, r.categoria, cnaeGroupsJson,
                  now, now, batchId, r.artigo,
                  r.titulo, r.topicos, r.severidade_base,
                  (r.vigencia_inicio && r.vigencia_inicio.trim() !== '' ? r.vigencia_inicio : null),
                  rcc, scope,
                ]
              );
              inserted++;
            }
          } catch (dbErr) {
            importErrors.push({
              line: row.line,
              field: "db",
              message: `Erro ao persistir ${r.artigo}: ${(dbErr as Error).message}`,
            });
          }
        }
      } finally {
        await conn.end();
      }

      return {
        total: parsed.length,
        valid: valid.length,
        inserted,
        updated,
        errors: [...errors, ...importErrors],
        preview: [],
      };
    }),
});
