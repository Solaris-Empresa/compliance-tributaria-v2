/**
 * gap-risk.schemas.ts — Sprint Z-10 PR #A
 * Zod schemas para o mapeamento Gap → Categoria de Risco (GAP-ACL)
 *
 * Contratos:
 *   GapConfirmed  → input do gap-to-rule-mapper
 *   RuleMatch     → output do gap-to-rule-mapper
 *   CategoryACL   → subconjunto de RiskCategory para verificação de ACL
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// GapConfirmed — gap identificado pelo GapEngine (entrada do mapper)
// ─────────────────────────────────────────────────────────────────────────────
export const GapConfirmedSchema = z.object({
  /** ID único do gap (ex: "gap-001") */
  id: z.string().min(1),

  /** Domínio de negócio do gap (ex: "contabilidade", "fiscal", "ti") */
  domain: z.string().min(1),

  /** Tipo de gap (ex: "obrigacao_acessoria", "apuracao", "credito", "transicao") */
  gapType: z.string().min(1),

  /** Artigos da lei relacionados ao gap (ex: ["art. 12", "art. 45"]) */
  artigos: z.array(z.string()).default([]),

  /** Descrição textual do gap */
  description: z.string().optional(),

  /** Severidade estimada pelo GapEngine */
  severidade: z.enum(["alta", "media", "oportunidade"]).optional(),

  /** Metadados adicionais (livre) */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type GapConfirmed = z.infer<typeof GapConfirmedSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// CategoryACL — campos de controle de acesso de uma RiskCategory
// ─────────────────────────────────────────────────────────────────────────────
export const CategoryACLSchema = z.object({
  codigo: z.string(),
  nome: z.string(),
  severidade: z.enum(["alta", "media", "oportunidade"]),
  urgencia: z.enum(["imediata", "curto_prazo", "medio_prazo"]),
  tipo: z.enum(["risk", "opportunity"]),
  status: z.enum(["ativo", "sugerido", "pendente_revisao", "inativo", "legado"]),
  /** NULL = aceita qualquer domínio */
  allowedDomains: z.array(z.string()).nullable().optional(),
  /** NULL = aceita qualquer tipo de gap */
  allowedGapTypes: z.array(z.string()).nullable().optional(),
  /** Código da regra de mapeamento (ex: "RC-001") */
  ruleCode: z.string().nullable().optional(),
});

export type CategoryACL = z.infer<typeof CategoryACLSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// RuleMatch — resultado do mapeamento Gap → Categoria (saída do mapper)
// ─────────────────────────────────────────────────────────────────────────────
export const RuleMatchSchema = z.object({
  /** Gap de origem */
  gapId: z.string(),

  /** Código da categoria mapeada */
  categoriaCodigo: z.string(),

  /** Nome da categoria mapeada */
  categoriaNome: z.string(),

  /**
   * Modo de resolução:
   *   "rule_code"  → casou pelo ruleCode explícito da categoria
   *   "acl_filter" → casou pelos filtros allowedDomains/allowedGapTypes
   *   "fallback"   → nenhuma regra casou; usou categoria padrão do domínio
   */
  mode: z.enum(["rule_code", "acl_filter", "fallback"]),

  /** Score de confiança do mapeamento (0.0 – 1.0) */
  score: z.number().min(0).max(1),

  /** Código da regra que originou o match (se mode === "rule_code") */
  ruleCode: z.string().nullable().optional(),
});

export type RuleMatch = z.infer<typeof RuleMatchSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MapperResult — resultado completo do mapper para um conjunto de gaps
// ─────────────────────────────────────────────────────────────────────────────
export const MapperResultSchema = z.object({
  matches: z.array(RuleMatchSchema),
  /** Gaps que não encontraram nenhuma categoria (nem fallback) */
  unmatched: z.array(z.string()),
  /** Timestamp da execução */
  executedAt: z.string().datetime(),
});

export type MapperResult = z.infer<typeof MapperResultSchema>;
