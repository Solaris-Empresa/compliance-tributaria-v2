import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import * as db from "../db";

describe("Branch Plans Flow - Geração de Planos por Ramo", () => {
  let testProjectId: number;
  let testBranchIds: number[] = [];
  let testUserId: number;

  beforeAll(async () => {
    const database = await db.getDb();
    if (!database) throw new Error("Database not available");

    // Criar usuário de teste com openId único
    const uniqueId = `test-branch-plans-${Date.now()}`;
    const userResult = await database.execute(
      `INSERT INTO users (openId, name, email, role) VALUES ('${uniqueId}', 'Test Branch Plans User', 'branch-plans-${Date.now()}@test.com', 'equipe_solaris')`
    );
    testUserId = Number(userResult[0].insertId);

    // Criar projeto de teste
    const projectResult = await database.execute(
      `INSERT INTO projects (name, clientId, planPeriodMonths, status, taxRegime, companySize, createdById, createdByRole) VALUES ('Projeto Teste - Planos por Ramo', ${testUserId}, 12, 'plano_acao', 'lucro_real', 'grande', ${testUserId}, 'equipe_solaris')`
    );
    testProjectId = Number(projectResult[0].insertId);

    // Buscar 2 ramos existentes (Comércio e Indústria)
    const branchesResult = await database.execute(
      "SELECT id FROM activityBranches WHERE code IN ('COM', 'IND') LIMIT 2"
    );
    testBranchIds = (branchesResult[0] as any[]).map((b: any) => b.id);

    // Adicionar ramos ao projeto
    for (const branchId of testBranchIds) {
      await database.execute(
        `INSERT INTO projectBranches (projectId, branchId) VALUES (${testProjectId}, ${branchId})`
      );
    }

    // Criar questionário corporativo
    const corpAssessmentResult = await database.execute(
      `INSERT INTO corporateAssessments (projectId, answers, completedAt) VALUES (${testProjectId}, '${JSON.stringify({ regime: "lucro_real", size: "grande" })}', NOW())`
    );
    const corpAssessmentId = Number(corpAssessmentResult[0].insertId);

    // Criar plano corporativo
    await database.execute(
      `INSERT INTO corporateActionPlans (projectId, corporateAssessmentId, planContent, generatedAt, generatedBy) VALUES (${testProjectId}, ${corpAssessmentId}, '${JSON.stringify([{ title: "Ação Teste", description: "Descrição", responsibleArea: "TI", taskType: "OPERATIONAL", priority: "ALTA", estimatedDays: 30 }])}', NOW(), ${testUserId})`
    );

    // Criar questionários por ramo
    for (const branchId of testBranchIds) {
      await database.execute(
        `INSERT INTO branchAssessments (projectId, branchId, answers, generatedQuestions, completedAt) VALUES (${testProjectId}, ${branchId}, '${JSON.stringify({ specificQuestion: "answer" })}', '[]', NOW())`
      );
    }
  });

  it("deve buscar ramos do projeto corretamente", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: "test-branch-plans-user", role: "equipe_solaris" },
    });

    const branches = await caller.branches.getProjectBranches({ projectId: testProjectId });

    expect(branches).toBeDefined();
    expect(branches.length).toBe(2);
    expect(branches.every((b: any) => testBranchIds.includes(b.id))).toBe(true);
  });

  it("deve gerar plano por ramo via IA", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: "test-branch-plans-user", role: "equipe_solaris" },
    });

    const branchId = testBranchIds[0];

    const result = await caller.actionPlans.branch.generate({
      projectId: testProjectId,
      branchId,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.planId).toBeGreaterThan(0);
  });

  it("deve listar todos os planos por ramo do projeto", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: "test-branch-plans-user", role: "equipe_solaris" },
    });

    // Gerar planos para todos os ramos
    for (const branchId of testBranchIds) {
      await caller.actionPlans.branch.generate({
        projectId: testProjectId,
        branchId,
      });
    }

    const plans = await caller.actionPlans.branch.list({ projectId: testProjectId });

    expect(plans).toBeDefined();
    expect(plans.length).toBeGreaterThanOrEqual(2);
    expect(plans.every((p: any) => p.projectId === testProjectId)).toBe(true);
    expect(plans.every((p: any) => p.tasks && p.tasks.length > 0)).toBe(true);
  });

  it("deve buscar plano específico de um ramo", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: "test-branch-plans-user", role: "equipe_solaris" },
    });

    const branchId = testBranchIds[0];

    const plan = await caller.actionPlans.branch.get({
      projectId: testProjectId,
      branchId,
    });

    expect(plan).toBeDefined();
    expect(plan?.projectId).toBe(testProjectId);
    expect(plan?.branchId).toBe(branchId);
    expect(plan?.tasks).toBeDefined();
    expect(Array.isArray(plan?.tasks)).toBe(true);
  });

  it("deve validar estrutura das tarefas geradas", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: "test-branch-plans-user", role: "equipe_solaris" },
    });

    const branchId = testBranchIds[0];

    const plan = await caller.actionPlans.branch.get({
      projectId: testProjectId,
      branchId,
    });

    expect(plan).toBeDefined();
    expect(plan?.tasks).toBeDefined();
    expect(plan!.tasks.length).toBeGreaterThan(0);

    const firstTask = plan!.tasks[0];
    expect(firstTask).toHaveProperty("title");
    expect(firstTask).toHaveProperty("description");
    expect(firstTask).toHaveProperty("responsibleArea");
    expect(firstTask).toHaveProperty("taskType");
    expect(firstTask).toHaveProperty("priority");
    expect(firstTask).toHaveProperty("estimatedDays");

    // Validar valores válidos
    expect(["TI", "CONT", "FISC", "JUR", "OPS", "COM", "ADM"]).toContain(firstTask.responsibleArea);
    expect(["STRATEGIC", "OPERATIONAL", "COMPLIANCE"]).toContain(firstTask.taskType);
    expect(["ALTA", "MÉDIA", "BAIXA"]).toContain(firstTask.priority);
    expect(firstTask.estimatedDays).toBeGreaterThan(0);
  });
});
