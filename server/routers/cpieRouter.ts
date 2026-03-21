/**
 * CPIE Router — Company Profile Intelligence Engine
 * Sprint v6.0 — Issue C1
 *
 * 3 procedures tRPC:
 *   - analyze: análise completa (score + perguntas + sugestões + insights)
 *   - getDynamicQuestions: apenas perguntas dinâmicas (mais rápido)
 *   - getSuggestions: apenas sugestões de correção
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import {
  runCpieAnalysis,
  generateDynamicQuestions,
  generateSuggestions,
  calcDimensionScores,
  calcOverallScore,
  type CpieProfileInput,
} from "../cpie";

// ─── Schema de input ──────────────────────────────────────────────────────────

const CpieProfileInputSchema = z.object({
  cnpj: z.string().optional(),
  companyType: z.string().optional(),
  companySize: z.string().optional(),
  annualRevenueRange: z.string().optional(),
  taxRegime: z.string().optional(),
  operationType: z.string().optional(),
  clientType: z.array(z.string()).optional(),
  multiState: z.boolean().nullable().optional(),
  hasMultipleEstablishments: z.boolean().nullable().optional(),
  hasImportExport: z.boolean().nullable().optional(),
  hasSpecialRegimes: z.boolean().nullable().optional(),
  paymentMethods: z.array(z.string()).optional(),
  hasIntermediaries: z.boolean().nullable().optional(),
  hasTaxTeam: z.boolean().nullable().optional(),
  hasAudit: z.boolean().nullable().optional(),
  hasTaxIssues: z.boolean().nullable().optional(),
  description: z.string().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const cpieRouter = router({
  /**
   * Análise completa do perfil: score explicável + perguntas dinâmicas + sugestões + insights.
   * Chamado quando o usuário clica em "Analisar com IA" no painel de score.
   */
  analyze: protectedProcedure
    .input(CpieProfileInputSchema)
    .mutation(async ({ input }) => {
      const profileInput: CpieProfileInput = {
        ...input,
        multiState: input.multiState ?? null,
        hasMultipleEstablishments: input.hasMultipleEstablishments ?? null,
        hasImportExport: input.hasImportExport ?? null,
        hasSpecialRegimes: input.hasSpecialRegimes ?? null,
        hasIntermediaries: input.hasIntermediaries ?? null,
        hasTaxTeam: input.hasTaxTeam ?? null,
        hasAudit: input.hasAudit ?? null,
        hasTaxIssues: input.hasTaxIssues ?? null,
      };
      return await runCpieAnalysis(profileInput);
    }),

  /**
   * Apenas perguntas dinâmicas — mais rápido, usado para feedback em tempo real.
   */
  getDynamicQuestions: protectedProcedure
    .input(CpieProfileInputSchema)
    .mutation(async ({ input }) => {
      const profileInput: CpieProfileInput = {
        ...input,
        multiState: input.multiState ?? null,
        hasMultipleEstablishments: input.hasMultipleEstablishments ?? null,
        hasImportExport: input.hasImportExport ?? null,
        hasSpecialRegimes: input.hasSpecialRegimes ?? null,
        hasIntermediaries: input.hasIntermediaries ?? null,
        hasTaxTeam: input.hasTaxTeam ?? null,
        hasAudit: input.hasAudit ?? null,
        hasTaxIssues: input.hasTaxIssues ?? null,
      };
      const questions = await generateDynamicQuestions(profileInput);
      return { questions };
    }),

  /**
   * Apenas sugestões de correção — chamado após preenchimento de campos críticos.
   */
  getSuggestions: protectedProcedure
    .input(CpieProfileInputSchema)
    .mutation(async ({ input }) => {
      const profileInput: CpieProfileInput = {
        ...input,
        multiState: input.multiState ?? null,
        hasMultipleEstablishments: input.hasMultipleEstablishments ?? null,
        hasImportExport: input.hasImportExport ?? null,
        hasSpecialRegimes: input.hasSpecialRegimes ?? null,
        hasIntermediaries: input.hasIntermediaries ?? null,
        hasTaxTeam: input.hasTaxTeam ?? null,
        hasAudit: input.hasAudit ?? null,
        hasTaxIssues: input.hasTaxIssues ?? null,
      };
      const suggestions = await generateSuggestions(profileInput);
      return { suggestions };
    }),

  /**
   * Persiste o resultado da análise CPIE no banco de dados do projeto.
   * Chamado após o projeto ser criado (E2 — persistência de interação IA).
   */
  saveAnalysis: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      overallScore: z.number(),
      confidenceScore: z.number(),
      dimensions: z.array(z.object({
        name: z.string(),
        score: z.number(),
        weight: z.number(),
        explanation: z.string(),
        fieldsEvaluated: z.array(z.string()),
      })),
      dynamicQuestions: z.array(z.object({
        id: z.string(),
        question: z.string(),
        rationale: z.string(),
        field: z.string().optional(),
        priority: z.enum(["high", "medium", "low"]),
        category: z.string(),
      })),
      suggestions: z.array(z.object({
        id: z.string(),
        field: z.string(),
        currentValue: z.string().optional(),
        suggestedValue: z.string().optional(),
        explanation: z.string(),
        confidence: z.number(),
        severity: z.enum(["info", "warning", "critical"]),
      })),
      readinessLevel: z.string(),
    }))
    .mutation(async ({ input }) => {
      await db.updateProject(input.projectId, {
        profileCompleteness: input.overallScore,
        profileConfidence: input.confidenceScore,
        profileLastAnalyzedAt: new Date(),
        profileIntelligenceData: {
          dynamicQuestions: input.dynamicQuestions.map(q => ({
            id: q.id,
            question: q.question,
            field: q.field || "",
            priority: q.priority === "high" ? 3 : q.priority === "medium" ? 2 : 1,
            answered: false,
          })),
          suggestions: input.suggestions.map(s => ({
            field: s.field,
            currentValue: s.currentValue || "",
            suggestedValue: s.suggestedValue || "",
            reason: s.explanation,
            accepted: false,
          })),
          scoreBreakdown: input.dimensions.map(d => ({
            category: d.name,
            score: d.score,
            maxScore: 100,
            issues: [],
          })),
          analysisVersion: "cpie-v1.0",
        } as any,
      });
      return { saved: true };
    }),

  /**
   * Registra a aceitação de risco do Consistency Gate no banco.
   * Chamado quando o usuário prossegue com inconsistências críticas.
   */
  acceptConsistencyRisk: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      reason: z.string().min(10),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.updateProject(input.projectId, {
        consistencyStatus: "warning",
        consistencyAcceptedRiskBy: ctx.user.id,
        consistencyAcceptedRiskAt: new Date(),
        consistencyAcceptedRiskReason: input.reason.slice(0, 500),
      });
      return { saved: true };
    }),

  /**
   * Score determinístico por dimensão — sem IA, instantâneo.
   * Usado para atualizar o painel de score em tempo real sem chamar a IA.
   */
  scoreSync: protectedProcedure
    .input(CpieProfileInputSchema)
    .mutation(({ input }) => {
      const profileInput: CpieProfileInput = {
        ...input,
        multiState: input.multiState ?? null,
        hasMultipleEstablishments: input.hasMultipleEstablishments ?? null,
        hasImportExport: input.hasImportExport ?? null,
        hasSpecialRegimes: input.hasSpecialRegimes ?? null,
        hasIntermediaries: input.hasIntermediaries ?? null,
        hasTaxTeam: input.hasTaxTeam ?? null,
        hasAudit: input.hasAudit ?? null,
        hasTaxIssues: input.hasTaxIssues ?? null,
      };
      const dimensions = calcDimensionScores(profileInput);
      const overallScore = calcOverallScore(dimensions);
      return { overallScore, dimensions };
    }),
});
