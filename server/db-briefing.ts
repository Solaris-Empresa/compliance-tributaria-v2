import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { briefings, InsertBriefing, Briefing } from "../drizzle/schema";

/**
 * Create or update briefing
 */
export async function saveBriefing(data: InsertBriefing): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Check if already exists
    const existing = await db
      .select()
      .from(briefings)
      .where(eq(briefings.projectId, data.projectId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(briefings)
        .set(data)
        .where(eq(briefings.projectId, data.projectId));
    } else {
      // Insert new
      await db.insert(briefings).values(data);
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to save briefing:", error);
    return false;
  }
}

/**
 * Get briefing by project ID
 */
export async function getBriefing(projectId: number): Promise<Briefing | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(briefings)
    .where(eq(briefings.projectId, projectId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}
