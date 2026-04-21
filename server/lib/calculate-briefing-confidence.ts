/**
 * calculate-briefing-confidence.ts — fórmula ponderada v2 (2026-04-21)
 *
 * Média ponderada de 6 pilares de informação fornecida pela empresa.
 *
 *                 Σ (wᵢ · cᵢ)
 *   confiança = ─────────────── · 100
 *                   Σ wᵢ
 *
 *   onde A = conjunto de pilares aplicáveis ao tipo da empresa
 *         wᵢ = peso canônico do pilar i (tabela fixa)
 *         cᵢ = completude do pilar i ∈ [0, 1]
 *
 * Pesos canônicos (P.O. UAT 2026-04-21):
 *   Perfil da empresa              8   — dado estrutural
 *   Q3 Produtos (NCM + perguntas)  10  — específico de produto
 *   Q3 Serviços (NBS + perguntas)  10  — específico de serviço
 *   Q3 CNAE especializado          10  — específico de atividade
 *   Q1 SOLARIS (Onda 1)             5  — diagnóstico curado
 *   Q2 IA Gen (Onda 2)              2  — complementar (binário)
 *
 * Regras por pilar:
 *   Perfil: completude vem pré-computada (replica calcProfileScore do frontend)
 *   Q1: ratio respostas/elegíveis (dinâmico por CNAE)
 *   Q2: BINÁRIO (respondeu = 1, não = 0) — limitação do schema atual
 *   Q3 CNAE: ratio respostas/total_cache
 *   Q3 Produtos: MODELO COMPOSTO
 *       0 cadastrados → completude = 0 (sem cadastro não há diagnóstico)
 *       senão → 0,3 · (comNCM / cadastrados) + 0,7 · (respostas / perguntas)
 *   Q3 Serviços: idem com NBS
 *
 * Aplicabilidade por tipo da empresa (inferido de operationType):
 *   produto / misto → Q3 Produtos aplicável
 *   servico / misto → Q3 Serviços aplicável
 *
 * Determinístico. Mesmo input → mesmo output.
 *
 * fix UAT 2026-04-21: substituiu bandas discretas (30/55/70/80/85/90) que
 * retornavam 85% mesmo com 1/5 questionários respondidos e 0 produtos
 * cadastrados — contradição flagrante com as Limitações listadas no
 * próprio briefing.
 */

export const PESOS_CONFIANCA = {
  perfil: 8,
  q3Produtos: 10,
  q3Servicos: 10,
  q3Cnae: 10,
  q1: 5,
  q2: 2,
} as const;

/** Peso do cadastro (NCM/NBS) dentro do pilar Q3 Produtos/Serviços. */
export const Q3_PESO_CADASTRO = 0.3;
/** Peso das respostas ao questionário dentro do pilar Q3 Produtos/Serviços. */
export const Q3_PESO_RESPOSTAS = 0.7;

export type TipoEmpresa = "produto" | "servico" | "mista";

/**
 * Sinais brutos que alimentam a fórmula.
 *
 * Para Perfil e Q1/Q2/Q3Cnae: total pode ser undefined (fallback binário).
 * Para Q3 Produtos/Serviços: cadastrados + comClassificacao + respostas + total
 * são TODOS necessários para aplicar o modelo composto.
 */
export interface BriefingConfidenceSignals {
  /** Perfil — completude 0..1 (use calcProfileScore/100). */
  perfilCompletude: number;
  /** Metadata opcional do perfil — usado pelo breakdown pra exibir "7/7 + 11/12" em vez de "97/100". */
  perfilObrigatoriosPreenchidos?: number;
  perfilObrigatoriosTotais?: number;
  perfilOpcionaisPreenchidos?: number;
  perfilOpcionaisTotais?: number;

  /** Q1 SOLARIS — respostas do projeto vs perguntas elegíveis por CNAE. */
  q1Respostas: number;
  q1TotalPerguntas: number;

  /** Q2 IA Gen — binário. Se respostas > 0 → 1, senão 0. Total ignorado. */
  q2Respostas: number;

  /** Q3 CNAE — respostas do projeto vs total no cache. */
  q3CnaeRespostas: number;
  q3CnaeTotalPerguntas: number;

  /** Q3 Produtos — modelo composto 30/70. */
  q3ProdutosCadastrados: number;
  q3ProdutosComNCM: number;
  q3ProdutosRespostas: number;
  q3ProdutosTotalPerguntas: number;

  /** Q3 Serviços — modelo composto 30/70. */
  q3ServicosCadastrados: number;
  q3ServicosComNBS: number;
  q3ServicosRespostas: number;
  q3ServicosTotalPerguntas: number;

  /** Tipo empresa — default 'mista' (conservador). */
  tipoEmpresa?: TipoEmpresa;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Ratio respostas/total com fallback binário quando total ausente. */
function ratio(respostas: number, total: number): number {
  const r = Math.max(0, Number.isFinite(respostas) ? respostas : 0);
  const t = Math.max(0, Number.isFinite(total) ? total : 0);
  if (t <= 0) return r > 0 ? 1 : 0;
  return clamp01(r / t);
}

/**
 * Completude composta do Q3 Produtos/Serviços.
 * Sem cadastro → 0 (pilar não contribui).
 * Com cadastro → 0,3 · ratio_cadastro + 0,7 · ratio_respostas.
 */
function q3CompostoCompletude(
  cadastrados: number,
  comClassificacao: number,
  respostas: number,
  total: number
): number {
  const cad = Math.max(0, Number.isFinite(cadastrados) ? cadastrados : 0);
  if (cad === 0) return 0;
  const com = Math.max(0, Number.isFinite(comClassificacao) ? comClassificacao : 0);
  const ratioCad = clamp01(com / cad);
  const ratioResp = ratio(respostas, total);
  return Q3_PESO_CADASTRO * ratioCad + Q3_PESO_RESPOSTAS * ratioResp;
}

// ─────────────────────────────────────────────────────────────────────────────
// Breakdown estruturado — requisito jurídico de transparência (P.O. 2026-04-21)
// ─────────────────────────────────────────────────────────────────────────────

export const LABEL_PILAR: Record<string, string> = {
  perfil: "Perfil da empresa",
  q3Produtos: "Q3 Produtos (NCM)",
  q3Servicos: "Q3 Serviços (NBS)",
  q3Cnae: "Q3 CNAE especializado",
  q1: "Q1 SOLARIS (Onda 1)",
  q2: "Q2 IA Gen (Onda 2)",
};

export type PilarKey = "perfil" | "q3Produtos" | "q3Servicos" | "q3Cnae" | "q1" | "q2";

export interface ConfiancaBreakdownPilar {
  key: PilarKey;
  label: string;
  peso: number;
  /** Respostas dadas (para perfil, campos preenchidos quando disponível). */
  respostas: number;
  /** Total esperado; null quando desconhecido (pilar binário ou perfil direto). */
  total: number | null;
  /** Completude final do pilar em [0, 1] (inclui lógica composta Q3). */
  completude: number;
  /** Contribuição ao numerador = peso × completude. */
  contribuicao: number;
  /** Se entra no denominador da média. */
  aplicavel: boolean;
  /** Breakdown interno para Q3 (composto): cadastro + respostas separados. */
  detalhe?: {
    // Q3 composto (produtos/serviços):
    ratioCadastro?: number;
    ratioRespostas?: number;
    cadastrados?: number;
    comClassificacao?: number;
    // Perfil:
    obrigatoriosPreenchidos?: number;
    obrigatoriosTotais?: number;
    opcionaisPreenchidos?: number;
    opcionaisTotais?: number;
  };
}

export interface ConfiancaBreakdown {
  score: number;
  aplicabilidade: TipoEmpresa;
  pilares: ConfiancaBreakdownPilar[];
  pesoTotal: number;
  contribuicaoTotal: number;
}

/**
 * Calcula confiança + breakdown completo para exibição na UI/PDF.
 */
export function calculateBriefingConfidenceWithBreakdown(
  signals: BriefingConfidenceSignals
): ConfiancaBreakdown {
  const P = PESOS_CONFIANCA;
  const tipo: TipoEmpresa = signals.tipoEmpresa ?? "mista";
  const incluiProdutos = tipo === "produto" || tipo === "mista";
  const incluiServicos = tipo === "servico" || tipo === "mista";

  const cPerfil = clamp01(signals.perfilCompletude);
  const cQ1 = ratio(signals.q1Respostas, signals.q1TotalPerguntas);
  const cQ2 = signals.q2Respostas > 0 ? 1 : 0; // binário
  const cQ3Cnae = ratio(signals.q3CnaeRespostas, signals.q3CnaeTotalPerguntas);
  const cQ3P = q3CompostoCompletude(
    signals.q3ProdutosCadastrados,
    signals.q3ProdutosComNCM,
    signals.q3ProdutosRespostas,
    signals.q3ProdutosTotalPerguntas
  );
  const cQ3S = q3CompostoCompletude(
    signals.q3ServicosCadastrados,
    signals.q3ServicosComNBS,
    signals.q3ServicosRespostas,
    signals.q3ServicosTotalPerguntas
  );

  const ratioCadProdutos = signals.q3ProdutosCadastrados > 0
    ? clamp01(signals.q3ProdutosComNCM / signals.q3ProdutosCadastrados)
    : 0;
  const ratioRespProdutos = ratio(signals.q3ProdutosRespostas, signals.q3ProdutosTotalPerguntas);
  const ratioCadServicos = signals.q3ServicosCadastrados > 0
    ? clamp01(signals.q3ServicosComNBS / signals.q3ServicosCadastrados)
    : 0;
  const ratioRespServicos = ratio(signals.q3ServicosRespostas, signals.q3ServicosTotalPerguntas);

  const pilares: ConfiancaBreakdownPilar[] = [
    {
      key: "perfil",
      label: LABEL_PILAR.perfil,
      peso: P.perfil,
      respostas: Math.round(cPerfil * 100),
      total: 100,
      completude: cPerfil,
      contribuicao: P.perfil * cPerfil,
      aplicavel: true,
      detalhe: (signals.perfilObrigatoriosTotais != null || signals.perfilOpcionaisTotais != null)
        ? {
            obrigatoriosPreenchidos: signals.perfilObrigatoriosPreenchidos ?? 0,
            obrigatoriosTotais: signals.perfilObrigatoriosTotais ?? 0,
            opcionaisPreenchidos: signals.perfilOpcionaisPreenchidos ?? 0,
            opcionaisTotais: signals.perfilOpcionaisTotais ?? 0,
          }
        : undefined,
    },
    {
      key: "q3Produtos",
      label: LABEL_PILAR.q3Produtos,
      peso: P.q3Produtos,
      respostas: Math.max(0, signals.q3ProdutosRespostas),
      total: signals.q3ProdutosTotalPerguntas > 0 ? signals.q3ProdutosTotalPerguntas : null,
      completude: cQ3P,
      contribuicao: P.q3Produtos * cQ3P,
      aplicavel: incluiProdutos,
      detalhe: {
        ratioCadastro: ratioCadProdutos,
        ratioRespostas: ratioRespProdutos,
        cadastrados: signals.q3ProdutosCadastrados,
        comClassificacao: signals.q3ProdutosComNCM,
      },
    },
    {
      key: "q3Servicos",
      label: LABEL_PILAR.q3Servicos,
      peso: P.q3Servicos,
      respostas: Math.max(0, signals.q3ServicosRespostas),
      total: signals.q3ServicosTotalPerguntas > 0 ? signals.q3ServicosTotalPerguntas : null,
      completude: cQ3S,
      contribuicao: P.q3Servicos * cQ3S,
      aplicavel: incluiServicos,
      detalhe: {
        ratioCadastro: ratioCadServicos,
        ratioRespostas: ratioRespServicos,
        cadastrados: signals.q3ServicosCadastrados,
        comClassificacao: signals.q3ServicosComNBS,
      },
    },
    {
      key: "q3Cnae",
      label: LABEL_PILAR.q3Cnae,
      peso: P.q3Cnae,
      respostas: Math.max(0, signals.q3CnaeRespostas),
      total: signals.q3CnaeTotalPerguntas > 0 ? signals.q3CnaeTotalPerguntas : null,
      completude: cQ3Cnae,
      contribuicao: P.q3Cnae * cQ3Cnae,
      aplicavel: true,
    },
    {
      key: "q1",
      label: LABEL_PILAR.q1,
      peso: P.q1,
      respostas: Math.max(0, signals.q1Respostas),
      total: signals.q1TotalPerguntas > 0 ? signals.q1TotalPerguntas : null,
      completude: cQ1,
      contribuicao: P.q1 * cQ1,
      aplicavel: true,
    },
    {
      key: "q2",
      label: LABEL_PILAR.q2,
      peso: P.q2,
      respostas: Math.max(0, signals.q2Respostas),
      total: null, // binário — total não aplicável
      completude: cQ2,
      contribuicao: P.q2 * cQ2,
      aplicavel: true,
    },
  ];

  let num = 0;
  let den = 0;
  for (const p of pilares) {
    if (p.aplicavel) {
      num += p.contribuicao;
      den += p.peso;
    }
  }

  const score = den > 0 ? Math.round((num / den) * 100) : 0;

  return {
    score,
    aplicabilidade: tipo,
    pilares,
    pesoTotal: den,
    contribuicaoTotal: num,
  };
}

/**
 * Retorna só o score (para callers que não precisam do breakdown).
 */
export function calculateBriefingConfidence(
  signals: BriefingConfidenceSignals
): number {
  return calculateBriefingConfidenceWithBreakdown(signals).score;
}
