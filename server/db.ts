import { eq, desc, and, sql, ne, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  users, InsertUser,
  projects, InsertProject,
  projectParticipants, InsertProjectParticipant,
  assessmentPhase1, InsertAssessmentPhase1,
  assessmentPhase2, InsertAssessmentPhase2,
  assessmentTemplates, InsertAssessmentTemplate,
  briefings, InsertBriefing,
  riskMatrix, InsertRiskMatrix,
  riskMatrixPromptHistory, InsertRiskMatrixPromptHistory,
  actionPlans, InsertActionPlan,
  actionPlanPromptHistory, InsertActionPlanPromptHistory,
  actionPlanTemplates, InsertActionPlanTemplate,
  tasks, InsertTask,
  phases, InsertPhase,
  notifications, InsertNotification,

} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USERS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const fields = ["name", "email", "loginMethod", "companyName", "cnpj", "cpf", "segment", "phone", "observations"] as const;
    
    fields.forEach(field => {
      const value = user[field];
      if (value !== undefined) {
        const normalized = value ?? null;
        values[field] = normalized;
        updateSet[field] = normalized;
      }
    });

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'equipe_solaris';
      updateSet.role = 'equipe_solaris';
    }

    // lastSignedIn apenas no update, no insert usa defaultNow() do schema
    updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUsersByRole(role: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).where(eq(users.role, role)).orderBy(desc(users.createdAt));
}

export async function createUser(userData: Omit<InsertUser, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values(userData) as any;
  return result[0].insertId;
}

// ============================================================================
// PROJECTS
// ============================================================================

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log('[createProject] Input data:', data);
  const result = await db.insert(projects).values(data) as any;
  console.log('[createProject] Insert result:', result);
  const insertId = Array.isArray(result) ? result[0]?.insertId : (result as any).insertId;
  console.log('[createProject] insertId:', insertId);
  const projectId = Number(insertId);
  console.log('[createProject] Final projectId:', projectId);
  return projectId;
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}

export async function getProjectsByUser(userId: number, userRole: string) {
  const db = await getDb();
  if (!db) return [];

  if (userRole === "equipe_solaris" || userRole === "advogado_senior") {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  const participantProjects = await db
    .select({ projectId: projectParticipants.projectId })
    .from(projectParticipants)
    .where(eq(projectParticipants.userId, userId));

  const projectIds = participantProjects.map(p => p.projectId);

  if (projectIds.length === 0) {
    return await db.select().from(projects).where(eq(projects.clientId, userId)).orderBy(desc(projects.createdAt));
  }

  return await db
    .select()
    .from(projects)
    .where(
      sql`${projects.clientId} = ${userId} OR ${projects.id} IN (${projectIds.join(',')})`
    )
    .orderBy(desc(projects.createdAt));
}

export async function updateProject(projectId: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projects).set(data).where(eq(projects.id, projectId));
}

export async function isUserInProject(userId: number, projectId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const project = await getProjectById(projectId);
  if (project && project.clientId === userId) return true;

  const result = await db
    .select()
    .from(projectParticipants)
    .where(and(
      eq(projectParticipants.projectId, projectId),
      eq(projectParticipants.userId, userId)
    ))
    .limit(1);

  return result.length > 0;
}

// ============================================================================
// ASSESSMENT PHASE 1
// ============================================================================

export async function saveAssessmentPhase1(data: InsertAssessmentPhase1) {
  console.log('[saveAssessmentPhase1] Iniciando salvamento:', JSON.stringify(data, null, 2));
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(assessmentPhase1)
    .where(eq(assessmentPhase1.projectId, data.projectId))
    .limit(1);

  console.log('[saveAssessmentPhase1] Registro existente:', existing.length > 0 ? 'SIM' : 'NÃO');

  if (existing.length > 0) {
    console.log('[saveAssessmentPhase1] Atualizando registro existente...');
    await db.update(assessmentPhase1).set(data).where(eq(assessmentPhase1.projectId, data.projectId));
    console.log('[saveAssessmentPhase1] Atualização concluída');
  } else {
    console.log('[saveAssessmentPhase1] Inserindo novo registro...');
    await db.insert(assessmentPhase1).values(data);
    console.log('[saveAssessmentPhase1] Inserção concluída');
  }
}

export async function getAssessmentPhase1(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(assessmentPhase1).where(eq(assessmentPhase1.projectId, projectId)).limit(1);
  return result[0];
}

// ============================================================================
// ASSESSMENT PHASE 2
// ============================================================================

export async function saveAssessmentPhase2(data: InsertAssessmentPhase2) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Garantir que generatedQuestions nunca seja null/undefined
  const safeData = {
    ...data,
    generatedQuestions: data.generatedQuestions || "[]"
  };

  const existing = await db
    .select()
    .from(assessmentPhase2)
    .where(eq(assessmentPhase2.projectId, data.projectId))
    .limit(1);

  if (existing.length > 0) {
    await db.update(assessmentPhase2).set(safeData).where(eq(assessmentPhase2.projectId, data.projectId));
  } else {
    await db.insert(assessmentPhase2).values(safeData);
  }
}

export async function getAssessmentPhase2(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(assessmentPhase2).where(eq(assessmentPhase2.projectId, projectId)).limit(1);
  return result[0];
}

export async function findCompatibleTemplate(taxRegime: string, businessType: string | null, companySize: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(assessmentTemplates)
    .where(eq(assessmentTemplates.taxRegime, taxRegime as any))
    .limit(10);

  const filtered = result.filter(t => {
    if (t.businessType && t.businessType !== businessType) return false;
    if (t.companySize && t.companySize !== companySize) return false;
    return true;
  });

  return filtered[0];
}

// ============================================================================
// BRIEFING
// ============================================================================

export async function saveBriefing(data: InsertBriefing) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(briefings).where(eq(briefings.projectId, data.projectId)).limit(1);

  if (existing.length > 0) {
    await db.update(briefings).set(data).where(eq(briefings.projectId, data.projectId));
  } else {
    await db.insert(briefings).values(data);
  }
}

export async function getBriefing(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(briefings).where(eq(briefings.projectId, projectId)).limit(1);
  return result[0];
}

// ============================================================================
// RISK MATRIX
// ============================================================================

export async function saveRiskMatrix(risks: InsertRiskMatrix[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (risks.length === 0) return;

  await db.insert(riskMatrix).values(risks);
}

export async function getRiskMatrix(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(riskMatrix).where(eq(riskMatrix.projectId, projectId));
}

export async function saveRiskPromptHistory(data: InsertRiskMatrixPromptHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(riskMatrixPromptHistory).values(data);
}

// ============================================================================
// ACTION PLAN
// ============================================================================

export async function saveActionPlan(data: InsertActionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(actionPlans).values(data) as any;
  return Number(result.insertId);
}

export async function getActionPlan(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(actionPlans)
    .where(eq(actionPlans.projectId, projectId))
    .orderBy(desc(actionPlans.version))
    .limit(1);

  return result[0];
}

export async function updateActionPlanStatus(planId: number, status: string, approvedBy?: number, rejectionReason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  
  if (status === "aprovado") {
    updateData.approvedAt = new Date();
    updateData.approvedBy = approvedBy;
  } else if (status === "reprovado") {
    updateData.rejectionReason = rejectionReason;
  }

  await db.update(actionPlans).set(updateData).where(eq(actionPlans.id, planId));
}

export async function saveActionPlanPromptHistory(data: InsertActionPlanPromptHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(actionPlanPromptHistory).values(data);
}

// ============================================================================
// TASKS
// ============================================================================

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tasks).values(data);
  return Number(result[0].insertId);
}

export async function getTasksByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(tasks.createdAt);

  return result;
}

export async function updateTaskStatus(taskId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  
  if (status === "concluido") {
    updateData.completedAt = new Date();
  }

  await db.update(tasks).set(updateData).where(eq(tasks.id, taskId));
}

export async function updateTask(taskId: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(tasks).set(data).where(eq(tasks.id, taskId));
}

export async function deleteTask(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(tasks).where(eq(tasks.id, taskId));
}

// ============================================================================
// PHASES
// ============================================================================

export async function createPhase(data: InsertPhase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(phases).values(data) as any;
  return Number(result.insertId);
}

export async function getPhasesByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(phases)
    .where(eq(phases.projectId, projectId))
    .orderBy(phases.createdAt);

  return result;
}

// ============================================================================
// ACTION PLAN TEMPLATES
// ============================================================================

export async function createActionPlanTemplate(data: InsertActionPlanTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(actionPlanTemplates).values(data) as any;
  return Number(result.insertId);
}

export async function getAllActionPlanTemplates() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(actionPlanTemplates)
    .orderBy(desc(actionPlanTemplates.usageCount), desc(actionPlanTemplates.createdAt));

  return result;
}

export async function getActionPlanTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(actionPlanTemplates)
    .where(eq(actionPlanTemplates.id, id))
    .limit(1);

  return result[0];
}

export async function deleteActionPlanTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(actionPlanTemplates).where(eq(actionPlanTemplates.id, id));
}

export async function incrementTemplateUsage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const template = await getActionPlanTemplateById(id);
  if (!template) return;

  await db
    .update(actionPlanTemplates)
    .set({ usageCount: (template.usageCount || 0) + 1 })
    .where(eq(actionPlanTemplates.id, id));
}

export async function updateActionPlanTemplate(id: number, data: Partial<InsertActionPlanTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(actionPlanTemplates)
    .set(data)
    .where(eq(actionPlanTemplates.id, id));
}

export async function searchActionPlanTemplates(filters: {
  taxRegime?: string;
  businessType?: string;
  companySize?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(actionPlanTemplates);

  const conditions = [];
  if (filters.taxRegime) {
    conditions.push(eq(actionPlanTemplates.taxRegime, filters.taxRegime as any));
  }
  if (filters.businessType) {
    conditions.push(eq(actionPlanTemplates.businessType, filters.businessType));
  }
  if (filters.companySize) {
    conditions.push(eq(actionPlanTemplates.companySize, filters.companySize as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query.orderBy(desc(actionPlanTemplates.usageCount));
  return result;
}


// ============================================================================
// DASHBOARD
// ============================================================================

export async function getDashboardKPIs(projectId: number) {
  const db = await getDb();
  if (!db) return null;

  // Total de tarefas
  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === "concluido").length;
  const overdueTasks = allTasks.filter(t => 
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "concluido"
  ).length;

  // Taxa de conclusão
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Riscos
  const allRisks = await db
    .select()
    .from(riskMatrix)
    .where(eq(riskMatrix.projectId, projectId));

  const totalRisks = allRisks.length;
  // mitigationStatus field doesn't exist in schema yet
  const mitigatedRisks = 0; // allRisks.filter(r => r.mitigationStatus === "mitigado").length;

  return {
    totalTasks,
    completedTasks,
    overdueTasks,
    completionRate: Math.round(completionRate * 10) / 10,
    totalRisks,
    mitigatedRisks,
  };
}

export async function getTaskDistribution(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  const distribution = {
    pendencias: 0,
    a_fazer: 0,
    em_andamento: 0,
    concluido: 0,
  };

  allTasks.forEach(task => {
    distribution[task.status]++;
  });

  return Object.entries(distribution).map(([status, count]) => ({
    status,
    count,
  }));
}

export async function getRiskDistribution(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const allRisks = await db
    .select()
    .from(riskMatrix)
    .where(eq(riskMatrix.projectId, projectId));

  const distribution: Record<string, number> = {};

  allRisks.forEach(risk => {
    // cosoComponent field doesn't exist in schema yet
    const component = "outros"; // risk.cosoComponent || "outros";
    distribution[component] = (distribution[component] || 0) + 1;
  });

  return Object.entries(distribution).map(([component, count]) => ({
    component,
    count,
  }));
}

export async function getOverdueTasks(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  
  const overdue = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, projectId),
        ne(tasks.status, "concluido")
      )
    );

  return overdue.filter(task => task.dueDate && new Date(task.dueDate) < now);
}


// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function getNotificationsByUser(userId: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(notifications.recipientId, userId)];
  if (projectId) {
    conditions.push(eq(notifications.projectId, projectId));
  }

  const result = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.sentAt));
  
  return result;
}

export async function createNotification(data: {
  projectId: number;
  recipientId: number;
  type: string;
  title: string;
  message: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values({
    projectId: data.projectId,
    recipientId: data.recipientId,
    type: data.type as any,
    subject: data.title,
    message: data.message,
  });

  return Number(result[0].insertId);
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));

  return true;
}
