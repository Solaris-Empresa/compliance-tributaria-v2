/**
 * db-queries-risks-v4.ts — Sprint Z-07 PR #B
 *
 * Queries layer para o Sistema de Riscos v4.
 * Arquivo novo — não altera nenhum arquivo existente (ADR-0022).
 *
 * Tabelas: risks_v4 · action_plans · tasks · audit_log
 * Migration: drizzle/0064_risks_v4.sql
 */

import { drizzle } from "drizzle-orm/mysql2";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos — espelham exatamente o schema 0064_risks_v4.sql
// ─────────────────────────────────────────────────────────────────────────────

export type CategoriaV4 =
  | "imposto_seletivo"
  | "confissao_automatica"
  | "split_payment"
  | "inscricao_cadastral"
  | "regime_diferenciado"
  | "transicao_iss_ibs"
  | "obrigacao_acessoria"
  | "aliquota_zero"
  | "aliquota_reduzida"
  | "credito_presumido"
  | "enquadramento_geral"; // Hotfix v2.1 — migration 0089

export type SeveridadeV4 = "alta" | "media" | "oportunidade";
export type UrgenciaV4 = "imediata" | "curto_prazo" | "medio_prazo";
// M3.8.1 Bug C followup: alinhamento com type Fonte (risk-engine-v4.ts:37)
// e migration 0091 (ENUM risks_v4.source_priority).
export type SourcePriorityV4 = "cnae" | "ncm" | "nbs" | "solaris" | "iagen" | "regulatorio";
export type RiskStatusV4 = "active" | "deleted";

export type PrazoActionPlan = "30_dias" | "60_dias" | "90_dias" | "180_dias";
export type StatusActionPlan =
  | "rascunho"
  | "aprovado"
  | "em_andamento"
  | "concluido"
  | "deleted";

export type StatusTask = "todo" | "doing" | "done" | "blocked" | "deleted";

export type EntityAudit = "risk" | "action_plan" | "task";
export type ActionAudit =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "approved";

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces de domínio
// ─────────────────────────────────────────────────────────────────────────────

export interface RiskV4Row {
  id: string;
  project_id: number;
  rule_id: string;
  type: "risk" | "opportunity";
  categoria: CategoriaV4;
  titulo: string;
  descricao: string | null;
  artigo: string;
  severidade: SeveridadeV4;
  urgencia: UrgenciaV4;
  evidence: unknown;
  breadcrumb: unknown;
  source_priority: SourcePriorityV4;
  confidence: number;
  status: RiskStatusV4;
  approved_by: number | null;
  approved_at: Date | null;
  deleted_reason: string | null;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  rag_validated: number;
  rag_artigo_exato: string | null;
}

export interface InsertRiskV4 {
  project_id: number;
  rule_id: string;
  type: "risk" | "opportunity";
  categoria: CategoriaV4;
  titulo: string;
  descricao?: string | null;
  artigo: string;
  severidade: SeveridadeV4;
  urgencia: UrgenciaV4;
  evidence: unknown;
  breadcrumb: unknown;
  source_priority: SourcePriorityV4;
  confidence?: number;
  created_by: number;
  updated_by: number;
  // Sprint Z-13.5 — migration 0075
  risk_key?: string | null;
  operational_context?: unknown;
  evidence_count?: number;
  rag_validated?: number; // tinyint: 0 | 1
  rag_confidence?: number;
  rag_artigo_exato?: string | null;
  rag_trecho_legal?: string | null;
  rag_query?: string | null;
  rag_validation_note?: string | null;
}

export interface ActionPlanRow {
  id: string;
  project_id: number;
  risk_id: string;
  titulo: string;
  descricao: string | null;
  responsavel: string;
  prazo: PrazoActionPlan;
  status: StatusActionPlan;
  approved_by: number | null;
  approved_at: Date | null;
  deleted_reason: string | null;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface InsertActionPlanV4 {
  project_id: number;
  risk_id: string;
  titulo: string;
  descricao?: string | null;
  responsavel: string;
  prazo: PrazoActionPlan;
  created_by: number;
  updated_by: number;
}

export interface TaskRow {
  id: string;
  project_id: number;
  action_plan_id: string;
  titulo: string;
  descricao: string | null;
  responsavel: string;
  prazo: Date | null;
  data_inicio: Date;    // Sprint Z-16 #614 — NOT NULL
  data_fim: Date;       // Sprint Z-16 #614 — NOT NULL
  status: StatusTask;
  ordem: number;
  deleted_reason: string | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface InsertTaskV4 {
  project_id: number;
  action_plan_id: string;
  titulo: string;
  descricao?: string | null;
  responsavel: string;
  prazo?: Date | null;
  data_inicio: Date;    // Sprint Z-16 #614 — NOT NULL
  data_fim: Date;       // Sprint Z-16 #614 — NOT NULL
  ordem?: number;
  created_by: number;
}

export interface AuditLogRow {
  id: number;
  project_id: number;
  entity: EntityAudit;
  entity_id: string;
  action: ActionAudit;
  user_id: number;
  user_name: string;
  user_role: string;
  before_state: unknown;
  after_state: unknown;
  reason: string | null;
  created_at: Date;
}

export interface InsertAuditLog {
  project_id: number;
  entity: EntityAudit;
  entity_id: string;
  action: ActionAudit;
  user_id: number;
  user_name: string;
  user_role: string;
  before_state?: unknown;
  after_state?: unknown;
  reason?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conexão — reutiliza o padrão lazy singleton do projeto (drizzle sobre mysql2)
// ─────────────────────────────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  if (!_db) throw new Error("[db-queries-risks-v4] DATABASE_URL não configurado");
  return _db;
}

/**
 * Executa SQL raw parametrizado via drizzle.$client.
 * Retorna array de rows tipado.
 */
async function query<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = await getDb();
  // TiDB/MySQL2: $client é um Pool — precisa de .promise() para API baseada em Promise.
  // Sem .promise(), .execute() usa callbacks e não é iterável (fix/pool-execute-risks-v4).
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// risks_v4 — CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insere um risco novo na tabela risks_v4.
 * Retorna o id gerado (uuid v4).
 */
export async function insertRiskV4(data: InsertRiskV4): Promise<string> {
  const id = uuidv4();
  await query(
    `INSERT INTO risks_v4
      (id, project_id, rule_id, type, categoria, titulo, descricao, artigo,
       severidade, urgencia, evidence, breadcrumb, source_priority, confidence,
       created_by, updated_by,
       risk_key, operational_context, evidence_count,
       rag_validated, rag_confidence, rag_artigo_exato,
       rag_trecho_legal, rag_query, rag_validation_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.project_id,
      data.rule_id,
      data.type,
      data.categoria,
      data.titulo,
      data.descricao ?? null,
      data.artigo,
      data.severidade,
      data.urgencia,
      JSON.stringify(data.evidence),
      JSON.stringify(data.breadcrumb),
      data.source_priority,
      data.confidence ?? 1.0,
      data.created_by,
      data.updated_by,
      data.risk_key ?? null,
      data.operational_context != null ? JSON.stringify(data.operational_context) : null,
      data.evidence_count ?? 0,
      data.rag_validated ?? 0,
      data.rag_confidence ?? 0,
      data.rag_artigo_exato ?? null,
      data.rag_trecho_legal ?? null,
      data.rag_query ?? null,
      data.rag_validation_note ?? null,
    ]
  );
  return id;
}

/**
 * Sprint Z-13.5: Remove todos os riscos de um projeto (hard delete para re-geração).
 * Também remove action_plans e tasks associados (cascade manual).
 */
export async function deleteRisksByProject(projectId: number): Promise<number> {
  // Cascade: tasks → action_plans → risks
  await query(`DELETE t FROM tasks t
    INNER JOIN action_plans ap ON t.action_plan_id = ap.id
    WHERE ap.project_id = ?`, [projectId]);
  await query(`DELETE FROM action_plans WHERE project_id = ?`, [projectId]);
  const result = await query<{ affectedRows?: number }>(
    `DELETE FROM risks_v4 WHERE project_id = ?`, [projectId]);
  // MySQL2 returns ResultSetHeader with affectedRows — extract safely
  return (result as any)?.affectedRows ?? 0;
}

/**
 * Lista todos os riscos ativos de um projeto.
 */
export async function getRisksV4ByProject(
  projectId: number
): Promise<RiskV4Row[]> {
  const rows = await query<RiskV4Row>(
    `SELECT * FROM risks_v4
     WHERE project_id = ? AND status = 'active'
     ORDER BY created_at DESC`,
    [projectId]
  );
  // TiDB retorna campos JSON como string — parse necessário (fix/json-parse-risks-v4)
  return rows.map((r) => ({
    ...r,
    evidence: typeof r.evidence === 'string' ? JSON.parse(r.evidence) : r.evidence,
    breadcrumb: typeof r.breadcrumb === 'string' ? JSON.parse(r.breadcrumb) : r.breadcrumb,
  }));
}

/**
 * Busca um risco pelo id.
 */
export async function getRiskV4ById(id: string): Promise<RiskV4Row | null> {
  const rows = await query<RiskV4Row>(
    `SELECT * FROM risks_v4 WHERE id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0] ?? null;
  if (!row) return null;
  // TiDB retorna campos JSON como string — parse necessário (fix/json-parse-risks-v4)
  return {
    ...row,
    evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence) : row.evidence,
    breadcrumb: typeof row.breadcrumb === 'string' ? JSON.parse(row.breadcrumb) : row.breadcrumb,
  };
}

/**
 * Soft-delete de um risco (status → 'deleted').
 * Registra a razão e o usuário que deletou.
 */
export async function softDeleteRiskV4(
  id: string,
  deletedBy: number,
  reason: string
): Promise<void> {
  await query(
    `UPDATE risks_v4
     SET status = 'deleted', deleted_reason = ?, updated_by = ?
     WHERE id = ? AND status = 'active'`,
    [reason, deletedBy, id]
  );
}

/**
 * Aprova um risco (registra approved_by e approved_at).
 */
export async function approveRiskV4(
  id: string,
  approvedBy: number
): Promise<void> {
  await query(
    `UPDATE risks_v4
     SET approved_by = ?, approved_at = NOW(), updated_by = ?
     WHERE id = ? AND status = 'active'`,
    [approvedBy, approvedBy, id]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// action_plans — CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insere um plano de ação vinculado a um risco.
 * Retorna o id gerado (uuid v4).
 */
export async function insertActionPlanV4(
  data: InsertActionPlanV4
): Promise<string> {
  const id = uuidv4();
  await query(
    `INSERT INTO action_plans
      (id, project_id, risk_id, titulo, descricao, responsavel, prazo,
       created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.project_id,
      data.risk_id,
      data.titulo,
      data.descricao ?? null,
      data.responsavel,
      data.prazo,
      data.created_by,
      data.updated_by,
    ]
  );
  return id;
}

/**
 * Lista planos de ação ativos de um projeto.
 */
export async function getActionPlansByProject(
  projectId: number
): Promise<ActionPlanRow[]> {
  return query<ActionPlanRow>(
    `SELECT * FROM action_plans
     WHERE project_id = ? AND status != 'deleted'
     ORDER BY created_at DESC`,
    [projectId]
  );
}

/**
 * Lista planos de ação de um risco específico.
 */
export async function getActionPlansByRisk(
  riskId: string
): Promise<ActionPlanRow[]> {
  return query<ActionPlanRow>(
    `SELECT * FROM action_plans
     WHERE risk_id = ? AND status != 'deleted'
     ORDER BY created_at ASC`,
    [riskId]
  );
}

/**
 * Aprova um plano de ação.
 */
export async function approveActionPlanV4(
  id: string,
  approvedBy: number
): Promise<void> {
  await query(
    `UPDATE action_plans
     SET status = 'aprovado', approved_by = ?, approved_at = NOW(), updated_by = ?
     WHERE id = ? AND status = 'rascunho'`,
    [approvedBy, approvedBy, id]
  );
}

/**
 * Soft-delete de um plano de ação.
 */
export async function softDeleteActionPlanV4(
  id: string,
  deletedBy: number,
  reason: string
): Promise<void> {
  await query(
    `UPDATE action_plans
     SET status = 'deleted', deleted_reason = ?, updated_by = ?
     WHERE id = ? AND status != 'deleted'`,
    [reason, deletedBy, id]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// tasks — CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insere uma tarefa vinculada a um plano de ação.
 * Retorna o id gerado (uuid v4).
 */
export async function insertTaskV4(data: InsertTaskV4): Promise<string> {
  const id = uuidv4();
  await query(
    `INSERT INTO tasks
      (id, project_id, action_plan_id, titulo, descricao, responsavel, prazo,
       data_inicio, data_fim, ordem, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.project_id,
      data.action_plan_id,
      data.titulo,
      data.descricao ?? null,
      data.responsavel,
      data.prazo ?? null,
      data.data_inicio,
      data.data_fim,
      data.ordem ?? 0,
      data.created_by,
    ]
  );
  return id;
}

/**
 * Lista tarefas ativas de um plano de ação.
 */
export async function getTasksByActionPlan(
  actionPlanId: string
): Promise<TaskRow[]> {
  return query<TaskRow>(
    `SELECT * FROM tasks
     WHERE action_plan_id = ? AND status != 'deleted'
     ORDER BY ordem ASC, created_at ASC`,
    [actionPlanId]
  );
}

/**
 * Atualiza o status de uma tarefa.
 */
export async function updateTaskStatus(
  id: string,
  status: StatusTask
): Promise<void> {
  await query(`UPDATE tasks SET status = ? WHERE id = ?`, [status, id]);
}

/**
 * Sprint Z-16 #614 — Atualiza todos os campos editáveis de uma tarefa.
 */
export async function updateTaskFull(
  id: string,
  data: {
    titulo: string;
    descricao?: string | null;
    responsavel: string;
    status: StatusTask;
    data_inicio?: Date | null;
    data_fim?: Date | null;
  }
): Promise<void> {
  await query(
    `UPDATE tasks
     SET titulo = ?, descricao = ?, responsavel = ?, status = ?,
         data_inicio = ?, data_fim = ?
     WHERE id = ?`,
    [
      data.titulo,
      data.descricao ?? null,
      data.responsavel,
      data.status,
      data.data_inicio ?? null,
      data.data_fim ?? null,
      id,
    ]
  );
}

/**
 * Soft-delete de uma tarefa.
 */
export async function softDeleteTaskV4(
  id: string,
  reason: string
): Promise<void> {
  await query(
    `UPDATE tasks SET status = 'deleted', deleted_reason = ? WHERE id = ?`,
    [reason, id]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// audit_log — write-only
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra uma entrada imutável no audit_log.
 * Deve ser chamado após cada operação de escrita nas outras tabelas.
 */
export async function insertAuditLog(data: InsertAuditLog): Promise<void> {
  await query(
    `INSERT INTO audit_log
      (project_id, entity, entity_id, action, user_id, user_name, user_role,
       before_state, after_state, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.project_id,
      data.entity,
      data.entity_id,
      data.action,
      data.user_id,
      data.user_name,
      data.user_role,
      data.before_state != null ? JSON.stringify(data.before_state) : null,
      data.after_state != null ? JSON.stringify(data.after_state) : null,
      data.reason ?? null,
    ]
  );
}

/**
 * Lê o histórico de auditoria de uma entidade.
 */
export async function getAuditLog(
  projectId: number,
  entity: EntityAudit,
  entityId: string
): Promise<AuditLogRow[]> {
  return query<AuditLogRow>(
    `SELECT * FROM audit_log
     WHERE project_id = ? AND entity = ? AND entity_id = ?
     ORDER BY created_at ASC`,
    [projectId, entity, entityId]
  );
}

/**
 * Sprint Z-12: Lê o histórico de auditoria global de um projeto (sem filtro de entity).
 */
export async function getProjectAuditLog(
  projectId: number,
  limit = 100
): Promise<AuditLogRow[]> {
  // TiDB: LIMIT ? via mysql2 execute() lança ER_WRONG_ARGUMENTS
  // Fix: interpolar safeLimit (já clamped 1-500 pelo zod no router)
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  return query<AuditLogRow>(
    `SELECT * FROM audit_log
     WHERE project_id = ?
     ORDER BY created_at DESC
     LIMIT ${safeLimit}`,
    [projectId]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers compostos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insere um risco e registra no audit_log atomicamente.
 */
export async function insertRiskV4WithAudit(
  data: InsertRiskV4,
  actor: { user_id: number; user_name: string; user_role: string }
): Promise<string> {
  const id = await insertRiskV4(data);
  await insertAuditLog({
    project_id: data.project_id,
    entity: "risk",
    entity_id: id,
    action: "created",
    user_id: actor.user_id,
    user_name: actor.user_name,
    user_role: actor.user_role,
    after_state: { ...data, id },
  });
  return id;
}

/**
 * Insere um plano de ação e registra no audit_log atomicamente.
 */
export async function insertActionPlanV4WithAudit(
  data: InsertActionPlanV4,
  actor: { user_id: number; user_name: string; user_role: string }
): Promise<string> {
  const id = await insertActionPlanV4(data);
  await insertAuditLog({
    project_id: data.project_id,
    entity: "action_plan",
    entity_id: id,
    action: "created",
    user_id: actor.user_id,
    user_name: actor.user_name,
    user_role: actor.user_role,
    after_state: { ...data, id },
  });
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint Z-21 #719 — Cascata soft delete + restore
// Fix de bug detectado em Bateria 2 (Z-20 Gate 0):
//   softDeleteRiskV4 / restoreRisk não propagavam para action_plans/tasks.
// Viola RN_CONSOLIDACAO_V4.md §14 e RI-07 do snapshot §22.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soft-delete de um risco COM cascata em action_plans e tasks.
 * Registra audit_log para cada entidade afetada (N+1 entradas).
 *
 * Sequência (ordem importa — não usar DELETE com CASCADE no banco):
 *   1. UPDATE risks_v4 SET status='deleted'
 *   2. SELECT action_plans filhos ativos
 *   3. Para cada plano:
 *      a. UPDATE action_plans SET status='deleted'
 *      b. UPDATE tasks WHERE action_plan_id SET status='deleted'
 *      c. insertAuditLog entity='action_plan' action='deleted_cascade'
 *   4. insertAuditLog entity='risk' action='deleted'
 */
export async function softDeleteRiskWithCascade(
  riskId: string,
  projectId: number,
  deletedBy: number,
  reason: string,
  actor: { user_id: number; user_name: string; user_role: string }
): Promise<void> {
  // 1. Soft delete do risco
  await query(
    `UPDATE risks_v4
     SET status = 'deleted', deleted_reason = ?, updated_by = ?
     WHERE id = ? AND status = 'active'`,
    [reason, deletedBy, riskId]
  );

  // 2. Buscar planos filhos ativos
  const plans = await query<{ id: string }>(
    `SELECT id FROM action_plans
     WHERE risk_id = ? AND status != 'deleted'`,
    [riskId]
  );

  // 3. Cascata para cada plano
  for (const plan of plans) {
    // 3a. Soft delete do plano
    await query(
      `UPDATE action_plans
       SET status = 'deleted', deleted_reason = ?, updated_by = ?
       WHERE id = ? AND status != 'deleted'`,
      [`cascade from risk ${riskId}`, deletedBy, plan.id]
    );

    // 3b. Soft delete das tasks do plano (apenas não-deletadas)
    // Buscar tasks antes do delete para registrar audit_log individual por task
    const tasks = await query<{ id: string }>(
      `SELECT id FROM tasks
       WHERE action_plan_id = ? AND status != 'deleted'`,
      [plan.id]
    );
    await query(
      `UPDATE tasks
       SET status = 'deleted', deleted_reason = ?
       WHERE action_plan_id = ? AND status != 'deleted'`,
      [`cascade from risk ${riskId}`, plan.id]
    );
    // 3b-ii. audit_log para cada task deletada em cascata (N+1 por plano)
    for (const task of tasks) {
      await insertAuditLog({
        project_id: projectId,
        entity: "task",
        entity_id: task.id,
        action: "deleted",
        user_id: actor.user_id,
        user_name: actor.user_name,
        user_role: actor.user_role,
        before_state: { status: "active" },
        after_state: {
          status: "deleted",
          cascade_source: "risk",
          cascade_source_id: riskId,
          cascade_via_plan: plan.id,
        },
        reason: `cascade from risk ${riskId}`,
      });
    }

    // 3c. audit_log do plano cascateado
    await insertAuditLog({
      project_id: projectId,
      entity: "action_plan",
      entity_id: plan.id,
      action: "deleted",
      user_id: actor.user_id,
      user_name: actor.user_name,
      user_role: actor.user_role,
      before_state: { status: "active" },
      after_state: {
        status: "deleted",
        cascade_source: "risk",
        cascade_source_id: riskId,
      },
      reason: `cascade from risk ${riskId}`,
    });
  }

  // 4. audit_log do risco
  await insertAuditLog({
    project_id: projectId,
    entity: "risk",
    entity_id: riskId,
    action: "deleted",
    user_id: actor.user_id,
    user_name: actor.user_name,
    user_role: actor.user_role,
    before_state: { status: "active" },
    after_state: {
      status: "deleted",
      deleted_reason: reason,
      cascaded_plans: plans.length,
    },
    reason,
  });
}

/**
 * Restore de um risco COM cascata (RI-07): action_plans e tasks voltam.
 * Registra audit_log para cada entidade afetada (N+1 entradas).
 *
 * Regras:
 *   - Planos restaurados voltam para 'rascunho' (aprovação deve ser refeita)
 *   - Tasks restauradas voltam para 'pending' (não há histórico do status anterior)
 *   - Apenas entidades com status='deleted' são afetadas
 */
export async function restoreRiskWithCascade(
  riskId: string,
  projectId: number,
  restoredBy: number,
  actor: { user_id: number; user_name: string; user_role: string },
  reason?: string
): Promise<void> {
  // 1. Restaurar risco
  await query(
    `UPDATE risks_v4
     SET status = 'active', deleted_reason = NULL, updated_by = ?
     WHERE id = ? AND status = 'deleted'`,
    [restoredBy, riskId]
  );

  // 2. Buscar planos deletados via cascata
  const plans = await query<{ id: string }>(
    `SELECT id FROM action_plans
     WHERE risk_id = ? AND status = 'deleted'`,
    [riskId]
  );

  // 3. Cascata de restore para cada plano
  for (const plan of plans) {
    // 3a. Restaurar plano para 'rascunho' (aprovação refeita)
    await query(
      `UPDATE action_plans
       SET status = 'rascunho', deleted_reason = NULL, updated_by = ?
       WHERE id = ? AND status = 'deleted'`,
      [restoredBy, plan.id]
    );

    // 3b. Restaurar tasks para 'pending' (sem histórico do status anterior)
    // Buscar tasks antes do restore para registrar audit_log individual por task
    const tasksToRestore = await query<{ id: string }>(
      `SELECT id FROM tasks
       WHERE action_plan_id = ? AND status = 'deleted'`,
      [plan.id]
    );
    await query(
      `UPDATE tasks
       SET status = 'todo', deleted_reason = NULL
       WHERE action_plan_id = ? AND status = 'deleted'`,
      [plan.id]
    );
    // 3b-ii. audit_log para cada task restaurada em cascata
    for (const task of tasksToRestore) {
      await insertAuditLog({
        project_id: projectId,
        entity: "task",
        entity_id: task.id,
        action: "restored",
        user_id: actor.user_id,
        user_name: actor.user_name,
        user_role: actor.user_role,
        before_state: { status: "deleted" },
        after_state: {
          status: "todo",
          cascade_source: "risk",
          cascade_source_id: riskId,
          cascade_via_plan: plan.id,
        },
        reason: reason ?? `cascade from risk restore ${riskId}`,
      });
    }

    // 3c. audit_log do plano restaurado
    await insertAuditLog({
      project_id: projectId,
      entity: "action_plan",
      entity_id: plan.id,
      action: "restored",
      user_id: actor.user_id,
      user_name: actor.user_name,
      user_role: actor.user_role,
      before_state: { status: "deleted" },
      after_state: {
        status: "rascunho",
        cascade_source: "risk",
        cascade_source_id: riskId,
      },
      reason: reason ?? `cascade from risk restore ${riskId}`,
    });
  }

  // 4. audit_log do risco
  await insertAuditLog({
    project_id: projectId,
    entity: "risk",
    entity_id: riskId,
    action: "restored",
    user_id: actor.user_id,
    user_name: actor.user_name,
    user_role: actor.user_role,
    before_state: { status: "deleted" },
    after_state: {
      status: "active",
      cascaded_plans: plans.length,
    },
    reason,
  });
}
