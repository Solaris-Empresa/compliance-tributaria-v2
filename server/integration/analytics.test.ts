import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";

describe("Analytics Router - Dashboard Executivo", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let projectId: number;

  beforeAll(async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-user",
        name: "Test User",
        email: "test@example.com",
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
      name: "Projeto Teste Analytics",
      clientId: 1,
    });
    projectId = project.projectId;
  });

  afterAll(async () => {
    // Limpar dados de teste
    const db = await getDb();
    if (db && projectId) {
      await db.execute(`DELETE FROM actions WHERE projectId = ${projectId}`);
      await db.execute(`DELETE FROM branchAssessments WHERE projectId = ${projectId}`);
      await db.execute(`DELETE FROM corporateAssessments WHERE projectId = ${projectId}`);
      await db.execute(`DELETE FROM projectBranches WHERE projectId = ${projectId}`);
      await db.execute(`DELETE FROM projects WHERE id = ${projectId}`);
    }
  });

  it("deve obter métricas globais do usuário", async () => {
    const metrics = await caller.analytics.getGlobalMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.projects).toBeDefined();
    expect(metrics.projects.total).toBeGreaterThanOrEqual(0);
    expect(metrics.assessments).toBeDefined();
    expect(metrics.tasks).toBeDefined();
  });

  it("deve obter métricas de um projeto específico", async () => {
    const metrics = await caller.analytics.getProjectMetrics({ projectId });

    expect(metrics).toBeDefined();
    expect(metrics.project).toBeDefined();
    expect(metrics.project.id).toBe(projectId);
    expect(metrics.assessments).toBeDefined();
    expect(metrics.assessments.corporate).toBeDefined();
    expect(metrics.assessments.branches).toBeDefined();
    expect(metrics.tasks).toBeDefined();
  });

  it("deve retornar estatísticas de tarefas por status", async () => {
    const metrics = await caller.analytics.getProjectMetrics({ projectId });

    expect(metrics.tasks.byStatus).toBeDefined();
    expect(typeof metrics.tasks.byStatus).toBe("object");
    expect(metrics.tasks.total).toBeGreaterThanOrEqual(0);
  });

  it("deve retornar estatísticas de tarefas por área", async () => {
    const metrics = await caller.analytics.getProjectMetrics({ projectId });

    expect(metrics.tasks.byArea).toBeDefined();
    expect(typeof metrics.tasks.byArea).toBe("object");
  });

  it("deve retornar tarefas críticas e atrasadas", async () => {
    const metrics = await caller.analytics.getProjectMetrics({ projectId });

    expect(metrics.tasks.critical).toBeDefined();
    expect(Array.isArray(metrics.tasks.critical)).toBe(true);
    expect(metrics.tasks.delayed).toBeDefined();
    expect(Array.isArray(metrics.tasks.delayed)).toBe(true);
  });

  it("deve calcular progresso de questionários por ramo corretamente", async () => {
    const metrics = await caller.analytics.getProjectMetrics({ projectId });

    expect(metrics.assessments.branches).toBeDefined();
    expect(metrics.assessments.branches.total).toBeGreaterThanOrEqual(0);
    expect(metrics.assessments.branches.completed).toBeGreaterThanOrEqual(0);
    expect(metrics.assessments.branches.progress).toBeGreaterThanOrEqual(0);
    expect(metrics.assessments.branches.progress).toBeLessThanOrEqual(100);
  });
});
