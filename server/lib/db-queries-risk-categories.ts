/**
 * db-queries-risk-categories.ts — Sprint Z-09 / ADR-0025
 *
 * Queries layer para a tabela risk_categories.
 * Arquivo novo — não altera nenhum arquivo existente (ADR-0022).
 *
 * Tabela: risk_categories
 * Migration: drizzle/0065_risk_categories.sql
 *
 * Funções exportadas (SPEC Z-09 PR #A):
 *   listActiveCategories · getCategoryByCode · upsertCategory
 *   suggestCategory · approveSuggestion · rejectSuggestion
 *   listPendingSuggestions
 */

import { drizzle } from "drizzle-orm/mysql2";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos — espelham exatamente o schema 0065_risk_categories.sql
// ─────────────────────────────────────────────────────────────────────────────

export type SeveridadeCategory = "alta" | "media" | "oportunidade";
export type UrgenciaCategory   = "imediata" | "curto_prazo" | "medio_prazo";
export type TipoCategory       = "risk" | "opportunity";
export type StatusCategory     = "ativo" | "sugerido" | "pendente_revisao" | "inativo" | "legado";
export type OrigemCategory     = "lei_federal" | "regulamentacao" | "rag_sensor" | "manual";
export type EscopoCategory     = "nacional" | "estadual" | "setorial";

export interface RiskCategory {
  id: number;
  codigo: string;
  nome: string;
  severidade: SeveridadeCategory;
  urgencia: UrgenciaCategory;
  tipo: TipoCategory;
  artigo_base: string;
  lei_codigo: string;
  vigencia_inicio: Date | string;
  vigencia_fim: Date | string | null;
  status: StatusCategory;
  origem: OrigemCategory;
  escopo: EscopoCategory;
  sugerido_por: string | null;
  aprovado_por: string | null;
  aprovado_at: Date | null;
  chunk_origem_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface InsertRiskCategory {
  codigo: string;
  nome: string;
  severidade: SeveridadeCategory;
  urgencia: UrgenciaCategory;
  tipo: TipoCategory;
  artigo_base: string;
  lei_codigo: string;
  vigencia_inicio: string; // 'YYYY-MM-DD'
  vigencia_fim?: string | null;
  status?: StatusCategory;
  origem: OrigemCategory;
  escopo?: EscopoCategory;
  sugerido_por?: string | null;
  aprovado_por?: string | null;
  aprovado_at?: Date | null;
  chunk_origem_id?: number | null;
}

export interface SuggestedCategory {
  codigo: string;
  nome: string;
  artigo_base: string;
  lei_codigo: string;
  origem: OrigemCategory;
  chunk_origem_id?: number | null;
  sugerido_por?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conexão — lazy singleton (mesmo padrão do projeto)
// ─────────────────────────────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  if (!_db) throw new Error("[db-queries-risk-categories] DATABASE_URL não configurado");
  return _db;
}

/**
 * Executa SQL raw parametrizado via pool.promise().execute().
 * Retorna array de rows tipado.
 */
async function query<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = await getDb();
  // TiDB/MySQL2: $client é um Pool — precisa de .promise() para API baseada em Promise.
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Funções exportadas (SPEC Z-09 PR #A)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lista categorias ativas com vigência válida na data atual.
 * WHERE status='ativo' AND vigencia_inicio <= NOW()
 * AND (vigencia_fim IS NULL OR vigencia_fim >= NOW())
 */
export async function listActiveCategories(): Promise<RiskCategory[]> {
  return query<RiskCategory>(
    `SELECT * FROM risk_categories
     WHERE status = 'ativo'
       AND vigencia_inicio <= CURDATE()
       AND (vigencia_fim IS NULL OR vigencia_fim >= CURDATE())
     ORDER BY severidade ASC, codigo ASC`
  );
}

/**
 * Busca uma categoria pelo código único.
 */
export async function getCategoryByCode(
  codigo: string
): Promise<RiskCategory | null> {
  const rows = await query<RiskCategory>(
    `SELECT * FROM risk_categories WHERE codigo = ? LIMIT 1`,
    [codigo]
  );
  return rows[0] ?? null;
}

/**
 * Upsert de uma categoria (INSERT ou UPDATE por codigo).
 * Retorna a categoria após a operação.
 */
export async function upsertCategory(
  data: InsertRiskCategory
): Promise<RiskCategory> {
  await query(
    `INSERT INTO risk_categories
       (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
        vigencia_inicio, vigencia_fim, status, origem, escopo,
        sugerido_por, aprovado_por, aprovado_at, chunk_origem_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nome            = VALUES(nome),
       severidade      = VALUES(severidade),
       urgencia        = VALUES(urgencia),
       tipo            = VALUES(tipo),
       artigo_base     = VALUES(artigo_base),
       lei_codigo      = VALUES(lei_codigo),
       vigencia_inicio = VALUES(vigencia_inicio),
       vigencia_fim    = VALUES(vigencia_fim),
       status          = VALUES(status),
       origem          = VALUES(origem),
       escopo          = VALUES(escopo),
       sugerido_por    = VALUES(sugerido_por),
       aprovado_por    = VALUES(aprovado_por),
       aprovado_at     = VALUES(aprovado_at),
       chunk_origem_id = VALUES(chunk_origem_id),
       updated_at      = NOW()`,
    [
      data.codigo,
      data.nome,
      data.severidade,
      data.urgencia,
      data.tipo,
      data.artigo_base,
      data.lei_codigo,
      data.vigencia_inicio,
      data.vigencia_fim ?? null,
      data.status ?? "ativo",
      data.origem,
      data.escopo ?? "nacional",
      data.sugerido_por ?? null,
      data.aprovado_por ?? null,
      data.aprovado_at ?? null,
      data.chunk_origem_id ?? null,
    ]
  );
  const result = await getCategoryByCode(data.codigo);
  if (!result) throw new Error(`[upsertCategory] Categoria não encontrada após upsert: ${data.codigo}`);
  return result;
}

/**
 * Insere uma sugestão de nova categoria (status='sugerido').
 * Usada pelo RAG sensor quando detecta artigo sem categoria ativa.
 */
export async function suggestCategory(data: SuggestedCategory): Promise<void> {
  await query(
    `INSERT INTO risk_categories
       (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
        vigencia_inicio, status, origem, escopo, sugerido_por, chunk_origem_id)
     VALUES (?, ?, 'media', 'curto_prazo', 'risk', ?, ?,
             CURDATE(), 'sugerido', ?, 'nacional', ?, ?)`,
    [
      data.codigo,
      data.nome,
      data.artigo_base,
      data.lei_codigo,
      data.origem,
      data.sugerido_por ?? "rag-sensor-v1",
      data.chunk_origem_id ?? null,
    ]
  );
}

/**
 * Aprova uma sugestão: status → 'ativo', preenche aprovado_por + aprovado_at.
 * Usado pelo Dr. Rodrigues (ou substituto) no painel admin.
 */
export async function approveSuggestion(
  id: number,
  aprovadoPor: string,
  overrides?: Partial<Pick<InsertRiskCategory, "severidade" | "urgencia" | "vigencia_fim">>
): Promise<void> {
  const setParts: string[] = [
    "status = 'ativo'",
    "aprovado_por = ?",
    "aprovado_at = NOW()",
  ];
  const params: unknown[] = [aprovadoPor];

  if (overrides?.severidade) {
    setParts.push("severidade = ?");
    params.push(overrides.severidade);
  }
  if (overrides?.urgencia) {
    setParts.push("urgencia = ?");
    params.push(overrides.urgencia);
  }
  if (overrides?.vigencia_fim !== undefined) {
    setParts.push("vigencia_fim = ?");
    params.push(overrides.vigencia_fim ?? null);
  }

  params.push(id);
  await query(
    `UPDATE risk_categories SET ${setParts.join(", ")} WHERE id = ?`,
    params
  );
}

/**
 * Rejeita uma sugestão: status → 'inativo'.
 */
export async function rejectSuggestion(
  id: number,
  motivo: string
): Promise<void> {
  await query(
    `UPDATE risk_categories
     SET status = 'inativo', sugerido_por = CONCAT(IFNULL(sugerido_por,''), ' | rejeitado: ', ?)
     WHERE id = ?`,
    [motivo, id]
  );
}

/**
 * Lista sugestões pendentes de aprovação (status='sugerido').
 * Inclui badge de SLA: sugestões com > 15 dias sem aprovação.
 */
export async function listPendingSuggestions(): Promise<
  (RiskCategory & { dias_pendente: number; sla_vencido: boolean })[]
> {
  const rows = await query<RiskCategory & { dias_pendente: number }>(
    `SELECT *,
            DATEDIFF(NOW(), created_at) AS dias_pendente
     FROM risk_categories
     WHERE status = 'sugerido'
     ORDER BY created_at ASC`
  );
  return rows.map((r) => ({
    ...r,
    sla_vencido: r.dias_pendente > 15,
  }));
}

/**
 * Lista todas as categorias (admin vê inativas e legadas também).
 */
export async function listAllCategories(): Promise<RiskCategory[]> {
  return query<RiskCategory>(
    `SELECT * FROM risk_categories ORDER BY status ASC, codigo ASC`
  );
}
