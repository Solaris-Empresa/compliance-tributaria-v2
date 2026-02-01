import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { notifications, notificationPreferences, InsertNotification, InsertNotificationPreference } from "../drizzle/schema";

// ============================================================================
// NOTIFICATIONS ROUTER - Sistema de Notificações
// ============================================================================

export const notificationsRouter = router({
  // ========================================================================
  // NOTIFICAÇÕES
  // ========================================================================

  // Listar notificações do usuário
  list: protectedProcedure
    .input(z.object({
      unreadOnly: z.boolean().optional(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db
        .select()
        .from(notifications)
        .where(eq(notifications.recipientId, ctx.user.id))
        .orderBy(desc(notifications.sentAt))
        .limit(input.limit);

      const results = await query;

      if (input.unreadOnly) {
        return results.filter(n => !n.read);
      }

      return results;
    }),

  // Contar não lidas
  countUnread: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return 0;

      const results = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, ctx.user.id),
            eq(notifications.read, false)
          )
        );

      return results.length;
    }),

  // Marcar como lida
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.recipientId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Marcar todas como lidas
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.recipientId, ctx.user.id));

      return { success: true };
    }),

  // Criar notificação (uso interno/admin)
  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      recipientId: z.number(),
      type: z.enum([
        "atraso",
        "marco_importante",
        "lembrete",
        "aprovacao_pendente",
        "aprovado",
        "reprovado"
      ]),
      subject: z.string(),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(notifications).values({
        projectId: input.projectId,
        recipientId: input.recipientId,
        type: input.type,
        subject: input.subject,
        message: input.message,
      });

      return { id: Number(result[0].insertId) };
    }),

  // ========================================================================
  // PREFERÊNCIAS
  // ========================================================================

  // Buscar preferências do usuário
  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const prefs = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .limit(1);

      if (prefs[0]) return prefs[0];

      // Criar preferências padrão se não existir
      const result = await db.insert(notificationPreferences).values({
        userId: ctx.user.id,
        taskCreated: true,
        taskStarted: true,
        taskDueSoon: true,
        taskOverdue: true,
        taskCompleted: false,
        taskCommented: true,
        emailEnabled: true,
        inAppEnabled: true,
      });

      return {
        id: Number(result[0].insertId),
        userId: ctx.user.id,
        taskCreated: true,
        taskStarted: true,
        taskDueSoon: true,
        taskOverdue: true,
        taskCompleted: false,
        taskCommented: true,
        emailEnabled: true,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),

  // Atualizar preferências
  updatePreferences: protectedProcedure
    .input(z.object({
      taskCreated: z.boolean().optional(),
      taskStarted: z.boolean().optional(),
      taskDueSoon: z.boolean().optional(),
      taskOverdue: z.boolean().optional(),
      taskCompleted: z.boolean().optional(),
      taskCommented: z.boolean().optional(),
      emailEnabled: z.boolean().optional(),
      inAppEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se preferências existem
      const existing = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .limit(1);

      if (existing[0]) {
        // Atualizar
        await db
          .update(notificationPreferences)
          .set(input)
          .where(eq(notificationPreferences.userId, ctx.user.id));
      } else {
        // Criar
        await db.insert(notificationPreferences).values({
          userId: ctx.user.id,
          ...input,
        });
      }

      return { success: true };
    }),

  // ========================================================================
  // HELPERS PARA GERAÇÃO AUTOMÁTICA
  // ========================================================================

  // Notificar sobre tarefa atrasada
  notifyTaskOverdue: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      taskId: z.number(),
      taskTitle: z.string(),
      ownerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar preferências do owner
      const prefs = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, input.ownerId))
        .limit(1);

      if (prefs[0] && !prefs[0].taskOverdue) {
        return { skipped: true };
      }

      await db.insert(notifications).values({
        projectId: input.projectId,
        recipientId: input.ownerId,
        type: "atraso",
        subject: `Tarefa atrasada: ${input.taskTitle}`,
        message: `A tarefa "${input.taskTitle}" está atrasada. Por favor, atualize o status.`,
      });

      return { success: true };
    }),

  // Notificar sobre novo comentário
  notifyNewComment: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      taskId: z.number(),
      taskTitle: z.string(),
      commentAuthor: z.string(),
      recipientIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (const recipientId of input.recipientIds) {
        // Não notificar o autor do comentário
        if (recipientId === ctx.user.id) continue;

        // Verificar preferências
        const prefs = await db
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, recipientId))
          .limit(1);

        if (prefs[0] && !prefs[0].taskCommented) continue;

        await db.insert(notifications).values({
          projectId: input.projectId,
          recipientId,
          type: "lembrete",
          subject: `Novo comentário em: ${input.taskTitle}`,
          message: `${input.commentAuthor} comentou na tarefa "${input.taskTitle}".`,
        });
      }

      return { success: true, notified: input.recipientIds.length };
    }),
});
