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
import { rerankWithJina, isJinaRerankerEnabled } from "./lib/jina-reranker";

export interface RetrievedArticle {
  lei: string;
  artigo: string;
  titulo: string;
  conteudo: string;
  relevanceScore?: number;
  /** G11: anchor_id do chunk no banco — rastreabilidade para fundamentacao */
  anchorId?: string;
  /** D2-DETECTOR: artigo-pai (LC 214) que rege o regime deste chunk (Anexo/Decreto). */
  artigoPai?: string;
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
    artigoPai: r.artigo_pai ?? undefined,
  }));
}

// ─── Issue #997 + CORPUS-RFC-006: Three-Pass Retrieval CNAE-aware + NCM ────────
//
// Issue #997 (2026-05-06): Two-Pass com LIMIT 10 cada → max 20 candidatos.
// CORPUS-RFC-006 Sprint 0 (2026-05-12): ampliação para Three-Pass + LIMIT 20.
//
// Root cause endereçado: chunks setoriais (Art. 128-260 LC 214 + Anexos) e
// Anexo IX (NCMs exatos) existiam no corpus mas o LIMIT 10 por pass + LIKE
// genérico do Pass 1 nunca os entregavam ao LLM re-ranker quando boundary CNAE
// trazia outros chunks setoriais à frente. Caso #5040001: CNAE 4623-1/09 +
// NCM 2304/2306 → Art. 128-134 (saúde) ocupavam slots 1-7, Art. 138 (insumos
// agropecuários) em posição 11 era excluído → corpus_gap_setorial.
//
// Pass 1 (genérico): fetchCandidates LIMIT 20 (CORPUS-RFC-006 D4 — era 10).
// Pass 2 (setorial CNAE-aware): fetchSetorialCandidates LIMIT 20 (D4 — era 10).
//   - Filtro artigo: REGEXP_SUBSTR(artigo, '[0-9]+') BETWEEN 128 AND 260 OR Anexo%
//   - Filtro cnaeGroups boundary-aware (evita falso-positivo universais)
// Pass 3 (NCM-targeted — CORPUS-RFC-006 P3): fetchNcmCandidates LIMIT 5/NCM × 3 NCMs.
//   - Extrai NCMs do contextQuery (regex \b\d{4}(?:\.\d{2})?\b)
//   - LIKE em conteudo + topicos
//   - Respeita leiFilter (consistência com Pass 1 e Pass 2)
// Merge dedup por anchor_id → até 55 candidatos únicos → LLM re-rank → topK.

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
export function isSetorialArtigo(
  artigo: string | undefined | null,
  artigoPai?: string | null
): boolean {
  // D2-DETECTOR: setorial se o PRÓPRIO artigo OU o artigo-pai (metadado) cai na faixa.
  // Reconhece "Art. 620 (parte N)" (Anexo do Decreto) via artigoPai='Art. 197' sem
  // hardcode do número 620 — substitui a verificação só-numérica (REGRA-ORQ-32).
  return inSetorialRange(artigo) || inSetorialRange(artigoPai);
}

/** Faixa setorial da LC 214: Anexo% OU primeiro número ∈ [128,260]. */
function inSetorialRange(artigo: string | undefined | null): boolean {
  if (!artigo) return false;
  if (/^Anexo/i.test(artigo)) return true;
  const n = artigoNum(artigo);
  return n !== null && n >= 128 && n <= 260;
}

/**
 * Fim da Parte Geral da LC 214 (normas gerais do IBS/CBS). Art. >= 128 inicia
 * os regimes específicos. Usado pelo D4-POOL para excluir a Parte Geral do pool
 * de Q.NCM, onde Art. 1-13 (definições genéricas) afogam o reranker e impedem
 * a seleção de conteúdo NCM-específico (ex.: Art. 620/Anexo).
 *
 * TECH-DEBT (REGRA-ORQ-32): o número 128 é interino. A solução sistêmica é
 * classificar setorialidade por metadado (artigo_pai/tipo) — issue D2-DETECTOR
 * (FASE 2). O mesmo número mágico aparece em isSetorialArtigo acima.
 */
const PARTE_GERAL_LC214_FIM = 128;

/** Extrai o primeiro número de um identificador de artigo ("Art. 139" → 139). */
function artigoNum(artigo: string | undefined | null): number | null {
  if (!artigo) return null;
  const m = /(\d+)/.exec(artigo);
  return m ? parseInt(m[1]!, 10) : null;
}

/**
 * D4-POOL: true se o chunk pertence à Parte Geral da LC 214 (Art. < 128) e,
 * portanto, deve ser excluído do pool de Q.NCM. Escopo restrito a lei==='lc214'
 * — decreto/resolução/tabela_ncm têm numeração própria e NÃO são filtrados
 * (evita excluir, p.ex., o chunk do NCM 0102.xx, cujo "artigo" começa com 0102).
 */
export function isParteGeralLc214(
  lei: string,
  artigo: string | undefined | null
): boolean {
  if (lei !== "lc214") return false;
  return (artigoNum(artigo) ?? Infinity) < PARTE_GERAL_LC214_FIM;
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
 * RAG-1-FIX (#1375) — Especificação JS canônica da condição de pertencimento
 * ao POOL UNIVERSAL de chunks setoriais.
 *
 * Um chunk só pertence ao pool universal quando `cnaeGroups` é genuinamente
 * vazio (NULL ou string vazia). Chunks com qualquer grupo preenchido (ex:
 * "64,65,66" = financeiro) são SETORIAIS e NÃO devem entrar no pool universal.
 *
 * O filtro SQL em `fetchSetorialCandidates` implementa a MESMA condição:
 *   `(cnaeGroups IS NULL OR cnaeGroups = '')`
 *
 * Substitui o proxy incorreto `LENGTH(cnaeGroups) < 50`, que classificava
 * ~2.174 chunks setoriais como universais (causa-raiz do GROUNDING-1).
 * Ver Lição #101 (boundary é por match-de-grupo, não por LENGTH).
 */
export function belongsToUniversalPool(
  cnaeGroups: string | null | undefined,
): boolean {
  return cnaeGroups == null || cnaeGroups.trim() === "";
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
    // RAG-1-FIX (#1375): apenas chunks genuinamente universais (cnaeGroups
    // vazio/NULL) entram no pool. O proxy `LENGTH(cnaeGroups) < 50` incluía
    // ~2.174 chunks SETORIAIS (ex: "64,65,66" = financeiro) no pool universal
    // → causa-raiz do GROUNDING-1 (Art. 233 LC 214 em briefing de transporte).
    // Spec JS canônica desta condição: belongsToUniversalPool().
    sql`(cnaeGroups IS NULL OR cnaeGroups = '')`,
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
    artigoPai: r.artigo_pai ?? undefined,
  }));
}

/**
 * Merge Pass 1 + Pass 2 + Pass 3 com dedup por anchor_id (preserva ordem do primeiro).
 *
 * Chunks com anchor_id idêntico aparecendo em múltiplos passes só entram uma vez.
 * Chunks sem anchor_id (legacy) são deduplicados por chave composta
 * `lei-artigo-titulo[:50]`.
 *
 * CORPUS-RFC-006: pass3 é opcional para retrocompat com callers existentes.
 */
export function mergeAndDedup(
  pass1: RetrievedArticle[],
  pass2: RetrievedArticle[],
  pass3: RetrievedArticle[] = [],
): RetrievedArticle[] {
  const seen = new Set<string>();
  const merged: RetrievedArticle[] = [];
  for (const art of [...pass1, ...pass2, ...pass3]) {
    const key = art.anchorId ?? `${art.lei}-${art.artigo}-${art.titulo.slice(0, 50)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(art);
  }
  return merged;
}

/**
 * Extrai códigos NCM do contextQuery via regex.
 *
 * NCM é numérico de 4-8 dígitos. Aceita:
 *   - 4 dígitos: "2304" (heading)
 *   - 6 dígitos com ponto: "2304.00" (subheading)
 *   - 8 dígitos: "23040010" ou "2304.00.10" (item completo)
 *
 * Boundary `\b` evita capturar anos ("2026") ou parte de outros números.
 * Padrão deliberadamente conservador: \d{4}(?:\.\d{2})? — 4 dígitos +
 * subheading opcional. Coincide com convenção interna do projeto.
 *
 * CORPUS-RFC-006 P3 — exportada para teste isolado.
 */
export function extractNcmsFromContext(contextQuery: string): string[] {
  const matches = contextQuery.match(/\b\d{4}(?:\.\d{2})?\b/g) ?? [];
  // Dedup mantendo ordem de primeira ocorrência
  return Array.from(new Set(matches));
}

/**
 * Pass 3 NCM-Targeted: garante que chunks com NCMs exatos (Anexo IX)
 * entrem no pool de candidatos.
 *
 * Estratégia: extrai NCMs do contextQuery, faz LIKE em `conteudo` e `topicos`
 * para cada NCM (até 3 primeiros), limite 5 chunks por NCM = até 15 candidatos
 * totais. Respeita leiFilter para consistência com Pass 1 e Pass 2.
 *
 * Falha silenciosa: erro de DB retorna [] (Pass 3 é enrichment).
 *
 * CORPUS-RFC-006 P3 — Sprint 0.
 */
async function fetchNcmCandidates(
  contextQuery: string,
  leiFilter?: string[],
): Promise<RetrievedArticle[]> {
  const ncms = extractNcmsFromContext(contextQuery).slice(0, 3);
  if (ncms.length === 0) return [];

  const dbConn = await getDb();
  if (!dbConn) return [];

  const leiCond = (leiFilter && leiFilter.length > 0)
    // @ts-expect-error enum-narrowing
    ? inArray(ragDocuments.lei, leiFilter)
    : undefined;

  const results: RetrievedArticle[] = [];

  for (const ncm of ncms) {
    try {
      const ncmCond = or(
        like(ragDocuments.conteudo, `%${ncm}%`),
        like(ragDocuments.topicos, `%${ncm}%`),
      );
      const finalCond = leiCond ? and(ncmCond, leiCond) : ncmCond;
      const rows = await dbConn
        .select()
        .from(ragDocuments)
        .where(finalCond)
        .limit(5);
      for (const r of rows) {
        results.push({
          lei: r.lei,
          artigo: r.artigo,
          titulo: r.titulo,
          conteudo: r.conteudo,
          anchorId: r.anchor_id ?? undefined,
          artigoPai: r.artigo_pai ?? undefined,
        });
      }
    } catch {
      // Pass 3 é enrichment — falha de um NCM não bloqueia os outros
      continue;
    }
  }

  return results;
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
      // COL-CONF: normalizar para [0,1] — relevanceScore vira `confidence` em
      // product-questions.ts:158 e service-questions.ts:105 (ambos esperam [0,1];
      // ver tracked-question.ts:42). Antes: (topK-rank) → {3,2,1}, fora da faixa.
      relevanceScore: (topK - rank) / topK,
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
 * Issue #997 + CORPUS-RFC-006 (Three-Pass Retrieval CNAE-aware + NCM):
 *   Pass 1 genérico (LIMIT 20) + Pass 2 setorial CNAE-aware (LIMIT 20)
 *   + Pass 3 NCM-targeted (até 15) → merge dedup → até 55 candidatos
 *   → LLM re-rank → topK.
 *
 * Backward-compat: quando `skipSetorialPass=true` (default `false`), o Pass 2
 * é pulado. Pass 3 NCM-targeted continua ativo (não depende de archetype CNAE).
 * Útil quando archetype está ausente — não há grupos CNAE para filtrar
 * setorialmente, mas NCMs podem estar no contextQuery.
 *
 * @param cnaes             - Lista de CNAEs da empresa
 * @param contextQuery      - Texto descrevendo o contexto (regime, operações, etc.)
 * @param topK              - Número máximo de artigos a retornar (padrão: 5)
 * @param leiFilter         - Whitelist opcional de leis
 * @param usageOpts         - Opções de telemetria (L-RAG-01)
 * @param skipSetorialPass  - Issue #997: pular Pass 2 setorial (backward-compat
 *                            quando archetype ausente). Default `false`.
 * @param excludeParteGeralLc214 - D4-POOL: exclui a Parte Geral da LC 214
 *                            (Art. < 128) do pool antes do rerank. Usado por
 *                            Q.NCM. Default `false` (briefing/Q.NBS inalterados).
 */
export async function retrieveArticles(
  cnaes: string[],
  contextQuery: string,
  topK = 5,
  leiFilter?: string[],
  usageOpts: RAGUsageOptions = {},
  skipSetorialPass = false,
  excludeParteGeralLc214 = false,
): Promise<RAGContext> {
  const keywords = extractKeywords(contextQuery);
  const cnaeGroups = extractCnaeGroups(cnaes);

  // CORPUS-RFC-006 D4: Pass 1 e Pass 2 ampliados de LIMIT 10 → LIMIT 20 cada.
  // Motivação: Art. 138 (insumos agropecuários) aparecia na posição 11 quando
  // boundary CNAE "46" trazia Art. 128-134 (saúde) consumindo slots 1-7. Com
  // LIMIT 10 o chunk era excluído antes do rerank → corpus_gap_setorial.
  // Pool pós-dedup passa de até 20 para até 40 candidatos antes do Pass 3.

  // Pass 1 genérico — LIMIT 20 (CORPUS-RFC-006 D4).
  const pass1Candidates = await fetchCandidates(cnaes, keywords, 20, leiFilter);

  // Pass 2 setorial CNAE-aware — LIMIT 20 (CORPUS-RFC-006 D4) — Issue #997 AC1.
  const pass2Candidates = skipSetorialPass
    ? []
    : await fetchSetorialCandidates(cnaeGroups, 20, leiFilter);

  // CORPUS-RFC-006 P3: Pass 3 NCM-Targeted — garante que chunks Anexo IX (com
  // NCMs exatos embutidos) entrem no pool. Extrai até 3 NCMs do contextQuery
  // (4 dígitos com sub-classificação opcional) e busca via LIKE em conteudo/topicos.
  const pass3Candidates = await fetchNcmCandidates(contextQuery, leiFilter);

  // Merge dedup por anchor_id → até 55 candidatos únicos (20 + 20 + 15).
  const merged = mergeAndDedup(pass1Candidates, pass2Candidates, pass3Candidates);

  // D4-POOL: para Q.NCM, exclui a Parte Geral da LC 214 (Art. 1-127) do pool.
  // Essas definições genéricas casam keywords ("IBS CBS alíquota") e dominam o
  // reranker, descartando conteúdo NCM-específico (Art. 620/Anexo). Escopo restrito
  // a lei==='lc214' — a Parte Geral só existe na LC 214; decreto/resolução/tabela_ncm
  // têm numeração própria (evita excluir, p.ex., o chunk do NCM 0102.xx). Ver #997.
  const candidates = excludeParteGeralLc214
    ? merged.filter((c) => !isParteGeralLc214(c.lei, c.artigo))
    : merged;

  // CORPUS-RFC-007 — Jina Reranker v3 dual pipeline:
  //   - JINA_RERANKER_ENABLED=false (default): pipeline idêntico ao anterior
  //   - JINA_RERANKER_ENABLED=true: Jina pré-filtra/ordena antes do GPT-4.1
  //
  // rerankWithJina NUNCA lança; em qualquer falha devolve `candidates`
  // inalterado (Lição #67 — degradação graciosa). Pool passado para o
  // GPT é reduzido a até 20 quando Jina opera com sucesso, mantendo as
  // 55 entradas originais em caso de fallback.
  const prerankedCandidates = isJinaRerankerEnabled()
    ? await rerankWithJina(contextQuery, candidates, 20)
    : candidates;

  // Re-ranking via LLM
  const topArticles = await rerankWithLLM(prerankedCandidates, contextQuery, topK);

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
