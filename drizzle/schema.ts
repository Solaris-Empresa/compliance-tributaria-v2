import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date, boolean, unique } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "client", "team_member"]).default("client").notNull(),
  companyName: varchar("companyName", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table - each project represents a tax compliance project
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  clientId: int("clientId").notNull(),
  status: mysqlEnum("status", [
    "draft",
    "assessment_phase1",
    "assessment_phase2",
    "briefing",
    "planning",
    "execution",
    "completed",
    "archived"
  ]).default("draft").notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
  notificationFrequency: mysqlEnum("notificationFrequency", [
    "daily",
    "weekly",
    "on_delay",
    "milestones",
    "custom"
  ]).default("weekly").notNull(),
  customNotificationDays: text("customNotificationDays"), // JSON array
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Project participants - N:N relationship with roles
 */
export const projectParticipants = mysqlTable("project_participants", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["product_owner", "scrum_master", "team_member", "observer"]).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  removedAt: timestamp("removedAt"),
});

export type ProjectParticipant = typeof projectParticipants.$inferSelect;
export type InsertProjectParticipant = typeof projectParticipants.$inferInsert;

/**
 * Assessment Phase 1 - basic questions
 */
export const assessmentPhase1 = mysqlTable("assessment_phase1", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  taxRegime: mysqlEnum("taxRegime", ["simples_nacional", "lucro_presumido", "lucro_real", "mei"]).notNull(),
  businessType: varchar("businessType", { length: 255 }).notNull(),
  companySize: mysqlEnum("companySize", ["mei", "micro", "pequena", "media", "grande"]).notNull(),
  annualRevenue: decimal("annualRevenue", { precision: 15, scale: 2 }),
  employeeCount: int("employeeCount"),
  hasInternationalOperations: boolean("hasInternationalOperations").default(false).notNull(),
  mainActivity: text("mainActivity"),
  stateOperations: text("stateOperations"), // JSON array
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
});

export type AssessmentPhase1 = typeof assessmentPhase1.$inferSelect;
export type InsertAssessmentPhase1 = typeof assessmentPhase1.$inferInsert;

/**
 * Assessment Phase 2 - AI-generated dynamic questions
 */
export const assessmentPhase2 = mysqlTable("assessment_phase2", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  generatedQuestions: text("generatedQuestions").notNull(), // JSON array
  answers: text("answers"), // JSON object
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
});

export type AssessmentPhase2 = typeof assessmentPhase2.$inferSelect;
export type InsertAssessmentPhase2 = typeof assessmentPhase2.$inferInsert;

/**
 * Briefings - consolidated assessment responses with AI analysis
 */
export const briefings = mysqlTable("briefings", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  summaryText: text("summaryText").notNull(),
  gapsAnalysis: text("gapsAnalysis").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]).notNull(),
  priorityAreas: text("priorityAreas").notNull(), // JSON array
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  generatedBy: int("generatedBy").notNull(),
});

export type Briefing = typeof briefings.$inferSelect;
export type InsertBriefing = typeof briefings.$inferInsert;

/**
 * Action plan templates - reusable templates
 */
export const actionPlanTemplates = mysqlTable("action_plan_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  businessType: varchar("businessType", { length: 255 }).notNull(),
  taxRegime: varchar("taxRegime", { length: 100 }),
  companySize: varchar("companySize", { length: 50 }),
  templateData: text("templateData").notNull(), // JSON
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

export type ActionPlanTemplate = typeof actionPlanTemplates.$inferSelect;
export type InsertActionPlanTemplate = typeof actionPlanTemplates.$inferInsert;

/**
 * Action plans - generated plans for each project
 */
export const actionPlans = mysqlTable("action_plans", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  templateId: int("templateId"),
  planData: text("planData").notNull(), // JSON
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  generatedBy: int("generatedBy").notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
});

export type ActionPlan = typeof actionPlans.$inferSelect;
export type InsertActionPlan = typeof actionPlans.$inferInsert;

/**
 * Sprints - Scrum methodology
 */
export const sprints = mysqlTable("sprints", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  goal: text("goal"),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  status: mysqlEnum("status", ["planned", "active", "completed", "cancelled"]).default("planned").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Sprint = typeof sprints.$inferSelect;
export type InsertSprint = typeof sprints.$inferInsert;

/**
 * Tasks - action items
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sprintId: int("sprintId"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  taskType: mysqlEnum("taskType", ["compliance", "documentation", "training", "system", "review", "other"]).default("other").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  status: mysqlEnum("status", ["backlog", "todo", "in_progress", "review", "done", "blocked"]).default("backlog").notNull(),
  assignedTo: int("assignedTo"),
  estimatedHours: decimal("estimatedHours", { precision: 5, scale: 1 }),
  actualHours: decimal("actualHours", { precision: 5, scale: 1 }),
  dueDate: date("dueDate"),
  completedAt: timestamp("completedAt"),
  blockedReason: text("blockedReason"),
  dependsOn: text("dependsOn"), // JSON array of task IDs
  cosoFramework: mysqlEnum("cosoFramework", [
    "control_environment",
    "risk_assessment",
    "control_activities",
    "information_communication",
    "monitoring"
  ]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Task comments
 */
export const taskComments = mysqlTable("task_comments", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = typeof taskComments.$inferInsert;

/**
 * Milestones - project milestones
 */
export const milestones = mysqlTable("milestones", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetDate: date("targetDate").notNull(),
  completedAt: timestamp("completedAt"),
  status: mysqlEnum("status", ["pending", "completed", "delayed"]).default("pending").notNull(),
  notifyOnComplete: boolean("notifyOnComplete").default(true).notNull(),
});

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = typeof milestones.$inferInsert;

/**
 * Notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "task_assigned",
    "task_overdue",
    "sprint_start",
    "sprint_end",
    "milestone_reached",
    "daily_summary",
    "weekly_summary"
  ]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
  emailSent: boolean("emailSent").default(false).notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * COSO Controls
 */
export const cosoControls = mysqlTable("coso_controls", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  category: mysqlEnum("category", [
    "control_environment",
    "risk_assessment",
    "control_activities",
    "information_communication",
    "monitoring"
  ]).notNull(),
  controlName: varchar("controlName", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["not_started", "in_progress", "implemented", "validated"]).default("not_started").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]).notNull(),
  responsibleUserId: int("responsibleUserId"),
  implementationDate: date("implementationDate"),
  validationDate: date("validationDate"),
  notes: text("notes"),
});

export type CosoControl = typeof cosoControls.$inferSelect;
export type InsertCosoControl = typeof cosoControls.$inferInsert;
