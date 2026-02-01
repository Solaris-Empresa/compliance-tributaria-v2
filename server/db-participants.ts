/**
 * Funções auxiliares para projectParticipants
 * Sprint V19 - Feature 3
 */

import { eq, and } from "drizzle-orm";
import { projectParticipants } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Obter participante de um projeto
 */
export async function getProjectParticipant(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(projectParticipants)
    .where(
      and(
        eq(projectParticipants.projectId, projectId),
        eq(projectParticipants.userId, userId)
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Obter todos os participantes de um projeto
 */
export async function getProjectParticipants(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projectParticipants)
    .where(eq(projectParticipants.projectId, projectId));
}
