import { describe, it, expect } from "vitest";
import { normalizeArticleLayout } from "./corpus-normalize";

// Regex real do engine (scripts/lib/corpus-chunker.ts:41) — NÃO alterado nesta
// missão (REGRA-ORQ-20/34). O teste prova que a saída normalizada CASA com ele.
const ARTIGO_START_RE = /^Art\.\s+(\d+)\s*(º|\.)?\s+/;

describe("normalizeArticleLayout", () => {
  it("de-indenta linha de artigo e converte ordinal ASCII (lc123)", () => {
    const raw = "       Art. 1o Esta Lei Complementar estabelece normas";
    const out = normalizeArticleLayout(raw);
    expect(out).toBe("Art. 1º Esta Lei Complementar estabelece normas");
    expect(ARTIGO_START_RE.test(out)).toBe(true);
    expect(ARTIGO_START_RE.exec(out)![1]).toBe("1");
  });

  it("de-indenta linha de artigo que já usa º (resolucao_cgsn_140)", () => {
    const raw = "          Art. 2º Para fins desta Resolução, considera-se:";
    const out = normalizeArticleLayout(raw);
    expect(out).toBe("Art. 2º Para fins desta Resolução, considera-se:");
    expect(ARTIGO_START_RE.test(out)).toBe(true);
  });

  it("NÃO altera linha de artigo já limpa (regressão decreto12955 — ref que funciona)", () => {
    const raw = "Art. 1º  A Contribuição Social sobre Bens e Serviços";
    const out = normalizeArticleLayout(raw);
    expect(out).toBe(raw); // byte-idêntico → 3 corpora em produção intactos
    expect(ARTIGO_START_RE.test(out)).toBe(true);
  });

  it("preserva byte-a-byte linhas que não são início de artigo", () => {
    const raw = [
      "10/07/2024, 10:17                       Lcp 123",
      "        I - à apuração e recolhimento dos impostos",
      "  CAPÍTULO I",
      "  o art. 5º desta Lei (referência interna, não início)",
    ].join("\n");
    expect(normalizeArticleLayout(raw)).toBe(raw);
  });

  it("NÃO converte sub-artigo Art. 3o-A (— após número não é espaço)", () => {
    // Comportamento idêntico ao engine para entradas limpas — fora de escopo.
    const raw = "        Art. 3o-A. Aplica-se ao produtor rural";
    const out = normalizeArticleLayout(raw);
    expect(out).toBe("Art. 3o-A. Aplica-se ao produtor rural"); // só de-indenta
    expect(ARTIGO_START_RE.test(out)).toBe(false);
  });

  it("é idempotente (normalizar 2x = normalizar 1x)", () => {
    const raw = "     Art. 5o Os órgãos e entidades envolvidos";
    const once = normalizeArticleLayout(raw);
    expect(normalizeArticleLayout(once)).toBe(once);
  });

  it("preserva o corpo multi-linha do artigo (sem fundir/perder linhas)", () => {
    const raw = [
      "   Art. 1o Caput do artigo",
      "   I - inciso um",
      "   II - inciso dois",
    ].join("\n");
    const out = normalizeArticleLayout(raw).split("\n");
    expect(out[0]).toBe("Art. 1º Caput do artigo");
    expect(out[1]).toBe("   I - inciso um"); // corpo intacto
    expect(out[2]).toBe("   II - inciso dois");
  });
});
