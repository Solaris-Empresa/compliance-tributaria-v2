import { eq, and, isNull, or } from "drizzle-orm";
import { getDb } from "./db";
import { 
  tasks, 
  sprints,
  cosoControls,
  milestones,
  taskComments,
  InsertTask,
  InsertSprint,
  InsertCosoControl,
  InsertMilestone,
  InsertTaskComment,
  Task,
  Sprint,
  CosoControl,
  Milestone
} from "../drizzle/schema";

// ===== TASKS =====

export async function createTask(data: InsertTask): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(tasks).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to create task:", error);
    return null;
  }
}

export async function getTaskById(id: number): Promise<Task | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTask(id: number, data: Partial<InsertTask>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(tasks).set(data).where(eq(tasks.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update task:", error);
    return false;
  }
}

export async function listTasksByProject(projectId: number, filters?: {
  status?: string;
  assignedTo?: number;
  sprintId?: number;
}): Promise<Task[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    let conditions = [eq(tasks.projectId, projectId)];
    
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status as any));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(tasks.assignedTo, filters.assignedTo));
    }
    if (filters?.sprintId) {
      conditions.push(eq(tasks.sprintId, filters.sprintId));
    }

    return await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(tasks.createdAt);
  } catch (error) {
    console.error("[Database] Failed to list tasks:", error);
    return [];
  }
}

export async function addTaskComment(data: InsertTaskComment): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(taskComments).values(data);
    return true;
  } catch (error) {
    console.error("[Database] Failed to add comment:", error);
    return false;
  }
}

export async function getTaskComments(taskId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, taskId))
    .orderBy(taskComments.createdAt);
}

// ===== SPRINTS =====

export async function createSprint(data: InsertSprint): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(sprints).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to create sprint:", error);
    return null;
  }
}

export async function updateSprint(id: number, data: Partial<InsertSprint>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(sprints).set(data).where(eq(sprints.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update sprint:", error);
    return false;
  }
}

export async function listSprintsByProject(projectId: number): Promise<Sprint[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(sprints)
    .where(eq(sprints.projectId, projectId))
    .orderBy(sprints.startDate);
}

export async function getActiveSprint(projectId: number): Promise<Sprint | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(sprints)
    .where(
      and(
        eq(sprints.projectId, projectId),
        eq(sprints.status, "active")
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== COSO CONTROLS =====

export async function createCosoControl(data: InsertCosoControl): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(cosoControls).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to create COSO control:", error);
    return null;
  }
}

export async function updateCosoControl(id: number, data: Partial<InsertCosoControl>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(cosoControls).set(data).where(eq(cosoControls.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update COSO control:", error);
    return false;
  }
}

export async function listCosoControlsByProject(projectId: number, category?: string): Promise<CosoControl[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    if (category) {
      return await db
        .select()
        .from(cosoControls)
        .where(
          and(
            eq(cosoControls.projectId, projectId),
            eq(cosoControls.category, category as any)
          )
        );
    }

    return await db
      .select()
      .from(cosoControls)
      .where(eq(cosoControls.projectId, projectId));
  } catch (error) {
    console.error("[Database] Failed to list COSO controls:", error);
    return [];
  }
}

// ===== MILESTONES =====

export async function createMilestone(data: InsertMilestone): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(milestones).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to create milestone:", error);
    return null;
  }
}

export async function updateMilestone(id: number, data: Partial<InsertMilestone>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(milestones).set(data).where(eq(milestones.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update milestone:", error);
    return false;
  }
}

export async function listMilestonesByProject(projectId: number): Promise<Milestone[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(milestones.targetDate);
}
