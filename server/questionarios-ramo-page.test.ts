import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";

describe("Questionários por Ramo - Integração Frontend/Backend", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let projectId: number;
  let branchId: number;
  let assessmentId: number;

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
      name: "Projeto Teste Questionários Ramo",
      clientId: 1,
    });
    projectId = project.projectId;

    // Obter ramo existente
    const branches = await caller.branches.list();
    branchId = branches[0].id;

    // Adicionar ramo ao projeto
    await caller.branches.addToProject({
      projectId,
      branchId,
    });
  });

  afterAll(async () => {
    // Limpar dados de teste
    const db = await getDb();
    if (db && projectId) {
      await db.execute(`DELETE FROM branchAssessments WHERE projectId = ${projectId}`);
      await db.execute(`DELETE FROM projectBranches WHERE projectId = ${projectId}`);
      await db.execute(`DELETE FROM projects WHERE id = ${projectId}`);
    }
  });

  it("deve listar ramos do projeto", async () => {
    const branches = await caller.branches.getProjectBranches({ projectId });
    
    expect(branches).toBeDefined();
    expect(Array.isArray(branches)).toBe(true);
    expect(branches.length).toBeGreaterThan(0);
    expect(branches[0]).toHaveProperty("branchId");
    expect(branches[0]).toHaveProperty("branchName");
  });

  it("deve gerar questionário para um ramo", async () => {
    const result = await caller.branchAssessment.generate({
      projectId,
      branchId,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    assessmentId = result.id;
  });

  it("deve obter questionário gerado", async () => {
    const assessment = await caller.branchAssessment.get({
      projectId,
      branchId,
    });

    expect(assessment).toBeDefined();
    expect(assessment.id).toBe(assessmentId);
    expect(assessment.generatedQuestions).toBeDefined();
    
    const questionsData = JSON.parse(assessment.generatedQuestions);
    expect(questionsData).toHaveProperty("questions");
    expect(Array.isArray(questionsData.questions)).toBe(true);
    expect(questionsData.questions.length).toBeGreaterThan(0);
  });

  it("deve salvar resposta de uma pergunta", async () => {
    const result = await caller.branchAssessment.answer({
      assessmentId,
      questionIndex: 0,
      answer: "Resposta de teste para a primeira pergunta",
    });

    expect(result.success).toBe(true);

    // Verificar se resposta foi salva
    const assessment = await caller.branchAssessment.get({
      projectId,
      branchId,
    });

    const answers = JSON.parse(assessment.answers || "{}");
    expect(answers[0]).toBe("Resposta de teste para a primeira pergunta");
  });

  it("deve completar questionário após responder todas as perguntas", async () => {
    // Obter assessment e responder todas as perguntas
    const assessment = await caller.branchAssessment.get({
      projectId,
      branchId,
    });

    const questionsData = JSON.parse(assessment.generatedQuestions);
    const questions = questionsData.questions || questionsData;
    
    // Responder todas as perguntas
    for (let i = 0; i < questions.length; i++) {
      await caller.branchAssessment.answer({
        assessmentId,
        questionIndex: i,
        answer: `Resposta ${i + 1}`,
      });
    }

    // Completar questionário
    const result = await caller.branchAssessment.complete({
      assessmentId,
    });

    expect(result.success).toBe(true);

    // Verificar se foi marcado como completo
    const completedAssessment = await caller.branchAssessment.get({
      projectId,
      branchId,
    });

    expect(completedAssessment.completedAt).toBeDefined();
    expect(completedAssessment.completedBy).toBe(1);
  });
});
