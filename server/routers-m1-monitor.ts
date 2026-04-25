/**
 * routers-m1-monitor.ts — Router de Monitoramento do Runner v3 (M1)
 *
 * Responsabilidades:
 *   1. Receber e persistir logs do runner v3 por project_id
 *   2. Expor métricas agregadas: % PASS/FAIL, V-LC-*, V-10-FALLBACK
 *   3. Expor status da feature flag M1_ARCHETYPE_ENABLED por contexto
 *   4. Detectar divergência entre arquétipo e risco gerado (fase 2)
 *
 * Governança:
 *   - Apenas equipe_solaris e advogado_senior podem gravar logs
 *   - Apenas equipe_solaris pode consultar métricas globais
 *   - Clientes podem consultar apenas seus próprios projetos
 *
 * Ref: feat/m1-archetype-runner-v3 · SPEC-RUNNER-RODADA-D.md
 */
import { z } from "zod";
import { desc, eq, sql, gte, and } from "drizzle-orm";
import { getDb } from "./db";
import { m1RunnerLogs } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { isM1ArchetypeEnabled } from "./config/feature-flags";
import { buildSnapshot } from "./lib/archetype/buildSnapshot";
import type { Seed, Blocker } from "./lib/archetype/types";

// ─── Schema de entrada do log ─────────────────────────────────────────────
const BlockerSchema = z.object({
  id: z.string(),
  severity: z.string(),
  rule: z.string().optional(),
});

const M1RunnerLogInputSchema = z.object({
  projectId: z.number().int().positive(),
  statusArquetipo: z.enum([
    "confirmado",
    "inconsistente",
    "bloqueado_terminal",
    "pendente",
  ]),
  testStatus: z.enum(["PASS", "FAIL", "BLOCKED"]),
  fallbackCount: z.number().int().min(0),
  hardBlockCount: z.number().int().min(0),
  lcConflictCount: z.number().int().min(0),
  missingFieldCount: z.number().int().min(0),
  blockersJson: z.array(BlockerSchema).default([]),
  missingFieldsJson: z.array(z.string()).default([]),
  scoreConfianca: z.number().int().min(0).max(100).optional(),
  dataVersion: z.string(),
  perfilHash: z.string().optional(),
  rulesHash: z.string().optional(),
  durationMs: z.number().int().min(0).optional(),
});

// ─── Seed schema para execução do runner via tRPC ─────────────────────────
const SeedSchema = z.object({
  nome_empresa: z.string().optional(),
  cnpj: z.string().optional(),
  ncms_principais: z.array(z.string()).optional(),
  nbss_principais: z.array(z.string()).optional(),
  papel_na_cadeia_input: z.string().optional(),
  tipo_de_relacao_input: z.string().optional(),
  territorio_input: z.string().optional(),
  regime_tributario_input: z.string().optional(),
  cnae_principal_confirmado: z.string().optional(),
}).passthrough();

// ─── Helpers ──────────────────────────────────────────────────────────────
const INTERNAL_ROLES = ["equipe_solaris", "advogado_senior"] as const;
type InternalRole = typeof INTERNAL_ROLES[number];

function isInternalUser(role: string): role is InternalRole {
  return INTERNAL_ROLES.includes(role as InternalRole);
}

function calcularScore(
  blockers: ReadonlyArray<{ id: string; severity: string }>,
  missingFields: string[],
): number {
  const TOTAL_CAMPOS = 6;
  const completude = Math.floor(
    ((TOTAL_CAMPOS - missingFields.length) / TOTAL_CAMPOS) * 100,
  );
  const coerencia =
    blockers.filter((b) => b.id.startsWith("V-LC-")).length === 0 ? 100 : 0;
  const inferenciaValidada =
    blockers.filter((b) => b.id === "V-10-FALLBACK").length === 0 ? 100 : 0;
  return Math.floor(
    completude * 0.4 + inferenciaValidada * 0.3 + coerencia * 0.3,
  );
}

// ─── Router ───────────────────────────────────────────────────────────────
export const m1MonitorRouter = router({
  /**
   * Verifica se o Runner v3 está habilitado para o usuário/projeto atual.
   * Usado pelo frontend para decidir se exibe o Painel de Confiança.
   */
  isEnabled: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive().optional() }))
    .query(({ ctx, input }) => {
      const enabled = isM1ArchetypeEnabled(ctx.user.role, input.projectId);
      return {
        enabled,
        reason: enabled
          ? isInternalUser(ctx.user.role)
            ? "internal_user"
            : input.projectId !== undefined
              ? "allowed_project"
              : "global_flag"
          : "disabled",
        userRole: ctx.user.role,
        projectId: input.projectId ?? null,
      };
    }),

  /**
   * Executa o Runner v3 para uma seed e persiste o log.
   * Apenas usuários internos (equipe_solaris, advogado_senior) podem executar.
   */
  runAndLog: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        seed: SeedSchema,
        dataVersion: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Gate: apenas usuários internos ou projetos permitidos
      if (!isM1ArchetypeEnabled(ctx.user.role, input.projectId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "M1_ARCHETYPE_ENABLED=false para este usuário/projeto. Aguarda aprovação P.O.",
        });
      }

      const startMs = Date.now();
      const dataVersion =
        input.dataVersion ?? new Date().toISOString();

      // Normalizar seed: arrays opcionais do formulário devem ser [] quando undefined
      // Fix: buildPerfilEntidade usa for...of em ncms_principais/nbss_principais —
      // se undefined, lança "seed.ncms_principais is not iterable"
      const normalizedSeed: Seed = {
        // Campos com defaults seguros para o formulário M1
        natureza_operacao_principal: (input.seed as Record<string, unknown>).natureza_operacao_principal as readonly string[] ?? [],
        operacoes_secundarias: (input.seed as Record<string, unknown>).operacoes_secundarias as readonly string[] ?? [],
        fontes_receita: (input.seed as Record<string, unknown>).fontes_receita as readonly string[] ?? [],
        tipo_objeto_economico: (input.seed as Record<string, unknown>).tipo_objeto_economico as readonly string[] ?? [],
        posicao_na_cadeia_economica: (input.seed as Record<string, unknown>).posicao_na_cadeia_economica as string ?? "",
        ncms_principais: (input.seed as Record<string, unknown>).ncms_principais as readonly string[] ?? [],
        nbss_principais: (input.seed as Record<string, unknown>).nbss_principais as readonly string[] ?? [],
        abrangencia_operacional: (input.seed as Record<string, unknown>).abrangencia_operacional as readonly string[] ?? [],
        opera_multiplos_estados: (input.seed as Record<string, unknown>).opera_multiplos_estados as boolean ?? false,
        atua_importacao: (input.seed as Record<string, unknown>).atua_importacao as boolean ?? false,
        atua_exportacao: (input.seed as Record<string, unknown>).atua_exportacao as boolean ?? false,
        papel_comercio_exterior: (input.seed as Record<string, unknown>).papel_comercio_exterior as readonly string[] ?? [],
        opera_territorio_incentivado: (input.seed as Record<string, unknown>).opera_territorio_incentivado as boolean ?? false,
        tipo_territorio_incentivado: (input.seed as Record<string, unknown>).tipo_territorio_incentivado as readonly string[] ?? [],
        regime_tributario_atual: (input.seed as Record<string, unknown>).regime_tributario_atual as string ?? (input.seed as Record<string, unknown>).regime_tributario_input as string ?? "regime_geral",
        possui_regime_especial_negocio: (input.seed as Record<string, unknown>).possui_regime_especial_negocio as boolean ?? false,
        tipo_regime_especial: (input.seed as Record<string, unknown>).tipo_regime_especial as readonly string[] ?? [],
        setor_regulado: (input.seed as Record<string, unknown>).setor_regulado as boolean ?? false,
        orgao_regulador_principal: (input.seed as Record<string, unknown>).orgao_regulador_principal as readonly string[] ?? [],
        subnatureza_setorial: (input.seed as Record<string, unknown>).subnatureza_setorial as readonly string[] ?? [],
        tipo_operacao_especifica: (input.seed as Record<string, unknown>).tipo_operacao_especifica as readonly string[] ?? [],
        papel_operacional_especifico: (input.seed as Record<string, unknown>).papel_operacional_especifico as readonly string[] ?? [],
        integra_grupo_economico: (input.seed as Record<string, unknown>).integra_grupo_economico as boolean ?? false,
        analise_1_cnpj_operacional: (input.seed as Record<string, unknown>).analise_1_cnpj_operacional as boolean ?? true,
        user_confirmed: (input.seed as Record<string, unknown>).user_confirmed as boolean ?? false,
        // Campos opcionais passados diretamente
        cnae_principal_confirmado: (input.seed as Record<string, unknown>).cnae_principal_confirmado as string | undefined,
        descricao_negocio_livre: (input.seed as Record<string, unknown>).descricao_negocio_livre as string | undefined,
        uf_principal_operacao: (input.seed as Record<string, unknown>).uf_principal_operacao as string | undefined,
        possui_filial_outra_uf: (input.seed as Record<string, unknown>).possui_filial_outra_uf as boolean | undefined,
        estrutura_operacao: (input.seed as Record<string, unknown>).estrutura_operacao as string | undefined,
        porte_empresa: (input.seed as Record<string, unknown>).porte_empresa as string | undefined,
        atua_como_marketplace_plataforma: (input.seed as Record<string, unknown>).atua_como_marketplace_plataforma as boolean | undefined,
        nivel_analise: (input.seed as Record<string, unknown>).nivel_analise as string | undefined,
        realiza_operacao_propria_terceiros: (input.seed as Record<string, unknown>).realiza_operacao_propria_terceiros as string | undefined,
      };

      // Executar runner v3
      const snapshot = buildSnapshot(normalizedSeed, dataVersion);
      const durationMs = Date.now() - startMs;

      const fallbackCount = snapshot.blockers_triggered.filter(
        (b: Blocker) => b.id === "V-10-FALLBACK",
      ).length;
      const hardBlockCount = snapshot.blockers_triggered.filter(
        (b: Blocker) => b.severity === "HARD_BLOCK",
      ).length;
      const lcConflictCount = snapshot.blockers_triggered.filter(
        (b: Blocker) => b.id.startsWith("V-LC-"),
      ).length;
      const missingFieldCount = snapshot.missing_required_fields.length;
      const scoreConfianca = calcularScore(
        snapshot.blockers_triggered,
        [...snapshot.missing_required_fields],
      );

      // Persistir log
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.insert(m1RunnerLogs).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        userRole: ctx.user.role,
        statusArquetipo: snapshot.perfil.status_arquetipo as string,
        testStatus: snapshot.test_status as string,
        fallbackCount,
        hardBlockCount,
        lcConflictCount,
        missingFieldCount,
        blockersJson: snapshot.blockers_triggered.map((b: Blocker) => ({
          id: b.id,
          severity: b.severity as string,
          rule: b.rule,
        })),
        missingFieldsJson: [...snapshot.missing_required_fields],
        scoreConfianca,
        dataVersion,
        perfilHash: snapshot.perfil.perfil_hash,
        rulesHash: snapshot.perfil.rules_hash,
        durationMs,
      });

      return {
        status_arquetipo: snapshot.perfil.status_arquetipo,
        test_status: snapshot.test_status,
        fallback_count: fallbackCount,
        hard_block_count: hardBlockCount,
        lc_conflict_count: lcConflictCount,
        missing_field_count: missingFieldCount,
        score_confianca: scoreConfianca,
        blockers_triggered: snapshot.blockers_triggered,
        missing_required_fields: snapshot.missing_required_fields,
        perfil_hash: snapshot.perfil.status_arquetipo,
        duration_ms: durationMs,
        logged: true,
      };
    }),

  /**
   * Persiste log de execução do runner (quando runner roda no cliente/outro contexto).
   * Apenas usuários internos podem gravar logs.
   */
  persistLog: protectedProcedure
    .input(M1RunnerLogInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!isInternalUser(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas equipe_solaris e advogado_senior podem persistir logs M1.",
        });
      }

      const scoreConfianca =
        input.scoreConfianca ??
        calcularScore(input.blockersJson, input.missingFieldsJson);

      const dbPersist = await getDb();
      if (!dbPersist) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await dbPersist.insert(m1RunnerLogs).values({
        ...input,
        userId: ctx.user.id,
        userRole: ctx.user.role,
        scoreConfianca,
      });

      return { persisted: true, scoreConfianca };
    }),

  /**
   * Retorna logs do runner para um projeto específico.
   * Clientes: apenas seus projetos. Internos: qualquer projeto.
   */
  getProjectLogs: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        limit: z.number().int().min(1).max(100).default(50),
        since: z.string().datetime().optional(), // ISO-8601 UTC
      }),
    )
    .query(async ({ ctx, input }) => {
      // Clientes só podem ver seus próprios projetos
      if (!isInternalUser(ctx.user.role)) {
        // Verificar se o usuário tem acesso ao projeto (via db.query)
        // Por simplicidade, apenas internos têm acesso nesta fase
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Logs M1 disponíveis apenas para equipe interna nesta fase.",
        });
      }

      const conditions = [eq(m1RunnerLogs.projectId, input.projectId)];
      if (input.since) {
        conditions.push(gte(m1RunnerLogs.createdAt, new Date(input.since)));
      }

      const dbLogs = await getDb();
      if (!dbLogs) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const logs = await dbLogs
        .select()
        .from(m1RunnerLogs)
        .where(and(...conditions))
        .orderBy(desc(m1RunnerLogs.createdAt))
        .limit(input.limit);

      return { logs, total: logs.length };
    }),

  /**
   * Métricas agregadas globais do Runner v3.
   * Apenas equipe_solaris pode consultar.
   *
   * Retorna:
   *   - % PASS / FAIL / BLOCKED
   *   - ocorrências de V-LC-* (conflitos lógicos)
   *   - ocorrências de V-10-FALLBACK
   *   - score médio de confiança
   */
  getMetrics: protectedProcedure
    .input(
      z.object({
        since: z.string().datetime().optional(), // ISO-8601 UTC (default: últimas 24h)
        projectId: z.number().int().positive().optional(), // filtrar por projeto
      }),
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "equipe_solaris") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Métricas globais M1 disponíveis apenas para equipe_solaris.",
        });
      }

      const sinceDate = input.since
        ? new Date(input.since)
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // últimas 24h

      const dbMetrics = await getDb();
      if (!dbMetrics) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const conditions = input.projectId !== undefined
        ? and(gte(m1RunnerLogs.createdAt, sinceDate), eq(m1RunnerLogs.projectId, input.projectId))
        : gte(m1RunnerLogs.createdAt, sinceDate);

      // Agregação por test_status
      const statusCounts = await dbMetrics
        .select({
          testStatus: m1RunnerLogs.testStatus,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(m1RunnerLogs)
        .where(conditions)
        .groupBy(m1RunnerLogs.testStatus);

      // Agregação por status_arquetipo
      const arquetipoCounts = await dbMetrics
        .select({
          statusArquetipo: m1RunnerLogs.statusArquetipo,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(m1RunnerLogs)
        .where(conditions)
        .groupBy(m1RunnerLogs.statusArquetipo);

      // Métricas de fallback e conflitos
      const aggregates = await dbMetrics
        .select({
          totalLogs: sql<number>`count(*)`.mapWith(Number),
          totalFallbacks: sql<number>`sum(fallback_count)`.mapWith(Number),
          totalHardBlocks: sql<number>`sum(hard_block_count)`.mapWith(Number),
          totalLcConflicts: sql<number>`sum(lc_conflict_count)`.mapWith(Number),
          avgScore: sql<number>`avg(score_confianca)`.mapWith(Number),
          avgDurationMs: sql<number>`avg(duration_ms)`.mapWith(Number),
          logsWithFallback: sql<number>`sum(case when fallback_count > 0 then 1 else 0 end)`.mapWith(Number),
          logsWithConflict: sql<number>`sum(case when lc_conflict_count > 0 then 1 else 0 end)`.mapWith(Number),
        })
        .from(m1RunnerLogs)
        .where(conditions);

      const total = aggregates[0]?.totalLogs ?? 0;
      const passCount =
        statusCounts.find((s) => s.testStatus === "PASS")?.count ?? 0;
      const failCount =
        statusCounts.find((s) => s.testStatus === "FAIL")?.count ?? 0;
      const blockedCount =
        statusCounts.find((s) => s.testStatus === "BLOCKED")?.count ?? 0;

      return {
        period: {
          since: sinceDate.toISOString(),
          projectId: input.projectId ?? null,
        },
        summary: {
          total_logs: total,
          pass_count: passCount,
          fail_count: failCount,
          blocked_count: blockedCount,
          pass_pct: total > 0 ? Math.round((passCount / total) * 100) : 0,
          fail_pct: total > 0 ? Math.round((failCount / total) * 100) : 0,
          blocked_pct: total > 0 ? Math.round((blockedCount / total) * 100) : 0,
        },
        blockers: {
          total_fallbacks: aggregates[0]?.totalFallbacks ?? 0,
          total_hard_blocks: aggregates[0]?.totalHardBlocks ?? 0,
          total_lc_conflicts: aggregates[0]?.totalLcConflicts ?? 0,
          logs_with_fallback: aggregates[0]?.logsWithFallback ?? 0,
          logs_with_conflict: aggregates[0]?.logsWithConflict ?? 0,
          fallback_rate_pct:
            total > 0
              ? Math.round(
                  ((aggregates[0]?.logsWithFallback ?? 0) / total) * 100,
                )
              : 0,
        },
        confidence: {
          avg_score: Math.round(aggregates[0]?.avgScore ?? 0),
          avg_duration_ms: Math.round(aggregates[0]?.avgDurationMs ?? 0),
        },
        by_status_arquetipo: arquetipoCounts.reduce(
          (acc: Record<string, number>, row: { statusArquetipo: string; count: number }) => {
            acc[row.statusArquetipo] = row.count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      };
    }),

  /**
   * Retorna os últimos N logs globais (para dashboard de monitoramento).
   * Apenas equipe_solaris.
   */
  getRecentLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(200).default(50),
        since: z.string().datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "equipe_solaris") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Logs recentes M1 disponíveis apenas para equipe_solaris.",
        });
      }

      const recentCondition = input.since
        ? gte(m1RunnerLogs.createdAt, new Date(input.since))
        : undefined;

      const dbRecent = await getDb();
      if (!dbRecent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const logs = await dbRecent
        .select()
        .from(m1RunnerLogs)
        .where(recentCondition)
        .orderBy(desc(m1RunnerLogs.createdAt))
        .limit(input.limit);

      return { logs, total: logs.length };
    }),
});
