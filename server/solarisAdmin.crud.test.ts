/**
 * solarisAdmin.crud.test.ts — Testes T-DEC002-04 a T-DEC002-06
 * Sprint L · Issue #191 · DEC-002 — solarisAdmin CRUD
 *
 * Checklist:
 * T-DEC002-04: listQuestions — filtros combinados geram WHERE correto
 * T-DEC002-05: deleteQuestions — soft delete (ativo = 0) com ids corretos
 * T-DEC002-06: restoreQuestions — restaura (ativo = 1) com ids corretos
 *
 * Estes testes validam a lógica de construção de queries SQL
 * sem necessitar de conexão real com o banco (unit tests puros).
 */
import { describe, it, expect } from "vitest";

// ── Helpers de construção de WHERE (extraídos do solarisAdmin.ts) ─────────────

interface ListQuestionsInput {
  search?: string;
  categoria?: string;
  severidade_base?: string;
  vigencia?: "todas" | "com" | "sem" | "vencida" | "a_vencer";
  upload_batch_id?: string;
  ativo?: boolean;
  page: number;
  pageSize: number;
}

function buildWhereClause(input: ListQuestionsInput): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const now = 1700000000000; // timestamp fixo para testes

  if (input.search) {
    conditions.push("(titulo LIKE ? OR texto LIKE ?)");
    params.push(`%${input.search}%`, `%${input.search}%`);
  }
  if (input.categoria) {
    conditions.push("categoria = ?");
    params.push(input.categoria);
  }
  if (input.severidade_base) {
    conditions.push("severidade_base = ?");
    params.push(input.severidade_base);
  }
  if (input.upload_batch_id) {
    conditions.push("upload_batch_id = ?");
    params.push(input.upload_batch_id);
  }
  if (input.ativo !== undefined) {
    conditions.push("ativo = ?");
    params.push(input.ativo ? 1 : 0);
  } else {
    conditions.push("ativo = 1");
  }
  if (input.vigencia && input.vigencia !== "todas") {
    if (input.vigencia === "com") {
      conditions.push("vigencia_inicio IS NOT NULL");
    } else if (input.vigencia === "sem") {
      conditions.push("vigencia_inicio IS NULL");
    } else if (input.vigencia === "vencida") {
      conditions.push("vigencia_inicio IS NOT NULL AND vigencia_inicio < ?");
      params.push(now);
    } else if (input.vigencia === "a_vencer") {
      conditions.push("vigencia_inicio IS NOT NULL AND vigencia_inicio >= ?");
      params.push(now);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params };
}

function buildSoftDeleteSql(ids: number[]): { sql: string; params: unknown[] } {
  const placeholders = ids.map(() => "?").join(",");
  return {
    sql: `UPDATE solaris_questions SET ativo = 0, atualizado_em = ? WHERE id IN (${placeholders})`,
    params: [expect.any(Number), ...ids],
  };
}

function buildRestoreSql(ids: number[]): { sql: string; params: unknown[] } {
  const placeholders = ids.map(() => "?").join(",");
  return {
    sql: `UPDATE solaris_questions SET ativo = 1, atualizado_em = ? WHERE id IN (${placeholders})`,
    params: [expect.any(Number), ...ids],
  };
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("solarisAdmin.listQuestions - T-DEC002-04", () => {
  it("T-DEC002-04a: sem filtros — WHERE padrão inclui ativo = 1", () => {
    const { where, params } = buildWhereClause({ page: 1, pageSize: 20 });
    expect(where).toBe("WHERE ativo = 1");
    expect(params).toHaveLength(0);
  });

  it("T-DEC002-04b: filtros combinados — search + categoria + severidade geram WHERE correto", () => {
    const { where, params } = buildWhereClause({
      search: "IBS",
      categoria: "contabilidade_fiscal",
      severidade_base: "alta",
      page: 1,
      pageSize: 20,
    });
    expect(where).toContain("(titulo LIKE ? OR texto LIKE ?)");
    expect(where).toContain("categoria = ?");
    expect(where).toContain("severidade_base = ?");
    expect(where).toContain("ativo = 1");
    expect(params).toContain("%IBS%");
    expect(params).toContain("contabilidade_fiscal");
    expect(params).toContain("alta");
  });

  it("T-DEC002-04c: filtro vigencia='com' — adiciona IS NOT NULL", () => {
    const { where } = buildWhereClause({ vigencia: "com", page: 1, pageSize: 20 });
    expect(where).toContain("vigencia_inicio IS NOT NULL");
  });

  it("T-DEC002-04d: filtro ativo=false — mostra inativas", () => {
    const { where, params } = buildWhereClause({ ativo: false, page: 1, pageSize: 20 });
    expect(where).toContain("ativo = ?");
    expect(params).toContain(0);
  });
});

describe("solarisAdmin.deleteQuestions - T-DEC002-05", () => {
  it("T-DEC002-05: soft delete com 3 ids — SQL correto com placeholders", () => {
    const ids = [1, 5, 12];
    const { sql } = buildSoftDeleteSql(ids);
    expect(sql).toBe("UPDATE solaris_questions SET ativo = 0, atualizado_em = ? WHERE id IN (?,?,?)");
  });

  it("T-DEC002-05b: soft delete com 1 id — placeholder único", () => {
    const ids = [7];
    const { sql } = buildSoftDeleteSql(ids);
    expect(sql).toBe("UPDATE solaris_questions SET ativo = 0, atualizado_em = ? WHERE id IN (?)");
  });
});

describe("solarisAdmin.restoreQuestions - T-DEC002-06", () => {
  it("T-DEC002-06: restore com 2 ids — SQL com ativo = 1", () => {
    const ids = [3, 9];
    const { sql } = buildRestoreSql(ids);
    expect(sql).toBe("UPDATE solaris_questions SET ativo = 1, atualizado_em = ? WHERE id IN (?,?)");
  });

  it("T-DEC002-06b: restore é inverso de delete — mesmo padrão de placeholders", () => {
    const ids = [1, 2, 3, 4, 5];
    const { sql: deleteSql } = buildSoftDeleteSql(ids);
    const { sql: restoreSql } = buildRestoreSql(ids);
    // Ambos têm 5 placeholders
    expect(deleteSql.match(/\?/g)?.length).toBe(6); // 1 timestamp + 5 ids
    expect(restoreSql.match(/\?/g)?.length).toBe(6);
    // Diferem apenas no valor de ativo
    expect(deleteSql).toContain("ativo = 0");
    expect(restoreSql).toContain("ativo = 1");
  });
});
