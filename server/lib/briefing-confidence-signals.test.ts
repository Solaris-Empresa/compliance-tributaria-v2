/**
 * briefing-confidence-signals.test.ts — testes unitários do signals module.
 * Testa apenas as partes puras (sem queries de DB).
 */

import { describe, it, expect } from "vitest";
import {
  computePerfilCompleteness,
  countQ3CnaeAnswers,
  PERFIL_CAMPOS_OBRIGATORIOS,
  PERFIL_CAMPOS_OPCIONAIS,
} from "./briefing-confidence-signals";

describe("computePerfilCompleteness — replica calcProfileScore do frontend", () => {
  it("7 obrigatórios + 12 opcionais", () => {
    expect(PERFIL_CAMPOS_OBRIGATORIOS.length).toBe(7);
    expect(PERFIL_CAMPOS_OPCIONAIS.length).toBe(12);
  });

  it("perfil vazio → 0%", () => {
    const r = computePerfilCompleteness({});
    expect(r.completude).toBe(0);
    expect(r.obrigatoriosPreenchidos).toBe(0);
    expect(r.opcionaisPreenchidos).toBe(0);
  });

  it("só obrigatórios completos → 70%", () => {
    const r = computePerfilCompleteness({
      companyProfile: {
        cnpj: "00.000.000/0001-00",
        companyType: "LTDA",
        companySize: "media",
        taxRegime: "lucro_real",
        operationType: "produto",
      },
      operationProfile: {
        clientType: ["B2B"],
        multiState: true,
      },
    });
    expect(r.obrigatoriosPreenchidos).toBe(7);
    expect(r.opcionaisPreenchidos).toBe(0);
    // 7/7 · 0.7 + 0/12 · 0.3 = 0.7
    expect(r.completude).toBeCloseTo(0.7, 5);
  });

  it("perfil 100% (todos obrigatórios + todos opcionais) → 100%", () => {
    const r = computePerfilCompleteness({
      companyProfile: {
        cnpj: "00.000.000/0001-00",
        companyType: "LTDA",
        companySize: "media",
        taxRegime: "lucro_real",
        annualRevenueRange: "4800000-78000000",
      },
      operationProfile: {
        operationType: "produto",
        clientType: ["B2B"],
        multiState: true,
        principaisProdutos: [{ ncm_code: "1006" }],
        isEconomicGroup: true,
        taxCentralization: "centralizada",
      },
      taxComplexity: {
        hasMultipleEstablishments: true,
        hasImportExport: false,
        hasSpecialRegimes: false,
      },
      financialProfile: {
        paymentMethods: ["PIX", "Boleto"],
        hasIntermediaries: false,
      },
      governanceProfile: {
        hasTaxTeam: true,
        hasAudit: true,
        hasTaxIssues: false,
      },
    });
    expect(r.obrigatoriosPreenchidos).toBe(7);
    expect(r.opcionaisPreenchidos).toBe(12);
    expect(r.completude).toBe(1);
  });

  it("multiState=false ainda conta como preenchido (boolean presente)", () => {
    const r = computePerfilCompleteness({
      companyProfile: {
        cnpj: "00.000.000/0001-00",
        companyType: "LTDA",
        companySize: "media",
        taxRegime: "lucro_real",
        operationType: "produto",
      },
      operationProfile: {
        clientType: ["B2B"],
        multiState: false, // boolean presente
      },
    });
    expect(r.obrigatoriosPreenchidos).toBe(7);
  });

  it("arrays vazios (clientType/paymentMethods) NÃO contam", () => {
    const r = computePerfilCompleteness({
      companyProfile: { cnpj: "X" },
      operationProfile: { clientType: [] },
      financialProfile: { paymentMethods: [] },
    });
    expect(r.obrigatoriosPreenchidos).toBe(1); // só cnpj
  });

  it("cenário real do PDF Jose Combustível (perfil 100%)", () => {
    const r = computePerfilCompleteness({
      companyProfile: {
        cnpj: "00.394.460/0058-87",
        companyType: "LTDA",
        companySize: "grande",
        taxRegime: "lucro_real",
        annualRevenueRange: "4800000-78000000",
      },
      operationProfile: {
        operationType: "servicos",
        clientType: ["B2B"],
        multiState: true,
        principaisServicos: [{ nbs_code: "1.0501.14.51" }],
        isEconomicGroup: true,
        taxCentralization: "parcialmente_centralizado",
      },
      taxComplexity: {
        hasMultipleEstablishments: true,
        hasImportExport: false,
        hasSpecialRegimes: true,
      },
      financialProfile: {
        paymentMethods: ["Boleto", "PIX", "TED/DOC"],
        hasIntermediaries: true,
      },
      governanceProfile: {
        hasTaxTeam: true,
        hasAudit: true,
        hasTaxIssues: true,
      },
    });
    expect(r.completude).toBe(1);
  });
});

describe("countQ3CnaeAnswers", () => {
  it("array vazio → 0", () => {
    expect(countQ3CnaeAnswers([])).toBe(0);
    expect(countQ3CnaeAnswers(null)).toBe(0);
  });

  it("string JSON é parseada", () => {
    const s = JSON.stringify([{ cnaeCode: "4639-7/01", questions: [{ q: "a" }, { q: "b" }] }]);
    expect(countQ3CnaeAnswers(s)).toBe(2);
  });

  it("exclui CORPORATIVO e OPERACIONAL (legado)", () => {
    const arr = [
      { cnaeCode: "4639-7/01", questions: [1, 2, 3] },
      { cnaeCode: "CORPORATIVO", questions: [1, 2, 3, 4] },
      { cnaeCode: "OPERACIONAL", questions: [1] },
      { cnaeCode: "4930-2/02", questions: [1, 2] },
    ];
    expect(countQ3CnaeAnswers(arr)).toBe(5); // só CNAEs reais: 3 + 2
  });
});
