import { describe, it, expect } from "vitest";
import { matchMapRows, type CnaeCatMapRow } from "./normative-inference";

// B1 Fase 2 (#1663) — teste da função pura matchMapRows (Lição #157: sem DB).
// Cobre paridade do gate CNAE + regime_scope + dedup por categoria.

function row(
  cnae_prefix: string,
  categoria: string,
  match_mode: "prefix" | "exact" = "prefix",
  regime_scope: string | null = "exceto_simples_nacional",
): CnaeCatMapRow {
  return {
    cnae_prefix, match_mode, categoria_codigo: categoria,
    condicional: 0, confidence: 0.85, titulo_template: null, nota: null, regime_scope,
  };
}

const SEED: CnaeCatMapRow[] = [
  row("41", "risco_redutor_ajuste"), row("42", "risco_redutor_ajuste"),
  row("43", "risco_redutor_ajuste"), row("68", "risco_redutor_ajuste"),
  row("41", "risco_art_269_270"),
  row("4120", "regime_especifico_imoveis"),
  row("6810-2/02", "regime_especifico_imoveis_locacao", "exact"),
];

describe("B1 Fase 2 — matchMapRows (paridade pura)", () => {
  it("CNAE 4120 (construção) casa construção (41) + regime (4120) — dedup por categoria", () => {
    const cats = matchMapRows(["4120-4/00"], "lucro_real", SEED)
      .map((r) => r.categoria_codigo).sort();
    expect(cats).toEqual([
      "regime_especifico_imoveis", "risco_art_269_270", "risco_redutor_ajuste",
    ]);
    // risco_redutor_ajuste casa por 41 — 1 só, apesar das 4 linhas de prefixo (dedup)
    expect(cats.filter((c) => c === "risco_redutor_ajuste").length).toBe(1);
  });

  it("CNAE 4711 (não-construção) não casa nada", () => {
    expect(matchMapRows(["4711-3/01"], "lucro_real", SEED)).toEqual([]);
  });

  it("Simples Nacional exclui regime_scope=exceto_simples_nacional", () => {
    expect(matchMapRows(["4120-4/00"], "simples_nacional", SEED)).toEqual([]);
  });

  it("match_mode exact não casa por prefixo", () => {
    const cats = matchMapRows(["6810-2/01"], "lucro_real", SEED).map((r) => r.categoria_codigo);
    expect(cats).not.toContain("regime_especifico_imoveis_locacao");
  });

  it("regime_scope NULL casa em qualquer regime (inclusive SN)", () => {
    const universal = [row("55", "cat_universal", "prefix", null)];
    expect(matchMapRows(["5510-8/01"], "simples_nacional", universal).length).toBe(1);
  });
});
