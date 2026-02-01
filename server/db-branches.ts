import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { 
  activityBranches, 
  InsertActivityBranch,
  projectBranches,
  InsertProjectBranch,
} from "../drizzle/schema";

// ============================================================================
// ACTIVITY BRANCHES (Ramos de Atividade)
// ============================================================================

export async function getAllBranches() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(activityBranches)
    .where(eq(activityBranches.active, true))
    .orderBy(activityBranches.name);
}

export async function getBranchById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(activityBranches)
    .where(eq(activityBranches.id, id))
    .limit(1);
  
  return result[0] || null;
}

export async function createBranch(data: InsertActivityBranch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(activityBranches).values(data);
  return Number(result[0].insertId);
}

export async function updateBranch(id: number, data: Partial<InsertActivityBranch>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(activityBranches).set(data).where(eq(activityBranches.id, id));
}

export async function deactivateBranch(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(activityBranches).set({ active: false }).where(eq(activityBranches.id, id));
}

// ============================================================================
// PROJECT BRANCHES (Relacionamento Projeto-Ramo)
// ============================================================================

export async function getProjectBranches(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: projectBranches.id,
      branchId: projectBranches.branchId,
      branchCode: activityBranches.code,
      branchName: activityBranches.name,
      branchDescription: activityBranches.description,
      createdAt: projectBranches.createdAt,
    })
    .from(projectBranches)
    .innerJoin(activityBranches, eq(projectBranches.branchId, activityBranches.id))
    .where(eq(projectBranches.projectId, projectId));
  
  return result;
}

export async function addBranchToProject(data: InsertProjectBranch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(projectBranches).values(data);
  return Number(result[0].insertId);
}

export async function removeBranchFromProject(projectId: number, branchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(projectBranches)
    .where(
      eq(projectBranches.projectId, projectId) && 
      eq(projectBranches.branchId, branchId)
    );
}

export async function setBranchesForProject(projectId: number, branchIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Remove todos os ramos atuais
  await db.delete(projectBranches).where(eq(projectBranches.projectId, projectId));
  
  // Adiciona os novos ramos
  if (branchIds.length > 0) {
    await db.insert(projectBranches).values(
      branchIds.map(branchId => ({
        projectId,
        branchId,
      }))
    );
  }
}
