/**
 * risk-category.repository.drizzle.ts — Sprint Z-10 PR #A
 * Repositório Drizzle para a tabela risk_categories.
 *
 * Responsabilidades:
 *   - Buscar categorias ativas com cache TTL 1h (ADR-0025)
 *   - Injetar CategoryACL[] no gap-to-rule-mapper
 *   - Operações CRUD para o painel admin (AdminCategorias.tsx)
 *
 * NÃO importa routers tRPC — é uma biblioteca pura de acesso a dados.
 */

import { eq, and, isNull, or, gte } from "drizzle-orm";
import { getDb } from "../db";
import { riskCategories } from "../../drizzle/schema";
import type { CategoryACL } from "../schemas/gap-risk.schemas";
import type { RiskCategory, InsertRiskCategory } from "../../drizzle/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Cache em memória — TTL 1h (ADR-0025)
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

let _cache: CategoryACL[] | null = null;
let _cacheAt = 0;

function isCacheValid(): boolean {
  return _cache !== null && Date.now() - _cacheAt < CACHE_TTL_MS;
}

export function invalidateCache(): void {
  _cache = null;
  _cacheAt = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de conversão
// ─────────────────────────────────────────────────────────────────────────────

function toCategoryACL(row: RiskCategory): CategoryACL {
  return {
    codigo:          row.codigo,
    nome:            row.nome,
    severidade:      row.severidade,
    urgencia:        row.urgencia,
    tipo:            row.tipo,
    status:          row.status,
    allowedDomains:  (row.allowedDomains as string[] | null) ?? null,
    allowedGapTypes: (row.allowedGapTypes as string[] | null) ?? null,
    ruleCode:        row.ruleCode ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Leitura — categorias ativas (com cache)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna todas as categorias com status='ativo' e vigência válida.
 * Usa cache em memória com TTL 1h.
 */
export async function getActiveCategories(): Promise<CategoryACL[]> {
  if (isCacheValid()) return _cache!;

  const now = new Date();

  const db = await getDb();
  if (!db) throw new Error("[risk-category.repository] Database not available");
  const rows = await db
    .select()
    .from(riskCategories)
    .where(
      and(
        eq(riskCategories.status, "ativo"),
        or(
          isNull(riskCategories.vigenciaFim),
          gte(riskCategories.vigenciaFim, now),
        ),
      ),
    );

  _cache = rows.map(toCategoryACL);
  _cacheAt = Date.now();
  return _cache;
}

/**
 * Retorna todas as categorias (sem filtro de status) para o painel admin.
 * Não usa cache.
 */
export async function getAllCategories(): Promise<RiskCategory[]> {
  const db = await getDb();
  if (!db) throw new Error("[risk-category.repository] Database not available");
  return db.select().from(riskCategories);
}

/**
 * Retorna uma categoria pelo código.
 */
export async function getCategoryByCodigo(codigo: string): Promise<RiskCategory | null> {
  const db = await getDb();
  if (!db) throw new Error("[risk-category.repository] Database not available");
  const rows = await db
    .select()
    .from(riskCategories)
    .where(eq(riskCategories.codigo, codigo));
  return rows[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Escrita — CRUD admin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cria ou atualiza uma categoria (upsert por codigo).
 * Invalida o cache após a operação.
 */
export async function upsertCategory(data: InsertRiskCategory): Promise<void> {
  const existing = await getCategoryByCodigo(data.codigo);

  const db = await getDb();
  if (!db) throw new Error("[risk-category.repository] Database not available");
  if (existing) {
    await db
      .update(riskCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(riskCategories.codigo, data.codigo));
  } else {
    await db.insert(riskCategories).values(data);
  }

  invalidateCache();
}

/**
 * Atualiza o status de uma categoria.
 * Invalida o cache após a operação.
 */
export async function updateCategoryStatus(
  codigo: string,
  status: RiskCategory["status"],
  updatedBy?: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("[risk-category.repository] Database not available");
  await db
    .update(riskCategories)
    .set({
      status,
      aprovadoPor: updatedBy ?? null,
      aprovadoAt: status === "ativo" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(riskCategories.codigo, codigo));

  invalidateCache();
}

/**
 * Aprova uma sugestão de categoria (sugerido → ativo).
 */
export async function approveSuggestion(codigo: string, aprovadoPor: string): Promise<void> {
  return updateCategoryStatus(codigo, "ativo", aprovadoPor);
}

/**
 * Rejeita uma sugestão de categoria (sugerido → inativo).
 */
export async function rejectSuggestion(codigo: string, rejeitadoPor: string): Promise<void> {
  return updateCategoryStatus(codigo, "inativo", rejeitadoPor);
}
