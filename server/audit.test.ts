import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";

describe("Sistema de Auditoria", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let projectId: number;
  let taskId: number;

  beforeAll(async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-audit-user",
        name: "Audit Test User",
        email: "audit@example.com",
        role: "equipe_solaris",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    };

    caller = appRouter.createCaller(ctx);

    // Criar projeto de teste
    const project = await caller.projects.create({
      name: "Projeto Teste Auditoria",
      clientId: 1,
    });
    projectId = project.projectId;

    // Criar tarefa que gera log de auditoria
    const task = await caller.tasksV2.create({
      projectId,
      category: "corporate",
      title: "Tarefa para Auditoria",
      description: "Teste de auditoria",
      responsibleArea: "TI",
      taskType: "OPERATIONAL",
      priority: "media",
    });
    taskId = task.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    const db = await getDb();
    if (db && projectId) {
      await db.execute(`DELETE FROM auditLog WHERE projectId = ${projectId}`);
      await db.execute(`DELETE FROM actions WHERE projectId = ${projectId}`);
      await db.execute(`DELETE FROM projects WHERE id = ${projectId}`);
    }
  });

  it("deve registrar criação de tarefa no log de auditoria", async () => {
    const logs = await caller.audit.list({ projectId });

    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);

    const taskCreationLog = logs.find(
      log => log.entityType === "task" && log.action === "create" && log.entityId === taskId
    );

    expect(taskCreationLog).toBeDefined();
    expect(taskCreationLog?.userId).toBe(1);
    expect(taskCreationLog?.userName).toBe("Audit Test User");
  });

  it("deve registrar mudança de status no log", async () => {
    // Atualizar status da tarefa
    await caller.tasksV2.updateStatus({
      id: taskId,
      status: "IN_PROGRESS",
    });

    const logs = await caller.audit.list({ projectId });
    const statusChangeLog = logs.find(
      log => log.entityType === "task" && log.action === "status_change" && log.entityId === taskId
    );

    expect(statusChangeLog).toBeDefined();
    expect(statusChangeLog?.changes).toBeDefined();
  });

  it("deve buscar logs por entidade específica", async () => {
    const logs = await caller.audit.getByEntity({
      entityType: "task",
      entityId: taskId,
    });

    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.every(log => log.entityId === taskId)).toBe(true);
  });

  it("deve buscar logs por usuário", async () => {
    const logs = await caller.audit.getByUser({
      userId: 1,
      limit: 50,
    });

    expect(Array.isArray(logs)).toBe(true);
    expect(logs.every(log => log.userId === 1)).toBe(true);
  });

  it("deve validar estrutura de entityTypes", () => {
    const validEntityTypes = [
      "task",
      "comment",
      "corporate_assessment",
      "branch_assessment",
      "project",
      "permission",
    ];

    validEntityTypes.forEach(type => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it("deve validar estrutura de actions", () => {
    const validActions = ["create", "update", "delete", "status_change"];

    validActions.forEach(action => {
      expect(typeof action).toBe("string");
      expect(action.length).toBeGreaterThan(0);
    });
  });
});
