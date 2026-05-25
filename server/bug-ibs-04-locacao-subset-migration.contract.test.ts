/**
 * FASE 4 / PR #1215 — contrato da migration 0113 (regime_especifico_imoveis_locacao subset).
 * 8 artigos curados (substitui o range provisório do 0108).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0113_bug_ibs_04_locacao_subset.sql"),
  "utf8",
);

function artigos(): string[] {
  const m = SQL.match(/JSON_SET\(normative_bundle, '\$\.artigos_cgibs6',\s*JSON_ARRAY\(([^)]*)\)/);
  return m ? (m[1].match(/'Art\. \d+'/g) ?? []).map((s) => s.replace(/'/g, "")) : [];
}

describe("PR #1215 — migration 0113 (locacao subset)", () => {
  it("exatamente 8 artigos curados (360,361,363,364,377,378,379,382)", () => {
    expect(artigos()).toEqual([
      "Art. 360", "Art. 361", "Art. 363", "Art. 364",
      "Art. 377", "Art. 378", "Art. 379", "Art. 382",
    ]);
  });

  it("usa JSON_SET na chave artigos_cgibs6 + strings 'Art. NNN'", () => {
    expect(SQL).toMatch(/SET normative_bundle = JSON_SET\(normative_bundle, '\$\.artigos_cgibs6'/);
    expect(SQL).toMatch(/JSON_ARRAY\('Art\. 360'/);
  });

  it("só regime_especifico_imoveis_locacao (1 UPDATE executado)", () => {
    expect((SQL.match(/^UPDATE risk_categories/gm) ?? []).length).toBe(1);
    expect(SQL).toMatch(/WHERE codigo = 'regime_especifico_imoveis_locacao'/);
  });

  it("normative_status = 'confirmed'", () => {
    expect(SQL).toMatch(/normative_status = 'confirmed'/);
  });

  it("DOWN documentado (restaura conjunto 0108)", () => {
    expect(SQL).toMatch(/DOWN/);
    expect(SQL).toMatch(/0108/);
  });
});
