import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, boolean } from "drizzle-orm/mysql-core";

/**
 * CAMADA 2 - QUESTIONÁRIOS
 * 
 * Nova arquitetura:
 * - 1 Questionário Corporativo por projeto (obrigatório)
 * - N Questionários por Ramo de Atividade (um para cada ramo selecionado)
 */

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
