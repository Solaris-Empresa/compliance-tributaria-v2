// completude-faixas.test.ts — CALC-4 (#1383)
// Contract test das 5 faixas unificadas de completude (thresholds 0/50/70/85/95).
// DecisionPanel.faixaCompletude e ConfidenceBar.getConfidenceConfig DEVEM
// concordar no label de cada faixa (fonte única, fim dos 3 thresholds conflitantes).
import { describe, it, expect } from "vitest";
import { faixaCompletude } from "@/components/briefing/DecisionPanel";
import { getConfidenceConfig } from "@/components/ConfidenceBar";

// [valor, label esperado] — cobre boundaries de cada faixa
const CASES: [number, string][] = [
  [0, "Insuficiente"],
  [49, "Insuficiente"],
  [50, "Parcial"],
  [69, "Parcial"],
  [70, "Em construção"],
  [84, "Em construção"],
  [85, "Confiável"],
  [94, "Confiável"],
  [95, "Pleno"],
  [100, "Pleno"],
];

describe("CALC-4 — 5 faixas unificadas (0/50/70/85/95)", () => {
  for (const [n, label] of CASES) {
    it(`DecisionPanel.faixaCompletude(${n}) = "${label}"`, () => {
      expect(faixaCompletude(n).label).toBe(label);
    });
    it(`ConfidenceBar.getConfidenceConfig(${n}) = "${label}"`, () => {
      expect(getConfidenceConfig(n).label).toBe(label);
    });
  }

  it("os dois componentes concordam no label em toda a faixa 0..100", () => {
    for (let n = 0; n <= 100; n++) {
      expect(faixaCompletude(n).label).toBe(getConfidenceConfig(n).label);
    }
  });

  it("85 é o limiar de aprovação plena (Confiável, não 'Em construção')", () => {
    expect(faixaCompletude(84).label).toBe("Em construção");
    expect(faixaCompletude(85).label).toBe("Confiável");
  });

  it("não usa labels antigos (Alta/Média/Baixa/Crítico/Adequado/Completo)", () => {
    const antigos = ["Alta", "Média", "Baixa", "Crítico", "Adequado", "Completo"];
    for (let n = 0; n <= 100; n += 5) {
      expect(antigos).not.toContain(faixaCompletude(n).label);
      expect(antigos).not.toContain(getConfidenceConfig(n).label);
    }
  });
});
