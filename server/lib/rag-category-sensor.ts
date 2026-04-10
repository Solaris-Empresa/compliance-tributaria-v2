/**
 * rag-category-sensor.ts — Sprint Z-09 / ADR-0025
 *
 * Sensor RAG: detecta artigos em novos chunks do corpus que não mapeiam
 * para categorias ativas existentes e cria sugestões para aprovação.
 *
 * Pipeline (ADR-0025):
 *   pnpm rag:ingest → detectNewCategories(newChunkIds)
 *     → matchChunkToCategories (embeddings / keyword match)
 *     → confidence < 70%  → arquivar sem alerta
 *     → confidence 70-90% → suggestCategory (status='sugerido')
 *     → confidence > 90%  → categoria já existe, sem ação
 *
 * Resolve: GAP-ARCH-09 (painel admin mostra chunk de origem)
 *
 * Arquivo novo — não altera nenhum arquivo existente (ADR-0022).
 */

import {
  listActiveCategories,
  suggestCategory,
  type RiskCategory,
} from "./db-queries-risk-categories";
import { drizzle } from "drizzle-orm/mysql2";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────────────────────

export interface RagChunk {
  id: number;
  lei: string;
  artigo: string;
  titulo: string;
  conteudo: string;
  topicos: string;
  cnaeGroups: string;
  chunkIndex: number;
  createdAt: Date;
  anchor_id: string | null;
}

export interface MatchResult {
  /** Score 0-1 de confiança de que o chunk já está coberto por uma categoria ativa */
  maxScore: number;
  /** Categoria com maior score (se existir) */
  bestCategory: RiskCategory | null;
  /** Artigos identificados no chunk */
  artigos: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle> | null = null;

function getDb(): ReturnType<typeof drizzle> {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  if (!_db) throw new Error("[rag-category-sensor] DATABASE_URL não configurado");
  return _db;
}

async function queryDb<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = getDb();
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as T[];
}

/**
 * Busca um chunk do corpus ragDocuments pelo ID.
 */
export async function getChunkById(chunkId: number): Promise<RagChunk | null> {
  const rows = await queryDb<RagChunk>(
    `SELECT id, lei, artigo, titulo, conteudo, topicos, cnaeGroups,
            chunkIndex, createdAt, anchor_id
     FROM ragDocuments WHERE id = ? LIMIT 1`,
    [chunkId]
  );
  return rows[0] ?? null;
}

/**
 * Gera um código de categoria a partir do chunk.
 * Formato: rag_<lei>_<artigo_slug>
 */
export function generateCodigo(chunk: RagChunk): string {
  const lei = chunk.lei.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const artSlug = chunk.artigo
    .replace(/^art\.?\s*/i, "art")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .substring(0, 30);
  return `rag_${lei}_${artSlug}`;
}

/**
 * Extrai o nome da categoria a partir do título do chunk.
 * Limita a 200 caracteres.
 */
export function extractNome(chunk: RagChunk): string {
  return chunk.titulo.substring(0, 200);
}

/**
 * Extrai o artigo base do chunk.
 */
export function extractArtigo(chunk: RagChunk): string {
  return `${chunk.artigo} ${chunk.lei.toUpperCase()}`.trim().substring(0, 255);
}

/**
 * Calcula o score de correspondência entre um chunk e as categorias ativas.
 *
 * Estratégia: keyword matching sobre artigo_base + topicos.
 * Score 0-1 baseado em sobreposição de termos-chave.
 *
 * Nota: em produção, substituir por embeddings (cosine similarity).
 * Esta implementação usa keyword matching como fallback determinístico.
 */
export async function matchChunkToCategories(
  chunk: RagChunk,
  activeCategories: RiskCategory[]
): Promise<MatchResult> {
  if (!chunk || activeCategories.length === 0) {
    return { maxScore: 0, bestCategory: null, artigos: [] };
  }

  // Extrair artigos do chunk (ex: "Art. 9", "Art. 45", "Arts. 6-12")
  const artigoMatches = chunk.artigo.match(/\d+/g) ?? [];
  const artigos = artigoMatches.map((n) => `Art. ${n}`);

  // Tokenizar conteúdo do chunk para keyword matching
  const chunkText = [
    chunk.titulo,
    chunk.conteudo,
    chunk.topicos,
    chunk.artigo,
  ]
    .join(" ")
    .toLowerCase();

  let maxScore = 0;
  let bestCategory: RiskCategory | null = null;

  for (const cat of activeCategories) {
    // Extrair números de artigo da categoria
    const catArtigoNums: string[] = cat.artigo_base.match(/\d+/g) ?? [];
    const chunkArtigoNums: string[] = chunk.artigo.match(/\d+/g) ?? [];

    // Score por sobreposição de números de artigo
    const artigoOverlap = catArtigoNums.filter((n: string) =>
      chunkArtigoNums.includes(n)
    ).length;
    const artigoScore =
      artigoOverlap > 0
        ? artigoOverlap / Math.max(catArtigoNums.length, chunkArtigoNums.length, 1)
        : 0;

    // Score por keyword no conteúdo (código da categoria como keyword)
    const codigoKeywords = cat.codigo.split("_").filter((k: string) => k.length > 3);
    const keywordMatches = codigoKeywords.filter((kw: string) =>
      chunkText.includes(kw.toLowerCase())
    ).length;
    const keywordScore =
      keywordMatches / Math.max(codigoKeywords.length, 1);

    // Score combinado (pesos: artigo 60%, keyword 40%)
    const combinedScore = artigoScore * 0.6 + keywordScore * 0.4;

    if (combinedScore > maxScore) {
      maxScore = combinedScore;
      bestCategory = cat;
    }
  }

  return { maxScore, bestCategory, artigos };
}

// ─────────────────────────────────────────────────────────────────────────────
// Função principal exportada
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detecta novos artigos em chunks recém-ingeridos que não mapeiam para
 * categorias ativas e cria sugestões para aprovação no painel admin.
 *
 * Executado após `pnpm rag:ingest` com os IDs dos chunks novos.
 *
 * @param newChunkIds - IDs dos chunks recém-inseridos em ragDocuments
 * @returns Resumo do processamento
 */
export async function detectNewCategories(newChunkIds: number[]): Promise<{
  processed: number;
  suggested: number;
  skipped_low_confidence: number;
  skipped_already_covered: number;
  errors: string[];
}> {
  const result = {
    processed: 0,
    suggested: 0,
    skipped_low_confidence: 0,
    skipped_already_covered: 0,
    errors: [] as string[],
  };

  if (newChunkIds.length === 0) return result;

  // Carregar categorias ativas uma vez (cache implícito nesta execução)
  const activeCategories = await listActiveCategories();

  for (const chunkId of newChunkIds) {
    result.processed++;

    try {
      const chunk = await getChunkById(chunkId);
      if (!chunk) {
        result.errors.push(`Chunk ${chunkId} não encontrado`);
        continue;
      }

      const confidence = await matchChunkToCategories(chunk, activeCategories);

      if (confidence.maxScore < 0.70) {
        // Confiança < 70% → arquivar sem alerta (ADR-0025 política de aprovação)
        result.skipped_low_confidence++;
        continue;
      }

      if (confidence.maxScore >= 0.90) {
        // > 90% → categoria já existe, sem ação necessária
        result.skipped_already_covered++;
        continue;
      }

      // 70-90% → sugerir para aprovação
      const codigo = generateCodigo(chunk);
      const nome = extractNome(chunk);
      const artigo_base = extractArtigo(chunk);

      await suggestCategory({
        codigo,
        nome,
        artigo_base,
        lei_codigo: chunk.lei.toUpperCase(),
        origem: "rag_sensor",
        chunk_origem_id: chunkId,
        sugerido_por: "rag-sensor-v1",
      });

      result.suggested++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Chunk ${chunkId}: ${msg}`);
    }
  }

  return result;
}
