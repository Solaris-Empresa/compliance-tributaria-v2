import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { 
  actionPlans, 
  actionPlanTemplates,
  InsertActionPlan,
  InsertActionPlanTemplate,
  ActionPlan,
  ActionPlanTemplate
} from "../drizzle/schema";

/**
 * Create or update action plan
 */
export async function saveActionPlan(data: InsertActionPlan): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Check if already exists
    const existing = await db
      .select()
      .from(actionPlans)
      .where(eq(actionPlans.projectId, data.projectId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(actionPlans)
        .set(data)
        .where(eq(actionPlans.projectId, data.projectId));
    } else {
      // Insert new
      await db.insert(actionPlans).values(data);
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to save action plan:", error);
    return false;
  }
}

/**
 * Get action plan by project ID
 */
export async function getActionPlan(projectId: number): Promise<ActionPlan | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(actionPlans)
    .where(eq(actionPlans.projectId, projectId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Approve action plan
 */
export async function approveActionPlan(projectId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(actionPlans)
      .set({
        approvedAt: new Date(),
        approvedBy: userId,
      })
      .where(eq(actionPlans.projectId, projectId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to approve action plan:", error);
    return false;
  }
}

/**
 * Search for compatible template
 */
export async function searchTemplate(
  businessType: string,
  taxRegime?: string,
  companySize?: string
): Promise<ActionPlanTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  try {
    // Try exact match first
    if (taxRegime && companySize) {
      const exact = await db
        .select()
        .from(actionPlanTemplates)
        .where(
          and(
            eq(actionPlanTemplates.businessType, businessType),
            eq(actionPlanTemplates.taxRegime, taxRegime),
            eq(actionPlanTemplates.companySize, companySize),
            eq(actionPlanTemplates.isActive, true)
          )
        )
        .limit(1);
      
      if (exact.length > 0) return exact[0];
    }

    // Try without company size
    if (taxRegime) {
      const withoutSize = await db
        .select()
        .from(actionPlanTemplates)
        .where(
          and(
            eq(actionPlanTemplates.businessType, businessType),
            eq(actionPlanTemplates.taxRegime, taxRegime),
            eq(actionPlanTemplates.isActive, true)
          )
        )
        .limit(1);
      
      if (withoutSize.length > 0) return withoutSize[0];
    }

    // Try business type only
    const businessOnly = await db
      .select()
      .from(actionPlanTemplates)
      .where(
        and(
          eq(actionPlanTemplates.businessType, businessType),
          eq(actionPlanTemplates.isActive, true)
        )
      )
      .limit(1);
    
    return businessOnly.length > 0 ? businessOnly[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to search template:", error);
    return undefined;
  }
}

/**
 * Create action plan template
 */
export async function createTemplate(data: InsertActionPlanTemplate): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(actionPlanTemplates).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to create template:", error);
    return null;
  }
}

/**
 * Increment template usage count
 */
export async function incrementTemplateUsage(templateId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const template = await db
      .select()
      .from(actionPlanTemplates)
      .where(eq(actionPlanTemplates.id, templateId))
      .limit(1);

    if (template.length === 0) return false;

    await db
      .update(actionPlanTemplates)
      .set({ usageCount: (template[0].usageCount || 0) + 1 })
      .where(eq(actionPlanTemplates.id, templateId));

    return true;
  } catch (error) {
    console.error("[Database] Failed to increment template usage:", error);
    return false;
  }
}

/**
 * List all templates
 */
export async function listTemplates(): Promise<ActionPlanTemplate[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(actionPlanTemplates)
      .where(eq(actionPlanTemplates.isActive, true))
      .orderBy(actionPlanTemplates.usageCount);
  } catch (error) {
    console.error("[Database] Failed to list templates:", error);
    return [];
  }
}
