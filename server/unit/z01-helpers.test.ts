/**
 * z01-helpers.test.ts — Sprint Z Z-01 · 22 Casos de Validação
 * Bloco D — Helpers isolados de tracked-question.ts (D-01 a D-05)
 * DEC-M3-05 v3 · ADR-0009
 *
 * Casos:
 *   D-01: inferCategoria com imposto seletivo
 *   D-02: inferCategoria com alíquota zero
 *   D-03: extractLeiRef com artigo + lei presentes
 *   D-04: extractLeiRef fallback quando lei ausente
 *   D-05: deduplicateById remove duplicata
 */
import { describe, it, expect } from "vitest";
import {
  inferCategoria,
  extractLeiRef,
  deduplicateById,
  type TrackedQuestion,
} from "../lib/tracked-question";

describe("Z-01 · Bloco D — Helpers isolados (tracked-question.ts)", () => {
  // ─── D-01: inferCategoria com imposto seletivo ────────────────────────────
  it("D-01: inferCategoria com imposto seletivo", () => {
    expect(inferCategoria({ anchor_id: "x", conteudo: "",
      topicos: "imposto seletivo bebidas" })).toBe("imposto_seletivo");
  });

  // ─── D-02: inferCategoria com alíquota zero ───────────────────────────────
  it("D-02: inferCategoria com alíquota zero", () => {
    expect(inferCategoria({ anchor_id: "x", conteudo: "",
      topicos: "aliquota zero alimentos" })).toBe("aliquota_zero");
  });

  // ─── D-03: extractLeiRef com artigo + lei presentes ──────────────────────
  it("D-03: extractLeiRef com artigo + lei presentes", () => {
    const r1 = extractLeiRef({ anchor_id: "x", conteudo: "",
      artigo: "Art. 14", lei: "lc214" });
    expect(r1).toContain("Art. 14");
    expect(r1.length).toBeGreaterThan(0);
  });

  // ─── D-04: extractLeiRef fallback quando lei ausente ─────────────────────
  it("D-04: extractLeiRef fallback quando lei ausente", () => {
    const r2 = extractLeiRef({ anchor_id: "x", conteudo: "",
      artigo: undefined, lei: undefined });
    expect(r2).toBe("LC 214/2025 (genérico)");
    expect(r2).toBeTruthy();
  });

  // ─── D-05: deduplicateById remove duplicata ───────────────────────────────
  it("D-05: deduplicateById remove duplicata", () => {
    const input: TrackedQuestion[] = [
      { id: "x", fonte: "rag" as const, fonte_ref: "a", lei_ref: "b",
        texto: "t", categoria: "c", confidence: 0.9 },
      { id: "x", fonte: "rag" as const, fonte_ref: "a", lei_ref: "b",
        texto: "t", categoria: "c", confidence: 0.9 }, // duplicata
      { id: "y", fonte: "rag" as const, fonte_ref: "c", lei_ref: "d",
        texto: "u", categoria: "c", confidence: 0.8 },
    ];
    const deduped = deduplicateById(input);
    expect(deduped.length).toBe(2);
    expect(deduped.filter(q => q.id === "x").length).toBe(1);
  });
});
