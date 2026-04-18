/**
 * db-snapshot.ts — Read-only DB access for Claude Code verification
 *
 * Sprint Z-21 · Governança executável (Opção B com R1-R3)
 * Endpoint: GET /api/admin/db-snapshot
 *
 * RESTRIÇÕES DE SEGURANÇA:
 * - Ativo APENAS quando E2E_TEST_MODE=true
 * - Autenticado via E2E_TEST_SECRET (Bearer token)
 * - Escopo limitado a projectId explícito
 * - Whitelist de 5 tabelas: risks_v4, action_plans, tasks, audit_log, projects
 * - projects: projeção restrita (sem companyProfile JSON completo)
 * - limit: default 50, max 500 (alinhado com database.md clamp [1,500])
 * - NUNCA expõe: users, sessions, DATABASE_URL, secrets
 */

import { Request, Response } from "express";
import mysql from "mysql2/promise";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface SnapshotResult {
  projectId: number;
  generatedAt: string;
  tables: Record<string, TableSnapshot>;
}

interface TableSnapshot {
  count: number;
  rows: Record<string, unknown>[];
  query: string;
}

// ── Whitelist de tabelas e projeções ─────────────────────────────────────────

const TABLE_QUERIES: Record<string, (projectId: number, limit: number) => string> = {
  risks_v4: (pid, lim) => `
    SELECT id, project_id, categoria, severidade, status,
           approved_at, rag_validated, rag_confidence,
           created_at, updated_at
    FROM risks_v4
    WHERE project_id = ${pid}
    ORDER BY created_at DESC
    LIMIT ${lim}
  `,
  action_plans: (pid, lim) => `
    SELECT id, project_id, risk_id, status,
           created_at, updated_at
    FROM action_plans
    WHERE project_id = ${pid}
    ORDER BY created_at DESC
    LIMIT ${lim}
  `,
  tasks: (pid, lim) => `
    SELECT t.id, t.action_plan_id, t.status,
           t.created_at, t.updated_at
    FROM tasks t
    JOIN action_plans ap ON t.action_plan_id = ap.id
    WHERE ap.project_id = ${pid}
    ORDER BY t.created_at DESC
    LIMIT ${lim}
  `,
  audit_log: (pid, lim) => `
    SELECT id, project_id, entity, action, entity_id,
           user_id, before_state, after_state, reason,
           created_at
    FROM audit_log
    WHERE project_id = ${pid}
    ORDER BY created_at DESC
    LIMIT ${lim}
  `,
  // R1: projects com projeção restrita — sem companyProfile JSON completo
  projects: (pid, _lim) => `
    SELECT id, name, status,
           profileCompleteness,
           profileConfidence,
           profileLastAnalyzedAt,
           scoringData,
           confirmedCnaes,
           taxRegime,
           companySize,
           createdAt,
           updatedAt
    FROM projects
    WHERE id = ${pid}
    LIMIT 1
  `,
};

// ── Aggregates para auditoria ────────────────────────────────────────────────

const AGGREGATE_QUERIES: Record<string, (projectId: number) => string> = {
  audit_log_summary: (pid) => `
    SELECT entity, action, COUNT(*) as cnt
    FROM audit_log
    WHERE project_id = ${pid}
    GROUP BY entity, action
    ORDER BY entity, action
  `,
  risks_by_status: (pid) => `
    SELECT status, severidade, COUNT(*) as cnt
    FROM risks_v4
    WHERE project_id = ${pid}
    GROUP BY status, severidade
    ORDER BY status, severidade
  `,
  plans_by_status: (pid) => `
    SELECT status, COUNT(*) as cnt
    FROM action_plans
    WHERE project_id = ${pid}
    GROUP BY status
  `,
};

// ── Handler principal ────────────────────────────────────────────────────────

export async function dbSnapshotHandler(req: Request, res: Response): Promise<void> {
  // 1. Guard: apenas quando E2E_TEST_MODE=true
  if (process.env.E2E_TEST_MODE !== "true") {
    res.status(403).json({ error: "Endpoint disponível apenas em modo E2E_TEST_MODE=true" });
    return;
  }

  // 2. Autenticação via Bearer token
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const expectedSecret = process.env.E2E_TEST_SECRET;
  if (!expectedSecret || token !== expectedSecret) {
    res.status(401).json({ error: "Unauthorized — token inválido ou ausente" });
    return;
  }

  // 3. Parâmetros
  const projectIdRaw = req.query.projectId;
  const tablesRaw = req.query.tables as string | undefined;
  const limitRaw = parseInt((req.query.limit as string) ?? "50", 10);

  if (!projectIdRaw) {
    res.status(400).json({ error: "Parâmetro obrigatório: projectId" });
    return;
  }

  const projectId = parseInt(projectIdRaw as string, 10);
  if (isNaN(projectId) || projectId <= 0) {
    res.status(400).json({ error: "projectId deve ser um inteiro positivo" });
    return;
  }

  // R2: limit clamp [1, 500]
  const limit = Math.min(Math.max(isNaN(limitRaw) ? 50 : limitRaw, 1), 500);

  // 4. Tabelas solicitadas (whitelist)
  const requestedTables = tablesRaw
    ? tablesRaw.split(",").map((t) => t.trim()).filter((t) => t in TABLE_QUERIES)
    : Object.keys(TABLE_QUERIES);

  if (requestedTables.length === 0) {
    res.status(400).json({
      error: "Nenhuma tabela válida solicitada",
      whitelist: Object.keys(TABLE_QUERIES),
    });
    return;
  }

  // 5. Executar queries
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(process.env.DATABASE_URL!);

    const tables: Record<string, TableSnapshot> = {};

    for (const tableName of requestedTables) {
      const query = TABLE_QUERIES[tableName](projectId, limit);
      const [rows] = await conn.execute(query) as [Record<string, unknown>[], unknown];
      tables[tableName] = {
        count: rows.length,
        rows,
        query: query.trim().replace(/\s+/g, " "),
      };
    }

    // Aggregates sempre incluídos
    const aggregates: Record<string, unknown[]> = {};
    for (const [aggName, aggFn] of Object.entries(AGGREGATE_QUERIES)) {
      const [rows] = await conn.execute(aggFn(projectId)) as [Record<string, unknown>[], unknown];
      aggregates[aggName] = rows;
    }

    const result: SnapshotResult & { aggregates: Record<string, unknown[]> } = {
      projectId,
      generatedAt: new Date().toISOString(),
      tables,
      aggregates,
    };

    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Erro ao executar snapshot: ${message}` });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
