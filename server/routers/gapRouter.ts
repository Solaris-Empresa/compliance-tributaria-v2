/**
 * Gap Router — TASK 4
 * Procedures tRPC para o Gap Engine de diagnóstico de compliance.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { runGapAnalysis, prioritizeGaps } from "../gapEngine";
import {
  complianceSessions,
  questionnaireResponses,
  gapAnalysis,
  gapAuditTrail,
} from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// HELPERS
// ============================================================

async function logAudit(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  params: {
    sessionId?: number;
    userId: number;
    userName?: string;
    eventType: string;
    entityType?: string;
    entityId?: string;
    payload?: Record<string, unknown>;
  }
) {
  await db.insert(gapAuditTrail).values({
    sessionId: params.sessionId,
    userId: params.userId,
    userName: params.userName,
    eventType: params.eventType,
    entityType: params.entityType,
    entityId: params.entityId,
    payload: params.payload,
  });
}

// ============================================================
// ROUTER
// ============================================================

export const gapRouter = router({

  /**
   * Buscar perguntas do questionário (do banco externo via regulatory-engine)
   */
  getQuestions: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(499).default(50),
      offset: z.number().min(0).default(0),
      section: z.string().optional(),
    }))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB não disponível" });

      // Buscar perguntas da tabela requirement_question_mapping
      const rows = await db.execute(
        sql`SELECT mapping_id, canonical_id, question_text_clean, question_type, questionnaire_section
            FROM requirement_question_mapping
            WHERE question_quality_status = 'approved'
            ORDER BY questionnaire_section, mapping_id
            LIMIT 50`
      );

      const questions = (rows as any[])[0] ?? [];
      return { questions, total: questions.length };
    }),

  /**
   * Executar diagnóstico de compliance completo
   */
  runDiagnostic: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      answers: z.array(z.object({
        mappingId: z.string(),
        canonicalId: z.string(),
        answerValue: z.enum(["sim", "nao", "parcial", "nao_aplicavel"]),
        answerNote: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB não disponível" });

      const sessionUuid = uuidv4();

      // 1. Criar sessão
      const [sessionResult] = await db.insert(complianceSessions).values({
        sessionUuid,
        projectId: input.projectId,
        userId: ctx.user.id,
        status: "in_progress",
        totalQuestions: input.answers.length,
        answeredQuestions: input.answers.length,
      });

      const sessionId = (sessionResult as any).insertId as number;

      // 2. Audit: sessão iniciada
      await logAudit(db, {
        sessionId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        eventType: "session_started",
        entityType: "compliance_session",
        entityId: String(sessionId),
        payload: { projectId: input.projectId, totalAnswers: input.answers.length },
      });

      // 3. Salvar respostas
      await db.insert(questionnaireResponses).values(
        input.answers.map((a) => ({
          sessionId,
          mappingId: a.mappingId,
          canonicalId: a.canonicalId,
          answerValue: a.answerValue,
          answerNote: a.answerNote,
        }))
      );

      // 4. Executar análise de gap
      const analysis = runGapAnalysis(
        input.answers.map((a) => ({
          canonicalId: a.canonicalId,
          mappingId: a.mappingId,
          answerValue: a.answerValue,
          answerNote: a.answerNote,
        }))
      );

      // 5. Salvar gaps no banco
      if (analysis.gaps.length > 0) {
        await db.insert(gapAnalysis).values(
          analysis.gaps.map((g) => ({
            sessionId,
            mappingId: g.mappingId,
            canonicalId: g.canonicalId,
            gapStatus: g.gapStatus,
            gapSeverity: g.gapSeverity,
            gapType: g.gapType,
            answerValue: g.answerValue,
            answerNote: g.answerNote ?? undefined,
            recommendation: g.recommendation,
          }))
        );
      }

      // 6. Atualizar sessão com score
      await db.update(complianceSessions)
        .set({
          status: "completed",
          complianceScore: String(analysis.score.complianceScore),
          riskLevel: analysis.score.riskLevel,
          completedAt: new Date(),
        })
        .where(eq(complianceSessions.id, sessionId));

      // 7. Audit: diagnóstico concluído
      await logAudit(db, {
        sessionId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        eventType: "diagnostic_completed",
        entityType: "compliance_session",
        entityId: String(sessionId),
        payload: {
          score: analysis.score.complianceScore,
          riskLevel: analysis.score.riskLevel,
          totalGaps: analysis.totalGaps,
          criticalGaps: analysis.criticalGaps,
        },
      });

      return {
        sessionId,
        sessionUuid,
        score: analysis.score,
        criticalGaps: analysis.criticalGaps,
        totalGaps: analysis.totalGaps,
      };
    }),

  /**
   * Buscar gaps de uma sessão
   */
  getSessionGaps: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const gaps = await db.select()
        .from(gapAnalysis)
        .where(eq(gapAnalysis.sessionId, input.sessionId))
        .orderBy(desc(gapAnalysis.analyzedAt));

      return { gaps };
    }),

  /**
   * Buscar audit trail de uma sessão
   */
  getAuditTrail: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const trail = await db.select()
        .from(gapAuditTrail)
        .where(eq(gapAuditTrail.sessionId, input.sessionId))
        .orderBy(gapAuditTrail.occurredAt);

      return { trail };
    }),

  /**
   * Relatório completo de uma sessão (gaps + audit trail + prioridades)
   */
  getSessionReport: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [session] = await db.select()
        .from(complianceSessions)
        .where(eq(complianceSessions.id, input.sessionId));

      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });

      const gaps = await db.select()
        .from(gapAnalysis)
        .where(eq(gapAnalysis.sessionId, input.sessionId));

      const auditTrail = await db.select()
        .from(gapAuditTrail)
        .where(eq(gapAuditTrail.sessionId, input.sessionId))
        .orderBy(gapAuditTrail.occurredAt);

      // Agrupar gaps por status
      const gapsByStatus = {
        compliant: gaps.filter((g) => g.gapStatus === "compliant"),
        nao_compliant: gaps.filter((g) => g.gapStatus === "nao_compliant"),
        parcial: gaps.filter((g) => g.gapStatus === "parcial"),
        nao_aplicavel: gaps.filter((g) => g.gapStatus === "nao_aplicavel"),
      };

      // Prioridades
      const priorityGaps = {
        critica: gaps.filter((g) => g.gapSeverity === "critica"),
        alta: gaps.filter((g) => g.gapSeverity === "alta"),
        media: gaps.filter((g) => g.gapSeverity === "media"),
        baixa: gaps.filter((g) => g.gapSeverity === "baixa"),
      };

      return {
        session,
        gaps,
        gapsByStatus,
        priorityGaps,
        auditTrail,
        summary: {
          total: gaps.length,
          compliant: gapsByStatus.compliant.length,
          nao_compliant: gapsByStatus.nao_compliant.length,
          parcial: gapsByStatus.parcial.length,
          nao_aplicavel: gapsByStatus.nao_aplicavel.length,
          score: session.complianceScore,
          riskLevel: session.riskLevel,
        },
      };
    }),

  /**
   * Listar sessões de um projeto
   */
  listSessions: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const sessions = await db.select()
        .from(complianceSessions)
        .where(eq(complianceSessions.projectId, input.projectId))
        .orderBy(desc(complianceSessions.startedAt));

      return { sessions };
    }),
});
