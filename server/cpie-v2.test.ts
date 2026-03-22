/**
 * Testes CPIE v2.0 — Cenários T01-T12
 * Issue v6.0.R1 — Implementação controlada aprovada pelo orquestrador
 *
 * CRITÉRIO DE ACEITE FINAL:
 * - T01 (cervejaria) DEVE ser bloqueado com consistencyScore ≤ 15 e diagnosticConfidence ≤ 15
 * - Se T01 passar como válido → IMPLEMENTAÇÃO REPROVADA
 *
 * Os testes validam LIMITES NUMÉRICOS e DECISÃO DE BLOQUEIO, não texto da IA.
 * Isso garante determinismo mesmo com variação de resposta da IA.
 */

import { describe, it, expect } from "vitest";
import {
  calcCompletenessScore,
  buildConflictMatrix,
  calcFinalScores,
  type CpieProfileInputV2,
  type InferredProfile,
} from "./cpie-v2";

// ─── Helper: InferredProfile padrão (sem descrição) ──────────────────────────

function noInference(): InferredProfile {
  return {
    sector: "não informado",
    inferenceConfidence: 0,
    inferenceNotes: "Sem inferência",
  };
}

// ─── T01 — A Cervejaria (Caso Raiz da Falha) ─────────────────────────────────

describe("T01 — Cervejaria (caso raiz da falha)", () => {
  const input: CpieProfileInputV2 = {
    cnpj: "12.345.678/0001-90",
    companyType: "mei",
    companySize: "mei",
    taxRegime: "simples_nacional",
    annualRevenueRange: "0-360000",
    operationType: "servicos",
    clientType: ["b2g"],
    multiState: false,
    hasMultipleEstablishments: false,
    hasImportExport: false,
    hasSpecialRegimes: false,
    paymentMethods: ["pix", "cartao"],
    hasIntermediaries: false,
    hasTaxTeam: false,
    hasAudit: false,
    hasTaxIssues: false,
    description: "Produtora de cerveja artesanal, faturamento de R$ 1 milhão por mês, vende no varejo, atacado e e-commerce",
  };

  const inferred: InferredProfile = {
    sector: "manufatura/bebidas",
    estimatedMonthlyRevenue: 1_000_000,
    estimatedAnnualRevenue: 12_000_000,
    inferredCompanySize: "media",
    inferredTaxRegime: "lucro_presumido",
    inferredOperationType: "industria",
    inferredClientType: ["b2c", "b2b"],
    inferenceConfidence: 95,
    inferenceNotes: "Produtora de cerveja com R$ 1M/mês implica média empresa com regime lucro presumido",
  };

  it("deve detectar conflito composto C1 (MEI + manufatura)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const c1 = conflicts.find(c => c.id === "C1");
    expect(c1).toBeDefined();
    expect(c1?.severity).toBe("critical");
    expect(c1?.type).toBe("composite");
  });

  it("deve detectar conflito B1 (faturamento descrito vs. declarado)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const b1 = conflicts.find(c => c.id === "B1");
    expect(b1).toBeDefined();
    expect(b1?.severity).toBe("critical");
    // 12M / 360K = 33x divergência → crítico
  });

  it("deve detectar conflito B2 (operação: serviços vs. indústria)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const b2 = conflicts.find(c => c.id === "B2");
    expect(b2).toBeDefined();
    expect(b2?.severity).toBe("high");
  });

  it("deve detectar conflito C2 (MEI + múltiplos canais)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const c2 = conflicts.find(c => c.id === "C2");
    expect(c2).toBeDefined();
    expect(c2?.severity).toBe("high");
  });

  it("deterministicVeto deve ser ≤ 15", () => {
    const { deterministicVeto } = buildConflictMatrix(input, inferred);
    expect(deterministicVeto).not.toBeNull();
    expect(deterministicVeto!).toBeLessThanOrEqual(15);
  });

  it("consistencyScore deve ser ≤ 15 (com deterministicVeto aplicado)", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { consistencyScore } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    expect(consistencyScore).toBeLessThanOrEqual(15);
  });

  it("diagnosticConfidence deve ser ≤ 15 (CRITÉRIO DE ACEITE OBRIGATÓRIO)", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { diagnosticConfidence } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    // CRITÉRIO DE ACEITE: se este teste falhar → IMPLEMENTAÇÃO REPROVADA
    expect(diagnosticConfidence).toBeLessThanOrEqual(15);
  });

  it("completenessScore deve ser ≥ 80% (campos preenchidos)", () => {
    const completeness = calcCompletenessScore(input);
    expect(completeness).toBeGreaterThanOrEqual(80);
  });

  it("deve ter pelo menos 4 conflitos detectados", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    expect(conflicts.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── T02 — MEI com Faturamento Impossível ────────────────────────────────────

describe("T02 — MEI com 50 funcionários e R$ 5M/ano", () => {
  const input: CpieProfileInputV2 = {
    companySize: "mei",
    taxRegime: "simples_nacional",
    annualRevenueRange: "4800000-78000000",
    operationType: "servicos",
    description: "Empresa de tecnologia com 50 funcionários e faturamento de R$ 5 milhões por ano",
  };

  const inferred: InferredProfile = {
    sector: "serviços/TI",
    estimatedAnnualRevenue: 5_000_000,
    inferredCompanySize: "pequena",
    inferredTaxRegime: "lucro_presumido",
    inferenceConfidence: 85,
    inferenceNotes: "50 funcionários e R$ 5M implica pequena empresa",
  };

  it("deve detectar conflito A2 (porte vs. faturamento)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const a2 = conflicts.find(c => c.id === "A2");
    expect(a2).toBeDefined();
    expect(a2?.severity).toBe("high");
  });

  it("consistencyScore deve ser ≤ 40", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { consistencyScore } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    expect(consistencyScore).toBeLessThanOrEqual(40);
  });
});

// ─── T03 — Simples Nacional com Faturamento Acima do Limite ──────────────────

describe("T03 — Simples Nacional com faturamento acima do limite", () => {
  const input: CpieProfileInputV2 = {
    companySize: "pequena",
    taxRegime: "simples_nacional",
    annualRevenueRange: "4800000-78000000",
    operationType: "comercio",
    description: "Distribuidora de alimentos com faturamento de R$ 10 milhões por ano",
  };

  const inferred: InferredProfile = {
    sector: "comércio/distribuição",
    estimatedAnnualRevenue: 10_000_000,
    inferredCompanySize: "pequena",
    inferredTaxRegime: "lucro_presumido",
    inferenceConfidence: 80,
    inferenceNotes: "R$ 10M implica lucro presumido",
  };

  it("deve detectar conflito A1 (Simples Nacional + faturamento > R$ 4,8M)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const a1 = conflicts.find(c => c.id === "A1");
    expect(a1).toBeDefined();
    expect(a1?.severity).toBe("critical");
  });

  it("deterministicVeto deve ser ≤ 15", () => {
    const { deterministicVeto } = buildConflictMatrix(input, inferred);
    expect(deterministicVeto).not.toBeNull();
    expect(deterministicVeto!).toBeLessThanOrEqual(15);
  });

  it("consistencyScore deve ser ≤ 30", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { consistencyScore } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    expect(consistencyScore).toBeLessThanOrEqual(30);
  });
});

// ─── T04 — Advocacia declarada como Indústria ────────────────────────────────

describe("T04 — Escritório de advocacia declarado como indústria", () => {
  const input: CpieProfileInputV2 = {
    companySize: "pequena",
    taxRegime: "lucro_presumido",
    annualRevenueRange: "360000-4800000",
    operationType: "industria",
    clientType: ["b2b"],
    description: "Escritório de advocacia especializado em direito tributário",
  };

  const inferred: InferredProfile = {
    sector: "serviços jurídicos",
    estimatedAnnualRevenue: 2_000_000,
    inferredCompanySize: "micro",
    inferredTaxRegime: "lucro_presumido",
    inferredOperationType: "servicos",
    inferredClientType: ["b2b"],
    inferenceConfidence: 90,
    inferenceNotes: "Advocacia é serviço, não indústria",
  };

  it("deve detectar conflito B2 (operação: indústria vs. serviços)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const b2 = conflicts.find(c => c.id === "B2");
    expect(b2).toBeDefined();
    expect(b2?.severity).toBe("high");
  });

  it("consistencyScore deve ser ≤ 40", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { consistencyScore } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    expect(consistencyScore).toBeLessThanOrEqual(40);
  });
});

// ─── T05 — Restaurante com Cliente B2G ───────────────────────────────────────

describe("T05 — Restaurante com cliente B2G", () => {
  const input: CpieProfileInputV2 = {
    companySize: "micro",
    taxRegime: "simples_nacional",
    annualRevenueRange: "360000-4800000",
    operationType: "comercio",
    clientType: ["b2g"],
    description: "Restaurante popular com delivery, atende famílias e trabalhadores",
  };

  const inferred: InferredProfile = {
    sector: "alimentação/restaurante",
    estimatedAnnualRevenue: 1_000_000,
    inferredCompanySize: "micro",
    inferredTaxRegime: "simples_nacional",
    inferredOperationType: "comercio",
    inferredClientType: ["b2c"],
    inferenceConfidence: 85,
    inferenceNotes: "Restaurante popular atende B2C, não B2G",
  };

  it("deve detectar conflito B3 (B2G improvável para restaurante)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const b3 = conflicts.find(c => c.id === "B3");
    expect(b3).toBeDefined();
    expect(b3?.severity).toBe("medium");
  });

  it("consistencyScore deve ser ≤ 55", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { consistencyScore } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    expect(consistencyScore).toBeLessThanOrEqual(55);
  });
});

// ─── T06 — Grande Empresa sem Governança ─────────────────────────────────────

describe("T06 — Grande empresa sem equipe tributária e sem auditoria", () => {
  const input: CpieProfileInputV2 = {
    companySize: "grande",
    taxRegime: "lucro_real",
    annualRevenueRange: "78000000+",
    operationType: "comercio",
    multiState: true,
    hasTaxTeam: false,
    hasAudit: false,
    description: "Grupo empresarial com operações em 10 estados e faturamento de R$ 200 milhões por ano",
  };

  const inferred: InferredProfile = {
    sector: "comércio/distribuição",
    estimatedAnnualRevenue: 200_000_000,
    inferredCompanySize: "grande",
    inferredTaxRegime: "lucro_real",
    inferenceConfidence: 90,
    inferenceNotes: "Grande empresa com R$ 200M",
  };

  it("não deve ter conflitos críticos de regime/faturamento (dados coerentes)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const criticalRegimeConflicts = conflicts.filter(
      c => c.severity === "critical" && (c.id === "A1" || c.id === "A2")
    );
    expect(criticalRegimeConflicts.length).toBe(0);
  });

  it("completenessScore deve ser calculado corretamente", () => {
    const completeness = calcCompletenessScore(input);
    expect(completeness).toBeGreaterThan(0);
    expect(completeness).toBeLessThanOrEqual(100);
  });
});

// ─── T07 — Contradição Composta Silenciosa ────────────────────────────────────

describe("T07 — SaaS B2B com clientes internacionais mas sem exportação", () => {
  const input: CpieProfileInputV2 = {
    companySize: "micro",
    taxRegime: "simples_nacional",
    annualRevenueRange: "360000-4800000",
    operationType: "industria", // deveria ser serviços
    hasImportExport: false,
    description: "Startup de software SaaS B2B com clientes internacionais em 5 países",
  };

  const inferred: InferredProfile = {
    sector: "serviços/software",
    estimatedAnnualRevenue: 2_000_000,
    inferredCompanySize: "micro",
    inferredTaxRegime: "simples_nacional",
    inferredOperationType: "servicos",
    inferredClientType: ["b2b"],
    inferenceConfidence: 85,
    inferenceNotes: "SaaS é serviço, não indústria; clientes internacionais contradiz sem exportação",
  };

  it("deve detectar conflito B2 (indústria vs. serviços)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const b2 = conflicts.find(c => c.id === "B2");
    expect(b2).toBeDefined();
  });

  it("consistencyScore deve ser ≤ 55", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { consistencyScore } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    expect(consistencyScore).toBeLessThanOrEqual(55);
  });
});

// ─── T08 — Perfil Perfeitamente Consistente (Caso Positivo) ──────────────────

describe("T08 — Padaria artesanal local (caso positivo)", () => {
  const input: CpieProfileInputV2 = {
    cnpj: "12.345.678/0001-90",
    companyType: "ltda",
    companySize: "micro",
    taxRegime: "simples_nacional",
    annualRevenueRange: "0-360000",
    operationType: "comercio",
    clientType: ["b2c"],
    multiState: false,
    hasMultipleEstablishments: false,
    hasImportExport: false,
    hasSpecialRegimes: false,
    paymentMethods: ["dinheiro", "pix"],
    hasIntermediaries: false,
    hasTaxTeam: false,
    hasAudit: false,
    hasTaxIssues: false,
    description: "Padaria artesanal local, vende pão e salgados, atende consumidores finais no bairro",
  };

  const inferred: InferredProfile = {
    sector: "alimentação/padaria",
    estimatedMonthlyRevenue: 20_000,
    estimatedAnnualRevenue: 240_000,
    inferredCompanySize: "micro",
    inferredTaxRegime: "simples_nacional",
    inferredOperationType: "comercio",
    inferredClientType: ["b2c"],
    inferenceConfidence: 95,
    inferenceNotes: "Padaria local com B2C é perfil coerente",
  };

  it("não deve ter conflitos críticos", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const critical = conflicts.filter(c => c.severity === "critical");
    expect(critical.length).toBe(0);
  });

  it("deterministicVeto deve ser null (sem veto)", () => {
    const { deterministicVeto } = buildConflictMatrix(input, inferred);
    expect(deterministicVeto).toBeNull();
  });

  it("completenessScore deve ser ≥ 80%", () => {
    const completeness = calcCompletenessScore(input);
    expect(completeness).toBeGreaterThanOrEqual(80);
  });

  it("consistencyScore deve ser ≥ 85 (sem penalizações significativas)", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { consistencyScore } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    expect(consistencyScore).toBeGreaterThanOrEqual(85);
  });
});

// ─── T09 — Faturamento Descrito vs. Declarado com Divergência >300% ──────────

describe("T09 — Construtora com obras de R$ 50M mas faturamento declarado baixo", () => {
  const input: CpieProfileInputV2 = {
    companySize: "pequena",
    taxRegime: "simples_nacional",
    annualRevenueRange: "360000-4800000",
    operationType: "servicos",
    description: "Empresa de construção civil com obras de R$ 50 milhões em andamento",
  };

  const inferred: InferredProfile = {
    sector: "construção civil",
    estimatedAnnualRevenue: 50_000_000,
    inferredCompanySize: "media",
    inferredTaxRegime: "lucro_presumido",
    inferenceConfidence: 80,
    inferenceNotes: "Obras de R$ 50M implicam faturamento muito acima de R$ 4,8M",
  };

  it("deve detectar conflito B1 (faturamento descrito vs. declarado)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const b1 = conflicts.find(c => c.id === "B1");
    expect(b1).toBeDefined();
    expect(b1?.severity).toBe("critical");
  });

  it("consistencyScore deve ser ≤ 30", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { consistencyScore } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    expect(consistencyScore).toBeLessThanOrEqual(30);
  });
});

// ─── T10 — Regime Tributário Impossível ──────────────────────────────────────

describe("T10 — Indústria farmacêutica com Simples Nacional", () => {
  const input: CpieProfileInputV2 = {
    companySize: "grande",
    taxRegime: "simples_nacional",
    annualRevenueRange: "78000000+",
    operationType: "industria",
    description: "Indústria farmacêutica com faturamento de R$ 500 milhões por ano",
  };

  const inferred: InferredProfile = {
    sector: "indústria farmacêutica",
    estimatedAnnualRevenue: 500_000_000,
    inferredCompanySize: "grande",
    inferredTaxRegime: "lucro_real",
    inferenceConfidence: 95,
    inferenceNotes: "R$ 500M impossível no Simples Nacional",
  };

  it("deve detectar conflito A1 crítico (Simples Nacional + 78M+)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const a1 = conflicts.find(c => c.id === "A1");
    expect(a1).toBeDefined();
    expect(a1?.severity).toBe("critical");
  });

  it("deterministicVeto deve ser ≤ 15", () => {
    const { deterministicVeto } = buildConflictMatrix(input, inferred);
    expect(deterministicVeto!).toBeLessThanOrEqual(15);
  });

  it("consistencyScore deve ser ≤ 15 (veto aplicado pelo conflito A1 crítico)", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { consistencyScore } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    expect(consistencyScore).toBeLessThanOrEqual(15);
  });
});

// ─── T11 — Contradição de Porte vs. Estrutura ────────────────────────────────

describe("T11 — Artesanato familiar declarado como grande empresa", () => {
  const input: CpieProfileInputV2 = {
    companySize: "grande",
    taxRegime: "lucro_real",
    annualRevenueRange: "78000000+",
    operationType: "comercio",
    clientType: ["b2c"],
    description: "Pequena empresa familiar de artesanato, vende online no Instagram",
  };

  const inferred: InferredProfile = {
    sector: "artesanato/comércio",
    estimatedAnnualRevenue: 50_000,
    inferredCompanySize: "mei",
    inferredTaxRegime: "simples_nacional",
    inferredOperationType: "comercio",
    inferredClientType: ["b2c"],
    inferenceConfidence: 85,
    inferenceNotes: "Artesanato familiar no Instagram implica MEI ou micro",
  };

  it("deve detectar conflito B4 (porte incompatível)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const b4 = conflicts.find(c => c.id === "B4");
    expect(b4).toBeDefined();
    expect(b4?.severity).toBe("high");
  });

  it("consistencyScore deve ser ≤ 40", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { consistencyScore } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    expect(consistencyScore).toBeLessThanOrEqual(40);
  });
});

// ─── T12 — Perfil Incompleto mas Consistente ─────────────────────────────────

describe("T12 — Empresa de logística com dados mínimos mas coerentes", () => {
  const input: CpieProfileInputV2 = {
    companySize: "pequena",
    taxRegime: "simples_nacional",
    annualRevenueRange: "360000-4800000",
    description: "Empresa de logística",
  };

  const inferred: InferredProfile = {
    sector: "logística/transporte",
    estimatedAnnualRevenue: 2_000_000,
    inferredCompanySize: "pequena",
    inferredTaxRegime: "simples_nacional",
    inferenceConfidence: 60,
    inferenceNotes: "Dados mínimos mas coerentes",
  };

  it("não deve ter conflitos críticos (dados coerentes entre si)", () => {
    const { conflicts } = buildConflictMatrix(input, inferred);
    const critical = conflicts.filter(c => c.severity === "critical");
    expect(critical.length).toBe(0);
  });

  it("completenessScore deve ser baixo (poucos campos preenchidos)", () => {
    const completeness = calcCompletenessScore(input);
    expect(completeness).toBeLessThan(50);
  });

  it("consistencyScore deve ser alto (dados coerentes)", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { consistencyScore } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    expect(consistencyScore).toBeGreaterThanOrEqual(80);
  });

  it("diagnosticConfidence deve ser baixo (consistente mas incompleto)", () => {
    const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
    const completeness = calcCompletenessScore(input);
    const { diagnosticConfidence } = calcFinalScores(completeness, conflicts, deterministicVeto, null);
    // Consistente mas incompleto → confiança baixa
    expect(diagnosticConfidence).toBeLessThan(50);
  });
});

// ─── Testes de calcFinalScores ────────────────────────────────────────────────

describe("calcFinalScores — lógica de veto", () => {
  it("aiVeto deve limitar consistencyScore independente de penalizações", () => {
    const { consistencyScore } = calcFinalScores(100, [], null, 15);
    expect(consistencyScore).toBe(15);
  });

  it("deterministicVeto deve limitar consistencyScore", () => {
    const { consistencyScore } = calcFinalScores(100, [], 20, null);
    expect(consistencyScore).toBe(20);
  });

  it("o menor veto prevalece", () => {
    const { consistencyScore } = calcFinalScores(100, [], 30, 10);
    expect(consistencyScore).toBe(10);
  });

  it("diagnosticConfidence = consistencyScore × completeness / 100", () => {
    const { diagnosticConfidence } = calcFinalScores(80, [], null, null);
    // sem conflitos, sem veto: consistencyScore = 100, completeness = 80
    expect(diagnosticConfidence).toBe(80);
  });

  it("diagnosticConfidence com veto e completude parcial", () => {
    const { diagnosticConfidence } = calcFinalScores(90, [], 15, null);
    // consistencyScore = 15, completeness = 90 → 15 × 90 / 100 = 13.5 → round = 14
    expect(diagnosticConfidence).toBe(14);
  });

  it("score alto com completude 100% e sem conflitos", () => {
    const { consistencyScore, diagnosticConfidence } = calcFinalScores(100, [], null, null);
    expect(consistencyScore).toBe(100);
    expect(diagnosticConfidence).toBe(100);
  });
});
