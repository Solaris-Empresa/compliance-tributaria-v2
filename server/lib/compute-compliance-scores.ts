// compute-compliance-scores.ts — Sprint Z-22 CPIE v3 (#725)
// Orquestra calculateComplianceScore (v4) + computeExecutionScore.
// Zero escrita, zero LLM. Reutiliza compliance-score-v4.ts sem modifica-lo.

import {
  calculateComplianceScore,
  type ComplianceRiskScoreInput,
} from "./compliance-score-v4";
import {
  computeExecutionScore,
  type ExecutionPlanInput,
  type ExecutionTaskInput,
  type ExecutionScoreResult,
} from "./compute-execution-score";

export interface ComputeComplianceScoresInput {
  risks: ComplianceRiskScoreInput[];
  plans: ExecutionPlanInput[];
  tasks: ExecutionTaskInput[];
}

export type ComplianceBlock =
  | {
      score: number;
      nivel: "critico" | "alto" | "medio" | "baixo";
      total_riscos_aprovados: number;
      total_alta: number;
      total_media: number;
      total_oportunidade: number;
    }
  | {
      score: 0;
      nivel: "baixo";
      state: "no_approved_risks";
    };

export interface ComputeComplianceScoresOutput {
  formula_version: "v3.0";
  computed_at: string;
  compliance: ComplianceBlock;
  execution: ExecutionScoreResult;
}

export function computeComplianceScores(
  input: ComputeComplianceScoresInput
): ComputeComplianceScoresOutput {
  const approved = input.risks.filter((r) => r.approved_at !== null);
  const scorable = approved.filter((r) => r.type !== "opportunity");
  const opportunities = approved.filter((r) => r.type === "opportunity");

  let compliance: ComplianceBlock;
  if (scorable.length === 0) {
    compliance = { score: 0, nivel: "baixo", state: "no_approved_risks" };
  } else {
    const v4 = calculateComplianceScore(input.risks);
    compliance = {
      score: v4.score,
      nivel: v4.nivel,
      total_riscos_aprovados: v4.total_riscos_aprovados,
      total_alta: v4.total_alta,
      total_media: v4.total_media,
      total_oportunidade: opportunities.length,
    };
  }

  const execution = computeExecutionScore(input.plans, input.tasks);

  return {
    formula_version: "v3.0",
    computed_at: new Date().toISOString(),
    compliance,
    execution,
  };
}
