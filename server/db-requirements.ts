/**
 * db-requirements.ts — Requirement Engine (B2)
 * Sprint 98% Confidence — ADR-010 v1.1
 *
 * Helpers de query para o Requirement Engine.
 * Implementa a lógica de aplicabilidade de requisitos por perfil de empresa.
 *
 * PONTOS INVIOLÁVEIS (Orquestrador):
 * 1. requirement_id obrigatório em toda a cadeia
 * 2. coverage = 100% com qualidade (4 critérios simultâneos)
 * 3. pergunta sem fonte = impossível
 */

import { eq, and, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { regulatoryRequirementsV3, projectGapsV3 } from "../drizzle/schema-compliance-engine-v3";
import { projects } from "../drizzle/schema";

// ---------------------------------------------------------------------------
// Tipos canônicos (ADR-010 v1.1)
// ---------------------------------------------------------------------------

export interface ApplicableRequirement {
  id: number;
  code: string;
  name: string;
  description: string;
  domain: string;
  assessmentOrder: number;
  baseCriticality: "baixa" | "media" | "alta" | "critica";
  defaultGapType: string;
  gapLevel: string;
  evaluationCriteria: string[];
  evidenceRequired: string[];
  tags: string[];
  legalReference: string | null;
  legalArticle: string | null;
  applicabilityReason: string; // Por que este requisito se aplica ao perfil
}

export interface CoverageReport {
  projectId: number;
  totalApplicable: number;
  totalFullyCovered: number;       // 4 critérios simultâneos
  totalPendingQuestion: number;    // quality_gate_status = pending_valid_question
  totalNoValidQuestion: number;    // quality_gate_status = no_valid_question_generated
  totalAnswered: number;
  totalGapClassified: number;
  totalEvidenceSufficient: number;
  coveragePercent: number;         // Fórmula corrigida ADR-010: 4 critérios / aplicáveis
  pendingRequirementIds: string[]; // Bloqueadores do gate
  noValidQuestionIds: string[];    // Requisitos sem pergunta válida após 2 tentativas
  gateApproved: boolean;           // true somente quando coveragePercent === 100
  calculatedAt: Date;
}

export interface RequirementWithCoverageStatus extends ApplicableRequirement {
  coverageStatus: "fully_covered" | "pending_question" | "no_valid_question" | "pending_answer" | "pending_gap" | "pending_evidence";
  questionQualityStatus: string | null;
  gapStatus: string | null;
  evidenceStatus: string | null;
}

// ---------------------------------------------------------------------------
// Helpers de aplicabilidade
// ---------------------------------------------------------------------------

/**
 * Retorna os requisitos aplicáveis ao perfil do projeto.
 * Lógica de aplicabilidade:
 * - Todos os requisitos ativos são aplicáveis por padrão
 * - Requisitos com tag "marketplace" só se aplicam se financialProfile.paymentMethods inclui "marketplace"
 * - Requisitos com tag "internacional" só se aplicam se taxComplexity.hasInternationalOps === true
 * - Requisitos com tag "incentivo_fiscal" só se aplicam se taxComplexity.usesTaxIncentives === true
 * - Requisitos com tag "multi_estado" só se aplicam se operationProfile.multiState === true
 */
export async function getApplicableRequirements(projectId: number): Promise<ApplicableRequirement[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar perfil do projeto
  const projectRows = await db
    .select({
      operationProfile: projects.operationProfile,
      taxComplexity: projects.taxComplexity,
      financialProfile: projects.financialProfile,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!projectRows.length) throw new Error(`Project ${projectId} not found`);

  const proj = projectRows[0];
  const opProfile = (proj.operationProfile as Record<string, unknown> | null) ?? {};
  const taxComp = (proj.taxComplexity as Record<string, unknown> | null) ?? {};
  const finProfile = (proj.financialProfile as Record<string, unknown> | null) ?? {};

  const hasInternational = taxComp.hasInternationalOps === true;
  const usesTaxIncentives = taxComp.usesTaxIncentives === true;
  const usesMarketplace = Array.isArray(finProfile.paymentMethods)
    ? (finProfile.paymentMethods as string[]).includes("marketplace")
    : false;
  const isMultiState = opProfile.multiState === true;

  // Buscar todos os requisitos ativos
  const allReqs = await db
    .select()
    .from(regulatoryRequirementsV3)
    .where(eq(regulatoryRequirementsV3.active, true))
    .orderBy(regulatoryRequirementsV3.assessmentOrder);

  // Filtrar por aplicabilidade
  const applicable: ApplicableRequirement[] = [];

  for (const req of allReqs) {
    const tags = parseJsonField<string[]>(req.tags, []);

    // Verificar exclusões por tag
    if (tags.includes("marketplace") && !usesMarketplace) continue;
    if (tags.includes("internacional") && !hasInternational) continue;
    if (tags.includes("incentivo_fiscal") && !usesTaxIncentives) continue;
    if (tags.includes("multi_estado") && !isMultiState) continue;

    // Determinar razão de aplicabilidade
    let applicabilityReason = "Requisito universal — aplica-se a todas as empresas";
    if (tags.includes("marketplace")) applicabilityReason = "Empresa usa marketplace como método de pagamento";
    if (tags.includes("internacional")) applicabilityReason = "Empresa possui operações internacionais";
    if (tags.includes("incentivo_fiscal")) applicabilityReason = "Empresa utiliza incentivos fiscais";
    if (tags.includes("multi_estado")) applicabilityReason = "Empresa opera em múltiplos estados";

    applicable.push({
      id: req.id,
      code: req.code,
      name: req.name,
      description: req.description,
      domain: req.domain,
      assessmentOrder: req.assessmentOrder,
      baseCriticality: req.baseCriticality,
      defaultGapType: req.defaultGapType,
      gapLevel: req.gapLevel,
      evaluationCriteria: parseJsonField<string[]>(req.evaluationCriteria, []),
      evidenceRequired: parseJsonField<string[]>(req.evidenceRequired, []),
      tags,
      legalReference: req.legalReference,
      legalArticle: req.legalArticle,
      applicabilityReason,
    });
  }

  return applicable;
}

/**
 * Calcula o Coverage Report com a fórmula corrigida do ADR-010 (4 critérios simultâneos).
 *
 * Um requisito é "fully_covered" somente quando TODOS os 4 critérios são atendidos:
 * 1. Pergunta válida (quality_gate_status = "approved")
 * 2. Resposta válida (gap existe com evidence não vazio)
 * 3. Gap classificado (compliance_status definido, não nulo)
 * 4. Evidência suficiente (evidence_status = "completa" ou "parcial")
 */
export async function getCoverageReport(projectId: number, userId: number): Promise<CoverageReport> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar requisitos aplicáveis
  const applicable = await getApplicableRequirements(projectId);
  const totalApplicable = applicable.length;

  if (totalApplicable === 0) {
    return {
      projectId,
      totalApplicable: 0,
      totalFullyCovered: 0,
      totalPendingQuestion: 0,
      totalNoValidQuestion: 0,
      totalAnswered: 0,
      totalGapClassified: 0,
      totalEvidenceSufficient: 0,
      coveragePercent: 0,
      pendingRequirementIds: [],
      noValidQuestionIds: [],
      gateApproved: false,
      calculatedAt: new Date(),
    };
  }

  // Buscar gaps existentes para o projeto
  const gaps = await db
    .select()
    .from(projectGapsV3)
    .where(and(
      eq(projectGapsV3.clientId, userId),
      eq(projectGapsV3.projectId, projectId),
    ));

  // Buscar mapeamento de perguntas (requirement_question_mapping)
  const applicableCodes = applicable.map(r => r.code);
  const [mappingRows] = await db.execute(
    sql`SELECT canonical_id, question_quality_status FROM requirement_question_mapping WHERE canonical_id IN (${sql.join(applicableCodes.map(c => sql`${c}`), sql`, `)})`
  ) as unknown as [Array<{ canonical_id: string; question_quality_status: string | null }>];

  const questionStatusByCode = new Map<string, string | null>();
  for (const row of mappingRows) {
    questionStatusByCode.set(row.canonical_id, row.question_quality_status);
  }

  // Calcular cobertura por requisito
  let totalFullyCovered = 0;
  let totalPendingQuestion = 0;
  let totalNoValidQuestion = 0;
  let totalAnswered = 0;
  let totalGapClassified = 0;
  let totalEvidenceSufficient = 0;
  const pendingRequirementIds: string[] = [];
  const noValidQuestionIds: string[] = [];

  for (const req of applicable) {
    const questionStatus = questionStatusByCode.get(req.code) ?? null;
    const gap = gaps.find(g => g.requirementCode === req.code);

    // Critério 1: Pergunta válida
    const hasValidQuestion = questionStatus === "approved";

    // Critério 2: Resposta válida (gap existe com evidence)
    const hasValidAnswer = gap !== undefined && gap.gapDescription !== null && gap.gapDescription.length > 0;

    // Critério 3: Gap classificado
    const hasGapClassified = gap !== undefined && gap.complianceStatus !== null;

    // Critério 4: Evidência suficiente
    const hasEvidenceSufficient = gap !== undefined &&
      (gap.evidenceStatus === "completa" || gap.evidenceStatus === "parcial");

    if (hasValidAnswer) totalAnswered++;
    if (hasGapClassified) totalGapClassified++;
    if (hasEvidenceSufficient) totalEvidenceSufficient++;

    // Verificar quality gate status
    if (questionStatus === "no_valid_question_generated") {
      totalNoValidQuestion++;
      noValidQuestionIds.push(req.code);
    } else if (!hasValidQuestion) {
      totalPendingQuestion++;
      pendingRequirementIds.push(req.code);
    }

    // Fully covered = 4 critérios simultâneos
    if (hasValidQuestion && hasValidAnswer && hasGapClassified && hasEvidenceSufficient) {
      totalFullyCovered++;
    } else if (questionStatus !== "no_valid_question_generated") {
      // Adicionar aos pendentes se não está bloqueado por no_valid_question
      if (!pendingRequirementIds.includes(req.code)) {
        pendingRequirementIds.push(req.code);
      }
    }
  }

  const coveragePercent = totalApplicable > 0
    ? Math.round((totalFullyCovered / totalApplicable) * 10000) / 100
    : 0;

  const gateApproved = coveragePercent === 100 &&
    pendingRequirementIds.length === 0 &&
    noValidQuestionIds.length === 0;

  return {
    projectId,
    totalApplicable,
    totalFullyCovered,
    totalPendingQuestion,
    totalNoValidQuestion,
    totalAnswered,
    totalGapClassified,
    totalEvidenceSufficient,
    coveragePercent,
    pendingRequirementIds,
    noValidQuestionIds,
    gateApproved,
    calculatedAt: new Date(),
  };
}

/**
 * Retorna os requisitos aplicáveis com status de cobertura por requisito.
 * Usado para o dashboard de coverage do projeto.
 */
export async function getRequirementsWithCoverageStatus(
  projectId: number,
  userId: number,
): Promise<RequirementWithCoverageStatus[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const applicable = await getApplicableRequirements(projectId);

  const gaps = await db
    .select()
    .from(projectGapsV3)
    .where(and(
      eq(projectGapsV3.clientId, userId),
      eq(projectGapsV3.projectId, projectId),
    ));

  const applicableCodes = applicable.map(r => r.code);
  const [mappingRows] = await db.execute(
    sql`SELECT canonical_id, question_quality_status FROM requirement_question_mapping WHERE canonical_id IN (${sql.join(applicableCodes.map(c => sql`${c}`), sql`, `)})`
  ) as unknown as [Array<{ canonical_id: string; question_quality_status: string | null }>];

  const questionStatusByCode = new Map<string, string | null>();
  for (const row of mappingRows) {
    questionStatusByCode.set(row.canonical_id, row.question_quality_status);
  }

  return applicable.map(req => {
    const questionStatus = questionStatusByCode.get(req.code) ?? null;
    const gap = gaps.find(g => g.requirementCode === req.code);

    const hasValidQuestion = questionStatus === "approved";
    const hasValidAnswer = gap !== undefined && gap.gapDescription !== null && gap.gapDescription.length > 0;
    const hasGapClassified = gap !== undefined && gap.complianceStatus !== null;
    const hasEvidenceSufficient = gap !== undefined &&
      (gap.evidenceStatus === "completa" || gap.evidenceStatus === "parcial");

    let coverageStatus: RequirementWithCoverageStatus["coverageStatus"];
    if (hasValidQuestion && hasValidAnswer && hasGapClassified && hasEvidenceSufficient) {
      coverageStatus = "fully_covered";
    } else if (questionStatus === "no_valid_question_generated") {
      coverageStatus = "no_valid_question";
    } else if (!hasValidQuestion) {
      coverageStatus = "pending_question";
    } else if (!hasValidAnswer) {
      coverageStatus = "pending_answer";
    } else if (!hasGapClassified) {
      coverageStatus = "pending_gap";
    } else {
      coverageStatus = "pending_evidence";
    }

    return {
      ...req,
      coverageStatus,
      questionQualityStatus: questionStatus,
      gapStatus: gap?.complianceStatus ?? null,
      evidenceStatus: gap?.evidenceStatus ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Utilitários internos
// ---------------------------------------------------------------------------

function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as unknown as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
