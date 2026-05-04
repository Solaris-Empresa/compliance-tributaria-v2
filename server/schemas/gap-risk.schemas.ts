/**
 * gap-risk.schemas.ts — Sprint Z-10
 * Zod schemas para o mapeamento Gap → Categoria de Risco (GAP-ACL)
 *
 * Contratos existentes (mantidos — repository depende):
 *   GapConfirmed  → legado PR #448, mantido para repository/admin
 *   CategoryACL   → subconjunto de RiskCategory para verificação de ACL
 *
 * Contratos novos (ACL v2 — classe GapToRuleMapper):
 *   GapInput            → entrada do mapper v2
 *   GapMappingResult    → resultado do mapper v2 (sem score, sem confidence)
 *   MapGapsToRulesResult → resultado agregado do mapMany
 *
 * PROIBIDO: score, confidence, ranking, fallback por domínio.
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════
// Contratos existentes — mantidos para repository/admin
// ═══════════════════════════════════════════════════════════════════════════

export const GapConfirmedSchema = z.object({
  id: z.string().min(1),
  domain: z.string().min(1),
  gapType: z.string().min(1),
  artigos: z.array(z.string()).default([]),
  description: z.string().optional(),
  severidade: z.enum(["alta", "media", "oportunidade"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type GapConfirmed = z.infer<typeof GapConfirmedSchema>;

export const CategoryACLSchema = z.object({
  codigo: z.string(),
  nome: z.string(),
  severidade: z.enum(["alta", "media", "oportunidade"]),
  urgencia: z.enum(["imediata", "curto_prazo", "medio_prazo"]),
  tipo: z.enum(["risk", "opportunity"]),
  status: z.enum(["ativo", "sugerido", "pendente_revisao", "inativo", "legado"]),
  allowedDomains: z.array(z.string()).nullable().optional(),
  allowedGapTypes: z.array(z.string()).nullable().optional(),
  ruleCode: z.string().nullable().optional(),
});

export type CategoryACL = z.infer<typeof CategoryACLSchema>;

export const RuleMatchSchema = z.object({
  gapId: z.string(),
  categoriaCodigo: z.string(),
  categoriaNome: z.string(),
  mode: z.enum(["rule_code", "acl_filter", "fallback"]),
  score: z.number().min(0).max(1),
  ruleCode: z.string().nullable().optional(),
});

export type RuleMatch = z.infer<typeof RuleMatchSchema>;

export const MapperResultSchema = z.object({
  matches: z.array(RuleMatchSchema),
  unmatched: z.array(z.string()),
  executedAt: z.string().datetime(),
});

export type MapperResult = z.infer<typeof MapperResultSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// Contratos novos — ACL v2 (GapToRuleMapper)
// Sem score, sem confidence — apenas status determinístico.
// ═══════════════════════════════════════════════════════════════════════════

export const GapInputSchema = z.object({
  id: z.string(),
  canonicalId: z.string(),
  gapStatus: z.enum(["compliant", "nao_compliant", "parcial", "nao_aplicavel"]),
  gapSeverity: z.enum(["critica", "alta", "media", "baixa"]).optional(),
  gapType: z.string().optional(),
  area: z.string().optional(),
  descricao: z.string().optional(),
  categoria: z.string().optional(),
  // M3.8-1B: ampliado com "regulatorio" (gap por requisito sem resposta) e "inferred"
  // (riscos por gatilho semântico em normative-inference.ts).
  sourceOrigin: z.enum(["cnae", "ncm", "nbs", "solaris", "iagen", "regulatorio", "inferred"]).optional(),
  requirementId: z.string().optional(),
  sourceReference: z.string().optional(),
  domain: z.string().optional(),
  layer: z.string().optional(),
  // M3 NOVA-06: rastreabilidade end-to-end (opcionais — backward-compat)
  questionId: z.number().int().nullable().optional(),
  answerValue: z.string().nullable().optional(),
  gapId: z.number().int().nullable().optional(),
  questionSource: z.enum(["solaris", "iagen", "qa_v3", "engine", "cnae", "v1"]).nullable().optional(),
});

export type GapInput = z.infer<typeof GapInputSchema>;

export const MappingStatusSchema = z.enum(["mapped", "ambiguous", "unmapped"]);
export type MappingStatus = z.infer<typeof MappingStatusSchema>;

export const GapMappingResultSchema = z.object({
  gapId: z.string(),
  status: MappingStatusSchema,
  ruleCode: z.string().nullable(),
  categoria: z.string().nullable(),
  reason: z.string(),
});

export type GapMappingResult = z.infer<typeof GapMappingResultSchema>;

export const GapRuleSchema = z.object({
  ruleId: z.string(),
  categoria: z.string(),
  artigo: z.string(),
  fonte: z.string(),
  gapClassification: z.string(),
  requirementId: z.string(),
  sourceReference: z.string(),
  domain: z.string(),
  // M3 NOVA-06: rastreabilidade end-to-end (opcionais — backward-compat)
  questionId: z.number().int().nullable().optional(),
  answerValue: z.string().nullable().optional(),
  gapId: z.number().int().nullable().optional(),
  questionSource: z.enum(["solaris", "iagen", "qa_v3", "engine", "cnae", "v1"]).nullable().optional(),
});

export type GapRuleOutput = z.infer<typeof GapRuleSchema>;

export const MapGapsToRulesResultSchema = z.object({
  mappedRules: z.array(GapRuleSchema),
  reviewQueue: z.array(GapMappingResultSchema),
  stats: z.object({
    total: z.number(),
    mapped: z.number(),
    ambiguous: z.number(),
    unmapped: z.number(),
  }),
});

export type MapGapsToRulesResult = z.infer<typeof MapGapsToRulesResultSchema>;
