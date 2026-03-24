/**
 * B8 — Scoring Engine
 * Calcula o Score CPIE consolidado por projeto com ponderação:
 *   - Gap Score    (40%): média ponderada por criticidade
 *   - Risk Score   (35%): distribuição de níveis de risco normalizada
 *   - Action Score (25%): proporção de ações concluídas × peso por prioridade
 *
 * Score final: 0–100 (100 = zero gaps críticos, zero riscos críticos, todas ações concluídas)
 * Maturidade: Crítico (0–29) | Baixo (30–49) | Médio (50–69) | Alto (70–84) | Excelente (85–100)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import mysql from "mysql2/promise";
import { ENV } from "../_core/env";

// ─── Constantes de ponderação ────────────────────────────────────────────────

const GAP_CRITICALITY_WEIGHT: Record<string, number> = {
  critica: 3.0,
  alta: 2.0,
  media: 1.0,
  baixa: 0.5,
};

const RISK_LEVEL_WEIGHT: Record<string, number> = {
  critico: 4.0,
  alto: 3.0,
  medio: 2.0,
  baixo: 1.0,
};

const ACTION_PRIORITY_WEIGHT: Record<string, number> = {
  imediata: 3.0,
  curto_prazo: 2.0,
  medio_prazo: 1.5,
  planejamento: 1.0,
};

const DIMENSION_WEIGHTS = {
  gap: 0.40,
  risk: 0.35,
  action: 0.25,
} as const;

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface GapDimension {
  totalGaps: number;
  criticalGaps: number;
  highGaps: number;
  avgScore: number;
  weightedPenalty: number;
}

export interface RiskDimension {
  totalRisks: number;
  criticalRisks: number;
  highRisks: number;
  avgRiskScore: number;
  normalizedPenalty: number;
}

export interface ActionDimension {
  totalActions: number;
  completedActions: number;
  pendingImmediate: number;
  completionRate: number;
  weightedCompletionRate: number;
}

export interface CpieScoreBreakdown {
  cpieScore: number;
  maturityLevel: "critico" | "baixo" | "medio" | "alto" | "excelente";
  maturityLabel: string;
  maturityColor: string;
  dimensions: {
    gap: { score: number; weight: number; detail: GapDimension };
    risk: { score: number; weight: number; detail: RiskDimension };
    action: { score: number; weight: number; detail: ActionDimension };
  };
  meta: {
    projectId: number;
    totalGaps: number;
    totalRisks: number;
    totalActions: number;
    calculatedAt: string;
    hasData: boolean;
  };
}

// ─── Funções de cálculo (exportadas para testes) ──────────────────────────────

export function calcGapScore(gaps: Array<{
  criticality: string;
  score: string | number;
}>): { score: number; detail: GapDimension } {
  if (gaps.length === 0) {
    return {
      score: 0,
      detail: { totalGaps: 0, criticalGaps: 0, highGaps: 0, avgScore: 0, weightedPenalty: 0 },
    };
  }

  const criticalGaps = gaps.filter(g => g.criticality === "critica").length;
  const highGaps = gaps.filter(g => g.criticality === "alta").length;
  const avgScore = gaps.reduce((s, g) => s + Number(g.score), 0) / gaps.length;

  let totalWeight = 0;
  let weightedPenalty = 0;
  for (const gap of gaps) {
    const w = GAP_CRITICALITY_WEIGHT[gap.criticality] ?? 1.0;
    const gapScore = Math.min(1, Math.max(0, Number(gap.score)));
    weightedPenalty += (1 - gapScore) * w;
    totalWeight += w;
  }

  const normalizedPenalty = totalWeight > 0 ? weightedPenalty / totalWeight : 0;
  const score = Math.round(Math.max(0, (1 - normalizedPenalty) * 100));

  return {
    score,
    detail: {
      totalGaps: gaps.length,
      criticalGaps,
      highGaps,
      avgScore: Math.round(avgScore * 100),
      weightedPenalty: Math.round(normalizedPenalty * 100),
    },
  };
}

export function calcRiskScore(risks: Array<{
  risk_level: string;
  risk_score: number;
}>): { score: number; detail: RiskDimension } {
  if (risks.length === 0) {
    return {
      score: 0,
      detail: { totalRisks: 0, criticalRisks: 0, highRisks: 0, avgRiskScore: 0, normalizedPenalty: 0 },
    };
  }

  const criticalRisks = risks.filter(r => r.risk_level === "critico").length;
  const highRisks = risks.filter(r => r.risk_level === "alto").length;
  const avgRiskScore = risks.reduce((s, r) => s + Number(r.risk_score), 0) / risks.length;

  // Penalidade: proporção ponderada de riscos pelo nível máximo possível
  let weightedSum = 0;
  let maxPossible = 0;
  for (const risk of risks) {
    const w = RISK_LEVEL_WEIGHT[risk.risk_level] ?? 1.0;
    weightedSum += w;
    maxPossible += RISK_LEVEL_WEIGHT["critico"]; // 4.0
  }

  const normalizedPenalty = maxPossible > 0 ? weightedSum / maxPossible : 0;
  const score = Math.round(Math.max(0, (1 - normalizedPenalty) * 100));

  return {
    score,
    detail: {
      totalRisks: risks.length,
      criticalRisks,
      highRisks,
      avgRiskScore: Math.round(avgRiskScore),
      normalizedPenalty: Math.round(normalizedPenalty * 100),
    },
  };
}

export function calcActionScore(actions: Array<{
  action_priority: string;
  status: string;
}>): { score: number; detail: ActionDimension } {
  if (actions.length === 0) {
    return {
      score: 0,
      detail: { totalActions: 0, completedActions: 0, pendingImmediate: 0, completionRate: 0, weightedCompletionRate: 0 },
    };
  }

  const completedActions = actions.filter(a => a.status === "concluido").length;
  const pendingImmediate = actions.filter(a => a.action_priority === "imediata" && a.status !== "concluido").length;
  const completionRate = completedActions / actions.length;

  let totalWeight = 0;
  let completedWeight = 0;
  for (const action of actions) {
    const w = ACTION_PRIORITY_WEIGHT[action.action_priority] ?? 1.0;
    totalWeight += w;
    if (action.status === "concluido") completedWeight += w;
  }

  const weightedCompletionRate = totalWeight > 0 ? completedWeight / totalWeight : 0;
  const score = Math.round(weightedCompletionRate * 100);

  return {
    score,
    detail: {
      totalActions: actions.length,
      completedActions,
      pendingImmediate,
      completionRate: Math.round(completionRate * 100),
      weightedCompletionRate: Math.round(weightedCompletionRate * 100),
    },
  };
}

export function getMaturityLevel(score: number): {
  level: CpieScoreBreakdown["maturityLevel"];
  label: string;
  color: string;
} {
  if (score >= 85) return { level: "excelente", label: "Excelente", color: "#16a34a" };
  if (score >= 70) return { level: "alto", label: "Alto", color: "#2563eb" };
  if (score >= 50) return { level: "medio", label: "Médio", color: "#d97706" };
  if (score >= 30) return { level: "baixo", label: "Baixo", color: "#dc2626" };
  return { level: "critico", label: "Crítico", color: "#7f1d1d" };
}

/**
 * Calcula o Score CPIE consolidado a partir dos dados brutos.
 * Exportado para uso nos testes (T-B8-01 a T-B8-10).
 */
export function computeCpieScore(
  projectId: number,
  gaps: Array<{ criticality: string; score: string | number }>,
  risks: Array<{ risk_level: string; risk_score: number }>,
  actions: Array<{ action_priority: string; status: string }>
): CpieScoreBreakdown {
  const hasData = gaps.length > 0 || risks.length > 0 || actions.length > 0;

  const gapResult = calcGapScore(gaps);
  const riskResult = calcRiskScore(risks);
  const actionResult = calcActionScore(actions);

  const cpieScore = hasData
    ? Math.round(
        gapResult.score * DIMENSION_WEIGHTS.gap +
        riskResult.score * DIMENSION_WEIGHTS.risk +
        actionResult.score * DIMENSION_WEIGHTS.action
      )
    : 0;

  const maturity = getMaturityLevel(cpieScore);

  return {
    cpieScore,
    maturityLevel: maturity.level,
    maturityLabel: maturity.label,
    maturityColor: maturity.color,
    dimensions: {
      gap: { score: gapResult.score, weight: DIMENSION_WEIGHTS.gap, detail: gapResult.detail },
      risk: { score: riskResult.score, weight: DIMENSION_WEIGHTS.risk, detail: riskResult.detail },
      action: { score: actionResult.score, weight: DIMENSION_WEIGHTS.action, detail: actionResult.detail },
    },
    meta: {
      projectId,
      totalGaps: gaps.length,
      totalRisks: risks.length,
      totalActions: actions.length,
      calculatedAt: new Date().toISOString(),
      hasData,
    },
  };
}

// ─── Helper de conexão ────────────────────────────────────────────────────────

async function getConn() {
  return mysql.createConnection(ENV.databaseUrl);
}

// ─── tRPC Router ──────────────────────────────────────────────────────────────

export const scoringEngineRouter = router({
  /**
   * T-B8-01: Calcula o Score CPIE de um único projeto.
   */
  getScore: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        const clientId = ctx.user.id;

        // Verificar que o projeto pertence ao cliente
        const [projectRows] = await conn.execute(
          "SELECT id, name FROM projects WHERE id = ? AND clientId = ?",
          [input.projectId, clientId]
        ) as [Array<{ id: number; name: string }>, unknown];

        if (projectRows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
        }

        const [gaps] = await conn.execute(
          "SELECT criticality, score FROM project_gaps_v3 WHERE project_id = ? AND client_id = ?",
          [input.projectId, clientId]
        ) as [Array<{ criticality: string; score: string }>, unknown];

        const [risks] = await conn.execute(
          "SELECT risk_level, risk_score FROM project_risks_v3 WHERE project_id = ? AND client_id = ?",
          [input.projectId, clientId]
        ) as [Array<{ risk_level: string; risk_score: number }>, unknown];

        const [actions] = await conn.execute(
          "SELECT action_priority, status FROM project_actions_v3 WHERE project_id = ? AND client_id = ?",
          [input.projectId, clientId]
        ) as [Array<{ action_priority: string; status: string }>, unknown];

        return computeCpieScore(input.projectId, gaps, risks, actions);
      } finally {
        await conn.end();
      }
    }),

  /**
   * T-B8-02: Calcula scores para múltiplos projetos (batch).
   */
  getBatchScores: protectedProcedure
    .input(z.object({
      projectIds: z.array(z.number().int().positive()).min(1).max(100),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        const clientId = ctx.user.id;
        const results: Array<{
          projectId: number;
          cpieScore: number;
          maturityLevel: string;
          maturityLabel: string;
          maturityColor: string;
          hasData: boolean;
        }> = [];

        for (const projectId of input.projectIds) {
          const [gaps] = await conn.execute(
            "SELECT criticality, score FROM project_gaps_v3 WHERE project_id = ? AND client_id = ?",
            [projectId, clientId]
          ) as [Array<{ criticality: string; score: string }>, unknown];

          const [risks] = await conn.execute(
            "SELECT risk_level, risk_score FROM project_risks_v3 WHERE project_id = ? AND client_id = ?",
            [projectId, clientId]
          ) as [Array<{ risk_level: string; risk_score: number }>, unknown];

          const [actions] = await conn.execute(
            "SELECT action_priority, status FROM project_actions_v3 WHERE project_id = ? AND client_id = ?",
            [projectId, clientId]
          ) as [Array<{ action_priority: string; status: string }>, unknown];

          const result = computeCpieScore(projectId, gaps, risks, actions);
          results.push({
            projectId,
            cpieScore: result.cpieScore,
            maturityLevel: result.maturityLevel,
            maturityLabel: result.maturityLabel,
            maturityColor: result.maturityColor,
            hasData: result.meta.hasData,
          });
        }

        return results;
      } finally {
        await conn.end();
      }
    }),

  /**
   * T-B8-03: Ranking de projetos por Score CPIE.
   */
  getRanking: protectedProcedure
    .input(z.object({
      limit: z.number().int().positive().max(50).default(10),
      orderBy: z.enum(["asc", "desc"]).default("asc"),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        const clientId = ctx.user.id;

        const [allProjects] = await conn.execute(
          "SELECT id, name FROM projects WHERE clientId = ? LIMIT 200",
          [clientId]
        ) as [Array<{ id: number; name: string }>, unknown];

        const scores: Array<{
          projectId: number;
          name: string;
          cpieScore: number;
          maturityLevel: string;
          maturityLabel: string;
          maturityColor: string;
          hasData: boolean;
        }> = [];

        for (const project of allProjects) {
          const [gaps] = await conn.execute(
            "SELECT criticality, score FROM project_gaps_v3 WHERE project_id = ? AND client_id = ?",
            [project.id, clientId]
          ) as [Array<{ criticality: string; score: string }>, unknown];

          const [risks] = await conn.execute(
            "SELECT risk_level, risk_score FROM project_risks_v3 WHERE project_id = ? AND client_id = ?",
            [project.id, clientId]
          ) as [Array<{ risk_level: string; risk_score: number }>, unknown];

          const [actions] = await conn.execute(
            "SELECT action_priority, status FROM project_actions_v3 WHERE project_id = ? AND client_id = ?",
            [project.id, clientId]
          ) as [Array<{ action_priority: string; status: string }>, unknown];

          if (gaps.length > 0 || risks.length > 0 || actions.length > 0) {
            const result = computeCpieScore(project.id, gaps, risks, actions);
            scores.push({
              projectId: project.id,
              name: project.name,
              cpieScore: result.cpieScore,
              maturityLevel: result.maturityLevel,
              maturityLabel: result.maturityLabel,
              maturityColor: result.maturityColor,
              hasData: result.meta.hasData,
            });
          }
        }

        scores.sort((a, b) => input.orderBy === "asc" ? a.cpieScore - b.cpieScore : b.cpieScore - a.cpieScore);
        return scores.slice(0, input.limit);
      } finally {
        await conn.end();
      }
    }),

  /**
   * T-B8-09: Histórico de scores CPIE de um projeto.
   */
  getHistory: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      limit: z.number().int().positive().max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        const clientId = ctx.user.id;
        const [rows] = await conn.execute(
          `SELECT cpie_score, gap_score, risk_score, action_score,
                  maturity_level, maturity_label, maturity_color,
                  total_gaps, total_risks, total_actions, calculated_at
           FROM cpie_score_history
           WHERE project_id = ? AND client_id = ?
           ORDER BY calculated_at DESC
           LIMIT ?`,
          [input.projectId, clientId, input.limit]
        ) as [Array<{
          cpie_score: string;
          gap_score: string;
          risk_score: string;
          action_score: string;
          maturity_level: string;
          maturity_label: string;
          maturity_color: string;
          total_gaps: number;
          total_risks: number;
          total_actions: number;
          calculated_at: Date;
        }>, unknown];
        return rows.map(r => ({
          cpieScore: parseFloat(r.cpie_score),
          gapScore: parseFloat(r.gap_score),
          riskScore: parseFloat(r.risk_score),
          actionScore: parseFloat(r.action_score),
          maturityLevel: r.maturity_level,
          maturityLabel: r.maturity_label,
          maturityColor: r.maturity_color,
          totalGaps: r.total_gaps,
          totalRisks: r.total_risks,
          totalActions: r.total_actions,
          calculatedAt: r.calculated_at instanceof Date ? r.calculated_at.toISOString() : String(r.calculated_at),
        }));
      } finally {
        await conn.end();
      }
    }),

  /**
   * T-B8-10: Persiste o score calculado no histórico.
   */
  persistScore: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        const clientId = ctx.user.id;
        const [projectRows] = await conn.execute(
          "SELECT id FROM projects WHERE id = ? AND clientId = ?",
          [input.projectId, clientId]
        ) as [Array<{ id: number }>, unknown];
        if (projectRows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
        }
        const [gaps] = await conn.execute(
          "SELECT criticality, score FROM project_gaps_v3 WHERE project_id = ? AND client_id = ?",
          [input.projectId, clientId]
        ) as [Array<{ criticality: string; score: string }>, unknown];
        const [risks] = await conn.execute(
          "SELECT risk_level, risk_score FROM project_risks_v3 WHERE project_id = ? AND client_id = ?",
          [input.projectId, clientId]
        ) as [Array<{ risk_level: string; risk_score: number }>, unknown];
        const [actions] = await conn.execute(
          "SELECT action_priority, status FROM project_actions_v3 WHERE project_id = ? AND client_id = ?",
          [input.projectId, clientId]
        ) as [Array<{ action_priority: string; status: string }>, unknown];
        const result = computeCpieScore(input.projectId, gaps, risks, actions);
        await conn.execute(
          `INSERT INTO cpie_score_history
            (client_id, project_id, cpie_score, gap_score, risk_score, action_score,
             maturity_level, maturity_label, maturity_color,
             total_gaps, total_risks, total_actions)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            clientId, input.projectId,
            result.cpieScore,
            result.dimensions.gap.score,
            result.dimensions.risk.score,
            result.dimensions.action.score,
            result.maturityLevel,
            result.maturityLabel,
            result.maturityColor,
            result.dimensions.gap.detail.totalGaps,
            result.dimensions.risk.detail.totalRisks,
            result.dimensions.action.detail.totalActions,
          ]
        );
        return { success: true, cpieScore: result.cpieScore, maturityLabel: result.maturityLabel };
      } finally {
        await conn.end();
      }
    }),

  /**
   * getLowScoreProjects — retorna projetos com Score CPIE < threshold (default 50)
   * Usado pelo alerta do Painel para exibir projetos com baixa maturidade CPIE.
   * Calcula o score on-the-fly para os projetos que têm dados v3.
   */
  getLowScoreProjects: protectedProcedure
    .input(z.object({
      threshold: z.number().min(0).max(100).default(50),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        const clientId = ctx.user.id;
        // Busca projetos que têm dados v3 (gaps, riscos ou ações)
        const [projectsWithData] = await conn.execute(
          `SELECT DISTINCT p.id, p.name
           FROM projects p
           WHERE p.clientId = ?
             AND (
               EXISTS (SELECT 1 FROM project_gaps_v3 g WHERE g.project_id = p.id AND g.client_id = ?)
               OR EXISTS (SELECT 1 FROM project_risks_v3 r WHERE r.project_id = p.id AND r.client_id = ?)
               OR EXISTS (SELECT 1 FROM project_actions_v3 a WHERE a.project_id = p.id AND a.client_id = ?)
             )
           ORDER BY p.updatedAt DESC
           LIMIT 200`,
          [clientId, clientId, clientId, clientId]
        ) as [Array<{ id: number; name: string }>, unknown];

        const lowScoreResults: Array<{
          projectId: number;
          projectName: string;
          cpieScore: number;
          maturityLevel: string;
          maturityLabel: string;
          maturityColor: string;
        }> = [];

        for (const project of projectsWithData) {
          const [gaps] = await conn.execute(
            "SELECT criticality, score FROM project_gaps_v3 WHERE project_id = ? AND client_id = ?",
            [project.id, clientId]
          ) as [Array<{ criticality: string; score: string }>, unknown];
          const [risks] = await conn.execute(
            "SELECT risk_level, risk_score FROM project_risks_v3 WHERE project_id = ? AND client_id = ?",
            [project.id, clientId]
          ) as [Array<{ risk_level: string; risk_score: number }>, unknown];
          const [actions] = await conn.execute(
            "SELECT action_priority, status FROM project_actions_v3 WHERE project_id = ? AND client_id = ?",
            [project.id, clientId]
          ) as [Array<{ action_priority: string; status: string }>, unknown];

          const result = computeCpieScore(project.id, gaps, risks, actions);
          if (result.meta.hasData && result.cpieScore < input.threshold) {
            lowScoreResults.push({
              projectId: project.id,
              projectName: project.name,
              cpieScore: result.cpieScore,
              maturityLevel: result.maturityLevel,
              maturityLabel: result.maturityLabel,
              maturityColor: result.maturityColor,
            });
          }
          if (lowScoreResults.length >= input.limit) break;
        }

        // Ordena por score crescente (pior primeiro)
        lowScoreResults.sort((a, b) => a.cpieScore - b.cpieScore);

        return {
          projects: lowScoreResults,
          total: lowScoreResults.length,
          threshold: input.threshold,
        };
      } finally {
        await conn.end();
      }
    }),
});
