/**
 * project-timeline.ts — #766 feat(ux) Trilha de Auditoria
 *
 * Consolida as duas tabelas de audit (auditLog camelCase + audit_log snake_case)
 * em uma timeline unificada do projeto, com humanização determinística dos eventos.
 *
 * Por que duas tabelas?
 * - auditLog (camelCase)   — projeto, briefing, tarefa, comentário, perguntas, permissões.
 *                            Metadados ricos via `metadata.event`.
 * - audit_log (snake_case) — engine v4 de riscos/planos/tarefas (soft-delete com cascade,
 *                            aprovações, restore). Padrão RN-RISK-* / RN-AP-*.
 *
 * Os consumers da UI devem tratar as entries como imutáveis e só usar os campos
 * públicos exportados aqui (não os rows brutos do DB).
 */

import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { auditLog } from "../../drizzle/schema";
import { getProjectAuditLog } from "./db-queries-risks-v4";

// ─── Tipos públicos ─────────────────────────────────────────────────────────

export type TimelineCategory =
  | "projeto"
  | "briefing"
  | "risco"
  | "plano"
  | "tarefa"
  | "pergunta"
  | "permissao"
  | "outro";

export interface TimelineEntry {
  /** Chave composta única: `${source}-${id}` */
  id: string;
  /** ms epoch, ordenação DESC */
  timestamp: number;
  userId: number | null;
  userName: string;
  userRole?: string | null;
  projectId: number;
  /** Categoria de alto nível (para agrupamento na UI) */
  category: TimelineCategory;
  /** Entidade bruta (risk, action_plan, task, project, ...) */
  entity: string;
  /** ID da entidade afetada (string para UUIDs do engine v4, number stringified p/ camelCase) */
  entityId: string;
  /** Ação humanizada em PT-BR curto (ex: "aprovou", "criou", "excluiu em cascata") */
  actionLabel: string;
  /** Texto humanizado completo da entrada (ex: "Briefing gerado com 3 fontes ativas") */
  description: string;
  /** Ação técnica original (p/ filtros e export) */
  rawAction: string;
  /** Se metadata.event estiver presente, expõe aqui — ex: "briefing_generated" */
  event?: string | null;
  /** Changes estruturado (auditLog camelCase) */
  changes?: Record<string, unknown> | null;
  /** Metadata bruta (ambas as tabelas) */
  metadata?: Record<string, unknown> | null;
  /** Motivo textual (audit_log snake) */
  reason?: string | null;
  /** Qual tabela originou (debug/export) */
  source: "auditLog" | "audit_log";
}

// ─── Humanização ────────────────────────────────────────────────────────────

const ENTITY_TO_CATEGORY: Record<string, TimelineCategory> = {
  project:               "projeto",
  risk:                  "risco",
  action_plan:           "plano",
  task:                  "tarefa",
  comment:               "outro",
  corporate_assessment:  "projeto",
  branch_assessment:     "projeto",
  corporate_question:    "pergunta",
  branch_question:       "pergunta",
  permission:            "permissao",
};

const ENTITY_LABEL: Record<string, string> = {
  project:               "Projeto",
  risk:                  "Risco",
  action_plan:           "Plano de ação",
  task:                  "Tarefa",
  comment:               "Comentário",
  corporate_assessment:  "Questionário corporativo",
  branch_assessment:     "Questionário de ramo",
  corporate_question:    "Pergunta corporativa",
  branch_question:       "Pergunta de ramo",
  permission:            "Permissão",
};

const ACTION_LABEL: Record<string, string> = {
  create:          "criou",
  created:         "criou",
  update:          "atualizou",
  updated:         "atualizou",
  delete:          "excluiu",
  deleted:         "excluiu",
  deleted_cascade: "excluiu em cascata",
  restored:        "restaurou",
  approved:        "aprovou",
  rejected:        "rejeitou",
  status_change:   "alterou o status",
  completed:       "concluiu",
};

const EVENT_LABEL: Record<string, string> = {
  briefing_generated:                 "Briefing regenerado",
  briefing_generated_from_diagnostic: "Briefing gerado (diagnóstico completo)",
  briefing_approved:                  "Briefing aprovado",
  briefing_approved_with_reservation: "Briefing aprovado com ressalva",
  inconsistencia_dismissed:           "Inconsistência resolvida no briefing",
};

function categoryForEntity(entity: string, event?: string | null): TimelineCategory {
  if (event && event.startsWith("briefing_")) return "briefing";
  if (event === "inconsistencia_dismissed") return "briefing";
  return ENTITY_TO_CATEGORY[entity] ?? "outro";
}

function humanizeAction(rawAction: string): string {
  return ACTION_LABEL[rawAction] ?? rawAction;
}

function describeEntry(opts: {
  entity: string;
  rawAction: string;
  event?: string | null;
  metadata?: Record<string, any> | null;
  changes?: Record<string, any> | null;
  userName: string;
}): string {
  const { entity, rawAction, event, metadata, userName } = opts;

  // 1) Prioridade: eventos conhecidos de briefing
  if (event && EVENT_LABEL[event]) {
    let base = EVENT_LABEL[event];
    if (event === "briefing_generated" || event === "briefing_generated_from_diagnostic") {
      const sources = metadata?.sources as Record<string, any> | undefined;
      if (sources) {
        const usedList = Object.entries(sources)
          .filter(([, v]: any) => v?.used)
          .map(([k]) => humanizeSourceKey(k));
        if (usedList.length > 0) {
          base += ` — fontes: ${usedList.join(", ")}`;
        } else {
          base += ` — sem respostas em nenhuma fonte`;
        }
      }
      const risco = metadata?.output?.nivel_risco;
      const conf  = metadata?.output?.confidence;
      if (risco || typeof conf === "number") {
        const parts: string[] = [];
        if (risco) parts.push(`risco ${risco}`);
        if (typeof conf === "number") parts.push(`${conf}% confiança`);
        base += ` (${parts.join(", ")})`;
      }
    }
    if (event === "briefing_approved_with_reservation") {
      const conf = metadata?.confidence_at_approval;
      const missing = Array.isArray(metadata?.missing_sources) ? metadata.missing_sources : [];
      const freeReason = typeof metadata?.free_reason === "string" ? metadata.free_reason : "";
      const parts: string[] = [];
      if (typeof conf === "number") parts.push(`${conf}% de confiança`);
      if (missing.length > 0) parts.push(`${missing.length} fonte${missing.length !== 1 ? "s" : ""} pendente${missing.length !== 1 ? "s" : ""}`);
      const detail = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
      const reasonTail = freeReason ? `. Motivo: "${freeReason.slice(0, 120)}${freeReason.length > 120 ? "…" : ""}"` : "";
      base += `${detail}${reasonTail}`;
    }
    return `${userName} — ${base}`;
  }

  // 2) Fallback: "Entidade — ação"
  const entityLabel = ENTITY_LABEL[entity] ?? entity;
  const actionLabel = humanizeAction(rawAction);
  return `${userName} ${actionLabel} ${entityLabel.toLowerCase()}`;
}

function humanizeSourceKey(key: string): string {
  const m: Record<string, string> = {
    solaris_onda1:                "SOLARIS Onda 1",
    iagen_onda2:                  "IA Gen Onda 2",
    q_produtos_ncm:               "Q.Produtos (NCM)",
    q_servicos_nbs:               "Q.Serviços (NBS)",
    qcnae_especializado:          "QCNAE",
    qcnae_especializado_struct:   "QCNAE especializado",
  };
  return m[key] ?? key;
}

// ─── Fetcher principal ──────────────────────────────────────────────────────

export async function getProjectTimelineEntries(
  projectId: number,
  limit: number = 300
): Promise<TimelineEntry[]> {
  const db = await getDb();
  const entries: TimelineEntry[] = [];

  // Tabela 1: auditLog (camelCase) — projeto/briefing/tarefa/pergunta
  if (db) {
    const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
    const camelRows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.projectId, projectId))
      .orderBy(desc(auditLog.timestamp))
      .limit(safeLimit);

    for (const row of camelRows) {
      const metadata = (row.metadata ?? null) as Record<string, any> | null;
      const event = (metadata?.event as string | undefined) ?? null;
      const category = categoryForEntity(row.entityType, event);
      const ts = row.timestamp instanceof Date
        ? row.timestamp.getTime()
        : Number(row.timestamp ?? 0);

      entries.push({
        id: `auditLog-${row.id}`,
        timestamp: ts,
        userId: row.userId,
        userName: row.userName,
        projectId: row.projectId,
        category,
        entity: row.entityType,
        entityId: String(row.entityId),
        actionLabel: humanizeAction(row.action),
        rawAction: row.action,
        event,
        description: describeEntry({
          entity: row.entityType,
          rawAction: row.action,
          event,
          metadata,
          changes: (row.changes ?? null) as Record<string, any> | null,
          userName: row.userName,
        }),
        changes: (row.changes ?? null) as Record<string, any> | null,
        metadata,
        source: "auditLog",
      });
    }
  }

  // Tabela 2: audit_log (snake_case) — engine v4 (risk, action_plan, task)
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
  const snakeRows = await getProjectAuditLog(projectId, safeLimit);
  for (const row of snakeRows) {
    const ts = row.created_at instanceof Date
      ? row.created_at.getTime()
      : Number(row.created_at ?? 0);
    const entity = row.entity;
    const category = categoryForEntity(entity, null);
    const description = describeEntry({
      entity,
      rawAction: row.action,
      event: null,
      metadata: null,
      changes: null,
      userName: row.user_name,
    });

    entries.push({
      id: `audit_log-${row.id}`,
      timestamp: ts,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      projectId: row.project_id,
      category,
      entity,
      entityId: row.entity_id,
      actionLabel: humanizeAction(row.action),
      rawAction: row.action,
      event: null,
      description,
      changes: null,
      metadata: {
        before_state: row.before_state,
        after_state: row.after_state,
      },
      reason: row.reason,
      source: "audit_log",
    });
  }

  // Ordena DESC global
  entries.sort((a, b) => b.timestamp - a.timestamp);

  return entries;
}

// ─── Filtros aplicáveis em memória ──────────────────────────────────────────

export interface TimelineFilters {
  categories?: TimelineCategory[];
  userIds?: number[];
  fromTimestamp?: number;
  toTimestamp?: number;
  searchText?: string;
}

export function filterTimelineEntries(
  entries: TimelineEntry[],
  filters: TimelineFilters
): TimelineEntry[] {
  const searchLower = (filters.searchText ?? "").trim().toLowerCase();
  const categoriesSet = filters.categories && filters.categories.length > 0
    ? new Set(filters.categories)
    : null;
  const userIdsSet = filters.userIds && filters.userIds.length > 0
    ? new Set(filters.userIds)
    : null;

  return entries.filter((e) => {
    if (categoriesSet && !categoriesSet.has(e.category)) return false;
    if (userIdsSet && (e.userId == null || !userIdsSet.has(e.userId))) return false;
    if (filters.fromTimestamp && e.timestamp < filters.fromTimestamp) return false;
    if (filters.toTimestamp && e.timestamp > filters.toTimestamp) return false;
    if (searchLower) {
      const blob = [
        e.description,
        e.userName,
        e.entity,
        e.entityId,
        e.rawAction,
        e.event ?? "",
        e.reason ?? "",
      ].join(" ").toLowerCase();
      if (!blob.includes(searchLower)) return false;
    }
    return true;
  });
}
