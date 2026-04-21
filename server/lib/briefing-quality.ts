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

export interface MaturitySignals {
  /** Output de calculateBriefingConfidence (0-100). */
  nivelConfianca: number | null | undefined;
  /** Output de calculateBriefingQuality (0-100). */
  qualidade?: number | null;
  /** Total de produtos cadastrados em principaisProdutos. */
  produtosCadastrados?: number;
  /** Total de serviços cadastrados em principaisServicos. */
  servicosCadastrados?: number;
  /** Nº de questionários com pelo menos 1 resposta (0-5 canônico). */
  questionariosRespondidos?: number;
  /** Total de questionários (default 5). */
  questionariosTotal?: number;
}

/**
 * Badge de maturidade do diagnóstico (MAPA · PARCIAL · COMPLETO).
 *
 * fix UAT 2026-04-21: badge passa a exigir AND de múltiplos sinais para
 * atingir "COMPLETO". Apenas confidence>=85 não é suficiente — é comum
 * calculateBriefingConfidence retornar 85 mesmo sem produtos/serviços
 * cadastrados (quando há muitas respostas de questionário), gerando
 * contradição com o próprio briefing ("Diagnóstico baseado em indícios
 * do perfil, não em evidências" + badge "COMPLETO").
 *
 * Regras:
 *   COMPLETO requer AND de:
 *     - confidence >= 85
 *     - qualidade >= 80
 *     - produtos OU serviços cadastrados (>=1)
 *     - questionários respondidos >= 4/5 (80%)
 *
 *   MAPA quando confidence < 40 E qualidade < 40 (sinais fracos em ambas)
 *
 *   PARCIAL para todo o resto (maioria dos casos reais)
 *
 * Assinatura aceita sinal único (retrocompat) OU objeto completo (novo).
 */
export function classifyMaturityBadge(
  signalsOrConfidence: MaturitySignals | number | null | undefined
): MaturityBadge {
  // Retrocompat: chamada antiga passando só a confiança — mapeia para objeto.
  const signals: MaturitySignals =
    typeof signalsOrConfidence === "number" || signalsOrConfidence === null || signalsOrConfidence === undefined
      ? { nivelConfianca: signalsOrConfidence as any }
      : signalsOrConfidence;

  const conf = Number.isFinite(signals.nivelConfianca as number) ? (signals.nivelConfianca as number) : 0;
  const qual = Number.isFinite(signals.qualidade as number) ? (signals.qualidade as number) : 0;
  const produtos = Math.max(0, signals.produtosCadastrados ?? 0);
  const servicos = Math.max(0, signals.servicosCadastrados ?? 0);
  const temCadastro = produtos + servicos > 0;
  const questTotal = signals.questionariosTotal && signals.questionariosTotal > 0 ? signals.questionariosTotal : 5;
  const questResp = Math.max(0, signals.questionariosRespondidos ?? 0);
  const questRatio = Math.min(1, questResp / questTotal);

  // COMPLETO — AND de todos os sinais fortes
  if (conf >= 85 && qual >= 80 && temCadastro && questRatio >= 0.8) {
    return "DIAGNOSTICO_COMPLETO";
  }

  // MAPA — sinais fracos em ambas as dimensões principais
  if (conf < 40 && qual < 40) {
    return "MAPA_REGULATORIO";
  }

  // PARCIAL — caso real mais comum
  return "DIAGNOSTICO_PARCIAL";
}

/** Rótulos renderizados no markdown do briefing. */
export const MATURITY_BADGE_LABEL: Record<MaturityBadge, string> = {
  MAPA_REGULATORIO: "🗺️ MAPA REGULATÓRIO",
  DIAGNOSTICO_PARCIAL: "📋 DIAGNÓSTICO PARCIAL",
  DIAGNOSTICO_COMPLETO: "✅ DIAGNÓSTICO COMPLETO",
};
