import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { auditLog, InsertAuditLog } from "../drizzle/schema";

// ============================================================================
// AUDIT ROUTER - Sistema de Histórico de Auditoria
// ============================================================================

export const auditRouter = router({
  // Listar logs de auditoria de um projeto
  list: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      entityType: z.enum(["task", "comment", "corporate_assessment", "branch_assessment", "project", "permission"]).optional(),
      entityId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db
        .select()
        .from(auditLog)
        .where(eq(auditLog.projectId, input.projectId))
        .orderBy(desc(auditLog.timestamp))
        .limit(input.limit)
        .offset(input.offset);

      const results = await query;

      // Filtrar por entityType e entityId se fornecidos
      if (input.entityType || input.entityId) {
        return results.filter(log => {
          if (input.entityType && log.entityType !== input.entityType) return false;
          if (input.entityId && log.entityId !== input.entityId) return false;
          return true;
        });
      }

      return results;
    }),

  // Buscar logs de uma entidade específica
  getByEntity: protectedProcedure
    .input(z.object({
      entityType: z.enum(["task", "comment", "corporate_assessment", "branch_assessment", "project", "permission"]),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const results = await db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.entityType, input.entityType),
            eq(auditLog.entityId, input.entityId)
          )
        )
        .orderBy(desc(auditLog.timestamp));

      return results;
    }),

  // Buscar logs de um usuário
  getByUser: protectedProcedure
    .input(z.object({
      userId: z.number(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(auditLog)
        .where(eq(auditLog.userId, input.userId))
        .orderBy(desc(auditLog.timestamp))
        .limit(input.limit);
    }),
});

/**
 * Função auxiliar para registrar ação de auditoria
 * Deve ser chamada de outros routers após mudanças
 */
export async function logAudit(data: {
  userId: number;
  userName: string;
  projectId: number;
  entityType: "task" | "comment" | "corporate_assessment" | "branch_assessment" | "project" | "permission";
  entityId: number;
  action: "create" | "update" | "delete" | "status_change";
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) {
    console.error("[Audit] Database not available");
    return;
  }

  try {
    await db.insert(auditLog).values({
      userId: data.userId,
      userName: data.userName,
      projectId: data.projectId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      changes: data.changes || null,
      metadata: data.metadata || null,
    });
  } catch (error) {
    console.error("[Audit] Failed to log action:", error);
  }
}
