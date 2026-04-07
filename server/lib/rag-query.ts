/**
 * rag-query.ts — Sprint Z Z-01
 * Wrapper queryRag → retrieveArticles (desacopla product/service-questions do nome interno)
 * DEC-M3-05 v3 · ADR-0009
 */

import { retrieveArticles } from "../rag-retriever";
import type { RagChunk } from "./tracked-question";

/**
 * Busca chunks RAG para um ou mais CNAEs/NBSs com uma query de contexto.
 * Mapeia RetrievedArticle → RagChunk para uso em product-questions e service-questions.
 */
export async function queryRag(
  codes: string[],
  contextQuery: string,
  topK = 5
): Promise<RagChunk[]> {
  const result = await retrieveArticles(codes, contextQuery, topK);
  return result.articles.map(a => ({
    anchor_id: a.anchorId ?? `fallback-${Math.random().toString(36).slice(2, 8)}`,
    conteudo:  a.conteudo,
    artigo:    a.artigo,
    lei:       a.lei,
    score:     a.relevanceScore,
    topicos:   undefined, // RetrievedArticle não expõe topicos — categoria inferida por conteúdo
  }));
}
