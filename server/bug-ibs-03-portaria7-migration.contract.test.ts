/**
 * BUG-IBS-03 — contrato da migration 0109 (Portaria MF/CGIBS 7 nos bundles).
 * 3 categorias de fluxo unificado recebem artigos_portaria7 = ['Art. 1'].
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0109_bug_ibs_03_portaria7.sql"),
  "utf8",
);

const CATS = ["split_payment", "confissao_automatica", "obrigacao_acessoria"];

describe("BUG-IBS-03 — migration 0109 (Portaria 7)", () => {
  it("3 UPDATEs executados (não conta o do comentário DOWN)", () => {
    expect((SQL.match(/^UPDATE risk_categories/gm) ?? []).length).toBe(3);
    for (const c of CATS) expect(SQL).toMatch(new RegExp(`WHERE codigo = '${c}'`));
  });

  it("JSON_SET na chave NOVA artigos_portaria7 = ['Art. 1'] (3x)", () => {
    const m = SQL.match(/JSON_SET\(normative_bundle, '\$\.artigos_portaria7', JSON_ARRAY\('Art\. 1'\)\)/g) ?? [];
    expect(m.length).toBe(3);
  });

  it("idempotente (JSON_SET, não JSON_ARRAY_APPEND/INSERT)", () => {
    expect(SQL).not.toMatch(/JSON_ARRAY_APPEND|JSON_ARRAY_INSERT/);
  });

  it("NÃO toca categorias fora do escopo (imóveis/credito/etc.)", () => {
    expect(SQL).not.toMatch(/WHERE codigo = 'regime_especifico_imoveis'/);
    expect(SQL).not.toMatch(/WHERE codigo = 'credito_presumido'/);
  });

  it("DOWN documentado: JSON_REMOVE de artigos_portaria7", () => {
    expect(SQL).toMatch(/DOWN/);
    expect(SQL).toMatch(/JSON_REMOVE\(normative_bundle, '\$\.artigos_portaria7'\)/);
  });
});
