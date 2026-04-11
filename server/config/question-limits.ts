/**
 * question-limits.ts — Constantes configuráveis para limites de perguntas
 * Sprint Z-12 · B-Z11-001/002
 *
 * ANTES: números literais espalhados nos geradores (7, 15, 6, etc.)
 * DEPOIS: fonte única de verdade — alterar aqui propaga para todos os geradores.
 *
 * Valores aprovados pelo P.O. (pasted_content_2.txt):
 *   - Onda 2 IA Gen: 7 perguntas por ramo
 *   - iagen mínimo: 6 respostas (86% de 7)
 *   - Assessment corporativo: 15–20 perguntas
 *   - Assessment por ramo: 10–15 perguntas
 *   - Schema Zod max: 15 perguntas
 */

// ─── Onda 2 IA Gen ────────────────────────────────────────────────────────────

/** Número exato de perguntas geradas por ramo na Onda 2 IA Gen */
export const IAGEN_QUESTIONS_COUNT = 7;

/** Mínimo de respostas para considerar o questionário IA Gen "completo" (86% de 7) */
export const IAGEN_MIN_ANSWERS = 6;

// ─── Assessment corporativo ───────────────────────────────────────────────────

/** Mínimo de perguntas no assessment corporativo */
export const ASSESSMENT_CORPORATE_MIN = 15;

/** Máximo de perguntas no assessment corporativo */
export const ASSESSMENT_CORPORATE_MAX = 20;

// ─── Assessment por ramo ──────────────────────────────────────────────────────

/** Mínimo de perguntas no assessment por ramo */
export const ASSESSMENT_BRANCH_MIN = 10;

/** Máximo de perguntas no assessment por ramo */
export const ASSESSMENT_BRANCH_MAX = 15;

// ─── Schema Zod (QuestionsResponseSchema) ────────────────────────────────────

/** Máximo de perguntas aceito pelo schema Zod de resposta do LLM */
export const QUESTIONS_SCHEMA_MAX = ASSESSMENT_CORPORATE_MAX; // 20 (alinhado com corporate max)

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retorna a string de range para uso em prompts: "MIN–MAX" */
export function questionRange(min: number, max: number): string {
  return `${min}–${max}`;
}
