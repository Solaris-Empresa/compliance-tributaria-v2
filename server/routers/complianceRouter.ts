// complianceRouter.ts — Sprint Z-22 CPIE v3 (#725)
// Router tRPC read-only para Dashboard de Compliance on-demand.
// Zero escrita, zero LLM, zero scheduler. Reutiliza risks_v4 / action_plans / tasks.

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { computeComplianceScores } from "../lib/compute-compliance-scores";
import {
  getRisksV4ByProject,
  getActionPlansByProject,
  getTasksByActionPlan,
} from "../lib/db-queries-risks-v4";

export const complianceRouter = router({
  /**
   * computeScores — calcula 3 scores on-demand a partir do estado atual do projeto.
   * Read-only: nao persiste, nao chama LLM, nao agenda.
   * Fonte de verdade: calculateComplianceScore (compliance-score-v4.ts).
   */
  computeScores: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const [risks, plans] = await Promise.all([
        getRisksV4ByProject(input.projectId),
        getActionPlansByProject(input.projectId),
      ]);

      const tasksNested = await Promise.all(
        plans.map((p) => getTasksByActionPlan(p.id))
      );
      const tasks = tasksNested.flat();

      return computeComplianceScores({
        risks: risks.map((r) => ({
          severidade: r.severidade,
          confidence: r.confidence ?? 1.0,
          type: r.type,
          approved_at: r.approved_at,
        })),
        plans: plans.map((p) => ({ status: p.status })),
        tasks: tasks.map((t) => ({ status: t.status })),
      });
    }),
});
