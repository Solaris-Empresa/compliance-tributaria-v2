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
import { isSetorialArtigo } from "../rag-retriever";

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

  // ─── Coleta RAG (Pass 1 + Pass 2 via queryRagFn) ─────────────────────────
  // Issue #997: separar coleta da geração para permitir quality gate
  // corpus_gap_setorial ANTES de invocar LLM (REGRA-ORQ-31 meta 98%).
  const ragChunksByNcm: Array<{ ncm: string; chunk: RagChunk }> = [];
  for (const ncm of ncmCodes) {
    const contextQuery = archetypeContext
      ? `IBS CBS alíquota produto NCM ${ncm} reforma tributária ${archetypeContext}`
      : `IBS CBS alíquota produto NCM ${ncm} reforma tributária`;
    let chunks: RagChunk[] = [];
    try {
      // Issue #997: skipSetorialPass quando archetype ausente (backward-compat).
      const skipSetorialPass = archetypeContext === "";
      // D4-POOL: excluir Parte Geral da LC 214 do pool de Q.NCM (Art. 1-127 são
      // definições genéricas que afogam o reranker). Só Q.NCM passa este flag.
      chunks = await queryRagFn([ncm, ...cnaeCodes], contextQuery, 3, undefined, skipSetorialPass, true);
    } catch {
      // RAG indisponível: continua sem perguntas RAG para este NCM
    }
    for (const chunk of chunks) {
      ragChunksByNcm.push({ ncm, chunk });
    }
  }

  // ─── Issue #1035 M1-NCM — Q.NCM = APENAS perguntas regulatórias (RAG+LLM) ──
  // SOLARIS Onda 1 fica exclusivamente no Q1 Solaris.
  // Análogo ao PR #1030 (Issue #1028 M1 para Q.CNAE).
  //
  // Mantemos a chamada com contextType='q_ncm' que aciona o airbag V1
  // em solaris-query.ts → retorna [] sempre. Isso preserva a estrutura
  // do gate corpus_gap_setorial abaixo (que checa solarisQuestions.length).
  //
  // ARQUITETURA SOLARIS — REGRA ABSOLUTA (Issue #1035 / P.O. confirmado)
  // Q3 NCM → RAG only. PROIBIDO injetar SOLARIS.
  let solarisQuestions: SolarisQuestion[] = [];
  try {
    solarisQuestions = await querySolarisFn(cnaeCodes, ["lc214", "lc227"], {
      contextType: "q_ncm", // Issue #1035 V1 — airbag bloqueia injeção
    });
  } catch {
    // SOLARIS indisponível: continua sem perguntas SOLARIS
  }

  // ─── Issue #997: Quality gate corpus_gap_setorial ────────────────────────
  // Filtra chunks setoriais (Art. >= 128 LC 214 ou Anexo%). Se zero setoriais
  // E zero SOLARIS → bloqueia geração com motivo "corpus_gap_setorial"
  // (REGRA-ORQ-31: gerar perguntas com base apenas em Parte Geral viola meta
  // 98% de confiança — é "falsa autoridade legal").
  //
  // Skip do gate se archetype ausente (backward-compat — retriever não rodou Pass 2).
  const setorialChunks = ragChunksByNcm.filter(({ chunk }) => isSetorialArtigo(chunk.artigo, chunk.artigoPai));
  const corpusGapSetorial = archetypeContext !== "" && setorialChunks.length === 0;

  if (corpusGapSetorial && solarisQuestions.length === 0) {
    return {
      nao_aplicavel: true,
      motivo: "corpus_gap_setorial",
      alerta:
        // COL-LABEL: mensagem honesta — a norma EXISTE no corpus; o que falhou foi a
        // recuperação com confiança suficiente (não é lacuna de corpus). O enum `motivo`
        // é mantido para não quebrar contrato (frontend/union/testes); o rename para
        // "retrieval_gap" está no backlog COL-LABEL-RENAME (Classe B, E2E).
        "Foi identificada possível incidência de norma setorial aplicável ao NCM informado; " +
        "contudo, o mecanismo de recuperação normativa não atingiu o grau mínimo de confiança " +
        "exigido para geração automática segura do questionário correspondente. " +
        "O caso foi encaminhado para revisão técnica e curadoria jurídica complementar " +
        "(corpus_gap_setorial).",
    };
  }

  // ─── Geração de perguntas ─────────────────────────────────────────────────
  const allQuestions: TrackedQuestion[] = [];

  // Quando há corpus_gap_setorial parcial (sem setorial RAG mas com SOLARIS),
  // pulamos geração via LLM dos chunks genéricos para não criar perguntas
  // com falsa autoridade. Apenas SOLARIS é emitido com alerta na resposta.
  const skipRagGeneration = corpusGapSetorial; // setoriais==0 e solaris>0 (já validado acima)

  if (!skipRagGeneration) {
    for (const { ncm, chunk } of ragChunksByNcm) {
      try {
        // Issue #1037 D2 — perfilOperacional do M1 archetype como contexto LLM.
        // kind padrão 'ncm' preserva template NCM byte-a-byte (apenas adiciona
        // linha extra de perfil se archetypeContext disponível).
        const texto = await generateQuestionFromChunk(chunk, ncm, {
          perfilOperacional: archetypeContext || undefined,
        });
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

  // Issue #1035 M1-NCM — Bloco de injeção SOLARIS REMOVIDO.
  // Q.NCM = APENAS perguntas regulatórias (RAG+LLM).
  // SOLARIS Onda 1 fica exclusivamente no Q1 Solaris.
  // O airbag V1 em solaris-query.ts garante que solarisQuestions === [] aqui;
  // este bloco é redundante mas removido por clareza arquitetural.
  // Para reativar: ver histórico git pre-Issue #1035.
  //
  // for (const sq of solarisQuestions) {
  //   allQuestions.push({ id: `solaris-${sq.id}`, fonte: "solaris", ... });
  // }
  void solarisQuestions; // referência preservada para gate corpus_gap_setorial abaixo
  void extractLeiRefFromSolaris; // import preservado para reativação futura

  // Issue #997: corpus_gap_parcial — RAG setorial vazio mas SOLARIS cobre.
  // Retorna apenas SOLARIS com alerta explicativo (terceiro caso do union QuestionResult).
  if (corpusGapSetorial && solarisQuestions.length > 0) {
    return {
      perguntas: deduplicateById(allQuestions),
      alerta:
        "Diagnóstico parcial: legislação setorial específica não recuperada para os NCMs " +
        "informados. Análise baseada apenas em perguntas SOLARIS curadas. Equipe notificada.",
    };
  }

  // M3.7 Item 5: nenhuma pergunta gerada → NO_QUESTION protocol (era buildProductFallback hardcoded)
  if (allQuestions.length === 0) {
    return {
      nao_aplicavel: true,
      motivo: "no_applicable_requirements",
      alerta: "Diagnóstico parcial: nenhuma fonte retornou perguntas para os NCMs informados. Equipe SOLARIS notificada.",
    };
  }

  return deduplicateById(allQuestions);
}
