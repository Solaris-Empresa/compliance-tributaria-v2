/**
 * M2.1 — Completude Diagnóstica
 *
 * ADR-0007 Seção 12: o sistema nunca deve entregar um briefing sem comunicar
 * ao usuário se o diagnóstico é: insuficiente | parcial | adequado | completo
 *
 * IMPORTANTE: DiagnosticCompletenessStatus é distinto de evaluation_confidence
 * do gap engine (DEC-M2-09 — NUNCA misturar os dois conceitos).
 */

// ─── Tipo canônico ────────────────────────────────────────────────────────────

export type DiagnosticCompletenessStatus =
  | "insuficiente"
  | "parcial"
  | "adequado"
  | "completo";

// ─── Input da função de cálculo ───────────────────────────────────────────────

export interface DiagnosticCompletenessInput {
  /** COUNT de solaris_answers por projectId (Onda 1) */
  solarisAnswersCount: number;
  /** COUNT de iagen_answers por projectId (Onda 2) */
  iagenAnswersCount: number;
  /** Status das 3 camadas de diagnóstico — null se ainda não iniciado */
  diagnosticStatus: {
    corporate: string;
    operational: string;
    cnae: string;
  } | null;
  /** Perfil de operação com NCM/NBS — não null = preenchido */
  operationProfile: unknown;
}

// ─── Função de cálculo ────────────────────────────────────────────────────────

/**
 * Calcula o status de completude diagnóstica de um projeto.
 *
 * Regras (ADR-0007 Seção 12):
 * 1. Nenhuma resposta em solaris E iagen → 'insuficiente'
 * 2. Pelo menos 1 resposta + alguma etapa não 'completed' → 'parcial'
 * 3. Todas as etapas 'completed' + operationProfile preenchido → 'completo'
 * 4. Caso intermediário (diagnóstico concluído, operationProfile null) → 'adequado'
 */
export function calcDiagnosticCompleteness(
  input: DiagnosticCompletenessInput
): DiagnosticCompletenessStatus {
  const { solarisAnswersCount, iagenAnswersCount, diagnosticStatus, operationProfile } = input;

  // Regra 1: nenhuma resposta em nenhuma onda
  if (solarisAnswersCount === 0 && iagenAnswersCount === 0) {
    return "insuficiente";
  }

  const hasAnyAnswer = solarisAnswersCount > 0 || iagenAnswersCount > 0;

  // Verificar se todas as etapas de diagnóstico estão concluídas
  const allLayersCompleted =
    diagnosticStatus !== null &&
    diagnosticStatus !== undefined &&
    diagnosticStatus.corporate === "completed" &&
    diagnosticStatus.operational === "completed" &&
    diagnosticStatus.cnae === "completed";

  // Regra 3: todas as etapas concluídas + operationProfile preenchido → 'completo'
  if (allLayersCompleted && operationProfile !== null && operationProfile !== undefined) {
    return "completo";
  }

  // Regra 4: todas as etapas concluídas mas sem operationProfile → 'adequado'
  if (allLayersCompleted) {
    return "adequado";
  }

  // Regra 2: pelo menos 1 resposta + alguma etapa não concluída → 'parcial'
  if (hasAnyAnswer) {
    return "parcial";
  }

  // Fallback defensivo (não deve ocorrer dado as regras acima)
  return "insuficiente";
}

// ─── Helper: listar dimensões pendentes ───────────────────────────────────────

/**
 * Retorna as dimensões de diagnóstico que ainda não foram concluídas.
 * Usado no banner 'parcial' para indicar o que falta.
 */
export function getPendingDiagnosticLayers(
  diagnosticStatus: DiagnosticCompletenessInput["diagnosticStatus"]
): string[] {
  if (!diagnosticStatus) return ["Corporativo", "Operacional", "CNAE"];

  const pending: string[] = [];
  if (diagnosticStatus.corporate !== "completed") pending.push("Corporativo");
  if (diagnosticStatus.operational !== "completed") pending.push("Operacional");
  if (diagnosticStatus.cnae !== "completed") pending.push("CNAE");
  return pending;
}
