/**
 * RETROCESSO CLEANUP — F-03
 * Gate de limpeza de dados ao retroceder no fluxo.
 *
 * Decisões do P.O. (ADR-007, aprovado 2026-03-23):
 * - Limpeza total ao salvar em etapa anterior (sem limpeza parcial)
 * - Sem audit log — dados de diagnóstico são regeneráveis
 * - Sem backup antes da limpeza — limpeza definitiva
 * - Sem novas tabelas — apenas lógica de limpeza no endpoint de salvamento
 */
import { getDb } from "./db";
import { projects } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { DiagnosticFlowVersion } from "./diagnostic-source";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resultado da operação de limpeza.
 */
export interface CleanupResult {
  cleaned: boolean;
  cleanedColumns: string[];
  flowVersion: DiagnosticFlowVersion;
  fromStep: number;
  toStep: number;
}

/**
 * Escopo de limpeza determinado pela etapa de destino e flowVersion.
 */
export interface CleanupScope {
  columns: string[];
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPEAMENTO DE ETAPAS → DADOS PRODUZIDOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Etapas que produzem dados de diagnóstico (a partir de qual etapa cada dado é gerado).
 * Retroceder para uma etapa ANTES desse número invalida o dado correspondente.
 *
 * Mapa: stepNumber → colunas que esse step e os posteriores produzem
 *
 * Etapas do fluxo:
 *  1 = perfil_empresa
 *  2 = consistencia
 *  3 = descoberta_cnaes
 *  4 = confirmacao_cnaes
 *  5 = diagnostico_corporativo  → corporateAnswers (V1) / questionnaireAnswersV3 (V3)
 *  6 = diagnostico_operacional  → operationalAnswers (V1) / questionnaireAnswersV3 (V3)
 *  7 = diagnostico_cnae         → cnaeAnswers (V1) / questionnaireAnswersV3 (V3)
 *  8 = briefing                 → briefingContent (V1) / briefingContent (V3)
 *  9 = riscos                   → riskMatricesData (V1) / riskMatricesData (V3)
 * 10 = plano                    → actionPlansData (V1) / actionPlansData (V3)
 * 11 = dashboard
 */
const STEP_PRODUCES_V1: Record<number, string[]> = {
  5: ["corporateAnswers"],
  6: ["operationalAnswers"],
  7: ["cnaeAnswers"],
  8: ["briefingContent"],
  9: ["riskMatricesData"],
  10: ["actionPlansData"],
};

const STEP_PRODUCES_V3: Record<number, string[]> = {
  // questionnaireAnswersV3 é uma tabela separada — limpeza via DELETE, não SET NULL
  // Aqui mapeamos apenas as colunas JSON na tabela projects
  8: ["briefingContent"],   // V3 usa a mesma coluna briefingContent
  9: ["riskMatricesData"],  // V3 usa a mesma coluna riskMatricesData
  10: ["actionPlansData"],  // V3 usa a mesma coluna actionPlansData
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determina quais colunas devem ser limpas ao retroceder de `fromStep` para `toStep`.
 *
 * Regra: limpar todos os dados produzidos nas etapas POSTERIORES a `toStep`.
 * Exemplo: retroceder de etapa 9 para etapa 5 → limpar dados das etapas 6, 7, 8, 9
 *
 * @param fromStep - Etapa atual do projeto (antes do retrocesso)
 * @param toStep   - Etapa de destino (após o retrocesso)
 * @param flowVersion - Versão do fluxo do projeto
 * @returns CleanupScope com a lista de colunas a limpar e o motivo
 */
export function determineCleanupScope(
  fromStep: number,
  toStep: number,
  flowVersion: DiagnosticFlowVersion
): CleanupScope {
  // Sem retrocesso — nada a limpar
  if (toStep >= fromStep) {
    return { columns: [], reason: "Avanço ou permanência na mesma etapa — sem limpeza necessária" };
  }

  // Projeto sem dados de diagnóstico — nada a limpar
  if (flowVersion === "none") {
    return { columns: [], reason: "Projeto sem dados de diagnóstico (flowVersion=none)" };
  }

  const columnsToClean = new Set<string>();

  // Determinar quais etapas serão "descartadas" (etapas > toStep)
  const stepsToDiscard = Object.keys(STEP_PRODUCES_V1)
    .map(Number)
    .filter((step) => step > toStep);

  for (const step of stepsToDiscard) {
    if (flowVersion === "v1" || flowVersion === "hybrid") {
      const v1Cols = STEP_PRODUCES_V1[step] ?? [];
      v1Cols.forEach((col) => columnsToClean.add(col));
    }
    if (flowVersion === "v3" || flowVersion === "hybrid") {
      const v3Cols = STEP_PRODUCES_V3[step] ?? [];
      v3Cols.forEach((col) => columnsToClean.add(col));
    }
  }

  const columns = Array.from(columnsToClean);

  if (columns.length === 0) {
    return {
      columns: [],
      reason: `Retrocesso de etapa ${fromStep} para ${toStep} não afeta dados de diagnóstico`,
    };
  }

  return {
    columns,
    reason: `Retrocesso de etapa ${fromStep} para ${toStep} — limpando dados das etapas posteriores a ${toStep}`,
  };
}

/**
 * Executa a limpeza de dados de diagnóstico ao retroceder no fluxo.
 *
 * Limpa as colunas JSON da tabela `projects` definindo-as como NULL.
 * Para projetos V3, também deleta as respostas da tabela `questionnaireAnswersV3`
 * quando o retrocesso atinge as etapas de diagnóstico (5, 6, 7).
 *
 * @param projectId   - ID do projeto
 * @param fromStep    - Etapa atual (antes do retrocesso)
 * @param toStep      - Etapa de destino (após o retrocesso)
 * @param flowVersion - Versão do fluxo do projeto
 * @returns CleanupResult com detalhes da operação
 */
export async function executeRetrocessoCleanup(
  projectId: number,
  fromStep: number,
  toStep: number,
  flowVersion: DiagnosticFlowVersion
): Promise<CleanupResult> {
  const scope = determineCleanupScope(fromStep, toStep, flowVersion);

  // Sem colunas para limpar — retorno rápido
  if (scope.columns.length === 0) {
    return {
      cleaned: false,
      cleanedColumns: [],
      flowVersion,
      fromStep,
      toStep,
    };
  }

  const database = await getDb();
  if (!database) {
    throw new Error("[retrocesso-cleanup] Banco de dados indisponível");
  }

  // Construir objeto de atualização com NULL para cada coluna
  const updatePayload: Record<string, null> = {};
  for (const col of scope.columns) {
    updatePayload[col] = null;
  }

  // Executar limpeza na tabela projects
  await database
    .update(projects)
    .set(updatePayload as unknown as Parameters<ReturnType<typeof database.update>['set']>[0])
    .where(eq(projects.id, projectId));

  // Para projetos V3/híbrido: limpar questionnaireAnswersV3 se retrocedendo para etapa de diagnóstico
  // (etapas 5, 6, 7 produzem respostas na tabela separada)
  const diagnosticSteps = [5, 6, 7];
  const shouldClearV3Answers =
    (flowVersion === "v3" || flowVersion === "hybrid") &&
    diagnosticSteps.some((step) => step > toStep);

  if (shouldClearV3Answers) {
    // Importação dinâmica para evitar dependência circular
    const { questionnaireAnswersV3 } = await import("../drizzle/schema");
    await database
      .delete(questionnaireAnswersV3)
      .where(eq(questionnaireAnswersV3.projectId, projectId));
  }

  const cleanedColumns = [...scope.columns];
  if (shouldClearV3Answers) {
    cleanedColumns.push("questionnaireAnswersV3 (tabela)");
  }

  return {
    cleaned: true,
    cleanedColumns,
    flowVersion,
    fromStep,
    toStep,
  };
}

/**
 * Verifica se um retrocesso de etapa requer limpeza de dados.
 * Usado pelo frontend para exibir o modal de confirmação.
 *
 * @param fromStep    - Etapa atual do projeto
 * @param toStep      - Etapa de destino
 * @param flowVersion - Versão do fluxo do projeto
 * @returns true se a limpeza será necessária
 */
export function retrocessoRequiresCleanup(
  fromStep: number,
  toStep: number,
  flowVersion: DiagnosticFlowVersion
): boolean {
  const scope = determineCleanupScope(fromStep, toStep, flowVersion);
  return scope.columns.length > 0;
}

/**
 * Retorna uma mensagem descritiva para o modal de confirmação do frontend.
 *
 * @param fromStep    - Etapa atual do projeto
 * @param toStep      - Etapa de destino
 * @param flowVersion - Versão do fluxo do projeto
 * @returns Mensagem de confirmação para exibir ao usuário
 */
export function getRetrocessoWarningMessage(
  fromStep: number,
  toStep: number,
  flowVersion: DiagnosticFlowVersion
): string {
  const scope = determineCleanupScope(fromStep, toStep, flowVersion);

  if (scope.columns.length === 0) {
    return "";
  }

  const dataLabels: Record<string, string> = {
    corporateAnswers: "Respostas do diagnóstico corporativo",
    operationalAnswers: "Respostas do diagnóstico operacional",
    cnaeAnswers: "Respostas do diagnóstico por CNAE",
    briefingContent: "Briefing gerado pela IA",
    riskMatricesData: "Matrizes de riscos",
    actionPlansData: "Plano de ação",
    "questionnaireAnswersV3 (tabela)": "Respostas do questionário V3",
  };

  const dataList = scope.columns
    .map((col) => dataLabels[col] ?? col)
    .join(", ");

  return (
    `Ao retroceder para esta etapa, os seguintes dados serão removidos e precisarão ser regenerados: ${dataList}. ` +
    `Esta ação não pode ser desfeita. Deseja continuar?`
  );
}
