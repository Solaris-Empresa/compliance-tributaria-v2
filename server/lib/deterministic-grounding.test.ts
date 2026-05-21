/**
 * Frente B (BUG-FONTES) — injeção determinística de regulamentação operacional.
 *
 * O formatador é puro (sem DB): recebe os conteúdos dos chunks (Decreto/CGIBS)
 * e devolve o bloco a ANEXAR ao regulatoryContext. O fetch (DB) é glue graceful,
 * validado por smoke (Manus) — não unit-testado (evita anti-pattern de mock).
 */
import { describe, it, expect } from "vitest";
import { formatDeterministicGrounding } from "./deterministic-grounding";

describe("formatDeterministicGrounding", () => {
  it("monta bloco com header + conteúdos concatenados", () => {
    const block = formatDeterministicGrounding([
      "Art. 245º Do crédito presumido do produtor rural...",
      "Art. 28º Da extinção de débitos via split payment...",
    ]);
    expect(block).toContain("REGULAMENTAÇÃO OPERACIONAL");
    expect(block).toContain("Art. 245º Do crédito presumido do produtor rural...");
    expect(block).toContain("Art. 28º Da extinção de débitos via split payment...");
  });

  it("retorna string vazia quando não há conteúdos (degradação graciosa)", () => {
    expect(formatDeterministicGrounding([])).toBe("");
  });

  it("filtra conteúdos vazios/whitespace; vazio total → string vazia", () => {
    expect(formatDeterministicGrounding(["   ", ""])).toBe("");
  });

  it("não emite instrução de citação (grounding — o nudge no prompt cuida disso)", () => {
    const block = formatDeterministicGrounding(["Art. 245º texto."]);
    expect(block.toLowerCase()).not.toContain("cite");
  });
});
