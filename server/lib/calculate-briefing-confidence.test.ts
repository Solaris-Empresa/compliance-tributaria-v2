import { describe, it, expect } from "vitest";
import { calculateBriefingConfidence, type BriefingConfidenceSignals } from "./calculate-briefing-confidence";

const ZERO: BriefingConfidenceSignals = {
  solarisAnswersCount: 0,
  iagenAnswersCount: 0,
  productAnswersCount: 0,
  serviceAnswersCount: 0,
  cnaeAnswersCount: 0,
  ncmCodesCount: 0,
  nbsCodesCount: 0,
};

describe("calculateBriefingConfidence", () => {
  it("retorna 30 quando total == 0 (sem respostas)", () => {
    expect(calculateBriefingConfidence(ZERO)).toBe(30);
  });

  it("retorna 55 quando total < 5 (1-4 respostas)", () => {
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 1 })).toBe(55);
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 2, iagenAnswersCount: 2 })).toBe(55);
  });

  it("retorna 70 quando total 5-14", () => {
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 5 })).toBe(70);
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 10, iagenAnswersCount: 4 })).toBe(70);
  });

  it("retorna 80 quando total 15-29", () => {
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 15 })).toBe(80);
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 20, iagenAnswersCount: 9 })).toBe(80);
  });

  it("retorna 85 quando total >= 30 sem NCM/NBS", () => {
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 30 })).toBe(85);
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 50, iagenAnswersCount: 20 })).toBe(85);
  });

  it("retorna 90 quando total >= 30 com NCM cadastrado", () => {
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 30, ncmCodesCount: 3 })).toBe(90);
  });

  it("retorna 90 quando total >= 30 com NBS cadastrado", () => {
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 30, nbsCodesCount: 2 })).toBe(90);
  });

  it("NCM/NBS sem respostas suficientes não altera faixa (ainda depende de total)", () => {
    expect(calculateBriefingConfidence({ ...ZERO, ncmCodesCount: 5 })).toBe(30);
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 4, ncmCodesCount: 5 })).toBe(55);
  });

  it("valores negativos são tratados como 0", () => {
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: -5 })).toBe(30);
  });

  it("boundary: exatamente 5 → 70 · exatamente 15 → 80 · exatamente 30 → 85/90", () => {
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 4 })).toBe(55);
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 5 })).toBe(70);
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 14 })).toBe(70);
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 15 })).toBe(80);
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 29 })).toBe(80);
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 30 })).toBe(85);
    expect(calculateBriefingConfidence({ ...ZERO, solarisAnswersCount: 30, ncmCodesCount: 1 })).toBe(90);
  });
});
