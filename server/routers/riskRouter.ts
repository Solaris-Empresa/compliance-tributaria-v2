/**
 * Risk Router — TASK 5
 * Procedures tRPC para o Risk Engine de scoring de compliance.
 *
 * Fórmula: risk_score = base_score × gap_multiplier
 * Risco = impacto × criticidade × natureza do requisito
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { runRiskAnalysis, classifyRisk, calculateRiskSummary } from "../riskEngine";
import type { GapInput, NormativeType, SeverityBase } from "../riskEngine";
import {
  riskAnalysis,
  riskSessionSummary,
  gapAnalysis,
  complianceSessions,
} from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

// ─── Schemas de validação ─────────────────────────────────────────────────────

const GapInputSchema = z.object({
  canonicalId: z.string(),
  mappingId: z.string(),
  gapStatus: z.enum(["compliant", "nao_compliant", "parcial", "nao_aplicavel"]),
  normativeType: z.enum(["obrigacao", "vedacao", "direito", "opcao"]).optional(),
  baseCriticality: z.enum(["critica", "alta", "media", "baixa"]).optional(),
  domain: z.string().optional(),
  requirementName: z.string().optional(),
  answerNote: z.string().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const riskRouter = router({
  /**
   * Calcular e persistir análise de risco para uma sessão de diagnóstico
   * Lê os gaps da tabela gap_analysis e gera risk_analysis + risk_session_summary
   */
  calculateForSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verificar se a sessão existe e pertence ao usuário
      const sessions = await db
        .select()
        .from(complianceSessions)
        .where(eq(complianceSessions.id, input.sessionId))
        .limit(1);

      if (!sessions.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });
      }

      // Buscar gaps da sessão
      const gaps = await db
        .select()
        .from(gapAnalysis)
        .where(eq(gapAnalysis.sessionId, input.sessionId));

      if (!gaps.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum gap encontrado para esta sessão" });
      }

      // Converter gaps para GapInput
      const gapInputs: GapInput[] = gaps.map((g) => ({
        canonicalId: g.canonicalId,
        mappingId: g.mappingId,
        gapStatus: g.gapStatus as GapInput["gapStatus"],
        answerNote: g.answerNote ?? undefined,
      }));

      // Executar análise de risco
      const { risks, summary } = runRiskAnalysis(gapInputs);

      // Limpar análises anteriores desta sessão
      await db.delete(riskAnalysis).where(eq(riskAnalysis.sessionId, input.sessionId));
      await db.delete(riskSessionSummary).where(eq(riskSessionSummary.sessionId, input.sessionId));

      // Persistir risk_analysis
      if (risks.length > 0) {
        await db.insert(riskAnalysis).values(
          risks.map((r) => ({
            sessionId: input.sessionId,
            canonicalId: r.canonicalId,
            mappingId: r.mappingId,
            gapStatus: r.gapStatus,
            riskLevel: r.riskLevel,
            riskScore: r.riskScore,
            impactType: r.impactType,
            severityBase: r.severityBase,
            normativeType: r.normativeType,
            gapMultiplier: r.gapMultiplier,
            baseScore: r.baseScore,
            domain: r.domain ?? null,
            requirementName: r.requirementName ?? null,
            mitigationPriority: r.mitigationPriority,
          }))
        );
      }

      // Persistir risk_session_summary
      await db.insert(riskSessionSummary).values({
        sessionId: input.sessionId,
        totalRiskScore: summary.totalRiskScore,
        avgRiskScore: summary.avgRiskScore,
        maxRiskScore: summary.maxRiskScore,
        criticalCount: summary.criticalCount,
        altoCount: summary.altoCount,
        medioCount: summary.medioCount,
        baixoCount: summary.baixoCount,
        financialRisk: summary.financialRisk,
        operationalRisk: summary.operationalRisk,
        legalRisk: summary.legalRisk,
        overallRiskLevel: summary.overallRiskLevel,
      });

      return {
        sessionId: input.sessionId,
        risksCount: risks.length,
        summary: {
          totalRiskScore: summary.totalRiskScore,
          avgRiskScore: summary.avgRiskScore,
          maxRiskScore: summary.maxRiskScore,
          overallRiskLevel: summary.overallRiskLevel,
          criticalCount: summary.criticalCount,
          altoCount: summary.altoCount,
          medioCount: summary.medioCount,
          baixoCount: summary.baixoCount,
          financialRisk: summary.financialRisk,
          operationalRisk: summary.operationalRisk,
          legalRisk: summary.legalRisk,
          topRisks: summary.topRisks,
          risksByDomain: summary.risksByDomain,
        },
      };
    }),

  /**
   * Buscar análise de risco de uma sessão (já calculada)
   */
  getBySession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [summaryRows, riskRows] = await Promise.all([
        db
          .select()
          .from(riskSessionSummary)
          .where(eq(riskSessionSummary.sessionId, input.sessionId))
          .limit(1),
        db
          .select()
          .from(riskAnalysis)
          .where(eq(riskAnalysis.sessionId, input.sessionId))
          .orderBy(desc(riskAnalysis.riskScore)),
      ]);

      if (!summaryRows.length) {
        return null; // Análise ainda não calculada
      }

      return {
        summary: summaryRows[0],
        risks: riskRows,
      };
    }),

  /**
   * Calcular risco on-the-fly para um conjunto de gaps (sem persistir)
   * Útil para preview antes de salvar
   */
  calculatePreview: protectedProcedure
    .input(z.object({ gaps: z.array(GapInputSchema) }))
    .mutation(async ({ input }) => {
      const { risks, summary } = runRiskAnalysis(input.gaps as GapInput[]);
      return {
        risks,
        summary: {
          totalRiskScore: summary.totalRiskScore,
          avgRiskScore: summary.avgRiskScore,
          maxRiskScore: summary.maxRiskScore,
          overallRiskLevel: summary.overallRiskLevel,
          criticalCount: summary.criticalCount,
          altoCount: summary.altoCount,
          medioCount: summary.medioCount,
          baixoCount: summary.baixoCount,
          financialRisk: summary.financialRisk,
          operationalRisk: summary.operationalRisk,
          legalRisk: summary.legalRisk,
          topRisks: summary.topRisks,
          risksByDomain: summary.risksByDomain,
        },
      };
    }),

  /**
   * Listar top riscos críticos e altos de uma sessão
   */
  getTopRisks: protectedProcedure
    .input(z.object({ sessionId: z.number(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const risks = await db
        .select()
        .from(riskAnalysis)
        .where(eq(riskAnalysis.sessionId, input.sessionId))
        .orderBy(desc(riskAnalysis.riskScore))
        .limit(input.limit);

      return risks;
    }),

  /**
   * Estatísticas de risco por domínio para uma sessão
   */
  getRisksByDomain: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const risks = await db
        .select()
        .from(riskAnalysis)
        .where(eq(riskAnalysis.sessionId, input.sessionId));

      // Agrupar por domínio
      const byDomain: Record<string, { count: number; totalScore: number; maxScore: number; criticalCount: number }> = {};
      for (const r of risks) {
        if (r.riskScore === 0) continue;
        const d = r.domain || "outros";
        if (!byDomain[d]) byDomain[d] = { count: 0, totalScore: 0, maxScore: 0, criticalCount: 0 };
        byDomain[d].count++;
        byDomain[d].totalScore += r.riskScore;
        byDomain[d].maxScore = Math.max(byDomain[d].maxScore, r.riskScore);
        if (r.riskLevel === "critico") byDomain[d].criticalCount++;
      }

      return Object.entries(byDomain).map(([domain, stats]) => ({
        domain,
        count: stats.count,
        avgScore: Math.round(stats.totalScore / stats.count),
        maxScore: stats.maxScore,
        criticalCount: stats.criticalCount,
      })).sort((a, b) => b.avgScore - a.avgScore);
    }),
});
