// compute-execution-score.ts — Sprint Z-22 CPIE v3 (#725)
// Função pura: percentual de execução do plano (tasks done / total).
// Zero DB, zero LLM, zero escrita. Determinística.

export interface ExecutionPlanInput {
  status: string;
}

export interface ExecutionTaskInput {
  status: string;
}

export type ExecutionScoreResult =
  | {
      percent: number;
      plans: { approved: number; total: number };
      tasks: { done: number; total: number };
    }
  | { state: "no_plans_yet" };

export function computeExecutionScore(
  plans: ExecutionPlanInput[],
  tasks: ExecutionTaskInput[]
): ExecutionScoreResult {
  if (plans.length === 0 && tasks.length === 0) {
    return { state: "no_plans_yet" };
  }

  const approvedPlans = plans.filter((p) => p.status === "aprovado").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  const percent =
    tasks.length === 0 ? 0 : Math.round((doneTasks / tasks.length) * 100);

  return {
    percent,
    plans: { approved: approvedPlans, total: plans.length },
    tasks: { done: doneTasks, total: tasks.length },
  };
}
