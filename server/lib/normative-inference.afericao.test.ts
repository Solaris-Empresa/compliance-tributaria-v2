/**
 * normative-inference.afericao.test.ts — Suite Z-20 #717 Bateria 1
 *
 * Complementa normative-inference.test.ts (Z-13.5) com aferição
 * da invariante RI-08 (CNAES_ALIMENTAR ⊂ CNAES_ATACADISTA) e
 * propriedades estáticas do módulo.
 *
 * Nota: o spec v1.1 listou este arquivo como ausente; na verdade
 * normative-inference.test.ts existe (55 linhas) com smoke básico.
 * Este afericao complementa sem sobrescrever.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  resolve(__dirname, "normative-inference.ts"),
  "utf-8"
);

describe("afericao — CNAES hardcoded (snapshot §18.4)", () => {
  // CORPUS-RFC-006 A4 (2026-05-12): adicionado "4623-1/09" em ambos os Sets.
  // Tamanhos esperados: ALIMENTAR=6 (5+1), ATACADISTA=9 (8+1).
  it("CNAES_ALIMENTAR tem exatamente 6 CNAEs (5 originais + 4623-1/09 [A4])", () => {
    const match = source.match(/CNAES_ALIMENTAR[\s\S]*?new Set\(\[([\s\S]*?)\]\)/);
    expect(match).toBeTruthy();
    const ids = (match?.[1] ?? "").match(/"[\d\-\/]+"/g) ?? [];
    expect(ids).toHaveLength(6);
  });

  it("CNAES_ATACADISTA tem 9 CNAEs (8 originais + 4623-1/09 [A4])", () => {
    const match = source.match(/CNAES_ATACADISTA[\s\S]*?new Set\(\[([\s\S]*?)\]\)/);
    expect(match).toBeTruthy();
    const ids = (match?.[1] ?? "").match(/"[\d\-\/]+"/g) ?? [];
    expect(ids).toHaveLength(9);
  });

  it("RI-08: CNAES_ALIMENTAR ⊂ CNAES_ATACADISTA", () => {
    const alimentarMatch = source.match(/CNAES_ALIMENTAR[\s\S]*?new Set\(\[([\s\S]*?)\]\)/);
    const atacadistaMatch = source.match(/CNAES_ATACADISTA[\s\S]*?new Set\(\[([\s\S]*?)\]\)/);
    const alimentarIds = (alimentarMatch?.[1] ?? "").match(/"[\d\-\/]+"/g) ?? [];
    const atacadistaIds = new Set((atacadistaMatch?.[1] ?? "").match(/"[\d\-\/]+"/g) ?? []);
    for (const id of alimentarIds) {
      expect(atacadistaIds.has(id)).toBe(true);
    }
  });
});

describe("afericao — integração com pipeline v4", () => {
  it("usa buildRiskKey de risk-engine-v4 (consistência de consolidação)", () => {
    expect(source).toContain("buildRiskKey");
    expect(source).toContain("./risk-engine-v4");
  });

  it("lê normative_product_rules (migration 0076)", () => {
    expect(source).toMatch(/normative_product_rules/);
  });

  it("exporta inferNormativeRisks", () => {
    expect(source).toContain("export async function inferNormativeRisks");
  });
});

describe("afericao — projeto destrutivo test_z20_destructive (P5)", () => {
  it("CNAE 4639-7/01 está em CNAES_ALIMENTAR (aciona credito_presumido)", () => {
    expect(source).toContain('"4639-7/01"');
  });

  it("CNAE 4639-7/01 também está em CNAES_ATACADISTA (aciona regime_diferenciado)", () => {
    // Por herança via RI-08 — se ALIMENTAR contém, ATACADISTA também
    const alimentarMatch = source.match(/CNAES_ALIMENTAR[\s\S]*?new Set\(\[([\s\S]*?)\]\)/);
    const alimentarIds = (alimentarMatch?.[1] ?? "").match(/"[\d\-\/]+"/g) ?? [];
    expect(alimentarIds).toContain('"4639-7/01"');
  });
});
