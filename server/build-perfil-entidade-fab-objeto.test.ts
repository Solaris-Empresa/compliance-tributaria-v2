/**
 * build-perfil-entidade-fab-objeto.test.ts — PR-FAB-OBJETO regression
 *
 * Contexto: Projeto 5910003 (industria, lucro_real, fabricante, NCM=[],
 * NBS=[]). V-LC-201 (papel=fabricante + objeto=[]) disparava HARD_BLOCK →
 * CTA "Confirmar Perfil da Entidade" desabilitado.
 *
 * Decisão P.O. 2026-05-13: papel=fabricante sem NCM/NBS NÃO deve bloquear
 * o gate. Adicionar fallback análogo ao financeiro existente (V-10-
 * FALLBACK-REGULATED-NO-NBS): objeto inferido como "bens_mercadoria_geral"
 * + V-10-FALLBACK-NO-NCM como INFO (não bloqueia).
 *
 * Cobertura:
 *   T-FAB-01 — fabricante + ncms=[] + nbss=[] → objeto=["bens_mercadoria_geral"] + INFO
 *   T-FAB-02 — regressão: fabricante + ncms=["0201.10.00"] → objeto derivado do NCM
 *   T-FAB-03 — regressão: financeiro + nbss=[] → objeto=["servico_financeiro"] (fallback intacto)
 *   T-FAB-04 — regressão: operadora_regulada sem servico_regulado → V-LC-202 ainda dispara
 *   T-FAB-05 — fluxo completo: status_arquetipo="confirmado" + V-LC-201 ausente
 */
import { describe, it, expect } from "vitest";
import { buildSnapshot } from "./lib/archetype/buildSnapshot";
import type { Seed } from "./lib/archetype/types";

const FIXED_DV = "2026-04-24T12:00:00.000Z";

/**
 * Fixture industria/fabricante — espelha buildSeedFromProject(operationType=industria,
 * lucro_real, sem NCM) após T41 derivar fontes_receita.
 */
function makeSeedFabricanteSemNcm(overrides: Partial<Seed> = {}): Seed {
  return {
    descricao_negocio_livre: "industria sem NCM declarado",
    natureza_operacao_principal: ["Produção própria"],
    operacoes_secundarias: [],
    fontes_receita: ["Producao propria"],
    tipo_objeto_economico: ["Bens/mercadorias"],
    posicao_na_cadeia_economica: "Produtor/fabricante",
    cnae_principal_confirmado: "1091-1/01",
    nbss_principais: [],
    abrangencia_operacional: ["Nacional"],
    opera_multiplos_estados: false,
    uf_principal_operacao: "SP",
    possui_filial_outra_uf: false,
    regime_tributario_atual: "Lucro Real",
    porte_empresa: "Grande",
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

/** Fixture financeiro — para regressão T-FAB-03. */
function makeSeedFinanceiroSemNbs(): Seed {
  return {
    descricao_negocio_livre: "banco multiplo",
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
  } as Seed;
}

/** Fixture operadora sem servico_regulado — para regressão T-FAB-04. */
function makeSeedOperadoraSemRegulado(): Seed {
  return {
    descricao_negocio_livre: "operadora regulada sem servico_regulado",
    natureza_operacao_principal: ["Prestação de serviço"],
    operacoes_secundarias: [],
    fontes_receita: ["Prestacao de servico"],
    tipo_objeto_economico: ["Servicos"],
    posicao_na_cadeia_economica: "Operadora",
    cnae_principal_confirmado: "6110-8/01",
    nbss_principais: [],
    abrangencia_operacional: ["Nacional"],
    opera_multiplos_estados: true,
    uf_principal_operacao: "SP",
    possui_filial_outra_uf: false,
    regime_tributario_atual: "Lucro Real",
    porte_empresa: "Grande",
    setor_regulado: true,
    orgao_regulador_principal: ["ANATEL"],
    subnatureza_setorial: ["telecomunicacoes"],
    tipo_operacao_especifica: [],
    papel_operacional_especifico: ["Operadora"],
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
  } as Seed;
}

describe("PR-FAB-OBJETO — fallback objeto para fabricante sem NCM", () => {
  it("T-FAB-01: fabricante + ncms=[] + nbss=[] → objeto=['bens_mercadoria_geral'] + V-10-FALLBACK-NO-NCM INFO", () => {
    const seed = makeSeedFabricanteSemNcm();
    const out = buildSnapshot(seed, FIXED_DV);

    expect(out.perfil.papel_na_cadeia).toBe("fabricante");
    expect(out.perfil.objeto).toEqual(["bens_mercadoria_geral"]);

    const fallback = out.blockers_triggered.find(
      (b) => b.id === "V-10-FALLBACK-NO-NCM",
    );
    expect(fallback).toBeDefined();
    expect(fallback?.severity).toBe("INFO");

    // V-LC-201 NÃO dispara (regra C2-01: papel=fabricante + objeto=[] vazio).
    const vlc201 = out.blockers_triggered.find((b) => b.id === "V-LC-201");
    expect(vlc201).toBeUndefined();
  });

  it("T-FAB-02: regressão — fabricante + ncms=['0201.10.00'] → objeto derivado do NCM, sem fallback", () => {
    const seed = makeSeedFabricanteSemNcm({
      ncms_principais: ["0201.10.00"],
    });
    const out = buildSnapshot(seed, FIXED_DV);

    // Sinal forte de regressão: caminho determinístico do NCM deve produzir
    // pelo menos 1 entrada em objeto SEM emitir V-10-FALLBACK-NO-NCM (mesmo
    // quando a canonical NCM→objeto resolve para "bens_mercadoria_geral" via
    // tabela determinística — esse é o caminho normal, não o fallback).
    expect(out.perfil.objeto.length).toBeGreaterThan(0);

    const fallback = out.blockers_triggered.find(
      (b) => b.id === "V-10-FALLBACK-NO-NCM",
    );
    expect(fallback).toBeUndefined();
  });

  it("T-FAB-03: regressão — financeiro + nbss=[] → objeto=['servico_financeiro'] (fallback existente intacto)", () => {
    const seed = makeSeedFinanceiroSemNbs();
    const out = buildSnapshot(seed, FIXED_DV);

    expect(out.perfil.objeto).toContain("servico_financeiro");

    const fallbackFin = out.blockers_triggered.find(
      (b) => b.id === "V-10-FALLBACK-REGULATED-NO-NBS",
    );
    expect(fallbackFin).toBeDefined();
    expect(fallbackFin?.severity).toBe("INFO");

    // Garantir que o novo fallback NÃO dispara (papel != fabricante).
    const fallbackFab = out.blockers_triggered.find(
      (b) => b.id === "V-10-FALLBACK-NO-NCM",
    );
    expect(fallbackFab).toBeUndefined();
  });

  it("T-FAB-04: regressão — operadora_regulada sem servico_regulado → V-LC-202 ainda dispara", () => {
    const seed = makeSeedOperadoraSemRegulado();
    const out = buildSnapshot(seed, FIXED_DV);

    expect(out.perfil.papel_na_cadeia).toBe("operadora_regulada");

    // V-LC-202 deve continuar disparando — objeto=[] + papel=operadora_regulada
    // sem servico_regulado/financeiro. Fallback novo é gated em posicao===
    // "Produtor/fabricante" (operadora não casa).
    const vlc202 = out.blockers_triggered.find((b) => b.id === "V-LC-202");
    expect(vlc202).toBeDefined();
    expect(vlc202?.severity).toBe("HARD_BLOCK");
  });

  it("T-FAB-05: fluxo completo — status_arquetipo='confirmado' + V-LC-201 ausente + score esperado", () => {
    const seed = makeSeedFabricanteSemNcm();
    const out = buildSnapshot(seed, FIXED_DV);

    // V-LC-201 NÃO está em blockers_triggered
    const vlc201 = out.blockers_triggered.find((b) => b.id === "V-LC-201");
    expect(vlc201).toBeUndefined();

    // Sem HARD_BLOCKs (V-10-FALLBACK-NO-NCM é INFO)
    const hardBlocks = out.blockers_triggered.filter(
      (b) => b.severity === "HARD_BLOCK",
    );
    expect(hardBlocks).toEqual([]);

    // missing_required_fields permanece vazio (NCM/NBS removidos pós #1018)
    expect(out.missing_required_fields).toEqual([]);

    // user_confirmed=true + zero HARD_BLOCK + zero missing → status="confirmado"
    expect(out.perfil.status_arquetipo).toBe("confirmado");
  });
});
