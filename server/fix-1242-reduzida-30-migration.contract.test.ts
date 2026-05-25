/**
 * #1242 — contrato da migration 0114 (reconciliar cnae_codes de reduzida_30 — drift prod vs 0112).
 * Decisão P.O.: lista autoritativa = 5 CNAEs de prod (profissionais liberais Art. 127).
 * Estático (lê o .sql) — sem DB, CI-safe (#1043). Padrão: bug-ibs-fase4-6cats-migration.contract.test.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0114_fix_reduzida_30_codes.sql"),
  "utf8",
);

/** Extrai os códigos do JSON_ARRAY do SET '$.cnae_codes' (escopo na cláusula UPDATE, não comentários). */
function setCnaeCodes(): string[] {
  const m = SQL.match(/'\$\.cnae_codes',\s*JSON_ARRAY\(([^)]*)\)/);
  return m ? (m[1].match(/'[\d-]+'/g) ?? []).map((s) => s.replace(/'/g, "")) : [];
}

describe("#1242 — migration 0114 reconcilia cnae_codes de reduzida_30", () => {
  it("é UPDATE de risk_categories na categoria correta", () => {
    expect(SQL).toMatch(/UPDATE risk_categories/);
    expect(SQL).toContain(
      "WHERE codigo = 'regime_diferenciado_aliquota_reduzida_30'",
    );
    expect(SQL).toMatch(/JSON_SET\(\s*normative_bundle,\s*'\$\.cnae_codes'/);
  });

  it("tem exatamente 5 CNAEs de profissionais liberais", () => {
    const cnae = setCnaeCodes();
    expect(cnae).toHaveLength(5);
    expect(cnae).toContain("6911-7"); // Advocacia
    expect(cnae).toContain("6912-5"); // Cartório
    expect(cnae).toContain("6920-6"); // Contabilidade
    expect(cnae).toContain("8650-0"); // Atividades de profissionais da saúde
    expect(cnae).toContain("8690-9"); // Outras atividades de atenção à saúde
  });

  it("NÃO contém os 3 CNAEs removidos do drift do 0112", () => {
    const cnae = setCnaeCodes();
    expect(cnae).not.toContain("7111-1"); // Arquitetura
    expect(cnae).not.toContain("7112-0"); // Engenharia
    expect(cnae).not.toContain("8621-6"); // Lab/emergência
  });
});
