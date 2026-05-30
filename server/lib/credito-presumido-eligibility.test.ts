/**
 * credito-presumido-eligibility.test.ts — FEAT-SCOPE-02 (#1201)
 * Test contracts (REGRA-ORQ-28) da função pura do gate Art. 168.
 * Consumo real (consolidateRisks) validado em credito-presumido-engine.test.ts (Lição #59).
 */
import { describe, it, expect } from "vitest";
import {
  coerceOnda1AnswerToGateText,
  evaluateCreditoPresumidoEligibility,
} from "./credito-presumido-eligibility";

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

// ─── FEAT-SOL-UX-01 PR-B2: coerção dual-column ────────────────────────────────
describe("FEAT-SOL-UX-01 PR-B2 — coerceOnda1AnswerToGateText (dual-column)", () => {
  it("respostaOpcao='sim' → 'sim' (prioriza coluna nova mesmo com resposta texto contraditória)", () => {
    expect(coerceOnda1AnswerToGateText({ resposta: "Não", respostaOpcao: "sim" })).toBe("sim");
  });

  it("respostaOpcao='nao_sei' → 'nao' (conservador — bloqueia gate Art. 168)", () => {
    expect(coerceOnda1AnswerToGateText({ resposta: "talvez", respostaOpcao: "nao_sei" })).toBe("nao");
  });

  it("respostaOpcao='nao_se_aplica' → 'na' (rejeitado pela função pura — startsWith('sim'))", () => {
    expect(coerceOnda1AnswerToGateText({ resposta: "", respostaOpcao: "nao_se_aplica" })).toBe("na");
  });

  it("respostaOpcao ausente → preserva resposta texto-livre histórica", () => {
    expect(coerceOnda1AnswerToGateText({ resposta: "Sim, contrato firmado" })).toBe("Sim, contrato firmado");
    expect(coerceOnda1AnswerToGateText({ resposta: "Não" })).toBe("Não");
    expect(coerceOnda1AnswerToGateText({ resposta: "", respostaOpcao: null })).toBe("");
  });

  it("integração: respostaOpcao='nao_sei' no gate → não elegível (mesmo regime válido + restantes 'Sim')", () => {
    // Simula o que o orquestrador faria após a coerção.
    const map = new Map<string, string>([
      ["SOL-050", coerceOnda1AnswerToGateText({ resposta: "—", respostaOpcao: "nao_sei" })],
      ["SOL-051", coerceOnda1AnswerToGateText({ resposta: "Sim", respostaOpcao: "sim" })],
      ["SOL-052", coerceOnda1AnswerToGateText({ resposta: "Sim", respostaOpcao: "sim" })],
    ]);
    const r = evaluateCreditoPresumidoEligibility(GATE, map, "lucro_real");
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("SOL-050_negativa");
  });

  it("integração: 3 'sim' via respostaOpcao + Lucro Real → elegível (paridade com texto)", () => {
    const map = new Map<string, string>([
      ["SOL-050", coerceOnda1AnswerToGateText({ resposta: "", respostaOpcao: "sim" })],
      ["SOL-051", coerceOnda1AnswerToGateText({ resposta: "", respostaOpcao: "sim" })],
      ["SOL-052", coerceOnda1AnswerToGateText({ resposta: "", respostaOpcao: "sim" })],
    ]);
    expect(evaluateCreditoPresumidoEligibility(GATE, map, "lucro_real").eligible).toBe(true);
  });
});
