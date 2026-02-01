/**
 * Router para CRUD de Questões dos Questionários com Auditoria
 * Sprint V18 - Sistema de Edição Completo
 * 
 * Suporta edição de:
 * - Questões do Questionário Corporativo (campos estruturados)
 * - Questões do Questionário por Ramo (JSON dinâmico gerado por IA)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { corporateAssessments, branchAssessments, auditLog, projects, projectParticipants } from "../drizzle/schema";
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
  entityType: "corporate_question" | "branch_question",
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
    entityType,
    entityId,
    action,
    changes,
    metadata,
  });
};

// Schema para questão do questionário por ramo
const QuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["text", "boolean", "multiple_choice", "number"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

export const questionsCrudRouter = router({
  /**
   * CRUD para Questionário Corporativo (campos estruturados)
   */
  corporate: router({
    /**
     * Atualizar campos do questionário corporativo
     */
    update: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        taxRegime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]).optional(),
        companySize: z.enum(["mei", "pequena", "media", "grande"]).optional(),
        annualRevenue: z.string().optional(),
        employeeCount: z.number().optional(),
        hasInternationalOperations: z.boolean().optional(),
        hasAccountingDept: z.boolean().optional(),
        hasTaxDept: z.boolean().optional(),
        hasLegalDept: z.boolean().optional(),
        hasITDept: z.boolean().optional(),
        erpSystem: z.string().optional(),
        hasIntegratedSystems: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await validateProjectAccess(ctx, input.projectId);

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Buscar assessment atual
        const [currentAssessment] = await db.select().from(corporateAssessments)
          .where(eq(corporateAssessments.projectId, input.projectId)).limit(1);

        if (!currentAssessment) throw new TRPCError({ code: "NOT_FOUND", message: "Corporate assessment not found" });

        // Preparar mudanças
        const changes: Record<string, { old: any; new: any }> = {};
        const updates: any = {};

        const fields = [
          "taxRegime", "companySize", "annualRevenue", "employeeCount",
          "hasInternationalOperations", "hasAccountingDept", "hasTaxDept",
          "hasLegalDept", "hasITDept", "erpSystem", "hasIntegratedSystems"
        ] as const;

        fields.forEach((field) => {
          if (input[field] !== undefined && input[field] !== currentAssessment[field]) {
            changes[field] = { old: currentAssessment[field], new: input[field] };
            updates[field] = input[field];
          }
        });

        // Se não há mudanças, retornar sucesso
        if (Object.keys(updates).length === 0) {
          return { success: true, message: "No changes detected" };
        }

        // Atualizar assessment
        await db.update(corporateAssessments).set(updates)
          .where(eq(corporateAssessments.projectId, input.projectId));

        // Registrar auditoria
        await logAudit(
          ctx.user.id,
          ctx.user.name || "Usuário",
          input.projectId,
          "corporate_question",
          currentAssessment.id,
          "update",
          changes,
          { assessmentId: currentAssessment.id }
        );

        return { success: true, changes };
      }),

    /**
     * Obter questionário corporativo
     */
    get: protectedProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        await validateProjectAccess(ctx, input.projectId);

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        const [assessment] = await db.select().from(corporateAssessments)
          .where(eq(corporateAssessments.projectId, input.projectId)).limit(1);

        if (!assessment) throw new TRPCError({ code: "NOT_FOUND", message: "Corporate assessment not found" });

        return { assessment };
      }),
  }),

  /**
   * CRUD para Questionário por Ramo (JSON dinâmico)
   */
  branch: router({
    /**
     * Adicionar nova questão ao questionário por ramo
     */
    addQuestion: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        branchId: z.number(),
        question: QuestionSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        await validateProjectAccess(ctx, input.projectId);

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Buscar assessment atual
        const [currentAssessment] = await db.select().from(branchAssessments)
          .where(and(
            eq(branchAssessments.projectId, input.projectId),
            eq(branchAssessments.branchId, input.branchId)
          )).limit(1);

        if (!currentAssessment) throw new TRPCError({ code: "NOT_FOUND", message: "Branch assessment not found" });

        // Parse questões atuais
        const questions = JSON.parse(currentAssessment.generatedQuestions || "[]");

        // Adicionar nova questão
        questions.push(input.question);

        // Atualizar assessment
        await db.update(branchAssessments)
          .set({ generatedQuestions: JSON.stringify(questions) })
          .where(eq(branchAssessments.id, currentAssessment.id));

        // Registrar auditoria
        await logAudit(
          ctx.user.id,
          ctx.user.name || "Usuário",
          input.projectId,
          "branch_question",
          currentAssessment.id,
          "create",
          undefined,
          { branchId: input.branchId, questionId: input.question.id, question: input.question.question }
        );

        return { success: true, questions };
      }),

    /**
     * Editar questão existente
     */
    updateQuestion: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        branchId: z.number(),
        questionId: z.string(),
        updates: QuestionSchema.partial(),
      }))
      .mutation(async ({ ctx, input }) => {
        await validateProjectAccess(ctx, input.projectId);

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Buscar assessment atual
        const [currentAssessment] = await db.select().from(branchAssessments)
          .where(and(
            eq(branchAssessments.projectId, input.projectId),
            eq(branchAssessments.branchId, input.branchId)
          )).limit(1);

        if (!currentAssessment) throw new TRPCError({ code: "NOT_FOUND", message: "Branch assessment not found" });

        // Parse questões atuais
        const questions = JSON.parse(currentAssessment.generatedQuestions || "[]");

        // Encontrar questão
        const questionIndex = questions.findIndex((q: any) => q.id === input.questionId);
        if (questionIndex === -1) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

        const oldQuestion = { ...questions[questionIndex] };

        // Atualizar questão
        questions[questionIndex] = { ...questions[questionIndex], ...input.updates };

        // Atualizar assessment
        await db.update(branchAssessments)
          .set({ generatedQuestions: JSON.stringify(questions) })
          .where(eq(branchAssessments.id, currentAssessment.id));

        // Registrar auditoria
        await logAudit(
          ctx.user.id,
          ctx.user.name || "Usuário",
          input.projectId,
          "branch_question",
          currentAssessment.id,
          "update",
          { question: { old: oldQuestion, new: questions[questionIndex] } },
          { branchId: input.branchId, questionId: input.questionId }
        );

        return { success: true, question: questions[questionIndex] };
      }),

    /**
     * Excluir questão
     */
    deleteQuestion: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        branchId: z.number(),
        questionId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await validateProjectAccess(ctx, input.projectId);

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Buscar assessment atual
        const [currentAssessment] = await db.select().from(branchAssessments)
          .where(and(
            eq(branchAssessments.projectId, input.projectId),
            eq(branchAssessments.branchId, input.branchId)
          )).limit(1);

        if (!currentAssessment) throw new TRPCError({ code: "NOT_FOUND", message: "Branch assessment not found" });

        // Parse questões atuais
        const questions = JSON.parse(currentAssessment.generatedQuestions || "[]");

        // Encontrar questão
        const questionIndex = questions.findIndex((q: any) => q.id === input.questionId);
        if (questionIndex === -1) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

        const deletedQuestion = questions[questionIndex];

        // Remover questão
        questions.splice(questionIndex, 1);

        // Atualizar assessment
        await db.update(branchAssessments)
          .set({ generatedQuestions: JSON.stringify(questions) })
          .where(eq(branchAssessments.id, currentAssessment.id));

        // Registrar auditoria
        await logAudit(
          ctx.user.id,
          ctx.user.name || "Usuário",
          input.projectId,
          "branch_question",
          currentAssessment.id,
          "delete",
          undefined,
          { branchId: input.branchId, questionId: input.questionId, deletedQuestion }
        );

        return { success: true };
      }),

    /**
     * Listar questões de um ramo
     */
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        branchId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        await validateProjectAccess(ctx, input.projectId);

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        const [assessment] = await db.select().from(branchAssessments)
          .where(and(
            eq(branchAssessments.projectId, input.projectId),
            eq(branchAssessments.branchId, input.branchId)
          )).limit(1);

        if (!assessment) throw new TRPCError({ code: "NOT_FOUND", message: "Branch assessment not found" });

        const questions = JSON.parse(assessment.generatedQuestions || "[]");

        return { questions, assessment };
      }),
  }),
});
