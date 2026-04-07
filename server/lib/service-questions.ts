/**
 * service-questions.ts — Sprint Z Z-01
 * Geração de Q.Serviços (NBS) rastreados com fonte, fonte_ref e lei_ref
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

// ─── Fallback para empresa de serviço sem NBS cadastrados ────────────────────

function buildServiceFallback(): TrackedQuestion[] {
  return [
    {
      id:         "fallback-servico-001",
      fonte:      "fallback",
      fonte_ref:  "fallback-servico-001",
      lei_ref:    "LC 214/2025 (genérico)",
      texto:      "A empresa possui códigos NBS cadastrados para os serviços que presta?",
      categoria:  "cadastro_fiscal",
      confidence: 0.5,
    },
    {
      id:         "fallback-servico-002",
      fonte:      "fallback",
      fonte_ref:  "fallback-servico-002",
      lei_ref:    "LC 214/2025 (genérico)",
      texto:      "A empresa já avaliou o enquadramento dos seus serviços nas alíquotas do IBS e CBS previstas na Reforma Tributária?",
      categoria:  "enquadramento_geral",
      confidence: 0.5,
    },
  ];
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Gera perguntas diagnósticas rastreadas para empresas de serviço (NBS).
 *
 * Fluxo:
 * 1. Se não é empresa de serviço → { nao_aplicavel: true }
 * 2. SOLARIS primeiro (fonte primária) — sempre, independente de nbsCodes
 * 3. RAG por NBS (fonte secundária) — apenas se houver nbsCodes
 * 4. Fallback apenas se AMBAS as fontes retornarem vazio
 * 5. Deduplica e retorna TrackedQuestion[]
 *
 * Retorna APENAS:
 *   TrackedQuestion[]        ← caso normal e fallback
 *   { nao_aplicavel: true }  ← caso produto puro
 *
 * @param nbsCodes    Códigos NBS da empresa (ex: ['1.01.01.00.00', '1.09.01.00.00'])
 * @param cnaeCodes   CNAEs da empresa para filtrar perguntas SOLARIS
 * @param companyProfile  Perfil da empresa para inferir tipo
 * @param queryRagFn  Injetável para facilitar mock nos testes
 * @param querySolarisFn  Injetável para facilitar mock nos testes
 */
export async function generateServiceQuestions(
  nbsCodes: string[],
  cnaeCodes: string[],
  companyProfile: { operationType?: string },
  queryRagFn: typeof queryRag = queryRag,
  querySolarisFn: typeof querySolarisByCnaes = querySolarisByCnaes
): Promise<QuestionResult> {

  // P2: verificar se é empresa de serviço
  const companyType = inferCompanyType(companyProfile, cnaeCodes);
  if (companyType === "produto") {
    return { nao_aplicavel: true };
  }

  const allQuestions: TrackedQuestion[] = [];

  // FIX B-03 + B-06: SOLARIS PRIMEIRO — sempre, independente de nbsCodes
  // SOLARIS filtra por CNAE, não por NBS
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
      ncm:        undefined, // perguntas SOLARIS são por CNAE, não por NCM
      confidence: 1.0,
    });
  }

  // FIX B-03: RAG SEGUNDO — apenas se houver nbsCodes
  for (const nbs of nbsCodes) {
    const contextQuery = `IBS CBS alíquota serviço NBS ${nbs} reforma tributária`;
    let chunks: RagChunk[] = [];
    try {
      chunks = await queryRagFn([nbs, ...cnaeCodes], contextQuery, 3);
    } catch {
      // RAG indisponível: continua sem perguntas RAG para este NBS
    }

    for (const chunk of chunks) {
      try {
        const texto = await generateQuestionFromChunk(chunk, nbs);
        allQuestions.push({
          id:         `rag-nbs-${nbs}-${chunk.anchor_id}`,
          fonte:      "rag",
          fonte_ref:  chunk.anchor_id,
          lei_ref:    extractLeiRef(chunk),
          texto,
          categoria:  inferCategoria(chunk),
          nbs,
          confidence: chunk.score ?? 0.7,
        });
      } catch {
        // Falha na geração de uma pergunta não interrompe o fluxo
      }
    }
  }

  // Fallback apenas se AMBAS as fontes retornarem vazio
  if (allQuestions.length === 0) {
    return {
      perguntas: buildServiceFallback(),
      alerta: "Adicione códigos NBS para diagnóstico mais preciso sobre IBS/CBS em serviços.",
    };
  }

  return deduplicateById(allQuestions);
}
