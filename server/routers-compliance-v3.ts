/**
 * Router tRPC — Compliance Engine v3
 * Solaris Compliance — Sprint 6 (Go-Live Ready)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, asc } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";
import {
  regulatoryRequirementsV3,
  projectGapsV3,
  projectRisksV3,
  projectActionsV3,
  projectTasksV3,
  projectSnapshotsV3,
} from "../drizzle/schema-compliance-engine-v3";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const complianceV3Router = router({

  // getRequirements
  getRequirements: protectedProcedure
    .input(z.object({
      domain: z.string().optional(),
      criticality: z.enum(["baixa", "media", "alta", "critica"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const conditions: ReturnType<typeof eq>[] = [eq(regulatoryRequirementsV3.active, true)];
      if (input?.domain) conditions.push(eq(regulatoryRequirementsV3.domain, input.domain));
      if (input?.criticality) conditions.push(eq(regulatoryRequirementsV3.baseCriticality, input.criticality));

      const reqs = await db
        .select()
        .from(regulatoryRequirementsV3)
        .where(and(...conditions))
        .orderBy(asc(regulatoryRequirementsV3.assessmentOrder));

      return {
        total: reqs.length,
        requirements: reqs.map((r) => ({
          ...r,
          evaluationCriteria: parseJsonField<string[]>(r.evaluationCriteria, []),
          evidenceRequired: parseJsonField<string[]>(r.evidenceRequired, []),
          tags: parseJsonField<string[]>(r.tags, []),
        })),
      };
    }),

  // getDashboard
  getDashboard: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const clientId = ctx.user.id;

      // Verificar cache
      const snapshots = await db
        .select()
        .from(projectSnapshotsV3)
        .where(and(
          eq(projectSnapshotsV3.clientId, clientId),
          eq(projectSnapshotsV3.projectId, input.projectId),
          eq(projectSnapshotsV3.isStale, false),
        ))
        .orderBy(desc(projectSnapshotsV3.createdAt))
        .limit(1);

      if (snapshots.length > 0) {
        const snap = snapshots[0];
        return {
          fromCache: true,
          analysisVersion: snap.analysisVersion,
          confidenceScoreGlobal: Number(snap.confidenceScoreGlobal),
          overallScore: Number(snap.overallScore),
          summary: {
            totalRequirements: snap.totalRequirements,
            totalGaps: snap.totalGaps,
            criticalGaps: snap.criticalGaps,
            totalRisks: snap.totalRisks,
            criticalRisks: snap.criticalRisks,
            totalActions: snap.totalActions,
            immediateActions: snap.immediateActions,
          },
          radar: parseJsonField<Record<string, number>>(snap.radarJson, {}),
          riskSummary: parseJsonField<Record<string, number>>(snap.riskSummaryJson, {}),
          actionSummary: parseJsonField<Record<string, number>>(snap.actionSummaryJson, {}),
          taskSummary: parseJsonField<Record<string, number>>(snap.taskSummaryJson, {}),
          generatedAt: snap.createdAt,
        };
      }

      // Calcular em tempo real
      const [gaps, risks, actions, tasks] = await Promise.all([
        db.select().from(projectGapsV3).where(and(eq(projectGapsV3.clientId, clientId), eq(projectGapsV3.projectId, input.projectId))).orderBy(desc(projectGapsV3.priorityScore)),
        db.select().from(projectRisksV3).where(and(eq(projectRisksV3.clientId, clientId), eq(projectRisksV3.projectId, input.projectId))).orderBy(desc(projectRisksV3.riskScore)),
        db.select().from(projectActionsV3).where(and(eq(projectActionsV3.clientId, clientId), eq(projectActionsV3.projectId, input.projectId))),
        db.select().from(projectTasksV3).where(and(eq(projectTasksV3.clientId, clientId), eq(projectTasksV3.projectId, input.projectId))),
      ]);

      // Radar por domínio
      const domainScores: Record<string, number[]> = {};
      for (const gap of gaps) {
        if (!domainScores[gap.domain]) domainScores[gap.domain] = [];
        domainScores[gap.domain].push(Number(gap.score));
      }
      const radar: Record<string, number> = {};
      for (const [domain, scores] of Object.entries(domainScores)) {
        radar[domain] = Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length);
      }

      const overallScore = gaps.length > 0
        ? Math.round(gaps.reduce((s: number, g) => s + Number(g.score), 0) / gaps.length)
        : 0;

      const riskSummary = {
        total: risks.length,
        critico: risks.filter((r) => r.riskLevel === "critico").length,
        alto: risks.filter((r) => r.riskLevel === "alto").length,
        medio: risks.filter((r) => r.riskLevel === "medio").length,
        baixo: risks.filter((r) => r.riskLevel === "baixo").length,
      };

      const actionSummary = {
        total: actions.length,
        imediata: actions.filter((a) => a.actionPriority === "imediata").length,
        curto_prazo: actions.filter((a) => a.actionPriority === "curto_prazo").length,
        medio_prazo: actions.filter((a) => a.actionPriority === "medio_prazo").length,
        planejamento: actions.filter((a) => a.actionPriority === "planejamento").length,
        concluido: actions.filter((a) => a.status === "concluido").length,
      };

      const completedTasks = tasks.filter((t) => t.status === "concluido").length;
      const taskSummary = {
        total: tasks.length,
        concluido: completedTasks,
        em_andamento: tasks.filter((t) => t.status === "em_andamento").length,
        nao_iniciado: tasks.filter((t) => t.status === "nao_iniciado").length,
        progressPercent: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
      };

      return {
        fromCache: false,
        analysisVersion: gaps[0]?.analysisVersion ?? 1,
        confidenceScoreGlobal: null,
        overallScore,
        summary: {
          totalRequirements: 138,
          totalGaps: gaps.length,
          criticalGaps: gaps.filter((g) => g.criticality === "critica").length,
          totalRisks: risks.length,
          criticalRisks: riskSummary.critico,
          totalActions: actions.length,
          immediateActions: actionSummary.imediata,
        },
        radar,
        riskSummary,
        actionSummary,
        taskSummary,
        generatedAt: new Date(),
      };
    }),

  // getTopGaps
  getTopGaps: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      limit: z.number().min(1).max(50).default(10),
      criticality: z.enum(["baixa", "media", "alta", "critica"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const clientId = ctx.user.id;
      const conditions: ReturnType<typeof eq>[] = [
        eq(projectGapsV3.clientId, clientId),
        eq(projectGapsV3.projectId, input.projectId),
      ];
      if (input.criticality) conditions.push(eq(projectGapsV3.criticality, input.criticality));

      const gaps = await db
        .select()
        .from(projectGapsV3)
        .where(and(...conditions))
        .orderBy(desc(projectGapsV3.priorityScore))
        .limit(input.limit);

      return {
        total: gaps.length,
        gaps: gaps.map((g) => ({
          ...g,
          score: Number(g.score),
          priorityScore: Number(g.priorityScore),
          unmetCriteria: parseJsonField<string[]>(g.unmetCriteria, []),
          recommendedActions: parseJsonField<string[]>(g.recommendedActions, []),
        })),
      };
    }),

  // getRiskMatrix
  getRiskMatrix: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const clientId = ctx.user.id;

      const risks = await db
        .select()
        .from(projectRisksV3)
        .where(and(eq(projectRisksV3.clientId, clientId), eq(projectRisksV3.projectId, input.projectId)))
        .orderBy(desc(projectRisksV3.riskScore));

      const matrix: Record<string, typeof risks> = {};
      for (const risk of risks) {
        const key = `${risk.probability}-${risk.impact}`;
        if (!matrix[key]) matrix[key] = [];
        matrix[key].push(risk);
      }

      return {
        total: risks.length,
        byLevel: {
          critico: risks.filter((r) => r.riskLevel === "critico"),
          alto: risks.filter((r) => r.riskLevel === "alto"),
          medio: risks.filter((r) => r.riskLevel === "medio"),
          baixo: risks.filter((r) => r.riskLevel === "baixo"),
        },
        matrix,
        risks: risks.map((r) => ({ ...r, financialImpactPercent: Number(r.financialImpactPercent) })),
      };
    }),

  // getActionPlan
  getActionPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      priority: z.enum(["imediata", "curto_prazo", "medio_prazo", "planejamento"]).optional(),
      status: z.enum(["nao_iniciado", "em_andamento", "em_revisao", "concluido", "cancelado"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const clientId = ctx.user.id;

      const actionConditions: ReturnType<typeof eq>[] = [
        eq(projectActionsV3.clientId, clientId),
        eq(projectActionsV3.projectId, input.projectId),
      ];
      if (input.priority) actionConditions.push(eq(projectActionsV3.actionPriority, input.priority));
      if (input.status) actionConditions.push(eq(projectActionsV3.status, input.status));

      const [actions, tasks] = await Promise.all([
        db.select().from(projectActionsV3).where(and(...actionConditions)).orderBy(asc(projectActionsV3.estimatedDays)),
        db.select().from(projectTasksV3).where(and(eq(projectTasksV3.clientId, clientId), eq(projectTasksV3.projectId, input.projectId))).orderBy(asc(projectTasksV3.executionOrder)),
      ]);

      const tasksByAction: Record<string, typeof tasks> = {};
      for (const task of tasks) {
        if (!tasksByAction[task.actionCode]) tasksByAction[task.actionCode] = [];
        tasksByAction[task.actionCode].push(task);
      }

      return {
        totalActions: actions.length,
        totalTasks: tasks.length,
        actions: actions.map((a) => ({
          ...a,
          tasks: (tasksByAction[a.actionCode] || []).map((t) => ({
            ...t,
            dependsOn: parseJsonField<string[]>(t.dependsOn, []),
          })),
        })),
      };
    }),

  // getExecutionProgress
  getExecutionProgress: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const clientId = ctx.user.id;

      const [actions, tasks] = await Promise.all([
        db.select({ status: projectActionsV3.status, progressPercent: projectActionsV3.progressPercent, actionPriority: projectActionsV3.actionPriority })
          .from(projectActionsV3)
          .where(and(eq(projectActionsV3.clientId, clientId), eq(projectActionsV3.projectId, input.projectId))),
        db.select({ status: projectTasksV3.status, progressPercent: projectTasksV3.progressPercent, executionOrder: projectTasksV3.executionOrder })
          .from(projectTasksV3)
          .where(and(eq(projectTasksV3.clientId, clientId), eq(projectTasksV3.projectId, input.projectId))),
      ]);

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === "concluido").length;
      const totalActions = actions.length;
      const completedActions = actions.filter((a) => a.status === "concluido").length;

      return {
        tasks: {
          total: totalTasks,
          concluido: completedTasks,
          em_andamento: tasks.filter((t) => t.status === "em_andamento").length,
          bloqueado: tasks.filter((t) => t.status === "bloqueado").length,
          nao_iniciado: tasks.filter((t) => t.status === "nao_iniciado").length,
          progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
        actions: {
          total: totalActions,
          concluido: completedActions,
          em_andamento: actions.filter((a) => a.status === "em_andamento").length,
          progressPercent: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
        },
        byPriority: {
          imediata: {
            total: actions.filter((a) => a.actionPriority === "imediata").length,
            concluido: actions.filter((a) => a.actionPriority === "imediata" && a.status === "concluido").length,
          },
          curto_prazo: {
            total: actions.filter((a) => a.actionPriority === "curto_prazo").length,
            concluido: actions.filter((a) => a.actionPriority === "curto_prazo" && a.status === "concluido").length,
          },
        },
      };
    }),

  // updateTaskStatus
  updateTaskStatus: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      taskCode: z.string(),
      status: z.enum(["nao_iniciado", "em_andamento", "em_revisao", "concluido", "bloqueado"]),
      progressPercent: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const clientId = ctx.user.id;

      const updateData: Record<string, unknown> = { status: input.status, updatedAt: new Date() };
      if (input.progressPercent !== undefined) updateData.progressPercent = input.progressPercent;
      if (input.status === "concluido") { updateData.completedAt = new Date(); updateData.progressPercent = 100; }

      await db.update(projectTasksV3).set(updateData).where(and(
        eq(projectTasksV3.clientId, clientId),
        eq(projectTasksV3.projectId, input.projectId),
        eq(projectTasksV3.taskCode, input.taskCode),
      ));

      await db.update(projectSnapshotsV3).set({ isStale: true }).where(and(
        eq(projectSnapshotsV3.clientId, clientId),
        eq(projectSnapshotsV3.projectId, input.projectId),
      ));

      return { success: true };
    }),

  // updateActionStatus
  updateActionStatus: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      actionCode: z.string(),
      status: z.enum(["nao_iniciado", "em_andamento", "em_revisao", "concluido", "cancelado"]),
      progressPercent: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const clientId = ctx.user.id;

      const updateData: Record<string, unknown> = { status: input.status, updatedAt: new Date() };
      if (input.progressPercent !== undefined) updateData.progressPercent = input.progressPercent;
      if (input.status === "concluido") { updateData.completedAt = new Date(); updateData.progressPercent = 100; }

      await db.update(projectActionsV3).set(updateData).where(and(
        eq(projectActionsV3.clientId, clientId),
        eq(projectActionsV3.projectId, input.projectId),
        eq(projectActionsV3.actionCode, input.actionCode),
      ));

      await db.update(projectSnapshotsV3).set({ isStale: true }).where(and(
        eq(projectSnapshotsV3.clientId, clientId),
        eq(projectSnapshotsV3.projectId, input.projectId),
      ));

      return { success: true };
    }),

  // getExecutiveSummary
  getExecutiveSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const clientId = ctx.user.id;

      const [gaps, risks, actions] = await Promise.all([
        db.select().from(projectGapsV3).where(and(eq(projectGapsV3.clientId, clientId), eq(projectGapsV3.projectId, input.projectId))).orderBy(desc(projectGapsV3.priorityScore)).limit(20),
        db.select().from(projectRisksV3).where(and(eq(projectRisksV3.clientId, clientId), eq(projectRisksV3.projectId, input.projectId))).orderBy(desc(projectRisksV3.riskScore)).limit(10),
        db.select().from(projectActionsV3).where(and(eq(projectActionsV3.clientId, clientId), eq(projectActionsV3.projectId, input.projectId))).limit(20),
      ]);

      const overallScore = gaps.length > 0
        ? Math.round(gaps.reduce((s: number, g) => s + Number(g.score), 0) / gaps.length)
        : 0;

      const criticalGaps = gaps.filter((g) => g.criticality === "critica");
      const criticalRisks = risks.filter((r) => r.riskLevel === "critico");
      const immediateActions = actions.filter((a) => a.actionPriority === "imediata");

      const systemPrompt = `Você é um especialista em compliance tributário brasileiro, especializado na Reforma Tributária (EC 132/2023, LC 214/2024). Escreva em português brasileiro formal e objetivo. Não altere scores, riscos ou prioridades — apenas escreva narrativas baseadas nos dados fornecidos.`;

      const userPrompt = `Gere um sumário executivo de compliance:
SCORE GERAL: ${overallScore}/100
GAPS CRÍTICOS: ${criticalGaps.length} (de ${gaps.length} total)
RISCOS CRÍTICOS: ${criticalRisks.length} (de ${risks.length} total)
AÇÕES IMEDIATAS: ${immediateActions.length}
TOP 5 GAPS: ${criticalGaps.slice(0, 5).map((g, i: number) => `${i + 1}. ${g.requirementName} (score: ${g.score})`).join("; ")}
TOP 3 RISCOS: ${criticalRisks.slice(0, 3).map((r, i: number) => `${i + 1}. ${r.requirementName} (riskScore: ${r.riskScore})`).join("; ")}

Responda com JSON: {"executiveSummary":"...","topRisksNarrative":"...","actionPlanNarrative":"...","overallAssessment":"critico|alto|medio|baixo","keyMessage":"..."}`;

      let aiResult: Record<string, string> | null = null;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        const content = response.choices?.[0]?.message?.content;
        if (typeof content === "string") {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) aiResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // fallback
      }

      if (!aiResult) {
        aiResult = {
          executiveSummary: `O projeto apresenta score geral de ${overallScore}/100 com ${criticalGaps.length} gaps críticos identificados. Foram identificados ${criticalRisks.length} riscos críticos que requerem atenção imediata.`,
          topRisksNarrative: `Os principais riscos concentram-se em ${Array.from(new Set(criticalRisks.slice(0, 3).map((r) => r.riskDimension))).join(" e ")}. Ação imediata é necessária.`,
          actionPlanNarrative: `O plano de ação contempla ${actions.length} ações, com ${immediateActions.length} de prioridade imediata.`,
          overallAssessment: overallScore < 40 ? "critico" : overallScore < 60 ? "alto" : overallScore < 80 ? "medio" : "baixo",
          keyMessage: `Compliance score de ${overallScore}/100 — ${criticalGaps.length} gaps críticos requerem ação imediata.`,
        };
      }

      // Determinar source: se aiResult foi definido pelo bloco try (LLM), source=llm; caso contrário fallback
      const source: "llm" | "fallback" = (aiResult && typeof (aiResult as Record<string, unknown>).executiveSummary === "string" && !String((aiResult as Record<string, unknown>).executiveSummary).startsWith("O projeto apresenta score geral")) ? "llm" : "fallback";

      return {
        overallScore,
        totalGaps: gaps.length,
        criticalGaps: criticalGaps.length,
        totalRisks: risks.length,
        criticalRisks: criticalRisks.length,
        immediateActions: immediateActions.length,
        ...(aiResult as Record<string, unknown>),
        source,
        generatedAt: new Date(),
      };
    }),

  // exportCsv
  exportCsv: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const clientId = ctx.user.id;

      const [gaps, risks, actions, tasks] = await Promise.all([
        db.select().from(projectGapsV3).where(and(eq(projectGapsV3.clientId, clientId), eq(projectGapsV3.projectId, input.projectId))).orderBy(desc(projectGapsV3.priorityScore)),
        db.select().from(projectRisksV3).where(and(eq(projectRisksV3.clientId, clientId), eq(projectRisksV3.projectId, input.projectId))).orderBy(desc(projectRisksV3.riskScore)),
        db.select().from(projectActionsV3).where(and(eq(projectActionsV3.clientId, clientId), eq(projectActionsV3.projectId, input.projectId))),
        db.select().from(projectTasksV3).where(and(eq(projectTasksV3.clientId, clientId), eq(projectTasksV3.projectId, input.projectId))).orderBy(asc(projectTasksV3.executionOrder)),
      ]);

      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines: string[] = [];

      lines.push("SEÇÃO 1 — GAPS DE COMPLIANCE");
      lines.push("Código,Requisito,Domínio,Criticidade,Tipo,Score,Nível de Risco,Prioridade,Dias Estimados,Status");
      for (const g of gaps) {
        lines.push([g.requirementCode, g.requirementName, g.domain, g.criticality, g.gapType, g.score, g.riskLevel, g.actionPriority, g.estimatedDays, g.complianceStatus].map(esc).join(","));
      }

      lines.push("", "SEÇÃO 2 — MATRIZ DE RISCOS");
      lines.push("Código Risco,Requisito,Domínio,Probabilidade,Impacto,Score,Score Norm.,Nível,Dimensão,Impacto Financeiro %");
      for (const r of risks) {
        lines.push([r.riskCode, r.requirementName, r.domain, r.probability, r.impact, r.riskScore, r.riskScoreNormalized, r.riskLevel, r.riskDimension, r.financialImpactPercent].map(esc).join(","));
      }

      lines.push("", "SEÇÃO 3 — PLANO DE AÇÃO");
      lines.push("Código Ação,Nome,Domínio,Tipo,Prioridade,Dias,Responsável,Status,Progresso %");
      for (const a of actions) {
        lines.push([a.actionCode, a.actionName, a.domain, a.actionType, a.actionPriority, a.estimatedDays, a.ownerSuggestion, a.status, a.progressPercent].map(esc).join(","));
      }

      lines.push("", "SEÇÃO 4 — TAREFAS ATÔMICAS");
      lines.push("Código Tarefa,Código Ação,Nome,Tipo,Responsável,Dias,Ordem,Status,Progresso %");
      for (const t of tasks) {
        lines.push([t.taskCode, t.actionCode, t.taskName, t.taskType, t.ownerType, t.estimatedDays, t.executionOrder, t.status, t.progressPercent].map(esc).join(","));
      }

      const csv = "\uFEFF" + lines.join("\n");
      return {
        filename: `compliance-v3-projeto-${input.projectId}-${new Date().toISOString().slice(0, 10)}.csv`,
        contentType: "text/csv; charset=utf-8",
        content: csv,
      };
    }),

  // exportPdf — Relatório Executivo HTML (Sprint 7)
  exportPdf: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const clientId = ctx.user.id;

      const [gaps, risks, actions, tasks, snapshotRows] = await Promise.all([
        db.select().from(projectGapsV3).where(and(eq(projectGapsV3.clientId, clientId), eq(projectGapsV3.projectId, input.projectId))).orderBy(desc(projectGapsV3.priorityScore)),
        db.select().from(projectRisksV3).where(and(eq(projectRisksV3.clientId, clientId), eq(projectRisksV3.projectId, input.projectId))).orderBy(desc(projectRisksV3.riskScore)),
        db.select().from(projectActionsV3).where(and(eq(projectActionsV3.clientId, clientId), eq(projectActionsV3.projectId, input.projectId))),
        db.select().from(projectTasksV3).where(and(eq(projectTasksV3.clientId, clientId), eq(projectTasksV3.projectId, input.projectId))).orderBy(asc(projectTasksV3.executionOrder)),
        db.select().from(projectSnapshotsV3).where(and(eq(projectSnapshotsV3.clientId, clientId), eq(projectSnapshotsV3.projectId, input.projectId))).orderBy(desc(projectSnapshotsV3.createdAt)).limit(1),
      ]);

      const snapshot = snapshotRows[0];
      const overallScore = snapshot
        ? Math.round(Number(snapshot.overallScore))
        : gaps.length > 0 ? Math.round(gaps.reduce((s, g) => s + Number(g.score), 0) / gaps.length) : 0;
      const criticalGaps = gaps.filter(g => g.criticality === "critica" || g.riskLevel === "critico");
      const criticalRisks = risks.filter(r => r.riskLevel === "critico");
      const immediateActions = actions.filter(a => a.actionPriority === "imediata");
      const totalFinancialImpact = risks.length > 0
        ? (risks.reduce((sum, r) => sum + Number(r.financialImpactPercent ?? 0), 0) / risks.length).toFixed(1)
        : "0.0";
      const now = new Date().toLocaleDateString("pt-BR");
      const scoreColor = overallScore < 40 ? "#dc2626" : overallScore < 70 ? "#d97706" : "#16a34a";
      const esc = (v: unknown) => String(v ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // Build HTML using string concatenation to avoid nested template literals
      const gapRows = criticalGaps.slice(0, 10).map(g =>
        "<tr><td>" + esc(g.requirementName ?? g.requirementCode) + "</td><td>" + esc(g.domain) +
        "</td><td><span class=\"badge r\">" + esc(g.criticality) + "</span></td><td>" + esc(g.gapType) +
        "</td><td>" + g.score + "</td><td>" + esc(g.actionPriority) + "</td></tr>"
      ).join("");

      const riskRows = risks.slice(0, 10).map(r => {
        const lvl = r.riskLevel === "critico" ? "r" : r.riskLevel === "alto" ? "y" : "b";
        return "<tr><td>" + esc(r.requirementName ?? r.riskCode) + "</td><td>" + esc(r.domain) +
          "</td><td>" + r.probability + "</td><td>" + r.impact + "</td><td>" + r.riskScore +
          "</td><td><span class=\"badge " + lvl + "\">" + esc(r.riskLevel) + "</span></td><td>" +
          esc(r.riskDimension) + "</td><td>" + Number(r.financialImpactPercent).toFixed(1) + "%</td></tr>";
      }).join("");

      const actionRows = immediateActions.slice(0, 15).map(a =>
        "<tr><td>" + esc(a.actionName) + "</td><td>" + esc(a.domain) + "</td><td>" + esc(a.actionType) +
        "</td><td>" + esc(a.ownerSuggestion) + "</td><td>" + a.estimatedDays + "d</td><td><span class=\"badge y\">" +
        esc(a.status) + "</span></td></tr>"
      ).join("");

      const completedCount = tasks.filter(t => t.status === "concluido").length;
      const inProgressCount = tasks.filter(t => t.status === "em_andamento").length;
      const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

      const html = [
        "<!DOCTYPE html>",
        "<html lang=\"pt-BR\">",
        "<head><meta charset=\"UTF-8\"><title>Relatório Executivo de Compliance — Solaris v3</title>",
        "<style>",
        "body{font-family:Arial,sans-serif;color:#1a1a2e;background:#fff;margin:0;padding:0;}",
        ".cover{background:linear-gradient(135deg,#0f3460 0%,#16213e 100%);color:white;padding:80px 60px;}",
        ".cover h1{font-size:36px;margin-bottom:12px;}",
        ".sub{font-size:18px;opacity:.8;margin-bottom:40px;}",
        ".score-badge{background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.3);border-radius:12px;padding:24px 40px;display:inline-block;margin-bottom:32px;}",
        ".score-num{font-size:72px;font-weight:700;line-height:1;color:" + scoreColor + ";}",
        ".score-lbl{font-size:16px;opacity:.8;}",
        ".meta{font-size:13px;opacity:.6;}",
        ".section{padding:40px 60px;border-bottom:1px solid #e5e7eb;}",
        ".section h2{font-size:22px;color:#0f3460;margin-bottom:20px;border-left:4px solid #e94560;padding-left:14px;}",
        ".kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;}",
        ".kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px;text-align:center;}",
        ".kpi .val{font-size:32px;font-weight:700;}",
        ".kpi .lbl{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;}",
        ".narrative{background:#f0f9ff;border-left:4px solid #0ea5e9;padding:18px 22px;border-radius:0 8px 8px 0;margin-bottom:14px;font-size:14px;line-height:1.7;color:#1e40af;}",
        "table{width:100%;border-collapse:collapse;font-size:12px;}",
        "th{background:#0f3460;color:white;padding:9px 11px;text-align:left;font-weight:600;}",
        "td{padding:8px 11px;border-bottom:1px solid #e5e7eb;}",
        "tr:nth-child(even) td{background:#f8fafc;}",
        ".badge{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:600;}",
        ".r{background:#fee2e2;color:#dc2626;}.y{background:#fef3c7;color:#d97706;}.g{background:#dcfce7;color:#16a34a;}.b{background:#dbeafe;color:#2563eb;}",
        ".footer{padding:20px 60px;background:#f8fafc;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;}",
        "</style></head><body>",
        "<div class=\"cover\">",
        "  <h1>Relatório Executivo de Compliance</h1>",
        "  <div class=\"sub\">Solaris Compliance v3 — Reforma Tributária (IBS/CBS/IS)</div>",
        "  <div class=\"score-badge\"><div class=\"score-num\">" + overallScore + "</div><div class=\"score-lbl\">Score Geral / 100</div></div>",
        "  <div class=\"meta\">Gerado em " + now + " | Projeto #" + input.projectId + " | " + gaps.length + " requisitos avaliados</div>",
        "</div>",
        "<div class=\"section\">",
        "  <h2>Resumo Executivo</h2>",
        "  <div class=\"kpi-grid\">",
        "    <div class=\"kpi\"><div class=\"val\" style=\"color:" + scoreColor + "\">" + overallScore + "</div><div class=\"lbl\">Score Compliance</div></div>",
        "    <div class=\"kpi\"><div class=\"val\" style=\"color:#dc2626\">" + criticalGaps.length + "</div><div class=\"lbl\">Gaps Críticos</div></div>",
        "    <div class=\"kpi\"><div class=\"val\" style=\"color:#dc2626\">" + criticalRisks.length + "</div><div class=\"lbl\">Riscos Críticos</div></div>",
        "    <div class=\"kpi\"><div class=\"val\" style=\"color:#d97706\">" + immediateActions.length + "</div><div class=\"lbl\">Ações Imediatas</div></div>",
        "  </div>",
        "  <div class=\"narrative\">O projeto apresenta score geral de " + overallScore + "/100. Foram identificados " + gaps.length + " gaps de compliance, sendo " + criticalGaps.length + " críticos. A matriz de risco aponta " + criticalRisks.length + " riscos críticos. O plano de ação contempla " + actions.length + " ações, com " + immediateActions.length + " de prioridade imediata (prazo de 15 dias). Impacto financeiro médio estimado: " + totalFinancialImpact + "% da receita.</div>",
        "</div>",
        "<div class=\"section\">",
        "  <h2>Top Gaps Críticos</h2>",
        "  <table><tr><th>Requisito</th><th>Domínio</th><th>Criticidade</th><th>Tipo</th><th>Score</th><th>Prioridade</th></tr>",
        gapRows,
        "  </table></div>",
        "<div class=\"section\">",
        "  <h2>Matriz de Riscos — Top 10</h2>",
        "  <table><tr><th>Requisito</th><th>Domínio</th><th>P</th><th>I</th><th>Score</th><th>Nível</th><th>Dimensão</th><th>Impacto Fin. %</th></tr>",
        riskRows,
        "  </table></div>",
        "<div class=\"section\">",
        "  <h2>Ações Imediatas</h2>",
        "  <table><tr><th>Ação</th><th>Domínio</th><th>Tipo</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr>",
        actionRows,
        "  </table></div>",
        "<div class=\"section\">",
        "  <h2>Progresso das Tarefas</h2>",
        "  <div class=\"kpi-grid\">",
        "    <div class=\"kpi\"><div class=\"val\">" + tasks.length + "</div><div class=\"lbl\">Total Tarefas</div></div>",
        "    <div class=\"kpi\"><div class=\"val\" style=\"color:#16a34a\">" + completedCount + "</div><div class=\"lbl\">Concluídas</div></div>",
        "    <div class=\"kpi\"><div class=\"val\" style=\"color:#d97706\">" + inProgressCount + "</div><div class=\"lbl\">Em Andamento</div></div>",
        "    <div class=\"kpi\"><div class=\"val\">" + progressPct + "%</div><div class=\"lbl\">Progresso</div></div>",
        "  </div></div>",
        "<div class=\"footer\"><span>Solaris Compliance v3 — Relatório Executivo</span><span>Gerado em " + now + " | Confidencial</span></div>",
        "</body></html>",
      ].join("\n");

      return {
        filename: `compliance-v3-relatorio-executivo-projeto-${input.projectId}-${new Date().toISOString().slice(0, 10)}.html`,
        contentType: "text/html; charset=utf-8",
        content: html,
      };
    }),
});
