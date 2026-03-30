/**
 * routers/solarisAdmin.ts
 *
 * Endpoints de administração das perguntas SOLARIS (Onda 1).
 * Acesso restrito a equipe_solaris.
 *
 * Procedures:
 * - solarisAdmin.uploadCsv — importa perguntas curadas em lote via CSV
 *
 * Formato CSV esperado (UTF-8, separador vírgula):
 *   titulo,conteudo,topicos,cnaeGroups,lei,artigo,area,severidade_base,vigencia_inicio
 *
 * Mapeamento CSV → tabela solaris_questions (DEC-002):
 *   titulo          → titulo
 *   conteudo        → texto
 *   topicos         → topicos
 *   cnaeGroups      → cnae_groups (JSON array)
 *   lei             → fonte (fixo 'solaris' — validado, não inserido como coluna)
 *   artigo          → codigo (SOL-001..N)
 *   area            → categoria
 *   severidade_base → severidade_base
 *   vigencia_inicio → vigencia_inicio (opcional)
 *
 * Sprint L · DEC-002 · Issue #191
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

const CsvRowSchema = z.object({
  titulo: z.string().min(1, "Campo 'titulo' é obrigatório"),
  conteudo: z.string().min(1, "Campo 'conteudo' é obrigatório"),
  topicos: z.string().min(1, "Campo 'topicos' é obrigatório"),
  cnaeGroups: z.string(),
  lei: z.literal("solaris"),
  artigo: z.string().min(1, "Campo 'artigo' é obrigatório (ex: SOL-001)"),
  area: z.enum(AREA_VALUES),
  severidade_base: z.enum(SEVERIDADE_VALUES),
  vigencia_inicio: z.string().optional(),
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

  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

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
            area: r.data!.area,
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
        for (const row of valid) {
          const r = row.data!;

          let cnaeGroupsJson: string | null = null;
          if (r.cnaeGroups && r.cnaeGroups.trim() !== "") {
            const groups = r.cnaeGroups
              .split(",")
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
                  texto = ?, categoria = ?, cnae_groups = ?,
                  titulo = ?, topicos = ?, severidade_base = ?,
                  vigencia_inicio = ?, upload_batch_id = ?, atualizado_em = ?
                WHERE codigo = ?`,
                [
                  r.conteudo, r.area, cnaeGroupsJson,
                  r.titulo, r.topicos, r.severidade_base,
                  r.vigencia_inicio ?? null, batchId, now,
                  r.artigo,
                ]
              );
              updated++;
            } else {
              await conn.execute(
                `INSERT INTO solaris_questions
                  (texto, categoria, cnae_groups, obrigatorio, ativo, fonte,
                   criado_em, atualizado_em, upload_batch_id, codigo,
                   titulo, topicos, severidade_base, vigencia_inicio)
                VALUES (?, ?, ?, 1, 1, 'solaris', ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  r.conteudo, r.area, cnaeGroupsJson,
                  now, now, batchId, r.artigo,
                  r.titulo, r.topicos, r.severidade_base,
                  r.vigencia_inicio ?? null,
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
