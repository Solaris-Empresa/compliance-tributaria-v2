/**
 * BUG-1/GAP-1 (Opção C) — enrichArticle deriva o artigo do risco do normative_bundle
 * em runtime (LC base + Decreto/CGIBS curados), sem migração de dados.
 *
 * 3 comportamentos graciosos + filtro CGIBS por regime (não-SN).
 */
import { describe, it, expect } from "vitest";
import { enrichArticle } from "./risk-engine-v4";

describe("enrichArticle (BUG-1 Opção C + BUG-RAG-ARTIGO-RANGE Opção D)", () => {
  // BUG-RAG-ARTIGO-RANGE (2026-06-02 Opção D): formatArticleRange agora detecta
  // consecutividade. Conjuntos discretos viram lista por vírgulas (não range
  // compactado) — evita falso positivo no articleMatches downstream.

  it("artigos_decreto discreto [28, 29, 37] → lista por vírgulas (Opção D)", () => {
    // ANTES Opção D: "Arts. 28-37" (range artificial, incluía Art. 30..36 que NÃO estavam no bundle)
    // APÓS Opção D: "Arts. 28, 29, 37" (lista literal — articleMatches valida contra cada item)
    const bundle = { artigos_lc214: ["Art. 31"], artigos_decreto: ["Art. 28", "Art. 29", "Art. 37"] };
    expect(enrichArticle("Art. 31 LC 214/2025", bundle, "lucro_real")).toBe(
      "Art. 31 LC 214/2025; Arts. 28, 29, 37 Decreto 12.955/2026"
    );
  });

  it("artigos_decreto consecutivo [28, 29, 30] → range compacto (preserva legado)", () => {
    // Consecutivos REAIS continuam compactos — articleMatches expande [28..30] sem falso positivo
    const bundle = { artigos_lc214: ["Art. 31"], artigos_decreto: ["Art. 28", "Art. 29", "Art. 30"] };
    expect(enrichArticle("Art. 31 LC 214/2025", bundle, "lucro_real")).toBe(
      "Art. 31 LC 214/2025; Arts. 28-30 Decreto 12.955/2026"
    );
  });

  it("artigos_decreto com 1 artigo → 'Art. N' (não range)", () => {
    const bundle = { artigos_decreto: ["Art. 245"] };
    expect(enrichArticle("Art. 168 LC 214/2025", bundle, "lucro_real")).toBe(
      "Art. 168 LC 214/2025; Art. 245 Decreto 12.955/2026"
    );
  });

  it("artigos_decreto NULL → só artigo_base (graceful — inscricao_cadastral)", () => {
    expect(enrichArticle("Art. 164 LC 214/2025", { artigos_decreto: null } as any, "lucro_real")).toBe(
      "Art. 164 LC 214/2025"
    );
  });

  it("artigos_decreto [] → só artigo_base", () => {
    expect(enrichArticle("Art. 164 LC 214/2025", { artigos_decreto: [] }, "lucro_real")).toBe(
      "Art. 164 LC 214/2025"
    );
  });

  it("bundle null/ausente → só artigo_base (categoria não-confirmed)", () => {
    expect(enrichArticle("Art. 45 LC 214/2025", null, "lucro_real")).toBe("Art. 45 LC 214/2025");
    expect(enrichArticle("Art. 45 LC 214/2025", undefined, "lucro_real")).toBe("Art. 45 LC 214/2025");
  });

  it("CGIBS presente + regime != simples_nacional → inclui CGIBS (decreto+cgibs ambos discretos via Opção D)", () => {
    const bundle = { artigos_decreto: ["Art. 42", "Art. 46"], artigos_cgibs6: ["Art. 104", "Art. 107"] };
    expect(enrichArticle("Art. 102 LC 214/2025", bundle, "lucro_real")).toBe(
      "Art. 102 LC 214/2025; Arts. 42, 46 Decreto 12.955/2026; Arts. 104, 107 Resolução CGIBS 6/2026"
    );
  });

  it("CGIBS presente + regime == simples_nacional → exclui CGIBS (PR #1099)", () => {
    const bundle = { artigos_decreto: ["Art. 42", "Art. 46"], artigos_cgibs6: ["Art. 104"] };
    expect(enrichArticle("Art. 102 LC 214/2025", bundle, "simples_nacional")).toBe(
      "Art. 102 LC 214/2025; Arts. 42, 46 Decreto 12.955/2026"
    );
  });

  it("bundle como string JSON (Lição #72) → parseia + Opção D detecta discretos", () => {
    const raw = JSON.stringify({ artigos_decreto: ["Art. 28", "Art. 37"] });
    expect(enrichArticle("Art. 31 LC 214/2025", raw, "lucro_real")).toBe(
      "Art. 31 LC 214/2025; Arts. 28, 37 Decreto 12.955/2026"
    );
  });

  // BUG-RAG-ARTIGO-RANGE — caso canônico 5370032
  it("BUG-RAG-ARTIGO-RANGE: bundle 5370032 [200, 201, 203, 245] → lista discreta (não range 200-245)", () => {
    const bundle = {
      artigos_decreto: ["Art. 200", "Art. 201", "Art. 203", "Art. 245"],
    };
    const out = enrichArticle("Art. 126 LC 214/2025", bundle, "lucro_presumido");
    // Output esperado contém lista por vírgulas — articleMatches NÃO aceita Art. 204
    expect(out).toBe(
      "Art. 126 LC 214/2025; Arts. 200, 201, 203, 245 Decreto 12.955/2026"
    );
    // Crítico: NÃO deve emitir o range "200-245" que causava falso positivo
    expect(out).not.toContain("200-245");
  });
});
