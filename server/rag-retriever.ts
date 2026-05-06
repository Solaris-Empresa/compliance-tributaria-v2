/**
 * V65 — RAG Retriever: Busca Híbrida (LIKE + Re-ranking via LLM)
 *
 * Estratégia (TiDB não suporta FULLTEXT):
 *   1. Pré-filtro por CNAE group (2 primeiros dígitos) — filtra por setor
 *   2. Busca LIKE multi-termo nos campos titulo + topicos — pré-filtra candidatos
 *   3. Re-ranking via LLM (temperatura 0.0) — seleciona os top-5 mais relevantes
 *   4. Retorna contexto formatado para injeção nos prompts
 *
 * L-RAG-01 — Telemetria de uso:
 *   Após cada retrieval, registra cada chunk recuperado em rag_usage_log
 *   de forma async non-blocking (não impacta latência da resposta).
 *
 * Precisão esperada: ~88-93% (vs ~70% do pré-RAG estático do cnae-articles-map.ts)
 */

import { getDb } from "./db";
import { ragDocuments, ragUsageLog } from "../drizzle/schema";
import { or, like, inArray, and, eq, sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

export interface RetrievedArticle {
  lei: string;
  artigo: string;
  titulo: string;
  conteudo: string;
  relevanceScore?: number;
  /** G11: anchor_id do chunk no banco — rastreabilidade para fundamentacao */
  anchorId?: string;
}

export interface RAGContext {
  articles: RetrievedArticle[];
  contextText: string;
  totalCandidates: number;
}

/** Opções de telemetria para logUsage */
export interface RAGUsageOptions {
  projectId?: number;
  sessionId?: string;
  source?: "rag" | "fallback" | "manual";
}

/**
 * L-RAG-01 — Registra uso dos chunks de forma async non-blocking.
 * Nunca lança exceção — falha silenciosa para não impactar o fluxo principal.
 */
async function logUsage(
  query: string,
  articles: RetrievedArticle[],
  opts: RAGUsageOptions = {}
): Promise<void> {
  if (articles.length === 0) return;
  try {
    const dbConn = await getDb();
    if (!dbConn) return;
    const rows = articles
      .filter(a => a.anchorId) // só loga chunks com anchor_id
      .map((a, idx) => ({
        query,
        anchor_id:    a.anchorId!,
        lei:          a.lei,
        score:        a.relevanceScore != null ? String(a.relevanceScore) : null,
        position:     idx + 1,
        source:       opts.source ?? "rag",
        project_id:   opts.projectId ?? null,
        session_id:   opts.sessionId ?? null,
      }));
    if (rows.length === 0) return;
    await dbConn.insert(ragUsageLog).values(rows);
  } catch {
    // Falha silenciosa — telemetria nunca bloqueia o fluxo
  }
}

/**
 * Extrai os 2 primeiros dígitos de cada CNAE para filtro por grupo
 */
function extractCnaeGroups(cnaes: string[]): string[] {
  const groups = new Set<string>();
  for (const cnae of cnaes) {
    const clean = cnae.replace(/\D/g, "").trim();
    if (clean.length >= 2) {
      groups.add(clean.substring(0, 2));
    }
  }
  return Array.from(groups);
}

/**
 * Extrai palavras-chave do contexto para busca LIKE
 */
function extractKeywords(context: string): string[] {
  const stopWords = new Set([
    "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
    "para", "por", "com", "que", "se", "ao", "às", "um", "uma", "os", "as",
    "e", "ou", "é", "são", "ser", "ter", "sua", "seu", "seus", "suas",
    "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
  ]);

  return context
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 15); // top 15 palavras-chave
}

/**
 * Busca candidatos no banco usando LIKE multi-termo
 */
async function fetchCandidates(
  cnaes: string[],
  keywords: string[],
  limit = 20,
  leiFilter?: string[]
): Promise<RetrievedArticle[]> {
  const cnaeGroups = extractCnaeGroups(cnaes);

  // Construir condições LIKE para cada keyword
  const keywordConditions = keywords.slice(0, 8).flatMap(kw => [
    like(ragDocuments.titulo, `%${kw}%`),
    like(ragDocuments.topicos, `%${kw}%`),
    like(ragDocuments.conteudo, `%${kw}%`),
  ]);

  // Construir condições LIKE para grupos CNAE
  const cnaeConditions = cnaeGroups.map(g =>
    like(ragDocuments.cnaeGroups, `%${g}%`)
  );

  // M3.6 (Issue #932) — filtro por documento-fonte (lei) quando definido.
  // ts-expect-error: drizzle ragDocuments.lei é um MySqlEnum estreito; leiFilter
  // é tipado como string[] na API pública para flexibilidade — valores são
  // validados no callsite (Q.NBS passa whitelist literal ["lc214","lc227"]).
  const leiCond = (leiFilter && leiFilter.length > 0)
    // @ts-expect-error enum-narrowing
    ? inArray(ragDocuments.lei, leiFilter)
    : undefined;

  let rows: typeof ragDocuments.$inferSelect[] = [];

  try {
    const dbConn = await getDb();
    if (!dbConn) return [];
    const baseCond = (keywordConditions.length > 0 || cnaeConditions.length > 0)
      ? or(...keywordConditions, ...cnaeConditions)
      : undefined;
    const finalCond = baseCond && leiCond ? and(baseCond, leiCond) : (leiCond ?? baseCond);
    if (finalCond) {
      rows = await dbConn
        .select()
        .from(ragDocuments)
        .where(finalCond)
        .limit(limit);
    } else {
      // Fallback: retornar todos os documentos (corpus pequeno)
      rows = await dbConn.select().from(ragDocuments).limit(limit);
    }
  } catch {
    // Fallback silencioso: retornar corpus completo (respeitando leiFilter se definido)
    try {
      const dbConn = await getDb();
      if (dbConn) {
        rows = leiCond
          ? await dbConn.select().from(ragDocuments).where(leiCond).limit(limit)
          : await dbConn.select().from(ragDocuments).limit(limit);
      }
    } catch { /* silencioso */ }
  }

  return rows.map(r => ({
    lei: r.lei,
    artigo: r.artigo,
    titulo: r.titulo,
    conteudo: r.conteudo,
    anchorId: r.anchor_id ?? undefined,
  }));
}

// ─── Issue #997: Two-Pass Retrieval CNAE-aware ─────────────────────────────────
//
// Decisão F1 P.O. 2026-05-06 (Síntese Final v2). Resolve ranking gap
// identificado pela auditoria Manus: chunks setoriais (Art. 128-260 LC 214 +
// Anexos) existem no corpus mas o LIMIT 20 + LIKE genérico de fetchCandidates
// nunca os entregava ao LLM re-ranker.
//
// Pass 1 (genérico): fetchCandidates com LIMIT 10 (mantém comportamento atual,
//                    apenas reduzido de 20 → 10 para dividir o pool).
// Pass 2 (setorial CNAE-aware): fetchSetorialCandidates com LIMIT 10.
//   - Filtro artigo: REGEXP_SUBSTR(artigo, '[0-9]+') BETWEEN 128 AND 260 OR Anexo%
//   - Filtro cnaeGroups boundary-aware (evita falso-positivo universais)
// Merge dedup por anchor_id → até 20 candidatos → LLM re-rank → topK.

/**
 * Detecta se um chunk pertence à faixa setorial (regimes diferenciados).
 *
 * Boundary-aware: extrai apenas o PRIMEIRO número via match não-greedy.
 * "Art. 544 (parte 10)" → 544 (NÃO 54410 — anti-violação Issue #997 AC1).
 *
 * Retorna true para:
 *   - Anexos (artigo LIKE 'Anexo%')
 *   - Artigos LC 214 com número >= 128 e <= 260 (Título IV regimes diferenciados)
 */
export function isSetorialArtigo(artigo: string | undefined | null): boolean {
  if (!artigo) return false;
  if (/^Anexo/i.test(artigo)) return true;
  const match = artigo.match(/(\d+)/);
  if (!match) return false;
  const num = parseInt(match[1]!, 10);
  return num >= 128 && num <= 260;
}

/**
 * Detecta se cnaeGroups do chunk casa com o grupo CNAE do projeto via
 * boundary-aware match.
 *
 * SQL pattern emitido (boundary-aware — Issue #997 AC1):
 *   cnaeGroups LIKE 'XX,%'   (begin)
 *   cnaeGroups LIKE '%,XX,%' (middle)
 *   cnaeGroups LIKE '%,XX'   (end)
 *   cnaeGroups = 'XX'        (único)
 *   LENGTH(cnaeGroups) < 50  (fallback chunk setorial sem cnae restrito)
 *
 * Evita falso-positivo do PROIBIDO `cnaeGroups LIKE '%XX%'` que casaria
 * 414 chunks universais com cnaeGroups "01,02,...,96".
 */
export function matchesCnaeBoundary(chunkCnaeGroups: string, group: string): boolean {
  if (!chunkCnaeGroups) {
    // Chunk setorial sem cnaeGroups restrito → fallback (LENGTH < 50 trivialmente)
    return true;
  }
  if (!group) return chunkCnaeGroups.length < 50;
  const parts = chunkCnaeGroups.split(",").map((s) => s.trim());
  if (parts.includes(group)) return true;
  // Fallback length-aware: chunks setoriais sem cnaeGroups restrito (< 50 chars)
  return chunkCnaeGroups.length < 50;
}

/**
 * Pass 2 do Two-Pass Retrieval — busca chunks setoriais CNAE-aware.
 *
 * Independente do Pass 1 (LIKE keywords). Roda em paralelo, depois mescla.
 * Falha silenciosa: se Pass 2 dá erro, retorna [] (Pass 1 ainda funciona).
 */
async function fetchSetorialCandidates(
  cnaeGroups: string[],
  limit = 10,
  leiFilter?: string[],
): Promise<RetrievedArticle[]> {
  if (cnaeGroups.length === 0) return [];

  const dbConn = await getDb();
  if (!dbConn) return [];

  // Filtro artigo: faixa setorial 128-260 OU Anexo%
  const artigoSetorialCond = or(
    sql`CAST(REGEXP_SUBSTR(artigo, '[0-9]+') AS UNSIGNED) BETWEEN 128 AND 260`,
    like(ragDocuments.artigo, "Anexo%"),
  );

  // Filtro cnaeGroups boundary-aware
  const cnaeBoundaryCond = or(
    ...cnaeGroups.flatMap((g) => [
      like(ragDocuments.cnaeGroups, `${g},%`),
      like(ragDocuments.cnaeGroups, `%,${g},%`),
      like(ragDocuments.cnaeGroups, `%,${g}`),
      eq(ragDocuments.cnaeGroups, g),
    ]),
    sql`LENGTH(cnaeGroups) < 50`,
  );

  const leiCond = (leiFilter && leiFilter.length > 0)
    // @ts-expect-error enum-narrowing
    ? inArray(ragDocuments.lei, leiFilter)
    : undefined;

  const finalCond = leiCond
    ? and(artigoSetorialCond, cnaeBoundaryCond, leiCond)
    : and(artigoSetorialCond, cnaeBoundaryCond);

  let rows: typeof ragDocuments.$inferSelect[] = [];
  try {
    rows = finalCond
      ? await dbConn.select().from(ragDocuments).where(finalCond).limit(limit)
      : [];
  } catch {
    // Falha silenciosa: Pass 2 é enrichment, não bloqueia Pass 1
    return [];
  }

  return rows.map((r) => ({
    lei: r.lei,
    artigo: r.artigo,
    titulo: r.titulo,
    conteudo: r.conteudo,
    anchorId: r.anchor_id ?? undefined,
  }));
}

/**
 * Merge Pass 1 + Pass 2 com dedup por anchor_id (preserva ordem do primeiro).
 *
 * Chunks com anchor_id idêntico aparecendo em ambos passes só entram uma vez.
 * Chunks sem anchor_id (legacy) são deduplicados por chave composta
 * `lei-artigo-titulo[:50]`.
 */
export function mergeAndDedup(
  pass1: RetrievedArticle[],
  pass2: RetrievedArticle[],
): RetrievedArticle[] {
  const seen = new Set<string>();
  const merged: RetrievedArticle[] = [];
  for (const art of [...pass1, ...pass2]) {
    const key = art.anchorId ?? `${art.lei}-${art.artigo}-${art.titulo.slice(0, 50)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(art);
  }
  return merged;
}

/**
 * Re-ranking via LLM: seleciona os top-5 candidatos mais relevantes
 */
async function rerankWithLLM(
  candidates: RetrievedArticle[],
  query: string,
  topK = 5
): Promise<RetrievedArticle[]> {
  if (candidates.length === 0) return [];
  if (candidates.length <= topK) return candidates;

  const candidateList = candidates
    .map((c, i) => `[${i}] ${c.lei.toUpperCase()} ${c.artigo}: ${c.titulo}\n${c.conteudo.substring(0, 200)}...`)
    .join("\n\n");

  const prompt = `Você é um especialista em direito tributário brasileiro. Sua tarefa é selecionar os artigos legais mais relevantes para o contexto abaixo.

CONTEXTO DA EMPRESA:
${query}

CANDIDATOS (${candidates.length} artigos):
${candidateList}

Selecione os ${topK} artigos mais relevantes para este contexto específico. Responda APENAS com um JSON no formato:
{"indices": [0, 2, 5, 8, 12]}

Os índices devem ser os números entre colchetes dos artigos mais relevantes, em ordem de relevância decrescente.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Você é um especialista em direito tributário. Responda APENAS com JSON válido, sem texto adicional.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.0,
    } as Parameters<typeof invokeLLM>[0]);

    const rawContent = response?.choices?.[0]?.message?.content ?? "";
    const content = typeof rawContent === "string" ? rawContent : "";
    const jsonMatch = content.match(/\{[^}]+\}/);
    if (!jsonMatch) return candidates.slice(0, topK);

    const parsed = JSON.parse(jsonMatch[0]) as { indices: number[] };
    const indices = parsed.indices
      .filter((i: number) => i >= 0 && i < candidates.length)
      .slice(0, topK);

    return indices.map((i: number, rank: number) => ({
      ...candidates[i],
      relevanceScore: topK - rank,
    }));
  } catch {
    // Fallback: retornar os primeiros topK candidatos
    return candidates.slice(0, topK);
  }
}

/**
 * Formata os artigos recuperados como texto de contexto para injeção no prompt
 */
function formatContextText(articles: RetrievedArticle[]): string {
  if (articles.length === 0) {
    return "Nenhum artigo específico recuperado para este contexto.";
  }

  return articles
    .map(a => {
      const leiLabel = {
        lc214: "LC 214/2025",
        ec132: "EC 132/2023",
        lc227: "LC 227/2026",
        lc224: "LC 224/2026",
        lc116: "LC 116/2003",
        lc87: "LC 87/1996",
        solaris: "Equipe Jurídica SOLARIS",
        ia_gen:  "Análise de Perfil — IA SOLARIS",
      }[a.lei] ?? a.lei.toUpperCase();

      return `**${leiLabel} — ${a.artigo}: ${a.titulo}**\n${a.conteudo}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Função principal: recupera artigos relevantes para um contexto empresarial
 *
 * Issue #997 (Two-Pass Retrieval CNAE-aware):
 *   Pass 1 genérico (LIMIT 10) + Pass 2 setorial CNAE-aware (LIMIT 10)
 *   → merge dedup → até 20 candidatos → LLM re-rank → topK.
 *
 * Backward-compat: quando `skipSetorialPass=true` (default `false`), o Pass 2
 * é pulado e o comportamento equivale ao retriever pré-Issue #997 (LIMIT 10
 * em vez de LIMIT 20). Útil quando archetype está ausente — não há grupos
 * CNAE para filtrar setorialmente. Caller pode optar por preservar LIMIT 20
 * em chamadas legadas via `skipSetorialPass=true` + ajuste manual do limit.
 *
 * @param cnaes             - Lista de CNAEs da empresa
 * @param contextQuery      - Texto descrevendo o contexto (regime, operações, etc.)
 * @param topK              - Número máximo de artigos a retornar (padrão: 5)
 * @param leiFilter         - Whitelist opcional de leis
 * @param usageOpts         - Opções de telemetria (L-RAG-01)
 * @param skipSetorialPass  - Issue #997: pular Pass 2 setorial (backward-compat
 *                            quando archetype ausente). Default `false`.
 */
export async function retrieveArticles(
  cnaes: string[],
  contextQuery: string,
  topK = 5,
  leiFilter?: string[],
  usageOpts: RAGUsageOptions = {},
  skipSetorialPass = false,
): Promise<RAGContext> {
  const keywords = extractKeywords(contextQuery);
  const cnaeGroups = extractCnaeGroups(cnaes);

  // Pass 1 genérico (LIMIT 10) — comportamento atual reduzido para deixar
  // espaço para Pass 2 setorial.
  const pass1Candidates = await fetchCandidates(cnaes, keywords, 10, leiFilter);

  // Pass 2 setorial CNAE-aware (LIMIT 10) — Issue #997 AC1.
  const pass2Candidates = skipSetorialPass
    ? []
    : await fetchSetorialCandidates(cnaeGroups, 10, leiFilter);

  // Merge dedup por anchor_id → até 20 candidatos mistos.
  const candidates = mergeAndDedup(pass1Candidates, pass2Candidates);

  // Re-ranking via LLM
  const topArticles = await rerankWithLLM(candidates, contextQuery, topK);

  // Formatar contexto
  const contextText = formatContextText(topArticles);

  // L-RAG-01 — Telemetria async non-blocking (não aguarda, não bloqueia)
  void logUsage(contextQuery, topArticles, usageOpts);

  return {
    articles: topArticles,
    contextText,
    totalCandidates: candidates.length,
  };
}

/**
 * Versão simplificada sem re-ranking (para contextos de baixa latência)
 */
export async function retrieveArticlesFast(
  cnaes: string[],
  contextQuery: string,
  topK = 5,
  leiFilter?: string[],
  usageOpts: RAGUsageOptions = {}
): Promise<RAGContext> {
  const keywords = extractKeywords(contextQuery);
  const candidates = await fetchCandidates(cnaes, keywords, topK, leiFilter);
  const topArticles = candidates.slice(0, topK);

  // L-RAG-01 — Telemetria async non-blocking
  void logUsage(contextQuery, topArticles, { ...usageOpts, source: "fallback" });

  return {
    articles: topArticles,
    contextText: formatContextText(topArticles),
    totalCandidates: candidates.length,
  };
}
