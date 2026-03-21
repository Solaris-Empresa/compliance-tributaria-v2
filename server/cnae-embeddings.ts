/**
 * cnae-embeddings.ts — Busca semântica de CNAEs via embeddings vetoriais
 *
 * Substitui o cnae-rag.ts baseado em tokens e dicionário de sinônimos hard-coded.
 * Usa OpenAI text-embedding-3-small para busca por similaridade de cosseno.
 *
 * Fluxo:
 * 1. Gera embedding da query do usuário via OpenAI API
 * 2. Carrega todos os embeddings de CNAEs do banco (com cache em memória)
 * 3. Calcula similaridade de cosseno entre query e cada CNAE
 * 4. Retorna os top-N CNAEs mais similares como contexto para o LLM
 *
 * Vantagens sobre busca por tokens:
 * - "calcário" encontra "corretivos do solo" (semântica)
 * - "pizzaria" encontra "restaurantes" (semântica)
 * - "atacado de cereais" encontra múltiplos CNAEs relevantes
 * - Sem hard-code: funciona para qualquer descrição de negócio
 */

import { ENV } from "./_core/env";
import { getDb } from "./db";
import { cnaeEmbeddings } from "../drizzle/schema";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface CnaeCandidate {
  code: string;
  description: string;
  similarity: number;
}

// ─── Cache em memória ─────────────────────────────────────────────────────────

interface CachedEmbedding {
  cnaeCode: string;
  cnaeDescription: string;
  embedding: number[];
}

let embeddingCache: CachedEmbedding[] | null = null;
let cacheLoadedAt: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

async function loadEmbeddingCache(): Promise<CachedEmbedding[]> {
  const now = Date.now();
  if (embeddingCache && now - cacheLoadedAt < CACHE_TTL_MS) {
    return embeddingCache;
  }

  const db = await getDb();
  if (!db) {
    console.warn("[cnae-embeddings] Banco não disponível, cache não carregado");
    return [];
  }

  try {
    const rows = await db.select({
      cnaeCode: cnaeEmbeddings.cnaeCode,
      cnaeDescription: cnaeEmbeddings.cnaeDescription,
      embeddingJson: cnaeEmbeddings.embeddingJson,
    }).from(cnaeEmbeddings);

    embeddingCache = rows.map((row) => ({
      cnaeCode: row.cnaeCode,
      cnaeDescription: row.cnaeDescription,
      embedding: JSON.parse(row.embeddingJson) as number[],
    }));

    cacheLoadedAt = now;
    console.log(`[cnae-embeddings] Cache carregado: ${embeddingCache.length} CNAEs`);
    return embeddingCache;
  } catch (err) {
    console.error("[cnae-embeddings] Erro ao carregar cache:", err);
    return [];
  }
}

/** Invalida o cache (útil após re-geração de embeddings) */
export function invalidateEmbeddingCache(): void {
  embeddingCache = null;
  cacheLoadedAt = 0;
}

/**
 * Retorna o estado atual do cache em memória para fins de diagnóstico.
 * Não dispara carregamento — apenas lê o estado atual.
 */
export function getCacheStatus(): { loaded: boolean; size: number; ageMinutes: number } {
  const loaded = embeddingCache !== null && embeddingCache.length > 0;
  const size = embeddingCache?.length ?? 0;
  const ageMinutes = loaded
    ? Math.round((Date.now() - cacheLoadedAt) / 60_000)
    : 0;
  return { loaded, size, ageMinutes };
}

// ─── Similaridade de Cosseno ─────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Geração de Embedding da Query ───────────────────────────────────────────

async function embedQuery(text: string): Promise<number[]> {
  const apiKey = ENV.openAiApiKey;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Embeddings API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding as number[];
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Encontra os CNAEs mais semanticamente similares à descrição fornecida.
 * Usa embeddings vetoriais (OpenAI text-embedding-3-small) + similaridade de cosseno.
 *
 * @param description - Descrição do negócio ou query de busca
 * @param topN - Número de candidatos a retornar (padrão: 40)
 * @returns Lista de CNAEs ordenados por similaridade decrescente
 */
export async function findSimilarCnaes(
  description: string,
  topN = 40
): Promise<CnaeCandidate[]> {
  // 1. Carregar cache de embeddings
  const cache = await loadEmbeddingCache();
  if (cache.length === 0) {
    console.warn("[cnae-embeddings] Cache vazio, retornando lista vazia");
    return [];
  }

  // 2. Gerar embedding da query
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedQuery(description);
  } catch (err) {
    console.error("[cnae-embeddings] Erro ao gerar embedding da query:", err);
    throw err;
  }

  // 3. Calcular similaridade de cosseno para todos os CNAEs
  const scored = cache.map((item) => ({
    code: item.cnaeCode,
    description: item.cnaeDescription,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  // 4. Ordenar por similaridade decrescente e retornar top-N
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topN);
}

/**
 * Formata os candidatos para o prompt do LLM.
 * Inclui o score de similaridade para ajudar o modelo a priorizar.
 */
export function formatCandidatesForPrompt(candidates: CnaeCandidate[]): string {
  return candidates
    .map((c) => `${c.code} — ${c.description}`)
    .join("\n");
}

/**
 * Constrói o contexto RAG para o prompt de identificação de CNAEs.
 * Substitui buildCnaeRagContext do cnae-rag.ts.
 *
 * Estratégia multi-query:
 * - Divide a descrição em cláusulas (por vírgula, ponto-e-vírgula, "e", "além de")
 * - Busca embeddings para cada cláusula separadamente
 * - Mescla os resultados removendo duplicatas
 * - Garante cobertura de TODAS as atividades mencionadas
 *
 * @param description - Descrição do negócio
 * @param topNPerQuery - CNAEs por cláusula (padrão: 20)
 * @returns String formatada com os CNAEs candidatos para inserir no prompt
 */
/**
 * v2.1: Contexto do perfil da empresa para enriquecer a busca semântica de CNAEs
 */
export interface CompanyContext {
  taxRegime?: "simples_nacional" | "lucro_presumido" | "lucro_real";
  operationType?: "produto" | "servico" | "misto";
  clientType?: string[];
  annualRevenueRange?: "ate_360k" | "360k_4_8m" | "4_8m_78m" | "acima_78m";
}

export async function buildSemanticCnaeContext(
  description: string,
  topNPerQuery = 20,
  companyContext?: CompanyContext // v2.1: enriquece a busca com dados do perfil
): Promise<string> {
  // v2.1: Enriquecer a descrição com contexto do perfil para maior precisão semântica
  let enrichedDescription = description;
  if (companyContext) {
    const contextParts: string[] = [];
    if (companyContext.taxRegime) {
      const regimeLabel: Record<string, string> = {
        simples_nacional: "Simples Nacional",
        lucro_presumido: "Lucro Presumido",
        lucro_real: "Lucro Real",
      };
      contextParts.push(`regime tributário ${regimeLabel[companyContext.taxRegime] ?? companyContext.taxRegime}`);
    }
    if (companyContext.operationType) {
      const opLabel: Record<string, string> = {
        produto: "venda de produtos",
        servico: "prestação de serviços",
        misto: "venda de produtos e serviços",
      };
      contextParts.push(opLabel[companyContext.operationType] ?? companyContext.operationType);
    }
    if (companyContext.clientType && companyContext.clientType.length > 0) {
      contextParts.push(`clientes ${companyContext.clientType.join(" e ")}`);
    }
    if (contextParts.length > 0) {
      enrichedDescription = `${description}. Contexto adicional: ${contextParts.join(", ")}.`;
    }
  }
  // Dividir descrição em cláusulas de atividades
  const clauses = splitIntoClauses(enrichedDescription);

  if (clauses.length === 0) {
    return "(descrição vazia)";
  }

  // Buscar embeddings para cada cláusula em paralelo
  const resultsPerClause = await Promise.all(
    clauses.map((clause) =>
      findSimilarCnaes(clause, topNPerQuery).catch(() => [] as CnaeCandidate[])
    )
  )

  // Estratégia de merge em 2 camadas:
  // 1. "Garantidos": top-5 de cada cláusula não-completa são sempre incluídos
  //    (garante que cada atividade tenha ao menos 5 candidatos no contexto)
  // 2. "Pool geral": todos os resultados mesclados por score máximo
  // Resultado final: garantidos primeiro, depois pool geral sem duplicatas

  const guaranteed = new Map<string, CnaeCandidate>();
  const pool = new Map<string, CnaeCandidate>();

  resultsPerClause.forEach((results, clauseIdx) => {
    const isFullQuery = clauseIdx === 0; // primeira é a descrição completa
    results.forEach((c, rank) => {
      // Adicionar ao pool geral (maior score vence)
      const existing = pool.get(c.code);
      if (!existing || c.similarity > existing.similarity) {
        pool.set(c.code, c);
      }
      // Top-5 de cada cláusula individual são "garantidos"
      if (!isFullQuery && rank < 5) {
        const existingG = guaranteed.get(c.code);
        if (!existingG || c.similarity > existingG.similarity) {
          guaranteed.set(c.code, c);
        }
      }
    });
  });

  if (pool.size === 0) {
    return "(base de embeddings não disponível — use a lista completa CNAE 2.3)";
  }

  // Ordenar pool geral por similaridade
  const poolSorted = Array.from(pool.values()).sort(
    (a, b) => b.similarity - a.similarity
  );

  // Construir lista final: garantidos + pool sem duplicatas
  const finalCodes = new Set<string>();
  const finalList: CnaeCandidate[] = [];

  // 1. Inserir garantidos (ordenados por score)
  const guaranteedSorted = Array.from(guaranteed.values()).sort(
    (a, b) => b.similarity - a.similarity
  );
  for (const c of guaranteedSorted) {
    if (!finalCodes.has(c.code)) {
      finalCodes.add(c.code);
      finalList.push(c);
    }
  }

  // 2. Completar com pool geral até 50 candidatos no total
  for (const c of poolSorted) {
    if (finalList.length >= 50) break;
    if (!finalCodes.has(c.code)) {
      finalCodes.add(c.code);
      finalList.push(c);
    }
  }

  return formatCandidatesForPrompt(finalList);
}

/**
 * Divide uma descrição em cláusulas de atividades distintas.
 * Separa por vírgula, ponto-e-vírgula, "e", "além de", "também".
 * Cada cláusula é tratada como uma atividade separada para busca.
 */
function splitIntoClauses(description: string): string[] {
  if (!description || description.trim().length === 0) return [];

  // Normalizar separadores
  const normalized = description
    .replace(/;/g, ",")
    .replace(/\b(além de|também|bem como|incluindo|e ainda)\b/gi, ",")
    .replace(/\s+e\s+/gi, ","); // "e" isolado como separador

  // Dividir por vírgula
  const parts = normalized
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length >= 5); // ignorar fragmentos muito curtos

  // Se apenas 1 cláusula, usar a descrição inteira
  if (parts.length <= 1) return [description.trim()];

  // Sempre incluir a descrição completa como query adicional
  return [description.trim(), ...parts];
}

/**
 * Fallback síncrono: retorna top-N candidatos do cache sem chamar a API.
 * Usado quando a IA falha e precisamos de sugestões imediatas.
 * Seleciona CNAEs de diferentes seções para diversidade.
 */
export function getFallbackCandidates(topN = 5): CnaeCandidate[] {
  if (!embeddingCache || embeddingCache.length === 0) return [];

  // Selecionar CNAEs de seções diversas (seções mais comuns em compliance)
  const sections = ["4", "5", "6", "7", "8", "1", "2", "3", "9"];
  const result: CnaeCandidate[] = [];
  const seen = new Set<string>();

  for (const sec of sections) {
    const item = embeddingCache.find(
      (c) => c.cnaeCode.startsWith(sec) && !seen.has(c.cnaeCode)
    );
    if (item) {
      seen.add(item.cnaeCode);
      result.push({
        code: item.cnaeCode,
        description: item.cnaeDescription,
        similarity: 0,
      });
    }
    if (result.length >= topN) break;
  }

  return result;
}
