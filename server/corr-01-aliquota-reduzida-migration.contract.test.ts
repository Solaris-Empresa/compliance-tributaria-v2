/**
 * CORR-01 — contrato da migration 0110 (aliquota_reduzida ← CGIBS Art. 202-218).
 * Valida 17 artigos (202..218), normative_status='confirmed' e a estrutura correta
 * (JSON_SET na chave artigos_cgibs6, strings 'Art. NNN' — não números crus).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0110_corr_01_aliquota_reduzida_artigos.sql"),
  "utf8",
);

/** Artigos da JSON_ARRAY do UPDATE executado (1ª — UP; DOWN está em comentário). */
function artigos(): string[] {
  const m = SQL.match(/JSON_ARRAY\(\s*((?:'Art\. \d+',?\s*)+)\)/);
  return m ? (m[1].match(/'Art\. \d+'/g) ?? []).map((s) => s.replace(/'/g, "")) : [];
}

describe("CORR-01 — migration 0110 (aliquota_reduzida)", () => {
  it("aliquota_reduzida.artigos_cgibs6 tem 17 artigos (202..218)", () => {
    const a = artigos();
    expect(a).toHaveLength(17);
    expect(a[0]).toBe("Art. 202");
    expect(a[16]).toBe("Art. 218");
  });

  it("usa STRINGS 'Art. NNN' (não números crus — senão inArray quebra)", () => {
    expect(SQL).toMatch(/JSON_ARRAY\('Art\. 202'/);
    expect(SQL).not.toMatch(/JSON_ARRAY\(\s*202\s*,/); // sem número cru
  });

  it("usa JSON_SET na chave artigos_cgibs6 (não SET de coluna inexistente)", () => {
    // O UPDATE executado seta normative_bundle via JSON_SET na chave artigos_cgibs6.
    expect(SQL).toMatch(/SET normative_bundle = JSON_SET\(/);
    expect(SQL).toMatch(/'\$\.artigos_cgibs6'/);
  });

  it("normative_status = 'confirmed' (entra no grounding determinístico)", () => {
    expect(SQL).toMatch(/normative_status = 'confirmed'/);
  });

  it("UPDATE executado só em aliquota_reduzida", () => {
    expect((SQL.match(/^UPDATE risk_categories/gm) ?? []).length).toBe(1);
    expect(SQL).toMatch(/WHERE codigo = 'aliquota_reduzida'/);
  });

  it("DOWN documentado (volta para not_covered_materially)", () => {
    expect(SQL).toMatch(/DOWN/);
    expect(SQL).toMatch(/not_covered_materially/);
  });
});
