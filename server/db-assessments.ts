import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { 
  corporateAssessments,
  InsertCorporateAssessment,
  branchAssessments,
  InsertBranchAssessment,
  branchAssessmentTemplates,
  InsertBranchAssessmentTemplate,
} from "../drizzle/schema";

// ============================================================================
// CORPORATE ASSESSMENTS (Questionário Corporativo)
// ============================================================================

export async function getCorporateAssessment(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(corporateAssessments)
    .where(eq(corporateAssessments.projectId, projectId))
    .limit(1);
  
  return result[0] || null;
}

export async function createCorporateAssessment(data: InsertCorporateAssessment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(corporateAssessments).values(data);
  return Number(result[0].insertId);
}

export async function updateCorporateAssessment(
  projectId: number,
  data: Partial<InsertCorporateAssessment>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(corporateAssessments)
    .set(data)
    .where(eq(corporateAssessments.projectId, projectId));
}

export async function completeCorporateAssessment(
  projectId: number,
  answers: any,
  completedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(corporateAssessments)
    .set({
      answers: JSON.stringify(answers),
      completedAt: new Date(),
      completedBy,
    })
    .where(eq(corporateAssessments.projectId, projectId));
}

// ============================================================================
// BRANCH ASSESSMENTS (Questionários por Ramo)
// ============================================================================

export async function getBranchAssessments(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(branchAssessments)
    .where(eq(branchAssessments.projectId, projectId));
}

export async function getBranchAssessment(projectId: number, branchId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(branchAssessments)
    .where(
      and(
        eq(branchAssessments.projectId, projectId),
        eq(branchAssessments.branchId, branchId)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

export async function createBranchAssessment(data: InsertBranchAssessment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(branchAssessments).values(data);
  return Number(result[0].insertId);
}

export async function updateBranchAssessment(
  id: number,
  data: Partial<InsertBranchAssessment>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(branchAssessments)
    .set(data)
    .where(eq(branchAssessments.id, id));
}

export async function completeBranchAssessment(
  id: number,
  answers: any,
  completedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(branchAssessments)
    .set({
      answers: JSON.stringify(answers),
      completedAt: new Date(),
      completedBy,
    })
    .where(eq(branchAssessments.id, id));
}

// ============================================================================
// BRANCH ASSESSMENT TEMPLATES
// ============================================================================

export async function getBranchTemplates(branchId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (branchId) {
    return await db
      .select()
      .from(branchAssessmentTemplates)
      .where(
        and(
          eq(branchAssessmentTemplates.branchId, branchId),
          eq(branchAssessmentTemplates.active, true)
        )
      );
  }
  
  return await db
    .select()
    .from(branchAssessmentTemplates)
    .where(eq(branchAssessmentTemplates.active, true));
}

export async function createBranchTemplate(data: InsertBranchAssessmentTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(branchAssessmentTemplates).values(data);
  return Number(result[0].insertId);
}

export async function incrementTemplateUsage(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Buscar valor atual
  const current = await db
    .select({ usageCount: branchAssessmentTemplates.usageCount })
    .from(branchAssessmentTemplates)
    .where(eq(branchAssessmentTemplates.id, templateId))
    .limit(1);
  
  if (current[0]) {
    await db
      .update(branchAssessmentTemplates)
      .set({ usageCount: current[0].usageCount + 1 })
      .where(eq(branchAssessmentTemplates.id, templateId));
  }
}
