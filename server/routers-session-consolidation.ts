/**
 * routers-session-consolidation.ts
 * Fase 4 do Novo Fluxo v2.0 — Consolidação Final e Gestão
 *
 * Procedures:
 *  - sessionConsolidation.generate       → IA gera relatório consolidado final
 *  - sessionConsolidation.get            → busca consolidação já gerada
 *  - sessionConsolidation.saveToHistory  → migra sessão temporária para projeto histórico
 *  - sessionConsolidation.exportData     → retorna dados formatados para exportação
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import {
  sessions,
  sessionBranchAnswers,
  sessionActionPlans,
  sessionConsolidations,
  projects,
  actions,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface PlanItem {
  id: string;
  branchCode: string;
  branchName: string;
  action: string;
  description: string;
  priority: "critica" | "alta" | "media" | "baixa";
  deadline: string;
  responsible: string;
  status: "pendente" | "em_andamento" | "concluido";
  riskLevel: "critico" | "alto" | "medio" | "baixo";
  category: string;
  estimatedCost: "baixo" | "medio" | "alto";
}

interface BranchAnswer {
  branchCode: string;
  branchName: string;
  aiAnalysis: string | null;
  riskLevel: string | null;
  status: string;
}

interface KeyFinding {
  title: string;
  description: string;
  severity: "critica" | "alta" | "media" | "baixa";
  branchCode?: string;
}

interface Recommendation {
  title: string;
  description: string;
  deadline: string;
  responsible: string;
  priority: number; // 1-5
}

interface TimelinePhase {
  phase: string;
  period: string;
  actions: string[];
  budget: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const priorityOrder = { critica: 4, alta: 3, media: 2, baixa: 1 };

function estimateDays(planItems: PlanItem[]): number {
  // Baseado no prazo mais longo dos itens críticos
  const deadlineMap: Record<string, number> = {
    "imediato": 7,
    "15 dias": 15,
    "30 dias": 30,
    "45 dias": 45,
    "60 dias": 60,
    "3 meses": 90,
    "6 meses": 180,
    "1 ano": 365,
  };
  const maxDays = planItems.reduce((max, item) => {
    const days = deadlineMap[item.deadline.toLowerCase()] ?? 90;
    return days > max ? days : max;
  }, 90);
  return maxDays;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const sessionConsolidationRouter = router({

  /**
   * generate
   * IA gera o relatório consolidado final a partir de todos os dados da sessão.
   */
  generate: publicProcedure
    .input(z.object({ sessionToken: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      // Verificar sessãoo
      const [session] = await database
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, input.sessionToken))
        .limit(1);

      if (!session) throw new Error("Sessão não encontrada");

      // Buscar respostas por ramo
      const branchAnswers = await database
        .select()
        .from(sessionBranchAnswers)
        .where(eq(sessionBranchAnswers.sessionToken, input.sessionToken));

      // Buscar plano de ação
      const [actionPlan] = await database
        .select()
        .from(sessionActionPlans)
        .where(eq(sessionActionPlans.sessionToken, input.sessionToken))
        .limit(1);

      if (!actionPlan) throw new Error("Plano de ação não encontrado. Gere o plano antes de consolidar.");

      const planItems = (actionPlan.planItems as PlanItem[]) ?? [];
      const confirmedBranches = (session.confirmedBranches as { code: string; name: string }[]) ?? [];

      // Criar consolidação inicial (status: gerando)
      const [existing] = await database
        .select()
        .from(sessionConsolidations)
        .where(eq(sessionConsolidations.sessionToken, input.sessionToken))
        .limit(1);

      if (existing) {
        await database
          .update(sessionConsolidations)
          .set({ status: "gerando" })
          .where(eq(sessionConsolidations.sessionToken, input.sessionToken));
      } else {
        await database.insert(sessionConsolidations).values({
          sessionToken: input.sessionToken,
          status: "gerando",
          totalActions: planItems.length,
          criticalActions: planItems.filter((i) => i.priority === "critica").length,
          complianceScore: actionPlan.complianceScore ?? 0,
          overallRiskLevel: actionPlan.overallRiskLevel ?? "medio",
          estimatedDays: estimateDays(planItems),
        });
      }

      // Preparar contexto para IA
      const branchSummaryText = branchAnswers
        .map((b: BranchAnswer) => `- ${b.branchName} (${b.branchCode}): Risco ${b.riskLevel ?? 'desconhecido'}. ${b.aiAnalysis?.substring(0, 200) ?? ""}`)
        .join("\n");

      const topCriticalActions = planItems
        .filter((i) => i.priority === "critica" || i.priority === "alta")
        .sort((a, b) => (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0))
        .slice(0, 5)
        .map((i) => `- [${i.priority.toUpperCase()}] ${i.action} (${i.branchName}, prazo: ${i.deadline})`)
        .join("\n");

      const prompt = `Você é um especialista em compliance tributário da Reforma Tributária brasileira (IBS, CBS, IS).

Analise os dados do diagnóstico e gere um RELATÓRIO CONSOLIDADO FINAL em JSON.

EMPRESA: ${session.companyDescription ?? "Empresa não identificada"}
RAMOS DE ATIVIDADE: ${confirmedBranches.map((b) => b.name).join(", ")}
SCORE DE COMPLIANCE: ${actionPlan.complianceScore ?? 0}%
RISCO GLOBAL: ${actionPlan.overallRiskLevel ?? "medio"}
TOTAL DE AÇÕES: ${planItems.length} (${planItems.filter((i) => i.priority === "critica").length} críticas)

ANÁLISE POR RAMO:
${branchSummaryText}

AÇÕES PRIORITÁRIAS:
${topCriticalActions}

RESUMO DO PLANO:
${actionPlan.executiveSummary ?? ""}

Gere o relatório consolidado com:
1. executiveSummary: Resumo executivo em 3-4 parágrafos (texto corrido, profissional)
2. keyFindings: Array com 5-7 achados principais (title, description, severity: critica/alta/media/baixa, branchCode opcional)
3. topRecommendations: Array com 5 recomendações prioritárias (title, description, deadline, responsible, priority: 1-5)
4. timeline: Array com 3 fases (30/60/90+ dias) cada com (phase, period, actions: string[], budget: string)
5. branchSummaries: Array com resumo por ramo (code, name, riskLevel, topAction, complianceGap)

Responda APENAS com JSON válido.`;

      let consolidationData: {
        executiveSummary: string;
        keyFindings: KeyFinding[];
        topRecommendations: Recommendation[];
        timeline: TimelinePhase[];
        branchSummaries: unknown[];
      };

      try {
        const llmResponse = await invokeLLM({
          enableCache: true,
          messages: [
            { role: "system", content: "Você é um especialista em compliance tributário. Responda sempre com JSON válido." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "consolidation_report",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  executiveSummary: { type: "string" },
                  keyFindings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        severity: { type: "string", enum: ["critica", "alta", "media", "baixa"] },
                        branchCode: { type: "string" },
                      },
                      required: ["title", "description", "severity", "branchCode"],
                      additionalProperties: false,
                    },
                  },
                  topRecommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        deadline: { type: "string" },
                        responsible: { type: "string" },
                        priority: { type: "number" },
                      },
                      required: ["title", "description", "deadline", "responsible", "priority"],
                      additionalProperties: false,
                    },
                  },
                  timeline: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        phase: { type: "string" },
                        period: { type: "string" },
                        actions: { type: "array", items: { type: "string" } },
                        budget: { type: "string" },
                      },
                      required: ["phase", "period", "actions", "budget"],
                      additionalProperties: false,
                    },
                  },
                  branchSummaries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        code: { type: "string" },
                        name: { type: "string" },
                        riskLevel: { type: "string" },
                        topAction: { type: "string" },
                        complianceGap: { type: "string" },
                      },
                      required: ["code", "name", "riskLevel", "topAction", "complianceGap"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["executiveSummary", "keyFindings", "topRecommendations", "timeline", "branchSummaries"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = llmResponse.choices?.[0]?.message?.content ?? "{}";
        consolidationData = typeof content === "string" ? JSON.parse(content) : content;
      } catch {
        // Fallback se IA falhar
        consolidationData = {
          executiveSummary: `A empresa analisada apresenta uma exposição ao risco de compliance de ${actionPlan.complianceScore ?? 0}% em relação às exigências da Reforma Tributária. Foram identificadas ${planItems.length} ações necessárias, sendo ${planItems.filter((i) => i.priority === "critica").length} de prioridade crítica. Os ramos analisados foram: ${confirmedBranches.map((b) => b.name).join(", ")}. O nível de risco global é classificado como ${actionPlan.overallRiskLevel ?? "médio"}, exigindo atenção imediata nas áreas identificadas.`,
          keyFindings: planItems
            .filter((i) => i.priority === "critica" || i.priority === "alta")
            .slice(0, 5)
            .map((i) => ({
              title: i.action,
              description: i.description,
              severity: i.priority as "critica" | "alta" | "media" | "baixa",
              branchCode: i.branchCode,
            })),
          topRecommendations: planItems
            .sort((a, b) => (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0))
            .slice(0, 5)
            .map((i, idx) => ({
              title: i.action,
              description: i.description,
              deadline: i.deadline,
              responsible: i.responsible,
              priority: 5 - idx,
            })),
          timeline: [
            {
              phase: "Fase 1 — Urgente",
              period: "Primeiros 30 dias",
              actions: planItems.filter((i) => i.deadline === "30 dias" || i.priority === "critica").slice(0, 3).map((i) => i.action),
              budget: "A definir",
            },
            {
              phase: "Fase 2 — Curto Prazo",
              period: "30 a 90 dias",
              actions: planItems.filter((i) => i.priority === "alta").slice(0, 3).map((i) => i.action),
              budget: "A definir",
            },
            {
              phase: "Fase 3 — Médio Prazo",
              period: "90 dias a 1 ano",
              actions: planItems.filter((i) => i.priority === "media" || i.priority === "baixa").slice(0, 3).map((i) => i.action),
              budget: "A definir",
            },
          ],
          branchSummaries: confirmedBranches.map((b) => {
            const branchItems = planItems.filter((i) => i.branchCode === b.code);
            const topItem = branchItems.sort((a, x) => (priorityOrder[x.priority] ?? 0) - (priorityOrder[a.priority] ?? 0))[0];
            return {
              code: b.code,
              name: b.name,
              riskLevel: branchAnswers.find((ba: BranchAnswer) => ba.branchCode === b.code)?.riskLevel ?? "medio" as string,
              topAction: topItem?.action ?? "Sem ações críticas",
              complianceGap: `${branchItems.length} ações identificadas`,
            };
          }),
        };
      }

      // Salvar consolidação
      await database
        .update(sessionConsolidations)
        .set({
          executiveSummary: consolidationData.executiveSummary,
          keyFindings: consolidationData.keyFindings as any,
          topRecommendations: consolidationData.topRecommendations as any,
          timeline: consolidationData.timeline as any,
          branchSummaries: consolidationData.branchSummaries as any,
          estimatedBudget: null,
          status: "gerado",
          estimatedDays: estimateDays(planItems),
        })
        .where(eq(sessionConsolidations.sessionToken, input.sessionToken));

      // Atualizar step da sessão
      await database
        .update(sessions)
        .set({ currentStep: "consolidacao" })
        .where(eq(sessions.sessionToken, input.sessionToken));

      return { success: true, complianceScore: actionPlan.complianceScore };
    }),

  /**
   * get
   * Busca a consolidação já gerada para a sessão.
   */
  get: publicProcedure
    .input(z.object({ sessionToken: z.string().min(1) }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [consolidation] = await database
        .select()
        .from(sessionConsolidations)
        .where(eq(sessionConsolidations.sessionToken, input.sessionToken))
        .limit(1);

      if (!consolidation) return null;

      // Buscar dados adicionais da sessão e plano
      const [session] = await database
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, input.sessionToken))
        .limit(1);

      const [actionPlan] = await database
        .select()
        .from(sessionActionPlans)
        .where(eq(sessionActionPlans.sessionToken, input.sessionToken))
        .limit(1);

      return {
        ...consolidation,
        companyDescription: session?.companyDescription,
        confirmedBranches: session?.confirmedBranches,
        planItems: actionPlan?.planItems,
        planStatus: actionPlan?.status,
      };
    }),

  /**
   * saveToHistory
   * Migra a sessão temporária para um projeto histórico permanente.
   * Cria projeto + tarefas no Kanban a partir do plano de ação.
   */
  saveToHistory: protectedProcedure
    .input(z.object({
      sessionToken: z.string().min(1),
      projectName: z.string().min(3).max(200),
      companyName: z.string().min(2).max(200),
    }))
     .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      // Verificar sessão
      const [session] = await database
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, input.sessionToken))
        .limit(1);
      if (!session) throw new Error("Sessão não encontrada");
      // Buscar plano de ação
      const [actionPlan] = await database
        .select()
        .from(sessionActionPlans)
        .where(eq(sessionActionPlans.sessionToken, input.sessionToken))
        .limit(1);
      const planItems = (actionPlan?.planItems as PlanItem[]) ?? [];
      // Buscar consolidação existente
      const [consolidation] = await database
        .select()
        .from(sessionConsolidations)
        .where(eq(sessionConsolidations.sessionToken, input.sessionToken))
        .limit(1);[];

      // Criar projeto histórico
      const [newProject] = await database
        .insert(projects)
        .values({
          name: input.projectName,
          clientId: ctx.user.id,
          status: "em_andamento",
          createdById: ctx.user.id,
          createdByRole: "equipe_solaris" as const,
          mode: "historico" as const,
          sessionToken: input.sessionToken,
        })
        .$returningId();

      const projectId = newProject.id;

      // Criar tarefas no Kanban (tabela actions) a partir do plano de ação
      const priorityMap: Record<string, "baixa" | "media" | "alta" | "critica"> = {
        critica: "critica",
        alta: "alta",
        media: "media",
        baixa: "baixa",
      };

      const deadlineDaysMap: Record<string, number> = {
        "imediato": 7, "15 dias": 15, "30 dias": 30,
        "45 dias": 45, "60 dias": 60, "3 meses": 90,
        "6 meses": 180, "1 ano": 365,
      };

      for (const item of planItems) {
        const deadlineDays = deadlineDaysMap[item.deadline?.toLowerCase()] ?? 90;
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);

        await database.insert(actions).values({
          projectId,
          category: "branch" as const,
          title: item.action,
          description: `${item.description}\n\nRamo: ${item.branchName}\nCategoria: ${item.category}\nPrazo: ${item.deadline}\nCusto estimado: ${item.estimatedCost}`,
          status: (item.status === "concluido" ? "COMPLETED" : "SUGGESTED") as "COMPLETED" | "SUGGESTED",
          priority: (priorityMap[item.priority] ?? "media") as "baixa" | "media" | "alta" | "critica",
          responsibleArea: "FISC" as const,
          taskType: "COMPLIANCE" as const,
          ownerId: ctx.user.id,
          createdBy: ctx.user.id,
          startDate: new Date(),
          deadline: deadlineDate,
        });
      }

      // Atualizar consolidação com projectId
      if (consolidation) {
        await database
          .update(sessionConsolidations)
          .set({
            status: "salvo_historico",
            convertedToProjectId: projectId,
            savedToHistoryAt: new Date(),
          })
          .where(eq(sessionConsolidations.sessionToken, input.sessionToken));
      }

      // Atualizar sessão com projectId e step
      await database
        .update(sessions)
        .set({
          projectId,
          currentStep: "concluido",
        })
        .where(eq(sessions.sessionToken, input.sessionToken));

      return {
        success: true,
        projectId,
        tasksCreated: planItems.length,
        message: `Projeto criado com ${planItems.length} tarefas no Kanban.`,
      };
    }),

  /**
   * exportData
   * Retorna dados formatados para exportação (PDF/Excel no frontend).
   */
  exportData: publicProcedure
    .input(z.object({ sessionToken: z.string().min(1) }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [consolidation] = await database
        .select()
        .from(sessionConsolidations)
        .where(eq(sessionConsolidations.sessionToken, input.sessionToken))
        .limit(1);

      const [session] = await database
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, input.sessionToken))
        .limit(1);

      const [actionPlan] = await database
        .select()
        .from(sessionActionPlans)
        .where(eq(sessionActionPlans.sessionToken, input.sessionToken))
        .limit(1);

      const branchAnswers = await database
        .select()
        .from(sessionBranchAnswers)
        .where(eq(sessionBranchAnswers.sessionToken, input.sessionToken));

      // Marcar como exportado
      if (consolidation) {
        await database
          .update(sessionConsolidations)
          .set({ status: "exportado", exportedAt: new Date() })
          .where(eq(sessionConsolidations.sessionToken, input.sessionToken));
      }

      return {
        metadata: {
          generatedAt: new Date().toISOString(),
          sessionToken: input.sessionToken,
          companyDescription: session?.companyDescription,
          confirmedBranches: session?.confirmedBranches,
        },
        consolidation: consolidation ?? null,
        planItems: (actionPlan?.planItems as PlanItem[]) ?? [],
        branchAnalyses: branchAnswers.map((b: BranchAnswer) => ({
        branchCode: b.branchCode,
        branchName: b.branchName,
        riskLevel: b.riskLevel ?? "medio",
        analysis: b.aiAnalysis ?? "",
        })),
        complianceScore: actionPlan?.complianceScore ?? 0,
        overallRiskLevel: actionPlan?.overallRiskLevel ?? "medio",
      };
    }),
});
