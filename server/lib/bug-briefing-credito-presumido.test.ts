/**
 * bug-briefing-credito-presumido.test.ts — #1202
 * Contrato do helper de restrição do briefing (parte determinística).
 * A supressão efetiva no LLM = smoke runtime (Manus). Aqui: restrição vazia/presente.
 */
import { describe, it, expect } from "vitest";
import { buildCreditoPresumidoRestriction } from "./credito-presumido-eligibility";

describe("#1202 — buildCreditoPresumidoRestriction", () => {
  it("C2 — elegível (true) → restrição vazia (LLM pode sugerir)", () => {
    expect(buildCreditoPresumidoRestriction(true)).toBe("");
  });

  it("C1 — não elegível (false) → restrição imperativa não-vazia", () => {
    const r = buildCreditoPresumidoRestriction(false);
    expect(r.length).toBeGreaterThan(0);
    expect(r).toContain("Art. 168");
    expect(r).toContain("NÃO mencione");
    expect(r).toContain("NÃO sugira");
  });

  it("C3 — regressão Art. 169 (TAC): restrição é específica de produtor rural, não suprime TAC", () => {
    const r = buildCreditoPresumidoRestriction(false);
    expect(r).toContain("produtor rural");
    // não menciona Art. 169 / transportador → não instrui supressão do TAC
    expect(r).not.toMatch(/Art\. 169|transportador/i);
  });

  it("imperativo determinístico — sem linguagem fraca ('evite')", () => {
    expect(buildCreditoPresumidoRestriction(false)).not.toMatch(/\bevite\b/i);
  });
});
