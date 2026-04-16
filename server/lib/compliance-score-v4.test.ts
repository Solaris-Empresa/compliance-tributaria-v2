import { describe, it, expect } from "vitest";
import {
  calculateComplianceScore,
  SEVERIDADE_SCORE_MAP,
  CONFIDENCE_FLOOR,
  MAX_PESO,
} from "./compliance-score-v4";

describe("compliance-score-v4", () => {
  it("0 riscos → score=0, nivel=baixo", () => {
    const result = calculateComplianceScore([]);
    expect(result.score).toBe(0);
    expect(result.nivel).toBe("baixo");
    expect(result.total_riscos_aprovados).toBe(0);
    expect(result.formula_version).toBe("v4.0");
  });

  it("riscos não aprovados são ignorados (RN-CV4-01)", () => {
    const result = calculateComplianceScore([
      { severidade: "alta", confidence: 1, type: "risk", approved_at: null },
      { severidade: "media", confidence: 1, type: "risk", approved_at: null },
    ]);
    expect(result.score).toBe(0);
    expect(result.total_riscos_aprovados).toBe(0);
  });

  it("oportunidades fora do denominador (RN-CV4-02)", () => {
    const now = new Date();
    const result = calculateComplianceScore([
      { severidade: "alta", confidence: 1, type: "risk", approved_at: now },
      { severidade: "oportunidade", confidence: 1, type: "opportunity", approved_at: now },
    ]);
    // 1 risco scorable: (7×1)/(1×9)×100 = 77.78 → 78
    expect(result.score).toBe(78);
    expect(result.nivel).toBe("critico");
    expect(result.total_riscos_aprovados).toBe(2);
    expect(result.total_alta).toBe(1);
  });

  it("confidence mínima 0.5 aplicada (RN-CV4-04)", () => {
    const now = new Date();
    const result = calculateComplianceScore([
      { severidade: "alta", confidence: 0, type: "risk", approved_at: now },
    ]);
    // (7×0.5)/(1×9)×100 = 38.89 → 39
    expect(result.score).toBe(39);
    expect(result.nivel).toBe("medio");
  });

  it("nível critico >= 75", () => {
    const now = new Date();
    const result = calculateComplianceScore([
      { severidade: "alta", confidence: 1, type: "risk", approved_at: now },
      { severidade: "alta", confidence: 1, type: "risk", approved_at: now },
    ]);
    // (7+7)/(2×9)×100 = 77.78 → 78
    expect(result.score).toBe(78);
    expect(result.nivel).toBe("critico");
  });

  it("nível alto >= 50 < 75", () => {
    const now = new Date();
    const result = calculateComplianceScore([
      { severidade: "alta", confidence: 1, type: "risk", approved_at: now },
      { severidade: "media", confidence: 1, type: "risk", approved_at: now },
    ]);
    // (7+5)/(2×9)×100 = 66.67 → 67
    expect(result.score).toBe(67);
    expect(result.nivel).toBe("alto");
  });

  it("nível medio >= 25 < 50", () => {
    const now = new Date();
    const result = calculateComplianceScore([
      { severidade: "media", confidence: 0.5, type: "risk", approved_at: now },
    ]);
    // (5×0.5)/(1×9)×100 = 27.78 → 28
    expect(result.score).toBe(28);
    expect(result.nivel).toBe("medio");
  });

  it("constantes exportadas corretamente", () => {
    expect(SEVERIDADE_SCORE_MAP.alta).toBe(7);
    expect(SEVERIDADE_SCORE_MAP.media).toBe(5);
    expect(SEVERIDADE_SCORE_MAP.oportunidade).toBe(1);
    expect(CONFIDENCE_FLOOR).toBe(0.5);
    expect(MAX_PESO).toBe(9);
  });

  it("total_alta e total_media contam corretamente", () => {
    const now = new Date();
    const result = calculateComplianceScore([
      { severidade: "alta", confidence: 1, type: "risk", approved_at: now },
      { severidade: "alta", confidence: 1, type: "risk", approved_at: now },
      { severidade: "media", confidence: 1, type: "risk", approved_at: now },
    ]);
    expect(result.total_alta).toBe(2);
    expect(result.total_media).toBe(1);
    expect(result.total_riscos_aprovados).toBe(3);
  });
});
