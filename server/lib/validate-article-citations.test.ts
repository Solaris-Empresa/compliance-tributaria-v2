/**
 * DIAG-A — gate anti-alucinação de citações de artigos infralegais.
 * Opção B (não-destrutivo): flag + log; NÃO remove/substitui nesta versão.
 * Data-driven: valida contra o conjunto curado (normative_bundle), passado como param.
 */
import { describe, it, expect, vi } from "vitest";
import {
  extractArticleNumbers,
  findHallucinatedCitations,
  flagHallucinatedCitations,
  type AllowedArticles,
} from "./validate-article-citations";

const allowed: AllowedArticles = {
  decreto: new Set(["Art. 245", "Art. 246", "Art. 247", "Art. 248", "Art. 249", "Art. 28", "Art. 29"]),
  cgibs6: new Set(["Art. 593"]),
};

describe("extractArticleNumbers", () => {
  it("extrai cada 'Art. N' (range pega o início)", () => {
    expect(extractArticleNumbers("Art. 244-246 Decreto 12.955/2026")).toEqual(["Art. 244"]);
    expect(extractArticleNumbers("Art. 28 e Art. 245")).toEqual(["Art. 28", "Art. 245"]);
  });
  it("vazio quando não há artigo", () => {
    expect(extractArticleNumbers("Reforma Tributária — EC 132/2023")).toEqual([]);
  });
});

describe("findHallucinatedCitations", () => {
  it("flag Art. 244 (Decreto, fora do bundle 245-258) — caso canônico 780002", () => {
    expect(findHallucinatedCitations("Decreto 12.955/2026, Art. 244-246", allowed)).toEqual(["Art. 244"]);
  });
  it("NÃO flag artigo válido do Decreto", () => {
    expect(findHallucinatedCitations("Art. 245-249 Decreto 12.955/2026", allowed)).toEqual([]);
  });
  it("NÃO flag artigo de LC 214 (não é infralegal — fora de escopo do gate)", () => {
    expect(findHallucinatedCitations("Art. 164 LC 214/2025", allowed)).toEqual([]);
  });
  it("NÃO flag quando o conjunto curado está vazio (não validável → sem falso positivo)", () => {
    const empty: AllowedArticles = { decreto: new Set(), cgibs6: new Set() };
    expect(findHallucinatedCitations("Decreto 12.955/2026, Art. 999", empty)).toEqual([]);
  });
});

describe("flagHallucinatedCitations (Opção B — não-destrutivo)", () => {
  it("adiciona _hallucination_detected sem alterar evidencia_regulatoria", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const gaps = [{ gap: "g", evidencia_regulatoria: "Decreto 12.955/2026, Art. 244-246" }];
    const out = flagHallucinatedCitations(gaps, allowed) as any[];
    expect(out[0].evidencia_regulatoria).toBe("Decreto 12.955/2026, Art. 244-246"); // texto intacto
    expect(out[0]._hallucination_detected).toBe(true);
    expect(out[0]._hallucinated_articles).toEqual(["Art. 244"]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it("não adiciona flag quando citação é válida", () => {
    const gaps = [{ gap: "g", evidencia_regulatoria: "Art. 245-249 Decreto 12.955/2026" }];
    const out = flagHallucinatedCitations(gaps, allowed) as any[];
    expect(out[0]._hallucination_detected).toBeUndefined();
  });
});
