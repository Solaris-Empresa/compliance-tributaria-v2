/**
 * product-questions.ts — Sprint Z Z-01
 * Geração de Q.Produtos (NCM) rastreados com fonte, fonte_ref e lei_ref
 * DEC-M3-05 v3 · ADR-0009
 */

import {
  TrackedQuestion,
  QuestionResult,
  RagChunk,
  SolarisQuestion,
  generateQuestionFromChunk,
  extractLeiRef,
  inferCategoria,
  extractLeiRefFromSolaris,
  deduplicateById,
} from "./tracked-question";
import { queryRag } from "./rag-query";
import { querySolarisByCnaes } from "./solaris-query";
import { inferCompanyType } from "./completeness";

// ─── Fallback para empresa de produto sem NCMs cadastrados ───────────────────
// ncm é undefined — sem NCM de origem (array vazio)

function buildProductFallback(): TrackedQuestion[] {
  return [
    {
      id:         "fallback-produto-001",
      fonte:      "fallback",
      fonte_ref:  "fallback-produto-001",
      lei_ref:    "LC 214/2025 (genérico)",
      texto:      "A empresa possui NCMs cadastrados para os produtos que comercializa ou industrializa?",
      categoria:  "cadastro_fiscal",
      confidence: 0.5,
    },
    {
      id:         "fallback-produto-002",
      fonte:      "fallback",
      fonte_ref:  "fallback-produto-002",
      lei_ref:    "LC 214/2025 (genérico)",
      texto:      "A empresa já avaliou o enquadramento dos seus produtos nas alíquotas do IBS e CBS previstas na Reforma Tributária?",
      categoria:  "enquadramento_geral",
      confidence: 0.5,
    },
  ];
}

// ─── Fallback por NCM específico (sem cobertura RAG) ─────────────────────────
// ncm é preenchido com o NCM de origem

function buildNcmFallback(ncm: string): TrackedQuestion[] {
  return [
    {
      id:         `fallback-ncm-${ncm}-01`,
      fonte:      "fallback",
      fonte_ref:  `fallback-ncm-${ncm}`,
      lei_ref:    "LC 214/2025 (genérico)",
      texto:      `A empresa analisou o enquadramento tributário do produto NCM ${ncm} nas regras do IBS e CBS da Reforma Tributária?`,
      categoria:  "enquadramento_geral",
      ncm,           // ← campo obrigatório: rastreia o NCM de origem
      confidence: 0.5,
    },
  ];
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Gera perguntas diagnósticas rastreadas para empresas de produto (NCM).
 *
 * Fluxo:
 * 1. Se não é empresa de produto → { nao_aplicavel: true }
 * 2. Se não tem NCMs → buildProductFallback() como TrackedQuestion[] direto
 * 3. Para cada NCM: busca RAG; se vazio → buildNcmFallback(ncm) com ncm preenchido
 * 4. Perguntas SOLARIS filtradas por CNAE
 * 5. Deduplica e retorna TrackedQuestion[]
 *
 * Retorna APENAS:
 *   TrackedQuestion[]        ← caso normal, fallback por NCM e fallback genérico
 *   { nao_aplicavel: true }  ← caso serviço puro
 * Nunca retorna { perguntas, alerta }.
 *
 * @param ncmCodes   Códigos NCM da empresa (ex: ['2202.10.00', '2106.90.10'])
 * @param cnaeCodes  CNAEs da empresa para filtrar perguntas SOLARIS
 * @param companyProfile  Perfil da empresa para inferir tipo
 * @param queryRagFn  Injetável para facilitar mock nos testes
 * @param querySolarisFn  Injetável para facilitar mock nos testes
 */
export async function generateProductQuestions(
  ncmCodes: string[],
  cnaeCodes: string[],
  companyProfile: { operationType?: string },
  queryRagFn: typeof queryRag = queryRag,
  querySolarisFn: typeof querySolarisByCnaes = querySolarisByCnaes
): Promise<QuestionResult> {

  // P2: verificar se é empresa de produto
  const companyType = inferCompanyType(companyProfile, cnaeCodes);
  if (companyType === "servico") {
    return { nao_aplicavel: true };
  }

  // FIX A-04: Sem NCMs → retorna TrackedQuestion[] direto (não { perguntas, alerta })
  if (ncmCodes.length === 0) {
    return buildProductFallback();
  }

  const allQuestions: TrackedQuestion[] = [];

  // ─── Perguntas RAG por NCM ────────────────────────────────────────────────
  for (const ncm of ncmCodes) {
    const contextQuery = `IBS CBS alíquota produto NCM ${ncm} reforma tributária`;
    let chunks: RagChunk[] = [];
    try {
      chunks = await queryRagFn([ncm, ...cnaeCodes], contextQuery, 3);
    } catch {
      // RAG indisponível: continua sem perguntas RAG para este NCM
    }

    if (chunks.length === 0) {
      // FIX A-03/A-07: NCM sem cobertura RAG → fallback com ncm preenchido
      allQuestions.push(...buildNcmFallback(ncm));
    } else {
      for (const chunk of chunks) {
        try {
          const texto = await generateQuestionFromChunk(chunk, ncm);
          allQuestions.push({
            id:         `rag-ncm-${ncm}-${chunk.anchor_id}`,
            fonte:      "rag",
            fonte_ref:  chunk.anchor_id,
            lei_ref:    extractLeiRef(chunk),
            texto,
            categoria:  inferCategoria(chunk),
            ncm,
            confidence: chunk.score ?? 0.7,
          });
        } catch {
          // Falha na geração de uma pergunta não interrompe o fluxo
        }
      }
    }
  }

  // ─── Perguntas SOLARIS filtradas por CNAE ────────────────────────────────
  let solarisQuestions: SolarisQuestion[] = [];
  try {
    solarisQuestions = await querySolarisFn(cnaeCodes);
  } catch {
    // SOLARIS indisponível: continua sem perguntas SOLARIS
  }

  for (const sq of solarisQuestions) {
    allQuestions.push({
      id:         `solaris-${sq.id}`,
      fonte:      "solaris",
      fonte_ref:  sq.codigo ?? `SOL-${String(sq.id).padStart(3, "0")}`,
      lei_ref:    extractLeiRefFromSolaris(sq),
      texto:      sq.texto,
      categoria:  sq.categoria ?? "enquadramento_geral",
      nbs:        undefined, // perguntas SOLARIS são por CNAE, não por NBS
      confidence: 1.0,
    });
  }

  // Fallback se nenhuma pergunta foi gerada (não deve ocorrer após fix, mas por segurança)
  if (allQuestions.length === 0) {
    return buildProductFallback();
  }

  return deduplicateById(allQuestions);
}
