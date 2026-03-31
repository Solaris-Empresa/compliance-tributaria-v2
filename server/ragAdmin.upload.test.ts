/**
 * server/ragAdmin.upload.test.ts
 *
 * Testes Vitest — Sprint L / Fase 1 — Issue #191
 * Cobertura: parseCsv + uploadCsv dryRun
 *
 * 3 casos:
 *   1. parseCsv com CSV válido → array com colunas corretas, zero erros
 *   2. parseCsv sem campo lei → errors com número da linha e campo correto
 *   3. uploadCsv com dryRun: true → inserted: 0, valid: N
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Replicar parseCsv e CsvRowSchema (mesma lógica do ragAdmin.ts) ────────────
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

function parseCsv(raw: string): Record<string, string>[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];
  const headerLine = lines[0].startsWith("\uFEFF") ? lines[0].slice(1) : lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && line[j + 1] === '"') { current += '"'; j++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? "").trim(); });
    rows.push(row);
  }
  return rows;
}

// ── Simular lógica de validação do uploadCsv ──────────────────────────────────
function simulateUploadCsv(csvContent: string, dryRun: boolean) {
  const rawRows = parseCsv(csvContent);
  const validRows: z.infer<typeof CsvRowSchema>[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const result = CsvRowSchema.safeParse(rawRows[i]);
    if (result.success) {
      validRows.push(result.data);
    } else {
      errors.push({
        row: i + 2, // linha 1 = header
        message: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
      });
    }
  }

  if (dryRun) {
    return { total: rawRows.length, valid: validRows.length, inserted: 0, errors, dryRun: true };
  }

  // Simula inserção (sem banco real nos testes)
  return { total: rawRows.length, valid: validRows.length, inserted: validRows.length, errors, dryRun: false };
}

// ── CSV fixtures ──────────────────────────────────────────────────────────────
const CSV_VALIDO = `lei,artigo,titulo,conteudo,topicos,cnaeGroups,chunkIndex
lc214,Art. 1,Incidência do IBS,"O IBS incide sobre operações com bens ou serviços.",reforma tributária ibs,all,0
lc214,Art. 12,Base de cálculo CBS,"A base de cálculo da CBS é o valor da operação.",cbs base cálculo,all,1`;

const CSV_SEM_LEI = `lei,artigo,titulo,conteudo,topicos,cnaeGroups,chunkIndex
,Art. 1,Título sem lei,"Conteúdo suficientemente longo para passar na validação.",topico,all,0`;

// ── Testes ────────────────────────────────────────────────────────────────────
describe("ragAdmin.upload — Sprint L / Fase 1", () => {
  it("Caso 1: parseCsv com CSV válido → 2 linhas com colunas corretas, zero erros", () => {
    const rows = parseCsv(CSV_VALIDO);

    expect(rows).toHaveLength(2);

    // Linha 1
    expect(rows[0].lei).toBe("lc214");
    expect(rows[0].artigo).toBe("Art. 1");
    expect(rows[0].titulo).toBe("Incidência do IBS");
    expect(rows[0].conteudo).toBe("O IBS incide sobre operações com bens ou serviços.");
    expect(rows[0].chunkIndex).toBe("0");

    // Linha 2
    expect(rows[1].lei).toBe("lc214");
    expect(rows[1].artigo).toBe("Art. 12");
    expect(rows[1].chunkIndex).toBe("1");

    // Validação Zod — zero erros
    const erros = rows.filter((r) => !CsvRowSchema.safeParse(r).success);
    expect(erros).toHaveLength(0);
  });

  it("Caso 2: parseCsv sem campo lei → errors com número da linha e campo correto", () => {
    const result = simulateUploadCsv(CSV_SEM_LEI, true);

    expect(result.total).toBe(1);
    expect(result.valid).toBe(0);
    expect(result.errors).toHaveLength(1);

    // Linha 2 (header é linha 1)
    expect(result.errors[0].row).toBe(2);
    // Mensagem deve mencionar o campo 'lei'
    expect(result.errors[0].message).toContain("lei");
  });

  it("Caso 3: uploadCsv com dryRun: true → inserted: 0, valid: 2", () => {
    const result = simulateUploadCsv(CSV_VALIDO, true);

    expect(result.dryRun).toBe(true);
    expect(result.inserted).toBe(0);
    expect(result.valid).toBe(2);
    expect(result.total).toBe(2);
    expect(result.errors).toHaveLength(0);
  });
});
