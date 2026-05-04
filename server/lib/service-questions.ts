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

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Gera perguntas diagnósticas rastreadas para empresas de serviço (NBS).
 *
 * Fluxo:
 * 1. Se não é empresa de serviço → { nao_aplicavel: true, motivo: "not_service_company" }
 * 2. Se não tem NBS → { nao_aplicavel: true, motivo: "no_nbs_codes", alerta }
 * 3. Para cada NBS: busca RAG + perguntas SOLARIS filtradas por CNAE
 * 4. Deduplica e retorna TrackedQuestion[]
 * 5. Se zero perguntas geradas → { nao_aplicavel: true, motivo: "no_applicable_requirements", alerta }
 *
 * M3.7 Item 5 (REGRA-ORQ-29): NO_QUESTION protocol — sem requisito = sem pergunta.
 * Fallbacks hardcoded `buildServiceFallback` removidos (violavam Content Engine Rule #1).
 * Em falha de RAG/LLM/SOLARIS, retorna `nao_aplicavel: true` com motivo + alerta UI.
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
  companyProfile: { operationType?: string; archetype?: unknown },
  queryRagFn: typeof queryRag = queryRag,
  querySolarisFn: typeof querySolarisByCnaes = querySolarisByCnaes
): Promise<QuestionResult> {

  // P2: verificar se é empresa de serviço
  const companyType = inferCompanyType(companyProfile, cnaeCodes);
  if (companyType === "produto") {
    return { nao_aplicavel: true };
  }

  // M3.7 Item 5: sem NBS → NO_QUESTION protocol (era buildServiceFallback hardcoded)
  if (nbsCodes.length === 0) {
    return {
      nao_aplicavel: true,
      motivo: "no_nbs_codes",
      alerta: "Adicione códigos NBS para diagnóstico mais preciso sobre IBS/CBS em serviços.",
    };
  }

  // M3 NOVA-02: archetype context formatado para enriquecer contextQuery do RAG.
  // Backward-compat: arch=null → string vazia → contextQuery idêntico ao legado.
  const { getArchetypeContext } = await import("./archetype/getArchetypeContext");
  const archetypeContext = getArchetypeContext(companyProfile.archetype as never);

  const allQuestions: TrackedQuestion[] = [];

  // ─── Perguntas RAG por NBS ────────────────────────────────────────────────
  for (const nbs of nbsCodes) {
    const contextQuery = archetypeContext
      ? `IBS CBS alíquota serviço NBS ${nbs} reforma tributária ${archetypeContext}`
      : `IBS CBS alíquota serviço NBS ${nbs} reforma tributária`;
    let chunks: RagChunk[] = [];
    try {
      // M3.6 (Issue #932) — whitelist Q.NBS limita RAG a LC 214/2025 e LC 227/2026
      chunks = await queryRagFn([nbs, ...cnaeCodes], contextQuery, 3, ["lc214", "lc227"]);
    } catch {
      // RAG indisponível: continua sem perguntas RAG para este NBS
    }

    for (const chunk of chunks) {
      try {
        const texto = await generateQuestionFromChunk(chunk, nbs);
        allQuestions.push({
          id:         `rag-nbs-${nbs}-${chunk.anchor_id}`,
          fonte:      "regulatorio",
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

  // ─── Perguntas SOLARIS filtradas por CNAE + lei (paridade RAG) ───────────
  // M3.7 Item 11: whitelist Q.NBS limita SOLARIS a LC 214/2025 e LC 227/2026
  // (mesmo padrão do queryRagFn em service-questions.ts:101)
  let solarisQuestions: SolarisQuestion[] = [];
  try {
    solarisQuestions = await querySolarisFn(cnaeCodes, ["lc214", "lc227"]);
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

  // M3.7 Item 5: nenhuma pergunta gerada → NO_QUESTION protocol (era buildServiceFallback hardcoded)
  // ADR-010 Regra 5: registrar como skipped com motivo no_applicable_requirements
  if (allQuestions.length === 0) {
    return {
      nao_aplicavel: true,
      motivo: "no_applicable_requirements",
      alerta: "Diagnóstico parcial: nenhuma fonte retornou perguntas para os NBS informados. Equipe SOLARIS notificada.",
    };
  }

  return deduplicateById(allQuestions);
}
