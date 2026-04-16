// compliance-score-v4.ts — Score determinístico de compliance (Sprint Z-16 #622)
// RN-CV4-01..07 + RN-CV4-10 + RN-CV4-14
// Função pura: mesma entrada → mesma saída. NUNCA usa LLM.

// ─── Constantes determinísticas ─────────────────────────────────────────────

export const SEVERIDADE_SCORE_MAP: Record<string, number> = {
  alta: 7,
  media: 5,
  oportunidade: 1,
};

export const CONFIDENCE_FLOOR = 0.5;
export const MAX_PESO = 9;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComplianceRiskScoreInput {
  severidade: string;
  confidence: number;
  type: "risk" | "opportunity";
  approved_at: Date | null;
}

export interface ComplianceScoreResult {
  score: number;
  nivel: "critico" | "alto" | "medio" | "baixo";
  total_riscos_aprovados: number;
  total_alta: number;
  total_media: number;
  formula_version: "v4.0";
}

export interface ScoringDataSnapshot {
  score: number;
  nivel: string;
  total_riscos_aprovados: number;
  total_alta: number;
  total_media: number;
  formula_version: string;
  calculated_at: string;
}

// ─── Nível determinístico (RN-CV4-14) ───────────────────────────────────────

function classifyNivel(score: number): "critico" | "alto" | "medio" | "baixo" {
  if (score >= 75) return "critico";
  if (score >= 50) return "alto";
  if (score >= 25) return "medio";
  return "baixo";
}

// ─── Fórmula principal ──────────────────────────────────────────────────────

export function calculateComplianceScore(
  risks: ComplianceRiskScoreInput[]
): ComplianceScoreResult {
  // RN-CV4-01: apenas riscos aprovados
  const approved = risks.filter((r) => r.approved_at !== null);

  // RN-CV4-02: oportunidades fora do denominador
  const scorable = approved.filter((r) => r.type !== "opportunity");

  if (scorable.length === 0) {
    return {
      score: 0,
      nivel: "baixo",
      total_riscos_aprovados: approved.length,
      total_alta: 0,
      total_media: 0,
      formula_version: "v4.0",
    };
  }

  // RN-CV4-04: confidence mínima 0.5
  const weightedSum = scorable.reduce((acc, r) => {
    const peso = SEVERIDADE_SCORE_MAP[r.severidade] ?? 0;
    const conf = Math.max(r.confidence ?? 0, CONFIDENCE_FLOOR);
    return acc + peso * conf;
  }, 0);

  // Fórmula: round(sum(peso × max(conf, 0.5)) / (n × 9) × 100)
  const score = Math.round((weightedSum / (scorable.length * MAX_PESO)) * 100);

  const total_alta = scorable.filter((r) => r.severidade === "alta").length;
  const total_media = scorable.filter((r) => r.severidade === "media").length;

  return {
    score,
    nivel: classifyNivel(score),
    total_riscos_aprovados: approved.length,
    total_alta,
    total_media,
    formula_version: "v4.0",
  };
}
