import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import { projects, corporateActionPlans, corporateAssessments } from "../drizzle/schema";

describe("Approvals Router", () => {
  let mockUser: { id: number; name: string; role: string };
  let caller: any;
  let projectId: number;
  let planId: number;
  let approvalId: number;

  beforeAll(async () => {
    // Mock user context
    mockUser = { id: 1, name: "Test User", role: "equipe_solaris" };
    caller = appRouter.createCaller({
      user: mockUser,
      req: {} as any,
      res: {} as any,
    });

    // Criar projeto de teste
    const database = await db.getDb();
    if (!database) throw new Error("Database not available");

    const [projectResult] = await database.insert(projects).values({
      name: "Projeto Teste Aprovações",
      clientId: 1,
      createdById: mockUser.id,
      createdByRole: "equipe_solaris",
      status: "plano_acao",
    });
    projectId = projectResult.insertId;

    // Criar assessment corporativo de teste
    const [assessmentResult] = await database.insert(corporateAssessments).values({
      projectId,
      createdById: mockUser.id,
      generatedQuestions: JSON.stringify([{ question: "Teste" }]),
      answers: JSON.stringify([{ answer: "Resposta" }]),
    });
    const assessmentId = assessmentResult.insertId;

    // Criar plano corporativo de teste
    const [planResult] = await database.insert(corporateActionPlans).values({
      projectId,
      corporateAssessmentId: assessmentId,
      planContent: JSON.stringify([{ title: "Tarefa Teste", description: "Descrição" }]),
      version: 1,
      generatedAt: new Date(),
      generatedBy: mockUser.id,
      createdById: mockUser.id,
    });
    planId = planResult.insertId;
  });

  it("deve solicitar aprovação de um plano", async () => {
    const result = await caller.approvals.request({
      planType: "corporate",
      planId,
      projectId,
    });

    expect(result.success).toBe(true);
    expect(result.approvalId).toBeTypeOf("number");
    approvalId = result.approvalId!;
  });

  it("deve listar aprovações de um projeto", async () => {
    const approvals = await caller.approvals.list({ projectId });

    expect(Array.isArray(approvals)).toBe(true);
    expect(approvals.length).toBeGreaterThan(0);
    expect(approvals[0]).toHaveProperty("status");
    expect(approvals[0].status).toBe("pending");
  });

  it("deve obter detalhes de uma aprovação", async () => {
    const approval = await caller.approvals.get({ approvalId });

    expect(approval).toHaveProperty("id");
    expect(approval).toHaveProperty("planType");
    expect(approval).toHaveProperty("reviews");
    expect(approval.planType).toBe("corporate");
    expect(Array.isArray(approval.reviews)).toBe(true);
  });

  it("deve adicionar comentário/revisão", async () => {
    const result = await caller.approvals.addReview({
      approvalId,
      comment: "Este plano precisa de ajustes na área fiscal",
      reviewType: "concern",
    });

    expect(result.success).toBe(true);
    expect(result.reviewId).toBeTypeOf("number");

    // Verificar se o comentário foi adicionado
    const approval = await caller.approvals.get({ approvalId });
    expect(approval.reviews.length).toBe(1);
    expect(approval.reviews[0].comment).toContain("ajustes na área fiscal");
    expect(approval.reviews[0].reviewType).toBe("concern");
  });

  it("deve aprovar um plano", async () => {
    const result = await caller.approvals.approve({
      approvalId,
      comments: "Plano aprovado após análise detalhada",
    });

    expect(result.success).toBe(true);

    // Verificar status atualizado
    const approval = await caller.approvals.get({ approvalId });
    expect(approval.status).toBe("approved");
    expect(approval.reviewComments).toContain("análise detalhada");
    expect(approval.reviewedBy).toBe(mockUser.id);
  });

  it("deve solicitar aprovação e rejeitar", async () => {
    // Criar novo plano para rejeição
    const database = await db.getDb();
    if (!database) throw new Error("Database not available");

    // Criar assessment para o plano
    const [assessmentResult] = await database.insert(corporateAssessments).values({
      projectId,
      createdById: mockUser.id,
      generatedQuestions: JSON.stringify([{ question: "Teste" }]),
      answers: JSON.stringify([{ answer: "Resposta" }]),
    });

    const [planResult] = await database.insert(corporateActionPlans).values({
      projectId,
      corporateAssessmentId: assessmentResult.insertId,
      planContent: JSON.stringify([{ title: "Plano para Rejeitar" }]),
      version: 1,
      generatedAt: new Date(),
      generatedBy: mockUser.id,
      createdById: mockUser.id,
    });
    const newPlanId = planResult.insertId;

    const requestResult = await caller.approvals.request({
      planType: "corporate",
      planId: newPlanId,
      projectId,
    });

    const result = await caller.approvals.reject({
      approvalId: requestResult.approvalId!,
      comments: "Plano não atende aos requisitos mínimos",
    });

    expect(result.success).toBe(true);

    // Verificar status
    const approval = await caller.approvals.get({ approvalId: requestResult.approvalId! });
    expect(approval.status).toBe("rejected");
    expect(approval.reviewComments).toContain("requisitos mínimos");
  });

  it("deve solicitar revisão", async () => {
    // Criar novo plano para revisão
    const database = await db.getDb();
    if (!database) throw new Error("Database not available");

    // Criar assessment para o plano
    const [assessmentResult] = await database.insert(corporateAssessments).values({
      projectId,
      createdById: mockUser.id,
      generatedQuestions: JSON.stringify([{ question: "Teste" }]),
      answers: JSON.stringify([{ answer: "Resposta" }]),
    });

    const [planResult] = await database.insert(corporateActionPlans).values({
      projectId,
      corporateAssessmentId: assessmentResult.insertId,
      planContent: JSON.stringify([{ title: "Plano para Revisão" }]),
      version: 1,
      generatedAt: new Date(),
      generatedBy: mockUser.id,
      createdById: mockUser.id,
    });
    const newPlanId = planResult.insertId;

    const requestResult = await caller.approvals.request({
      planType: "corporate",
      planId: newPlanId,
      projectId,
    });

    const result = await caller.approvals.requestRevision({
      approvalId: requestResult.approvalId!,
      comments: "Necessário adicionar mais detalhes nas tarefas operacionais",
    });

    expect(result.success).toBe(true);

    // Verificar status
    const approval = await caller.approvals.get({ approvalId: requestResult.approvalId! });
    expect(approval.status).toBe("needs_revision");
    expect(approval.reviewComments).toContain("tarefas operacionais");
  });
});
