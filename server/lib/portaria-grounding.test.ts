/**
 * Frente C (BUG-FONTES) — grounding silencioso da Portaria MF/CGIBS 7.
 *
 * O formatador é puro (sem DB): recebe os chunks e devolve o bloco de
 * contexto a ser ANEXADO ao regulatoryContext do briefing. Sem instrução
 * de citação — apenas grounding (a "ponte" CBS/IBS).
 */
import { describe, it, expect } from "vitest";
import { formatPortariaGrounding } from "./portaria-grounding";

describe("formatPortariaGrounding", () => {
  it("monta bloco com header + conteúdo dos chunks", () => {
    const block = formatPortariaGrounding([
      { conteudo: "Art. 1 — Disposições comuns ao IBS e à CBS." },
      { conteudo: "Art. 2 — Livro I do Decreto 12.955 = Livro I da CGIBS 6." },
    ]);

    expect(block).toContain("CONTEXTO NORMATIVO — DISPOSIÇÕES COMUNS IBS E CBS:");
    expect(block).toContain("Art. 1 — Disposições comuns ao IBS e à CBS.");
    expect(block).toContain("Art. 2 — Livro I do Decreto 12.955 = Livro I da CGIBS 6.");
  });

  it("retorna string vazia quando não há chunks (degradação graciosa)", () => {
    expect(formatPortariaGrounding([])).toBe("");
  });

  it("filtra chunks com conteúdo vazio/whitespace; vazio total → string vazia", () => {
    expect(formatPortariaGrounding([{ conteudo: "   " }, { conteudo: "" }])).toBe("");
  });

  it("não emite instrução pedindo para CITAR a Portaria (grounding silencioso)", () => {
    const block = formatPortariaGrounding([{ conteudo: "Art. 1 — texto." }]);
    expect(block.toLowerCase()).not.toContain("cite");
    expect(block.toLowerCase()).not.toContain("mencione");
  });
});
