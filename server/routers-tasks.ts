import { z } from "zod";
import { eq, and, or, isNull } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { actions, taskObservers, InsertAction, InsertTaskObserver } from "../drizzle/schema";
import { notifyProject, notifyUser } from "./_core/websocket";
import { logAudit } from "./routers-audit";

// ============================================================================
// TASKS ROUTER - Gestão Completa de Tarefas
// ============================================================================

export const tasksRouter = router({
  // Listar tarefas de um projeto
  list: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      filters: z.object({
        category: z.enum(["corporate", "branch"]).optional(),
        branchId: z.number().optional(),
        responsibleArea: z.enum(["TI", "CONT", "FISC", "JUR", "OPS", "COM", "ADM"]).optional(),
        taskType: z.enum(["STRATEGIC", "OPERATIONAL", "COMPLIANCE"]).optional(),
        status: z.enum(["SUGGESTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"]).optional(),
        ownerId: z.number().optional(),
      }).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db.select().from(actions).where(eq(actions.projectId, input.projectId));

      // Aplicar filtros (simplificado - em produção usar query builder dinâmico)
      const results = await query;
      
      if (!input.filters) return results;

      return results.filter(task => {
        if (input.filters!.category && task.category !== input.filters!.category) return false;
        if (input.filters!.branchId && task.branchId !== input.filters!.branchId) return false;
        if (input.filters!.responsibleArea && task.responsibleArea !== input.filters!.responsibleArea) return false;
        if (input.filters!.taskType && task.taskType !== input.filters!.taskType) return false;
        if (input.filters!.status && task.status !== input.filters!.status) return false;
        if (input.filters!.ownerId && task.ownerId !== input.filters!.ownerId) return false;
        return true;
      });
    }),

  // Buscar tarefa específica
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db.select().from(actions).where(eq(actions.id, input.id)).limit(1);
      return result[0] || null;
    }),

  // Criar tarefa manualmente
  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      category: z.enum(["corporate", "branch"]),
      branchId: z.number().optional(),
      title: z.string(),
      description: z.string(),
      responsibleArea: z.enum(["TI", "CONT", "FISC", "JUR", "OPS", "COM", "ADM"]),
      taskType: z.enum(["STRATEGIC", "OPERATIONAL", "COMPLIANCE"]),
      priority: z.enum(["baixa", "media", "alta", "critica"]),
      // ownerId, dueDate, dependsOn: serão implementados após ajuste do schema
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(actions).values({
        projectId: input.projectId,
        category: input.category,
        branchId: input.branchId,
        title: input.title,
        description: input.description,
        responsibleArea: input.responsibleArea,
        taskType: input.taskType,
        priority: input.priority,
        ownerId: 0, // Placeholder
        startDate: new Date(),
        deadline: new Date(),
        status: "SUGGESTED",
        createdBy: ctx.user.id,
      });

      const taskId = Number(result[0].insertId);

      // Registrar auditoria
      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        projectId: input.projectId,
        entityType: "task",
        entityId: taskId,
        action: "create",
        metadata: {
          title: input.title,
          category: input.category,
          responsibleArea: input.responsibleArea,
        },
      });

      return { id: taskId };
    }),

  // Atualizar tarefa
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        responsibleArea: z.enum(["TI", "CONT", "FISC", "JUR", "OPS", "COM", "ADM"]).optional(),
        taskType: z.enum(["STRATEGIC", "OPERATIONAL", "COMPLIANCE"]).optional(),
        priority: z.enum(["baixa", "media", "alta", "critica"]).optional(),
        // ownerId, dueDate, dependsOn: temporariamente removidos
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = { ...input.data };
      // dependsOn update será implementado depois

      await db.update(actions).set(updateData).where(eq(actions.id, input.id));

      return { success: true };
    }),

  // Atualizar status da tarefa
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["SUGGESTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = { status: input.status };

      if (input.status === "IN_PROGRESS") {
        updateData.startedAt = new Date();
        updateData.startedBy = ctx.user.id;
      } else if (input.status === "COMPLETED") {
        updateData.completedAt = new Date();
        updateData.completedBy = ctx.user.id;
      }

      await db.update(actions).set(updateData).where(eq(actions.id, input.id));

      // Buscar tarefa atualizada para notificação
      const taskResult = await db.select().from(actions).where(eq(actions.id, input.id)).limit(1);
      const task = taskResult[0];

      if (task) {
        // Notificar projeto sobre mudança de status
        notifyProject(task.projectId, "task:updated", {
          taskId: task.id,
          projectId: task.projectId,
          message: `Tarefa "${task.title}" mudou para ${input.status}`,
          status: input.status,
          updatedBy: ctx.user.name,
        });

        // Notificar owner se existir
        if (task.ownerId) {
          notifyUser(task.ownerId, "task:updated", {
            taskId: task.id,
            projectId: task.projectId,
            message: `Sua tarefa "${task.title}" mudou para ${input.status}`,
            status: input.status,
          });
        }

        // Registrar auditoria de mudança de status
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          projectId: task.projectId,
          entityType: "task",
          entityId: task.id,
          action: "status_change",
          changes: {
            status: { old: "previous", new: input.status },
          },
          metadata: {
            title: task.title,
          },
        });
      }

      return { success: true };
    }),

  // Atribuir owner
  assignOwner: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      ownerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(actions).set({ ownerId: input.ownerId }).where(eq(actions.id, input.taskId));

      return { success: true };
    }),

  // Adicionar observador
  addObserver: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(taskObservers).values({
        taskId: input.taskId,
        userId: input.userId,
      });

      return { success: true };
    }),

  // Remover observador
  removeObserver: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(taskObservers).where(
        and(
          eq(taskObservers.taskId, input.taskId),
          eq(taskObservers.userId, input.userId)
        )
      );

      return { success: true };
    }),

  // Listar observadores de uma tarefa
  getObservers: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(taskObservers).where(eq(taskObservers.taskId, input.taskId));
    }),

  // Calcular tarefas atrasadas (executar periodicamente)
  calculateOverdue: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();

      // Buscar tarefas não concluídas com prazo vencido
      const tasks = await db.select().from(actions).where(
        and(
          eq(actions.projectId, input.projectId),
          or(
            eq(actions.status, "SUGGESTED"),
            eq(actions.status, "IN_PROGRESS")
          )
        )
      );

      let overdueCount = 0;

      for (const task of tasks) {
        if (task.deadline && task.deadline < now) {
          await db.update(actions).set({ status: "OVERDUE" }).where(eq(actions.id, task.id));
          overdueCount++;
        }
      }

      return { overdueCount };
    }),

  // Deletar tarefa
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Deletar observadores primeiro
      await db.delete(taskObservers).where(eq(taskObservers.taskId, input.id));

      // Deletar tarefa
      await db.delete(actions).where(eq(actions.id, input.id));

      return { success: true };
    }),

  // Importar tarefas de um plano gerado
  importFromPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      category: z.enum(["corporate", "branch"]),
      branchId: z.number().optional(),
      tasks: z.array(z.object({
        title: z.string(),
        description: z.string(),
        responsibleArea: z.enum(["TI", "CONT", "FISC", "JUR", "OPS", "COM", "ADM"]),
        taskType: z.enum(["STRATEGIC", "OPERATIONAL", "COMPLIANCE"]),
        priority: z.enum(["baixa", "media", "alta", "critica"]),
        estimatedDays: z.number(),
        dependsOn: z.array(z.number()).optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const imported = [];

      for (const task of input.tasks) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + task.estimatedDays);

        const result = await db.insert(actions).values({
          projectId: input.projectId,
          category: input.category,
          branchId: input.branchId,
          title: task.title,
          description: task.description,
          responsibleArea: task.responsibleArea,
          taskType: task.taskType,
          priority: task.priority,
          ownerId: 0, // Placeholder
          startDate: new Date(),
          deadline: dueDate,
          status: "SUGGESTED",
          createdBy: ctx.user.id,
        });

        imported.push(Number(result[0].insertId));
      }

      return { imported: imported.length, taskIds: imported };
    }),
});
