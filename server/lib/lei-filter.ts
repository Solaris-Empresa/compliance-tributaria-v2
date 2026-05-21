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
 * Frente B (BUG-FONTES) — fallback regulatório quando nenhuma categoria ativa
 * tem `source_basis` em formato array. Rede de segurança; o caminho normal
 * deriva do banco.
 */
export const REGULATORY_LEI_FALLBACK = [
  "lc214",
  "decreto12955",
  "resolucao_cgibs_6",
] as const;

/**
 * Frente B — leiFilter data-driven: union deduplicada e ordenada das leis
 * declaradas em `source_basis` das categorias ativas. NÃO hardcode — lê do
 * banco (REGRA-ORQ-32). Fallback regulatório quando o union resulta vazio.
 *
 * Robusto a shape misto no banco: a Frente A2 gravou arrays de codigos de lei
 * (`["lc214","decreto12955"]`); linhas legadas gravaram string livre
 * (`"LC 214/2025 Arts..."`) — estas são ignoradas (não são codigos de lei).
 *
 * Pura e determinística — testável isoladamente (lei-filter.test.ts).
 */
export function buildLeiFilterFromSourceBasis(sourceBases: unknown[]): string[] {
  const leis = [
    ...new Set(
      sourceBases
        .filter((sb): sb is unknown[] => Array.isArray(sb))
        .flat()
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
    ),
  ].sort();
  return leis.length ? leis : [...REGULATORY_LEI_FALLBACK];
}
