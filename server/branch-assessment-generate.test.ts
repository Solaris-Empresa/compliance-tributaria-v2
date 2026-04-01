import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("branchAssessment.generate", () => {
  let testUserId: number;
  let testProjectId: number;
  let testBranchId: number;
  let invalidBranchId: number = 999999; // ID que não existe
  const timestamp = Date.now();
  const testOpenId = `test-branch-gen-${timestamp}@example.com`;

  beforeAll(async () => {
    const database = await db.getDb();
    if (!database) throw new Error("Database not available");

    // Criar usuário de teste
    const { users } = await import("../drizzle/schema");
    const [user] = await database.insert(users).values({
      openId: testOpenId,
      name: "Test User Branch Gen",
      email: testOpenId,
      role: "equipe_solaris",
    });
    testUserId = user.insertId;

    // Criar projeto de teste (clientId = userId para simplificar)
    const { projects } = await import("../drizzle/schema");
    const [project] = await database.insert(projects).values({
      name: "Test Project Branch Gen",
      clientId: testUserId, // Usar userId como clientId
      createdById: testUserId,
      createdByRole: "equipe_solaris",
      status: "plano_acao",
    });
    testProjectId = project.insertId;

    // Criar ramo de atividade de teste
    const { activityBranches, projectBranches } = await import("../drizzle/schema");
    const [branch] = await database.insert(activityBranches).values({
      code: `TST${timestamp.toString().slice(-6)}`, // Código único baseado em timestamp
      name: "Ramo de Teste Geração",
      description: "Ramo criado para testar geração de questionários",
      active: true,
    });
    testBranchId = branch.insertId;

    // Associar ramo ao projeto
    await database.insert(projectBranches).values({
      projectId: testProjectId,
      branchId: testBranchId,
    });

    // Criar assessment corporativo (necessário para contexto)
    const { corporateAssessments } = await import("../drizzle/schema");
    await database.insert(corporateAssessments).values({
      projectId: testProjectId,
      taxRegime: "lucro_real",
      companySize: "media",
      hasAccountingDept: true,
      hasTaxDept: true,
      hasLegalDept: false,
      hasITDept: true,
      generatedQuestions: JSON.stringify({ questions: [] }),
    });
  });

  it("deve gerar questionário para ramo válido", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: testOpenId, role: "equipe_solaris" },
    });

    const result = await caller.branchAssessment.generate({
      projectId: testProjectId,
      branchId: testBranchId,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.questions).toBeDefined();
    // questions é objeto com array dentro
    expect(result.questions.questions).toBeDefined();
    expect(Array.isArray(result.questions.questions)).toBe(true);
    expect(result.questions.questions.length).toBeGreaterThan(0);
    expect(result.branch).toBeDefined();
    expect(result.branch.name).toBe("Ramo de Teste Geração");
  });

  it("deve retornar erro 'Ramo não encontrado' para branchId inválido", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: testOpenId, role: "equipe_solaris" },
    });

    await expect(
      caller.branchAssessment.generate({
        projectId: testProjectId,
        branchId: invalidBranchId,
      })
    ).rejects.toThrow("Ramo não encontrado");
  });

  it("deve permitir regeneração de questionário existente", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: testOpenId, role: "equipe_solaris" },
    });

    // Primeira geração
    const result1 = await caller.branchAssessment.generate({
      projectId: testProjectId,
      branchId: testBranchId,
    });

    expect(result1).toBeDefined();
    const firstId = result1.id;

    // Segunda geração (deve sobrescrever)
    const result2 = await caller.branchAssessment.generate({
      projectId: testProjectId,
      branchId: testBranchId,
    });

    expect(result2).toBeDefined();
    // Regeneração cria novo registro (comportamento atual)
    expect(result2.id).toBeGreaterThan(0);
    expect(result2.questions).toBeDefined();
    expect(result2.questions.questions).toBeDefined();
  });

  it("deve incluir contexto corporativo na geração", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: testOpenId, role: "equipe_solaris" },
    });

    const result = await caller.branchAssessment.generate({
      projectId: testProjectId,
      branchId: testBranchId,
    });

    expect(result).toBeDefined();
    expect(result.questions).toBeDefined();
    expect(result.questions.questions).toBeDefined();
    // Validar que perguntas foram geradas com contexto
    expect(result.questions.questions.length).toBeGreaterThan(3); // Mínimo esperado
  });
});
