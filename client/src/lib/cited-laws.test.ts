/**
 * BUG-3/GAP-3 — deriveCitedLaws: Base Legal dinâmica derivada dos artigos
 * enriquecidos (#1169) dos riscos + oportunidades. LC 214 sempre presente.
 */
import { describe, it, expect } from "vitest";
import { deriveCitedLaws, LAWS_CATALOG } from "./cited-laws";

describe("deriveCitedLaws (BUG-3/GAP-3)", () => {
  it("sem Decreto/CGIBS → só LC 214/2025", () => {
    const out = deriveCitedLaws([{ artigo: "Art. 164 LC 214/2025" }], []);
    expect(out).toEqual([LAWS_CATALOG["LC 214/2025"]]);
  });

  it("risco com Decreto → LC 214 + Decreto", () => {
    const out = deriveCitedLaws([{ artigo: "Art. 31 LC 214/2025; Arts. 28-37 Decreto 12.955/2026" }], []);
    expect(out.map((l) => l.nome)).toEqual([
      LAWS_CATALOG["LC 214/2025"].nome,
      LAWS_CATALOG["Decreto 12.955/2026"].nome,
    ]);
  });

  it("Decreto só em OPORTUNIDADE (sem risco) → ainda lista Decreto", () => {
    const out = deriveCitedLaws(
      [{ artigo: "Art. 164 LC 214/2025" }],
      [{ artigo: "Art. 168 LC 214/2025; Arts. 245-258 Decreto 12.955/2026" }]
    );
    expect(out.map((l) => l.nome)).toContain(LAWS_CATALOG["Decreto 12.955/2026"].nome);
  });

  it("CGIBS no artigo → inclui Resolução CGIBS 6", () => {
    const out = deriveCitedLaws([{ artigo: "Art. 102 LC 214/2025; Arts. 104-107 Resolução CGIBS 6/2026" }], []);
    expect(out.map((l) => l.nome)).toContain(LAWS_CATALOG["Resolução CGIBS 6/2026"].nome);
  });

  it("Decreto + CGIBS → ordem LC, Decreto, CGIBS", () => {
    const out = deriveCitedLaws(
      [{ artigo: "Arts. 42-46 Decreto 12.955/2026" }],
      [{ artigo: "Arts. 104-107 Resolução CGIBS 6/2026" }]
    );
    expect(out).toEqual([
      LAWS_CATALOG["LC 214/2025"],
      LAWS_CATALOG["Decreto 12.955/2026"],
      LAWS_CATALOG["Resolução CGIBS 6/2026"],
    ]);
  });

  it("artigo null/undefined → seguro (só LC 214)", () => {
    const out = deriveCitedLaws([{ artigo: null }, { artigo: undefined }, {}], []);
    expect(out).toEqual([LAWS_CATALOG["LC 214/2025"]]);
  });
});
