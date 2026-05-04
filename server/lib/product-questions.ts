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

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Gera perguntas diagnósticas rastreadas para empresas de produto (NCM).
 *
 * Fluxo:
 * 1. Se não é empresa de produto → { nao_aplicavel: true }
 * 2. Se não tem NCMs → { nao_aplicavel: true, motivo: "no_ncm_codes", alerta }
 * 3. Para cada NCM: busca RAG + perguntas SOLARIS filtradas por CNAE
 * 4. Deduplica e retorna TrackedQuestion[]
 * 5. Se zero perguntas → { nao_aplicavel: true, motivo: "no_applicable_requirements", alerta }
 *
 * M3.7 Item 5 (REGRA-ORQ-29): NO_QUESTION protocol — sem requisito = sem pergunta.
 * Fallback hardcoded `buildProductFallback` removido (violava Content Engine Rule #1).
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
  companyProfile: { operationType?: string; archetype?: unknown },
  queryRagFn: typeof queryRag = queryRag,
  querySolarisFn: typeof querySolarisByCnaes = querySolarisByCnaes
): Promise<QuestionResult> {

  // P2: verificar se é empresa de produto
  const companyType = inferCompanyType(companyProfile, cnaeCodes);
  if (companyType === "servico") {
    return { nao_aplicavel: true };
  }

  // M3.7 Item 5: sem NCMs → NO_QUESTION protocol (era buildProductFallback hardcoded)
  if (ncmCodes.length === 0) {
    return {
      nao_aplicavel: true,
      motivo: "no_ncm_codes",
      alerta: "Adicione códigos NCM para diagnóstico mais preciso sobre IBS/CBS em produtos.",
    };
  }

  // M3 NOVA-02: archetype context formatado para enriquecer contextQuery do RAG.
  // Backward-compat: arch=null → string vazia → contextQuery idêntico ao legado.
  const { getArchetypeContext } = await import("./archetype/getArchetypeContext");
  const archetypeContext = getArchetypeContext(companyProfile.archetype as never);

  const allQuestions: TrackedQuestion[] = [];

  // ─── Perguntas RAG por NCM ────────────────────────────────────────────────
  for (const ncm of ncmCodes) {
    const contextQuery = archetypeContext
      ? `IBS CBS alíquota produto NCM ${ncm} reforma tributária ${archetypeContext}`
      : `IBS CBS alíquota produto NCM ${ncm} reforma tributária`;
    let chunks: RagChunk[] = [];
    try {
      chunks = await queryRagFn([ncm, ...cnaeCodes], contextQuery, 3);
    } catch {
      // RAG indisponível: continua sem perguntas RAG para este NCM
    }

    for (const chunk of chunks) {
      try {
        const texto = await generateQuestionFromChunk(chunk, ncm);
        allQuestions.push({
          id:         `rag-ncm-${ncm}-${chunk.anchor_id}`,
          fonte:      "regulatorio",
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

  // M3.7 Item 5: nenhuma pergunta gerada → NO_QUESTION protocol (era buildProductFallback hardcoded)
  // ADR-010 Regra 5: registrar como skipped com motivo no_applicable_requirements
  if (allQuestions.length === 0) {
    return {
      nao_aplicavel: true,
      motivo: "no_applicable_requirements",
      alerta: "Diagnóstico parcial: nenhuma fonte retornou perguntas para os NCMs informados. Equipe SOLARIS notificada.",
    };
  }

  return deduplicateById(allQuestions);
}
