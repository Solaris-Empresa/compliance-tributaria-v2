/**
 * BUG-RANGE-01 (#1191) — contrato da migration 0105 (validação estática do SQL).
 * Garante: artigos_decreto de confissao_automatica vira ['Art. 44','Art. 46']
 * (remove Art. 112 — obrigação acessória, não confissão). Migration de dados pura.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0105_fix_range_01_confissao_decreto_44_46.sql"),
  "utf8",
);

describe("BUG-RANGE-01 — migration 0105 (contrato do SQL)", () => {
  it("alvo: confissao_automatica", () => {
    expect(SQL).toContain("WHERE codigo = 'confissao_automatica'");
  });

  it("artigos_decreto → ['Art. 44','Art. 46'] (sem Art. 112)", () => {
    expect(SQL).toMatch(/JSON_SET\(\s*normative_bundle,\s*'\$\.artigos_decreto',\s*JSON_ARRAY\('Art\. 44', 'Art\. 46'\)\s*\)/);
    // a linha executável do UPDATE não pode reintroduzir Art. 112
    const updateLine = SQL.split("\n").find((l) => l.includes("'$.artigos_decreto', JSON_ARRAY('Art. 44'")) ?? "";
    expect(updateLine).not.toContain("Art. 112");
  });

  it("idempotência: guard JSON_CONTAINS Art. 112", () => {
    expect(SQL).toMatch(/JSON_CONTAINS\(normative_bundle, '"Art\. 112"', '\$\.artigos_decreto'\)/);
    expect(SQL).toContain("guard idempotência");
  });

  it("não toca engine: 1 UPDATE executável (o do DOWN é comentado)", () => {
    expect((SQL.match(/^UPDATE risk_categories/gm) ?? []).length).toBe(1);
  });

  it("rollback (DOWN) documentado: restaura Art. 112", () => {
    expect(SQL).toMatch(/ROLLBACK \(DOWN\)/i);
    expect(SQL).toMatch(/-- UPDATE risk_categories[\s\S]*Art\. 112/);
  });
});
