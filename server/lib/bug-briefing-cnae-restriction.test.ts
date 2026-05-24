/**
 * BUG-BRIEFING-CNAE (#1190 / Opção A') — contrato do helper de restrição de prompt.
 * A supressão efetiva do Art. 127 no briefing é do LLM (fluxoV3.generateBriefing) —
 * validada por smoke runtime (Manus). Aqui testa-se a PARTE DETERMINÍSTICA: a string
 * de restrição é injetada (não-vazia) quando o CNAE não é elegível, e vazia quando é.
 */
import { describe, it, expect } from "vitest";
import { buildArt127PromptRestriction } from "./cnae-oportunidade-eligibility";

describe("BUG-BRIEFING-CNAE — buildArt127PromptRestriction", () => {
  it("CNAE elegível (true) → restrição vazia (LLM pode sugerir Art. 127)", () => {
    expect(buildArt127PromptRestriction(true)).toBe("");
  });

  it("CNAE não elegível (false) → restrição imperativa não-vazia", () => {
    const r = buildArt127PromptRestriction(false);
    expect(r.length).toBeGreaterThan(0);
    expect(r).toContain("Art. 127");
    expect(r).toContain("Art. 202");
    // imperativo (REGRA-ORQ-20: instrução negativa forte, não "evite")
    expect(r).toContain("NÃO mencione");
    expect(r).toContain("NÃO sugira");
  });

  it("imperativo determinístico — não usa linguagem fraca ('evite')", () => {
    const r = buildArt127PromptRestriction(false);
    expect(r).not.toMatch(/\bevite\b/i);
  });
});
