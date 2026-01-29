import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Tabela de usuários - IA SOLARIS
 * Perfis: cliente, equipe_solaris, advogado_senior
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["cliente", "equipe_solaris", "advogado_senior"]).default("cliente").notNull(),
  companyName: varchar("companyName", { length: 255 }),
  cnpj: varchar("cnpj", { length: 18 }),
  cpf: varchar("cpf", { length: 14 }),
  segment: varchar("segment", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projetos de compliance tributária
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  clientId: int("clientId").notNull(),
  status: mysqlEnum("status", [
    "rascunho",
    "assessment_fase1",
    "assessment_fase2",
    "matriz_riscos",
    "plano_acao",
    "em_avaliacao",
    "aprovado",
    "em_andamento",
    "parado",
    "concluido",
    "arquivado"
  ]).default("rascunho").notNull(),
  planPeriodMonths: int("planPeriodMonths"), // 12 ou 24 meses - obrigatório antes de gerar plano
  createdById: int("createdById").notNull(),
  createdByRole: mysqlEnum("createdByRole", ["cliente", "equipe_solaris"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
  notificationFrequency: mysqlEnum("notificationFrequency", [
    "diaria",
    "semanal",
    "apenas_atrasos",
    "marcos_importantes",
    "personalizada"
  ]).default("semanal").notNull(),
  notificationEmail: varchar("notificationEmail", { length: 320 }),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Participantes do projeto
 */
export const projectParticipants = mysqlTable("projectParticipants", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["responsavel", "membro_equipe", "observador"]).notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  addedBy: int("addedBy").notNull(),
});

export type ProjectParticipant = typeof projectParticipants.$inferSelect;
export type InsertProjectParticipant = typeof projectParticipants.$inferInsert;

/**
 * Assessment Fase 1 - Perguntas básicas fixas
 */
export const assessmentPhase1 = mysqlTable("assessmentPhase1", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  taxRegime: mysqlEnum("taxRegime", ["simples_nacional", "lucro_presumido", "lucro_real", "mei"]).notNull(),
  businessType: varchar("businessType", { length: 100 }).notNull(),
  companySize: mysqlEnum("companySize", ["mei", "pequena", "media", "grande"]).notNull(),
  annualRevenue: decimal("annualRevenue", { precision: 15, scale: 2 }),
  employeeCount: int("employeeCount"),
  hasAccountingDept: boolean("hasAccountingDept").default(false),
  mainActivity: text("mainActivity"),
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
  completedByRole: mysqlEnum("completedByRole", ["cliente", "equipe_solaris"]),
});

export type AssessmentPhase1 = typeof assessmentPhase1.$inferSelect;
export type InsertAssessmentPhase1 = typeof assessmentPhase1.$inferInsert;

/**
 * Assessment Fase 2 - Questionário dinâmico gerado por IA ou template
 */
export const assessmentPhase2 = mysqlTable("assessmentPhase2", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  generatedQuestions: text("generatedQuestions").notNull(), // JSON
  answers: text("answers"), // JSON
  usedTemplateId: int("usedTemplateId"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
  completedByRole: mysqlEnum("completedByRole", ["cliente", "equipe_solaris"]),
});

export type AssessmentPhase2 = typeof assessmentPhase2.$inferSelect;
export type InsertAssessmentPhase2 = typeof assessmentPhase2.$inferInsert;

/**
 * Templates de questionários Fase 2
 */
export const assessmentTemplates = mysqlTable("assessmentTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  taxRegime: mysqlEnum("taxRegime", ["simples_nacional", "lucro_presumido", "lucro_real", "mei"]),
  businessType: varchar("businessType", { length: 100 }),
  companySize: mysqlEnum("companySize", ["mei", "pequena", "media", "grande"]),
  questions: text("questions").notNull(), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
  usageCount: int("usageCount").default(0).notNull(),
});

export type AssessmentTemplate = typeof assessmentTemplates.$inferSelect;
export type InsertAssessmentTemplate = typeof assessmentTemplates.$inferInsert;

/**
 * Briefing - consolidação das respostas
 */
export const briefings = mysqlTable("briefings", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  summaryText: text("summaryText").notNull(),
  gapsAnalysis: text("gapsAnalysis").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["baixo", "medio", "alto", "critico"]).notNull(),
  priorityAreas: text("priorityAreas"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  generatedBy: int("generatedBy").notNull(),
  version: int("version").default(1).notNull(),
});

export type Briefing = typeof briefings.$inferSelect;
export type InsertBriefing = typeof briefings.$inferInsert;

/**
 * Matriz de Riscos - gerada por IA, editável diretamente ou via prompt
 */
export const riskMatrix = mysqlTable("riskMatrix", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  riskDescription: text("riskDescription").notNull(),
  probability: mysqlEnum("probability", ["muito_baixa", "baixa", "media", "alta", "muito_alta"]).notNull(),
  impact: mysqlEnum("impact", ["muito_baixo", "baixo", "medio", "alto", "muito_alto"]).notNull(),
  treatmentStrategy: text("treatmentStrategy"),
  suggestedControls: text("suggestedControls"),
  expectedEvidence: text("expectedEvidence"),
  version: int("version").default(1).notNull(),
  generatedByAI: boolean("generatedByAI").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
});

export type RiskMatrix = typeof riskMatrix.$inferSelect;
export type InsertRiskMatrix = typeof riskMatrix.$inferInsert;

/**
 * Histórico de edições via Prompt - Matriz de Riscos
 */
export const riskMatrixPromptHistory = mysqlTable("riskMatrixPromptHistory", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  promptText: text("promptText").notNull(),
  previousVersion: int("previousVersion").notNull(),
  newVersion: int("newVersion").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
});

export type RiskMatrixPromptHistory = typeof riskMatrixPromptHistory.$inferSelect;
export type InsertRiskMatrixPromptHistory = typeof riskMatrixPromptHistory.$inferInsert;

/**
 * Plano de Ação - gerado por IA, editável diretamente ou via prompt
 * Workflow de aprovação obrigatória por Advogado Sênior
 */
export const actionPlans = mysqlTable("actionPlans", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  planData: text("planData").notNull(), // JSON
  version: int("version").default(1).notNull(),
  templateId: int("templateId"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  generatedBy: int("generatedBy").notNull(),
  generatedByAI: boolean("generatedByAI").default(true).notNull(),
  
  // Workflow de aprovação
  status: mysqlEnum("status", [
    "em_avaliacao",
    "aprovado",
    "reprovado",
    "em_ajuste"
  ]).default("em_avaliacao").notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"), // Advogado Sênior
  rejectionReason: text("rejectionReason"),
});

export type ActionPlan = typeof actionPlans.$inferSelect;
export type InsertActionPlan = typeof actionPlans.$inferInsert;

/**
 * Histórico de edições via Prompt - Plano de Ação
 */
export const actionPlanPromptHistory = mysqlTable("actionPlanPromptHistory", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  promptText: text("promptText").notNull(),
  previousVersion: int("previousVersion").notNull(),
  newVersion: int("newVersion").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
});

export type ActionPlanPromptHistory = typeof actionPlanPromptHistory.$inferSelect;
export type InsertActionPlanPromptHistory = typeof actionPlanPromptHistory.$inferInsert;

/**
 * Templates de Plano de Ação
 */
export const actionPlanTemplates = mysqlTable("actionPlanTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  taxRegime: mysqlEnum("taxRegime", ["simples_nacional", "lucro_presumido", "lucro_real", "mei"]),
  businessType: varchar("businessType", { length: 100 }),
  companySize: mysqlEnum("companySize", ["mei", "pequena", "media", "grande"]),
  templateData: text("templateData").notNull(), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
  usageCount: int("usageCount").default(0).notNull(),
});

export type ActionPlanTemplate = typeof actionPlanTemplates.$inferSelect;
export type InsertActionPlanTemplate = typeof actionPlanTemplates.$inferInsert;

/**
 * Fases do Projeto (substituem Sprints)
 */
export const phases = mysqlTable("phases", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 100 }).notNull(), // "Fase 1", "Fase 2"
  description: text("description"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  status: mysqlEnum("status", ["planejada", "ativa", "concluida", "cancelada"]).default("planejada").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Phase = typeof phases.$inferSelect;
export type InsertPhase = typeof phases.$inferInsert;

/**
 * Tarefas do Plano de Ação
 * Colunas: Pendências, A Fazer, Em Andamento, Concluído
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  phaseId: int("phaseId"),
  riskId: int("riskId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pendencias", "a_fazer", "em_andamento", "concluido"]).default("pendencias").notNull(),
  priority: mysqlEnum("priority", ["baixa", "media", "alta", "critica"]).default("media").notNull(),
  assignedTo: int("assignedTo"),
  estimatedHours: int("estimatedHours"),
  actualHours: int("actualHours"),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Comentários em tarefas
 */
export const taskComments = mysqlTable("taskComments", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = typeof taskComments.$inferInsert;

/**
 * Controles COSO
 */
export const cosoControls = mysqlTable("cosoControls", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  component: mysqlEnum("component", [
    "ambiente_controle",
    "avaliacao_riscos",
    "atividades_controle",
    "informacao_comunicacao",
    "monitoramento"
  ]).notNull(),
  controlName: varchar("controlName", { length: 255 }).notNull(),
  description: text("description"),
  riskLevel: mysqlEnum("riskLevel", ["baixo", "medio", "alto", "critico"]).notNull(),
  implementationStatus: mysqlEnum("implementationStatus", [
    "nao_implementado",
    "em_implementacao",
    "implementado",
    "necessita_melhoria"
  ]).default("nao_implementado").notNull(),
  responsible: int("responsible"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CosoControl = typeof cosoControls.$inferSelect;
export type InsertCosoControl = typeof cosoControls.$inferInsert;

/**
 * Marcos do Projeto
 */
export const milestones = mysqlTable("milestones", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("dueDate").notNull(),
  completedAt: timestamp("completedAt"),
  status: mysqlEnum("status", ["pendente", "concluido", "atrasado"]).default("pendente").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = typeof milestones.$inferInsert;

/**
 * Notificações
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  recipientId: int("recipientId").notNull(),
  type: mysqlEnum("type", [
    "atraso",
    "marco_importante",
    "lembrete",
    "aprovacao_pendente",
    "aprovado",
    "reprovado"
  ]).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  read: boolean("read").default(false).notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
