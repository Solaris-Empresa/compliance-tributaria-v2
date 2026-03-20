/**
 * riskEngine.test.ts — TASK 5: Testes do Risk Engine
 * Valida as regras de classificação, fórmula de score e resumo de risco.
 */
import { describe, it, expect } from "vitest";
import {
  calculateBaseScore,
  calculateRiskScore,
  classifyRiskLevel,
  classifyRisk,
  calculateRiskSummary,
  runRiskAnalysis,
  inferNormativeType,
  determineMitigationPriority,
} from "./riskEngine";
import type { GapInput, RiskItem } from "./riskEngine";

// ─── FASE 1: Regras de base_score ─────────────────────────────────────────────

describe("calculateBaseScore", () => {
  it("obrigacao + alta = 80", () => {
    expect(calculateBaseScore("obrigacao", "alta")).toBe(80);
  });

  it("vedacao + alta = 80", () => {
    expect(calculateBaseScore("vedacao", "alta")).toBe(80);
  });

  it("direito + alta = 50", () => {
    expect(calculateBaseScore("direito", "alta")).toBe(50);
  });

  it("opcao + alta = 30", () => {
    expect(calculateBaseScore("opcao", "alta")).toBe(30);
  });

  it("obrigacao + critica = 100 (capped at 100)", () => {
    expect(calculateBaseScore("obrigacao", "critica")).toBe(100);
  });

  it("obrigacao + media = 60", () => {
    expect(calculateBaseScore("obrigacao", "media")).toBe(60);
  });

  it("obrigacao + baixa = 40", () => {
    expect(calculateBaseScore("obrigacao", "baixa")).toBe(40);
  });

  it("opcao + baixa = 15", () => {
    expect(calculateBaseScore("opcao", "baixa")).toBe(15);
  });
});

// ─── FASE 2: Fórmula risk_score ───────────────────────────────────────────────

describe("calculateRiskScore", () => {
  it("nao_compliant: multiplier 1.0 → risk_score = base_score", () => {
    expect(calculateRiskScore(80, "nao_compliant")).toBe(80);
  });

  it("parcial: multiplier 0.5 → risk_score = base_score / 2", () => {
    expect(calculateRiskScore(80, "parcial")).toBe(40);
  });

  it("compliant: multiplier 0 → risk_score = 0", () => {
    expect(calculateRiskScore(80, "compliant")).toBe(0);
  });

  it("nao_aplicavel: multiplier 0 → risk_score = 0", () => {
    expect(calculateRiskScore(80, "nao_aplicavel")).toBe(0);
  });

  it("base 50 + parcial = 25", () => {
    expect(calculateRiskScore(50, "parcial")).toBe(25);
  });
});

// ─── FASE 3: Classificação de risk_level ─────────────────────────────────────

describe("classifyRiskLevel", () => {
  it("score 70+ → critico", () => {
    expect(classifyRiskLevel(70)).toBe("critico");
    expect(classifyRiskLevel(100)).toBe("critico");
  });

  it("score 50-69 → alto", () => {
    expect(classifyRiskLevel(50)).toBe("alto");
    expect(classifyRiskLevel(69)).toBe("alto");
  });

  it("score 25-49 → medio", () => {
    expect(classifyRiskLevel(25)).toBe("medio");
    expect(classifyRiskLevel(49)).toBe("medio");
  });

  it("score 0-24 → baixo", () => {
    expect(classifyRiskLevel(0)).toBe("baixo");
    expect(classifyRiskLevel(24)).toBe("baixo");
  });
});

// ─── FASE 4: classifyRisk completo ───────────────────────────────────────────

describe("classifyRisk", () => {
  it("obrigacao + nao_compliant + alta → critico (80×1.0=80)", () => {
    const result = classifyRisk({
      canonicalId: "CAN-0001",
      mappingId: "MAP-0001",
      gapStatus: "nao_compliant",
      normativeType: "obrigacao",
      baseCriticality: "alta",
    });
    expect(result.riskScore).toBe(80);
    expect(result.riskLevel).toBe("critico");
    expect(result.gapMultiplier).toBe("1");
    expect(result.baseScore).toBe(80);
    expect(result.mitigationPriority).toBe("imediata");
  });

  it("obrigacao + parcial + alta → alto (80×0.5=40)", () => {
    const result = classifyRisk({
      canonicalId: "CAN-0002",
      mappingId: "MAP-0002",
      gapStatus: "parcial",
      normativeType: "obrigacao",
      baseCriticality: "alta",
    });
    expect(result.riskScore).toBe(40);
    expect(result.riskLevel).toBe("medio");
    expect(result.mitigationPriority).toBe("medio_prazo");
  });

  it("obrigacao + compliant → risk_score = 0", () => {
    const result = classifyRisk({
      canonicalId: "CAN-0003",
      mappingId: "MAP-0003",
      gapStatus: "compliant",
      normativeType: "obrigacao",
      baseCriticality: "alta",
    });
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe("baixo");
    expect(result.mitigationPriority).toBe("monitoramento");
  });

  it("nao_aplicavel → risk_score = 0", () => {
    const result = classifyRisk({
      canonicalId: "CAN-0004",
      mappingId: "MAP-0004",
      gapStatus: "nao_aplicavel",
      normativeType: "obrigacao",
    });
    expect(result.riskScore).toBe(0);
  });

  it("vedacao + nao_compliant + critica → risk_score = 100 (capped)", () => {
    const result = classifyRisk({
      canonicalId: "CAN-0005",
      mappingId: "MAP-0005",
      gapStatus: "nao_compliant",
      normativeType: "vedacao",
      baseCriticality: "critica",
    });
    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe("critico");
    expect(result.mitigationPriority).toBe("imediata");
  });

  it("direito + nao_compliant + alta → alto (50×1.0=50)", () => {
    const result = classifyRisk({
      canonicalId: "CAN-0006",
      mappingId: "MAP-0006",
      gapStatus: "nao_compliant",
      normativeType: "direito",
      baseCriticality: "alta",
    });
    expect(result.riskScore).toBe(50);
    expect(result.riskLevel).toBe("alto");
  });

  it("opcao + nao_compliant + baixa → baixo (15×1.0=15)", () => {
    const result = classifyRisk({
      canonicalId: "CAN-0007",
      mappingId: "MAP-0007",
      gapStatus: "nao_compliant",
      normativeType: "opcao",
      baseCriticality: "baixa",
    });
    expect(result.riskScore).toBe(15);
    expect(result.riskLevel).toBe("baixo");
  });
});

// ─── FASE 5: inferNormativeType ───────────────────────────────────────────────

describe("inferNormativeType", () => {
  it("texto com 'vedação' → vedacao", () => {
    expect(inferNormativeType("Vedação ao aproveitamento de crédito")).toBe("vedacao");
  });

  it("texto com 'direito' → direito", () => {
    expect(inferNormativeType("Direito ao crédito do IBS")).toBe("direito");
  });

  it("texto com 'opção' → opcao", () => {
    expect(inferNormativeType("Opção pelo regime diferenciado")).toBe("opcao");
  });

  it("texto genérico → obrigacao (default)", () => {
    expect(inferNormativeType("Emissão de nota fiscal eletrônica")).toBe("obrigacao");
  });
});

// ─── FASE 6: Testes de borda — calculateRiskSummary ──────────────────────────

describe("calculateRiskSummary — testes de borda", () => {
  it("100% nao_aplicavel → sem riscos ativos, avgScore=0", () => {
    const risks: RiskItem[] = Array.from({ length: 5 }, (_, i) => ({
      canonicalId: `CAN-${i}`,
      mappingId: `MAP-${i}`,
      gapStatus: "nao_aplicavel",
      riskLevel: "baixo",
      riskScore: 0,
      impactType: "operacional",
      severityBase: "alta",
      normativeType: "obrigacao",
      gapMultiplier: "0",
      baseScore: 80,
      mitigationPriority: "monitoramento",
    }));
    const summary = calculateRiskSummary(risks);
    expect(summary.totalRiskScore).toBe(0);
    expect(summary.avgRiskScore).toBe(0);
    expect(summary.criticalCount).toBe(0);
  });

  it("100% compliant → sem riscos ativos, score=0", () => {
    const risks: RiskItem[] = Array.from({ length: 5 }, (_, i) => ({
      canonicalId: `CAN-${i}`,
      mappingId: `MAP-${i}`,
      gapStatus: "compliant",
      riskLevel: "baixo",
      riskScore: 0,
      impactType: "financeiro",
      severityBase: "alta",
      normativeType: "obrigacao",
      gapMultiplier: "0",
      baseScore: 80,
      mitigationPriority: "monitoramento",
    }));
    const summary = calculateRiskSummary(risks);
    expect(summary.totalRiskScore).toBe(0);
    expect(summary.criticalCount).toBe(0);
  });

  it("100% nao_compliant obrigacao alta → todos críticos", () => {
    const risks: RiskItem[] = Array.from({ length: 3 }, (_, i) => ({
      canonicalId: `CAN-${i}`,
      mappingId: `MAP-${i}`,
      gapStatus: "nao_compliant",
      riskLevel: "critico",
      riskScore: 80,
      impactType: "legal",
      severityBase: "alta",
      normativeType: "obrigacao",
      gapMultiplier: "1",
      baseScore: 80,
      mitigationPriority: "imediata",
    }));
    const summary = calculateRiskSummary(risks);
    expect(summary.criticalCount).toBe(3);
    expect(summary.totalRiskScore).toBe(240);
    expect(summary.avgRiskScore).toBe(80);
    expect(summary.overallRiskLevel).toBe("critico");
  });

  it("mistura: 2 critico + 1 medio + 2 compliant → overallRiskLevel correto", () => {
    const { risks, summary } = runRiskAnalysis([
      { canonicalId: "CAN-1", mappingId: "MAP-1", gapStatus: "nao_compliant", normativeType: "obrigacao", baseCriticality: "alta" },
      { canonicalId: "CAN-2", mappingId: "MAP-2", gapStatus: "nao_compliant", normativeType: "obrigacao", baseCriticality: "alta" },
      { canonicalId: "CAN-3", mappingId: "MAP-3", gapStatus: "parcial", normativeType: "obrigacao", baseCriticality: "media" },
      { canonicalId: "CAN-4", mappingId: "MAP-4", gapStatus: "compliant", normativeType: "obrigacao", baseCriticality: "alta" },
      { canonicalId: "CAN-5", mappingId: "MAP-5", gapStatus: "compliant", normativeType: "obrigacao", baseCriticality: "alta" },
    ]);
    expect(summary.criticalCount).toBe(2);
    expect(summary.medioCount).toBe(1);
    expect(risks.filter(r => r.riskScore === 0).length).toBe(2); // 2 compliant
  });

  it("topRisks retorna máximo 5 itens ordenados por score desc", () => {
    const inputs: GapInput[] = Array.from({ length: 8 }, (_, i) => ({
      canonicalId: `CAN-${i}`,
      mappingId: `MAP-${i}`,
      gapStatus: "nao_compliant",
      normativeType: "obrigacao",
      baseCriticality: "alta",
    }));
    const { summary } = runRiskAnalysis(inputs);
    expect(summary.topRisks.length).toBeLessThanOrEqual(5);
    // Verificar ordenação decrescente
    for (let i = 1; i < summary.topRisks.length; i++) {
      expect(summary.topRisks[i - 1].riskScore).toBeGreaterThanOrEqual(summary.topRisks[i].riskScore);
    }
  });
});

// ─── FASE 7: determineMitigationPriority ─────────────────────────────────────

describe("determineMitigationPriority", () => {
  it("critico → imediata", () => {
    expect(determineMitigationPriority("critico", "obrigacao")).toBe("imediata");
  });

  it("alto + obrigacao → curto_prazo", () => {
    expect(determineMitigationPriority("alto", "obrigacao")).toBe("curto_prazo");
  });

  it("medio → medio_prazo", () => {
    expect(determineMitigationPriority("medio", "direito")).toBe("medio_prazo");
  });

  it("baixo → monitoramento", () => {
    expect(determineMitigationPriority("baixo", "opcao")).toBe("monitoramento");
  });
});
