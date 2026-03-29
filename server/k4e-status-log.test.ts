/**
 * K-4-E — Testes de auditoria jurídica: project_status_log
 * Issue #212 — Rastreabilidade de transições de status para fins jurídicos.
 *
 * Casos obrigatórios (definidos no prompt K-4-E v4):
 *   1. Transição válida gera registro com from_status, to_status e changed_by corretos
 *   2. Criação de projeto gera registro com from_status: null
 *   3. Falha no insert do log não propaga — transição retorna sucesso
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import * as db from "./db";

// ─── Contexto tRPC de teste ────────────────────────────────────────────────
function makeCtx(userId = 1, role = "equipe_solaris"): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-k4e",
      name: "Test K4E",
      email: "k4e@test.com",
      role: role as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };
}

// ─── Suite principal ───────────────────────────────────────────────────────
describe("K-4-E — project_status_log: auditoria jurídica de transições", () => {
  let projectId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    caller = appRouter.createCaller(makeCtx());
    // Criar projeto de teste — também valida o Caso 2 (from_status: null)
    const result = await caller.projects.create({
      name: "Projeto K4E Auditoria Teste",
      clientId: 1,
    });
    projectId = result.projectId;
    expect(projectId).toBeGreaterThan(0);
  });

  afterAll(async () => {
    const database = await getDb();
    if (database && projectId) {
      // Limpar dados de teste em ordem de FK
      await database.execute(`DELETE FROM project_status_log WHERE project_id = ${projectId}`);
      await database.execute(`DELETE FROM projects WHERE id = ${projectId}`);
    }
  });

  // ─── Caso 2: Criação de projeto gera registro com from_status: null ──────
  it("Caso 2 — criação de projeto registra from_status: null e to_status: 'rascunho'", async () => {
    const database = await getDb();
    expect(database).toBeTruthy();

    const rows = await database!.execute(
      `SELECT * FROM project_status_log WHERE project_id = ${projectId} ORDER BY id ASC LIMIT 1`
    ) as any;

    const logRows = Array.isArray(rows) ? rows[0] : rows;
    const firstLog = Array.isArray(logRows) ? logRows[0] : logRows;

    expect(firstLog).toBeDefined();
    expect(firstLog.from_status).toBeNull();
    expect(firstLog.to_status).toBe("rascunho");
    expect(firstLog.changed_by).toBe("1"); // ctx.user.id como string
    expect(firstLog.project_id).toBe(projectId);
  });

  // ─── Caso 1: Transição válida gera registro correto ───────────────────────
  it("Caso 1 — transição válida registra from_status, to_status e changed_by corretos", async () => {
    // Executar transição de status
    const result = await caller.projects.updateStatus({
      projectId,
      status: "em_avaliacao",
    });
    expect(result.success).toBe(true);
    expect(result.previousStatus).toBe("rascunho");
    expect(result.newStatus).toBe("em_avaliacao");

    // Verificar registro de auditoria
    const database = await getDb();
    const rows = await database!.execute(
      `SELECT * FROM project_status_log WHERE project_id = ${projectId} ORDER BY id DESC LIMIT 1`
    ) as any;

    const logRows = Array.isArray(rows) ? rows[0] : rows;
    const lastLog = Array.isArray(logRows) ? logRows[0] : logRows;

    expect(lastLog).toBeDefined();
    expect(lastLog.from_status).toBe("rascunho");
    expect(lastLog.to_status).toBe("em_avaliacao");
    expect(lastLog.changed_by).toBe("1");
    expect(lastLog.project_id).toBe(projectId);
    expect(lastLog.created_at).toBeTruthy();
  });

  // ─── Caso 3: Falha no log não impede a operação principal ────────────────
  it("Caso 3 — falha no insertStatusLog não propaga e a função retorna void", async () => {
    // Testar o isolamento diretamente: passar projectId inválido (FK inexistente)
    // para forçar erro real de banco. A função tem try/catch interno e
    // NUNCA deve propagar o erro.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // projectId -999999 não existe no banco — vai gerar erro de FK constraint
    // A função deve absorver o erro silenciosamente e retornar void
    await expect(
      db.insertStatusLog(-999999, "rascunho", "aprovado", "system")
    ).resolves.toBeUndefined();

    // Deve ter logado o erro no console.error (auditoria do próprio log)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[insertStatusLog]"),
      expect.anything()
    );

    consoleSpy.mockRestore();
  });
});
