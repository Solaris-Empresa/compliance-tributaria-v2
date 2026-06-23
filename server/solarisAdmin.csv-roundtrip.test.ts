/**
 * solarisAdmin.csv-roundtrip.test.ts — CSV-TEMPLATE-FIX-01 / PR B.1 (#6)
 *
 * DoD #1 (determinístico): exportar 1 pergunta → reimportar sem editar → idêntica.
 *
 * Estratégia (Lição #110 + REGRA-ORQ-27): importa o `parseCsv` REAL de
 * server/routers/solarisAdmin.ts (não replica o schema) e alimenta com uma linha
 * no FORMATO EXATO produzido por exportCsv (client/src/pages/AdminSolarisQuestions.tsx),
 * provando que o export é parser-compatível e que `gap_descricao` sobrevive ao round-trip.
 *
 * Cobre as metades do round-trip:
 *   - export → string CSV (espelhado abaixo, fiel ao exportCsv)
 *   - string CSV → parseCsv → CsvRow (parser real)
 * O E2E completo export→import em produção é o passo de DoD do Validador (Manus).
 */
import { describe, it, expect } from "vitest";
import { parseCsv } from "./routers/solarisAdmin";

// ── Espelho FIEL do exportCsv (AdminSolarisQuestions.tsx) ─────────────────────
// Mesmas 13 colunas/ordem, separador de COLUNA vírgula, separador INTERNO ";",
// vigencia_inicio CRUA, gap_descricao incluída.
const COLS = [
  "titulo", "conteudo", "topicos", "cnaeGroups", "lei", "artigo", "categoria",
  "severidade_base", "vigencia_inicio", "risk_category_code", "classification_scope",
  "gap_descricao", "taxRegimes",
] as const;

const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;

interface QuestionLike {
  titulo: string;
  texto: string;
  topicos: string | null;
  cnae_groups: string[] | null;
  codigo: string;
  categoria: string;
  severidade_base: string | null;
  vigencia_inicio: string | null;
  risk_category_code: string | null;
  classification_scope: string | null;
  gap_descricao: string | null;
  tax_regimes: string[] | null;
}

function exportValue(q: QuestionLike, c: string): string {
  switch (c) {
    case "titulo": return q.titulo ?? "";
    case "conteudo": return q.texto ?? "";
    case "topicos": return q.topicos ?? "";
    case "cnaeGroups": return (q.cnae_groups ?? []).join(";");
    case "lei": return "solaris";
    case "artigo": return q.codigo ?? "";
    case "categoria": return q.categoria ?? "";
    case "severidade_base": return q.severidade_base ?? "";
    case "vigencia_inicio": return q.vigencia_inicio == null ? "" : String(q.vigencia_inicio);
    case "risk_category_code": return q.risk_category_code ?? "";
    case "classification_scope": return q.classification_scope ?? "risk_engine";
    case "gap_descricao": return q.gap_descricao ?? "";
    case "taxRegimes": return (q.tax_regimes ?? []).join(";");
    default: return "";
  }
}

function exportCsv(questions: QuestionLike[]): string {
  const header = COLS.join(",");
  const lines = questions.map((q) => COLS.map((c) => esc(exportValue(q, c))).join(","));
  return "﻿" + header + "\n" + lines.join("\n");
}

const conditional: QuestionLike = {
  titulo: "Pergunta condicional por CNAE e regime",
  texto: "Texto da pergunta para atacadistas agro",
  topicos: "credito_presumido;nf_e",
  cnae_groups: ["4639-7/01", "4632-0/01"],
  codigo: "SOL-101",
  categoria: "contabilidade_fiscal",
  severidade_base: "alta",
  vigencia_inicio: "2026-07-01",
  risk_category_code: "credito_presumido",
  classification_scope: "risk_engine",
  gap_descricao: "Empresa nao apropriou credito presumido do agro",
  tax_regimes: ["simples_nacional", "lucro_real"],
};

const universal: QuestionLike = {
  titulo: "Exemplo universal",
  texto: "Texto completo da pergunta aqui",
  topicos: "topico1;topico2",
  cnae_groups: null,
  codigo: "SOL-100",
  categoria: "contabilidade_fiscal",
  severidade_base: "media",
  vigencia_inicio: null,
  risk_category_code: "obrigacao_acessoria",
  classification_scope: "risk_engine",
  gap_descricao: null,
  tax_regimes: null,
};

describe("CSV round-trip identidade (CSV-TEMPLATE-FIX-01 B.1)", () => {
  it("export → parseCsv reproduz TODOS os campos da pergunta condicional", () => {
    const csv = exportCsv([conditional]);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].error).toBeNull();
    const d = rows[0].data!;
    expect(d.titulo).toBe("Pergunta condicional por CNAE e regime");
    expect(d.conteudo).toBe("Texto da pergunta para atacadistas agro");
    expect(d.topicos).toBe("credito_presumido;nf_e");
    expect(d.cnaeGroups).toBe("4639-7/01;4632-0/01"); // multi-valor ";" preservado
    expect(d.lei).toBe("solaris");
    expect(d.artigo).toBe("SOL-101"); // → codigo
    expect(d.categoria).toBe("contabilidade_fiscal");
    expect(d.severidade_base).toBe("alta");
    expect(d.vigencia_inicio).toBe("2026-07-01"); // valor CRU "YYYY-MM-DD" (não pt-BR)
    expect(d.risk_category_code).toBe("credito_presumido");
    expect(d.classification_scope).toBe("risk_engine");
    expect(d.taxRegimes).toBe("simples_nacional;lucro_real"); // multi-valor ";" preservado
  });

  it("gap_descricao SOBREVIVE ao round-trip (headline #1 — sem perda de dado)", () => {
    const csv = exportCsv([conditional]);
    const rows = parseCsv(csv);
    expect(rows[0].data!.gap_descricao).toBe("Empresa nao apropriou credito presumido do agro");
  });

  it("pergunta universal: cnaeGroups/taxRegimes/gap_descricao vazios → universal preservado", () => {
    const csv = exportCsv([universal]);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].error).toBeNull();
    const d = rows[0].data!;
    expect(d.cnaeGroups).toBe(""); // vazio = universal (vira NULL no INSERT)
    expect(d.taxRegimes).toBe(""); // vazio = universal
    expect(d.gap_descricao ?? "").toBe(""); // vazio = fallback G17
    expect(d.vigencia_inicio ?? "").toBe("");
  });

  it("export de N perguntas → parseCsv retorna N linhas válidas (lote)", () => {
    const csv = exportCsv([conditional, universal]);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.error === null)).toBe(true);
    expect(rows.map((r) => r.data!.artigo)).toEqual(["SOL-101", "SOL-100"]);
  });
});
