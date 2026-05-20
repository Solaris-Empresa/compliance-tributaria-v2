/**
 * riskCategoriesCache.ts — Cache TTL 1h para `risk_categories.artigo_base`
 *
 * Issue BUG-G1 (Sprint BUG-FIX 20/05/2026) — substitui artigos hardcoded
 * em prompts do LLM por query dinâmica ao banco. Decisão P.O. 18:16.
 *
 * Responsabilidades:
 *   - Buscar `artigo_base` por `codigo` em `risk_categories`
 *   - Cachear resultado em memória por 1 hora (TTL 1h — padrão ADR-0025)
 *   - Expor `invalidateCache()` para forçar refresh (testes, admin)
 *
 * NÃO substitui `server/lib/risk-category.repository.drizzle.ts` — ambos
 * coexistem. Este helper é **leitura especializada** para o caso "qual
 * é o artigo base de uma categoria". O repositório legado opera em
 * `CategoryACL` que omite `artigo_base` por contrato downstream.
 *
 * Schema: `risk_categories.artigo_base` é VARCHAR(255) NOT NULL
 *         (drizzle/schema.ts:1886) — nunca retorna NULL.
 *         O helper retorna `string | null` apenas se o `codigo` não existir.
 */

import { getDb } from "../db";
import { riskCategories } from "../../drizzle/schema";

// ─── Cache estado ──────────────────────────────────────────────────────────
const TTL_MS = 60 * 60 * 1000; // 1 hora — padrão ADR-0025

let cache: Map<string, string> | null = null;
let cacheExpiry = 0;

function isCacheValid(now: number): boolean {
  return cache !== null && now < cacheExpiry;
}

// ─── API pública ───────────────────────────────────────────────────────────

/**
 * Retorna o `artigo_base` de uma categoria de risco.
 *
 * @param codigo  Código da categoria (ex: 'imposto_seletivo', 'inscricao_cadastral')
 * @returns       String do artigo (ex: 'Art. 409 LC 214/2025') ou `null` se o
 *                código não existir em `risk_categories`.
 *
 * Comportamento:
 *   - Primeira chamada: faz query, popula cache, retorna valor
 *   - Chamadas subsequentes dentro de 1h: retorno instantâneo do cache
 *   - Pós-TTL: refresh automático
 *   - DB indisponível: throw (não silencia — operador vê em log)
 */
export async function getArticleByCategory(codigo: string): Promise<string | null> {
  const now = Date.now();

  if (!isCacheValid(now)) {
    const db = await getDb();
    if (!db) {
      throw new Error("[riskCategoriesCache] Database not available");
    }
    const rows = await db
      .select({
        codigo: riskCategories.codigo,
        artigoBase: riskCategories.artigoBase,
      })
      .from(riskCategories);
    cache = new Map(rows.map((r) => [r.codigo, r.artigoBase]));
    cacheExpiry = now + TTL_MS;
  }

  return cache!.get(codigo) ?? null;
}

/**
 * Força refresh do cache na próxima chamada de `getArticleByCategory`.
 * Chamar após mudanças administrativas em `risk_categories` se o admin
 * panel não invalidar automaticamente (futuro: hook em `upsertCategory`).
 */
export function invalidateCache(): void {
  cache = null;
  cacheExpiry = 0;
}

// ─── Test seam (apenas para testes — não usar em produção) ────────────────

/** @internal — exposto para asserts de teste */
export function _getCacheStateForTests(): {
  hasCache: boolean;
  expiresInMs: number;
  size: number;
} {
  const now = Date.now();
  return {
    hasCache: cache !== null,
    expiresInMs: Math.max(0, cacheExpiry - now),
    size: cache?.size ?? 0,
  };
}
