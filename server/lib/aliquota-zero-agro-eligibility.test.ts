/**
 * aliquota-zero-agro-eligibility.test.ts — GATE-NCM-NBS #1439b
 *
 * Cobre a função pura do gate Art. 110/197 (sem DB) + o mapeamento confidence
 * high/medium (DoD negativo — Lição #124: a variável-do-gate SOL-059 flipa a banda).
 */
import { describe, it, expect } from "vitest";
import {
  evaluateAliquotaZeroAgroEligibility,
  resolveAgroConfidence,
  CONFIDENCE_AGRO_CONFIRMED,
  CONFIDENCE_AGRO_PENDENTE,
} from "./aliquota-zero-agro-eligibility";

const GATE = ["SOL-058", "SOL-059"];

describe("evaluateAliquotaZeroAgroEligibility (função pura)", () => {
  it("SOL-058=sim AND SOL-059=sim → elegível", () => {
    const map = new Map([
      ["SOL-058", "sim"],
      ["SOL-059", "sim"],
    ]);
    const r = evaluateAliquotaZeroAgroEligibility(GATE, map);
    expect(r.eligible).toBe(true);
    expect(r.reason).toBeNull();
  });

  it("SOL-059=nao (destinatário não confirmado) → NÃO elegível", () => {
    const map = new Map([
      ["SOL-058", "sim"],
      ["SOL-059", "nao"],
    ]);
    const r = evaluateAliquotaZeroAgroEligibility(GATE, map);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("SOL-059_negativa");
  });

  it("SOL-059 ausente → NÃO elegível (conservador)", () => {
    const map = new Map([["SOL-058", "sim"]]);
    const r = evaluateAliquotaZeroAgroEligibility(GATE, map);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("SOL-059_nao_respondida");
  });

  it("SOL-058=nao (produto não elegível) → NÃO elegível", () => {
    const map = new Map([
      ["SOL-058", "nao"],
      ["SOL-059", "sim"],
    ]);
    const r = evaluateAliquotaZeroAgroEligibility(GATE, map);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("SOL-058_negativa");
  });

  it("sem perguntas-gate configuradas → NÃO elegível (sem_gate_questions)", () => {
    const r = evaluateAliquotaZeroAgroEligibility([], new Map());
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("sem_gate_questions");
  });
});

describe("resolveAgroConfidence — DoD negativo (Lição #124: gate variável flipa a banda)", () => {
  it("confirmado → confidence HIGH, sem nota", () => {
    const { confidence, note } = resolveAgroConfidence({ eligible: true, reason: null });
    expect(confidence).toBe(CONFIDENCE_AGRO_CONFIRMED);
    expect(confidence).toBeGreaterThanOrEqual(0.8);
    expect(note).toBeUndefined();
  });

  it("não confirmado → confidence MEDIUM + nota condicional", () => {
    const { confidence, note } = resolveAgroConfidence({
      eligible: false,
      reason: "SOL-059_negativa",
    });
    expect(confidence).toBe(CONFIDENCE_AGRO_PENDENTE);
    expect(confidence).toBeLessThan(0.8);
    expect(confidence).toBeGreaterThanOrEqual(0.4);
    expect(note).toMatch(/condicional/i);
    expect(note).toMatch(/produtor rural não contribuinte/i);
  });

  it("DoD negativo: mudar SOMENTE SOL-059 (variável do gate) flipa a banda", () => {
    // CNAE/NCM inalterados; só o destinatário (SOL-059) muda — Lição #124.
    const sim = new Map([["SOL-058", "sim"], ["SOL-059", "sim"]]);
    const nao = new Map([["SOL-058", "sim"], ["SOL-059", "nao"]]);

    const high = resolveAgroConfidence(evaluateAliquotaZeroAgroEligibility(GATE, sim));
    const medium = resolveAgroConfidence(evaluateAliquotaZeroAgroEligibility(GATE, nao));

    expect(high.confidence).toBe(CONFIDENCE_AGRO_CONFIRMED);
    expect(medium.confidence).toBe(CONFIDENCE_AGRO_PENDENTE);
    expect(high.confidence).toBeGreaterThan(medium.confidence);
  });
});
