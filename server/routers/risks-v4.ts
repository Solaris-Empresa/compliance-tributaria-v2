/**
 * risks-v4.ts — Sprint Z-07 PR #C
 *
 * Router tRPC para o Sistema de Riscos v4.
 * Arquivo novo — não altera nenhum arquivo existente (ADR-0022).
 *
 * 11 procedures obrigatórias:
 *   generateRisks · listRisks · deleteRisk · restoreRisk · approveRisk
 *   upsertActionPlan · deleteActionPlan · approveActionPlan
 *   upsertTask · deleteTask · getAuditLog
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { computeRiskMatrix, buildActionPlans } from "../lib/risk-engine-v4";
import type { GapRule } from "../lib/risk-engine-v4";
import { generateRisksV4Pipeline } from "../lib/generate-risks-pipeline";
// Sprint Z-10 PR #B — ACL Gap→Risk
import { GapToRuleMapper } from "../lib/gap-to-rule-mapper";
import { getActiveCategories, getCategoryByCodigo } from "../lib/risk-category.repository.drizzle";
import { GapInputSchema } from "../schemas/gap-risk.schemas";
import type { CategoryACL } from "../schemas/gap-risk.schemas";
import type { CategoryResolver } from "../lib/gap-to-rule-mapper";
import {
  insertRiskV4WithAudit,
  insertActionPlanV4WithAudit,
  getRisksV4ByProject,
  getRiskV4ById,
  softDeleteRiskV4,
  approveRiskV4,
  insertAuditLog,
  getAuditLog,
  getActionPlansByRisk,
  getActionPlansByProject,
  approveActionPlanV4,
  softDeleteActionPlanV4,
  insertTaskV4,
  getTasksByActionPlan,
  updateTaskStatus,
  softDeleteTaskV4,
  getProjectAuditLog,
  deleteRisksByProject,
} from "../lib/db-queries-risks-v4";
import type {
  CategoriaV4,
  SeveridadeV4,
  UrgenciaV4,
  SourcePriorityV4,
  PrazoActionPlan,
  StatusTask,
} from "../lib/db-queries-risks-v4";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas Zod
// ─────────────────────────────────────────────────────────────────────────────

const CategoriaV4Schema = z.enum([
  "imposto_seletivo",
  "confissao_automatica",
  "split_payment",
  "inscricao_cadastral",
  "regime_diferenciado",
  "transicao_iss_ibs",
  "obrigacao_acessoria",
  "aliquota_zero",
  "aliquota_reduzida",
  "credito_presumido",
]);

const GapRuleSchema = z.object({
  ruleId: z.string(),
  categoria: z.string(),
  artigo: z.string(),
  fonte: z.string(),
  gapClassification: z.string(),
  requirementId: z.string(),
  sourceReference: z.string(),
  domain: z.string(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const risksV4Router = router({
  /**
   * 1. generateRisks
   * Recebe gaps confirmados, executa o engine determinístico e persiste os
   * riscos + planos de ação na tabela risks_v4 / action_plans.
   */
  generateRisks: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        gaps: z.array(GapRuleSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId, gaps } = input;
      const actor = {
        user_id: ctx.user.id,
        user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
        user_role: ctx.user.role ?? "user",
      };

      // Sprint Z-13.5: limpar snapshot anterior
      await deleteRisksByProject(projectId);

      // Sprint Z-13.5: pipeline consolidada
      const { risks, summary } = await generateRisksV4Pipeline(
        projectId,
        gaps as GapRule[],
        ctx.user.id,
      );

      // Persistir riscos consolidados
      const riskIds: string[] = [];
      for (const risk of risks) {
        const id = await insertRiskV4WithAudit(risk, actor);
        riskIds.push(id);
      }

      // Gerar planos de ação para riscos não-oportunidade
      const actionPlans = buildActionPlans(
        risks
          .filter((r) => r.type === "risk")
          .map((r) => ({
            ruleId: r.rule_id,
            categoria: r.categoria,
            artigo: r.artigo,
            fonte: r.source_priority,
            severity: r.severidade as "alta" | "media" | "oportunidade",
            urgency: r.urgencia as "imediata" | "curto_prazo" | "medio_prazo",
            breadcrumb: (Array.isArray(r.breadcrumb) ? r.breadcrumb : []) as [string, string, string, string],
            gapClassification: "consolidado",
            requirementId: r.rule_id,
            sourceReference: r.descricao ?? "",
            domain: "",
          }))
      );

      const prazoMap: Record<string, PrazoActionPlan> = {
        imediata: "30_dias",
        curto_prazo: "60_dias",
        medio_prazo: "90_dias",
      };
      const planIds: string[] = [];
      for (let i = 0; i < actionPlans.length; i++) {
        const plan = actionPlans[i];
        const riskId = riskIds.find((_id, idx) => risks[idx]?.rule_id === plan.riskRuleId);
        if (!riskId) continue;

        const id = await insertActionPlanV4WithAudit(
          {
            project_id: projectId,
            risk_id: riskId,
            titulo: `Plano: ${plan.categoria} — ${plan.artigo}`,
            responsavel: "equipe_compliance",
            prazo: prazoMap[plan.prioridade] ?? "60_dias",
            created_by: ctx.user.id,
            updated_by: ctx.user.id,
          },
          actor
        );
        planIds.push(id);
      }

      return {
        risksGenerated: riskIds.length,
        actionPlansGenerated: planIds.length,
        riskIds,
        planIds,
        summary,
      };
    }),

  /**
   * 2. listRisks
   * Lista todos os riscos ativos de um projeto, com seus planos de ação.
   */
  listRisks: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const risks = await getRisksV4ByProject(input.projectId);

      const risksWithPlans = await Promise.all(
        risks.map(async (risk) => {
          const plans = await getActionPlansByRisk(risk.id);
          return { ...risk, actionPlans: plans };
        })
      );

      return { risks: risksWithPlans };
    }),

  /**
   * 3. deleteRisk
   * Soft-delete de um risco (status → 'deleted'). Registra no audit_log.
   */
  deleteRisk: protectedProcedure
    .input(
      z.object({
        riskId: z.string().uuid(),
        reason: z.string().min(1, "Motivo obrigatório"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const risk = await getRiskV4ById(input.riskId);
      if (!risk) throw new TRPCError({ code: "NOT_FOUND", message: "Risco não encontrado" });

      await softDeleteRiskV4(input.riskId, ctx.user.id, input.reason);

      await insertAuditLog({
        project_id: risk.project_id,
        entity: "risk",
        entity_id: input.riskId,
        action: "deleted",
        user_id: ctx.user.id,
        user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
        user_role: ctx.user.role ?? "user",
        before_state: { status: "active" },
        after_state: { status: "deleted", deleted_reason: input.reason },
        reason: input.reason,
      });

      return { success: true };
    }),

  /**
   * 4. restoreRisk
   * Restaura um risco deletado (status → 'active'). Registra no audit_log.
   */
  restoreRisk: protectedProcedure
    .input(
      z.object({
        riskId: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const risk = await getRiskV4ById(input.riskId);
      if (!risk) throw new TRPCError({ code: "NOT_FOUND", message: "Risco não encontrado" });
      if (risk.status !== "deleted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Risco não está deletado" });
      }

      // Restaurar via query direta (status → active)
      const { drizzle } = await import("drizzle-orm/mysql2");
      const db = drizzle(process.env.DATABASE_URL!);
      await (db.$client as any).execute(
        "UPDATE risks_v4 SET status = 'active', deleted_reason = NULL, updated_by = ? WHERE id = ?",
        [ctx.user.id, input.riskId]
      );

      await insertAuditLog({
        project_id: risk.project_id,
        entity: "risk",
        entity_id: input.riskId,
        action: "restored",
        user_id: ctx.user.id,
        user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
        user_role: ctx.user.role ?? "user",
        before_state: { status: "deleted" },
        after_state: { status: "active" },
        reason: input.reason,
      });

      return { success: true };
    }),

  /**
   * 5. approveRisk
   * Aprova um risco (registra approved_by + approved_at). Registra no audit_log.
   */
  approveRisk: protectedProcedure
    .input(z.object({ riskId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const risk = await getRiskV4ById(input.riskId);
      if (!risk) throw new TRPCError({ code: "NOT_FOUND", message: "Risco não encontrado" });

      await approveRiskV4(input.riskId, ctx.user.id);

      await insertAuditLog({
        project_id: risk.project_id,
        entity: "risk",
        entity_id: input.riskId,
        action: "approved",
        user_id: ctx.user.id,
        user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
        user_role: ctx.user.role ?? "user",
        after_state: { approved_by: ctx.user.id },
      });

      return { success: true };
    }),

  /**
   * 6. bulkApprove — Sprint Z-14 Issue #533
   * Aprova múltiplos riscos de um projeto em uma única chamada.
   * Sem riskIds: aprova todos os pending (approved_at IS NULL AND status='active').
   * Com riskIds: aprova apenas os IDs informados (desde que pending).
   */
  bulkApprove: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        riskIds: z.array(z.string().uuid()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId, riskIds } = input;

      // Buscar todos os riscos ativos do projeto (status='active' garantido pelo helper)
      const allRisks = await getRisksV4ByProject(projectId);
      // Filtrar pending: approved_at IS NULL
      const pending = allRisks.filter((r) => !r.approved_at);
      const toApprove = riskIds
        ? pending.filter((r) => riskIds.includes(r.id))
        : pending;

      if (toApprove.length === 0) {
        return { approved: 0, risks: [] };
      }

      // Aprovar cada risco individualmente (reutiliza helpers existentes)
      await Promise.all(
        toApprove.map(async (risk) => {
          await approveRiskV4(risk.id, ctx.user.id);
          await insertAuditLog({
            project_id: projectId,
            entity: "risk",
            entity_id: risk.id,
            action: "approved",
            user_id: ctx.user.id,
            user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
            user_role: ctx.user.role ?? "user",
            after_state: { approved_by: ctx.user.id, approved_at: new Date() },
          });
        })
      );

      return { approved: toApprove.length, risks: toApprove };
    }),

  /**
   * 7. upsertActionPlan
   * Cria ou atualiza um plano de ação vinculado a um risco.
   */
  upsertActionPlan: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        riskId: z.string().uuid(),
        planId: z.string().uuid().optional(),
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        responsavel: z.string().min(1),
        prazo: z.enum(["30_dias", "60_dias", "90_dias"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const actor = {
        user_id: ctx.user.id,
        user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
        user_role: ctx.user.role ?? "user",
      };

      if (input.planId) {
        // Update
        const { drizzle } = await import("drizzle-orm/mysql2");
        const db = drizzle(process.env.DATABASE_URL!);
        await (db.$client as any).execute(
          "UPDATE action_plans SET titulo = ?, descricao = ?, responsavel = ?, prazo = ?, updated_by = ? WHERE id = ?",
          [input.titulo, input.descricao ?? null, input.responsavel, input.prazo, ctx.user.id, input.planId]
        );
        await insertAuditLog({
          project_id: input.projectId,
          entity: "action_plan",
          entity_id: input.planId,
          action: "updated",
          ...actor,
          after_state: { titulo: input.titulo, prazo: input.prazo },
        });
        return { planId: input.planId, created: false };
      }

      // Insert
      const planId = await insertActionPlanV4WithAudit(
        {
          project_id: input.projectId,
          risk_id: input.riskId,
          titulo: input.titulo,
          descricao: input.descricao,
          responsavel: input.responsavel,
          prazo: input.prazo as PrazoActionPlan,
          created_by: ctx.user.id,
          updated_by: ctx.user.id,
        },
        actor
      );

      return { planId, created: true };
    }),

  /**
   * 7. deleteActionPlan
   * Soft-delete de um plano de ação. Registra no audit_log.
   */
  deleteActionPlan: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        planId: z.string().uuid(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await softDeleteActionPlanV4(input.planId, ctx.user.id, input.reason);

      await insertAuditLog({
        project_id: input.projectId,
        entity: "action_plan",
        entity_id: input.planId,
        action: "deleted",
        user_id: ctx.user.id,
        user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
        user_role: ctx.user.role ?? "user",
        reason: input.reason,
      });

      return { success: true };
    }),

  /**
   * 8. approveActionPlan
   * Aprova um plano de ação (status → 'aprovado'). Registra no audit_log.
   */
  approveActionPlan: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        planId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await approveActionPlanV4(input.planId, ctx.user.id);

      await insertAuditLog({
        project_id: input.projectId,
        entity: "action_plan",
        entity_id: input.planId,
        action: "approved",
        user_id: ctx.user.id,
        user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
        user_role: ctx.user.role ?? "user",
        after_state: { approved_by: ctx.user.id },
      });

      return { success: true };
    }),

  /**
   * 9. upsertTask
   * Cria ou atualiza uma tarefa vinculada a um plano de ação.
   */
  upsertTask: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        actionPlanId: z.string().uuid(),
        taskId: z.string().uuid().optional(),
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        responsavel: z.string().min(1),
        prazo: z.string().optional(),
        status: z.enum(["todo", "doing", "done", "blocked"]).optional(),
        ordem: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.taskId) {
        // Update status ou campos
        const newStatus = (input.status ?? "todo") as StatusTask;
        await updateTaskStatus(input.taskId, newStatus);

        await insertAuditLog({
          project_id: input.projectId,
          entity: "task",
          entity_id: input.taskId,
          action: "updated",
          user_id: ctx.user.id,
          user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
          user_role: ctx.user.role ?? "user",
          after_state: { status: newStatus },
        });

        return { taskId: input.taskId, created: false };
      }

      // Insert
      const taskId = await insertTaskV4({
        project_id: input.projectId,
        action_plan_id: input.actionPlanId,
        titulo: input.titulo,
        descricao: input.descricao,
        responsavel: input.responsavel,
        prazo: input.prazo ? new Date(input.prazo) : undefined,
        ordem: input.ordem ?? 0,
        created_by: ctx.user.id,
      });

      await insertAuditLog({
        project_id: input.projectId,
        entity: "task",
        entity_id: taskId,
        action: "created",
        user_id: ctx.user.id,
        user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
        user_role: ctx.user.role ?? "user",
        after_state: { titulo: input.titulo, action_plan_id: input.actionPlanId },
      });

      return { taskId, created: true };
    }),

  /**
   * 10. deleteTask
   * Soft-delete de uma tarefa. Registra no audit_log.
   */
  deleteTask: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        taskId: z.string().uuid(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await softDeleteTaskV4(input.taskId, input.reason);

      await insertAuditLog({
        project_id: input.projectId,
        entity: "task",
        entity_id: input.taskId,
        action: "deleted",
        user_id: ctx.user.id,
        user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
        user_role: ctx.user.role ?? "user",
        reason: input.reason,
      });

      return { success: true };
    }),

  /**
   * 12. mapGapsToRules — Sprint Z-10 PR #B
   * Anti-Corruption Layer: traduz GapInput[] (compliance operacional) em GapRule[] (normativo).
   * Usa GapToRuleMapper com allowLayerInference=false (DEC-Z10-05).
   * Retorna: { mappedRules, reviewQueue, stats }
   */
  mapGapsToRules: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      gaps: z.array(GapInputSchema),
    }))
    .mutation(async ({ input }) => {
      // Adapter: CategoryResolver usando funções standalone do repository
      const resolver: CategoryResolver = {
        async findByCodigo(codigo: string): Promise<CategoryACL | undefined> {
          const cat = await getCategoryByCodigo(codigo);
          if (!cat || cat.status !== "ativo") return undefined;
          return {
            codigo: cat.codigo,
            nome: cat.nome,
            severidade: cat.severidade as CategoryACL["severidade"],
            urgencia: cat.urgencia as CategoryACL["urgencia"],
            tipo: cat.tipo as CategoryACL["tipo"],
            status: cat.status as CategoryACL["status"],
            allowedDomains: cat.allowedDomains ?? null,
            allowedGapTypes: cat.allowedGapTypes ?? null,
            ruleCode: cat.ruleCode ?? null,
          };
        },
        async findByArticle(normalizedArticle: string): Promise<CategoryACL[]> {
          const all = await getActiveCategories();
          // Busca categorias cujo artigo_base contém o artigo normalizado
          return all.filter((c) =>
            c.allowedGapTypes?.some((t) =>
              t.toLowerCase().includes(normalizedArticle.toLowerCase())
            ) ?? false
          );
        },
      };
      const mapper = new GapToRuleMapper(resolver, { allowLayerInference: false });
      return mapper.mapMany(input.gaps);
    }),

  /**
   * 13. generateRisksFromGaps — Sprint Z-10 PR #B
   * Recebe mappedRules (GapRule[]) do ACL e gera risks_v4 via engine determinístico.
   * Persiste riscos + planos de ação. Retorna: { risks, actionPlans, inserted }
   */
  generateRisksFromGaps: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      mappedRules: z.array(GapRuleSchema),
    }))
    .mutation(async ({ input, ctx }) => {
      const actor = {
        user_id: ctx.user.id,
        user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
        user_role: ctx.user.role ?? "user",
      };

      // Sprint Z-13.5: limpar snapshot anterior + pipeline consolidada
      await deleteRisksByProject(input.projectId);

      const { risks, summary } = await generateRisksV4Pipeline(
        input.projectId,
        input.mappedRules as GapRule[],
        ctx.user.id,
      );

      const riskIds: string[] = [];
      for (const risk of risks) {
        const id = await insertRiskV4WithAudit(risk, actor);
        riskIds.push(id);
      }

      return { inserted: riskIds.length, summary };
    }),

  /**
   * 11. getAuditLog
   * Lê o histórico de auditoria de uma entidade (risk | action_plan | task).
   */
  getAuditLog: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        entity: z.enum(["risk", "action_plan", "task"]),
        entityId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const entries = await getAuditLog(input.projectId, input.entity, input.entityId);
      return { entries };
    }),

  /**
   * 14. bulkGenerateActionPlans — Fix B-02 (Sprint Z-14)
   * Gera planos de ação para todos os riscos aprovados sem plano no projeto.
   * Chamado automaticamente após bulkApprove.
   */
  bulkGenerateActionPlans: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { projectId } = input;
      const actor = {
        user_id: ctx.user.id,
        user_name: ctx.user.name ?? ctx.user.email ?? "unknown",
        user_role: ctx.user.role ?? "user",
      };

      // Buscar riscos aprovados do projeto
      const allRisks = await getRisksV4ByProject(projectId);
      const approvedRisks = allRisks.filter(
        (r) => r.approved_at !== null && r.type === "risk"
      );

      if (approvedRisks.length === 0) {
        return { generated: 0, planIds: [] };
      }

      // Buscar planos já existentes para evitar duplicatas
      const existingPlans = await getActionPlansByProject(projectId);
      const riskIdsWithPlans = new Set(existingPlans.map((p) => p.risk_id));

      // Filtrar riscos sem plano de ação
      const risksWithoutPlans = approvedRisks.filter(
        (r) => !riskIdsWithPlans.has(r.id)
      );

      if (risksWithoutPlans.length === 0) {
        return { generated: 0, planIds: [] };
      }

      const prazoMap: Record<string, PrazoActionPlan> = {
        imediata: "30_dias",
        curto_prazo: "60_dias",
        medio_prazo: "90_dias",
      };

      const planIds: string[] = [];
      for (const risk of risksWithoutPlans) {
        const id = await insertActionPlanV4WithAudit(
          {
            project_id: projectId,
            risk_id: risk.id,
            titulo: `Plano: ${risk.categoria} — ${risk.artigo}`,
            responsavel: "equipe_compliance",
            prazo: prazoMap[risk.urgencia as string] ?? "60_dias",
            created_by: ctx.user.id,
            updated_by: ctx.user.id,
          },
          actor
        );
        planIds.push(id);
      }

      return { generated: planIds.length, planIds };
    }),

  /**
   * 12. getProjectAuditLog (Sprint Z-12)
   * Lê o histórico de auditoria global de um projeto (todas as entidades).
   */
  getProjectAuditLog: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        limit: z.number().min(1).max(500).optional().default(100),
      })
    )
    .query(async ({ input }) => {
      const entries = await getProjectAuditLog(input.projectId, input.limit);
      return { entries };
    }),
});
