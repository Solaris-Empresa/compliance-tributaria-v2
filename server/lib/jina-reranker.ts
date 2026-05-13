/**
 * Jina Reranker v3 — CORPUS-RFC-007 / Issue #1073
 *
 * Cliente para a API de re-ranking da Jina AI. Substitui o re-ranker GPT-4.1
 * quando JINA_RERANKER_ENABLED=true. Em qualquer falha (rede, timeout, 5xx
 * após retry), devolve os candidatos originais inalterados — caller pode
 * encadear GPT-4.1 sem try/catch (Lição #67 — degradação graciosa).
 *
 * Env vars:
 *   JINA_API_KEY            — chave de API obrigatória (sem ela, fallback direto)
 *   JINA_RERANKER_ENABLED   — feature flag ("true" liga; default "false")
 *   JINA_THRESHOLD          — corte mínimo de relevance_score (default 0.1)
 *
 * Timeout: 5000ms.  Retry: 1x após 1000ms.
 */

import type { RetrievedArticle } from "../rag-retriever";

const JINA_API_URL = "https://api.jina.ai/v1/rerank";
const JINA_MODEL = "jina-reranker-v3";
const TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 1000;

interface JinaRankResult {
  index: number;
  relevance_score: number;
}

interface JinaResponse {
  results: JinaRankResult[];
}

/**
 * Lê a feature flag em tempo de chamada (não em tempo de import) para que
 * testes possam alternar via `process.env` sem reload de módulo.
 */
export function isJinaRerankerEnabled(): boolean {
  return (process.env.JINA_RERANKER_ENABLED ?? "false").toLowerCase() === "true";
}

function getThreshold(): number {
  const raw = process.env.JINA_THRESHOLD;
  if (raw == null) return 0.1;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0.1;
}

/**
 * Chama a API Jina uma única vez. Lança em qualquer falha (network, timeout,
 * status não-2xx) para que o caller decida sobre retry/fallback.
 */
async function callJina(
  apiKey: string,
  query: string,
  candidates: RetrievedArticle[],
): Promise<JinaRankResult[]> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(JINA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: JINA_MODEL,
        query,
        documents: candidates.map(
          (c) =>
            `${c.lei.toUpperCase()} ${c.artigo}: ${c.titulo}\n${c.conteudo}`,
        ),
        top_n: candidates.length,
        return_documents: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Jina API ${response.status}`);
    }

    const data = (await response.json()) as JinaResponse;
    if (!Array.isArray(data?.results)) {
      throw new Error("Jina API: malformed response");
    }
    return data.results;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Re-rankeia `candidates` via Jina Reranker v3, devolvendo até `topK`
 * candidatos com `relevance_score >= JINA_THRESHOLD`, ordenados desc.
 *
 * Comportamento de falha (NUNCA lança):
 *   - Sem JINA_API_KEY            → devolve `candidates` inalterado
 *   - Lista vazia                 → devolve []
 *   - 5xx/network/timeout (twice) → devolve `candidates` inalterado
 *   - Resposta malformada         → devolve `candidates` inalterado
 *
 * @param query       Texto da busca (contextQuery do retriever)
 * @param candidates  Pool de candidatos pré-merge (até ~55 chunks)
 * @param topK        Limite máximo de resultados a retornar
 */
export async function rerankWithJina(
  query: string,
  candidates: RetrievedArticle[],
  topK: number,
): Promise<RetrievedArticle[]> {
  if (candidates.length === 0) return [];

  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) return candidates;

  const threshold = getThreshold();

  // 1 tentativa + 1 retry após 1s
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const results = await callJina(apiKey, query, candidates);
      const reranked: RetrievedArticle[] = [];
      for (const r of results) {
        if (r.relevance_score < threshold) continue;
        if (reranked.length >= topK) break;
        const original = candidates[r.index];
        if (!original) continue;
        reranked.push({ ...original, relevanceScore: r.relevance_score });
      }
      return reranked;
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
    }
  }

  return candidates;
}
