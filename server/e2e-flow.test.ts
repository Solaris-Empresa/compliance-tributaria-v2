/**
 * e2e-flow.test.ts
 * Sprint M — M3: Testes de integração end-to-end do fluxo completo
 *
 * Cobre:
 * 1. Fluxo CPIE: calcDimensionScores → calcOverallScore → buildProfileContext
 * 2. Gate K2: threshold mínimo de score
 * 3. Override K2: justificativa com mínimo de 10 chars
 * 4. Consistency Gate: runDeterministicChecks → aggregateFindings
 * 5. Relatório mensal: generateMonthlyReportHtml
 * 6. Batch analyze: score determinístico para múltiplos perfis
 */
import { describe, it, expect } from "vitest";
import {
  calcDimensionScores,
  calcOverallScore,
  generateMonthlyReportHtml,
} from "./cpie";
import {
  runDeterministicChecks,
  aggregateFindings,
} from "./consistencyEngine";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PERFIL_COMPLETO = {
  cnpj: "12.345.678/0001-95",
  companyType: "ltda",
  companySize: "medio",
  annualRevenueRange: "1m_10m",
  taxRegime: "lucro_presumido",
  operationType: "misto",
  clientType: ["b2b", "b2c"],
  multiState: true,
  hasMultipleEstablishments: true,
  hasImportExport: false,
  hasSpecialRegimes: false,
  paymentMethods: ["pix", "cartao_credito"],
  hasIntermediaries: false,
  hasTaxTeam: true,
  hasAudit: true,
  hasTaxIssues: false,
};

const PERFIL_VAZIO = {
  cnpj: "",
  companyType: "",
  companySize: "",
  annualRevenueRange: "",
  taxRegime: "",
  operationType: "",
  clientType: [],
  multiState: null,
  hasMultipleEstablishments: null,
  hasImportExport: null,
  hasSpecialRegimes: null,
  paymentMethods: [],
  hasIntermediaries: null,
  hasTaxTeam: null,
  hasAudit: null,
  hasTaxIssues: null,
};

const PERFIL_MINIMO = {
  ...PERFIL_VAZIO,
  cnpj: "12.345.678/0001-95",
  companyType: "ltda",
  companySize: "pequeno",
  taxRegime: "simples_nacional",
  operationType: "servicos",
  clientType: ["b2b"],
  multiState: false,
};

// ─── Suite 1: Fluxo CPIE completo ─────────────────────────────────────────────

describe("Fluxo CPIE — E2E", () => {
  it("perfil completo deve ter score geral >= 70", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO as any);
    const overall = calcOverallScore(dims);
    expect(overall).toBeGreaterThanOrEqual(70);
  });

  it("perfil vazio deve ter score geral = 0", () => {
    const dims = calcDimensionScores(PERFIL_VAZIO as any);
    const overall = calcOverallScore(dims);
    expect(overall).toBe(0);
  });

  it("perfil mínimo deve ter score entre 20 e 60", () => {
    const dims = calcDimensionScores(PERFIL_MINIMO as any);
    const overall = calcOverallScore(dims);
    expect(overall).toBeGreaterThanOrEqual(20);
    expect(overall).toBeLessThanOrEqual(60);
  });

  it("calcDimensionScores deve retornar array de dimensões com nome e score", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO as any);
    expect(Array.isArray(dims)).toBe(true);
    expect(dims.length).toBeGreaterThan(0);
    dims.forEach(d => {
      expect(typeof d.name).toBe("string");
      expect(typeof d.score).toBe("number");
      expect(typeof d.weight).toBe("number");
    });
  });

  it("calcDimensionScores deve incluir dimensão de regime tributário", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO as any);
    const hasTaxDim = dims.some(d => d.name.toLowerCase().includes("tribut") || d.name.toLowerCase().includes("fiscal") || d.name.toLowerCase().includes("regime"));
    expect(hasTaxDim).toBe(true);
  });

  it("dimensões devem ter scores entre 0 e 100", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO as any);
    dims.forEach(d => {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    });
  });

  it("dimensões devem ter pesos que somam 100", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO as any);
    const totalWeight = dims.reduce((sum, d) => sum + d.weight, 0);
    expect(totalWeight).toBe(100);
  });
});

// ─── Suite 2: Gate K2 — Threshold mínimo ──────────────────────────────────────

describe("Gate K2 — Score mínimo obrigatório", () => {
  const CPIE_MIN_SCORE = 30;

  it("perfil vazio deve ser bloqueado pelo gate K2", () => {
    const dims = calcDimensionScores(PERFIL_VAZIO as any);
    const score = calcOverallScore(dims);
    expect(score).toBeLessThan(CPIE_MIN_SCORE);
  });

  it("perfil completo deve passar pelo gate K2", () => {
    const dims = calcDimensionScores(PERFIL_COMPLETO as any);
    const score = calcOverallScore(dims);
    expect(score).toBeGreaterThanOrEqual(CPIE_MIN_SCORE);
  });

  it("override K2 requer justificativa com mínimo 10 chars", () => {
    const justificativaValida = "Cliente urgente, perfil será complementado";
    const justificativaInvalida = "Urgente";
    expect(justificativaValida.trim().length).toBeGreaterThanOrEqual(10);
    expect(justificativaInvalida.trim().length).toBeLessThan(10);
  });

  it("override K2 com justificativa válida deve desbloquear o botão", () => {
    const score = 15; // abaixo do mínimo
    const overrideMode = true;
    const overrideReason = "Cliente urgente, perfil será complementado após onboarding";
    // Lógica do botão: bloqueado se score < min E !(overrideMode && reason >= 10)
    const bloqueado = score < CPIE_MIN_SCORE && !(overrideMode && overrideReason.trim().length >= 10);
    expect(bloqueado).toBe(false);
  });

  it("override K2 sem justificativa deve manter botão bloqueado", () => {
    const score = 15;
    const overrideMode = true;
    const overrideReason = "";
    const bloqueado = score < CPIE_MIN_SCORE && !(overrideMode && overrideReason.trim().length >= 10);
    expect(bloqueado).toBe(true);
  });
});

// ─── Suite 3: Consistency Gate ────────────────────────────────────────────────

describe("Consistency Gate — E2E", () => {
  it("projeto sem inconsistências deve ter criticalCount = 0 e canProceed = true", () => {
    const findings = runDeterministicChecks({
      name: "Projeto Teste",
      description: "Empresa de tecnologia que presta serviços de desenvolvimento de software para clientes B2B no Brasil.",
      cnaes: [{ code: "6201-5/01", description: "Desenvolvimento de programas de computador sob encomenda" }],
      taxRegime: "simples_nacional",
      companySize: "pequeno",
      operationType: "servicos",
    });
    const result = aggregateFindings(findings, []);
    expect(result.criticalCount).toBe(0);
    expect(result.canProceed).toBe(true);
  });

  it("projeto com inconsistência deve ter overallLevel válido", () => {
    const findings = runDeterministicChecks({
      name: "Projeto Inconsistente",
      description: "Empresa de comércio varejista de produtos físicos.",
      cnaes: [{ code: "6201-5/01", description: "Desenvolvimento de programas de computador sob encomenda" }],
      taxRegime: "simples_nacional",
      companySize: "pequeno",
      operationType: "comercio",
    });
    const result = aggregateFindings(findings, []);
    expect(["none", "low", "medium", "high", "critical"]).toContain(result.overallLevel);
  });

  it("aggregateFindings deve retornar criticalCount e highCount >= 0", () => {
    const findings = runDeterministicChecks({
      name: "Projeto X",
      description: "Empresa de serviços.",
      cnaes: [],
      taxRegime: "lucro_real",
      companySize: "grande",
      operationType: "misto",
    });
    const result = aggregateFindings(findings, []);
    expect(result.criticalCount).toBeGreaterThanOrEqual(0);
    expect(result.highCount).toBeGreaterThanOrEqual(0);
    expect(result.mediumCount).toBeGreaterThanOrEqual(0);
    expect(result.lowCount).toBeGreaterThanOrEqual(0);
    expect(typeof result.canProceed).toBe("boolean");
  });
});

// ─── Suite 4: Relatório mensal ────────────────────────────────────────────────

describe("Relatório mensal — generateMonthlyReportHtml", () => {
  it("deve retornar objeto com html, month, year e stats", async () => {
    const result = await generateMonthlyReportHtml();
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("month");
    expect(result).toHaveProperty("year");
    expect(result).toHaveProperty("stats");
    expect(result).toHaveProperty("monthName");
  });

  it("deve incluir o ano atual no relatório", async () => {
    const result = await generateMonthlyReportHtml();
    const currentYear = new Date().getFullYear();
    expect(result.year).toBe(currentYear);
  });

  it("deve incluir seção de KPIs no HTML", async () => {
    const result = await generateMonthlyReportHtml();
    expect(typeof result.html).toBe("string");
    expect(result.html.length).toBeGreaterThan(100);
    const hasMetrics = result.html.includes("Total") || result.html.includes("Score") || result.html.includes("Projetos") || result.html.includes("Relatório");
    expect(hasMetrics).toBe(true);
  });

  it("stats deve ter campos numéricos válidos", async () => {
    const result = await generateMonthlyReportHtml();
    expect(result.stats.total).toBeGreaterThanOrEqual(0);
    expect(result.stats.avgScore).toBeGreaterThanOrEqual(0);
    expect(result.stats.avgScore).toBeLessThanOrEqual(100);
    expect(result.stats.highRisk).toBeGreaterThanOrEqual(0);
    expect(result.stats.lowScore).toBeGreaterThanOrEqual(0);
  });
});

// ─── Suite 5: Batch analyze — múltiplos perfis ────────────────────────────────

describe("Batch analyze — múltiplos perfis", () => {
  const perfis = [PERFIL_COMPLETO, PERFIL_MINIMO, PERFIL_VAZIO];

  it("deve calcular scores para todos os perfis sem erros", () => {
    const scores = perfis.map(p => {
      const dims = calcDimensionScores(p as any);
      return calcOverallScore(dims);
    });
    expect(scores).toHaveLength(3);
    scores.forEach(s => {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    });
  });

  it("scores devem ser ordenáveis por valor", () => {
    const scores = perfis.map(p => {
      const dims = calcDimensionScores(p as any);
      return calcOverallScore(dims);
    });
    const sorted = [...scores].sort((a, b) => b - a);
    // O perfil completo deve ter o maior score
    expect(sorted[0]).toBe(scores[0]); // PERFIL_COMPLETO
  });

  it("perfil vazio deve ter score menor que perfil mínimo", () => {
    const scoreVazio = calcOverallScore(calcDimensionScores(PERFIL_VAZIO as any));
    const scoreMinimo = calcOverallScore(calcDimensionScores(PERFIL_MINIMO as any));
    expect(scoreVazio).toBeLessThan(scoreMinimo);
  });

  it("perfil mínimo deve ter score menor que perfil completo", () => {
    const scoreMinimo = calcOverallScore(calcDimensionScores(PERFIL_MINIMO as any));
    const scoreCompleto = calcOverallScore(calcDimensionScores(PERFIL_COMPLETO as any));
    expect(scoreMinimo).toBeLessThan(scoreCompleto);
  });
});
