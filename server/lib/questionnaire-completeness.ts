import { IAGEN_MIN_ANSWERS } from "../config/question-limits";

/**
 * questionnaire-completeness.ts — Etapa 2 ADR-0016
 *
 * Mede o engajamento do usuário com os questionários (% de perguntas respondidas).
 *
 * SEPARAÇÃO OBRIGATÓRIA (DEC-M2-12 + ADR-0016):
 *   - completeness.ts existente: "temos dados suficientes para gerar o briefing?"
 *     Status: insuficiente | parcial | adequado | completo
 *   - ESTE ARQUIVO: "o usuário engajou suficientemente com os questionários?"
 *     Status: completo | parcial | incompleto | pulado
 *
 * NÃO IMPORTAR nem modificar completeness.ts existente.
 *
 * Thresholds aprovados pelo P.O. (pasted_content_2.txt 2026-04-07):
 *   completo  ≥ 80% respondidas
 *   parcial   30–79% respondidas
 *   incompleto < 30% respondidas
 *   pulado    0% (questionário inteiro pulado via skipAll)
 *
 * Mínimos para confiança alta:
 *   SOLARIS (Onda 1): 24 perguntas → 20 respondidas (83%)
 *   IA Gen (Onda 2):   7 perguntas →  6 respondidas (86%)
 *   Q.Produtos/Serviços: variável → 80%
 */

// ─── Tipos canônicos (ADR-0016) ───────────────────────────────────────────────

/** Estado de completude de um questionário individual */
export type QuestionnaireState = "completo" | "parcial" | "incompleto" | "pulado";

/**
 * Nível de confiança do diagnóstico como um todo.
 * Derivado da combinação dos estados de todos os questionários aplicáveis.
 */
export type ConfidenceLevel = "alta" | "media" | "baixa" | "nenhuma";

/** Resultado completo para um questionário individual */
export interface QuestionnaireCompleteness {
  /** Identificador do questionário: "solaris" | "iagen" | "produto" | "servico" | "cnae" */
  questionnaireId: string;
  /** Estado calculado com base nos thresholds */
  state: QuestionnaireState;
  /** Número de perguntas respondidas */
  answeredCount: number;
  /** Total de perguntas do questionário */
  totalCount: number;
  /** Percentual respondido (0.0–1.0) */
  completionRatio: number;
  /** true se o usuário pulou o questionário inteiro */
  skippedAll: boolean;
  /** IDs das perguntas puladas individualmente */
  skippedIds: string[];
}

/** Resultado agregado para o diagnóstico completo */
export interface DiagnosticConfidence {
  /** Nível de confiança global */
  level: ConfidenceLevel;
  /** Score numérico (0.0–1.0) derivado da média ponderada */
  score: number;
  /** Estado de cada questionário aplicável */
  questionnaires: QuestionnaireCompleteness[];
  /** Questionários com estado != "completo" (para exibir avisos) */
  warnings: string[];
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

/** Threshold mínimo para estado "completo" */
export const THRESHOLD_COMPLETO = 0.80;

/** Threshold mínimo para estado "parcial" */
export const THRESHOLD_PARCIAL = 0.30;

/**
 * Mínimos absolutos por questionário para confiança "alta".
 * Baseado nos mínimos aprovados pelo P.O. (pasted_content_2.txt).
 */
export const MINIMUM_ANSWERS: Record<string, number> = {
  solaris: 20,  // 24 perguntas → 20 respondidas (83%)
  iagen: IAGEN_MIN_ANSWERS,  // IAGEN_QUESTIONS_COUNT perguntas → IAGEN_MIN_ANSWERS respondidas (86%)
};

// ─── Funções principais ───────────────────────────────────────────────────────

/**
 * Calcula o estado de completude de um questionário individual.
 *
 * @param totalCount - Total de perguntas do questionário
 * @param answeredCount - Perguntas efetivamente respondidas (não puladas)
 * @param skippedAll - true se o usuário pulou o questionário inteiro
 * @returns QuestionnaireState
 *
 * @example
 * computeState(24, 20, false) // "completo" (83% ≥ 80%)
 * computeState(24, 10, false) // "parcial"  (42% ∈ [30%, 80%))
 * computeState(24, 5, false)  // "incompleto" (21% < 30%)
 * computeState(24, 0, true)   // "pulado"
 */
export function computeState(
  totalCount: number,
  answeredCount: number,
  skippedAll: boolean
): QuestionnaireState {
  if (skippedAll || (totalCount > 0 && answeredCount === 0)) {
    return "pulado";
  }
  if (totalCount === 0) {
    return "completo"; // questionário não aplicável → não penaliza
  }
  const ratio = answeredCount / totalCount;
  if (ratio >= THRESHOLD_COMPLETO) return "completo";
  if (ratio >= THRESHOLD_PARCIAL) return "parcial";
  return "incompleto";
}

/**
 * Calcula o nível de confiança global a partir dos estados dos questionários.
 *
 * Regras (aprovadas pelo P.O.):
 *   - Todos "completo" → "alta"
 *   - Algum "parcial", nenhum "incompleto" ou "pulado" → "media"
 *   - Algum "incompleto" → "baixa"
 *   - Todos "pulado" ou nenhum dado → "nenhuma"
 *
 * @param states - Array de QuestionnaireState dos questionários aplicáveis
 * @returns ConfidenceLevel
 */
export function computeConfidenceLevel(states: QuestionnaireState[]): ConfidenceLevel {
  if (states.length === 0) return "nenhuma";

  const applicableStates = states.filter(s => s !== "pulado");

  if (applicableStates.length === 0) return "nenhuma";
  if (applicableStates.every(s => s === "completo")) return "alta";
  if (applicableStates.some(s => s === "incompleto")) return "baixa";
  if (applicableStates.some(s => s === "parcial")) return "media";

  return "alta";
}

/**
 * Score numérico (0.0–1.0) para um estado de questionário.
 * Usado para calcular o score médio ponderado do DiagnosticConfidence.
 */
function stateToScore(state: QuestionnaireState): number {
  switch (state) {
    case "completo":   return 1.0;
    case "parcial":    return 0.6;
    case "incompleto": return 0.2;
    case "pulado":     return 0.0;
  }
}

/**
 * Calcula o DiagnosticConfidence completo para um projeto.
 *
 * @param questionnaires - Array de QuestionnaireCompleteness (um por questionário aplicável)
 * @returns DiagnosticConfidence
 */
export function computeDiagnosticConfidence(
  questionnaires: QuestionnaireCompleteness[]
): DiagnosticConfidence {
  const states = questionnaires.map(q => q.state);
  const level = computeConfidenceLevel(states);

  // Score médio ponderado (peso igual por questionário)
  const score =
    questionnaires.length === 0
      ? 0
      : questionnaires.reduce((sum, q) => sum + stateToScore(q.state), 0) /
        questionnaires.length;

  // Avisos: questionários com estado != "completo"
  const warnings: string[] = questionnaires
    .filter(q => q.state !== "completo")
    .map(q => {
      switch (q.state) {
        case "parcial":
          return `${q.questionnaireId}: ${Math.round(q.completionRatio * 100)}% respondido — confiança reduzida`;
        case "incompleto":
          return `${q.questionnaireId}: apenas ${q.answeredCount}/${q.totalCount} perguntas respondidas`;
        case "pulado":
          return `${q.questionnaireId}: questionário pulado — sem contribuição para o diagnóstico`;
        default:
          return null;
      }
    })
    .filter((w): w is string => w !== null);

  return { level, score, questionnaires, warnings };
}

/**
 * Constrói um QuestionnaireCompleteness a partir dos dados brutos do projeto.
 *
 * @param questionnaireId - Identificador: "solaris" | "iagen" | "produto" | "servico" | "cnae"
 * @param totalCount - Total de perguntas do questionário
 * @param answeredCount - Perguntas respondidas (excluindo puladas)
 * @param skippedAll - true se o questionário inteiro foi pulado
 * @param skippedIds - IDs das perguntas puladas individualmente
 */
export function buildQuestionnaireCompleteness(
  questionnaireId: string,
  totalCount: number,
  answeredCount: number,
  skippedAll: boolean,
  skippedIds: string[] = []
): QuestionnaireCompleteness {
  const effectiveAnswered = Math.max(0, answeredCount);
  const effectiveTotal = Math.max(0, totalCount);
  const completionRatio =
    effectiveTotal === 0 ? 1.0 : effectiveAnswered / effectiveTotal;

  return {
    questionnaireId,
    state: computeState(effectiveTotal, effectiveAnswered, skippedAll),
    answeredCount: effectiveAnswered,
    totalCount: effectiveTotal,
    completionRatio,
    skippedAll,
    skippedIds,
  };
}

/**
 * Converte o estado para o label de badge exibido no DiagnosticoStepper.
 *
 * @param state - QuestionnaireState
 * @returns string para exibição na UI
 */
export function stateToLabel(state: QuestionnaireState): string {
  switch (state) {
    case "completo":   return "Completo";
    case "parcial":    return "Parcial";
    case "incompleto": return "Incompleto";
    case "pulado":     return "Pulado";
  }
}

/**
 * Converte o ConfidenceLevel para o label de badge exibido no DiagnosticoStepper.
 *
 * @param level - ConfidenceLevel
 * @returns string para exibição na UI
 */
export function confidenceLevelToLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "alta":    return "Confiança alta";
    case "media":   return "Confiança média";
    case "baixa":   return "Confiança baixa";
    case "nenhuma": return "Sem dados";
  }
}
