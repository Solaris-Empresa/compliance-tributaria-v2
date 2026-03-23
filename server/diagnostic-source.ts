/**
 * IA SOLARIS — Diagnostic Source Adapter v2.0
 * ─────────────────────────────────────────────────────────────────────────────
 * ADR-005: Adaptador centralizado de leitura de fontes de diagnóstico.
 * ADR-009: Shadow Mode integrado — controlado por DIAGNOSTIC_READ_MODE.
 *
 * REGRA ABSOLUTA:
 * Nenhum endpoint pode ler colunas de diagnóstico diretamente do banco.
 * Toda leitura passa por getDiagnosticSource().
 *
 * Fluxo V1 (questionários estáticos):
 *   - corporateAnswers, operationalAnswers, cnaeAnswers (colunas em projects)
 *   - briefing: tabela briefings
 *   - risks: tabela riskMatrix
 *   - actionPlans: tabela actionPlans
 *
 * Fluxo V3 (questionário adaptativo + IA + RAG):
 *   - questionnaireAnswers (coluna JSON em projects — snapshot consolidado)
 *   - questionnaireAnswersV3 (tabela de respostas individuais)
 *   - briefingContent (coluna TEXT em projects)
 *   - riskMatricesData (coluna JSON em projects)
 *   - actionPlansData (coluna JSON em projects)
 *
 * Determinação do fluxo:
 *   - Projetos com questionnaireAnswers preenchido → V3
 *   - Projetos com corporateAnswers OU operationalAnswers preenchido → V1
 *   - Projetos sem nenhum dado de diagnóstico → flowVersion='none' (sem dados)
 *   - Projetos com ambos preenchidos → HYBRID (estado inválido, documentado)
 *
 * IMPORTANTE: Este adaptador NÃO altera o banco. É somente leitura.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { getDb } from "./db";
import { briefings, riskMatrix, actionPlans } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  runShadowComparison,
  readNewDiagnosticSource,
  createDivergenceLogger,
  type ProjectRowForShadow,
} from "./diagnostic-shadow";

// ─────────────────────────────────────────────────────────────────────────────
// SHADOW MODE — Modo de leitura controlado por variável de ambiente
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna o modo de leitura atual do adaptador.
 * Controlado pela variável de ambiente DIAGNOSTIC_READ_MODE.
 * Default: 'legacy' (seguro para produção).
 */
export function getDiagnosticReadMode(): "legacy" | "shadow" | "new" {
  const mode = process.env.DIAGNOSTIC_READ_MODE;
  if (mode === "shadow" || mode === "new") return mode;
  return "legacy";
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type DiagnosticFlowVersion = "v1" | "v3" | "none" | "hybrid";

/** Resposta de diagnóstico V1 (questionários estáticos) */
export interface DiagnosticAnswerV1 {
  question: string;
  answer: string;
}

/** Estrutura de respostas corporativas (Fluxo V1) */
export interface CorporateAnswersV1 {
  companyType?: string;
  companySize?: string;
  taxRegime?: string;
  annualRevenueRange?: string;
  stateUF?: string;
  employeeCount?: string;
  foundingYear?: number;
  hasTaxTeam?: boolean;
  hasAudit?: boolean;
  hasTaxIssues?: boolean;
  hasInternationalOps?: boolean;
  usesTaxIncentives?: boolean;
  hasSpecialRegimes?: boolean;
  hasImportExport?: boolean;
  [key: string]: unknown;
}

/** Estrutura de respostas operacionais (Fluxo V1) */
export interface OperationalAnswersV1 {
  operationType?: string;
  clientType?: string[];
  multiState?: boolean;
  geographicScope?: string;
  usesMarketplace?: boolean;
  hasMultipleEstablishments?: boolean;
  paymentMethods?: string[];
  hasIntermediaries?: boolean;
  [key: string]: unknown;
}

/** Estrutura de respostas por CNAE (Fluxo V1) */
export interface CnaeAnswersV1 {
  [cnaeCode: string]: DiagnosticAnswerV1[];
}

/** Registro de briefing do Fluxo V1 (tabela briefings) */
export interface BriefingRecordV1 {
  id: number;
  projectId: number;
  summaryText: string;
  gapsAnalysis: string;
  riskLevel: "baixo" | "medio" | "alto" | "critico";
  priorityAreas: string | null;
  generatedAt: Date;
  generatedBy: number;
  version: number;
}

/** Registro de risco do Fluxo V1 (tabela riskMatrix) */
export interface RiskRecordV1 {
  id: number;
  projectId: number;
  [key: string]: unknown;
}

/** Registro de plano de ação do Fluxo V1 (tabela actionPlans) */
export interface ActionPlanRecordV1 {
  id: number;
  projectId: number;
  [key: string]: unknown;
}

/** Resposta do questionário V3 (snapshot consolidado em projects.questionnaireAnswers) */
export interface QuestionnaireAnswerV3 {
  cnaeCode: string;
  cnaeDescription: string;
  level: string;
  questions: Array<{ question: string; answer: string }>;
}

/**
 * Fonte de diagnóstico retornada pelo adaptador.
 * Cada campo é null quando não disponível para o fluxo do projeto.
 */
export interface DiagnosticSource {
  /** Versão do fluxo determinada pelo adaptador */
  flowVersion: DiagnosticFlowVersion;
  /** ID do projeto */
  projectId: number;

  // ── Fluxo V1 ──────────────────────────────────────────────────────────────
  /** Respostas do Questionário Corporativo (QC-01..QC-10) */
  corporateAnswers: CorporateAnswersV1 | null;
  /** Respostas do Questionário Operacional (QO-01..QO-10) */
  operationalAnswers: OperationalAnswersV1 | null;
  /** Respostas do Questionário Especializado por CNAE */
  cnaeAnswers: CnaeAnswersV1 | null;
  /** Briefing gerado pelo Fluxo V1 (tabela briefings) — carregado sob demanda */
  briefingV1: BriefingRecordV1 | null;
  /** Riscos gerados pelo Fluxo V1 (tabela riskMatrix) — carregado sob demanda */
  risksV1: RiskRecordV1[] | null;
  /** Planos de ação gerados pelo Fluxo V1 (tabela actionPlans) — carregado sob demanda */
  actionPlansV1: ActionPlanRecordV1[] | null;

  // ── Fluxo V3 ──────────────────────────────────────────────────────────────
  /** Snapshot consolidado das respostas do questionário V3 */
  questionnaireAnswersV3: QuestionnaireAnswerV3[] | null;
  /** Briefing gerado pelo Fluxo V3 (coluna briefingContent em projects) */
  briefingContentV3: string | null;
  /** Matrizes de riscos geradas pelo Fluxo V3 (coluna riskMatricesData em projects) */
  riskMatricesDataV3: Record<string, unknown[]> | null;
  /** Planos de ação gerados pelo Fluxo V3 (coluna actionPlansData em projects) */
  actionPlansDataV3: Record<string, unknown[]> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINAÇÃO DO FLUXO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determina o fluxo de diagnóstico de um projeto com base nos dados presentes.
 *
 * Lógica:
 * - V3: questionnaireAnswers preenchido (snapshot V3 existe)
 * - V1: corporateAnswers OU operationalAnswers preenchido (sem snapshot V3)
 * - hybrid: ambos preenchidos (estado inválido — documentado, não bloqueante)
 * - none: nenhum dado de diagnóstico presente
 */
export function determineFlowVersion(project: {
  questionnaireAnswers: unknown;
  corporateAnswers: unknown;
  operationalAnswers: unknown;
}): DiagnosticFlowVersion {
  const hasV3 = project.questionnaireAnswers != null;
  const hasV1 = project.corporateAnswers != null || project.operationalAnswers != null;

  if (hasV3 && hasV1) return "hybrid";
  if (hasV3) return "v3";
  if (hasV1) return "v1";
  return "none";
}

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTADOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ponto único de leitura de dados de diagnóstico.
 *
 * @param projectId - ID do projeto
 * @param options.loadV1Tables - Se true, carrega tabelas V1 (briefings, riskMatrix, actionPlans).
 *                               Default: false (carregamento lazy para performance).
 * @throws TRPCError NOT_FOUND se o projeto não existe
 * @throws TRPCError INTERNAL_SERVER_ERROR se o banco não está disponível
 */
export async function getDiagnosticSource(
  projectId: number,
  options: { loadV1Tables?: boolean } = {}
): Promise<DiagnosticSource> {
  const database = await getDb();
  if (!database) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "[getDiagnosticSource] Banco de dados não disponível",
    });
  }

  // Buscar projeto via helper centralizado (compatível com mocks de teste)
  const project = await db.getProjectById(projectId);

  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `[getDiagnosticSource] Projeto ${projectId} não encontrado`,
    });
  }
  const flowVersion = determineFlowVersion({
    questionnaireAnswers: project.questionnaireAnswers,
    corporateAnswers: project.corporateAnswers,
    operationalAnswers: project.operationalAnswers,
  });

  // ── Dados V3 (colunas em projects) ────────────────────────────────────────
  const questionnaireAnswersV3 = flowVersion === "v3" || flowVersion === "hybrid"
    ? (project.questionnaireAnswers as QuestionnaireAnswerV3[] | null) ?? null
    : null;

  const briefingContentV3 = flowVersion === "v3" || flowVersion === "hybrid"
    ? ((project as Record<string, unknown>).briefingContent as string | null) ?? null
    : null;

  const riskMatricesDataV3 = flowVersion === "v3" || flowVersion === "hybrid"
    ? ((project as Record<string, unknown>).riskMatricesData as Record<string, unknown[]> | null) ?? null
    : null;

  const actionPlansDataV3 = flowVersion === "v3" || flowVersion === "hybrid"
    ? ((project as Record<string, unknown>).actionPlansData as Record<string, unknown[]> | null) ?? null
    : null;

  // ── Dados V1 (colunas em projects) ────────────────────────────────────────
  const corporateAnswers = flowVersion === "v1" || flowVersion === "hybrid"
    ? (project.corporateAnswers as CorporateAnswersV1 | null) ?? null
    : null;

  const operationalAnswers = flowVersion === "v1" || flowVersion === "hybrid"
    ? (project.operationalAnswers as OperationalAnswersV1 | null) ?? null
    : null;

  const cnaeAnswers = flowVersion === "v1" || flowVersion === "hybrid"
    ? (project.cnaeAnswers as CnaeAnswersV1 | null) ?? null
    : null;

  // ── Dados V1 (tabelas separadas) — carregados sob demanda ─────────────────
  let briefingV1: BriefingRecordV1 | null = null;
  let risksV1: RiskRecordV1[] | null = null;
  let actionPlansV1: ActionPlanRecordV1[] | null = null;

  if (options.loadV1Tables && (flowVersion === "v1" || flowVersion === "hybrid")) {
    const briefingRows = await database
      .select()
      .from(briefings)
      .where(eq(briefings.projectId, projectId))
      .limit(1);
    briefingV1 = (briefingRows[0] as BriefingRecordV1 | undefined) ?? null;

    const riskRows = await database
      .select()
      .from(riskMatrix)
      .where(eq(riskMatrix.projectId, projectId));
    risksV1 = riskRows as RiskRecordV1[];

    const planRows = await database
      .select()
      .from(actionPlans)
      .where(eq(actionPlans.projectId, projectId));
    actionPlansV1 = planRows as ActionPlanRecordV1[];
  }

  // ── Shadow Mode / New Mode (ADR-009) ──────────────────────────────────────
  const readMode = getDiagnosticReadMode();

  if (readMode === "shadow") {
    // Shadow: lê legadas + novas, compara, loga divergências, retorna legadas
    const projectRow: ProjectRowForShadow = {
      id: project.id,
      questionnaireAnswers: project.questionnaireAnswers,
      corporateAnswers: project.corporateAnswers,
      operationalAnswers: project.operationalAnswers,
      briefingContent: (project as Record<string, unknown>).briefingContent as string | null ?? null,
      riskMatricesData: (project as Record<string, unknown>).riskMatricesData ?? null,
      actionPlansData: (project as Record<string, unknown>).actionPlansData ?? null,
      briefingContentV1: (project as Record<string, unknown>).briefingContentV1 as string | null ?? null,
      briefingContentV3: (project as Record<string, unknown>).briefingContentV3 as string | null ?? null,
      riskMatricesDataV1: (project as Record<string, unknown>).riskMatricesDataV1 ?? null,
      riskMatricesDataV3: (project as Record<string, unknown>).riskMatricesDataV3 ?? null,
      actionPlansDataV1: (project as Record<string, unknown>).actionPlansDataV1 ?? null,
      actionPlansDataV3: (project as Record<string, unknown>).actionPlansDataV3 ?? null,
    };
    const logger = createDivergenceLogger();
    // Fire-and-forget: não bloqueia o fluxo principal
    runShadowComparison(projectRow, logger).catch((err) =>
      console.error("[getDiagnosticSource] Shadow comparison error:", err)
    );
    // Retorna dados legados (invariante de produção)
  } else if (readMode === "new") {
    // New: lê apenas novas colunas V1/V3 (ativar somente após divergência = 0%)
    const projectRow: ProjectRowForShadow = {
      id: project.id,
      questionnaireAnswers: project.questionnaireAnswers,
      corporateAnswers: project.corporateAnswers,
      operationalAnswers: project.operationalAnswers,
      briefingContent: (project as Record<string, unknown>).briefingContent as string | null ?? null,
      riskMatricesData: (project as Record<string, unknown>).riskMatricesData ?? null,
      actionPlansData: (project as Record<string, unknown>).actionPlansData ?? null,
      briefingContentV1: (project as Record<string, unknown>).briefingContentV1 as string | null ?? null,
      briefingContentV3: (project as Record<string, unknown>).briefingContentV3 as string | null ?? null,
      riskMatricesDataV1: (project as Record<string, unknown>).riskMatricesDataV1 ?? null,
      riskMatricesDataV3: (project as Record<string, unknown>).riskMatricesDataV3 ?? null,
      actionPlansDataV1: (project as Record<string, unknown>).actionPlansDataV1 ?? null,
      actionPlansDataV3: (project as Record<string, unknown>).actionPlansDataV3 ?? null,
    };
    const newResult = readNewDiagnosticSource(projectRow);
    // Override os campos de conteúdo com os novos
    return {
      flowVersion,
      projectId,
      corporateAnswers,
      operationalAnswers,
      cnaeAnswers,
      briefingV1,
      risksV1,
      actionPlansV1,
      questionnaireAnswersV3,
      briefingContentV3: newResult.briefingContent,
      riskMatricesDataV3: newResult.riskMatricesData as Record<string, unknown[]> | null,
      actionPlansDataV3: newResult.actionPlansData as Record<string, unknown[]> | null,
    };
  }

  // Legacy (default): retorna dados das colunas legadas
  return {
    flowVersion,
    projectId,
    // V1
    corporateAnswers,
    operationalAnswers,
    cnaeAnswers,
    briefingV1,
    risksV1,
    actionPlansV1,
    // V3
    questionnaireAnswersV3,
    briefingContentV3,
    riskMatricesDataV3,
    actionPlansDataV3,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guard de escrita: lança erro se o endpoint tenta operar no fluxo errado.
 * Deve ser chamado no início de cada endpoint de geração.
 *
 * @param source - DiagnosticSource retornado pelo adaptador
 * @param expected - Fluxo esperado ('v1' ou 'v3')
 * @param endpointName - Nome do endpoint para mensagem de erro
 * @throws TRPCError FORBIDDEN se o fluxo não corresponde ao esperado
 */
export function assertFlowVersion(
  source: Pick<DiagnosticSource, "flowVersion" | "projectId">,
  expected: "v1" | "v3",
  endpointName: string
): void {
  if (source.flowVersion === "none") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `[${endpointName}] Projeto ${source.projectId} não possui dados de diagnóstico. Preencha o perfil antes de gerar o diagnóstico.`,
    });
  }

  if (source.flowVersion === "hybrid") {
    // Estado híbrido é documentado mas não bloqueante — log de auditoria
    console.warn(
      `[assertFlowVersion] HYBRID STATE detectado no projeto ${source.projectId}. ` +
      `Endpoint ${endpointName} esperava ${expected}. ` +
      `Estado híbrido indica dados de ambos os fluxos — possível migração incompleta.`
    );
    // Não lança erro para não bloquear projetos em transição
    return;
  }

  if (source.flowVersion !== expected) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        `[${endpointName}] Projeto ${source.projectId} usa o Fluxo ${source.flowVersion.toUpperCase()}. ` +
        `Este endpoint pertence ao Fluxo ${expected.toUpperCase()}. ` +
        `Acesso negado para prevenir mistura de dados.`,
    });
  }
}

/**
 * Verifica se um projeto tem dados de diagnóstico V3 suficientes para gerar briefing.
 * Retorna null se OK, ou string de erro se insuficiente.
 */
export function validateV3DataSufficiency(source: DiagnosticSource): string | null {
  if (source.flowVersion !== "v3" && source.flowVersion !== "hybrid") {
    return `Projeto não é do Fluxo V3 (flowVersion=${source.flowVersion})`;
  }
  if (!source.questionnaireAnswersV3 || source.questionnaireAnswersV3.length === 0) {
    return "Questionário V3 não preenchido — nenhuma resposta encontrada";
  }
  return null; // OK
}

/**
 * Verifica se um projeto tem dados de diagnóstico V1 suficientes para gerar briefing.
 * Retorna null se OK, ou string de erro se insuficiente.
 */
export function validateV1DataSufficiency(source: DiagnosticSource): string | null {
  if (source.flowVersion !== "v1" && source.flowVersion !== "hybrid") {
    return `Projeto não é do Fluxo V1 (flowVersion=${source.flowVersion})`;
  }
  if (!source.corporateAnswers && !source.operationalAnswers) {
    return "Questionários V1 não preenchidos — corporateAnswers e operationalAnswers ausentes";
  }
  return null; // OK
}
