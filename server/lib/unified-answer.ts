/**
 * unified-answer.ts — Sprint M3.8 Item 2 (escopo reduzido V7)
 *
 * Estrutura `UnifiedAnswer` para normalizar respostas de múltiplas fontes
 * em formato uniforme antes de alimentar o Gap Engine.
 *
 * Princípios (Lições #62 + #63):
 *   - Lição #62 (Contexto vs Evidência): este módulo lida apenas com EVIDÊNCIA
 *     (respostas a obrigações). Contexto (cnaeAnswers, archetype) NÃO entra aqui.
 *   - Lição #63 (Spec ≠ Viável): em M3.8 Fase 1, apenas service_answers padrão `idN`
 *     é fonte ATIVA. Outras 3 fontes ficam como STUBS documentados, ativadas em M3.9
 *     após curadoria SOLARIS jurídica (Issues #961 #962 #963).
 *
 * Status M3.8 Fase 1:
 *   ✅ ATIVO:   normalizeServiceAnswers (padrão `lc214-art-X-idN`)
 *   🟡 STUB:    normalizeIagenAnswers       — bloqueado por #962 (risk_category_code NULL em 100%)
 *   🟡 STUB:    normalizeQcnaeOnda3Answers  — bloqueado por #963 (requirement_question_mapping vazia)
 *   🚫 EXCLUSÃO: normalizeSolarisAnswers    — 100% redundante com service_answers (Issue #964)
 *
 * REGRA DE INTEGRIDADE: respostas com `requirementId === null` são FILTRADAS.
 * Não geram gap (REGRA-ORQ-29 — sem requisito determinístico = sem evidência).
 */

import { z } from "zod";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Fontes possíveis de uma resposta unificada — paridade com QuestionSource em gapEngine.ts
 * (M3.8-1A) excluindo "regulatory_only" (este é status do gap, não da resposta).
 */
export const UnifiedAnswerSourceSchema = z.enum([
  "qnbs_regulatorio", // service_answers padrão idN (Q.NBS regulatório)
  "qnbs_solaris",     // service_answers padrão SOL-XXX (Q.NBS solaris) — STUB M3.9-1
  "solaris_onda1",    // solaris_answers (Onda 1) — EXCLUSÃO DEFINITIVA M3.9-4
  "iagen_onda2",      // iagen_answers (Onda 2) — STUB M3.9-2
  "qcnae_onda3",      // questionnaireAnswersV3 (Q.CNAE Onda 3 LLM) — STUB M3.9-6
]);
export type UnifiedAnswerSource = z.infer<typeof UnifiedAnswerSourceSchema>;

export const UnifiedAnswerValueSchema = z.enum(["Sim", "Não", "Parcial"]).nullable();
export type UnifiedAnswerValue = z.infer<typeof UnifiedAnswerValueSchema>;

export const UnifiedAnswerSchema = z.object({
  /** ID do requirement em regulatory_requirements_v3.id. null = ignorar (Regra de Integridade). */
  requirementId: z.number().int().nullable(),
  /** Resposta normalizada. null = sem resposta clara. */
  answerValue: UnifiedAnswerValueSchema,
  /** Fonte da resposta. */
  source: UnifiedAnswerSourceSchema,
  /** Referência rastreável (fonte_ref original, codigo, ou identificador). */
  sourceRef: z.string().optional(),
});
export type UnifiedAnswer = z.infer<typeof UnifiedAnswerSchema>;

// ─── Parsing determinístico de fonte_ref ─────────────────────────────────────

/**
 * Regex para extrair requirement_id de fonte_ref do padrão `lc<lei>-art-<...>-id<N>`.
 * Exemplo: "lc214-art-art-4-id4" → match[1] = "4"
 *
 * Lição #63 — mapeamento determinístico, não heurístico:
 * o sufixo `idN` em fonte_ref é exatamente `regulatory_requirements_v3.id`.
 */
const FONTE_REF_REGEX = /^lc\d+-art-.*-id(\d+)$/;

/**
 * Extrai requirement_id determinístico do `fonte_ref` de service_answers.
 *
 * Padrões reconhecidos (M3.8 Fase 1):
 *   ✅ `lc214-art-art-4-id4` → 4
 *   ✅ `lc227-art-art-12-id20` → 20
 *
 * Padrões NÃO reconhecidos (M3.9 backlog):
 *   ❌ `SOL-038` → null (curadoria pendente — Issue #961)
 *   ❌ `fallback-servico-001` → null (era fallback hardcoded, eliminado em PR #952)
 *   ❌ qualquer outro formato → null
 */
export function extractRequirementId(fonteRef: string | null | undefined): number | null {
  if (!fonteRef) return null;
  const match = fonteRef.match(FONTE_REF_REGEX);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return Number.isNaN(id) ? null : id;
}

// ─── Parser de answer value ──────────────────────────────────────────────────

/**
 * Normaliza resposta livre em "Sim" | "Não" | "Parcial" | null.
 * Conservador: apenas reconhece variações comuns; texto livre → null.
 */
export function parseAnswerValue(raw: unknown): UnifiedAnswerValue {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "boolean") return raw ? "Sim" : "Não";
  if (typeof raw === "number") return raw > 0 ? "Sim" : "Não";
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "" || normalized === "nao_respondido") return null;
  if (normalized === "sim" || normalized === "yes" || normalized.startsWith("sim")) return "Sim";
  if (normalized === "não" || normalized === "nao" || normalized.startsWith("não") || normalized.startsWith("nao")) {
    if (normalized.startsWith("não aplic") || normalized.startsWith("nao aplic") || normalized.startsWith("não sei") || normalized.startsWith("nao sei")) {
      return null; // "não aplicável" / "não sei" → null (não é "Não")
    }
    return "Não";
  }
  if (normalized === "parcial" || normalized.includes("parcialmente")) return "Parcial";
  return null;
}

// ─── Resolver de respostas múltiplas ─────────────────────────────────────────

/**
 * Quando múltiplas fontes apontam para mesmo requirement, resolve qual resposta usar.
 *
 * Princípio CONSERVADOR (most-negative wins):
 *   Não > Parcial > Sim > null
 *
 * Justificativa: em compliance, se uma fonte diz "Não", há gap. Outras fontes "Sim"
 * podem ser interpretação parcial. Conservador para detecção de risco.
 */
export function resolveAnswer(answers: UnifiedAnswer[]): UnifiedAnswerValue {
  if (answers.length === 0) return null;
  if (answers.some(a => a.answerValue === "Não")) return "Não";
  if (answers.some(a => a.answerValue === "Parcial")) return "Parcial";
  if (answers.some(a => a.answerValue === "Sim")) return "Sim";
  return null;
}

// ─── Normalizers (1 ATIVO + 3 STUBS + 1 EXCLUSÃO) ────────────────────────────

/**
 * Schema de uma entrada de service_answers (JSON em projects.service_answers).
 * Match com routers-fluxo-v3.ts:4220 (saveServiceAnswers).
 */
export interface ServiceAnswerInput {
  pergunta_id?: string;
  pergunta_texto?: string;
  nbs_code?: string;
  ncm_code?: string;
  resposta: string | boolean | number;
  fonte_ref: string;
  lei_ref: string;
}

/**
 * ✅ ATIVO em M3.8 Fase 1.
 *
 * Normaliza service_answers (Q.NBS) em UnifiedAnswer[].
 * Aplica Regra de Integridade: filtra entradas sem requirement_id derivável
 * (padrão SOL-XXX cai aqui — backlog M3.9-1).
 */
export function normalizeServiceAnswers(answers: ServiceAnswerInput[]): UnifiedAnswer[] {
  return answers
    .map((a): UnifiedAnswer => ({
      requirementId: extractRequirementId(a.fonte_ref),
      answerValue: parseAnswerValue(a.resposta),
      source: "qnbs_regulatorio",
      sourceRef: a.fonte_ref,
    }))
    .filter((a): a is UnifiedAnswer & { requirementId: number } => a.requirementId !== null);
}

/**
 * 🚫 EXCLUSÃO DEFINITIVA — M3.9-4 (Issue #964).
 *
 * solaris_answers é 100% redundante com service_answers (overlap total verificado
 * em 2 projetos: #3270001 e #2670001 — Sprint M3.8 Manus 2026-05-04).
 *
 * Ativar como fonte separada DUPLICA evidência e quebra `resolveAnswer`.
 * Esta função existe como placeholder de exclusão definitiva — sempre retorna [].
 */
export function normalizeSolarisAnswers(_answers: unknown[]): UnifiedAnswer[] {
  return [];
}

/**
 * 🟡 STUB — M3.9-2 + M3.9-5 (Issues #962 + #965).
 *
 * Bloqueado por: `iagen_answers.risk_category_code = NULL` em 100% das respostas.
 * Sem `risk_category_code`, não há como mapear para requirement_id determinístico.
 *
 * Ativar após Issue #962 popular o campo (prompt LLM + backfill).
 */
export function normalizeIagenAnswers(_answers: unknown[]): UnifiedAnswer[] {
  return [];
}

/**
 * 🟡 STUB — M3.9-3 + M3.9-6 (Issues #963 + #966).
 *
 * Bloqueado por: `requirement_question_mapping` vazia (0 registros).
 * Ativar após Issue #963 popular o mapeamento via curadoria SOLARIS jurídica.
 *
 * Adicionalmente, depende de Q.CNAE Onda 3 LLM trigger (issue separada futura)
 * para popular `questionnaireAnswersV3` com respostas reais.
 */
export function normalizeQcnaeOnda3Answers(_answers: unknown[]): UnifiedAnswer[] {
  return [];
}

// ─── Helper de agregação ─────────────────────────────────────────────────────

/**
 * Agrega múltiplas UnifiedAnswer[] por requirement_id.
 * Útil para gapEngine.analyzeGaps consolidar evidência de N fontes.
 */
export function groupByRequirement(
  answers: UnifiedAnswer[],
): Map<number, UnifiedAnswer[]> {
  const map = new Map<number, UnifiedAnswer[]>();
  for (const a of answers) {
    if (a.requirementId === null) continue;
    const list = map.get(a.requirementId) ?? [];
    list.push(a);
    map.set(a.requirementId, list);
  }
  return map;
}

/**
 * Mapeia source → question_source enum (paridade gapEngine.ts QuestionSource).
 */
export function sourceToQuestionSource(source: UnifiedAnswerSource): string {
  return source; // direct mapping — enum compatível
}
