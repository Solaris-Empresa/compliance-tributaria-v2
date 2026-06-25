// clear-pj-only-fields.test.ts — F4 (FORM-NOVO-PROJETO-V2 · cascata PF #1299)
// DoD D11: 8 campos zerados + prova NEGATIVA (preserva os campos não-PJ-only).
import { describe, it, expect } from "vitest";
import { clearPjOnlyFields, type PerfilEmpresaData } from "./PerfilEmpresaIntelligente";

const fullPj: PerfilEmpresaData = {
  cnpj: "11222333000181",
  cpf: "",
  taxIdType: "cnpj",
  companyType: "ltda",
  companySize: "media",
  taxRegime: "lucro_real",
  annualRevenueRange: "4800000-78000000",
  operationType: "industria",
  clientType: ["b2b", "b2c"],
  paymentMethods: ["pix"],
  multiState: true,
  hasMultipleEstablishments: true,
  hasImportExport: true,
  hasIntermediaries: false,
  hasTaxTeam: true,
  hasAudit: true,
  hasTaxIssues: false,
  isEconomicGroup: true,
  taxCentralization: "centralized",
  principaisProdutos: [{ ncm_code: "1006.40.00", descricao: "arroz" }],
  principaisServicos: [],
} as PerfilEmpresaData;

describe("F4 — clearPjOnlyFields: zera os 8 campos PJ-only", () => {
  const c = clearPjOnlyFields(fullPj);

  it("zera os 5 campos string → ''", () => {
    expect(c.companyType).toBe("");
    expect(c.companySize).toBe("");
    expect(c.taxRegime).toBe("");
    expect(c.annualRevenueRange).toBe("");
    expect(c.operationType).toBe("");
  });

  it("zera os 3 campos → null", () => {
    expect(c.isEconomicGroup).toBeNull();
    expect(c.taxCentralization).toBeNull();
    expect(c.hasTaxTeam).toBeNull();
  });
});

describe("F4 — clearPjOnlyFields: PROVA NEGATIVA (NÃO limpa o resto)", () => {
  const c = clearPjOnlyFields(fullPj);

  it("preserva identidade (cnpj/cpf/taxIdType)", () => {
    expect(c.cnpj).toBe("11222333000181");
    expect(c.cpf).toBe("");
    expect(c.taxIdType).toBe("cnpj");
  });

  it("preserva clientType/multiState/paymentMethods", () => {
    expect(c.clientType).toEqual(["b2b", "b2c"]);
    expect(c.multiState).toBe(true);
    expect(c.paymentMethods).toEqual(["pix"]);
  });

  it("preserva complexidade/financeiro/governança-restantes", () => {
    expect(c.hasMultipleEstablishments).toBe(true);
    expect(c.hasImportExport).toBe(true);
    expect(c.hasIntermediaries).toBe(false);
    expect(c.hasAudit).toBe(true);
    expect(c.hasTaxIssues).toBe(false);
  });

  it("preserva produtos/serviços", () => {
    expect(c.principaisProdutos).toHaveLength(1);
    expect(c.principaisProdutos[0].ncm_code).toBe("1006.40.00");
    expect(c.principaisServicos).toEqual([]);
  });
});

describe("F4 — clearPjOnlyFields: pureza", () => {
  it("não muta o original e retorna novo objeto", () => {
    const original = clearPjOnlyFields(fullPj);
    void original;
    expect(fullPj.companyType).toBe("ltda"); // original intacto
    expect(clearPjOnlyFields(fullPj)).not.toBe(fullPj);
  });
});
