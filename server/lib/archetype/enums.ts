/**
 * enums.ts — Enum fechados do modelo dimensional M1
 *
 * Fonte canônica: CANONICAL-RULES-MANIFEST.md §3.3
 * Referências cruzadas: SPEC-RUNNER-RODADA-D.md §3.2-§3.6 + §4.1
 *
 * Regras (ADR-0031 Princípio 2 + 3):
 * - Todas as comparações usam igualdade estrita (`===` ou `.includes(x)`)
 * - PROIBIDO `contains()` / substring match / regex / LLM
 * - Política aditiva: novos valores sempre ao FINAL (preserva rules_hash)
 */

// ─── Dimensão objeto (14 valores) — ADR-0031 + Q-D1 ajuste 2026-04-24 ───────

export const OBJETO_ENUM = [
  "combustivel",
  "bebida",
  "tabaco",
  "alimento",
  "medicamento",
  "energia_eletrica",
  "servico_financeiro",
  "servico_digital",
  "servico_regulado",
  "bens_industrializados",
  "bens_mercadoria_geral",
  "servico_geral",
  "agricola",
  "pecuario",
] as const;
export type Objeto = (typeof OBJETO_ENUM)[number];

// ─── Dimensão papel_na_cadeia (12 valores) — Q-3 RESOLVIDA 2026-04-24 ───────

export const PAPEL_NA_CADEIA_ENUM = [
  "fabricante",
  "distribuidor",
  "varejista",
  "prestador",
  "transportador",
  "importador",
  "exportador",
  "comercio_exterior_misto",
  "intermediador",
  "produtor",
  "operadora_regulada",
  "indefinido",
] as const;
export type PapelNaCadeia = (typeof PAPEL_NA_CADEIA_ENUM)[number];

// ─── Dimensão tipo_de_relacao (6 valores) ──────────────────────────────────

export const TIPO_DE_RELACAO_ENUM = [
  "venda",
  "servico",
  "producao",
  "intermediacao",
  "locacao",
  "indefinida",
] as const;
export type TipoDeRelacao = (typeof TIPO_DE_RELACAO_ENUM)[number];

// ─── Dimensão territorio (8 valores) ───────────────────────────────────────

export const TERRITORIO_ENUM = [
  "municipal",
  "estadual",
  "interestadual",
  "nacional",
  "internacional",
  "ZFM",
  "ALC",
  "incentivado_outro",
] as const;
export type Territorio = (typeof TERRITORIO_ENUM)[number];

// ─── Dimensão regime (5 valores) — Q-D3 RESOLVIDA 2026-04-24 ───────────────

export const REGIME_ENUM = [
  "simples_nacional",
  "lucro_presumido",
  "lucro_real",
  "mei",
  "indefinido",
] as const;
export type Regime = (typeof REGIME_ENUM)[number];

// ─── Status do arquétipo (4 valores) — Q-6 RESOLVIDA 2026-04-24 ────────────

export const STATUS_ARQUETIPO_ENUM = [
  "pendente",
  "inconsistente",
  "bloqueado",
  "confirmado",
] as const;
export type StatusArquetipo = (typeof STATUS_ARQUETIPO_ENUM)[number];

// ─── Subnatureza setorial (7 valores) — Q-D4 RESOLVIDA 2026-04-24 ──────────

export const SUBNATUREZA_SETORIAL_ENUM = [
  "telecomunicacoes",
  "saude",
  "saude_regulada",
  "energia",
  "financeiro",
  "combustiveis",
  "transporte",
] as const;
export type SubnaturezaSetorial = (typeof SUBNATUREZA_SETORIAL_ENUM)[number];

// ─── OperationType legado (6 valores) — Hotfix IS v1.2 ─────────────────────

export const OPERATION_TYPE_ENUM = [
  "industria",
  "comercio",
  "servicos",
  "misto",
  "agronegocio",
  "financeiro",
] as const;
export type OperationType = (typeof OPERATION_TYPE_ENUM)[number];

// ─── Tipo de objeto econômico (input da seed) — SPEC §3.2 ──────────────────

export const TIPO_OBJETO_ECONOMICO_ENUM = [
  "Bens/mercadorias",
  "Servicos",
  "Energia/combustiveis",
  "Digital",
  "Financeiro",
  "Agricola",
  "Pecuario",
  "Misto",
] as const;
export type TipoObjetoEconomico = (typeof TIPO_OBJETO_ECONOMICO_ENUM)[number];

// ─── Severities de blocker — SPEC §7.2 ────────────────────────────────────

export const BLOCKER_SEVERITY_ENUM = ["HARD_BLOCK", "BLOCK_FLOW", "INFO"] as const;
export type BlockerSeverity = (typeof BLOCKER_SEVERITY_ENUM)[number];

// ─── Test result status (3 valores) — Q-C3 RESOLVIDA 2026-04-24 ────────────
// AMBIGUOUS removido; ambiguidade mapeia para FAIL + status_arquetipo=inconsistente

export const TEST_STATUS_ENUM = ["PASS", "FAIL", "BLOCKED"] as const;
export type TestStatus = (typeof TEST_STATUS_ENUM)[number];
