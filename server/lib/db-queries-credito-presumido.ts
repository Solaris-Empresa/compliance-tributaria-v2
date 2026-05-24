/**
 * db-queries-credito-presumido.ts — FEAT-SCOPE-02 (#1201)
 *
 * Lê os codigos das perguntas-gate do credito_presumido via campo ESTRUTURADO
 * `risk_category_code` (NÃO via regex/LIKE em texto livre — ADR-FEAT-SCOPE-02 / Lição #61).
 * As perguntas são as criadas em #1198 (SOL-050/051/052), identificadas por
 * risk_category_code='credito_presumido'. Cache TTL 1h. Arquivo novo.
 */
import { drizzle } from "drizzle-orm/mysql2";

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  if (!_db) throw new Error("[db-queries-credito-presumido] DATABASE_URL não configurado");
  return _db;
}

async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as T[];
}

const CACHE_TTL_MS = 1000 * 60 * 60; // 1h
let _cache: { codigos: string[]; ts: number } | null = null;

/**
 * Codigos das perguntas-gate (eliminatórias) do credito_presumido.
 * Filtro data-driven por `risk_category_code` (estruturado), ativo + obrigatorio.
 * Degradação graciosa (Lição #67): sem DATABASE_URL → [] → gate conservador (skip).
 */
export async function getCreditoPresumidoGateCodigos(): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) return _cache.codigos;
  const rows = await query<{ codigo: string | null }>(
    `SELECT codigo FROM solaris_questions
      WHERE risk_category_code = 'credito_presumido'
        AND ativo = 1 AND obrigatorio = 1 AND codigo IS NOT NULL`,
  );
  const codigos = rows.map((r) => r.codigo).filter((c): c is string => !!c);
  _cache = { codigos, ts: Date.now() };
  return codigos;
}

/** Limpa o cache (testes / após seed admin). */
export function clearCreditoPresumidoGateCache(): void {
  _cache = null;
}
