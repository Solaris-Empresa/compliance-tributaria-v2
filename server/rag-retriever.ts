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
import { or, like, inArray, and } from "drizzle-orm";
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
 * @param cnaes        - Lista de CNAEs da empresa
 * @param contextQuery - Texto descrevendo o contexto (regime, operações, etc.)
 * @param topK         - Número máximo de artigos a retornar (padrão: 5)
 * @param usageOpts    - Opções de telemetria (L-RAG-01)
 */
export async function retrieveArticles(
  cnaes: string[],
  contextQuery: string,
  topK = 5,
  leiFilter?: string[],
  usageOpts: RAGUsageOptions = {}
): Promise<RAGContext> {
  const keywords = extractKeywords(contextQuery);

  // 1. Buscar candidatos (M3.6 #932: leiFilter limita corpus quando definido)
  const candidates = await fetchCandidates(cnaes, keywords, 20, leiFilter);

  // 2. Re-ranking via LLM
  const topArticles = await rerankWithLLM(candidates, contextQuery, topK);

  // 3. Formatar contexto
  const contextText = formatContextText(topArticles);

  // 4. L-RAG-01 — Telemetria async non-blocking (não aguarda, não bloqueia)
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
