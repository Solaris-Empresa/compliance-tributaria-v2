import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { 
  assessmentPhase1, 
  assessmentPhase2,
  InsertAssessmentPhase1,
  InsertAssessmentPhase2,
  AssessmentPhase1,
  AssessmentPhase2
} from "../drizzle/schema";

/**
 * Save or update assessment phase 1
 */
export async function saveAssessmentPhase1(data: InsertAssessmentPhase1): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Check if already exists
    const existing = await db
      .select()
      .from(assessmentPhase1)
      .where(eq(assessmentPhase1.projectId, data.projectId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(assessmentPhase1)
        .set(data)
        .where(eq(assessmentPhase1.projectId, data.projectId));
    } else {
      // Insert new
      await db.insert(assessmentPhase1).values(data);
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to save assessment phase 1:", error);
    return false;
  }
}

/**
 * Get assessment phase 1 by project ID
 */
export async function getAssessmentPhase1(projectId: number): Promise<AssessmentPhase1 | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(assessmentPhase1)
    .where(eq(assessmentPhase1.projectId, projectId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Complete assessment phase 1
 */
export async function completeAssessmentPhase1(projectId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(assessmentPhase1)
      .set({
        completedAt: new Date(),
        completedBy: userId,
      })
      .where(eq(assessmentPhase1.projectId, projectId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to complete assessment phase 1:", error);
    return false;
  }
}

/**
 * Save or update assessment phase 2
 */
export async function saveAssessmentPhase2(data: InsertAssessmentPhase2): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Check if already exists
    const existing = await db
      .select()
      .from(assessmentPhase2)
      .where(eq(assessmentPhase2.projectId, data.projectId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(assessmentPhase2)
        .set(data)
        .where(eq(assessmentPhase2.projectId, data.projectId));
    } else {
      // Insert new
      await db.insert(assessmentPhase2).values(data);
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to save assessment phase 2:", error);
    return false;
  }
}

/**
 * Get assessment phase 2 by project ID
 */
export async function getAssessmentPhase2(projectId: number): Promise<AssessmentPhase2 | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(assessmentPhase2)
    .where(eq(assessmentPhase2.projectId, projectId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Complete assessment phase 2
 */
export async function completeAssessmentPhase2(projectId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(assessmentPhase2)
      .set({
        completedAt: new Date(),
        completedBy: userId,
      })
      .where(eq(assessmentPhase2.projectId, projectId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to complete assessment phase 2:", error);
    return false;
  }
}
