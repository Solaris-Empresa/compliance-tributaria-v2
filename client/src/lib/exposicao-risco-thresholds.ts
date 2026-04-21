/**
 * exposicao-risco-thresholds.ts — issue #802
 *
 * Classificação de UX do indicador "Exposição ao Risco de Compliance".
 *
 * ARQUITETURA:
 *   - Backend calcula apenas o número (score 0-100) via calculateComplianceScore.
 *   - Este módulo (frontend) aplica os thresholds e mapeia para label + cor.
 *   - Nunca misturar: threshold é decisão de UX · fórmula é decisão de negócio.
 *
 * Consumidores: ExposicaoRiscoBadge, ConsolidacaoV4, generateDiagnosticoPDF.
 *
 * ⚠️ Semântica crítica:
 *   - Quanto MENOR o score, MELHOR a situação.
 *   - "Baixa exposição" é META (pós-tratamento), não ponto de partida.
 *   - Projetos com riscos aprovados tipicamente começam em 56-75.
 */

export type ExposicaoLevel = "baixa" | "moderada" | "alta" | "critica";

export interface ExposicaoConfig {
  /** Label curto (PT-BR) exibido no badge/card */
  label: string;
  /** Emoji indicador */
  emoji: string;
  /** Interpretação da faixa (1 linha) */
  interpretation: string;
  /** Ação recomendada */
  action: string;
  /** Classes Tailwind (texto · fundo · borda) — unificado para dark mode */
  className: string;
  /** Cor da barra de progresso */
  barClass: string;
  /** Faixa numérica inclusive-inclusive */
  range: { min: number; max: number };
}

/**
 * Configuração determinística das 4 bandas.
 * Alterações aqui AFETAM todas as UIs que consomem este módulo — único ponto de verdade.
 */
export const EXPOSICAO_CONFIG: Record<ExposicaoLevel, ExposicaoConfig> = {
  baixa: {
    label: "Baixa exposição",
    emoji: "🟢",
    interpretation: "Situação controlada",
    action: "Manter monitoramento",
    className:
      "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400",
    barClass: "bg-emerald-500",
    range: { min: 0, max: 30 },
  },
  moderada: {
    label: "Exposição moderada",
    emoji: "🟡",
    interpretation: "Riscos relevantes identificados",
    action: "Revisar aprovações",
    className:
      "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400",
    barClass: "bg-amber-500",
    range: { min: 31, max: 55 },
  },
  alta: {
    label: "Alta exposição",
    emoji: "🟠",
    interpretation: "Exposição significativa",
    action: "Priorizar mitigação",
    className:
      "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400",
    barClass: "bg-orange-500",
    range: { min: 56, max: 75 },
  },
  critica: {
    label: "Exposição crítica",
    emoji: "🔴",
    interpretation: "Alto risco de não conformidade",
    action: "Ação imediata",
    className:
      "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400",
    barClass: "bg-red-500",
    range: { min: 76, max: 100 },
  },
};

/**
 * Classifica um score numérico (0-100) em uma das 4 faixas de exposição.
 * Determinística. Mesmo input → mesmo output.
 *
 * Thresholds:
 *   0–30  → baixa
 *   31–55 → moderada
 *   56–75 → alta
 *   76+   → crítica
 */
export function classifyExposicao(score: number): ExposicaoLevel {
  if (!Number.isFinite(score)) return "baixa";
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s >= 76) return "critica";
  if (s >= 56) return "alta";
  if (s >= 31) return "moderada";
  return "baixa";
}

/**
 * Retorna o config completo para um score.
 */
export function getExposicaoConfig(score: number | null | undefined): ExposicaoConfig | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  return EXPOSICAO_CONFIG[classifyExposicao(score)];
}

// ─── Textos canônicos do indicador (fonte única) ────────────────────────────

export const EXPOSICAO_TEXTOS = {
  titulo: "Exposição ao Risco de Compliance",
  subtitulo:
    "O objetivo não é aumentar o indicador.\nÉ reduzir a exposição ao risco.",
  alerta:
    "Este indicador mede EXPOSIÇÃO ao risco — não o nível de compliance.\nQuanto MENOR o valor, MELHOR a situação.",
  nota_pedagogica:
    "Projetos com riscos aprovados normalmente começam com exposição entre 56 e 75.\nA redução ocorre conforme os riscos são tratados ou removidos.",
  frase_final:
    "O verde não é o ponto de partida. É o resultado do trabalho.",
} as const;
