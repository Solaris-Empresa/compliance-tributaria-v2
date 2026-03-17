import { mysqlTable, int, varchar, text, boolean, timestamp, mysqlEnum, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Tabela de usuários - IA SOLARIS
 * Perfis: cliente, equipe_solaris, advogado_senior, advogado_junior
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["cliente", "equipe_solaris", "advogado_senior", "advogado_junior"]).default("cliente").notNull(),
  companyName: varchar("companyName", { length: 255 }),
  cnpj: varchar("cnpj", { length: 20 }),
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
  // Novo Fluxo v2.0: Modo de uso e sessão
  mode: mysqlEnum("mode", ["temporario", "historico"]).default("historico").notNull(),
  sessionToken: varchar("sessionToken", { length: 128 }), // referência à sessão temporária de origem
  // Etapa 1 — Criação do Projeto (novo fluxo v3.0)
  description: text("description"),                    // Campo descrição longo (negócio, desafios, operação)
  confirmedCnaes: json("confirmedCnaes"),               // Array de CNAEs confirmados: [{code, description, confidence}]
  currentStep: int("currentStep").default(1).notNull(), // Etapa atual do fluxo: 1-5
  // Campos do Assessment
  taxRegime: mysqlEnum("taxRegime", [
    "simples_nacional",
    "lucro_presumido",
    "lucro_real"
  ]),
  businessType: varchar("businessType", { length: 255 }),
  companySize: mysqlEnum("companySize", [
    "mei",
    "micro",
    "pequena",
    "media",
    "grande"
  ]),
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
 * CAMADA 1.1 - Ramos de Atividade (Catálogo)
 */
export const activityBranches = mysqlTable("activityBranches", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(), // COM, IND, SER, etc.
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ActivityBranch = typeof activityBranches.$inferSelect;
export type InsertActivityBranch = typeof activityBranches.$inferInsert;

/**
 * CAMADA 1.2 - Relacionamento N:N entre Projeto e Ramos
 */
export const projectBranches = mysqlTable("projectBranches", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  branchId: int("branchId").notNull(),
  // Novo Fluxo v2.0: controle de progresso por ramo
  branchStatus: mysqlEnum("branchStatus", [
    "pendente",
    "questionario_em_andamento",
    "questionario_concluido",
    "plano_gerado",
    "plano_aprovado",
    "riscos_gerados",
    "concluido"
  ]).default("pendente").notNull(),
  questionnaireDepth: mysqlEnum("questionnaireDepth", ["sintetico", "abrangente"]).default("sintetico"),
  order: int("order").default(0), // ordem de processamento no loop
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type ProjectBranch = typeof projectBranches.$inferSelect;
export type InsertProjectBranch = typeof projectBranches.$inferInsert;

/**
 * Assessment Fase 1 - Perguntas básicas fixas
 */
export const assessmentPhase1 = mysqlTable("assessmentPhase1", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  taxRegime: mysqlEnum("taxRegime", ["simples_nacional", "lucro_presumido", "lucro_real", "mei"]).notNull(),
  companySize: mysqlEnum("companySize", ["mei", "pequena", "media", "grande"]).notNull(),
  annualRevenue: decimal("annualRevenue", { precision: 15, scale: 2 }),
  businessSector: varchar("businessSector", { length: 100 }),
  mainActivity: text("mainActivity"),
  employeeCount: int("employeeCount"),
  hasAccountingDept: varchar("hasAccountingDept", { length: 10 }),
  currentERPSystem: varchar("currentERPSystem", { length: 100 }),
  mainChallenges: text("mainChallenges"),
  complianceGoals: text("complianceGoals"),
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
 * Histórico de Versões do Briefing
 */
export const briefingVersions = mysqlTable("briefingVersions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  briefingId: int("briefingId").notNull(),
  summaryText: text("summaryText").notNull(),
  gapsAnalysis: text("gapsAnalysis").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["baixo", "medio", "alto", "critico"]).notNull(),
  priorityAreas: text("priorityAreas"),
  version: int("version").notNull(),
  generatedAt: timestamp("generatedAt").notNull(),
  generatedBy: int("generatedBy").notNull(),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
});

export type BriefingVersion = typeof briefingVersions.$inferSelect;
export type InsertBriefingVersion = typeof briefingVersions.$inferInsert;

/**
 * Matriz de Riscos - gerada por IA, editável diretamente ou via prompt
 */
export const riskMatrix = mysqlTable("riskMatrix", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 500 }).notNull(), // Título do risco (simplificado)
  description: text("description"), // Descrição detalhada (opcional)
  riskDescription: text("riskDescription"), // Mantido para compatibilidade com IA
  probability: mysqlEnum("probability", ["muito_baixa", "baixa", "media", "alta", "muito_alta"]), // Opcional agora
  impact: mysqlEnum("impact", ["muito_baixo", "baixo", "medio", "alto", "muito_alto"]), // Opcional agora
  treatmentStrategy: text("treatmentStrategy"),
  suggestedControls: text("suggestedControls"),
  expectedEvidence: text("expectedEvidence"),
  version: int("version").default(1).notNull(),
  generatedByAI: boolean("generatedByAI").default(false).notNull(), // Default false para riscos manuais
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
 * Histórico de Versões da Matriz de Riscos
 * Armazena snapshots completos da matriz a cada regeneração
 */
export const riskMatrixVersions = mysqlTable("riskMatrixVersions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  versionNumber: int("versionNumber").notNull(), // 1, 2, 3...
  snapshotData: text("snapshotData").notNull(), // JSON string com array de riscos completo
  riskCount: int("riskCount").notNull(), // Número de riscos nesta versão
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
  createdByName: varchar("createdByName", { length: 255 }), // Nome do usuário para exibição
  triggerType: mysqlEnum("triggerType", ["auto_generation", "manual_regeneration", "prompt_edit"]).notNull(),
});

export type RiskMatrixVersion = typeof riskMatrixVersions.$inferSelect;
export type InsertRiskMatrixVersion = typeof riskMatrixVersions.$inferInsert;

/**
 * Plano de Ação - gerado por IA, editável diretamente ou via prompt
 * Workflow de aprovação obrigatória por Advogado Sênior
 */
export const actionPlans = mysqlTable("actionPlans", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  planData: text("planData").notNull(), // JSON (deprecated - usar prompt + detailedPlan)
  prompt: text("prompt"), // Prompt usado para gerar o plano
  detailedPlan: text("detailedPlan"), // Plano detalhado em markdown
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
 * Histórico de Versões do Plano de Ação
 */
export const actionPlanVersions = mysqlTable("actionPlanVersions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  actionPlanId: int("actionPlanId").notNull(),
  planData: text("planData").notNull(),
  version: int("version").notNull(),
  templateId: int("templateId"),
  generatedAt: timestamp("generatedAt").notNull(),
  generatedBy: int("generatedBy").notNull(),
  generatedByAI: boolean("generatedByAI").notNull(),
  status: mysqlEnum("status", [
    "em_avaliacao",
    "aprovado",
    "reprovado",
    "em_ajuste"
  ]).notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  rejectionReason: text("rejectionReason"),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
});

export type ActionPlanVersion = typeof actionPlanVersions.$inferSelect;
export type InsertActionPlanVersion = typeof actionPlanVersions.$inferInsert;

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
 * CAMADA 4 - Tarefas do Plano de Ação (NOVA ESTRUTURA)
 * Suporta tarefas corporativas e por ramo de atividade
 */
export const actions = mysqlTable("actions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  
  // CAMADA 4.2-4.3: Origem da tarefa
  category: mysqlEnum("category", ["corporate", "branch"]).notNull(), // Corporativo ou Ramo
  branchId: int("branchId"), // Obrigatório se category = branch
  
  // Campos básicos
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  
  // CAMADA 4.4: Área Responsável
  responsibleArea: mysqlEnum("responsibleArea", [
    "TI",           // Tecnologia da Informação
    "CONT",         // Contabilidade
    "FISC",         // Fiscal/Tributário
    "JUR",          // Jurídico
    "OPS",          // Operações
    "COM",          // Comercial
    "ADM"           // Administrativo/Governança
  ]).notNull(),
  
  // CAMADA 4.5: Tipo de Tarefa
  taskType: mysqlEnum("taskType", [
    "STRATEGIC",    // Estratégica
    "OPERATIONAL",  // Operacional
    "COMPLIANCE"    // Compliance
  ]).notNull(),
  
  // CAMADA 4.6: Prioridade
  priority: mysqlEnum("priority", ["baixa", "media", "alta", "critica"]).default("media").notNull(),
  
  // CAMADA 4.7: Status
  status: mysqlEnum("status", [
    "SUGGESTED",     // Sugerido (gerado pela IA)
    "IN_PROGRESS",   // Em execução
    "COMPLETED",     // Concluído
    "OVERDUE"        // Atrasado
  ]).default("SUGGESTED").notNull(),
  
  // CAMADA 4.8: Owner (Dono da tarefa)
  ownerId: int("ownerId").notNull(), // Usuário responsável
  
  // CAMADA 4.9: Datas
  startDate: timestamp("startDate").notNull(),
  deadline: timestamp("deadline").notNull(),
  completedAt: timestamp("completedAt"),
  
  // CAMADA 4.11: Dependência (opcional)
  dependsOn: int("dependsOn"), // FK para outra tarefa
  
  // Campos legados (manter compatibilidade)
  phaseId: int("phaseId"),
  riskId: int("riskId"),
  estimatedHours: int("estimatedHours"),
  actualHours: int("actualHours"),
  
  // Auditoria
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Action = typeof actions.$inferSelect;
export type InsertAction = typeof actions.$inferInsert;

/**
 * CAMADA 5.1 - Observadores de Tarefas
 */
export const taskObservers = mysqlTable("taskObservers", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskObserver = typeof taskObservers.$inferSelect;
export type InsertTaskObserver = typeof taskObservers.$inferInsert;

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
/**
 * Questionário Corporativo - dados gerais da empresa
 * Substitui assessmentPhase1 (dados cadastrais) + parte do assessmentPhase2
 */
export const corporateAssessments = mysqlTable("corporateAssessments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(), // 1:1 com projeto
  
  // Dados cadastrais (migrados de assessmentPhase1)
  taxRegime: mysqlEnum("taxRegime", ["simples_nacional", "lucro_presumido", "lucro_real", "mei"]).notNull(),
  companySize: mysqlEnum("companySize", ["mei", "pequena", "media", "grande"]).notNull(),
  annualRevenue: varchar("annualRevenue", { length: 50 }),
  employeeCount: int("employeeCount"),
  hasInternationalOperations: boolean("hasInternationalOperations").default(false),
  
  // Estrutura organizacional
  hasAccountingDept: boolean("hasAccountingDept").default(false),
  hasTaxDept: boolean("hasTaxDept").default(false),
  hasLegalDept: boolean("hasLegalDept").default(false),
  hasITDept: boolean("hasITDept").default(false),
  
  // Sistemas e tecnologia
  erpSystem: varchar("erpSystem", { length: 255 }),
  hasIntegratedSystems: boolean("hasIntegratedSystems").default(false),
  
  // Questionário dinâmico (gerado por IA)
  generatedQuestions: text("generatedQuestions"), // JSON: array de perguntas
  answers: text("answers"), // JSON: respostas do cliente
  
  // Metadados
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
  version: int("version").default(1).notNull(),
});

export type CorporateAssessment = typeof corporateAssessments.$inferSelect;
export type InsertCorporateAssessment = typeof corporateAssessments.$inferInsert;

/**
 * Questionários por Ramo de Atividade
 * Um questionário para cada ramo selecionado no projeto
 */
export const branchAssessments = mysqlTable("branchAssessments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  branchId: int("branchId").notNull(), // FK para activityBranches
  
  // Questionário específico do ramo (gerado por IA)
  generatedQuestions: text("generatedQuestions").notNull(), // JSON: perguntas específicas do ramo
  answers: text("answers"), // JSON: respostas do cliente
  
  // Contexto para geração
  usedTemplateId: int("usedTemplateId"), // Template base (se houver)
  
  // Metadados
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
  version: int("version").default(1).notNull(),
});

export type BranchAssessment = typeof branchAssessments.$inferSelect;
export type InsertBranchAssessment = typeof branchAssessments.$inferInsert;

/**
 * Templates de questionários por ramo
 * Base para geração de perguntas específicas
 */
export const branchAssessmentTemplates = mysqlTable("branchAssessmentTemplates", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(), // FK para activityBranches
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  questions: text("questions").notNull(), // JSON: array de perguntas padrão
  
  // Metadados
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
});

export type BranchAssessmentTemplate = typeof branchAssessmentTemplates.$inferSelect;
export type InsertBranchAssessmentTemplate = typeof branchAssessmentTemplates.$inferInsert;

/**
 * Histórico de versões - Questionário Corporativo
 */
export const corporateAssessmentVersions = mysqlTable("corporateAssessmentVersions", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  projectId: int("projectId").notNull(),
  
  // Snapshot dos dados
  generatedQuestions: text("generatedQuestions"),
  answers: text("answers"),
  version: int("version").notNull(),
  
  // Metadados
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  archivedBy: int("archivedBy").notNull(),
});

export type CorporateAssessmentVersion = typeof corporateAssessmentVersions.$inferSelect;
export type InsertCorporateAssessmentVersion = typeof corporateAssessmentVersions.$inferInsert;

/**
 * Histórico de versões - Questionários por Ramo
 */
export const branchAssessmentVersions = mysqlTable("branchAssessmentVersions", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  projectId: int("projectId").notNull(),
  branchId: int("branchId").notNull(),
  
  // Snapshot dos dados
  generatedQuestions: text("generatedQuestions"),
  answers: text("answers"),
  version: int("version").notNull(),
  
  // Metadados
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  archivedBy: int("archivedBy").notNull(),
});

export type BranchAssessmentVersion = typeof branchAssessmentVersions.$inferSelect;
export type InsertBranchAssessmentVersion = typeof branchAssessmentVersions.$inferInsert;

/**
 * CAMADA 3 - PLANOS DE AÇÃO
 * 
 * Nova arquitetura:
 * - 1 Plano Corporativo por projeto
 * - N Planos por Ramo de Atividade (um para cada ramo selecionado)
 * - Prompts customizáveis para geração
 * - Versionamento completo
 */

/**
 * Planos de Ação Corporativos
 * Baseado no questionário corporativo
 */
export const corporateActionPlans = mysqlTable("corporateActionPlans", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(), // 1:1 com projeto
  
  // Relacionamento com questionário
  corporateAssessmentId: int("corporateAssessmentId").notNull(),
  
  // Conteúdo do plano (JSON com estrutura de tarefas)
  planContent: text("planContent").notNull(), // JSON: array de tarefas
  
  // Prompt usado para geração
  generationPrompt: text("generationPrompt"), // Prompt customizável
  
  // Metadados
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  generatedBy: int("generatedBy").notNull(),
  version: int("version").default(1).notNull(),
  
  // Status
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
});

export type CorporateActionPlan = typeof corporateActionPlans.$inferSelect;
export type InsertCorporateActionPlan = typeof corporateActionPlans.$inferInsert;

/**
 * Planos de Ação por Ramo
 * Baseado nos questionários por ramo
 */
export const branchActionPlans = mysqlTable("branchActionPlans", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  branchId: int("branchId").notNull(), // FK para activityBranches
  
  // Relacionamento com questionário
  branchAssessmentId: int("branchAssessmentId").notNull(),
  
  // Conteúdo do plano (JSON com estrutura de tarefas)
  planContent: text("planContent").notNull(), // JSON: array de tarefas
  
  // Prompt usado para geração
  generationPrompt: text("generationPrompt"), // Prompt customizável
  
  // Metadados
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  generatedBy: int("generatedBy").notNull(),
  version: int("version").default(1).notNull(),
  
  // Status
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
});

export type BranchActionPlan = typeof branchActionPlans.$inferSelect;
export type InsertBranchActionPlan = typeof branchActionPlans.$inferInsert;

/**
 * Histórico de Versões - Plano Corporativo
 */
export const corporateActionPlanVersions = mysqlTable("corporateActionPlanVersions", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  projectId: int("projectId").notNull(),
  
  // Snapshot do conteúdo
  planContent: text("planContent").notNull(),
  generationPrompt: text("generationPrompt"),
  version: int("version").notNull(),
  
  // Metadados
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  archivedBy: int("archivedBy").notNull(),
  archivedReason: varchar("archivedReason", { length: 255 }), // "regenerated", "edited", "manual"
});

export type CorporateActionPlanVersion = typeof corporateActionPlanVersions.$inferSelect;
export type InsertCorporateActionPlanVersion = typeof corporateActionPlanVersions.$inferInsert;

/**
 * Histórico de Versões - Planos por Ramo
 */
export const branchActionPlanVersions = mysqlTable("branchActionPlanVersions", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  projectId: int("projectId").notNull(),
  branchId: int("branchId").notNull(),
  
  // Snapshot do conteúdo
  planContent: text("planContent").notNull(),
  generationPrompt: text("generationPrompt"),
  version: int("version").notNull(),
  
  // Metadados
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  archivedBy: int("archivedBy").notNull(),
  archivedReason: varchar("archivedReason", { length: 255 }),
});

export type BranchActionPlanVersion = typeof branchActionPlanVersions.$inferSelect;
export type InsertBranchActionPlanVersion = typeof branchActionPlanVersions.$inferInsert;

/**
 * Prompts Customizáveis para Geração de Planos
 * Permite que equipe Solaris ajuste prompts por tipo de plano
 */
export const actionPlanPrompts = mysqlTable("actionPlanPrompts", {
  id: int("id").autoincrement().primaryKey(),
  
  // Tipo de plano
  planType: mysqlEnum("planType", ["corporate", "branch"]).notNull(),
  
  // Contexto específico (opcional)
  branchId: int("branchId"), // Apenas para planType = "branch"
  taxRegime: mysqlEnum("taxRegime", ["simples_nacional", "lucro_presumido", "lucro_real", "mei"]),
  
  // Prompt
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  promptTemplate: text("promptTemplate").notNull(), // Template com variáveis {{var}}
  
  // Metadados
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(), // Prompt padrão
});

export type ActionPlanPrompt = typeof actionPlanPrompts.$inferSelect;
export type InsertActionPlanPrompt = typeof actionPlanPrompts.$inferInsert;

/**
 * CAMADA 6 - Preferências de Notificação por Usuário
 * Permite configurar quais eventos geram notificações
 */
export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // 1:1 com usuário
  
  // Eventos de tarefas
  taskCreated: boolean("taskCreated").default(true).notNull(),
  taskStarted: boolean("taskStarted").default(true).notNull(),
  taskDueSoon: boolean("taskDueSoon").default(true).notNull(), // 3 dias antes
  taskOverdue: boolean("taskOverdue").default(true).notNull(),
  taskCompleted: boolean("taskCompleted").default(false).notNull(),
  taskCommented: boolean("taskCommented").default(true).notNull(),
  
  // Configurações gerais
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

/**
 * Permissões de usuários em projetos
 * Controle granular de acesso por área/projeto
 */
export const projectPermissions = mysqlTable("projectPermissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  permissionLevel: mysqlEnum("permissionLevel", ["view", "edit", "approve", "admin"]).notNull(),
  areas: json("areas").$type<string[]>(), // ["TI", "CONT", "FISC"] ou null para todas
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
});

export type ProjectPermission = typeof projectPermissions.$inferSelect;
export type InsertProjectPermission = typeof projectPermissions.$inferInsert;

/**
 * Histórico de auditoria
 * Registra todas as mudanças em tarefas/questionários
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 255 }).notNull(),
  projectId: int("projectId").notNull(),
  entityType: mysqlEnum("entityType", [
    "task",
    "action",
    "comment",
    "corporate_assessment",
    "branch_assessment",
    "corporate_question",
    "branch_question",
    "project",
    "permission"
  ]).notNull(),
  entityId: int("entityId").notNull(),
  action: mysqlEnum("action", ["create", "update", "delete", "status_change"]).notNull(),
  changes: json("changes").$type<Record<string, { old: any; new: any }>>(), // { field: { old: value, new: value } }
  metadata: json("metadata").$type<Record<string, any>>(), // Dados adicionais contextuais
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;


/**
 * Aprovações de Planos de Ação
 * Workflow: pending → approved/rejected/needs_revision
 */
export const planApprovals = mysqlTable("planApprovals", {
  id: int("id").autoincrement().primaryKey(),
  planType: mysqlEnum("planType", ["corporate", "branch"]).notNull(),
  planId: int("planId").notNull(), // ID do corporateActionPlans ou branchActionPlans
  projectId: int("projectId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "needs_revision"]).default("pending").notNull(),
  requestedBy: int("requestedBy").notNull(), // Quem solicitou aprovação
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  reviewedBy: int("reviewedBy"), // Quem aprovou/rejeitou
  reviewedAt: timestamp("reviewedAt"),
  reviewComments: text("reviewComments"), // Comentários do revisor
  version: int("version").default(1).notNull(), // Versão do plano sendo aprovada
});

export type PlanApproval = typeof planApprovals.$inferSelect;
export type InsertPlanApproval = typeof planApprovals.$inferInsert;

/**
 * Revisões e Comentários em Planos
 * Múltiplos stakeholders podem comentar antes da aprovação final
 */
export const planReviews = mysqlTable("planReviews", {
  id: int("id").autoincrement().primaryKey(),
  approvalId: int("approvalId").notNull(), // FK para planApprovals
  reviewerId: int("reviewerId").notNull(), // Quem fez o comentário
  comment: text("comment").notNull(),
  reviewType: mysqlEnum("reviewType", ["comment", "suggestion", "concern", "approval"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type PlanReview = typeof planReviews.$inferSelect;
export type InsertPlanReview = typeof planReviews.$inferInsert;

// ============================================================
// NOVO FLUXO v2.0 — Fase 1: Modo de Uso + Briefing Inteligente
// ============================================================

/**
 * Sessões temporárias — Modo sem login
 * Permite usar o sistema sem criar conta (dados expiram em 24h)
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 128 }).notNull().unique(),
  mode: mysqlEnum("mode", ["temporario", "historico"]).default("temporario").notNull(),
  // Dados coletados no briefing inicial (modo temporário)
  companyDescription: text("companyDescription"), // texto livre do usuário
  suggestedBranches: json("suggestedBranches"), // JSON: [{code, name, justification}]
  confirmedBranches: json("confirmedBranches"),  // JSON: [{code, name}] após confirmação
  currentStep: mysqlEnum("currentStep", [
    "modo_uso",
    "briefing",
    "confirmar_ramos",
    "questionario",
    "plano_acao",
    "matriz_riscos",
    "consolidacao",
    "concluido"
  ]).default("modo_uso").notNull(),
  projectId: int("projectId"), // preenchido quando converte para modo histórico
  expiresAt: timestamp("expiresAt").notNull(), // 24h após criação
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Histórico de sugestões de ramos pela IA
 * Registra cada interação de sugestão para auditoria e melhoria
 */
export const branchSuggestions = mysqlTable("branchSuggestions", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 128 }), // null se modo histórico
  projectId: int("projectId"),                             // null se modo temporário
  companyDescription: text("companyDescription").notNull(),
  suggestedBranches: json("suggestedBranches").notNull(),  // JSON: [{code, name, justification, confidence}]
  confirmedBranches: json("confirmedBranches"),            // preenchido após confirmação
  llmModel: varchar("llmModel", { length: 100 }),
  promptTokens: int("promptTokens"),
  completionTokens: int("completionTokens"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BranchSuggestion = typeof branchSuggestions.$inferSelect;
export type InsertBranchSuggestion = typeof branchSuggestions.$inferInsert;

/**
 * Respostas do questionário adaptativo por ramo (Fase 2 - Novo Fluxo v2.0)
 * Armazena as respostas de cada ramo em uma sessão temporária ou projeto
 */
export const sessionBranchAnswers = mysqlTable("sessionBranchAnswers", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 128 }), // null se modo histórico
  projectId: int("projectId"),                             // null se modo temporário
  branchCode: varchar("branchCode", { length: 20 }).notNull(), // ex: "COM", "IND", "SER"
  branchName: varchar("branchName", { length: 100 }).notNull(),
  // Perguntas geradas pela IA para este ramo (JSON)
  generatedQuestions: json("generatedQuestions"), // [{id, question, type, options?}]
  // Respostas do usuário (JSON)
  answers: json("answers"),                        // [{questionId, answer}]
  // Status do questionário deste ramo
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluido"]).default("pendente").notNull(),
  // Análise da IA após respostas
  aiAnalysis: text("aiAnalysis"),                  // texto de análise gerado pela IA
  riskLevel: mysqlEnum("riskLevel", ["baixo", "medio", "alto", "critico"]),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SessionBranchAnswer = typeof sessionBranchAnswers.$inferSelect;
export type InsertSessionBranchAnswer = typeof sessionBranchAnswers.$inferInsert;

/**
 * Plano de Ação Consolidado por Sessão (Fase 3 - Novo Fluxo v2.0)
 * Armazena o plano gerado pela IA consolidando todos os ramos da sessão
 */
export const sessionActionPlans = mysqlTable("sessionActionPlans", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 128 }).notNull(),
  // Itens do plano de ação (JSON array)
  planItems: json("planItems"), // [{id, branchCode, branchName, action, priority, deadline, responsible, status, riskLevel, category}]
  // Resumo executivo gerado pela IA
  executiveSummary: text("executiveSummary"),
  // Nível de risco global da empresa
  overallRiskLevel: mysqlEnum("overallRiskLevel", ["baixo", "medio", "alto", "critico"]),
  // Pontuação de compliance (0-100)
  complianceScore: int("complianceScore"),
  // Status do plano
  status: mysqlEnum("status", ["gerando", "gerado", "aprovado", "em_execucao"]).default("gerando").notNull(),
  // Metadados
  totalActions: int("totalActions").default(0),
  criticalActions: int("criticalActions").default(0),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SessionActionPlan = typeof sessionActionPlans.$inferSelect;
export type InsertSessionActionPlan = typeof sessionActionPlans.$inferInsert;

// =============================================================================
// FASE 4 — CONSOLIDAÇÃO FINAL E GESTÃO
// =============================================================================

/**
 * sessionConsolidations
 * Armazena o relatório consolidado final de uma sessão de diagnóstico.
 * Gerado após o plano de ação, contém o resumo executivo completo,
 * recomendações prioritárias e dados para exportação.
 */
export const sessionConsolidations = mysqlTable("sessionConsolidations", {
  id: int("id").primaryKey().autoincrement(),
  sessionToken: varchar("sessionToken", { length: 255 }).notNull(),

  // Dados consolidados
  executiveSummary: text("executiveSummary"),          // Resumo executivo final
  keyFindings: json("keyFindings"),                    // Array de achados principais
  topRecommendations: json("topRecommendations"),      // Top 5 recomendações
  branchSummaries: json("branchSummaries"),            // Resumo por ramo
  timeline: json("timeline"),                          // Cronograma sugerido (30/60/90 dias)
  estimatedBudget: json("estimatedBudget"),            // Estimativa de custo por fase

  // Métricas finais
  complianceScore: int("complianceScore"),             // 0-100
  overallRiskLevel: varchar("overallRiskLevel", { length: 50 }),
  totalActions: int("totalActions").default(0),
  criticalActions: int("criticalActions").default(0),
  estimatedDays: int("estimatedDays"),                 // Prazo total estimado

  // Controle
  status: mysqlEnum("status", ["gerando", "gerado", "exportado", "salvo_historico"]).default("gerando").notNull(),
  convertedToProjectId: int("convertedToProjectId"),  // ID do projeto criado ao salvar no histórico
  exportedAt: timestamp("exportedAt"),
  savedToHistoryAt: timestamp("savedToHistoryAt"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SessionConsolidation = typeof sessionConsolidations.$inferSelect;
export type InsertSessionConsolidation = typeof sessionConsolidations.$inferInsert;

// =============================================================================
// FLUXO V3 — QUESTIONÁRIO ADAPTATIVO (PERSISTÊNCIA DE RESPOSTAS)
// =============================================================================
/**
 * questionnaireAnswersV3
 * Persiste cada resposta individual do questionário adaptativo v3.0.
 * Permite retomar o questionário de onde o usuário parou.
 */
export const questionnaireAnswersV3 = mysqlTable("questionnaireAnswersV3", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("projectId").notNull(),
  cnaeCode: varchar("cnaeCode", { length: 20 }).notNull(),   // Código do CNAE (ex: "47.11-3")
  cnaeDescription: varchar("cnaeDescription", { length: 255 }), // Descrição do CNAE
  level: mysqlEnum("level", ["nivel1", "nivel2"]).notNull().default("nivel1"),
  questionIndex: int("questionIndex").notNull(),              // Índice da pergunta (0-based)
  questionText: text("questionText").notNull(),               // Texto da pergunta
  questionType: varchar("questionType", { length: 50 }),      // "yesno", "scale", "multiple", "text", "slider"
  answerValue: text("answerValue").notNull(),                 // Valor da resposta (serializado como string)
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuestionnaireAnswerV3 = typeof questionnaireAnswersV3.$inferSelect;
export type InsertQuestionnaireAnswerV3 = typeof questionnaireAnswersV3.$inferInsert;

/**
 * questionnaireProgressV3
 * Rastreia o progresso geral do questionário por projeto.
 * Indica qual CNAE e nível o usuário está atualmente.
 */
export const questionnaireProgressV3 = mysqlTable("questionnaireProgressV3", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("projectId").notNull().unique(),
  currentCnaeIndex: int("currentCnaeIndex").notNull().default(0),
  currentLevel: mysqlEnum("currentLevel", ["nivel1", "nivel2"]).notNull().default("nivel1"),
  completedCnaes: json("completedCnaes"),                    // Array de códigos CNAE concluídos
  level2Decisions: json("level2Decisions"),                  // { [cnaeCode]: boolean } — aceitou aprofundar?
  status: mysqlEnum("status", ["em_andamento", "concluido"]).notNull().default("em_andamento"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuestionnaireProgressV3 = typeof questionnaireProgressV3.$inferSelect;
export type InsertQuestionnaireProgressV3 = typeof questionnaireProgressV3.$inferInsert;

/**
 * clientMembers — RF-1.03 / RF-5.17
 * Membros da equipe do cliente com papéis Admin, Colaborador ou Visualizador.
 * Permite que o cliente Admin gerencie quem tem acesso aos seus projetos.
 */
export const clientMembers = mysqlTable("clientMembers", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),          // ID do usuário-cliente dono da conta
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  memberRole: mysqlEnum("memberRole", ["admin", "colaborador", "visualizador"]).notNull().default("colaborador"),
  active: boolean("active").notNull().default(true),
  invitedAt: timestamp("invitedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ClientMember = typeof clientMembers.$inferSelect;
export type InsertClientMember = typeof clientMembers.$inferInsert;

// =============================================================================
// RF-HIST — HISTÓRICO DE ALTERAÇÕES POR TAREFA
// =============================================================================
/**
 * taskHistory
 * Registra cada alteração realizada em uma tarefa do Plano de Ação V3.
 * Imutável por design: nunca deletar ou atualizar registros.
 */
export const taskHistory = mysqlTable("taskHistory", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),           // ID do projeto
  taskId: varchar("taskId", { length: 100 }).notNull(), // ID da tarefa (string UUID do PlanoAcaoV3)
  userId: int("userId"),                            // ID do usuário que fez a alteração (null = sistema)
  userName: varchar("userName", { length: 255 }),  // Nome do usuário (snapshot)
  eventType: mysqlEnum("eventType", [
    "criacao",        // Tarefa criada
    "status",         // Mudança de status
    "responsavel",    // Mudança de responsável
    "prazo",          // Mudança de prazo
    "progresso",      // Mudança de progresso (%)
    "titulo",         // Mudança de título
    "prioridade",     // Mudança de prioridade
    "notificacao",    // Mudança de configuração de notificação
    "comentario",     // Novo comentário adicionado
  ]).notNull(),
  field: varchar("field", { length: 100 }),        // Campo alterado (ex: "status", "responsavel")
  oldValue: text("oldValue"),                      // Valor anterior (serializado)
  newValue: text("newValue"),                      // Novo valor (serializado)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TaskHistory = typeof taskHistory.$inferSelect;
export type InsertTaskHistory = typeof taskHistory.$inferInsert;
