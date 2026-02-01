import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, boolean } from "drizzle-orm/mysql-core";

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
