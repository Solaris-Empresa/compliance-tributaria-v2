/**
 * corpus-chunker.test.ts — BUG-IBS-00-FIX-A
 *
 * Reproduz o bug do chunk "culo" (Art. 259 parte 2, 4 chars): splitChunks cortava no
 * meio da palavra (cut rígido em MAX_CHUNK_CHARS) e empurrava o fragmento minúsculo
 * restante como chunk próprio. Fix: partição em fronteira de palavra/sentença + merge
 * de fragmento final pequeno. validateChunkBeforeInsert exige conteudo >= 10 chars.
 */
import { describe, it, expect } from "vitest";
import { splitChunks } from "./corpus-chunker";

/** Corpo > MAX_CHUNK_CHARS (2000), SEM quebra natural (sem ". " nem "\n\n"),
 *  com palavras distintas — força o caminho de fallback que gerava o "culo". */
const WORDS = Array.from({ length: 400 }, (_, i) => `palavra${i}`); // ~4000+ chars
const BODY_NO_BREAKS = WORDS.join(" ");

describe("splitChunks — BUG-IBS-00 (fronteira de palavra, sem fragmento minúsculo)", () => {
  const chunks = splitChunks(259, BODY_NO_BREAKS);

  it("divide em >1 parte (corpo > 2000 chars)", () => {
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("nenhum chunk com conteudo < 10 chars (regra do validateChunkBeforeInsert / fim do 'culo')", () => {
    for (const c of chunks) {
      expect(c.conteudo.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("NUNCA corta no meio de palavra: todo token de todo chunk é uma palavra original", () => {
    const allowed = new Set(WORDS);
    for (const c of chunks) {
      for (const tok of c.conteudo.split(/\s+/).filter(Boolean)) {
        expect(allowed.has(tok)).toBe(true); // 'palavra50' inteiro; nunca 'palavra5'+'0'
      }
    }
  });

  it("reconstrói o corpo sem perder nem duplicar palavras", () => {
    const tokens = chunks.flatMap((c) => c.conteudo.split(/\s+/).filter(Boolean));
    expect(tokens).toEqual(WORDS);
  });
});

describe("splitChunks — casos de borda", () => {
  it("corpo curto (<= 2000) → 1 chunk, chunkIndex 0", () => {
    const r = splitChunks(1, "Art. 1. Texto curto.");
    expect(r).toHaveLength(1);
    expect(r[0].chunkIndex).toBe(0);
    expect(r[0].artigo).toBe("Art. 1");
  });

  it("fragmento final minúsculo é mesclado (não vira chunk < 10 chars)", () => {
    // corpo = ~2000 chars de palavras + um 'tail' minúsculo sem quebra natural
    const body = "x".repeat(1999) + " ab";
    const r = splitChunks(7, body);
    for (const c of r) expect(c.conteudo.length).toBeGreaterThanOrEqual(10);
  });

  it("preserva quebra de parágrafo quando disponível", () => {
    const p1 = "a".repeat(1600);
    const p2 = "b".repeat(1600);
    const r = splitChunks(9, `${p1}\n\n${p2}`);
    expect(r.length).toBe(2);
    expect(r[0].conteudo).toContain("a");
    expect(r[1].conteudo).toContain("b");
  });
});
