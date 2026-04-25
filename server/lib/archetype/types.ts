/**
 * types.ts — Tipos do modelo dimensional M1
 *
 * Fonte canônica: SPEC-RUNNER-RODADA-D.md §1.3, §6.1, §4.7 + contratos ADR-0031/0032
 * Referências cruzadas: CONTRATOS-ENTRE-MILESTONES.md §1 (Arquetipo schema v1.0.0)
 *
 * Regras:
 * - Zero tipo `any`
 * - Arrays tipados com unions fechadas dos enums (enums.ts)
 * - Imutabilidade a nível de API (readonly onde aplicável)
 */

import type {
  BlockerSeverity,
  Objeto,
  OperationType,
  PapelNaCadeia,
  Regime,
  StatusArquetipo,
  SubnaturezaSetorial,
  TestStatus,
  TipoDeRelacao,
  Territorio,
} from "./enums";

// ─── Seed v3 (input do runner) — SPEC-RUNNER §1.1 + §1.5 ───────────────────

/**
 * Seed v3 — input do runner com CNAEs JÁ CONFIRMADOS upstream.
 * Decisão Q-D4/Q-D3/Q-C1: arrays são obrigatórios onde aplicável;
 * user_confirmed é flag de teste determinístico.
 */
export interface Seed {
  readonly descricao_negocio_livre?: string;

  // Core dimensional (inputs para derivação das 5 dimensões)
  readonly natureza_operacao_principal: readonly string[];
  readonly operacoes_secundarias: readonly string[];
  readonly fontes_receita: readonly string[];
  readonly tipo_objeto_economico: readonly string[];
  readonly posicao_na_cadeia_economica: string;
  readonly cnae_principal_confirmado?: string;

  // Objetos (NCM/NBS — consumidos por deriveObjeto.ts)
  readonly ncms_principais: readonly string[];
  readonly nbss_principais: readonly string[];

  // Território (Q-D2)
  readonly abrangencia_operacional: readonly string[];
  readonly opera_multiplos_estados: boolean;
  readonly uf_principal_operacao?: string;
  readonly possui_filial_outra_uf?: boolean;
  readonly estrutura_operacao?: string;
  readonly atua_importacao: boolean;
  readonly atua_exportacao: boolean;
  readonly papel_comercio_exterior: readonly string[];
  readonly opera_territorio_incentivado: boolean;
  readonly tipo_territorio_incentivado: readonly string[];

  // Regime
  readonly regime_tributario_atual: string;
  readonly possui_regime_especial_negocio: boolean;
  readonly tipo_regime_especial: readonly string[];
  readonly porte_empresa?: string;

  // Contextuais — Q-D4 (array) + Q-D3 (array)
  readonly setor_regulado: boolean;
  readonly orgao_regulador_principal: readonly string[];
  readonly subnatureza_setorial: readonly string[];
  readonly tipo_operacao_especifica: readonly string[];
  readonly papel_operacional_especifico: readonly string[];

  // Marketplace (Q-3)
  readonly atua_como_marketplace_plataforma?: boolean;

  // Multi-CNPJ (Q-4)
  readonly integra_grupo_economico: boolean;
  readonly analise_1_cnpj_operacional: boolean;
  readonly nivel_analise?: string;

  // Flag de confirmação (Q-C1)
  readonly user_confirmed: boolean;

  // Outros campos opcionais observados na suite v2
  readonly realiza_operacao_propria_terceiros?: string;
}

// ─── Arquétipo (output) — SPEC-RUNNER §6.1 snapshot shape ──────────────────

export interface PerfilDimensional {
  // 5 dimensões canônicas (ADR-0031)
  readonly objeto: readonly Objeto[];
  readonly papel_na_cadeia: PapelNaCadeia;
  readonly tipo_de_relacao: readonly TipoDeRelacao[];
  readonly territorio: readonly Territorio[];
  readonly regime: Regime;

  // Contextuais (Q-D4 + Q-D3)
  readonly subnatureza_setorial: readonly SubnaturezaSetorial[];
  readonly orgao_regulador: readonly string[];
  readonly regime_especifico: readonly string[];

  // Campo derivado legado (Q-2 Opção A)
  readonly derived_legacy_operation_type: OperationType | null;

  // Metadata imutabilidade ADR-0032 §2
  readonly status_arquetipo: StatusArquetipo;
  readonly motivo_bloqueio: string | null;
  readonly model_version: string;
  readonly data_version: string;
  readonly perfil_hash: string;
  readonly rules_hash: string;
  readonly imutavel: true;
}

// ─── Blocker — SPEC-RUNNER §7.2 + LOGICAL-CONFLICTS §4-§9 ──────────────────

export interface Blocker {
  readonly id: string;
  readonly severity: BlockerSeverity;
  readonly rule: string;
}

// ─── AmbiguityError — DERIVATION-OPERATIONTYPE §4.1 ────────────────────────

/**
 * Lançada por funções de derivação quando o input não permite
 * decisão determinística. Regra 2 da SPEC-RUNNER §4.2.1:
 * AmbiguityError → status_arquetipo = "inconsistente".
 */
export class AmbiguityError extends Error {
  constructor(
    public readonly blocker_id: string,
    public readonly reason: string,
    public readonly matched_rules: readonly string[] = [],
  ) {
    super(`[${blocker_id}] ${reason}`);
    this.name = "AmbiguityError";
  }
}

// ─── Resultado de build (output orquestrador) ──────────────────────────────

/**
 * Output de `buildPerfilEntidade(seed)`. Contém o arquétipo + blockers +
 * campos faltantes detectados. Não inclui hashes (computados em fase separada).
 */
export interface BuildResult {
  readonly arquetipo_partial: {
    readonly objeto: readonly Objeto[];
    readonly papel_na_cadeia: PapelNaCadeia;
    readonly tipo_de_relacao: readonly TipoDeRelacao[];
    readonly territorio: readonly Territorio[];
    readonly regime: Regime;
    readonly subnatureza_setorial: readonly SubnaturezaSetorial[];
    readonly orgao_regulador: readonly string[];
    readonly regime_especifico: readonly string[];
    readonly derived_legacy_operation_type: OperationType | null;
  };
  readonly status_arquetipo: StatusArquetipo;
  readonly motivo_bloqueio: string | null;
  readonly blockers_triggered: readonly Blocker[];
  readonly missing_required_fields: readonly string[];
  readonly test_status: TestStatus;
}

// ─── Resultado por-dimensão (intermediário) ────────────────────────────────

export interface DeriveObjetoResult {
  readonly objeto: Objeto;
  readonly blocker: Blocker | null;
}
