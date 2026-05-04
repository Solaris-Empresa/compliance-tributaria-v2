/**
 * m3.6-rag-filter-by-lei.test.ts
 * Sprint M3.6 — Test contracts (it.todo) para Bug P0 (RAG filter por lei)
 *
 * Issue: #932
 *
 * STATUS: PENDING — testes serão implementados pelo PR de produção que
 * fizer `it.todo()` virar `it()` com código real. Cada `it.todo()` representa
 * um critério de aceite verificável.
 *
 * REGRA-ORQ-27 (Lição #59): cada teste valida CONSUMPTION efetivo
 * (não apenas assemble point). Spy no caller final OU asserção sobre query
 * SQL gerada por drizzle.
 *
 * Vinculadas:
 * - Issue #932 (M3.6 — RAG filter por lei + IA Gen description)
 * - PR #918 (M3-AC-11/12 padrão de spy queryRagFn já estabelecido)
 * - REGRA-ORQ-27 (PR #917)
 */
import { describe, it } from "vitest";

describe("M3.6 P0 — RAG filter por documento-fonte (lei)", () => {
  it.todo(
    "queryRag aceita parâmetro leiFilter opcional (4º argumento) — server/lib/rag-query.ts:14"
  );

  it.todo(
    "fetchCandidates aplica inArray(ragDocuments.lei, leiFilter) quando definido — server/rag-retriever.ts:113"
  );

  it.todo(
    "Q.NBS (generateServiceQuestions) chama queryRagFn com leiFilter=['lc214','lc227'] — server/lib/service-questions.ts:100"
  );

  it.todo(
    "backward-compat: leiFilter undefined → comportamento idêntico ao legado (sem filtro lei na query SQL)"
  );

  // M3.6 Manus review (2026-05-04): test contract adicional para fechar coverage
  // do P0. Sem este teste, implementador pode propagar leiFilter em retrieveArticles
  // mas esquecer retrieveArticlesFast — bug persiste em callsites que usam a versão "fast".
  it.todo(
    "retrieveArticlesFast aceita e propaga leiFilter para fetchCandidates — server/rag-retriever.ts:~289"
  );
});
