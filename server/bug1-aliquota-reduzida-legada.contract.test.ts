/**
 * BUG-1 #1244 — contrato da migration 0115 (esvaziar artigos_cgibs6 de aliquota_reduzida legada).
 * Estático (lê o .sql) — sem DB, CI-safe (#1043). Padrão: bug-ibs-fase4-6cats-migration.contract.test.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0115_aliquota_reduzida_legada_empty.sql"),
  "utf8",
);

describe("#1244 — migration 0115 esvazia aliquota_reduzida legada", () => {
  it("é UPDATE de risk_categories na categoria legada correta", () => {
    expect(SQL).toMatch(/UPDATE risk_categories/);
    expect(SQL).toContain("WHERE codigo = 'aliquota_reduzida'");
  });

  it("esvazia artigos_cgibs6 (JSON_ARRAY vazio)", () => {
    expect(SQL).toMatch(/'\$\.artigos_cgibs6',\s*JSON_ARRAY\(\s*\)/);
  });

  it("marca legacy_deprecated = true (JSON boolean) + legacy_reason", () => {
    expect(SQL).toMatch(/'\$\.legacy_deprecated',\s*CAST\('true' AS JSON\)/);
    expect(SQL).toContain("'$.legacy_reason'");
  });

  it("legacy_reason é string limpa (sem aspas embutidas — Gate 0)", () => {
    // o despacho usava '"..."' → string JSON duplo-quotada. A correção usa string limpa.
    expect(SQL).not.toMatch(/'\$\.legacy_reason',\s*'"/);
    expect(SQL).toContain("'substituida_por_reduzida_30_e_reduzida_60_mig_0112'");
  });
});
