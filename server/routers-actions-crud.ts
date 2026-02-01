/**
 * Router para CRUD de Ações dos Planos de Ação com Auditoria
 * Sprint V18 - Sistema de Edição Completo
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { actions, auditLog, projects, projectParticipants } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Helper para validar acesso ao projeto
const validateProjectAccess = async (ctx: any, projectId: number) => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

  // Equipe SOLARIS e Advogado Sênior têm acesso total
  if (ctx.user.role === "equipe_solaris" || ctx.user.role === "advogado_senior") {
    return project;
  }

  // Cliente precisa estar vinculado ao projeto
  const [participant] = await db.select().from(projectParticipants)
    .where(and(
      eq(projectParticipants.projectId, projectId),
      eq(projectParticipants.userId, ctx.user.id)
    )).limit(1);

  if (!participant) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

  return project;
};

// Helper para registrar auditoria
const logAudit = async (
  userId: number,
  userName: string,
  projectId: number,
  entityId: number,
  action: "create" | "update" | "delete" | "status_change",
  changes?: Record<string, { old: any; new: any }>,
  metadata?: Record<string, any>
) => {
  const db = await getDb();
  if (!db) return;

  await db.insert(auditLog).values({
    userId,
    userName,
    projectId,
    entityType: "action",
    entityId,
    action,
    changes,
    metadata,
  });
};

export const actionsCrudRouter = router({
  /**
   * Criar nova ação
   */
  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      category: z.enum(["corporate", "branch"]),
      branchId: z.number().optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      responsibleArea: z.enum(["TI", "CONT", "FISC", "JUR", "OPS", "COM", "ADM"]),
      taskType: z.enum(["STRATEGIC", "OPERATIONAL", "COMPLIANCE"]),
      priority: z.enum(["baixa", "media", "alta", "critica"]).optional(),
      status: z.enum(["SUGGESTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"]).optional(),
      ownerId: z.number(),
      startDate: z.string(), // ISO date string
      deadline: z.string(), // ISO date string
      dependsOn: z.number().optional(),
      estimatedHours: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await validateProjectAccess(ctx, input.projectId);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Validar branchId se category = branch
      if (input.category === "branch" && !input.branchId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "branchId is required for branch category" });
      }

      // Criar ação
      const result: any = await db.insert(actions).values({
        projectId: input.projectId,
        category: input.category,
        branchId: input.branchId || null,
        title: input.title,
        description: input.description || null,
        responsibleArea: input.responsibleArea,
        taskType: input.taskType,
        priority: input.priority || "media",
        status: input.status || "SUGGESTED",
        ownerId: input.ownerId,
        startDate: new Date(input.startDate),
        deadline: new Date(input.deadline),
        dependsOn: input.dependsOn || null,
        estimatedHours: input.estimatedHours || null,
        createdBy: ctx.user.id,
        phaseId: null,
        riskId: null,
        actualHours: null,
      });

      const actionId = Number(result.insertId);

      // Registrar auditoria
      await logAudit(
        ctx.user.id,
        ctx.user.name || "Usuário",
        input.projectId,
        actionId,
        "create",
        undefined,
        { category: input.category, branchId: input.branchId, title: input.title }
      );

      return { success: true, actionId };
    }),

  /**
   * Editar ação existente
   */
  update: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      projectId: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      responsibleArea: z.enum(["TI", "CONT", "FISC", "JUR", "OPS", "COM", "ADM"]).optional(),
      taskType: z.enum(["STRATEGIC", "OPERATIONAL", "COMPLIANCE"]).optional(),
      priority: z.enum(["baixa", "media", "alta", "critica"]).optional(),
      status: z.enum(["SUGGESTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"]).optional(),
      ownerId: z.number().optional(),
      startDate: z.string().optional(), // ISO date string
      deadline: z.string().optional(), // ISO date string
      dependsOn: z.number().optional(),
      estimatedHours: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await validateProjectAccess(ctx, input.projectId);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Buscar ação atual
      const [currentAction] = await db.select().from(actions).where(eq(actions.id, input.actionId)).limit(1);
      if (!currentAction) throw new TRPCError({ code: "NOT_FOUND", message: "Action not found" });

      // Preparar mudanças
      const changes: Record<string, { old: any; new: any }> = {};
      const updates: any = {};

      if (input.title !== undefined && input.title !== currentAction.title) {
        changes.title = { old: currentAction.title, new: input.title };
        updates.title = input.title;
      }
      if (input.description !== undefined && input.description !== currentAction.description) {
        changes.description = { old: currentAction.description, new: input.description };
        updates.description = input.description;
      }
      if (input.responsibleArea !== undefined && input.responsibleArea !== currentAction.responsibleArea) {
        changes.responsibleArea = { old: currentAction.responsibleArea, new: input.responsibleArea };
        updates.responsibleArea = input.responsibleArea;
      }
      if (input.taskType !== undefined && input.taskType !== currentAction.taskType) {
        changes.taskType = { old: currentAction.taskType, new: input.taskType };
        updates.taskType = input.taskType;
      }
      if (input.priority !== undefined && input.priority !== currentAction.priority) {
        changes.priority = { old: currentAction.priority, new: input.priority };
        updates.priority = input.priority;
      }
      if (input.status !== undefined && input.status !== currentAction.status) {
        changes.status = { old: currentAction.status, new: input.status };
        updates.status = input.status;
      }
      if (input.ownerId !== undefined && input.ownerId !== currentAction.ownerId) {
        changes.ownerId = { old: currentAction.ownerId, new: input.ownerId };
        updates.ownerId = input.ownerId;
      }
      if (input.startDate !== undefined) {
        const newStartDate = new Date(input.startDate);
        const oldStartDate = currentAction.startDate ? new Date(currentAction.startDate).toISOString() : null;
        const newStartDateStr = newStartDate.toISOString();
        if (oldStartDate !== newStartDateStr) {
          changes.startDate = { old: oldStartDate, new: newStartDateStr };
          updates.startDate = newStartDate;
        }
      }
      if (input.deadline !== undefined) {
        const newDeadline = new Date(input.deadline);
        const oldDeadline = currentAction.deadline ? new Date(currentAction.deadline).toISOString() : null;
        const newDeadlineStr = newDeadline.toISOString();
        if (oldDeadline !== newDeadlineStr) {
          changes.deadline = { old: oldDeadline, new: newDeadlineStr };
          updates.deadline = newDeadline;
        }
      }
      if (input.dependsOn !== undefined && input.dependsOn !== currentAction.dependsOn) {
        changes.dependsOn = { old: currentAction.dependsOn, new: input.dependsOn };
        updates.dependsOn = input.dependsOn;
      }
      if (input.estimatedHours !== undefined && input.estimatedHours !== currentAction.estimatedHours) {
        changes.estimatedHours = { old: currentAction.estimatedHours, new: input.estimatedHours };
        updates.estimatedHours = input.estimatedHours;
      }

      // Se não há mudanças, retornar sucesso
      if (Object.keys(updates).length === 0) {
        return { success: true, message: "No changes detected" };
      }

      // Atualizar ação
      await db.update(actions).set(updates).where(eq(actions.id, input.actionId));

      // Registrar auditoria
      await logAudit(
        ctx.user.id,
        ctx.user.name || "Usuário",
        input.projectId,
        input.actionId,
        "update",
        changes,
        { title: currentAction.title }
      );

      return { success: true, changes };
    }),

  /**
   * Excluir ação
   */
  delete: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      projectId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await validateProjectAccess(ctx, input.projectId);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Buscar ação atual
      const [currentAction] = await db.select().from(actions).where(eq(actions.id, input.actionId)).limit(1);
      if (!currentAction) throw new TRPCError({ code: "NOT_FOUND", message: "Action not found" });

      // Excluir ação
      await db.delete(actions).where(eq(actions.id, input.actionId));

      // Registrar auditoria
      await logAudit(
        ctx.user.id,
        ctx.user.name || "Usuário",
        input.projectId,
        input.actionId,
        "delete",
        undefined,
        { title: currentAction.title, deletedAction: currentAction }
      );

      return { success: true };
    }),

  /**
   * Listar ações de um projeto
   */
  list: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      category: z.enum(["corporate", "branch"]).optional(),
      branchId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await validateProjectAccess(ctx, input.projectId);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions: any[] = [eq(actions.projectId, input.projectId)];

      if (input.category) {
        conditions.push(eq(actions.category, input.category));
      }

      if (input.branchId) {
        conditions.push(eq(actions.branchId, input.branchId));
      }

      const actionsList = await db.select().from(actions).where(and(...conditions));

      return { actions: actionsList };
    }),
});
