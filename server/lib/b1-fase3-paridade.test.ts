import { describe, it, expect } from "vitest";
import { matchMapRows, type CnaeCatMapRow } from "./normative-inference";

// B1 Fase 3 (#1663) — gate de paridade data-driven == hardcoded (T1/T2/T3).
// Nível unitário (Lição #157: matchMapRows pura). A paridade RUNTIME (flag ON==OFF
// no risks_v4) é a smoke SQL do Manus. Reproduz o seed da migration 0130.

function r(
  cnae_prefix: string,
  categoria: string,
  match_mode: "prefix" | "exact" = "prefix",
): CnaeCatMapRow {
  return {
    cnae_prefix, match_mode, categoria_codigo: categoria,
    condicional: 0, confidence: 0.85, titulo_template: null, nota: null,
    regime_scope: "exceto_simples_nacional",
  };
}

// 9 categorias de construção civil (universais + condicionais).
const CONSTRUCAO = [
  "risco_credito_condicionado_obra", "risco_redutor_ajuste", "risco_sinter_avaliacao",
  "risco_cib_cadastro", "risco_controle_empreendimento", "risco_permuta_imoveis",
  "risco_tributacao_parcelas", "risco_sujeicao_passiva_scp", "risco_custos_historicos",
];

// FULL_SEED = migration 0130 (43 linhas): construção 4×9 + regime imóveis 7.
const FULL_SEED: CnaeCatMapRow[] = [
  ...["41", "42", "43", "68"].flatMap((p) => CONSTRUCAO.map((c) => r(p, c))),
  ...["4120", "4110", "4121"].map((p) => r(p, "regime_especifico_imoveis")),
  r("6810-2/01", "regime_especifico_imoveis", "exact"),
  r("6821-8/01", "regime_especifico_imoveis", "exact"),
  r("6810-2/02", "regime_especifico_imoveis_locacao", "exact"),
  r("41", "risco_art_269_270"),
];

// Categorias que o HARDCODED (flag OFF) gera para CNAE 4120 (construção + regime):
// 9 construção + regime_especifico_imoveis (prefix 4120) + risco_art_269_270 (prefix 41).
const HARDCODED_4120 = [...CONSTRUCAO, "regime_especifico_imoveis", "risco_art_269_270"].sort();

describe("B1 Fase 3 — paridade (T1/T2/T3)", () => {
  it("T1 (positivo) — CNAE 4120: matchMapRows == categorias do hardcoded", () => {
    const cats = matchMapRows(["4120-4/00"], "lucro_real", FULL_SEED)
      .map((x) => x.categoria_codigo).sort();
    expect(cats).toEqual(HARDCODED_4120);
    expect(cats.length).toBe(11); // 9 construção + 2 regime (não "9" — 9 é a subseção construção)
  });

  it("T2 (negativo discriminante) — CNAE 4711 (não-construção): zero risco_* da tabela", () => {
    const cats = matchMapRows(["4711-3/01"], "lucro_real", FULL_SEED);
    expect(cats).toEqual([]);
  });

  it("T3 (data-driven) — novo setor por INSERT puro (zero código) gera risco", () => {
    // simula INSERT de um setor de saúde no map — sem tocar código
    const withNewSector = [...FULL_SEED, r("86", "risco_teste_setor_novo")];
    const cats = matchMapRows(["8610-1/01"], "lucro_real", withNewSector)
      .map((x) => x.categoria_codigo);
    expect(cats).toContain("risco_teste_setor_novo");
    // e o mesmo setor não aparece SEM o INSERT
    expect(matchMapRows(["8610-1/01"], "lucro_real", FULL_SEED)).toEqual([]);
  });

  it("Simples Nacional — regime_scope exclui tudo", () => {
    expect(matchMapRows(["4120-4/00"], "simples_nacional", FULL_SEED)).toEqual([]);
  });

  it("Locação (subclasse 6810-2/02) — casa regime_especifico_imoveis_locacao", () => {
    // CAVEAT paridade: hardcoded usa includes() para subclasses; seed usa exact.
    // Para o código-formato-padrão são equivalentes; a smoke do Manus confirma runtime.
    const cats = matchMapRows(["6810-2/02"], "lucro_real", FULL_SEED)
      .map((x) => x.categoria_codigo);
    expect(cats).toContain("regime_especifico_imoveis_locacao");
  });
});
