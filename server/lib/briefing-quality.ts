/**
 * briefing-quality.ts — issue #810
 *
 * Calcula determinísticamente a "Qualidade das Informações" fornecidas
 * pela empresa, usada como indicador visível no briefing v2 e base do
 * badge de maturidade do diagnóstico.
 *
 * Não substitui o confidence_score — são métricas complementares:
 *   - confidence_score: confiança do diagnóstico (heurística dinâmica)
 *   - quality: completude do input do usuário (determinística, somente contagem)
 *
 * Fórmula base (quando há produtos OU serviços cadastrados):
 *   quality = 0.5·qRespRatio + 0.3·classCoverage + 0.2·descRichness
 *
 * Quando NÃO há produtos nem serviços (empresa de serviços que não
 * preencheu NBS, por exemplo) o peso de classificação é redistribuído:
 *   quality = 0.6·qRespRatio + 0.4·descRichness
 *
 * Todas as variáveis em [0, 1]. Output em [0, 100].
 *
 * Badge de maturidade (derivado da confiança, NÃO da qualidade):
 *   conf < 40  → MAPA_REGULATORIO
 *   40..84     → DIAGNOSTICO_PARCIAL
 *   >= 85      → DIAGNOSTICO_COMPLETO
 *
 * Determinístico. Mesmo input → mesmo output.
 */

export interface BriefingQualityInput {
  /** Nº de questionários com pelo menos 1 resposta (0..5 canônico). */
  questionariosRespondidos: number;
  /** Total canônico de questionários (default 5: SOLARIS/IA Gen/CNAE/Produtos/Serviços). */
  questionariosTotal?: number;
  /** Produtos cadastrados com NCM preenchido. */
  produtosComClassificacao: number;
  /** Total de produtos cadastrados. */
  produtosTotal: number;
  /** Serviços cadastrados com NBS preenchido. */
  servicosComClassificacao: number;
  /** Total de serviços cadastrados. */
  servicosTotal: number;
  /** Descrição do negócio (texto livre). */
  descricao?: string | null;
}

export interface BriefingQualityResult {
  /** Qualidade 0-100 arredondado. */
  quality: number;
  /** Componentes individuais para debug / UI. */
  components: {
    questionarios: number; // 0..1
    classificacao: number; // 0..1 (NCM+NBS coverage) · 0 quando sem produtos/serviços
    descricao: number; // 0..1
  };
  /** Flag indicando se pesos foram redistribuídos (sem produtos/serviços). */
  redistributed: boolean;
}

export type MaturityBadge =
  | "MAPA_REGULATORIO"
  | "DIAGNOSTICO_PARCIAL"
  | "DIAGNOSTICO_COMPLETO";

/** Palavra-mínima para considerar descrição "rica". */
const DESC_WORDS_TARGET = 20;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function calculateBriefingQuality(input: BriefingQualityInput): BriefingQualityResult {
  const qTotal = input.questionariosTotal && input.questionariosTotal > 0 ? input.questionariosTotal : 5;
  const qResp = clamp01(Math.max(0, input.questionariosRespondidos) / qTotal);

  const desc = clamp01(wordCount(input.descricao) / DESC_WORDS_TARGET);

  const totalItens = input.produtosTotal + input.servicosTotal;
  const temItens = totalItens > 0;

  let classCoverage = 0;
  if (temItens) {
    classCoverage = clamp01(
      (input.produtosComClassificacao + input.servicosComClassificacao) / totalItens
    );
  }

  const redistributed = !temItens;
  const quality = redistributed
    ? (0.6 * qResp + 0.4 * desc) * 100
    : (0.5 * qResp + 0.3 * classCoverage + 0.2 * desc) * 100;

  return {
    quality: Math.round(quality),
    components: {
      questionarios: qResp,
      classificacao: classCoverage,
      descricao: desc,
    },
    redistributed,
  };
}

/**
 * Badge de maturidade derivado da confiança (0-100).
 * Nota: maturidade ≠ qualidade. Maturidade depende da confiança
 * (que inclui RAG coverage, gaps detectados, etc).
 */
export function classifyMaturityBadge(nivelConfianca: number | null | undefined): MaturityBadge {
  if (!Number.isFinite(nivelConfianca as number) || (nivelConfianca as number) < 40) {
    return "MAPA_REGULATORIO";
  }
  if ((nivelConfianca as number) < 85) return "DIAGNOSTICO_PARCIAL";
  return "DIAGNOSTICO_COMPLETO";
}

/** Rótulos renderizados no markdown do briefing. */
export const MATURITY_BADGE_LABEL: Record<MaturityBadge, string> = {
  MAPA_REGULATORIO: "🗺️ MAPA REGULATÓRIO",
  DIAGNOSTICO_PARCIAL: "📋 DIAGNÓSTICO PARCIAL",
  DIAGNOSTICO_COMPLETO: "✅ DIAGNÓSTICO COMPLETO",
};
