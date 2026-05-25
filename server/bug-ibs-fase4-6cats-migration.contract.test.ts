/**
 * FASE 4 / Passo 4 — contrato da migration 0112 (6 categorias regime_diferenciado, Opção B).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0112_bug_ibs_fase4_6cats.sql"),
  "utf8",
);

const CATS = [
  "regime_diferenciado_aliquota_reduzida_30",
  "regime_diferenciado_aliquota_reduzida_60",
  "regime_diferenciado_aliquota_zero",
  "regime_diferenciado_transporte",
  "regime_diferenciado_produtor_rural",
  "regime_diferenciado_produtor_rural_credito",
];

/** artigos_cgibs6 da categoria (extrai o JSON_ARRAY após 'artigos_cgibs6'). */
function artigos(codigo: string): string[] {
  const idx = SQL.indexOf(`'${codigo}'`);
  const slice = SQL.slice(idx);
  const m = slice.match(/'artigos_cgibs6', JSON_ARRAY\(([^)]*)\)/);
  return m ? (m[1].match(/'Art\. \d+'/g) ?? []).map((s) => s.replace(/'/g, "")) : [];
}

describe("FASE 4 Passo 4 — migration 0112 (6 cats)", () => {
  it("6 INSERTs executados", () => {
    expect((SQL.match(/^INSERT INTO risk_categories/gm) ?? []).length).toBe(6);
    for (const c of CATS) expect(SQL).toContain(`'${c}'`);
  });

  it("reduzida_60 = 18 artigos (200,201,203-218)", () => {
    const a = artigos("regime_diferenciado_aliquota_reduzida_60");
    expect(a).toHaveLength(18);
    expect(a).toContain("Art. 203");
    expect(a).toContain("Art. 218");
    expect(a).not.toContain("Art. 202"); // 202 é só do _30
  });

  it("aliquota_zero = 16 artigos (200,201,219-232)", () => {
    const a = artigos("regime_diferenciado_aliquota_zero");
    expect(a).toHaveLength(16);
    expect(a).toContain("Art. 219");
    expect(a).toContain("Art. 232");
  });

  it("produtor_rural=238-244 (7) · produtor_rural_credito=245-250 (6)", () => {
    expect(artigos("regime_diferenciado_produtor_rural")).toHaveLength(7);
    expect(artigos("regime_diferenciado_produtor_rural_credito")).toHaveLength(6);
  });

  it("reduzida_60 e aliquota_zero SEM cnae_codes (transversal); as outras 4 COM", () => {
    expect((SQL.match(/'cnae_codes', JSON_ARRAY/g) ?? []).length).toBe(4);
  });

  it("produtor_rural_credito = pending_vigency + 2027-01-01 (Opção B); 5 confirmed", () => {
    expect((SQL.match(/'nacional', 'pending_vigency'/g) ?? []).length).toBe(1);
    expect((SQL.match(/'2027-01-01', NULL,/g) ?? []).length).toBe(1);
    expect((SQL.match(/'nacional', 'confirmed'/g) ?? []).length).toBe(5);
  });

  it("7 NOT NULL preenchidos (column list 6x) + idempotência + DOWN", () => {
    const colList = /\(codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,\s*vigencia_inicio, vigencia_fim, status, origem, escopo, normative_status, normative_bundle\)/g;
    expect((SQL.match(colList) ?? []).length).toBe(6);
    expect((SQL.match(/FROM DUAL WHERE NOT EXISTS/g) ?? []).length).toBe(6);
    expect(SQL).toMatch(/DOWN/);
  });
});
