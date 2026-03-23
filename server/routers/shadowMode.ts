/**
 * IA SOLARIS — Shadow Mode Router
 * ─────────────────────────────────────────────────────────────────────────────
 * ADR-009: Endpoints de consulta e controle do Shadow Mode.
 *
 * Acesso restrito a perfil equipe_solaris.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { diagnosticShadowDivergences, projects, users } from "../../drizzle/schema";
import { desc, eq, sql, like } from "drizzle-orm";
import { getDiagnosticReadMode } from "../diagnostic-source";
import { compareDiagnosticSources, type ProjectRowForShadow } from "../diagnostic-shadow";
import * as db from "../db";

/** Guard: apenas equipe_solaris pode acessar endpoints de Shadow Mode */
const solarisProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "equipe_solaris") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "[shadowMode] Acesso restrito à equipe Solaris.",
    });
  }
  return next({ ctx });
});

export const shadowModeRouter = router({
  /**
   * Retorna o modo de leitura atual do adaptador.
   */
  getReadMode: solarisProcedure.query(() => {
    return {
      mode: getDiagnosticReadMode(),
      description: {
        legacy: "Lê apenas colunas legadas (padrão de produção)",
        shadow: "Lê legadas + novas, compara, loga divergências, retorna legadas",
        new: "Lê apenas novas colunas V1/V3 (ativar somente após divergência = 0%)",
      },
    };
  }),

  /**
   * Lista as últimas divergências registradas (paginado).
   */
  listDivergences: solarisProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        projectId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados não disponível",
        });
      }

      const query = database
        .select()
        .from(diagnosticShadowDivergences)
        .orderBy(desc(diagnosticShadowDivergences.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const rows = await query;

      const countResult = await database
        .select({ count: sql<number>`count(*)` })
        .from(diagnosticShadowDivergences);

      return {
        divergences: rows,
        total: countResult[0]?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Retorna o resumo de divergências agrupado por campo e flowVersion.
   * Nomenclatura: summarizeDivergences (conforme ADR-009 spec).
   */
  summarizeDivergences: solarisProcedure.query(async () => {
    const database = await getDb();
    if (!database) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Banco de dados não disponível",
      });
    }

    const byField = await database
      .select({
        fieldName: diagnosticShadowDivergences.fieldName,
        count: sql<number>`count(*)`,
      })
      .from(diagnosticShadowDivergences)
      .groupBy(diagnosticShadowDivergences.fieldName);

    const byFlowVersion = await database
      .select({
        flowVersion: diagnosticShadowDivergences.flowVersion,
        count: sql<number>`count(*)`,
      })
      .from(diagnosticShadowDivergences)
      .groupBy(diagnosticShadowDivergences.flowVersion);

    const totalResult = await database
      .select({ count: sql<number>`count(*)` })
      .from(diagnosticShadowDivergences);

    return {
      total: totalResult[0]?.count ?? 0,
      byField,
      byFlowVersion,
      readMode: getDiagnosticReadMode(),
    };
  }),

  /**
   * Executa uma comparação on-demand para um projeto específico (sem persistir).
   * Útil para diagnóstico manual antes de ativar o Shadow Mode.
   */
  compareProject: solarisProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Projeto ${input.projectId} não encontrado`,
        });
      }

      const projectRow: ProjectRowForShadow = {
        id: project.id,
        questionnaireAnswers: project.questionnaireAnswers,
        corporateAnswers: project.corporateAnswers,
        operationalAnswers: project.operationalAnswers,
        briefingContent: (project as Record<string, unknown>).briefingContent as string | null ?? null,
        riskMatricesData: (project as Record<string, unknown>).riskMatricesData ?? null,
        actionPlansData: (project as Record<string, unknown>).actionPlansData ?? null,
        briefingContentV1: (project as Record<string, unknown>).briefingContentV1 as string | null ?? null,
        briefingContentV3: (project as Record<string, unknown>).briefingContentV3 as string | null ?? null,
        riskMatricesDataV1: (project as Record<string, unknown>).riskMatricesDataV1 ?? null,
        riskMatricesDataV3: (project as Record<string, unknown>).riskMatricesDataV3 ?? null,
        actionPlansDataV1: (project as Record<string, unknown>).actionPlansDataV1 ?? null,
        actionPlansDataV3: (project as Record<string, unknown>).actionPlansDataV3 ?? null,
      };

      return compareDiagnosticSources(projectRow);
    }),

  /**
   * Remove registros de divergência mais antigos que N dias.
   * Útil para manter a tabela enxuta durante o período de observação.
   */
  clearOld: solarisProcedure
    .input(z.object({ olderThanDays: z.number().min(1).max(365).default(7) }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados não disponível",
        });
      }
      const cutoff = new Date(Date.now() - input.olderThanDays * 24 * 60 * 60 * 1000);
      const result = await database
        .delete(diagnosticShadowDivergences)
        .where(sql`${diagnosticShadowDivergences.createdAt} < ${cutoff}`);
      return { deleted: (result as { rowsAffected?: number }).rowsAffected ?? 0 };
    }),

  /**
   * Retorna o progresso UAT: lista projetos com prefixo [UAT] e seus metadados.
   * Inclui: etapa atual, nome da etapa, quantidade de retrocessos (via stepHistory),
   * flowVersion, e timestamp da última atividade.
   *
   * Usado pelo dashboard UAT no Shadow Monitor para acompanhar os testes dos advogados.
   */
  getUatProgress: solarisProcedure.query(async () => {
    const database = await getDb();
    if (!database) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Banco de dados não disponível",
      });
    }

    // Busca projetos com prefixo [UAT] no nome
    const uatProjects = await database
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        currentStep: projects.currentStep,
        currentStepName: projects.currentStepName,
        stepHistory: projects.stepHistory,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        clientId: projects.clientId,
        createdById: projects.createdById,
      })
      .from(projects)
      .where(like(projects.name, "[UAT]%"))
      .orderBy(desc(projects.updatedAt));

    // Para cada projeto UAT, calcula métricas de retrocesso a partir do stepHistory
    const uatProgressList = await Promise.all(
      uatProjects.map(async (project) => {
        const history = (project.stepHistory as Array<{
          step: number;
          stepName: string;
          timestamp: string;
          userId?: number;
        }> | null) ?? [];

        // Conta retrocessos: transições onde step diminuiu
        let retrocedeCount = 0;
        for (let i = 1; i < history.length; i++) {
          if (history[i].step < history[i - 1].step) {
            retrocedeCount++;
          }
        }

        // Busca o criador do projeto para exibir nome
        let creatorName: string | null = null;
        try {
          const creator = await db.getUserById(project.createdById);
          creatorName = creator?.name ?? null;
        } catch {
          // silencioso
        }

        return {
          projectId: project.id,
          projectName: project.name,
          status: project.status,
          currentStep: project.currentStep,
          currentStepName: project.currentStepName ?? "desconhecida",
          retrocedeCount,
          stepHistoryLength: history.length,
          lastActivityAt: project.updatedAt,
          createdAt: project.createdAt,
          creatorName,
        };
      })
    );

    // Resumo agregado
    const totalProjects = uatProgressList.length;
    const totalRetrocessos = uatProgressList.reduce((sum, p) => sum + p.retrocedeCount, 0);
    const avgStep = totalProjects > 0
      ? uatProgressList.reduce((sum, p) => sum + p.currentStep, 0) / totalProjects
      : 0;

    return {
      projects: uatProgressList,
      summary: {
        totalProjects,
        totalRetrocessos,
        avgStep: Math.round(avgStep * 10) / 10,
        readMode: getDiagnosticReadMode(),
        generatedAt: new Date().toISOString(),
      },
    };
  }),
});
