/**
 * calculate-briefing-confidence.ts — fix #771 UAT 2026-04-20
 *
 * Função determinística server-side que calcula o nível de confiança do briefing
 * a partir da soma de respostas das fontes disponíveis.
 *
 * Motivação: o LLM estava retornando 85% mesmo quando "Ausência total de respostas
 * ao questionário" aparecia como limitação — contradição óbvia e recorrente na UAT.
 * A classificação passa a ser função pura das contagens, igual ao pattern usado em
 * `classifyInconsistenciaImpacto`.
 *
 * Regras (faixas fixas):
 *   Total == 0                          → 30 (baixa)
 *   Total < 5                           → 55 (baixa)
 *   Total 5-14                          → 70 (média)
 *   Total 15-29                         → 80 (média-alta)
 *   Total >= 30 e NCM/NBS cadastrados   → 90 (alta)
 *   Total >= 30 sem NCM/NBS             → 85 (alta)
 */

export interface BriefingConfidenceSignals {
  solarisAnswersCount: number;   // Onda 1
  iagenAnswersCount: number;     // Onda 2
  productAnswersCount: number;   // Q.Produtos (NCM)
  serviceAnswersCount: number;   // Q.Serviços (NBS)
  cnaeAnswersCount: number;      // QCNAE especializado
  ncmCodesCount: number;         // operationProfile.principaisProdutos
  nbsCodesCount: number;         // operationProfile.principaisServicos
}

export function calculateBriefingConfidence(
  signals: BriefingConfidenceSignals
): number {
  const total =
    Math.max(0, signals.solarisAnswersCount) +
    Math.max(0, signals.iagenAnswersCount) +
    Math.max(0, signals.productAnswersCount) +
    Math.max(0, signals.serviceAnswersCount) +
    Math.max(0, signals.cnaeAnswersCount);

  const hasCodes =
    Math.max(0, signals.ncmCodesCount) + Math.max(0, signals.nbsCodesCount) > 0;

  if (total === 0) return 30;
  if (total < 5) return 55;
  if (total < 15) return 70;
  if (total < 30) return 80;
  return hasCodes ? 90 : 85;
}
