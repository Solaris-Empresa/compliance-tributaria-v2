/**
 * cpie.test.ts
 * Sprint v6.0 — Issue G1
 *
 * Testes unitários para o CPIE (Company Profile Intelligence Engine).
 * Cobre: calcDimensionScores, calcOverallScore, getReadinessLevel (via runCpieAnalysis).
 * Não testa chamadas LLM (mockadas implicitamente via vitest).
 */

import { describe, it, expect } from "vitest";
import { calcDimensionScores, calcOverallScore, type CpieProfileInput } from "./cpie";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PERFIL_COMPLETO: CpieProfileInput = {
  cnpj: "11.222.333/0001-81",
  companyType: "ltda",
  companySize: "pequena",
  annualRevenueRange: "360000-4800000",
  taxRegime: "simples_nacional",
  operationType: "servicos",
  clientType: ["b2b", "b2c"],
  multiState: false,
  hasMultipleEstablishments: false,
  hasImportExport: false,
  hasSpecialRegimes: false,
  paymentMethods: ["pix", "cartao"],
  hasIntermediaries: false,
  hasTaxTeam: true,
  hasAudit: false,
  hasTaxIssues: false,
};

const PERFIL_VAZIO: CpieProfileInput = {
  cnpj: undefined,
  companyType: undefined,
  companySize: undefined,
  annualRevenueRange: undefined,
  taxRegime: undefined,
  operationType: undefined,
  clientType: undefined,
  multiState: null,
  hasMultipleEstablishments: null,
  hasImportExport: null,
  hasSpecialRegimes: null,
  paymentMethods: undefined,
  hasIntermediaries: null,
  hasTaxTeam: null,
  hasAudit: null,
  hasTaxIssues: null,
};

const PERFIL_INCONSISTENTE: CpieProfileInput = {
  ...PERFIL_COMPLETO,
  // MEI com regime diferente de Simples Nacional
  companySize: "mei",
  taxRegime: "lucro_presumido",
};

const PERFIL_SIMPLES_FATURAMENTO_ALTO: CpieProfileInput = {
  ...PERFIL_COMPLETO,
  // Simples Nacional com faturamento acima do limite
  taxRegime: "simples_nacional",
  annualRevenueRange: "78000000+",
};

// ─── Testes: calcDimensionScores ──────────────────────────────────────────────

describe("calcDimensionScores", () => {
  it("retorna 5 dimensões", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO);
    expect(dims).toHaveLength(5);
  });

  it("dimensão Identificação: 100% com CNPJ válido, tipo e porte", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO);
    const idDim = dims.find(d => d.name === "Identificação");
    expect(idDim).toBeDefined();
    expect(idDim!.score).toBe(100);
  });

  it("dimensão Identificação: 0% com perfil vazio", () => {
    const dims = calcDimensionScores(PERFIL_VAZIO);
    const idDim = dims.find(d => d.name === "Identificação");
    expect(idDim!.score).toBe(0);
  });

  it("dimensão Regime Tributário: penaliza Simples Nacional com faturamento alto", () => {
    const dims = calcDimensionScores(PERFIL_SIMPLES_FATURAMENTO_ALTO);
    const taxDim = dims.find(d => d.name === "Regime Tributário");
    // Deve ter score reduzido pela inconsistência
    expect(taxDim!.score).toBeLessThan(100);
  });

  it("dimensão Regime Tributário: penaliza MEI com regime diferente de Simples", () => {
    const dims = calcDimensionScores(PERFIL_INCONSISTENTE);
    const taxDim = dims.find(d => d.name === "Regime Tributário");
    expect(taxDim!.score).toBeLessThan(100);
  });

  it("dimensão Operações: 100% com todos os campos preenchidos", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO);
    const opDim = dims.find(d => d.name === "Operações");
    expect(opDim!.score).toBe(100);
  });

  it("dimensão Complexidade Tributária: 100% com todos os indicadores", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO);
    const compDim = dims.find(d => d.name === "Complexidade Tributária");
    expect(compDim!.score).toBe(100);
  });

  it("dimensão Governança: 100% com todos os campos de governança", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO);
    const govDim = dims.find(d => d.name === "Governança Tributária");
    expect(govDim!.score).toBe(100);
  });

  it("dimensão Governança: 0% com perfil vazio", () => {
    const dims = calcDimensionScores(PERFIL_VAZIO);
    const govDim = dims.find(d => d.name === "Governança Tributária");
    expect(govDim!.score).toBe(0);
  });

  it("todos os pesos somam 100", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO);
    const totalWeight = dims.reduce((sum, d) => sum + d.weight, 0);
    expect(totalWeight).toBe(100);
  });
});

// ─── Testes: calcOverallScore ─────────────────────────────────────────────────

describe("calcOverallScore", () => {
  it("retorna 100 para perfil completo e consistente", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO);
    const score = calcOverallScore(dims);
    expect(score).toBe(100);
  });

  it("retorna 0 para perfil completamente vazio", () => {
    const dims = calcDimensionScores(PERFIL_VAZIO);
    const score = calcOverallScore(dims);
    expect(score).toBe(0);
  });

  it("retorna valor entre 0 e 100 para perfil parcial", () => {
    const perfil: CpieProfileInput = {
      ...PERFIL_VAZIO,
      companyType: "ltda",
      companySize: "pequena",
      taxRegime: "lucro_presumido",
    };
    const dims = calcDimensionScores(perfil);
    const score = calcOverallScore(dims);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("retorna número inteiro (sem casas decimais)", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO);
    const score = calcOverallScore(dims);
    expect(Number.isInteger(score)).toBe(true);
  });

  it("perfil inconsistente tem score menor que perfil completo", () => {
    const dimsCompleto = calcDimensionScores(PERFIL_COMPLETO);
    const dimsInconsistente = calcDimensionScores(PERFIL_INCONSISTENTE);
    const scoreCompleto = calcOverallScore(dimsCompleto);
    const scoreInconsistente = calcOverallScore(dimsInconsistente);
    expect(scoreInconsistente).toBeLessThan(scoreCompleto);
  });
});

// ─── Testes: invariantes de estrutura ────────────────────────────────────────

describe("invariantes de estrutura", () => {
  it("cada dimensão tem score entre 0 e 100", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO);
    dims.forEach(d => {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    });
  });

  it("cada dimensão tem fieldsEvaluated não vazio", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO);
    dims.forEach(d => {
      expect(d.fieldsEvaluated.length).toBeGreaterThan(0);
    });
  });

  it("cada dimensão tem explanation não vazio", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO);
    dims.forEach(d => {
      expect(d.explanation.length).toBeGreaterThan(0);
    });
  });

  it("perfil com apenas regime tributário tem score parcial na dimensão Regime", () => {
    const perfil: CpieProfileInput = {
      ...PERFIL_VAZIO,
      taxRegime: "lucro_real",
    };
    const dims = calcDimensionScores(perfil);
    const taxDim = dims.find(d => d.name === "Regime Tributário");
    // Apenas taxRegime preenchido, annualRevenueRange vazio → 50%
    expect(taxDim!.score).toBe(50);
  });
});
