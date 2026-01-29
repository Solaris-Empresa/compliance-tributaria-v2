import { eq, and, isNull, or } from "drizzle-orm";
import { getDb } from "./db";
import { 
  projects, 
  projectParticipants, 
  InsertProject, 
  InsertProjectParticipant,
  Project,
  ProjectParticipant 
} from "../drizzle/schema";

/**
 * Create a new project
 */
export async function createProject(data: InsertProject): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(projects).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to create project:", error);
    return null;
  }
}

/**
 * Get project by ID
 */
export async function getProjectById(id: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Update project
 */
export async function updateProject(id: number, data: Partial<InsertProject>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(projects).set(data).where(eq(projects.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update project:", error);
    return false;
  }
}

/**
 * List projects by user role
 */
export async function listProjectsByUser(userId: number, userRole: string): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Admin sees all projects
    if (userRole === "admin") {
      return await db.select().from(projects).orderBy(projects.createdAt);
    }

    // Clients and team members see only projects they participate in
    const participations = await db
      .select({ projectId: projectParticipants.projectId })
      .from(projectParticipants)
      .where(
        and(
          eq(projectParticipants.userId, userId),
          isNull(projectParticipants.removedAt)
        )
      );

    if (participations.length === 0) return [];

    const projectIds = participations.map(p => p.projectId);
    
    // Get all projects where user participates
    const userProjects = await db
      .select()
      .from(projects)
      .where(
        or(...projectIds.map(id => eq(projects.id, id)))
      )
      .orderBy(projects.createdAt);

    return userProjects;
  } catch (error) {
    console.error("[Database] Failed to list projects:", error);
    return [];
  }
}

/**
 * Add participant to project
 */
export async function addProjectParticipant(data: InsertProjectParticipant): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(projectParticipants).values(data);
    return true;
  } catch (error) {
    console.error("[Database] Failed to add participant:", error);
    return false;
  }
}

/**
 * Remove participant from project (soft delete)
 */
export async function removeProjectParticipant(projectId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(projectParticipants)
      .set({ removedAt: new Date() })
      .where(
        and(
          eq(projectParticipants.projectId, projectId),
          eq(projectParticipants.userId, userId),
          isNull(projectParticipants.removedAt)
        )
      );
    return true;
  } catch (error) {
    console.error("[Database] Failed to remove participant:", error);
    return false;
  }
}

/**
 * Update participant role
 */
export async function updateParticipantRole(
  projectId: number, 
  userId: number, 
  role: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(projectParticipants)
      .set({ role: role as any })
      .where(
        and(
          eq(projectParticipants.projectId, projectId),
          eq(projectParticipants.userId, userId),
          isNull(projectParticipants.removedAt)
        )
      );
    return true;
  } catch (error) {
    console.error("[Database] Failed to update participant role:", error);
    return false;
  }
}

/**
 * List project participants
 */
export async function listProjectParticipants(projectId: number): Promise<ProjectParticipant[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(projectParticipants)
      .where(
        and(
          eq(projectParticipants.projectId, projectId),
          isNull(projectParticipants.removedAt)
        )
      )
      .orderBy(projectParticipants.joinedAt);
  } catch (error) {
    console.error("[Database] Failed to list participants:", error);
    return [];
  }
}

/**
 * Check if user has access to project
 */
export async function checkProjectAccess(projectId: number, userId: number, userRole: string): Promise<boolean> {
  // Admin has access to all projects
  if (userRole === "admin") return true;

  const db = await getDb();
  if (!db) return false;

  try {
    // Check if user is a participant
    const participation = await db
      .select()
      .from(projectParticipants)
      .where(
        and(
          eq(projectParticipants.projectId, projectId),
          eq(projectParticipants.userId, userId),
          isNull(projectParticipants.removedAt)
        )
      )
      .limit(1);

    return participation.length > 0;
  } catch (error) {
    console.error("[Database] Failed to check project access:", error);
    return false;
  }
}
