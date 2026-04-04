import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import * as db from "../db";

describe("Fluxo Completo: Questionários + Planos por Ramo", () => {
  let projectId: number;
  let branchId1: number;
  let branchId2: number;
  const testOpenId = `test-branch-flow-${Date.now()}@example.com`;

  beforeAll(async () => {
    const database = await db.getDb();
    if (!database) throw new Error("Database not available");

    // Criar usuário de teste
    const { users } = await import("../drizzle/schema");
    const [user] = await database.insert(users).values({
      openId: testOpenId,
      name: "Test User - Branch Flow",
      email: testOpenId,
      role: "equipe_solaris",
    });

    // Criar projeto de teste
    const { projects } = await import("../drizzle/schema");
    const [project] = await database.insert(projects).values({
      name: "Projeto Teste - Fluxo Completo",
      clientId: user.insertId,
      createdById: user.insertId,
      taxRegime: "lucro_presumido",
      companySize: "media",
      status: "plano_acao",
    });
    projectId = project.insertId;

    // Criar ramos de teste
    const { activityBranches, projectBranches } = await import("../drizzle/schema");
    
    const [branch1] = await database.insert(activityBranches).values({
      code: "TEST001",
      name: "Comércio Teste",
      description: "Ramo de teste para comércio",
    });
    branchId1 = branch1.insertId;

    const [branch2] = await database.insert(activityBranches).values({
      code: "TEST002",
      name: "Indústria Teste",
      description: "Ramo de teste para indústria",
    });
    branchId2 = branch2.insertId;

    // Vincular ramos ao projeto
    await database.insert(projectBranches).values([
      { projectId, branchId: branchId1 },
      { projectId, branchId: branchId2 },
    ]);

    // Criar questionário corporativo (necessário para contexto)
    const { corporateAssessments } = await import("../drizzle/schema");
    await database.insert(corporateAssessments).values({
      projectId,
      taxRegime: "lucro_presumido",
      companySize: "media",
      hasAccountingDept: true,
      hasTaxDept: true,
      hasLegalDept: false,
      hasITDept: true,
      generatedQuestions: JSON.stringify({ questions: [] }),
    });
  });

  it("deve gerar questionários por ramo automaticamente", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: testOpenId, role: "equipe_solaris" },
    });

    // Gerar questionário para ramo 1
    const result1 = await caller.branchAssessment.generate({
      projectId,
      branchId: branchId1,
    });

    expect(result1).toBeDefined();
    expect(result1.id).toBeGreaterThan(0);
    expect(result1.questions).toBeDefined();
    expect(result1.branch).toBeDefined();
    expect(result1.branch.name).toBe("Comércio Teste");

    // Gerar questionário para ramo 2
    const result2 = await caller.branchAssessment.generate({
      projectId,
      branchId: branchId2,
    });

    expect(result2).toBeDefined();
    expect(result2.id).toBeGreaterThan(0);
    expect(result2.branch.name).toBe("Indústria Teste");
  });

  it("deve gerar planos por ramo após questionários existirem", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: testOpenId, role: "equipe_solaris" },
    });

    // Gerar plano para ramo 1 (questionário já existe do teste anterior)
    const result1 = await caller.actionPlans.branch.generate({
      projectId,
      branchId: branchId1,
    });

    expect(result1).toBeDefined();
    expect(result1.success).toBe(true);
    expect(result1.planId).toBeGreaterThan(0);

    // Gerar plano para ramo 2
    const result2 = await caller.actionPlans.branch.generate({
      projectId,
      branchId: branchId2,
    });

    expect(result2).toBeDefined();
    expect(result2.success).toBe(true);
    expect(result2.planId).toBeGreaterThan(0);
  });

  it("deve listar todos os planos por ramo do projeto", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: testOpenId, role: "equipe_solaris" },
    });

    const plans = await caller.actionPlans.branch.list({ projectId });

    expect(plans).toBeDefined();
    expect(plans.length).toBe(2);
    expect(plans[0].branch).toBeDefined();
    expect(plans[0].tasks).toBeDefined();
    expect(Array.isArray(plans[0].tasks)).toBe(true);
  });

  it("deve validar estrutura completa do fluxo", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: testOpenId, role: "equipe_solaris" },
    });

    // Validar questionários
    const assessments = await caller.branchAssessment.list({ projectId });
    expect(assessments.length).toBe(2);

    // Validar planos
    const plans = await caller.actionPlans.branch.list({ projectId });
    expect(plans.length).toBe(2);

    // Validar que cada plano tem tarefas
    for (const plan of plans) {
      expect(plan.tasks).toBeDefined();
      expect(plan.tasks.length).toBeGreaterThan(0);
      
      // Validar estrutura de cada tarefa
      for (const task of plan.tasks) {
        expect(task.title).toBeDefined();
        expect(task.description).toBeDefined();
        expect(task.responsibleArea).toBeDefined();
        expect(task.priority).toBeDefined();
      }
    }
  });
});
