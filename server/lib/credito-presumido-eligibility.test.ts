/**
 * credito-presumido-eligibility.test.ts — FEAT-SCOPE-02 (#1201)
 * Test contracts (REGRA-ORQ-28) da função pura do gate Art. 168.
 * Consumo real (consolidateRisks) validado em credito-presumido-engine.test.ts (Lição #59).
 */
import { describe, it, expect } from "vitest";
import { evaluateCreditoPresumidoEligibility } from "./credito-presumido-eligibility";

const GATE = ["SOL-050", "SOL-051", "SOL-052"];
const allSim = () =>
  new Map<string, string>([
    ["SOL-050", "Sim"],
    ["SOL-051", "Sim"],
    ["SOL-052", "Sim"],
  ]);

describe("FEAT-SCOPE-02 — gate credito_presumido Art. 168 (função pura)", () => {
  it("C1 — guardrail Simples Nacional → false", () => {
    const r = evaluateCreditoPresumidoEligibility(GATE, allSim(), "simples_nacional");
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("simples_nacional");
  });

  it("C2 — NULL conservador: regime=null, resposta ausente → false", () => {
    const map = new Map([["SOL-051", "Sim"], ["SOL-052", "Sim"]]); // SOL-050 ausente
    const r = evaluateCreditoPresumidoEligibility(GATE, map, null);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("SOL-050_nao_respondida");
  });

  it("C3 — Lucro Real + Q5/Q1/Q2='Sim' → true", () => {
    expect(evaluateCreditoPresumidoEligibility(GATE, allSim(), "lucro_real").eligible).toBe(true);
  });

  it("C4 — Lucro Presumido + Q5/Q1/Q2='Sim' → true", () => {
    expect(evaluateCreditoPresumidoEligibility(GATE, allSim(), "lucro_presumido").eligible).toBe(true);
  });

  it("C5 — Q1='Não' bloqueia → false", () => {
    const map = new Map([["SOL-050", "Sim"], ["SOL-051", "Não"], ["SOL-052", "Sim"]]);
    const r = evaluateCreditoPresumidoEligibility(GATE, map, null);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("SOL-051_negativa");
  });

  it("C6/C7 — CNAE irrelevante: função não recebe CNAE; resultado depende só de regime+respostas", () => {
    // CNAE 4120 (construtora) não é parâmetro → elegível se respostas='Sim' (Art. 168 não restringe por CNAE)
    expect(evaluateCreditoPresumidoEligibility(GATE, allSim(), "lucro_real").eligible).toBe(true);
    const neg = new Map([["SOL-050", "Sim"], ["SOL-051", "Não"], ["SOL-052", "Sim"]]);
    expect(evaluateCreditoPresumidoEligibility(GATE, neg, "lucro_real").eligible).toBe(false);
  });

  it("NULL regime (taxRegime não preenchido) + respostas 'Sim' → elegível (NULL ≠ Simples)", () => {
    expect(evaluateCreditoPresumidoEligibility(GATE, allSim(), null).eligible).toBe(true);
  });

  it("sem perguntas-gate configuradas → conservador (false)", () => {
    const r = evaluateCreditoPresumidoEligibility([], allSim(), "lucro_real");
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("sem_gate_questions");
  });

  it("aceita variações de 'sim' (case/acento/trailing)", () => {
    const map = new Map([["SOL-050", " SIM "], ["SOL-051", "sim, contrato"], ["SOL-052", "Sim"]]);
    expect(evaluateCreditoPresumidoEligibility(GATE, map, "lucro_real").eligible).toBe(true);
  });
});
