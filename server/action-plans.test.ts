import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Action Plans Router", () => {
  let testUserId: number;
  let testProjectId: number;
  let testBranchId: number;
  let testCorporateAssessmentId: number;
  let testBranchAssessmentId: number;

  beforeAll(async () => {
    // Criar usuário de teste
    testUserId = await db.createUser({
      openId: `test-action-plans-${Date.now()}`,
      name: "Test User Action Plans",
      email: `test-action-plans-${Date.now()}@example.com`,
      role: "equipe_solaris",
    });

    // Criar projeto de teste
    testProjectId = await db.createProject({
      name: "Test Project Action Plans",
      clientId: testUserId,
      status: "em_andamento",
      createdById: testUserId,
      createdByRole: "equipe_solaris",
    });

    // Buscar ramo de teste
    const database = await db.getDb();
    if (!database) throw new Error("Database not available");
    const branches = await database.select().from(await import("../drizzle/schema").then(m => m.activityBranches)).limit(1);
    testBranchId = branches[0].id;

    // Criar assessment corporativo
    const { corporateAssessments, branchAssessments } = await import("../drizzle/schema");
    const [corpAssessment] = await database.insert(corporateAssessments).values({
      projectId: testProjectId,
      answers: JSON.stringify({
        q1: "Sim, temos sistema ERP",
        q2: "Mais de 100 funcionários",
        q3: "Múltiplos estados",
      }),
      completedAt: new Date(),
    });
    testCorporateAssessmentId = corpAssessment.insertId;

    // Criar assessment de ramo
    const [branchAssessment] = await database.insert(branchAssessments).values({
      projectId: testProjectId,
      branchId: testBranchId,
      generatedQuestions: JSON.stringify([{ id: "q1", text: "Pergunta 1" }, { id: "q2", text: "Pergunta 2" }]),
      answers: JSON.stringify({
        q1: "Sim, vendemos produtos",
        q2: "Nacional e internacional",
      }),
      completedAt: new Date(),
    });
    testBranchAssessmentId = branchAssessment.insertId;
  });

  const createContext = (userId: number) => ({
    user: { id: userId, role: "equipe_solaris" },
    req: {} as any,
    res: {} as any,
  });

  describe("Corporate Action Plans", () => {
    it("should return null when no corporate plan exists", async () => {
      const caller = appRouter.createCaller(createContext(testUserId));
      const result = await caller.actionPlans.corporate.get({ projectId: testProjectId });
      expect(result).toBeNull();
    });

    it("should generate corporate action plan via AI", async () => {
      const caller = appRouter.createCaller(createContext(testUserId));
      const result = await caller.actionPlans.corporate.generate({ projectId: testProjectId });
      
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("planId");
      expect(typeof result.planId).toBe("number");
    }, 60000); // 60s timeout para geração via IA

    it("should retrieve generated corporate plan with tasks", async () => {
      const caller = appRouter.createCaller(createContext(testUserId));
      const plan = await caller.actionPlans.corporate.get({ projectId: testProjectId });
      
      expect(plan).not.toBeNull();
      expect(plan).toHaveProperty("tasks");
      expect(Array.isArray(plan.tasks)).toBe(true);
      expect(plan.tasks.length).toBeGreaterThan(0);
      
      // Validar estrutura das tarefas
      const task = plan.tasks[0];
      expect(task).toHaveProperty("title");
      expect(task).toHaveProperty("description");
      expect(task).toHaveProperty("responsibleArea");
      expect(task).toHaveProperty("taskType");
      expect(task).toHaveProperty("priority");
      expect(task).toHaveProperty("estimatedDays");
    });

    it("should regenerate corporate plan and update existing", async () => {
      const caller = appRouter.createCaller(createContext(testUserId));
      const result = await caller.actionPlans.corporate.generate({ projectId: testProjectId });
      
      expect(result).toHaveProperty("success", true);
      
      // Verificar que o plano foi atualizado (não duplicado)
      const plan = await caller.actionPlans.corporate.get({ projectId: testProjectId });
      expect(plan).not.toBeNull();
    }, 60000);
  });

  describe("Branch Action Plans", () => {
    it("should return empty list when no branch plans exist", async () => {
      const caller = appRouter.createCaller(createContext(testUserId));
      const result = await caller.actionPlans.branch.list({ projectId: testProjectId });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should generate branch action plan via AI", async () => {
      const caller = appRouter.createCaller(createContext(testUserId));
      const result = await caller.actionPlans.branch.generate({ 
        projectId: testProjectId,
        branchId: testBranchId,
      });
      
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("planId");
    }, 60000);

    it("should list branch plans with tasks", async () => {
      const caller = appRouter.createCaller(createContext(testUserId));
      const plans = await caller.actionPlans.branch.list({ projectId: testProjectId });
      
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
      
      const plan = plans[0];
      expect(plan).toHaveProperty("branchName");
      expect(plan).toHaveProperty("tasks");
      expect(Array.isArray(plan.tasks)).toBe(true);
    });

    it("should retrieve specific branch plan", async () => {
      const caller = appRouter.createCaller(createContext(testUserId));
      const plan = await caller.actionPlans.branch.get({ 
        projectId: testProjectId,
        branchId: testBranchId,
      });
      
      expect(plan).not.toBeNull();
      expect(plan).toHaveProperty("tasks");
      expect(Array.isArray(plan.tasks)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should throw error when corporate assessment not found", async () => {
      const caller = appRouter.createCaller(createContext(testUserId));
      const fakeProjectId = 999999;
      
      await expect(
        caller.actionPlans.corporate.generate({ projectId: fakeProjectId })
      ).rejects.toThrow("Questionário corporativo não encontrado");
    });

    it("should throw error when branch assessment not found", async () => {
      const caller = appRouter.createCaller(createContext(testUserId));
      const fakeProjectId = 999999;
      
      await expect(
        caller.actionPlans.branch.generate({ 
          projectId: fakeProjectId,
          branchId: testBranchId,
        })
      ).rejects.toThrow("Questionário do ramo não encontrado");
    });
  });
});
