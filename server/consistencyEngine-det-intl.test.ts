// consistencyEngine-det-intl.test.ts — F2 dual-name (SPEC-F2-dual-name.md)
//
// DoD discriminante (REGRA-ORQ-44/47): prova que DET-004 (MEI×intl) e DET-005
// (Simples×intl) disparam com hasInternationalOps=true e NÃO disparam sem.
// Importa a função REAL `runDeterministicChecks` (não réplica — Lição #110).
import { describe, it, expect } from "vitest";
import { runDeterministicChecks, type ConsistencyInput } from "./consistencyEngine";

const has = (input: ConsistencyInput, id: string): boolean =>
  runDeterministicChecks(input).some((f) => f.id === id);

describe("DET-004/005 — operações internacionais (F2 discriminante)", () => {
  it("MEI + hasInternationalOps=true → DET-004 dispara (positivo)", () => {
    expect(
      has({ companyProfile: { companySize: "mei" }, taxComplexity: { hasInternationalOps: true } }, "DET-004")
    ).toBe(true);
  });

  it("MEI + hasInternationalOps=false → DET-004 NÃO dispara (negativo discriminante)", () => {
    expect(
      has({ companyProfile: { companySize: "mei" }, taxComplexity: { hasInternationalOps: false } }, "DET-004")
    ).toBe(false);
  });

  it("MEI + hasInternationalOps ausente → DET-004 NÃO dispara (estado dual-name pré-fix)", () => {
    expect(has({ companyProfile: { companySize: "mei" }, taxComplexity: {} }, "DET-004")).toBe(false);
  });

  it("Simples Nacional + hasInternationalOps=true → DET-005 dispara (positivo)", () => {
    expect(
      has({ companyProfile: { taxRegime: "simples_nacional" }, taxComplexity: { hasInternationalOps: true } }, "DET-005")
    ).toBe(true);
  });

  it("Simples Nacional + hasInternationalOps ausente → DET-005 NÃO dispara", () => {
    expect(has({ companyProfile: { taxRegime: "simples_nacional" }, taxComplexity: {} }, "DET-005")).toBe(false);
  });

  it("não-MEI / não-Simples + hasInternationalOps=true → DET-004 e DET-005 NÃO disparam", () => {
    const input: ConsistencyInput = {
      companyProfile: { companySize: "media", taxRegime: "lucro_real" },
      taxComplexity: { hasInternationalOps: true },
    };
    expect(has(input, "DET-004")).toBe(false);
    expect(has(input, "DET-005")).toBe(false);
  });
});
