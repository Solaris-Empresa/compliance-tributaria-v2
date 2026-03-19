/**
 * Router de Diagnóstico — v2.1 Sprint
 * Procedures: getDiagnosticStatus, updateDiagnosticStatus,
 *             getAggregatedDiagnostic, completeDiagnosticLayer,
 *             generateBriefingFromDiagnostic
 *
 * Extraído do fluxoV3Router para resolver inferência de tipos no LSP incremental.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import {
  consolidateDiagnosticLayers,
  isDiagnosticComplete,
  getNextDiagnosticLayer,
  getDiagnosticProgress,
} from "../diagnostic-consolidator";

export const diagnosticRouter = router({
  // ─────────────────────────────────────────────────────────────────────────
  // GET: Status das 3 camadas de diagnóstico
  // ─────────────────────────────────────────────────────────────────────────
  getDiagnosticStatus: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = (project as any).clientId === userId || (project as any).createdById === userId;
      const isTeam = ["equipe_solaris", "advogado_senior", "advogado_junior"].includes(ctx.user.role);
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });
      const diagnosticStatus = (project as any).diagnosticStatus ?? {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };
      const ds = diagnosticStatus as { corporate: string; operational: string; cnae: string };
      const completedCount = [ds.corporate, ds.operational, ds.cnae].filter(s => s === "completed").length;
      const progress = Math.round((completedCount / 3) * 100);
      const isComplete = completedCount === 3;
      return {
        projectId: input.projectId,
        diagnosticStatus: ds as {
          corporate: "not_started" | "in_progress" | "completed";
          operational: "not_started" | "in_progress" | "completed";
          cnae: "not_started" | "in_progress" | "completed";
        },
        progress,
        isComplete,
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // MUTATION: Atualizar status de uma camada de diagnóstico
  // ─────────────────────────────────────────────────────────────────────────
  updateDiagnosticStatus: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      layer: z.enum(["corporate", "operational", "cnae"]),
      status: z.enum(["not_started", "in_progress", "completed"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = (project as any).clientId === userId || (project as any).createdById === userId;
      const isTeam = ["equipe_solaris", "advogado_senior", "advogado_junior"].includes(ctx.user.role);
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });
      const current = (project as any).diagnosticStatus ?? {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };
      const updated = { ...current, [input.layer]: input.status };
      if (input.layer === "operational" && input.status !== "not_started" && updated.corporate !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O Diagnóstico Corporativo deve ser concluído antes de iniciar o Operacional.",
        });
      }
      if (input.layer === "cnae" && input.status !== "not_started" && updated.operational !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O Diagnóstico Operacional deve ser concluído antes de iniciar o CNAE.",
        });
      }
      await db.updateProject(input.projectId, { diagnosticStatus: updated } as any);
      return {
        projectId: input.projectId,
        diagnosticStatus: updated as {
          corporate: "not_started" | "in_progress" | "completed";
          operational: "not_started" | "in_progress" | "completed";
          cnae: "not_started" | "in_progress" | "completed";
        },
        updatedLayer: input.layer,
        updatedStatus: input.status,
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // GET: Diagnóstico agregado das 3 camadas (payload para briefing)
  // ─────────────────────────────────────────────────────────────────────────
  getAggregatedDiagnostic: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = (project as any).clientId === userId || (project as any).createdById === userId;
      const isTeam = ["equipe_solaris", "advogado_senior", "advogado_junior"].includes(ctx.user.role);
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });
      const p = project as any;
      const diagnosticStatus = p.diagnosticStatus ?? {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };
      const corporateAnswers = p.corporateAnswers ?? null;
      const operationalAnswers = p.operationalAnswers ?? null;
      const cnaeAnswers = p.cnaeAnswers ?? null;
      const aggregatedDiagnosticAnswers = consolidateDiagnosticLayers({
        companyProfile: p.companyProfile ?? null,
        operationProfile: p.operationProfile ?? null,
        taxComplexity: p.taxComplexity ?? null,
        financialProfile: p.financialProfile ?? null,
        governanceProfile: p.governanceProfile ?? null,
        cnaeAnswers: Array.isArray(cnaeAnswers) ? cnaeAnswers : [],
      });
      const complete = isDiagnosticComplete(diagnosticStatus as any);
      const nextLayer = getNextDiagnosticLayer(diagnosticStatus as any);
      const progress = getDiagnosticProgress(diagnosticStatus as any);
      return {
        projectId: input.projectId,
        diagnosticStatus,
        aggregatedDiagnosticAnswers,
        isComplete: complete,
        nextLayer,
        progress,
        layerCount: {
          corporate: corporateAnswers ? Object.keys(corporateAnswers).length : 0,
          operational: operationalAnswers ? Object.keys(operationalAnswers).length : 0,
          cnae: Array.isArray(cnaeAnswers) ? cnaeAnswers.length : 0,
        },
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // MUTATION: Completar uma camada de diagnóstico e salvar respostas
  // ─────────────────────────────────────────────────────────────────────────
  completeDiagnosticLayer: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      layer: z.enum(["corporate", "operational", "cnae"]),
      answers: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = (project as any).clientId === userId || (project as any).createdById === userId;
      const isTeam = ["equipe_solaris", "advogado_senior", "advogado_junior"].includes(ctx.user.role);
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });
      const current = (project as any).diagnosticStatus ?? {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };
      // Validar regra de progressão sequencial
      if (input.layer === "operational" && current.corporate !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O Diagnóstico Corporativo deve ser concluído antes de iniciar o Operacional.",
        });
      }
      if (input.layer === "cnae" && current.operational !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O Diagnóstico Operacional deve ser concluído antes de iniciar o CNAE.",
        });
      }
      // Salvar respostas da camada
      const answerField = input.layer === "corporate"
        ? "corporateAnswers"
        : input.layer === "operational"
        ? "operationalAnswers"
        : "cnaeAnswers";
      const updatedStatus = { ...current, [input.layer]: "completed" };
      // Verificar se todas as camadas estão completas → avançar status do projeto
      const allComplete = isDiagnosticComplete(updatedStatus);
      const projectUpdates: Record<string, any> = {
        [answerField]: input.answers,
        diagnosticStatus: updatedStatus,
      };
      if (allComplete) {
        projectUpdates.status = "diagnostico_cnae";
      }
      await db.updateProject(input.projectId, projectUpdates as any);
      return {
        projectId: input.projectId,
        layer: input.layer,
        completed: true,
        diagnosticStatus: updatedStatus,
        allLayersComplete: allComplete,
        nextLayer: getNextDiagnosticLayer(updatedStatus),
        progress: getDiagnosticProgress(updatedStatus),
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // MUTATION: Gerar briefing a partir do diagnóstico consolidado
  // ─────────────────────────────────────────────────────────────────────────
  generateBriefingFromDiagnostic: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = (project as any).clientId === userId || (project as any).createdById === userId;
      const isTeam = ["equipe_solaris", "advogado_senior", "advogado_junior"].includes(ctx.user.role);
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });
      // GATE: diagnóstico completo obrigatório
      const diagnosticStatus = (project as any).diagnosticStatus ?? {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };
      if (!isDiagnosticComplete(diagnosticStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Todas as 3 camadas de diagnóstico devem ser concluídas antes de gerar o briefing.",
        });
      }
      const p = project as any;
      const aggregatedDiagnosticAnswers = consolidateDiagnosticLayers({
        companyProfile: p.companyProfile ?? null,
        operationProfile: p.operationProfile ?? null,
        taxComplexity: p.taxComplexity ?? null,
        financialProfile: p.financialProfile ?? null,
        governanceProfile: p.governanceProfile ?? null,
        cnaeAnswers: Array.isArray(p.cnaeAnswers) ? p.cnaeAnswers : [],
      });
      // Usar o generateBriefing existente com o payload consolidado
      const briefingContext = JSON.stringify(aggregatedDiagnosticAnswers, null, 2);
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Você é um especialista em compliance tributário da Reforma Tributária brasileira (LC 214/2025). Gere um briefing estruturado e objetivo.",
          },
          {
            role: "user",
            content: `Gere um briefing de compliance tributário baseado no diagnóstico consolidado:\n\n${briefingContext}`,
          },
        ],
      });
      const briefingText = response.choices?.[0]?.message?.content ?? "Briefing não gerado.";
      await db.updateProject(input.projectId, {
        briefing: briefingText,
        status: "matriz_riscos",
      } as any);
      return {
        projectId: input.projectId,
        briefing: briefingText,
        status: "matriz_riscos",
      };
    }),
});
