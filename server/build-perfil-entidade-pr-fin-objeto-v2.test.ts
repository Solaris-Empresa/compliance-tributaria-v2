/**
 * build-perfil-entidade-pr-fin-objeto-v2.test.ts — PR-FIN-OBJETO-V2 regression
 *
 * Contexto: Pós-PR-FIN-OBJETO #885, gap residual: cliente financeiro SEM NBS
 * (nbss=[]) ainda gerava status="inconsistente" porque:
 *   1. deriveObjetoForSeed loop nunca chamava deriveObjetoFromNbs (loop não itera)
 *      → objeto=[] → V-LC-202 HARD_BLOCK
 *   2. computeMissingRequiredFields adicionava "nbss_principais" ao missing
 *      → computeStatus força status="inconsistente" mesmo após Mudança 1
 *
 * V2 implementa AMBAS mudanças em buildPerfilEntidade.ts:
 *   Mudança 1: deriveObjetoForSeed default fallback quando nbss=[] e financeiro
 *   Mudança 2: computeMissingRequiredFields exemption para nbss em financeiro
 *
 * Pré-análise V2: ZERO cenários da suite oficial afetados (rules_hash byte-a-byte).
 *
 * Cobertura end-to-end via buildSnapshot:
 *   T71 — financeiro + nbss=[] → objeto=["servico_financeiro"] + V-10-FALLBACK-REGULATED-NO-NBS
 *   T72 — financeiro + nbss=[] → missing_required_fields=[] (sem nbss_principais)
 *   T73 — regressão: servicos genérico + nbss=[] → ainda inclui nbss_principais (status=inconsistente)
 *   T74 — fluxo completo: financeiro + nbss=[] → status="confirmado" CTA habilitável
 *   T75 — regressão: financeiro com NBS canonical (1.0901.33.00) → comportamento path determinístico
 *
 * Refs: PR #870, PR #871, PR #880, PR #884, PR #885, Smoke R3-A 2026-04-30 Cenário 6.
 */
import { describe, it, expect } from "vitest";
import { buildSnapshot } from "./lib/archetype/buildSnapshot";
import type { Seed } from "./lib/archetype/types";

const FIXED_DV = "2026-04-24T12:00:00.000Z";

/**
 * Fixture base — banco múltiplo (S18 / S60 padrão).
 * Subnatureza="financeiro" + setor_regulado=true + papel="operadora_regulada".
 */
function makeSeedFinanceiro(overrides: Partial<Seed> = {}): Seed {
  return {
    descricao_negocio_livre: "banco multiplo (BCB-regulado)",
    natureza_operacao_principal: ["Financeiro"],
    operacoes_secundarias: [],
    fontes_receita: ["Prestacao de servico"],
    tipo_objeto_economico: ["Servicos"],
    posicao_na_cadeia_economica: "Operadora",
    cnae_principal_confirmado: "6422-1/00",
    nbss_principais: [],
    abrangencia_operacional: ["Nacional"],
    opera_multiplos_estados: true,
    uf_principal_operacao: "SP",
    possui_filial_outra_uf: false,
    regime_tributario_atual: "Lucro Real",
    porte_empresa: "Grande",
    setor_regulado: true,
    orgao_regulador_principal: ["BCB"],
    subnatureza_setorial: ["financeiro"],
    tipo_operacao_especifica: ["Operacoes bancarias"],
    papel_operacional_especifico: ["Operadora"],
    atua_importacao: false,
    atua_exportacao: false,
    opera_territorio_incentivado: false,
    possui_regime_especial_negocio: true,
    tipo_regime_especial: ["Financeiro"],
    integra_grupo_economico: false,
    analise_1_cnpj_operacional: true,
    nivel_analise: "CNPJ operacional unico",
    ncms_principais: [],
    papel_comercio_exterior: [],
    tipo_territorio_incentivado: [],
    user_confirmed: true,
    ...overrides,
  } as Seed;
}

/**
 * Fixture serviço genérico (não-regulado) — para regressão T73.
 */
function makeSeedServicoGenerico(overrides: Partial<Seed> = {}): Seed {
  return {
    descricao_negocio_livre: "servico generico nao-regulado",
    natureza_operacao_principal: ["Prestacao de servico"],
    operacoes_secundarias: [],
    fontes_receita: ["Prestacao de servico"],
    tipo_objeto_economico: ["Servicos"],
    posicao_na_cadeia_economica: "Prestador de servico",
    cnae_principal_confirmado: "6201-5/01",
    nbss_principais: [],
    abrangencia_operacional: ["Nacional"],
    opera_multiplos_estados: false,
    uf_principal_operacao: "SP",
    possui_filial_outra_uf: false,
    regime_tributario_atual: "Lucro Presumido",
    porte_empresa: "Media",
    setor_regulado: false,
    orgao_regulador_principal: [],
    subnatureza_setorial: [],
    tipo_operacao_especifica: [],
    papel_operacional_especifico: [],
    atua_importacao: false,
    atua_exportacao: false,
    opera_territorio_incentivado: false,
    possui_regime_especial_negocio: false,
    tipo_regime_especial: [],
    integra_grupo_economico: false,
    analise_1_cnpj_operacional: true,
    nivel_analise: "CNPJ operacional unico",
    ncms_principais: [],
    papel_comercio_exterior: [],
    tipo_territorio_incentivado: [],
    user_confirmed: true,
    ...overrides,
  } as Seed;
}

describe("PR-FIN-OBJETO-V2 — financeiro sem NBS via deriveObjetoForSeed default + missing exemption", () => {
  it("T71: financeiro + nbss=[] → objeto=['servico_financeiro'] + V-10-FALLBACK-REGULATED-NO-NBS INFO", () => {
    const seed = makeSeedFinanceiro({ nbss_principais: [] });
    const out = buildSnapshot(seed, FIXED_DV);

    expect(out.perfil.objeto).toEqual(["servico_financeiro"]);
    expect(
      out.blockers_triggered.find((b) => b.id === "V-10-FALLBACK-REGULATED-NO-NBS"),
    ).toBeDefined();
    expect(
      out.blockers_triggered.find((b) => b.id === "V-10-FALLBACK-REGULATED-NO-NBS")
        ?.severity,
    ).toBe("INFO");
  });

  it("T72: financeiro + nbss=[] → missing_required_fields NÃO inclui nbss_principais (Mudança 2 isenção)", () => {
    const seed = makeSeedFinanceiro({ nbss_principais: [] });
    const out = buildSnapshot(seed, FIXED_DV);

    expect(
      out.missing_required_fields.find((f) => f.includes("nbss_principais")),
    ).toBeUndefined();
  });

  it("T73: regressão — servico genérico + nbss=[] → AINDA inclui nbss_principais (não-financeiro mantém missing)", () => {
    const seed = makeSeedServicoGenerico({ nbss_principais: [] });
    const out = buildSnapshot(seed, FIXED_DV);

    expect(
      out.missing_required_fields.some((f) => f.includes("nbss_principais")),
    ).toBe(true);
    // status="inconsistente" porque tem missing field (regressão preservada)
    expect(out.perfil.status_arquetipo).toBe("inconsistente");
  });

  it("T74: fluxo end-to-end — financeiro + nbss=[] → status='confirmado' CTA habilitável + V-LC-202 não dispara", () => {
    const seed = makeSeedFinanceiro({ nbss_principais: [] });
    const out = buildSnapshot(seed, FIXED_DV);

    expect(out.perfil.objeto).toEqual(["servico_financeiro"]);
    expect(out.perfil.papel_na_cadeia).toBe("operadora_regulada");
    expect(out.perfil.status_arquetipo).toBe("confirmado");
    expect(
      out.blockers_triggered.find((b) => b.id === "V-LC-202"),
    ).toBeUndefined();
    expect(
      out.blockers_triggered.find((b) => b.id === "V-10-FALLBACK-REGULATED-NO-NBS"),
    ).toBeDefined();
    expect(out.missing_required_fields).toEqual([]);
  });

  it("T75: regressão — financeiro COM NBS canonical (1.0901.33.00) → path determinístico, sem V-10-FALLBACK-REGULATED-NO-NBS", () => {
    const seed = makeSeedFinanceiro({ nbss_principais: ["1.0901.33.00"] });
    const out = buildSnapshot(seed, FIXED_DV);

    expect(out.perfil.objeto).toEqual(["servico_financeiro"]);
    expect(out.perfil.status_arquetipo).toBe("confirmado");
    // V2 fallback NÃO dispara (path determinístico via deriveObjetoFromNbs com NBS mapeado)
    expect(
      out.blockers_triggered.find((b) => b.id === "V-10-FALLBACK-REGULATED-NO-NBS"),
    ).toBeUndefined();
  });
});
