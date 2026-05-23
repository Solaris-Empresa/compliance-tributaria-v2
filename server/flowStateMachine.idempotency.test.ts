/**
 * BUG-FSM-01 — Idempotência de re-submit no assertValidTransition.
 * IDEMPOTENT_STATES = { onda1_solaris, onda2_iagen } (decisão P.O. 23/05 — só estados
 * com caller real de re-submit: 4841 e 5289). Feature flag FSM_IDEMPOTENCY_ENABLED.
 */
import { describe, it, expect, afterEach } from "vitest";
import { assertValidTransition } from "./flowStateMachine";

describe("assertValidTransition — idempotência (BUG-FSM-01)", () => {
  afterEach(() => {
    delete process.env.FSM_IDEMPOTENCY_ENABLED;
  });

  it("T1: transição normal perfil_entidade_confirmado → onda1_solaris → { idempotent: false }", () => {
    expect(assertValidTransition("perfil_entidade_confirmado", "onda1_solaris")).toEqual({
      idempotent: false,
    });
  });

  it("T2: re-submit onda1_solaris → onda1_solaris → { idempotent: true } (sem erro)", () => {
    expect(assertValidTransition("onda1_solaris", "onda1_solaris")).toEqual({ idempotent: true });
  });

  it("T3: re-submit onda2_iagen → onda2_iagen → { idempotent: true } (sem erro)", () => {
    expect(assertValidTransition("onda2_iagen", "onda2_iagen")).toEqual({ idempotent: true });
  });

  it("T4: regressão proibida onda2_iagen → onda1_solaris → lança", () => {
    expect(() => assertValidTransition("onda2_iagen", "onda1_solaris")).toThrow();
  });

  it("T5: self-transition em estado NÃO idempotente (briefing → briefing) → lança", () => {
    expect(() => assertValidTransition("briefing", "briefing")).toThrow();
  });

  it("T6: FSM_IDEMPOTENCY_ENABLED=false + re-submit → lança (flag funciona)", () => {
    process.env.FSM_IDEMPOTENCY_ENABLED = "false";
    expect(() => assertValidTransition("onda1_solaris", "onda1_solaris")).toThrow();
  });
});
