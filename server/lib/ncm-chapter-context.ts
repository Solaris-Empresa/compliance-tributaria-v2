// ncm-chapter-context.ts — GATE-NCM-NBS #1219 F6 (issue #1436)
// Enriquece a query RAG do questionário (C1 produto / C2 serviço) com termos
// semânticos do setor quando o código é um GRUPO/capítulo — para o reranker
// retornar perguntas relevantes em vez de chunks genéricos de outros capítulos.
//
// D1 (Gate 0): mapa ESTÁTICO (não tabela DB, não expande o contrato
// NcmNbsResolution). Dados de referência estáveis (nomenclatura NCM/NBS).
// Tech-debt: migrar para tabela de config se crescer (REGRA-ORQ-32 — mesmo
// precedente dos prefixos IS hardcoded).

// ─── NCM: capítulo (2 díg.) → termos semânticos do setor ────────────────────
export const NCM_CHAPTER_CONTEXT: Record<string, string> = {
  "01": "animais vivos pecuária agropecuária",
  "02": "carnes produtos animais",
  "03": "peixes frutos do mar",
  "04": "leite laticínios ovos mel",
  "07": "produtos hortícolas legumes",
  "08": "frutas",
  "09": "café chá especiarias",
  "10": "cereais grãos arroz milho trigo cesta básica",
  "11": "farinhas amidos cereais processados",
  "12": "sementes oleaginosas soja girassol",
  "15": "gorduras óleos vegetais animais",
  "17": "açúcares produtos confeitaria",
  "19": "preparações cereais farinhas panificação",
  "20": "preparações hortícolas frutas conservas",
  "21": "preparações alimentícias diversas",
  "22": "bebidas alcoólicas vinhos cervejas águas",
  "23": "rações insumos agropecuários farelo soja resíduos alimentares",
  "24": "tabaco produtos fumígenos cigarros",
  "26": "minérios escórias cinzas",
  "27": "combustíveis petróleo diesel gasolina gás óleos minerais",
  "29": "produtos químicos orgânicos",
  "30": "produtos farmacêuticos medicamentos",
  "31": "adubos fertilizantes agropecuária",
  "38": "produtos químicos diversos",
  "84": "máquinas equipamentos industriais agrícolas motores reatores",
  "85": "equipamentos elétricos eletrônicos",
  "87": "veículos automóveis caminhões tratores",
  "88": "aeronaves",
  "89": "embarcações navios",
  "90": "instrumentos ópticos médicos científicos",
};

// ─── NBS: divisão (1.NN) → termos semânticos do serviço ─────────────────────
export const NBS_DIVISION_CONTEXT: Record<string, string> = {
  "1.01": "serviços agropecuária pesca extração",
  "1.05": "transporte cargas passageiros logística frete",
  "1.06": "serviços auxiliares apoio diversos",
  "1.07": "serviços construção obras",
  "1.09": "serviços financeiros bancários seguros",
  "1.10": "serviços imobiliários locação",
  "1.12": "serviços profissionais técnicos",
  "1.13": "serviços jurídicos contábeis auditoria",
  "1.15": "serviços tecnologia informação software desenvolvimento consultoria",
  "1.17": "serviços educação ensino",
  "1.19": "serviços saúde médicos",
};

const RAG_SUFFIX = "IBS CBS reforma tributária LC 214";

function appendRegime(parts: string[], regime?: string): void {
  if (regime && regime !== "fallback" && regime !== "regime_geral") {
    parts.push(regime.replace(/_/g, " "));
  }
}

/**
 * Monta a query RAG enriquecida para um NCM (grupo ou específico).
 * Usa o capítulo (2 díg.) → termos do setor. Degrada graciosamente: capítulo
 * sem mapeamento → só `NCM <code>` + sufixo (sem quebrar).
 */
export function buildNcmQueryContext(ncmCode: string, regime?: string): string {
  const digits = ncmCode.replace(/\D/g, "");
  const chapter = digits.substring(0, 2);
  const parts: string[] = [`NCM ${ncmCode}`];
  const chapterTerms = NCM_CHAPTER_CONTEXT[chapter];
  if (chapterTerms) parts.push(chapterTerms);
  appendRegime(parts, regime);
  parts.push(RAG_SUFFIX);
  return parts.join(" ");
}

/**
 * Monta a query RAG enriquecida para um NBS (grupo ou específico).
 * Divisão = `1.` + 2 primeiros díg. da subposição. Ex: "1.0501.14.59" → "1.05".
 * Degrada graciosamente: divisão sem mapeamento → só `NBS <code>` + sufixo.
 */
export function buildNbsQueryContext(nbsCode: string, regime?: string): string {
  const parts: string[] = [`NBS ${nbsCode}`];
  const segs = nbsCode.split(".");
  if (segs.length >= 2 && segs[0] === "1") {
    const division = `1.${segs[1].substring(0, 2)}`;
    const divTerms = NBS_DIVISION_CONTEXT[division];
    if (divTerms) parts.push(divTerms);
  }
  appendRegime(parts, regime);
  parts.push(RAG_SUFFIX);
  return parts.join(" ");
}
