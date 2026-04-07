/**
 * Schema — Compliance Engine v3 (Motor Determinístico)
 * Solaris Compliance — Sprint 6 (Go-Live Ready)
 *
 * Tabelas novas (não conflitam com schema.ts existente):
 *   regulatory_requirements_v3   — 138 requisitos canônicos (seed)
 *   project_assessments_v3       — respostas do assessment por requisito
 *   project_scores_v3            — scores calculados (weightedScore, riskLevel, etc.)
 *   project_gaps_v3              — gaps estruturados (gapType, priorityScore, etc.)
 *   project_risks_v3             — matriz de risco 4×4
 *   project_actions_v3           — plano de ação estruturado
 *   project_tasks_v3             — tarefas atômicas com executionOrder
 *   project_snapshots_v3         — cache de snapshot (Sprint 6 ajuste 1)
 *
 * Convenções:
 *   - Todos os campos de ID são int autoincrement (MySQL/TiDB)
 *   - organization_id = projectId do projeto pai (multi-tenant via clientId)
 *   - Timestamps em UTC (defaultNow)
 *   - JSON armazenado como text (MySQL não tem tipo JSON nativo no Drizzle MySQL core)
 *   - analysis_version: int para versionamento (Sprint 6 ajuste 2)
 *   - confidence_score_global: decimal (Sprint 6 ajuste 3)
 */

import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  mysqlEnum,
  decimal,
} from "drizzle-orm/mysql-core";

// ---------------------------------------------------------------------------
// Enums MySQL
// ---------------------------------------------------------------------------

const CRITICALITY = ["baixa", "media", "alta", "critica"] as const;
const GAP_TYPE = ["normativo", "processo", "sistema", "cadastro", "contrato", "financeiro", "acessorio"] as const;
const GAP_LEVEL = ["estrategico", "tatico", "operacional", "tecnico"] as const;
const COMPLIANCE_STATUS = ["atendido", "parcialmente_atendido", "nao_atendido", "nao_aplicavel"] as const;
const RISK_LEVEL = ["baixo", "medio", "alto", "critico"] as const;
const RISK_DIMENSION = ["regulatorio", "operacional", "financeiro", "reputacional"] as const;
const ACTION_PRIORITY = ["imediata", "curto_prazo", "medio_prazo", "planejamento"] as const;
const ACTION_STATUS = ["nao_iniciado", "em_andamento", "em_revisao", "concluido", "cancelado"] as const;
const ACTION_TYPE = [
  "configuracao_erp", "ajuste_cadastro", "revisao_contrato", "parametrizacao_fiscal",
  "obrigacao_acessoria", "documentacao", "treinamento", "integracao", "governanca", "conciliacao",
] as const;
const TASK_TYPE = [
  "analise", "documentacao", "configuracao", "treinamento", "validacao",
  "aprovacao", "comunicacao", "integracao", "teste", "go_live",
] as const;
const TASK_STATUS = ["nao_iniciado", "em_andamento", "em_revisao", "concluido", "bloqueado"] as const;
const EVIDENCE_STATUS = ["completa", "parcial", "ausente"] as const;
const OPERATIONAL_DEPENDENCY = ["alta", "media", "baixa"] as const;

// ---------------------------------------------------------------------------
// regulatory_requirements_v3
// ---------------------------------------------------------------------------

export const regulatoryRequirementsV3 = mysqlTable("regulatory_requirements_v3", {
  id: int("id").autoincrement().primaryKey(),

  // Identificação canônica
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  domain: varchar("domain", { length: 100 }).notNull(),
  assessmentOrder: int("assessment_order").notNull(),

  // Classificação
  baseCriticality: mysqlEnum("base_criticality", CRITICALITY).notNull(),
  defaultGapType: mysqlEnum("default_gap_type", GAP_TYPE).notNull(),
  gapLevel: mysqlEnum("gap_level", GAP_LEVEL).notNull(),

  // Critérios de avaliação (JSON array de strings)
  evaluationCriteria: text("evaluation_criteria").notNull(), // JSON: string[]
  evidenceRequired: text("evidence_required").notNull(),     // JSON: string[]
  tags: text("tags"),                                        // JSON: string[]

  // Referência legal
  legalReference: varchar("legal_reference", { length: 255 }),
  legalArticle: varchar("legal_article", { length: 100 }),

  // Metadados
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type RegulatoryRequirementV3 = typeof regulatoryRequirementsV3.$inferSelect;
export type InsertRegulatoryRequirementV3 = typeof regulatoryRequirementsV3.$inferInsert;

// ---------------------------------------------------------------------------
// project_assessments_v3
// ---------------------------------------------------------------------------

export const projectAssessmentsV3 = mysqlTable("project_assessments_v3", {
  id: int("id").autoincrement().primaryKey(),

  // Multi-tenant
  clientId: int("client_id").notNull(),
  projectId: int("project_id").notNull(),

  // Requisito avaliado
  requirementCode: varchar("requirement_code", { length: 32 }).notNull(),

  // Inputs do assessment (0–100)
  criteriaCoverage: decimal("criteria_coverage", { precision: 5, scale: 2 }).notNull(),
  evidenceCoverage: decimal("evidence_coverage", { precision: 5, scale: 2 }).notNull(),
  operationalReadiness: decimal("operational_readiness", { precision: 5, scale: 2 }).notNull(),

  // Enriquecimento opcional
  aiScore: decimal("ai_score", { precision: 5, scale: 2 }),
  notes: text("notes"),

  // Versionamento (Sprint 6 ajuste 2)
  analysisVersion: int("analysis_version").default(1).notNull(),

  // Metadados
  answeredById: int("answered_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProjectAssessmentV3 = typeof projectAssessmentsV3.$inferSelect;
export type InsertProjectAssessmentV3 = typeof projectAssessmentsV3.$inferInsert;

// ---------------------------------------------------------------------------
// project_scores_v3
// ---------------------------------------------------------------------------

export const projectScoresV3 = mysqlTable("project_scores_v3", {
  id: int("id").autoincrement().primaryKey(),

  // Multi-tenant
  clientId: int("client_id").notNull(),
  projectId: int("project_id").notNull(),
  requirementCode: varchar("requirement_code", { length: 32 }).notNull(),

  // Score calculado
  criteriaCoverage: decimal("criteria_coverage", { precision: 5, scale: 2 }).notNull(),
  evidenceCoverage: decimal("evidence_coverage", { precision: 5, scale: 2 }).notNull(),
  operationalReadiness: decimal("operational_readiness", { precision: 5, scale: 2 }).notNull(),
  baseScore: decimal("base_score", { precision: 5, scale: 2 }).notNull(),
  weightedScore: decimal("weighted_score", { precision: 5, scale: 2 }).notNull(),
  aiScore: decimal("ai_score", { precision: 5, scale: 2 }),
  finalScore: decimal("final_score", { precision: 5, scale: 2 }).notNull(),

  // Classificação
  complianceStatus: mysqlEnum("compliance_status", COMPLIANCE_STATUS).notNull(),
  riskLevel: mysqlEnum("risk_level", RISK_LEVEL).notNull(),
  effectiveCriticality: mysqlEnum("effective_criticality", CRITICALITY).notNull(),
  criticalEvidenceFlag: boolean("critical_evidence_flag").default(false).notNull(),
  gapType: mysqlEnum("gap_type", GAP_TYPE).notNull(),

  // Versionamento
  analysisVersion: int("analysis_version").default(1).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProjectScoreV3 = typeof projectScoresV3.$inferSelect;
export type InsertProjectScoreV3 = typeof projectScoresV3.$inferInsert;

// ---------------------------------------------------------------------------
// project_gaps_v3
// ---------------------------------------------------------------------------

export const projectGapsV3 = mysqlTable("project_gaps_v3", {
  id: int("id").autoincrement().primaryKey(),

  // Multi-tenant
  clientId: int("client_id").notNull(),
  projectId: int("project_id").notNull(),
  requirementCode: varchar("requirement_code", { length: 32 }).notNull(),
  requirementName: varchar("requirement_name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 100 }).notNull(),

  // Classificação do gap
  gapLevel: mysqlEnum("gap_level", GAP_LEVEL).notNull(),
  gapType: mysqlEnum("gap_type", GAP_TYPE).notNull(),
  complianceStatus: mysqlEnum("compliance_status", COMPLIANCE_STATUS).notNull(),
  criticality: mysqlEnum("criticality", CRITICALITY).notNull(),
  evidenceStatus: mysqlEnum("evidence_status", EVIDENCE_STATUS).notNull(),
  operationalDependency: mysqlEnum("operational_dependency", OPERATIONAL_DEPENDENCY).notNull(),

  // Scores
  score: decimal("score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: mysqlEnum("risk_level", RISK_LEVEL).notNull(),
  priorityScore: decimal("priority_score", { precision: 5, scale: 2 }).notNull(),
  criticalEvidenceFlag: boolean("critical_evidence_flag").default(false).notNull(),

  // Plano
  actionPriority: mysqlEnum("action_priority", ACTION_PRIORITY).notNull(),
  estimatedDays: int("estimated_days").notNull(),

  // Narrativa
  gapDescription: text("gap_description").notNull(),
  deterministicReason: text("deterministic_reason").notNull(),
  aiReason: text("ai_reason"),
  unmetCriteria: text("unmet_criteria").notNull(),     // JSON: string[]
  recommendedActions: text("recommended_actions").notNull(), // JSON: string[]

  // Versionamento
  analysisVersion: int("analysis_version").default(1).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProjectGapV3 = typeof projectGapsV3.$inferSelect;
export type InsertProjectGapV3 = typeof projectGapsV3.$inferInsert;

// ---------------------------------------------------------------------------
// project_risks_v3
// ---------------------------------------------------------------------------

export const projectRisksV3 = mysqlTable("project_risks_v3", {
  id: int("id").autoincrement().primaryKey(),

  // Multi-tenant
  clientId: int("client_id").notNull(),
  projectId: int("project_id").notNull(),

  // Identificação
  riskCode: varchar("risk_code", { length: 32 }).notNull(),
  requirementCode: varchar("requirement_code", { length: 32 }).notNull(),
  requirementName: varchar("requirement_name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 100 }).notNull(),
  gapType: mysqlEnum("gap_type", GAP_TYPE).notNull(),

  // Matriz 4×4
  probability: int("probability").notNull(),   // 1–4
  impact: int("impact").notNull(),             // 1–4
  riskScore: int("risk_score").notNull(),      // 1–16
  riskScoreNormalized: int("risk_score_normalized").notNull(), // 0–100
  riskLevel: mysqlEnum("risk_level", RISK_LEVEL).notNull(),

  // Dimensão e impacto financeiro
  riskDimension: mysqlEnum("risk_dimension", RISK_DIMENSION).notNull(),
  financialImpactPercent: decimal("financial_impact_percent", { precision: 5, scale: 4 }).notNull(),
  financialImpactDescription: text("financial_impact_description").notNull(),

  // Mitigação
  mitigationStrategy: text("mitigation_strategy").notNull(),

  // ADR-0013: Categoria canônica LC 214/2025 (risk_category_l2)
  // ADD COLUMN IF NOT EXISTS — não-destrutivo (Issue #62 — nunca DROP COLUMN)
  // Valores: imposto_seletivo | ibs_cbs | regime_diferenciado | aliquota_reduzida |
  //          aliquota_zero | split_payment | cadastro_fiscal | obrigacao_acessoria |
  //          transicao | enquadramento_geral
  riskCategoryL2: varchar("risk_category_l2", { length: 100 }),

  // Versionamento
  analysisVersion: int("analysis_version").default(1).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProjectRiskV3 = typeof projectRisksV3.$inferSelect;
export type InsertProjectRiskV3 = typeof projectRisksV3.$inferInsert;

// ---------------------------------------------------------------------------
// project_actions_v3
// ---------------------------------------------------------------------------

export const projectActionsV3 = mysqlTable("project_actions_v3", {
  id: int("id").autoincrement().primaryKey(),

  // Multi-tenant
  clientId: int("client_id").notNull(),
  projectId: int("project_id").notNull(),

  // Rastreabilidade
  requirementCode: varchar("requirement_code", { length: 32 }).notNull(),
  riskCode: varchar("risk_code", { length: 32 }).notNull(),
  domain: varchar("domain", { length: 100 }).notNull(),
  gapType: mysqlEnum("gap_type", GAP_TYPE).notNull(),

  // Identificação
  actionCode: varchar("action_code", { length: 32 }).notNull(),
  actionName: varchar("action_name", { length: 255 }).notNull(),
  actionDesc: text("action_desc").notNull(),
  actionType: mysqlEnum("action_type", ACTION_TYPE).notNull(),

  // Prioridade e prazo
  actionPriority: mysqlEnum("action_priority", ACTION_PRIORITY).notNull(),
  estimatedDays: int("estimated_days").notNull(),
  dueDate: timestamp("due_date"),

  // Responsável
  ownerSuggestion: varchar("owner_suggestion", { length: 255 }).notNull(),

  // Status de execução
  status: mysqlEnum("status", ACTION_STATUS).default("nao_iniciado").notNull(),
  progressPercent: int("progress_percent").default(0).notNull(),
  completedAt: timestamp("completed_at"),

  // Versionamento
  analysisVersion: int("analysis_version").default(1).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProjectActionV3 = typeof projectActionsV3.$inferSelect;
export type InsertProjectActionV3 = typeof projectActionsV3.$inferInsert;

// ---------------------------------------------------------------------------
// project_tasks_v3
// ---------------------------------------------------------------------------

export const projectTasksV3 = mysqlTable("project_tasks_v3", {
  id: int("id").autoincrement().primaryKey(),

  // Multi-tenant
  clientId: int("client_id").notNull(),
  projectId: int("project_id").notNull(),

  // Rastreabilidade
  actionCode: varchar("action_code", { length: 32 }).notNull(),
  requirementCode: varchar("requirement_code", { length: 32 }).notNull(),

  // Identificação
  taskCode: varchar("task_code", { length: 32 }).notNull(),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  taskDesc: text("task_desc").notNull(),
  taskType: mysqlEnum("task_type", TASK_TYPE).notNull(),

  // Execução
  ownerType: varchar("owner_type", { length: 100 }).notNull(),
  estimatedDays: int("estimated_days").notNull(),
  executionOrder: int("execution_order").notNull(),
  dependsOn: text("depends_on").notNull(), // JSON: string[] de taskCodes

  // Status
  status: mysqlEnum("status", TASK_STATUS).default("nao_iniciado").notNull(),
  progressPercent: int("progress_percent").default(0).notNull(),
  completionCriteria: text("completion_criteria").notNull(),
  completedAt: timestamp("completed_at"),

  // Versionamento
  analysisVersion: int("analysis_version").default(1).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProjectTaskV3 = typeof projectTasksV3.$inferSelect;
export type InsertProjectTaskV3 = typeof projectTasksV3.$inferInsert;

// ---------------------------------------------------------------------------
// project_snapshots_v3 (Sprint 6 — Ajuste 1: Cache de Snapshot)
// ---------------------------------------------------------------------------

export const projectSnapshotsV3 = mysqlTable("project_snapshots_v3", {
  id: int("id").autoincrement().primaryKey(),

  // Multi-tenant
  clientId: int("client_id").notNull(),
  projectId: int("project_id").notNull(),

  // Versionamento (Sprint 6 ajuste 2)
  analysisVersion: int("analysis_version").notNull(),

  // Confiabilidade (Sprint 6 ajuste 3)
  confidenceScoreGlobal: decimal("confidence_score_global", { precision: 5, scale: 2 }).notNull(),
  confidenceBreakdown: text("confidence_breakdown").notNull(), // JSON: { answerCoverage, evidenceCoverage, consistency }

  // Cache do dashboard completo
  radarJson: text("radar_json").notNull(),           // JSON: ComplianceRadar
  riskSummaryJson: text("risk_summary_json").notNull(), // JSON: RiskMatrixSummary
  actionSummaryJson: text("action_summary_json").notNull(), // JSON: ActionPlanSummary
  taskSummaryJson: text("task_summary_json").notNull(),  // JSON: AtomicTaskPlanSummary

  // Scores agregados
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(),
  totalRequirements: int("total_requirements").notNull(),
  totalGaps: int("total_gaps").notNull(),
  criticalGaps: int("critical_gaps").notNull(),
  totalRisks: int("total_risks").notNull(),
  criticalRisks: int("critical_risks").notNull(),
  totalActions: int("total_actions").notNull(),
  immediateActions: int("immediate_actions").notNull(),

  // Narrativas IA (cache)
  executiveSummaryJson: text("executive_summary_json"), // JSON: ExecutiveSummary
  generatedBy: mysqlEnum("generated_by", ["deterministic", "ai"]).default("deterministic").notNull(),

  // Validade do cache
  validUntil: timestamp("valid_until"),
  isStale: boolean("is_stale").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProjectSnapshotV3 = typeof projectSnapshotsV3.$inferSelect;
export type InsertProjectSnapshotV3 = typeof projectSnapshotsV3.$inferInsert;

// ---------------------------------------------------------------------------
// compliance_usage_logs_v3 — Logging de uso de assessments (Sprint 8)
// ---------------------------------------------------------------------------

export const complianceUsageLogsV3 = mysqlTable("compliance_usage_logs_v3", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  projectId: int("project_id").notNull(),
  // Tipo de evento
  eventType: mysqlEnum("event_type", [
    "assessment_started",
    "assessment_completed",
    "score_calculated",
    "gap_identified",
    "risk_generated",
    "action_generated",
    "task_generated",
    "executive_summary_generated",
    "export_pdf",
    "export_csv",
    "dashboard_viewed",
  ]).notNull(),
  // Metadados do evento
  requirementCode: varchar("requirement_code", { length: 50 }),
  domain: varchar("domain", { length: 100 }),
  // Indicador de origem da IA (Sprint 8 — campo source)
  aiSource: mysqlEnum("ai_source", ["llm", "fallback"]),
  // Dados adicionais (JSON)
  metadata: text("metadata"), // JSON: { score, riskLevel, gapType, etc. }
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ComplianceUsageLogV3 = typeof complianceUsageLogsV3.$inferSelect;
export type InsertComplianceUsageLogV3 = typeof complianceUsageLogsV3.$inferInsert;
