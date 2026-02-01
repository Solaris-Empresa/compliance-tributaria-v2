/**
 * Router tRPC para Logs de Auditoria
 * Sprint V19 - Feature 2
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { auditLog, users } from "../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export const auditLogsRouter = router({
  /**
   * Listar logs de auditoria com filtros
   */
  list: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      userId: z.number().optional(),
      entityType: z.enum([
        "action",
        "task",
        "corporate_assessment",
        "branch_assessment",
        "corporate_question",
        "branch_question",
      ]).optional(),
      startDate: z.string().optional(), // ISO date string
      endDate: z.string().optional(),   // ISO date string
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Construir condições de filtro
      const conditions = [
        eq(auditLog.projectId, input.projectId),
      ];

      if (input.userId) {
        conditions.push(eq(auditLog.userId, input.userId));
      }

      if (input.entityType) {
        conditions.push(eq(auditLog.entityType, input.entityType));
      }

      if (input.startDate) {
        const startDate = new Date(input.startDate);
        conditions.push(gte(auditLog.timestamp, startDate));
      }

      if (input.endDate) {
        const endDate = new Date(input.endDate);
        conditions.push(lte(auditLog.timestamp, endDate));
      }

      // Buscar logs com join de usuário
      const logs = await db
        .select({
          id: auditLog.id,
          projectId: auditLog.projectId,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          action: auditLog.action,
          userId: auditLog.userId,
          userName: users.name,
          changes: auditLog.changes,
          timestamp: auditLog.timestamp,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(auditLog.id))
        .limit(input.limit);

      return {
        logs: logs.map(log => ({
          ...log,
          userName: log.userName || "Usuário Desconhecido",
          changes: typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes,
        })),
        total: logs.length,
      };
    }),

  /**
   * Obter detalhes de um log específico
   */
  get: protectedProcedure
    .input(z.object({
      logId: z.number(),
      projectId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [log] = await db
        .select({
          id: auditLog.id,
          projectId: auditLog.projectId,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          action: auditLog.action,
          userId: auditLog.userId,
          userName: users.name,
          changes: auditLog.changes,
          timestamp: auditLog.timestamp,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.userId, users.id))
        .where(
          and(
            eq(auditLog.id, input.logId),
            eq(auditLog.projectId, input.projectId)
          )
        )
        .limit(1);

      if (!log) {
        throw new Error("Log de auditoria não encontrado");
      }

      return {
        ...log,
        userName: log.userName || "Usuário Desconhecido",
        changes: typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes,
      };
    }),

  /**
   * Estatísticas de auditoria
   */
  stats: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(auditLog.projectId, input.projectId)];

      if (input.startDate) {
        const startDate = new Date(input.startDate);
        conditions.push(gte(auditLog.timestamp, startDate));
      }

      if (input.endDate) {
        const endDate = new Date(input.endDate);
        conditions.push(lte(auditLog.timestamp, endDate));
      }

      const logs = await db
        .select()
        .from(auditLog)
        .where(and(...conditions));

      // Calcular estatísticas
      const stats = {
        total: logs.length,
        byAction: {
          create: logs.filter(l => l.action === "create").length,
          update: logs.filter(l => l.action === "update").length,
          delete: logs.filter(l => l.action === "delete").length,
          status_change: logs.filter(l => l.action === "status_change").length,
        },
        byEntityType: logs.reduce((acc, log) => {
          acc[log.entityType] = (acc[log.entityType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        topUsers: Object.entries(
          logs.reduce((acc, log) => {
            acc[log.userId] = (acc[log.userId] || 0) + 1;
            return acc;
          }, {} as Record<number, number>)
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([userId, count]) => ({ userId: parseInt(userId), count })),
      };

      return stats;
    }),
});
