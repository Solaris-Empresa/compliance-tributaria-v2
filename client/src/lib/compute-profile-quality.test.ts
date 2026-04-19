import { describe, it, expect } from "vitest";
import { computeProfileQuality } from "./compute-profile-quality";

describe("computeProfileQuality", () => {
  it("retorna 0% para perfil null/undefined", () => {
    expect(computeProfileQuality(null)).toEqual({
      percent: 0,
      filled: 0,
      total: 16,
    });
    expect(computeProfileQuality(undefined)).toEqual({
      percent: 0,
      filled: 0,
      total: 16,
    });
  });

  it("retorna 0% para perfil vazio (todos os campos nulos)", () => {
    const result = computeProfileQuality({});
    expect(result).toEqual({ percent: 0, filled: 0, total: 16 });
  });

  it("retorna 100% quando todos os 16 campos estao preenchidos", () => {
    const result = computeProfileQuality({
      cnpj: "12345678000199",
      companyType: "ltda",
      companySize: "medio",
      taxRegime: "lucro_real",
      annualRevenueRange: "10m_50m",
      operationType: "servicos",
      clientType: ["b2b"],
      paymentMethods: ["boleto"],
      multiState: true,
      hasMultipleEstablishments: false,
      hasImportExport: true,
      hasSpecialRegimes: false,
      hasIntermediaries: true,
      hasTaxTeam: true,
      hasAudit: false,
      hasTaxIssues: false,
    });
    expect(result).toEqual({ percent: 100, filled: 16, total: 16 });
  });

  it("CNPJ com menos de 14 digitos nao conta como preenchido", () => {
    const result = computeProfileQuality({ cnpj: "123" });
    expect(result.filled).toBe(0);
  });

  it("CNPJ formatado com mascara conta quando tem 14 digitos", () => {
    const result = computeProfileQuality({ cnpj: "12.345.678/0001-99" });
    expect(result.filled).toBe(1);
  });

  it("array vazio nao conta como preenchido", () => {
    const result = computeProfileQuality({
      clientType: [],
      paymentMethods: [],
    });
    expect(result.filled).toBe(0);
  });

  it("string vazia/espacos nao conta como preenchido", () => {
    const result = computeProfileQuality({
      companyType: "",
      companySize: "   ",
    });
    expect(result.filled).toBe(0);
  });

  it("boolean false conta como preenchido (decisao foi tomada)", () => {
    const result = computeProfileQuality({
      multiState: false,
      hasImportExport: false,
    });
    expect(result.filled).toBe(2);
  });

  it("arredonda percentual com Math.round", () => {
    const result = computeProfileQuality({
      cnpj: "12345678000199",
      companyType: "ltda",
      companySize: "medio",
    });
    expect(result.filled).toBe(3);
    expect(result.percent).toBe(Math.round((3 / 16) * 100));
  });

  it("calcula 50% quando 8 de 16 campos preenchidos", () => {
    const result = computeProfileQuality({
      cnpj: "12345678000199",
      companyType: "ltda",
      companySize: "medio",
      taxRegime: "lucro_real",
      annualRevenueRange: "ate_1m",
      operationType: "servicos",
      clientType: ["b2b"],
      paymentMethods: ["pix"],
    });
    expect(result).toEqual({ percent: 50, filled: 8, total: 16 });
  });
});
