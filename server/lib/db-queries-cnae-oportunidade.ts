/**
 * db-queries-cnae-oportunidade.ts — FEAT-SCOPE-01 (#1177)
 *
 * Queries layer para a tabela `cnae_aplicavel_oportunidade` (filtro CNAE
 * das oportunidades — Art. 127 LC 214/2025). Arquivo novo — não altera
 * arquivos existentes. Mesmo padrão de db-queries-risk-categories.ts.
 *
 * Tabela: cnae_aplicavel_oportunidade
 * Migration: drizzle/0104_cnae_aplicavel_oportunidade.sql
 *
 * Cache em memória com TTL 1h (padrão getRiskCategories / ADR-0025) —
 * a tabela é pequena (configuração) e lida no caminho quente do engine.
 */
import { drizzle } from "drizzle-orm/mysql2";
import type { CnaeOportunidadeRow } from "./cnae-oportunidade-eligibility";

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  if (!_db) {
    throw new Error("[db-queries-cnae-oportunidade] DATABASE_URL não configurado");
  }
  return _db;
}

async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as T[];
}

// ─── cache TTL 1h por oportunidade_codigo ────────────────────────────────────
const CACHE_TTL_MS = 1000 * 60 * 60; // 1h
const _cache = new Map<string, { rows: CnaeOportunidadeRow[]; ts: number }>();

/**
 * Lê as linhas da tabela para uma oportunidade (ex: 'aliquota_reduzida'),
 * com cache TTL 1h. Retorna [] se a tabela ainda não existir / sem linhas.
 */
export async function getCnaeOportunidadeRows(
  oportunidadeCodigo: string,
): Promise<CnaeOportunidadeRow[]> {
  // Degradação graciosa (Lição #67): sem DATABASE_URL (test/dev) → [] → skip
  // conservador (não exibe a oportunidade). Em produção DATABASE_URL existe.
  if (!process.env.DATABASE_URL) return [];
  const cached = _cache.get(oportunidadeCodigo);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.rows;
  }
  const rows = await query<CnaeOportunidadeRow>(
    `SELECT cnae_4dig, elegibilidade, gate_especial, requer_questionario,
            inciso_art127, conselho_profissional
       FROM cnae_aplicavel_oportunidade
      WHERE oportunidade_codigo = ?`,
    [oportunidadeCodigo],
  );
  _cache.set(oportunidadeCodigo, { rows, ts: Date.now() });
  return rows;
}

/** Limpa o cache (uso em testes / após seed admin). */
export function clearCnaeOportunidadeCache(): void {
  _cache.clear();
}
