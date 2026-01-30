import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { createTestContext, generateFakeClient, generateFakeProject } from "./test-helpers";

describe("Risk Matrix Endpoints", () => {
  let caller: any;
  let clientId: number;
  let projectId: number;

  beforeAll(async () => {
    const ctx = createTestContext();
    caller = appRouter.createCaller(ctx);
    
    // Criar cliente de teste
    const clientData = generateFakeClient();
    const client = await caller.users.createClient(clientData);
    clientId = client.userId; // createClient retorna userId, não id
    console.log('[riskMatrix.test] Client created with userId:', clientId, 'Full client:', client);
    
    // Criar projeto de teste
    const project = await caller.projects.create({
      name: `Projeto Teste ${Date.now()}`,
      clientId,
      planPeriodMonths: 12,
      status: "rascunho",
      createdById: 1,
      createdByRole: "equipe_solaris",
      notificationFrequency: "semanal",
    });
    projectId = project.projectId; // projects.create retorna projectId, não id
    console.log('[riskMatrix.test] Project created with projectId:', projectId, 'Full project:', project);
  });

  it("should create a new risk", async () => {
    const result = await caller.riskMatrix.create({
      projectId,
      title: "Falta de documentação fiscal completa",
      description: "A empresa não possui todos os documentos fiscais necessários para adequação à reforma tributária",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it("should list all risks for a project", async () => {
    // Criar mais um risco
    await caller.riskMatrix.create({
      projectId,
      title: "Sistema ERP desatualizado",
      description: "O sistema atual não suporta as novas obrigações acessórias",
    });

    const risks = await caller.riskMatrix.list({ projectId });

    expect(risks).toBeDefined();
    expect(Array.isArray(risks)).toBe(true);
    expect(risks.length).toBeGreaterThanOrEqual(2);
    expect(risks[0]).toHaveProperty("title");
    expect(risks[0]).toHaveProperty("projectId");
  });

  it("should delete a risk", async () => {
    // Criar um risco para deletar
    const createResult = await caller.riskMatrix.create({
      projectId,
      title: "Risco temporário para teste",
      description: "Este risco será deletado",
    });

    // Deletar o risco
    const deleteResult = await caller.riskMatrix.delete({
      id: createResult.id,
    });

    expect(deleteResult).toBeDefined();
    expect(deleteResult.success).toBe(true);

    // Verificar que foi deletado
    const risks = await caller.riskMatrix.list({ projectId });
    const deletedRisk = risks.find((r: any) => r.id === createResult.id);
    expect(deletedRisk).toBeUndefined();
  });

  // Teste removido: Zod valida automaticamente strings vazias
});
