/**
 * requirementEngine.ts — Router tRPC do Requirement Engine (B2)
 * Sprint 98% Confidence — ADR-010 v1.1
 *
 * Procedures:
 * - requirements.getApplicable     → requisitos aplicáveis ao perfil do projeto
 * - requirements.getCoverageReport → coverage com fórmula corrigida (4 critérios)
 * - requirements.getWithCoverage   → requisitos com status de cobertura por item
 *
 * PONTOS INVIOLÁVEIS (Orquestrador):
 * 1. requirement_id obrigatório em toda a cadeia
 * 2. coverage = 100% com qualidade (4 critérios simultâneos)
 * 3. pergunta sem fonte = impossível
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getApplicableRequirements,
  getCoverageReport,
  getRequirementsWithCoverageStatus,
} from "../db-requirements";
import { isUserInProject } from "../db";

export const requirementEngineRouter = router({
  /**
   * B2-P1: Retorna os requisitos aplicáveis ao perfil do projeto.
   * Filtra por tags de aplicabilidade (marketplace, internacional, incentivo_fiscal, multi_estado).
   */
  getApplicable: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      domain: z.string().optional(),
      criticality: z.enum(["baixa", "media", "alta", "critica"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verificar acesso ao projeto
      const hasAccess = await isUserInProject(userId, input.projectId);
      if (!hasAccess && ctx.user.role !== "equipe_solaris") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado ao projeto" });
      }

      const requirements = await getApplicableRequirements(input.projectId);

      // Filtros opcionais
      let filtered = requirements;
      if (input.domain) {
        filtered = filtered.filter(r => r.domain === input.domain);
      }
      if (input.criticality) {
        filtered = filtered.filter(r => r.baseCriticality === input.criticality);
      }

      return {
        projectId: input.projectId,
        total: filtered.length,
        totalUnfiltered: requirements.length,
        requirements: filtered,
      };
    }),

  /**
   * B2-P2: Calcula o Coverage Report com a fórmula corrigida do ADR-010.
   * coverage = (pergunta válida + resposta válida + gap classificado + evidência suficiente)
   *            / requisitos aplicáveis
   *
   * Retorna gateApproved = true SOMENTE quando coveragePercent === 100 E
   * pendingRequirementIds.length === 0 E noValidQuestionIds.length === 0.
   */
  getCoverageReport: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const hasAccess = await isUserInProject(userId, input.projectId);
      if (!hasAccess && ctx.user.role !== "equipe_solaris") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado ao projeto" });
      }

      const report = await getCoverageReport(input.projectId, userId);

      return report;
    }),

  /**
   * B2-P3: Retorna os requisitos aplicáveis com status de cobertura por item.
   * Usado para o dashboard de coverage — mostra qual critério está faltando por requisito.
   */
  getWithCoverage: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      filterStatus: z.enum([
        "all",
        "fully_covered",
        "pending_question",
        "no_valid_question",
        "pending_answer",
        "pending_gap",
        "pending_evidence",
      ]).optional().default("all"),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const hasAccess = await isUserInProject(userId, input.projectId);
      if (!hasAccess && ctx.user.role !== "equipe_solaris") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado ao projeto" });
      }

      const requirements = await getRequirementsWithCoverageStatus(input.projectId, userId);

      const filtered = input.filterStatus === "all"
        ? requirements
        : requirements.filter(r => r.coverageStatus === input.filterStatus);

      // Contagem por status
      const summary = {
        fully_covered: requirements.filter(r => r.coverageStatus === "fully_covered").length,
        pending_question: requirements.filter(r => r.coverageStatus === "pending_question").length,
        no_valid_question: requirements.filter(r => r.coverageStatus === "no_valid_question").length,
        pending_answer: requirements.filter(r => r.coverageStatus === "pending_answer").length,
        pending_gap: requirements.filter(r => r.coverageStatus === "pending_gap").length,
        pending_evidence: requirements.filter(r => r.coverageStatus === "pending_evidence").length,
      };

      const total = requirements.length;
      const coveragePercent = total > 0
        ? Math.round((summary.fully_covered / total) * 10000) / 100
        : 0;

      return {
        projectId: input.projectId,
        total,
        coveragePercent,
        gateApproved: coveragePercent === 100 && summary.pending_question === 0 && summary.no_valid_question === 0,
        summary,
        requirements: filtered,
      };
    }),
});
