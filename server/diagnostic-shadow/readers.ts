/**
 * IA SOLARIS — Shadow Mode Readers
 * ─────────────────────────────────────────────────────────────────────────────
 * ADR-009: Leituras legacy e new separadas para o Shadow Mode.
 *
 * readLegacyDiagnosticSource: lê colunas legadas (briefingContent, riskMatricesData, actionPlansData)
 * readNewDiagnosticSource:    lê novas colunas V1/V3 (briefingContentV1/V3, etc.)
 *
 * IMPORTANTE: Este módulo é somente leitura. Não altera o banco.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DiagnosticShadowResult, FlowVersion } from "./types";

/**
 * Linha mínima de projeto necessária para o Shadow Mode.
 * Inclui colunas legadas e novas (F-04 Fase 1).
 */
export interface ProjectRowForShadow {
  id: number;

  // Determinação do fluxo
  questionnaireAnswers: unknown | null;
  corporateAnswers: unknown | null;
  operationalAnswers: unknown | null;

  // Colunas legadas
  briefingContent: string | null;
  riskMatricesData: unknown | null;
  actionPlansData: unknown | null;

  // Novas colunas F-04 (Fase 1 — criadas, ainda vazias)
  briefingContentV1: string | null;
  briefingContentV3: string | null;
  riskMatricesDataV1: unknown | null;
  riskMatricesDataV3: unknown | null;
  actionPlansDataV1: unknown | null;
  actionPlansDataV3: unknown | null;
}

/**
 * Determina a versão do fluxo baseado nas colunas de resposta do projeto.
 * Idêntico ao determineFlowVersion do diagnostic-source.ts — duplicado aqui
 * para manter o módulo shadow independente.
 */
export function determineShadowFlowVersion(project: ProjectRowForShadow): FlowVersion {
  const hasV3 = project.questionnaireAnswers != null;
  const hasV1 =
    project.corporateAnswers != null || project.operationalAnswers != null;

  if (hasV1 && hasV3) return "hybrid";
  if (hasV3) return "v3";
  if (hasV1) return "v1";
  return "none";
}

/**
 * Lê as colunas legadas do projeto.
 * Retorna sempre briefingContent, riskMatricesData, actionPlansData.
 */
export function readLegacyDiagnosticSource(
  project: ProjectRowForShadow
): DiagnosticShadowResult {
  const flowVersion = determineShadowFlowVersion(project);

  return {
    flowVersion,
    briefingContent: project.briefingContent,
    riskMatricesData: project.riskMatricesData,
    actionPlansData: project.actionPlansData,
    source: {
      briefing: "briefingContent",
      riskMatrices: "riskMatricesData",
      actionPlans: "actionPlansData",
    },
  };
}

/**
 * Lê as novas colunas V1/V3 do projeto (F-04 Fase 1).
 * Retorna os dados das colunas separadas por versão de fluxo.
 */
export function readNewDiagnosticSource(
  project: ProjectRowForShadow
): DiagnosticShadowResult {
  const flowVersion = determineShadowFlowVersion(project);

  if (flowVersion === "v3") {
    return {
      flowVersion,
      briefingContent: project.briefingContentV3,
      riskMatricesData: project.riskMatricesDataV3,
      actionPlansData: project.actionPlansDataV3,
      source: {
        briefing: "briefingContentV3",
        riskMatrices: "riskMatricesDataV3",
        actionPlans: "actionPlansDataV3",
      },
    };
  }

  if (flowVersion === "v1") {
    return {
      flowVersion,
      briefingContent: project.briefingContentV1,
      riskMatricesData: project.riskMatricesDataV1,
      actionPlansData: project.actionPlansDataV1,
      source: {
        briefing: "briefingContentV1",
        riskMatrices: "riskMatricesDataV1",
        actionPlans: "actionPlansDataV1",
      },
    };
  }

  if (flowVersion === "hybrid") {
    // Híbrido: preferência para V3, fallback para V1
    return {
      flowVersion,
      briefingContent: project.briefingContentV3 ?? project.briefingContentV1,
      riskMatricesData:
        project.riskMatricesDataV3 ?? project.riskMatricesDataV1,
      actionPlansData:
        project.actionPlansDataV3 ?? project.actionPlansDataV1,
      source: {
        briefing: project.briefingContentV3
          ? "briefingContentV3"
          : "briefingContentV1",
        riskMatrices: project.riskMatricesDataV3
          ? "riskMatricesDataV3"
          : "riskMatricesDataV1",
        actionPlans: project.actionPlansDataV3
          ? "actionPlansDataV3"
          : "actionPlansDataV1",
      },
    };
  }

  // none
  return {
    flowVersion,
    briefingContent: null,
    riskMatricesData: null,
    actionPlansData: null,
    source: {
      briefing: null,
      riskMatrices: null,
      actionPlans: null,
    },
  };
}
