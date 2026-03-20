/**
 * Testes do Gap Engine — TASK 4
 * Cobre: classifyGap, calculateComplianceScore, prioritizeGaps, runGapAnalysis
 */

import { describe, it, expect } from "vitest";
import {
  classifyGap,
  calculateComplianceScore,
  prioritizeGaps,
  runGapAnalysis,
  type GapResult,
} from "./gapEngine";

describe("classifyGap", () => {
  it("sim retorna compliant sem severity", () => {
    const result = classifyGap("REQ-001", "MAP-001", "sim");
    expect(result.gapStatus).toBe("compliant");
    expect(result.gapSeverity).toBeUndefined();
    expect(result.recommendation).toBeUndefined();
  });

  it("nao retorna nao_compliant com severity alta", () => {
    const result = classifyGap("REQ-002", "MAP-002", "nao");
    expect(result.gapStatus).toBe("nao_compliant");
    expect(result.gapSeverity).toBe("alta");
    expect(result.gapType).toBe("ausencia_controle");
    expect(result.recommendation).toBeTruthy();
  });

  it("parcial retorna parcial com severity media", () => {
    const result = classifyGap("REQ-003", "MAP-003", "parcial");
    expect(result.gapStatus).toBe("parcial");
    expect(result.gapSeverity).toBe("media");
    expect(result.gapType).toBe("implementacao_parcial");
  });

  it("nao_aplicavel retorna nao_aplicavel sem severity", () => {
    const result = classifyGap("REQ-004", "MAP-004", "nao_aplicavel");
    expect(result.gapStatus).toBe("nao_aplicavel");
    expect(result.gapSeverity).toBeUndefined();
  });

  it("preserva canonicalId e mappingId", () => {
    const result = classifyGap("CAN-XYZ", "MAP-XYZ", "sim");
    expect(result.canonicalId).toBe("CAN-XYZ");
    expect(result.mappingId).toBe("MAP-XYZ");
  });

  it("preserva answerNote", () => {
    const result = classifyGap("REQ-005", "MAP-005", "nao", "Nota de evidencia");
    expect(result.answerNote).toBe("Nota de evidencia");
  });
});

describe("calculateComplianceScore", () => {
  it("100% quando todos compliant", () => {
    const gaps: GapResult[] = [
      { canonicalId: "R1", mappingId: "M1", gapStatus: "compliant", answerValue: "sim" },
      { canonicalId: "R2", mappingId: "M2", gapStatus: "compliant", answerValue: "sim" },
    ];
    const score = calculateComplianceScore(gaps);
    expect(score.complianceScore).toBe(100);
    expect(score.riskLevel).toBe("baixo");
  });

  it("0% quando todos nao_compliant", () => {
    const gaps: GapResult[] = [
      { canonicalId: "R1", mappingId: "M1", gapStatus: "nao_compliant", answerValue: "nao", gapSeverity: "alta" },
      { canonicalId: "R2", mappingId: "M2", gapStatus: "nao_compliant", answerValue: "nao", gapSeverity: "alta" },
    ];
    const score = calculateComplianceScore(gaps);
    expect(score.complianceScore).toBe(0);
    expect(score.riskLevel).toBe("critico");
  });

  it("formula parcial: 0.5 * parcial / total", () => {
    const gaps: GapResult[] = [
      { canonicalId: "R1", mappingId: "M1", gapStatus: "parcial", answerValue: "parcial", gapSeverity: "media" },
      { canonicalId: "R2", mappingId: "M2", gapStatus: "nao_compliant", answerValue: "nao", gapSeverity: "alta" },
    ];
    const score = calculateComplianceScore(gaps);
    expect(score.complianceScore).toBe(25);
  });

  it("nao_aplicavel nao conta no denominador", () => {
    const gaps: GapResult[] = [
      { canonicalId: "R1", mappingId: "M1", gapStatus: "compliant", answerValue: "sim" },
      { canonicalId: "R2", mappingId: "M2", gapStatus: "nao_aplicavel", answerValue: "nao_aplicavel" },
    ];
    const score = calculateComplianceScore(gaps);
    expect(score.complianceScore).toBe(100);
    expect(score.totalApplicable).toBe(1);
    expect(score.totalNotApplicable).toBe(1);
  });

  it("riskLevel baixo para score >= 80%", () => {
    const compliant = Array(8).fill(null).map((_, i) => ({
      canonicalId: `R${i}`,
      mappingId: `M${i}`,
      gapStatus: "compliant" as const,
      answerValue: "sim" as const,
    }));
    const nonCompliant = [
      { canonicalId: "R8", mappingId: "M8", gapStatus: "nao_compliant" as const, answerValue: "nao" as const, gapSeverity: "alta" as const },
      { canonicalId: "R9", mappingId: "M9", gapStatus: "nao_compliant" as const, answerValue: "nao" as const, gapSeverity: "alta" as const },
    ];
    const score = calculateComplianceScore([...compliant, ...nonCompliant]);
    expect(score.complianceScore).toBe(80);
    expect(score.riskLevel).toBe("baixo");
  });

  it("riskLevel critico para score < 40%", () => {
    const gaps: GapResult[] = [
      { canonicalId: "R1", mappingId: "M1", gapStatus: "compliant", answerValue: "sim" },
      { canonicalId: "R2", mappingId: "M2", gapStatus: "nao_compliant", answerValue: "nao", gapSeverity: "alta" },
      { canonicalId: "R3", mappingId: "M3", gapStatus: "nao_compliant", answerValue: "nao", gapSeverity: "alta" },
      { canonicalId: "R4", mappingId: "M4", gapStatus: "nao_compliant", answerValue: "nao", gapSeverity: "alta" },
    ];
    const score = calculateComplianceScore(gaps);
    expect(score.complianceScore).toBe(25);
    expect(score.riskLevel).toBe("critico");
  });

  it("lista vazia retorna score 0", () => {
    const score = calculateComplianceScore([]);
    expect(score.complianceScore).toBe(0);
    expect(score.totalApplicable).toBe(0);
  });
});

describe("prioritizeGaps", () => {
  it("separa gaps por severidade corretamente", () => {
    const gaps: GapResult[] = [
      { canonicalId: "R1", mappingId: "M1", gapStatus: "nao_compliant", answerValue: "nao", gapSeverity: "alta" },
      { canonicalId: "R2", mappingId: "M2", gapStatus: "parcial", answerValue: "parcial", gapSeverity: "media" },
      { canonicalId: "R3", mappingId: "M3", gapStatus: "nao_aplicavel", answerValue: "nao_aplicavel" },
      { canonicalId: "R4", mappingId: "M4", gapStatus: "compliant", answerValue: "sim" },
    ];
    const priority = prioritizeGaps(gaps);
    expect(priority.alta).toHaveLength(1);
    expect(priority.media).toHaveLength(1);
    expect(priority.nao_aplicavel).toHaveLength(1);
    expect(priority.critica).toHaveLength(0);
    expect(priority.alta[0].canonicalId).toBe("R1");
  });

  it("compliant nao entra nas prioridades de acao", () => {
    const gaps: GapResult[] = [
      { canonicalId: "R1", mappingId: "M1", gapStatus: "compliant", answerValue: "sim" },
    ];
    const priority = prioritizeGaps(gaps);
    expect(priority.alta).toHaveLength(0);
    expect(priority.media).toHaveLength(0);
    expect(priority.critica).toHaveLength(0);
    expect(priority.baixa).toHaveLength(0);
  });
});

describe("runGapAnalysis", () => {
  it("analise completa com mix de respostas", () => {
    const answers = [
      { canonicalId: "R1", mappingId: "M1", answerValue: "sim" as const },
      { canonicalId: "R2", mappingId: "M2", answerValue: "nao" as const },
      { canonicalId: "R3", mappingId: "M3", answerValue: "parcial" as const },
      { canonicalId: "R4", mappingId: "M4", answerValue: "nao_aplicavel" as const },
    ];
    const result = runGapAnalysis(answers);
    expect(result.gaps).toHaveLength(4);
    expect(result.score.totalCompliant).toBe(1);
    expect(result.score.totalNonCompliant).toBe(1);
    expect(result.score.totalPartial).toBe(1);
    expect(result.score.totalNotApplicable).toBe(1);
    expect(result.score.totalApplicable).toBe(3);
    expect(result.score.complianceScore).toBe(50);
    expect(result.totalGaps).toBe(2);
  });

  it("score 100% somente se totalGaps == 0", () => {
    const answers = [
      { canonicalId: "R1", mappingId: "M1", answerValue: "sim" as const },
      { canonicalId: "R2", mappingId: "M2", answerValue: "sim" as const },
    ];
    const result = runGapAnalysis(answers);
    expect(result.score.complianceScore).toBe(100);
    expect(result.totalGaps).toBe(0);
  });

  it("criticalGaps conta apenas gaps de severidade critica", () => {
    const answers = [
      { canonicalId: "R1", mappingId: "M1", answerValue: "nao" as const },
    ];
    const result = runGapAnalysis(answers);
    expect(result.criticalGaps).toBe(0);
    expect(result.totalGaps).toBe(1);
  });
});
