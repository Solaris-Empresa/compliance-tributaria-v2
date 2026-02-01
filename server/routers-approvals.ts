import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { eq, and, desc } from "drizzle-orm";
import { planApprovals, planReviews } from "../drizzle/schema";
import * as db from "./db";
import { notifyProject } from "./_core/websocket";

export const approvalsRouter = router({
  /**
   * Solicitar aprovação de um plano
   */
  request: protectedProcedure
    .input(
      z.object({
        planType: z.enum(["corporate", "branch"]),
        planId: z.number(),
        projectId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Verificar se já existe aprovação pendente
      const [existing] = await database
        .select()
        .from(planApprovals)
        .where(
          and(
            eq(planApprovals.planId, input.planId),
            eq(planApprovals.planType, input.planType),
            eq(planApprovals.status, "pending")
          )
        )
        .limit(1);

      if (existing) {
        return { success: true, approvalId: existing.id, message: "Aprovação já solicitada" };
      }

      // Criar nova solicitação de aprovação
      const [result] = await database.insert(planApprovals).values({
        planType: input.planType,
        planId: input.planId,
        projectId: input.projectId,
        requestedBy: ctx.user.id,
        status: "pending",
      });

      // Emitir notificação WebSocket
      notifyProject(input.projectId, "approval:requested", {
        approvalId: result.insertId,
        planType: input.planType,
        message: `Plano ${input.planType === "corporate" ? "Corporativo" : "por Ramo"} aguardando aprovação`,
      });

      return { success: true, approvalId: result.insertId };
    }),

  /**
   * Listar aprovações de um projeto
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const approvals = await database
        .select()
        .from(planApprovals)
        .where(eq(planApprovals.projectId, input.projectId))
        .orderBy(desc(planApprovals.requestedAt));

      return approvals;
    }),

  /**
   * Obter detalhes de uma aprovação
   */
  get: protectedProcedure
    .input(z.object({ approvalId: z.number() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [approval] = await database
        .select()
        .from(planApprovals)
        .where(eq(planApprovals.id, input.approvalId))
        .limit(1);

      if (!approval) {
        throw new Error("Aprovação não encontrada");
      }

      // Buscar reviews relacionadas
      const reviews = await database
        .select()
        .from(planReviews)
        .where(eq(planReviews.approvalId, input.approvalId))
        .orderBy(desc(planReviews.createdAt));

      return { ...approval, reviews };
    }),

  /**
   * Adicionar comentário/revisão
   */
  addReview: protectedProcedure
    .input(
      z.object({
        approvalId: z.number(),
        comment: z.string().min(1),
        reviewType: z.enum(["comment", "suggestion", "concern", "approval"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [result] = await database.insert(planReviews).values({
        approvalId: input.approvalId,
        reviewerId: ctx.user.id,
        comment: input.comment,
        reviewType: input.reviewType,
      });

      // Buscar aprovação para emitir notificação
      const [approval] = await database
        .select()
        .from(planApprovals)
        .where(eq(planApprovals.id, input.approvalId))
        .limit(1);

      if (approval) {
        notifyProject(approval.projectId, "approval:review_added", {
          approvalId: input.approvalId,
          reviewerId: ctx.user.id,
          message: `${ctx.user.name || "Usuário"} adicionou um comentário`,
        });
      }

      return { success: true, reviewId: result.insertId };
    }),

  /**
   * Aprovar plano
   */
  approve: protectedProcedure
    .input(
      z.object({
        approvalId: z.number(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      await database
        .update(planApprovals)
        .set({
          status: "approved",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewComments: input.comments,
        })
        .where(eq(planApprovals.id, input.approvalId));

      // Buscar aprovação para emitir notificação
      const [approval] = await database
        .select()
        .from(planApprovals)
        .where(eq(planApprovals.id, input.approvalId))
        .limit(1);

      if (approval) {
        notifyProject(approval.projectId, "approval:approved", {
          approvalId: input.approvalId,
          planType: approval.planType,
          message: `Plano ${approval.planType === "corporate" ? "Corporativo" : "por Ramo"} foi aprovado`,
        });
      }

      return { success: true };
    }),

  /**
   * Rejeitar plano
   */
  reject: protectedProcedure
    .input(
      z.object({
        approvalId: z.number(),
        comments: z.string().min(1, "Comentários são obrigatórios para rejeição"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      await database
        .update(planApprovals)
        .set({
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewComments: input.comments,
        })
        .where(eq(planApprovals.id, input.approvalId));

      // Buscar aprovação para emitir notificação
      const [approval] = await database
        .select()
        .from(planApprovals)
        .where(eq(planApprovals.id, input.approvalId))
        .limit(1);

      if (approval) {
        notifyProject(approval.projectId, "approval:rejected", {
          approvalId: input.approvalId,
          planType: approval.planType,
          message: `Plano ${approval.planType === "corporate" ? "Corporativo" : "por Ramo"} foi rejeitado`,
        });
      }

      return { success: true };
    }),

  /**
   * Solicitar revisão
   */
  requestRevision: protectedProcedure
    .input(
      z.object({
        approvalId: z.number(),
        comments: z.string().min(1, "Comentários são obrigatórios para solicitar revisão"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      await database
        .update(planApprovals)
        .set({
          status: "needs_revision",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewComments: input.comments,
        })
        .where(eq(planApprovals.id, input.approvalId));

      // Buscar aprovação para emitir notificação
      const [approval] = await database
        .select()
        .from(planApprovals)
        .where(eq(planApprovals.id, input.approvalId))
        .limit(1);

      if (approval) {
        notifyProject(approval.projectId, "approval:revision_requested", {
          approvalId: input.approvalId,
          planType: approval.planType,
          message: `Plano ${approval.planType === "corporate" ? "Corporativo" : "por Ramo"} precisa de revisão`,
        });
      }

      return { success: true };
    }),
});
