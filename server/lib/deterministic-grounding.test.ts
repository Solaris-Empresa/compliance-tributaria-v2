/**
 * Frente B (BUG-FONTES) — injeção determinística de regulamentação operacional.
 *
 * O formatador é puro (sem DB): recebe os conteúdos dos chunks (Decreto/CGIBS)
 * e devolve o bloco a ANEXAR ao regulatoryContext. O fetch (DB) é glue graceful,
 * validado por smoke (Manus) — não unit-testado (evita anti-pattern de mock).
 */
import { describe, it, expect } from "vitest";
import {
  formatDeterministicGrounding,
  buildSimplesNacionalNote,
} from "./deterministic-grounding";

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

describe("buildSimplesNacionalNote — BUG-IBS-02", () => {
  it("simples_nacional → nota com 'Art. 41, §2º' e 'Art. 49'", () => {
    const nota = buildSimplesNacionalNote("simples_nacional");
    expect(nota).toContain("Art. 41, §2º");
    expect(nota).toContain("Art. 49");
    expect(nota).toContain("Simples Nacional");
  });

  it("nota NÃO usa prefixo [FONTE: Resolução CGIBS 6 (preserva guard '0 tags CGIBS p/ SN')", () => {
    expect(buildSimplesNacionalNote("simples_nacional")).not.toContain("[FONTE: Resolução CGIBS 6");
  });

  it("lucro_presumido → nota ausente (string vazia)", () => {
    expect(buildSimplesNacionalNote("lucro_presumido")).toBe("");
  });

  it("lucro_real / null / undefined → nota ausente", () => {
    expect(buildSimplesNacionalNote("lucro_real")).toBe("");
    expect(buildSimplesNacionalNote(null)).toBe("");
    expect(buildSimplesNacionalNote(undefined)).toBe("");
  });
});
