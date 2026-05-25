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
  shouldInjectCategory,
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

describe("formatDeterministicGrounding — header dinâmico (POLISH-01 / BUG-IBS-03)", () => {
  it("só Decreto presente (ex: SN) → header NÃO menciona Resolução CGIBS 6", () => {
    const block = formatDeterministicGrounding(["[FONTE: Decreto 12.955/2026, Art. 28]\ntexto"]);
    expect(block).toContain("Decreto 12.955/2026");
    expect(block).not.toContain("Resolução CGIBS 6/2026");
  });

  it("Decreto + CGIBS presentes → header menciona ambos", () => {
    const block = formatDeterministicGrounding([
      "[FONTE: Decreto 12.955/2026, Art. 28]\nx",
      "[FONTE: Resolução CGIBS 6/2026, Art. 467]\ny",
    ]);
    expect(block).toContain("Decreto 12.955/2026");
    expect(block).toContain("Resolução CGIBS 6/2026");
  });

  it("Portaria presente → header inclui Portaria MF/CGIBS 7/2026 (BUG-IBS-03)", () => {
    const block = formatDeterministicGrounding(["[FONTE: Portaria MF/CGIBS 7/2026, Art. 1]\nz"]);
    expect(block).toContain("Portaria MF/CGIBS 7/2026");
  });
});

describe("shouldInjectCategory — Gate CNAE + Vigência (FASE 4)", () => {
  const PASSADO = new Date("2026-04-30");
  const HOJE = new Date("2026-05-25");
  const FUTURO = new Date("2027-01-01");

  it("T1: cnae_codes=['4120-4'] + projeto CNAE 4120-4 → injetada", () => {
    expect(shouldInjectCategory(["4120-4"], null, { cnae: "4120-4/00", today: HOJE })).toBe(true);
  });

  it("T2: cnae_codes=['4120-4'] + projeto CNAE 6911-7 → NÃO injetada", () => {
    expect(shouldInjectCategory(["4120-4"], null, { cnae: "6911-7/00", today: HOJE })).toBe(false);
  });

  it("T3: vigencia_inicio=2027-01-01 + today=2026-05-25 → NÃO injetada", () => {
    expect(shouldInjectCategory([], FUTURO, { cnae: "4120-4/00", today: HOJE })).toBe(false);
    expect(shouldInjectCategory([], "2027-01-01", { today: HOJE })).toBe(false);
  });

  it("T4: vigencia_inicio=2026-04-30 + today=2026-05-25 → injetada", () => {
    expect(shouldInjectCategory([], PASSADO, { cnae: "4120-4/00", today: HOJE })).toBe(true);
  });

  it("T5: sem cnae_codes (categorias existentes) + qualquer CNAE → injetada (backward-compat)", () => {
    expect(shouldInjectCategory(undefined, null, { cnae: "9999-9/99", today: HOJE })).toBe(true);
    expect(shouldInjectCategory([], null, { cnae: "6911-7/00", today: HOJE })).toBe(true);
  });

  it("vigência hard-block independe de CNAE match (futura + CNAE casa → não injeta)", () => {
    expect(shouldInjectCategory(["4120-4"], FUTURO, { cnae: "4120-4/00", today: HOJE })).toBe(false);
  });

  it("sem context.cnae → gate CNAE não filtra (injeta mesmo com cnae_codes)", () => {
    expect(shouldInjectCategory(["4120-4"], null, { today: HOJE })).toBe(true);
  });
});
