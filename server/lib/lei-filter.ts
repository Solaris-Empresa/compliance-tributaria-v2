/**
 * server/lib/lei-filter.ts
 *
 * Issue #1094 — derivação determinística de `leiFilter` por regime tributário.
 *
 * Achado smoke test M2 (2026-05-19): sem leiFilter explícito, o re-ranker
 * GPT-4.1 prioriza LC 214 por relevância semântica e descarta lc123 /
 * resolucao_cgsn_140 — projetos `simples_nacional` não consultam os chunks
 * da Onda 2. Para esses projetos, restringimos o corpus consultado.
 *
 * Pura e determinística — testável isoladamente (lei-filter.test.ts T1–T3).
 * Demais regimes mantêm comportamento atual (`undefined` = corpus completo).
 */

/** Corpus priorizado para regime Simples Nacional (decisão P.O. #1094). */
export const SIMPLES_NACIONAL_LEI_FILTER = [
  "lc123",
  "resolucao_cgsn_140",
  "lc214",
  "lc227",
  "decreto12955",
] as const;

/**
 * Retorna o leiFilter para `retrieveArticles` conforme o regime tributário.
 * `simples_nacional` → lista Onda 2 + LC214/227 + decreto12955.
 * Qualquer outro valor (ou ausente) → `undefined` (comportamento atual:
 * corpus completo, sem filtro).
 */
export function deriveLeiFilterForRegime(
  taxRegime: string | null | undefined
): string[] | undefined {
  return taxRegime === "simples_nacional"
    ? [...SIMPLES_NACIONAL_LEI_FILTER]
    : undefined;
}

/**
 * Frente B (BUG-FONTES) — Ramo 2 Opção 1: leiFilter do **2º passe** de retrieval
 * do briefing, dedicado a garantir presença de regulamentação operacional que o
 * reranker GPT-4.1 descarta no 1º passe.
 *
 * Spike 2026-05-21 (`[SPIKE-B]`): com leiFilter union no 1º passe, o reranker
 * ainda escolheu lc214 em 100% dos 7 slots — decreto/cgibs6 nunca surgem. Logo,
 * o fix é um 2º passe restrito (topK pequeno) cujo resultado é anexado ao
 * regulatoryContext (decisão P.O. 2026-05-21; quota global no rag-retriever
 * rejeitada por blast radius).
 *
 * `simples_nacional` → apenas `decreto12955` (SN não recolhe IBS → sem CGIBS 6).
 * Demais regimes → `decreto12955` + `resolucao_cgibs_6` (CBS + IBS).
 *
 * Pura e determinística — testável isoladamente (lei-filter.test.ts).
 */
export function decretoLeiFilterForRegime(
  taxRegime: string | null | undefined
): string[] {
  return taxRegime === "simples_nacional"
    ? ["decreto12955"]
    : ["decreto12955", "resolucao_cgibs_6"];
}
