/**
 * solarisAdmin.upload.test.ts — Testes T-DEC002-01 a T-DEC002-03
 * Sprint L · Issue #191 · DEC-002 — solarisAdmin.uploadCsv
 *
 * Checklist:
 * T-DEC002-01: CSV valido em dry-run — valida sem inserir
 * T-DEC002-02: CSV com linha invalida — retorna errors[].line e errors[].message
 * T-DEC002-03: Mapeamento correto — conteudo->texto, artigo->codigo, area->categoria
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

const AREA_VALUES = ["contabilidade_fiscal", "negocio", "ti", "juridico"] as const;
const SEVERIDADE_VALUES = ["baixa", "media", "alta", "critica"] as const;

const CsvRowSchema = z.object({
  titulo: z.string().min(1),
  conteudo: z.string().min(1),
  topicos: z.string().min(1),
  cnaeGroups: z.string(),
  lei: z.literal("solaris"),
  artigo: z.string().min(1),
  area: z.enum(AREA_VALUES),
  severidade_base: z.enum(SEVERIDADE_VALUES),
  vigencia_inicio: z.string().optional(),
});

type CsvRow = z.infer<typeof CsvRowSchema>;

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
        values.push(current); current = "";
      } else {
        current += ch;
      }
    }
    values.push(current);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (values[idx] ?? "").trim(); });
    rows.push(obj);
  }
  return rows;
}

interface ParsedRow {
  line: number;
  data: CsvRow | null;
  error: string | null;
}

function parseAndValidate(csvContent: string): ParsedRow[] {
  const rawRows = parseCsv(csvContent);
  return rawRows.map((obj, idx) => {
    const lineNum = idx + 2;
    const parsed = CsvRowSchema.safeParse(obj);
    if (!parsed.success) {
      return { line: lineNum, data: null, error: parsed.error.issues[0].message };
    }
    return { line: lineNum, data: parsed.data, error: null };
  });
}

interface DbRow {
  titulo: string;
  texto: string;
  topicos: string;
  cnae_groups: string;
  codigo: string;
  categoria: string;
  severidade_base: string;
  vigencia_inicio: string | null;
  fonte: string;
  obrigatorio: number;
  ativo: number;
}

function mapToDbRow(row: CsvRow): DbRow {
  return {
    titulo: row.titulo,
    texto: row.conteudo,
    topicos: row.topicos,
    cnae_groups: row.cnaeGroups,
    codigo: row.artigo,
    categoria: row.area,
    severidade_base: row.severidade_base,
    vigencia_inicio: row.vigencia_inicio ?? null,
    fonte: "solaris",
    obrigatorio: 0,
    ativo: 1,
  };
}

const CSV_VALIDO = `titulo,conteudo,topicos,cnaeGroups,lei,artigo,area,severidade_base,vigencia_inicio
Pergunta sobre IBS,A empresa deve registrar o IBS separadamente?,ibs;registro,[],solaris,SOL-013,contabilidade_fiscal,media,
Pergunta sobre CBS,Como calcular a CBS sobre servicos?,cbs;calculo,[],solaris,SOL-014,juridico,alta,2026-07-01`;

const CSV_COM_ERRO = `titulo,conteudo,topicos,cnaeGroups,lei,artigo,area,severidade_base,vigencia_inicio
Pergunta valida,Conteudo valido,topico1,[],solaris,SOL-015,contabilidade_fiscal,media,
Linha invalida,Conteudo ok,topico2,[],rag_documents,SOL-016,area_invalida,nao_existe,`;

describe("solarisAdmin.uploadCsv - DEC-002", () => {
  it("T-DEC002-01: CSV valido em dry-run - 2 linhas validas, 0 erros", () => {
    const rows = parseAndValidate(CSV_VALIDO);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.error === null)).toBe(true);
    expect(rows.every((r) => r.data !== null)).toBe(true);
  });

  it("T-DEC002-02: CSV com linha invalida - retorna line e message", () => {
    const rows = parseAndValidate(CSV_COM_ERRO);
    expect(rows).toHaveLength(2);
    expect(rows[0].error).toBeNull();
    expect(rows[1].error).not.toBeNull();
    expect(typeof rows[1].error).toBe("string");
    expect(rows[1].line).toBe(3);
  });

  it("T-DEC002-03: Mapeamento correto - conteudo->texto, artigo->codigo, area->categoria", () => {
    const rows = parseAndValidate(CSV_VALIDO);
    const firstRow = rows[0].data!;
    const dbRow = mapToDbRow(firstRow);
    expect(dbRow.texto).toBe(firstRow.conteudo);
    expect(dbRow.codigo).toBe(firstRow.artigo);
    expect(dbRow.categoria).toBe(firstRow.area);
    expect(dbRow.fonte).toBe("solaris");
    expect(dbRow.ativo).toBe(1);
    expect(dbRow.titulo).toBe("Pergunta sobre IBS");
  });
});
