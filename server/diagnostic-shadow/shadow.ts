/**
 * IA SOLARIS — Shadow Mode Orchestrator
 * ─────────────────────────────────────────────────────────────────────────────
 * ADR-009: Orquestrador do Shadow Mode para getDiagnosticSource.
 *
 * runShadowComparison:
 *   - Lê legadas e novas em paralelo
 *   - Compara campo a campo (briefing, matrizes, planos)
 *   - Loga divergências via DiagnosticDivergenceLogger
 *   - Retorna SEMPRE a leitura legada (produção segura)
 *
 * INVARIANTE: O resultado retornado é SEMPRE idêntico ao modo legacy.
 * O Shadow Mode é transparente para o fluxo principal.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  DiagnosticDivergenceLogger,
  DiagnosticShadowResult,
} from "./types";
import { areValuesEquivalent } from "./utils";
import {
  readLegacyDiagnosticSource,
  readNewDiagnosticSource,
  type ProjectRowForShadow,
} from "./readers";

type ComparableField = "briefingContent" | "riskMatricesData" | "actionPlansData";

const FIELD_SOURCE_MAP: Record<
  ComparableField,
  { legacyKey: keyof DiagnosticShadowResult["source"]; newKey: keyof DiagnosticShadowResult["source"] }
> = {
  briefingContent: { legacyKey: "briefing", newKey: "briefing" },
  riskMatricesData: { legacyKey: "riskMatrices", newKey: "riskMatrices" },
  actionPlansData: { legacyKey: "actionPlans", newKey: "actionPlans" },
};

/**
 * Executa a comparação Shadow Mode para um projeto.
 *
 * @param project - Linha do projeto com colunas legadas e novas
 * @param logger - Logger de divergência (console ou DB)
 * @returns DiagnosticShadowResult com dados legados (invariante de produção)
 */
export async function runShadowComparison(
  project: ProjectRowForShadow,
  logger: DiagnosticDivergenceLogger
): Promise<DiagnosticShadowResult> {
  const legacy = readLegacyDiagnosticSource(project);
  const newResult = readNewDiagnosticSource(project);

  const fields: ComparableField[] = [
    "briefingContent",
    "riskMatricesData",
    "actionPlansData",
  ];

  for (const field of fields) {
    const legacyValue = legacy[field];
    const newValue = newResult[field];

    if (!areValuesEquivalent(legacyValue, newValue)) {
      const sourceMap = FIELD_SOURCE_MAP[field];
      const legacySourceColumn = legacy.source[sourceMap.legacyKey];
      const newSourceColumn = newResult.source[sourceMap.newKey];

      let reason = `Divergência em ${field}: `;
      if (legacyValue === null && newValue !== null) {
        reason += `legada é null, nova tem valor`;
      } else if (legacyValue !== null && newValue === null) {
        reason += `legada tem valor, nova é null`;
      } else {
        reason += `conteúdo diferente`;
      }

      await logger.log({
        projectId: project.id,
        flowVersion: legacy.flowVersion,
        field,
        legacySourceColumn,
        newSourceColumn,
        legacyValue,
        newValue,
        reason,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // INVARIANTE: retorna sempre a leitura legada
  return legacy;
}

/**
 * Resultado do Shadow Mode com metadados de comparação.
 * Usado pelo endpoint de consulta de divergências.
 */
export interface ShadowComparisonSummary {
  projectId: number;
  flowVersion: string;
  divergencesFound: number;
  fields: Array<{
    field: ComparableField;
    equivalent: boolean;
    legacySource: string | null;
    newSource: string | null;
  }>;
}

/**
 * Executa comparação e retorna um resumo sem persistir (para uso em testes/diagnóstico).
 */
export function compareDiagnosticSources(
  project: ProjectRowForShadow
): ShadowComparisonSummary {
  const legacy = readLegacyDiagnosticSource(project);
  const newResult = readNewDiagnosticSource(project);

  const fields: ComparableField[] = [
    "briefingContent",
    "riskMatricesData",
    "actionPlansData",
  ];

  let divergencesFound = 0;
  const fieldResults = fields.map((field) => {
    const equivalent = areValuesEquivalent(legacy[field], newResult[field]);
    if (!equivalent) divergencesFound++;
    const sourceMap = FIELD_SOURCE_MAP[field];
    return {
      field,
      equivalent,
      legacySource: legacy.source[sourceMap.legacyKey],
      newSource: newResult.source[sourceMap.newKey],
    };
  });

  return {
    projectId: project.id,
    flowVersion: legacy.flowVersion,
    divergencesFound,
    fields: fieldResults,
  };
}
