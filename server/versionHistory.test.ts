import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { createTestContext } from "./test-helpers";
import * as db from "./db";

describe("Version History - Briefing", () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let projectId: number;

  beforeEach(async () => {
    ctx = await createTestContext({
      id: 1,
      openId: "test-user-1",
      name: "Test User",
      email: "test@example.com",
      role: "equipe_solaris",
    });
    caller = appRouter.createCaller(ctx);

    // Criar projeto de teste
    projectId = await db.createProject({
      name: "Projeto Teste Histórico Briefing",
      clientId: 1,
      taxRegime: "lucro_presumido",
      companySize: "media",
      annualRevenue: 5000000,
      businessSector: "servicos",
      mainActivity: "Consultoria",
      status: "rascunho",
      createdById: ctx.user.id,
      createdByRole: ctx.user.role,
    });

    // Criar assessment fase 1 e 2
    await db.saveAssessmentPhase1({
      projectId,
      answers: JSON.stringify({}),
      completedAt: new Date(),
    });
    
    await db.saveAssessmentPhase2({
      projectId,
      generatedQuestions: JSON.stringify([]),
      answers: JSON.stringify({}),
      completedAt: new Date(),
    });
  });

  it("should save briefing version when regenerating", async () => {
    // Gerar briefing inicial (versão 1)
    const briefing1 = await caller.briefing.generate({ projectId });
    expect(briefing1).toBeDefined();

    // Aguardar um pouco para garantir timestamps diferentes
    await new Promise(resolve => setTimeout(resolve, 100));

    // Regenerar briefing (deve criar versão 2 e arquivar versão 1)
    const briefing2 = await caller.briefing.generate({ projectId });
    expect(briefing2).toBeDefined();

    // Buscar histórico de versões
    const versions = await caller.briefing.listVersions({ projectId });
    
    // Deve ter 1 versão arquivada (a versão 1)
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].archivedAt).toBeDefined();
  });

  it("should retrieve specific version from history", async () => {
    // Gerar 2 versões
    await caller.briefing.generate({ projectId });
    await new Promise(resolve => setTimeout(resolve, 100));
    await caller.briefing.generate({ projectId });

    // Buscar versão 1 do histórico
    const version1 = await caller.briefing.getVersion({ 
      projectId, 
      version: 1 
    });

    expect(version1).toBeDefined();
    expect(version1?.version).toBe(1);
    expect(version1?.summaryText).toBeDefined();
    expect(version1?.gapsAnalysis).toBeDefined();
  });

  it("should maintain version sequence correctly", async () => {
    // Gerar 3 versões
    await caller.briefing.generate({ projectId });
    await new Promise(resolve => setTimeout(resolve, 100));
    await caller.briefing.generate({ projectId });
    await new Promise(resolve => setTimeout(resolve, 100));
    await caller.briefing.generate({ projectId });

    // Buscar histórico
    const versions = await caller.briefing.listVersions({ projectId });
    
    // Deve ter 2 versões arquivadas (versões 1 e 2)
    expect(versions).toHaveLength(2);
    
    // Verificar ordem decrescente (mais recente primeiro)
    expect(versions[0].version).toBe(2);
    expect(versions[1].version).toBe(1);
  });

  it("should return empty array when no versions exist", async () => {
    // Buscar histórico sem ter gerado nenhum briefing
    const versions = await caller.briefing.listVersions({ projectId });
    
    expect(versions).toHaveLength(0);
  });
});

describe("Version History - Action Plan", () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let projectId: number;

  beforeEach(async () => {
    ctx = await createTestContext({
      id: 1,
      openId: "test-user-1",
      name: "Test User",
      email: "test@example.com",
      role: "equipe_solaris",
    });
    caller = appRouter.createCaller(ctx);

    // Criar projeto de teste
    projectId = await db.createProject({
      name: "Projeto Teste Histórico Action Plan",
      clientId: 1,
      taxRegime: "lucro_presumido",
      companySize: "media",
      annualRevenue: 5000000,
      businessSector: "servicos",
      mainActivity: "Consultoria",
      status: "rascunho",
      createdById: ctx.user.id,
      createdByRole: ctx.user.role,
      planPeriodMonths: 12,
    });

    // Criar assessment fase 1 e 2
    await db.saveAssessmentPhase1({
      projectId,
      answers: JSON.stringify({}),
      completedAt: new Date(),
    });
    
    await db.saveAssessmentPhase2({
      projectId,
      generatedQuestions: JSON.stringify([]),
      answers: JSON.stringify({}),
      completedAt: new Date(),
    });

    // Gerar briefing (necessário para gerar action plan)
    await caller.briefing.generate({ projectId });
  });

  it("should save action plan version when regenerating", async () => {
    // Gerar action plan inicial (versão 1)
    const plan1 = await caller.actionPlan.generate({ projectId });
    expect(plan1).toBeDefined();

    // Aguardar um pouco para garantir timestamps diferentes
    await new Promise(resolve => setTimeout(resolve, 100));

    // Regenerar action plan (deve criar versão 2 e arquivar versão 1)
    const plan2 = await caller.actionPlan.generate({ projectId });
    expect(plan2).toBeDefined();

    // Buscar histórico de versões
    const versions = await caller.actionPlan.listVersions({ projectId });
    
    // Deve ter 1 versão arquivada (a versão 1)
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].archivedAt).toBeDefined();
  });

  it("should retrieve specific version from history", async () => {
    // Gerar 2 versões
    await caller.actionPlan.generate({ projectId });
    await new Promise(resolve => setTimeout(resolve, 100));
    await caller.actionPlan.generate({ projectId });

    // Buscar versão 1 do histórico
    const version1 = await caller.actionPlan.getVersion({ 
      projectId, 
      version: 1 
    });

    expect(version1).toBeDefined();
    expect(version1?.version).toBe(1);
    expect(version1?.planData).toBeDefined();
  });

  it("should return empty array when no versions exist", async () => {
    // Buscar histórico sem ter gerado nenhum action plan
    const versions = await caller.actionPlan.listVersions({ projectId });
    
    expect(versions).toHaveLength(0);
  });
});

describe("Version History - Access Control", () => {
  it("should deny access to versions of projects user doesn't have access to", async () => {
    // Criar contexto de usuário sem acesso ao projeto
    const ctx = await createTestContext({
      id: 999,
      openId: "unauthorized-user",
      name: "Unauthorized User",
      email: "unauthorized@example.com",
      role: "cliente",
    });
    const caller = appRouter.createCaller(ctx);

    // Tentar acessar histórico de projeto inexistente/sem acesso
    await expect(
      caller.briefing.listVersions({ projectId: 99999 })
    ).rejects.toThrow();
  });
});
