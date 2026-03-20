/**
 * Gap Engine — TASK 4
 * Motor de diagnóstico de compliance.
 * Fórmula: score = (compliant + 0.5 * parcial) / total_aplicavel * 100
 */

export type AnswerValue = "sim" | "nao" | "parcial" | "nao_aplicavel";
export type GapStatus = "compliant" | "nao_compliant" | "parcial" | "nao_aplicavel";
export type GapSeverity = "critica" | "alta" | "media" | "baixa";
export type RiskLevel = "baixo" | "medio" | "alto" | "critico";

export interface GapResult {
  canonicalId: string;
  mappingId: string;
  gapStatus: GapStatus;
  gapSeverity?: GapSeverity;
  gapType?: string;
  answerValue: AnswerValue;
  answerNote?: string;
  recommendation?: string;
}

export interface ComplianceScore {
  complianceScore: number;
  riskLevel: RiskLevel;
  totalApplicable: number;
  totalNotApplicable: number;
  totalCompliant: number;
  totalNonCompliant: number;
  totalPartial: number;
  breakdown: {
    compliant: number;
    nao_compliant: number;
    parcial: number;
    nao_aplicavel: number;
  };
}

export function classifyGap(
  canonicalId: string,
  mappingId: string,
  answerValue: AnswerValue,
  answerNote?: string
): GapResult {
  let gapStatus: GapStatus;
  let gapSeverity: GapSeverity | undefined;
  let gapType: string | undefined;
  let recommendation: string | undefined;

  switch (answerValue) {
    case "sim":
      gapStatus = "compliant";
      break;
    case "nao":
      gapStatus = "nao_compliant";
      gapSeverity = "alta";
      gapType = "ausencia_controle";
      recommendation = "Implementar controle normativo conforme requisito canônico.";
      break;
    case "parcial":
      gapStatus = "parcial";
      gapSeverity = "media";
      gapType = "implementacao_parcial";
      recommendation = "Completar a implementação do controle normativo.";
      break;
    case "nao_aplicavel":
      gapStatus = "nao_aplicavel";
      break;
  }

  return { canonicalId, mappingId, gapStatus, gapSeverity, gapType, answerValue, answerNote, recommendation };
}

export function calculateComplianceScore(gaps: GapResult[]): ComplianceScore {
  const breakdown = { compliant: 0, nao_compliant: 0, parcial: 0, nao_aplicavel: 0 };

  for (const gap of gaps) {
    breakdown[gap.gapStatus]++;
  }

  const totalApplicable = breakdown.compliant + breakdown.nao_compliant + breakdown.parcial;
  const totalNotApplicable = breakdown.nao_aplicavel;

  let complianceScore = 0;
  if (totalApplicable > 0) {
    const weighted = breakdown.compliant + 0.5 * breakdown.parcial;
    complianceScore = Math.round((weighted / totalApplicable) * 100);
  }

  complianceScore = Math.max(0, Math.min(100, complianceScore));

  let riskLevel: RiskLevel;
  if (complianceScore >= 80) riskLevel = "baixo";
  else if (complianceScore >= 60) riskLevel = "medio";
  else if (complianceScore >= 40) riskLevel = "alto";
  else riskLevel = "critico";

  return {
    complianceScore, riskLevel, totalApplicable, totalNotApplicable,
    totalCompliant: breakdown.compliant, totalNonCompliant: breakdown.nao_compliant,
    totalPartial: breakdown.parcial, breakdown,
  };
}

export function prioritizeGaps(gaps: GapResult[]) {
  const result = { critica: [] as GapResult[], alta: [] as GapResult[], media: [] as GapResult[], baixa: [] as GapResult[], nao_aplicavel: [] as GapResult[] };
  for (const gap of gaps) {
    if (gap.gapStatus === "nao_aplicavel") result.nao_aplicavel.push(gap);
    else if (gap.gapStatus !== "compliant") {
      const sev = gap.gapSeverity ?? "baixa";
      result[sev].push(gap);
    }
  }
  return result;
}

export interface GapAnalysisResult {
  gaps: GapResult[];
  score: ComplianceScore;
  priorityGaps: ReturnType<typeof prioritizeGaps>;
  criticalGaps: number;
  totalGaps: number;
}

export function runGapAnalysis(
  answers: Array<{ canonicalId: string; mappingId: string; answerValue: AnswerValue; answerNote?: string; }>
): GapAnalysisResult {
  const gaps = answers.map((a) => classifyGap(a.canonicalId, a.mappingId, a.answerValue, a.answerNote));
  const score = calculateComplianceScore(gaps);
  const priorityGaps = prioritizeGaps(gaps);
  const criticalGaps = priorityGaps.critica.length;
  const totalGaps = priorityGaps.critica.length + priorityGaps.alta.length + priorityGaps.media.length + priorityGaps.baixa.length;
  return { gaps, score, priorityGaps, criticalGaps, totalGaps };
}
