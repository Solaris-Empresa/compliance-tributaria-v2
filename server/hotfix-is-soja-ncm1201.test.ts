/**
 * Hotfix P0 — IS indevido na soja
 *
 * Bug: Project 3020 (Produtor Rural Soja Cerrado, NCM 1201.90.00, regime
 * Lucro Presumido) recebia operationType=industria via fallback (NCM não
 * mapeado), e isCategoryAllowed("imposto_seletivo", "industria") = ALLOWED,
 * fazendo passar IS indevido sobre soja em grão.
 *
 * Causa raiz documentada (ADR-0030 v1.1 §LIM-1, §LIM-5):
 * - Gate IS depende de operationType correto
 * - operationType depende de objeto correto (R-01: AGRO_OBJECTS → agronegocio)
 * - objeto depende de NCM mapeado no dataset + tupla em REGIME_TUPLE_TO_OBJETO_NCM
 * - NCM 1201 não estava no dataset → fallback objeto=bens_mercadoria_geral → optype=industria
 *
 * Fix:
 * - Adicionar NCM 1201.90.00 ao ncm-dataset.json com regime=aliquota_zero, IS=false
 * - Adicionar tupla "aliquota_zero|false|12" → "agricola" em REGIME_TUPLE_TO_OBJETO_NCM
 *
 * Base normativa:
 * - LC 214/2025 Art. 128 I (Anexo I — cesta básica nacional ampliada)
 * - EC 132/2023 Art. 153 VIII (IS não incide sobre commodities agrícolas)
 *
 * Saneamento corpus RAG (cnaeGroups dos 7 chunks agro) é PR separado —
 * data-quality, não código.
 */

import { describe, it, expect } from "vitest";
import { buildSnapshot } from "./lib/archetype/buildSnapshot";
import { isCategoryAllowed } from "./lib/risk-eligibility";
import type { Seed } from "./lib/archetype/types";

const FIXED_DATA_VERSION = "2026-04-28T12:00:00.000Z";

const SEED_BASE = {
  operacoes_secundarias: [],
  abrangencia_operacional: ["Nacional"],
  opera_multiplos_estados: true,
  uf_principal_operacao: "SP",
  possui_filial_outra_uf: false,
  estrutura_operacao: "matriz_unica",
  atua_importacao: false,
  atua_exportacao: false,
  papel_comercio_exterior: [],
  opera_territorio_incentivado: false,
  tipo_territorio_incentivado: [],
  possui_regime_especial_negocio: false,
  tipo_regime_especial: [],
  porte_empresa: "medio",
  tipo_operacao_especifica: [],
  papel_operacional_especifico: [],
  atua_como_marketplace_plataforma: false,
  integra_grupo_economico: false,
  analise_1_cnpj_operacional: true,
  user_confirmed: false,
} as const;

describe("Hotfix P0 — IS indevido na soja (NCM 1201.90.00)", () => {
  it("Project 3020 — Produtor Rural Soja: deriva objeto=agricola, optype=agronegocio, IS bloqueado", () => {
    const seed: Seed = {
      ...SEED_BASE,
      descricao_negocio_livre: "Produtor rural de soja no cerrado",
      posicao_na_cadeia_economica: "Produtor/fabricante",
      natureza_operacao_principal: ["Producao propria", "Comercio"],
      fontes_receita: ["Producao propria", "Venda de mercadoria"],
      tipo_objeto_economico: ["Bens/mercadorias", "Agricola"],
      ncms_principais: ["1201.90.00"],
      nbss_principais: [],
      cnae_principal_confirmado: "0115-6/00",
      regime_tributario_atual: "Lucro Presumido",
      setor_regulado: false,
      subnatureza_setorial: [],
      orgao_regulador_principal: [],
    };

    const result = buildSnapshot(seed, FIXED_DATA_VERSION);

    // Arquétipo deriva agronegocio
    expect(result.perfil.objeto).toContain("agricola");
    expect(result.perfil.derived_legacy_operation_type).toBe("agronegocio");

    // Sem fallback no NCM 1201 (era 1 antes do hotfix)
    const fallbacks = result.blockers_triggered.filter((b) => b.id === "V-10-FALLBACK");
    expect(fallbacks).toHaveLength(0);

    // Status pendente (aguarda confirm), test PASS
    expect(result.perfil.status_arquetipo).toBe("pendente");
    expect(result.test_status).toBe("PASS");

    // Gate IS: agronegocio NÃO ELEGÍVEL (ADR-0030 v1.1 D-6)
    const elig = isCategoryAllowed("imposto_seletivo", "agronegocio");
    expect(elig.allowed).toBe(false);
    // M3.8-3 (PR #970): downgrade_to mudou de "enquadramento_geral" → "unmapped"
    expect(elig.final).toBe("unmapped");
    expect(elig.reason).toBe("sujeito_passivo_incompativel");

    // rules_hash inalterado (manifesto m1-v1.0.0 não muda com dataset)
    expect(result.perfil.rules_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("Project 3015 — Transportadora (regression): permanece operationType=servicos, IS bloqueado", () => {
    const seed: Seed = {
      ...SEED_BASE,
      descricao_negocio_livre: "Transportadora de combustíveis perigosos",
      posicao_na_cadeia_economica: "Prestador de servico",
      natureza_operacao_principal: ["Transporte"],
      fontes_receita: ["Prestacao de servico"],
      tipo_objeto_economico: ["Servicos"],
      ncms_principais: ["4930-2/02"],
      nbss_principais: ["1.0501.14.51"],
      cnae_principal_confirmado: "4930-2/02",
      regime_tributario_atual: "Lucro Real",
      setor_regulado: true,
      subnatureza_setorial: ["transporte", "combustiveis"],
      orgao_regulador_principal: ["ANTT", "ANP"],
    };

    const result = buildSnapshot(seed, FIXED_DATA_VERSION);

    // Sem regressão: papel=prestador, optype=servicos
    expect(result.perfil.papel_na_cadeia).toBe("prestador");
    expect(result.perfil.derived_legacy_operation_type).toBe("servicos");

    // Gate IS continua bloqueado para servicos (Hotfix v1.2 inalterado)
    const elig = isCategoryAllowed("imposto_seletivo", "servicos");
    expect(elig.allowed).toBe(false);
    // M3.8-3 (PR #970): downgrade_to mudou de "enquadramento_geral" → "unmapped"
    expect(elig.final).toBe("unmapped");
  });

  it("Tupla aliquota_zero|false|12 → agricola: regra determinística sem fallback", () => {
    // Seed mínimo com NCM 1201 isolado
    const seed: Seed = {
      ...SEED_BASE,
      descricao_negocio_livre: "Teste isolado tupla soja",
      posicao_na_cadeia_economica: "Produtor/fabricante",
      natureza_operacao_principal: ["Producao propria"],
      fontes_receita: ["Producao propria"],
      tipo_objeto_economico: ["Bens/mercadorias"],
      ncms_principais: ["1201.90.00"],
      nbss_principais: [],
      cnae_principal_confirmado: "0115-6/00",
      regime_tributario_atual: "Lucro Presumido",
      setor_regulado: false,
      subnatureza_setorial: [],
      orgao_regulador_principal: [],
    };

    const result = buildSnapshot(seed, FIXED_DATA_VERSION);

    // NCM 1201 mapeia deterministicamente para agricola (Classe 1, tupla)
    expect(result.perfil.objeto).toEqual(["agricola"]);

    // Zero blockers — derivação perfeita
    expect(result.blockers_triggered).toHaveLength(0);
    expect(result.missing_required_fields).toHaveLength(0);
  });
});
