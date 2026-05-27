/**
 * tracked-question.ts — Sprint Z Z-01
 * Tipos de rastreabilidade + helpers para Q.Produtos (NCM) e Q.Serviços (NBS)
 * DEC-M3-05 v3 · ADR-0009
 */

import type { SolarisQuestion } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

export type { SolarisQuestion };

// ─── Tipos de entrada ────────────────────────────────────────────────────────

/**
 * Chunk retornado pelo RAG (mapeado de RetrievedArticle em rag-retriever.ts)
 */
export interface RagChunk {
  anchor_id: string;
  conteudo:  string;
  artigo?:   string;
  lei?:      string;
  score?:    number;
  topicos?:  string;
  artigoPai?: string;  // D2-DETECTOR: artigo-pai (LC 214) p/ isSetorialArtigo via metadado
}

// ─── Tipos de rastreabilidade ─────────────────────────────────────────────────

// M3.7 Item 4: "regulatorio" é o valor canônico da Onda 3 (E2E-3-ONDAS-QUESTIONARIOS-v1.md:79).
// "rag" mantido como legado para riscos antigos no banco (backward-compat); novos retornos usam "regulatorio".
// "fallback" será removido na Sprint M3.7 Item 5 (NO_QUESTION protocol substitui fallbacks hardcoded).
export type QuestionFonte = "regulatorio" | "rag" | "solaris" | "engine" | "fallback" | "ia_gen";

export interface TrackedQuestion {
  id:         string;
  fonte:      QuestionFonte;
  fonte_ref:  string;   // rag: anchor_id · solaris: 'SOL-XXX' · fallback: 'fallback-*'
  lei_ref:    string;   // NUNCA vazio · fallback: 'LC 214/2025 (genérico)'
  texto:      string;
  categoria:  string;
  ncm?:       string;   // NCM que originou esta pergunta
  nbs?:       string;   // NBS que originou esta pergunta
  confidence: number;   // rag: chunk.score · solaris: 1.0 · fallback: 0.5
}

export interface TrackedAnswer {
  question_id: string;
  fonte:       QuestionFonte;
  fonte_ref:   string;
  lei_ref:     string;
  resposta:    string;
  answered_at: number; // timestamp ms UTC
}

/**
 * QuestionResult — union dos casos possíveis de retorno das funções de geração.
 * O handler em routers-fluxo-v3.ts DEVE fazer narrowing explícito (sem `as any`).
 *
 * M3.7 Item 5 (REGRA-ORQ-29): NO_QUESTION protocol — adiciona motivo + alerta opcionais
 * para substituir fallbacks hardcoded eliminados.
 */
export type NoQuestionMotivo =
  | "not_service_company"
  | "not_product_company"
  | "no_nbs_codes"
  | "no_ncm_codes"
  | "no_applicable_requirements"
  // Issue #997: Q.NCM Quality Gate — corpus retornou apenas chunks genéricos
  // (Art. < 128 LC 214) e SOLARIS não cobre o NCM. Bloqueia geração para
  // não emitir perguntas com falsa autoridade legal (REGRA-ORQ-31 meta 98%).
  | "corpus_gap_setorial";

export type QuestionResult =
  | TrackedQuestion[]
  | { nao_aplicavel: true; motivo?: NoQuestionMotivo; alerta?: string }
  | { perguntas: TrackedQuestion[]; alerta: string };

// ─── Função de geração via LLM ────────────────────────────────────────────────

/**
 * Gera uma pergunta diagnóstica a partir de um chunk RAG.
 * Usa o mesmo invokeLLM do briefingEngine.
 *
 * Issue #1037 (P.O. autorizado 2026-05-08):
 *   D3 — fork de template por tipo de operação. NCM (kind='ncm', default)
 *        preserva comportamento byte-a-byte. NBS (kind='nbs') usa template
 *        especializado em prestação de serviços (sem termos "venda/locação/
 *        licenciamento" inadequados a serviços).
 *   D2 — `perfilOperacional` opcional (do M1 archetype) injetado como
 *        contexto adicional para o LLM filtrar perguntas inaplicáveis.
 *        Se não fornecido, comportamento idêntico ao legado.
 *
 * @param chunk RAG chunk com conteúdo legal
 * @param context Código NCM ou NBS
 * @param options.kind Tipo de operação: 'ncm' (produto, default) ou 'nbs' (serviço)
 * @param options.perfilOperacional Perfil M1 do contribuinte (string formatada)
 */
export async function generateQuestionFromChunk(
  chunk: RagChunk,
  context: string, // NCM ou NBS de contexto
  options: {
    kind?: "ncm" | "nbs";
    perfilOperacional?: string;
  } = {}
): Promise<string> {
  const { kind = "ncm", perfilOperacional } = options;

  // Linha de contexto do perfil — D2 (Issue #1037).
  // Vazia se perfilOperacional indefinido para preservar comportamento legado.
  const perfilLine = perfilOperacional && perfilOperacional.trim().length > 0
    ? `Perfil operacional do contribuinte: ${perfilOperacional}. ` +
      `Gere perguntas relevantes APENAS para este perfil. ` +
      `Ignore obrigações que não se aplicam a ${perfilOperacional}.`
    : "";

  // D3 (Issue #1037) — Fork de template por tipo de operação.
  let prompt: string;
  if (kind === "nbs") {
    // Template NBS especializado em prestação de serviços.
    prompt = [
      `Você é especialista em compliance tributário da Reforma Tributária brasileira (LC 214/2025).`,
      `O contribuinte PRESTA SERVIÇOS classificados sob o código NBS: ${context}.`,
      perfilLine,
      ``,
      `Com base no trecho legal abaixo, gere UMA pergunta diagnóstica objetiva`,
      `sobre obrigações tributárias DE PRESTAÇÃO DE SERVIÇOS.`,
      ``,
      `RESTRIÇÕES de terminologia:`,
      `- NÃO usar: "venda", "locação de bem físico", "licenciamento de software"`,
      `  a menos que sejam diretamente relevantes ao código NBS ${context}.`,
      `- FOQUE em: prestação de serviços, IBS/CBS sobre serviços, retenções na fonte,`,
      `  emissão de NFS-e, contraprestação por serviços executados, regime de incidência.`,
      ``,
      `Trecho (${chunk.lei?.toUpperCase() ?? "LC 214/2025"} · ${chunk.artigo ?? ""}):`,
      chunk.conteudo.slice(0, 800),
      ``,
      `Responda APENAS com o texto da pergunta, sem numeração ou prefixo.`,
    ].filter(line => line !== "").join("\n");
  } else {
    // Template NCM (default) — preservado byte-a-byte do legado.
    // Issue #1037 D2: adiciona perfilLine se fornecido (sem alterar template base).
    prompt = [
      `Você é especialista em compliance tributário da Reforma Tributária brasileira.`,
      `Com base no trecho legal abaixo, gere UMA pergunta diagnóstica objetiva`,
      `para verificar se a empresa está em conformidade com este dispositivo.`,
      `Contexto: produto/serviço com código ${context}.`,
      perfilLine,
      ``,
      `Trecho (${chunk.lei?.toUpperCase() ?? "LC 214/2025"} · ${chunk.artigo ?? ""}):`,
      chunk.conteudo.slice(0, 800),
      ``,
      `Responda APENAS com o texto da pergunta, sem numeração ou prefixo.`,
    ].filter(line => line !== "").join("\n");
  }

  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response?.choices?.[0]?.message?.content;
  const text = typeof raw === "string" ? raw : "";
  if (!text.trim()) throw new Error("generateQuestionFromChunk: LLM retornou resposta vazia");
  return text.trim();
}

// ─── Helpers de extração ──────────────────────────────────────────────────────

export function extractLeiRef(chunk: RagChunk): string {
  if (chunk.lei && chunk.artigo)
    return `${chunk.artigo} ${chunk.lei.toUpperCase().replace("lc", "LC ").replace("ec", "EC ")}`;
  if (chunk.lei)
    return chunk.lei.toUpperCase().replace("lc", "LC ").replace("ec", "EC ");
  return "LC 214/2025 (genérico)";
}

export function inferCategoria(chunk: RagChunk): string {
  const t = (chunk.topicos ?? "").toLowerCase();
  if (t.includes("alíquota zero") || t.includes("aliquota zero")) return "aliquota_zero";
  if (t.includes("imposto seletivo") || t.includes("seletivo")) return "imposto_seletivo";
  if (t.includes("cbs") || t.includes("ibs")) return "ibs_cbs";
  if (t.includes("inscrição") || t.includes("cadastro")) return "cadastro_fiscal";
  return "enquadramento_geral";
}

export function extractLeiRefFromSolaris(sq: SolarisQuestion): string {
  // M3.7 Item 3 (REGRA-ORQ-29 + REGRA-ORQ-32): priorizar metadado estruturado
  // Substitui inferência frágil por regex em texto livre (legado pré-M3.7).
  if (sq.leiRef) {
    // Formata como "LC 214/2025 Art. 9" se ambos definidos, senão apenas a lei normalizada
    const leiNormalizada = sq.leiRef
      .toUpperCase()
      .replace(/^LC/, "LC ")
      .replace(/^EC/, "EC ");
    return sq.artigoRef ? `${leiNormalizada} ${sq.artigoRef}` : leiNormalizada;
  }

  // Fallback legado: regex em topicos (mantido para perguntas pré-M3.7 sem leiRef)
  // Será descontinuado quando 100% das perguntas tiverem leiRef preenchido pela equipe SOLARIS.
  if (sq.topicos) {
    const match = sq.topicos.match(/LC\s*\d+\/\d+|Art\.\s*\d+/i);
    if (match) return match[0];
  }
  return "LC 214/2025 (genérico)";
}

export function deduplicateById(qs: TrackedQuestion[]): TrackedQuestion[] {
  const seen = new Set<string>();
  return qs.filter(q => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
}
