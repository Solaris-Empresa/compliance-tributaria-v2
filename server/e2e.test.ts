/**
 * Testes End-to-End (E2E) - Fluxo Completo do Usuário
 * 
 * Este arquivo contém testes que simulam o fluxo real de um usuário
 * desde a criação do projeto até transições de status.
 * 
 * Fluxo testado:
 * 1. Criar projeto
 * 2. Preencher Assessment Fase 1
 * 3. Completar Fase 1 e verificar transição de status
 * 4. Salvar respostas da Fase 2
 * 5. Atualizar status manualmente (simulando navegação)
 * 6. Verificar controle de acesso
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { createTestContext, generateFakeAssessmentPhase1 } from "./test-helpers";
import * as db from "./db";

describe("E2E: Fluxo Completo do Usuário", () => {
  let projectId: number;
  let clientId: number;
  let equipeUserId: number;
  const ctx = createTestContext({ userId: 1, role: "equipe_solaris" });
  const caller = appRouter.createCaller(ctx);

  beforeAll(async () => {
    // Criar IDs de teste
    equipeUserId = 1;
    clientId = Math.floor(Math.random() * 1000000) + 1;
  });

  it("E2E: Fluxo básico - criar projeto até transições de status", async () => {
    // ============================================
    // ETAPA 1: CRIAR PROJETO
    // ============================================
    console.log("\n[E2E] ETAPA 1: Criando projeto...");
    
    const projectData = {
      name: `Projeto E2E ${Date.now()}`,
      clientId,
      notificationFrequency: "semanal" as const,
      planPeriodMonths: 12,
    };

    const createdProject = await caller.projects.create(projectData);
    projectId = createdProject.projectId;

    expect(projectId).toBeGreaterThan(0);
    console.log(`[E2E] ✅ Projeto criado: ID ${projectId}`);

    // Verificar status inicial
    let project = await db.getProjectById(projectId);
    expect(project?.status).toBe("rascunho");
    console.log(`[E2E] ✅ Status inicial: ${project?.status}`);

    // ============================================
    // ETAPA 2: PREENCHER ASSESSMENT FASE 1
    // ============================================
    console.log("\n[E2E] ETAPA 2: Preenchendo Assessment Fase 1...");

    const phase1Data = generateFakeAssessmentPhase1(projectId, {
      taxRegime: "lucro_real" as const,
      companySize: "grande" as const,
      annualRevenue: "50000000",
      businessSector: "Tecnologia",
      employeeCount: 500,
      hasInternationalOperations: true,
      mainChallenges: "Adaptação à reforma tributária CBS/IBS",
      complianceGoals: "Estar 100% em conformidade até 2026",
    });

    await caller.assessmentPhase1.save(phase1Data);
    console.log("[E2E] ✅ Assessment Fase 1 salvo com sucesso");

    // ============================================
    // ETAPA 3: COMPLETAR FASE 1
    // ============================================
    console.log("\n[E2E] ETAPA 3: Completando Fase 1...");

    await caller.assessmentPhase1.complete({ projectId });
    console.log("[E2E] ✅ Assessment Fase 1 completado");

    // Verificar que projeto avançou para assessment_fase2
    project = await db.getProjectById(projectId);
    expect(project?.status).toBe("assessment_fase2");
    console.log(`[E2E] ✅ Status atualizado: ${project?.status}`);

    // ============================================
    // ETAPA 4: ATUALIZAR STATUS MANUALMENTE
    // ============================================
    console.log("\n[E2E] ETAPA 4: Atualizando status manualmente...");

    // Simular navegação para briefing
    await caller.projects.updateStatus({
      projectId,
      status: "em_andamento",
    });

    project = await db.getProjectById(projectId);
    expect(project?.status).toBe("em_andamento");
    console.log(`[E2E] ✅ Status atualizado: ${project?.status}`);

    // Atualizar para concluído
    await caller.projects.updateStatus({
      projectId,
      status: "concluido",
    });

    project = await db.getProjectById(projectId);
    expect(project?.status).toBe("concluido");
    console.log(`[E2E] ✅ Status final: ${project?.status}`);

    // ============================================
    // RESUMO FINAL
    // ============================================
    console.log("\n[E2E] ==========================================");
    console.log("[E2E] ✅ TESTE E2E BÁSICO EXECUTADO COM SUCESSO!");
    console.log("[E2E] ==========================================");
    console.log(`[E2E] Projeto ID: ${projectId}`);
    console.log(`[E2E] Status final: ${project?.status}`);
    console.log(`[E2E] Transições: rascunho → assessment_fase2 → em_andamento → concluido`);
    console.log("[E2E] ==========================================\n");
  });

  it("E2E: Verificar controle de acesso - cliente não pode acessar projeto de outro", async () => {
    console.log("\n[E2E] TESTE DE SEGURANÇA: Cliente tentando acessar projeto de outro...");

    // Criar novo projeto
    const newProject = await caller.projects.create({
      name: `Projeto Segurança ${Date.now()}`,
      clientId: Math.floor(Math.random() * 1000000) + 1,
      notificationFrequency: "semanal" as const,
      planPeriodMonths: 12,
    });

    // Tentar acessar com contexto de cliente diferente
    const clienteCtx = createTestContext({ userId: 999999, role: "cliente" });
    const clienteCaller = appRouter.createCaller(clienteCtx);

    await expect(
      clienteCaller.projects.getById({ id: newProject.projectId })
    ).rejects.toThrow("FORBIDDEN");

    console.log("[E2E] ✅ Segurança validada: cliente não pode acessar projeto de outro");
  });

  it("E2E: Verificar que equipe_solaris tem acesso total", async () => {
    console.log("\n[E2E] TESTE DE ACESSO: equipe_solaris acessa qualquer projeto...");

    // Criar projeto com cliente aleatório
    const testProject = await caller.projects.create({
      name: `Projeto Acesso ${Date.now()}`,
      clientId: Math.floor(Math.random() * 1000000) + 1,
      notificationFrequency: "semanal" as const,
      planPeriodMonths: 12,
    });

    // Equipe SOLARIS deve conseguir acessar
    const project = await caller.projects.getById({ id: testProject.projectId });
    expect(project).toBeDefined();
    expect(project.id).toBe(testProject.projectId);

    console.log("[E2E] ✅ Acesso validado: equipe_solaris acessa qualquer projeto");
  });

  it("E2E: Verificar salvamento e recuperação de Assessment Fase 1", async () => {
    console.log("\n[E2E] TESTE DE PERSISTÊNCIA: Salvar e recuperar Assessment Fase 1...");

    // Criar projeto
    const testProject = await caller.projects.create({
      name: `Projeto Persistência ${Date.now()}`,
      clientId,
      notificationFrequency: "semanal" as const,
      planPeriodMonths: 12,
    });

    // Salvar dados da Fase 1
    const phase1Data = generateFakeAssessmentPhase1(testProject.projectId, {
      taxRegime: "simples_nacional" as const,
      companySize: "pequena" as const,
      annualRevenue: "1000000",
      businessSector: "Comércio",
      employeeCount: 10,
    });

    await caller.assessmentPhase1.save(phase1Data);

    // Recuperar dados
    const savedPhase1 = await caller.assessmentPhase1.get({ projectId: testProject.projectId });

    expect(savedPhase1).toBeDefined();
    expect(savedPhase1?.taxRegime).toBe("simples_nacional");
    expect(savedPhase1?.companySize).toBe("pequena");
    // annualRevenue é armazenado como DECIMAL no banco e retorna com .00
    expect(savedPhase1?.annualRevenue).toMatch(/^1000000(\.00)?$/);
    expect(savedPhase1?.businessSector).toBe("Comércio");
    expect(savedPhase1?.employeeCount).toBe(10);

    console.log("[E2E] ✅ Persistência validada: dados salvos e recuperados corretamente");
  });

  it("E2E: Verificar transições de status sequenciais", async () => {
    console.log("\n[E2E] TESTE DE TRANSIÇÕES: Validar sequência de status...");

    // Criar projeto
    const testProject = await caller.projects.create({
      name: `Projeto Transições ${Date.now()}`,
      clientId,
      notificationFrequency: "semanal" as const,
      planPeriodMonths: 12,
    });

    const pid = testProject.projectId;

    // Status inicial: rascunho
    let project = await db.getProjectById(pid);
    expect(project?.status).toBe("rascunho");
    console.log(`[E2E] ✅ Status 1: ${project?.status}`);

    // Preencher e completar Fase 1 → assessment_fase2
    const phase1 = generateFakeAssessmentPhase1(pid);
    await caller.assessmentPhase1.save(phase1);
    await caller.assessmentPhase1.complete({ projectId: pid });

    project = await db.getProjectById(pid);
    expect(project?.status).toBe("assessment_fase2");
    console.log(`[E2E] ✅ Status 2: ${project?.status}`);

    // Atualizar manualmente → em_andamento
    await caller.projects.updateStatus({ projectId: pid, status: "em_andamento" });

    project = await db.getProjectById(pid);
    expect(project?.status).toBe("em_andamento");
    console.log(`[E2E] ✅ Status 3: ${project?.status}`);

    // Atualizar → concluido
    await caller.projects.updateStatus({ projectId: pid, status: "concluido" });

    project = await db.getProjectById(pid);
    expect(project?.status).toBe("concluido");
    console.log(`[E2E] ✅ Status 4: ${project?.status}`);

    // Arquivar
    await caller.projects.updateStatus({ projectId: pid, status: "arquivado" });

    project = await db.getProjectById(pid);
    expect(project?.status).toBe("arquivado");
    console.log(`[E2E] ✅ Status 5: ${project?.status}`);

    console.log("[E2E] ✅ Todas as transições de status funcionaram corretamente");
  });
});

// ============================================================================
// TESTES E2E COM MOCKS DE LLM
// ============================================================================

describe("E2E com Mocks LLM: Fluxo Completo com Geração de Conteúdo", () => {
  let projectId: number;
  let clientId: number;
  const ctx = createTestContext({ userId: 1, role: "equipe_solaris" });
  const caller = appRouter.createCaller(ctx);

  // Importar mocks dinamicamente
  let mockInvokeLLM: any;
  let originalInvokeLLM: any;

  beforeAll(async () => {
    clientId = Math.floor(Math.random() * 1000000) + 1;

    // Importar módulo de mocks
    const llmMock = await import("./llm.mock");
    mockInvokeLLM = llmMock.createMockInvokeLLM();

    // Substituir invokeLLM real pelo mock
    const llmModule = await import("./_core/llm");
    originalInvokeLLM = llmModule.invokeLLM;
    (llmModule as any).invokeLLM = mockInvokeLLM;
  });

  afterAll(() => {
    // Restaurar invokeLLM original
    if (originalInvokeLLM) {
      const llmModule = require("./_core/llm");
      llmModule.invokeLLM = originalInvokeLLM;
    }
  });

  it("E2E com Mock: Fluxo completo até geração de briefing", async () => {
    console.log("\n[E2E MOCK] ========================================");
    console.log("[E2E MOCK] TESTE: Fluxo completo até briefing");
    console.log("[E2E MOCK] ========================================\n");

    // ============================================
    // ETAPA 1: CRIAR PROJETO
    // ============================================
    console.log("[E2E MOCK] ETAPA 1: Criando projeto...");

    const projectData = {
      name: `Projeto E2E Mock Briefing ${Date.now()}`,
      clientId,
      notificationFrequency: "semanal" as const,
      planPeriodMonths: 12,
    };

    const createdProject = await caller.projects.create(projectData);
    projectId = createdProject.projectId;

    expect(projectId).toBeGreaterThan(0);
    console.log(`[E2E MOCK] ✅ Projeto criado: ID ${projectId}`);

    // ============================================
    // ETAPA 2: PREENCHER E COMPLETAR FASE 1
    // ============================================
    console.log("\n[E2E MOCK] ETAPA 2: Preenchendo Assessment Fase 1...");

    const phase1Data = generateFakeAssessmentPhase1(projectId, {
      taxRegime: "lucro_real" as const,
      companySize: "grande" as const,
      annualRevenue: "50000000",
      businessSector: "Tecnologia",
      employeeCount: 500,
    });

    await caller.assessmentPhase1.save(phase1Data);
    await caller.assessmentPhase1.complete({ projectId });

    let project = await db.getProjectById(projectId);
    expect(project?.status).toBe("assessment_fase2");
    console.log(`[E2E MOCK] ✅ Fase 1 completada, status: ${project?.status}`);

    // ============================================
    // ETAPA 3: GERAR PERGUNTAS FASE 2 (COM MOCK)
    // ============================================
    console.log("\n[E2E MOCK] ETAPA 3: Gerando perguntas Fase 2 (MOCKADO)...");

    const questions = await caller.assessmentPhase2.generateQuestions({
      projectId,
    });

    expect(questions).toBeDefined();
    expect(questions.questions).toBeDefined();
    expect(Array.isArray(questions.questions)).toBe(true);
    expect(questions.questions.length).toBeGreaterThan(0);
    console.log(`[E2E MOCK] ✅ ${questions.questions.length} perguntas geradas (mock)`);

    // ============================================
    // ETAPA 4: RESPONDER PERGUNTAS FASE 2
    // ============================================
    console.log("\n[E2E MOCK] ETAPA 4: Respondendo perguntas Fase 2...");

    const answers: Record<string, string> = {};
    questions.questions.forEach((q: any, index: number) => {
      answers[q.id] = `Resposta mockada ${index + 1}`;
    });

    await caller.assessmentPhase2.save({
      projectId,
      answers: JSON.stringify(answers),
      completedAt: new Date(),
    });

    console.log(`[E2E MOCK] ✅ ${Object.keys(answers).length} respostas salvas`);

    // ============================================
    // ETAPA 5: GERAR BRIEFING (COM MOCK)
    // ============================================
    console.log("\n[E2E MOCK] ETAPA 5: Gerando briefing (MOCKADO)...");

    const briefing = await caller.briefing.generate({ projectId });

    expect(briefing).toBeDefined();
    expect(briefing.content).toBeDefined();
    expect(briefing.content.length).toBeGreaterThan(100);
    console.log(`[E2E MOCK] ✅ Briefing gerado (${briefing.content.length} caracteres)`);

    // Verificar que projeto avançou para briefing
    project = await db.getProjectById(projectId);
    expect(project?.status).toBe("briefing");
    console.log(`[E2E MOCK] ✅ Status atualizado: ${project?.status}`);

    // Verificar conteúdo do briefing
    const parsedBriefing = JSON.parse(briefing.content);
    expect(parsedBriefing.executiveSummary).toBeDefined();
    expect(parsedBriefing.companyProfile).toBeDefined();
    expect(parsedBriefing.gapsIdentified).toBeDefined();
    expect(Array.isArray(parsedBriefing.gapsIdentified)).toBe(true);
    console.log(`[E2E MOCK] ✅ Briefing contém: executiveSummary, companyProfile, ${parsedBriefing.gapsIdentified.length} gaps`);

    console.log("\n[E2E MOCK] ========================================");
    console.log("[E2E MOCK] ✅ TESTE CONCLUÍDO COM SUCESSO!");
    console.log("[E2E MOCK] ========================================\n");
  }, 30000); // 30 segundos de timeout

  it("E2E com Mock: Fluxo completo até geração de plano de ação", async () => {
    console.log("\n[E2E MOCK] ========================================");
    console.log("[E2E MOCK] TESTE: Fluxo completo até plano de ação");
    console.log("[E2E MOCK] ========================================\n");

    // ============================================
    // ETAPA 1: CRIAR PROJETO
    // ============================================
    console.log("[E2E MOCK] ETAPA 1: Criando projeto...");

    const projectData = {
      name: `Projeto E2E Mock Action Plan ${Date.now()}`,
      clientId,
      notificationFrequency: "semanal" as const,
      planPeriodMonths: 12,
    };

    const createdProject = await caller.projects.create(projectData);
    const pid = createdProject.projectId;

    expect(pid).toBeGreaterThan(0);
    console.log(`[E2E MOCK] ✅ Projeto criado: ID ${pid}`);

    // ============================================
    // ETAPAS 2-5: ASSESSMENT E BRIEFING
    // ============================================
    console.log("\n[E2E MOCK] ETAPAS 2-5: Executando assessment e briefing...");

    const phase1 = generateFakeAssessmentPhase1(pid);
    await caller.assessmentPhase1.save(phase1);
    await caller.assessmentPhase1.complete({ projectId: pid });

    const questions = await caller.assessmentPhase2.generateQuestions({ projectId: pid });
    const answers: Record<string, string> = {};
    questions.questions.forEach((q: any, i: number) => {
      answers[q.id] = `Resposta ${i + 1}`;
    });
    await caller.assessmentPhase2.save({
      projectId: pid,
      answers: JSON.stringify(answers),
      completedAt: new Date(),
    });

    await caller.briefing.generate({ projectId: pid });
    console.log("[E2E MOCK] ✅ Assessment e briefing completados");

    // ============================================
    // ETAPA 6: GERAR PLANO DE AÇÃO (COM MOCK)
    // ============================================
    console.log("\n[E2E MOCK] ETAPA 6: Gerando plano de ação (MOCKADO)...");

    const actionPlan = await caller.actionPlan.generate({ projectId: pid });

    expect(actionPlan).toBeDefined();
    expect(actionPlan.content).toBeDefined();
    expect(actionPlan.content.length).toBeGreaterThan(100);
    console.log(`[E2E MOCK] ✅ Plano de ação gerado (${actionPlan.content.length} caracteres)`);

    // Verificar que projeto avançou para action_plan
    let project = await db.getProjectById(pid);
    expect(project?.status).toBe("action_plan");
    console.log(`[E2E MOCK] ✅ Status atualizado: ${project?.status}`);

    // Verificar conteúdo do plano de ação
    const parsedPlan = JSON.parse(actionPlan.content);
    expect(parsedPlan.overview).toBeDefined();
    expect(parsedPlan.phases).toBeDefined();
    expect(Array.isArray(parsedPlan.phases)).toBe(true);
    expect(parsedPlan.phases.length).toBeGreaterThan(0);
    console.log(`[E2E MOCK] ✅ Plano contém: overview, ${parsedPlan.phases.length} fases`);

    // Contar tarefas totais
    const totalTasks = parsedPlan.phases.reduce((sum: number, phase: any) => {
      return sum + (phase.tasks?.length || 0);
    }, 0);
    console.log(`[E2E MOCK] ✅ Total de tarefas no plano: ${totalTasks}`);

    // ============================================
    // ETAPA 7: APROVAR PLANO DE AÇÃO
    // ============================================
    console.log("\n[E2E MOCK] ETAPA 7: Aprovando plano de ação...");

    await caller.actionPlan.approve({ projectId: pid });

    const approvedPlan = await caller.actionPlan.get({ projectId: pid });
    expect(approvedPlan?.approvedAt).toBeDefined();
    expect(approvedPlan?.approvedById).toBe(1);
    console.log(`[E2E MOCK] ✅ Plano aprovado em ${approvedPlan?.approvedAt}`);

    // Verificar que projeto avançou para in_progress
    project = await db.getProjectById(pid);
    expect(project?.status).toBe("in_progress");
    console.log(`[E2E MOCK] ✅ Status final: ${project?.status}`);

    console.log("\n[E2E MOCK] ========================================");
    console.log("[E2E MOCK] ✅ TESTE CONCLUÍDO COM SUCESSO!");
    console.log("[E2E MOCK] ========================================\n");
  }, 30000); // 30 segundos de timeout

  it("E2E com Mock: Regeneração de briefing cria versão no histórico", async () => {
    console.log("\n[E2E MOCK] ========================================");
    console.log("[E2E MOCK] TESTE: Versionamento de briefing");
    console.log("[E2E MOCK] ========================================\n");

    // Criar projeto e gerar briefing inicial
    const projectData = {
      name: `Projeto E2E Mock Versioning ${Date.now()}`,
      clientId,
      notificationFrequency: "semanal" as const,
      planPeriodMonths: 12,
    };

    const createdProject = await caller.projects.create(projectData);
    const pid = createdProject.projectId;

    // Completar assessment
    const phase1 = generateFakeAssessmentPhase1(pid);
    await caller.assessmentPhase1.save(phase1);
    await caller.assessmentPhase1.complete({ projectId: pid });

    const questions = await caller.assessmentPhase2.generateQuestions({ projectId: pid });
    const answers: Record<string, string> = {};
    questions.questions.forEach((q: any, i: number) => {
      answers[q.id] = `Resposta ${i + 1}`;
    });
    await caller.assessmentPhase2.save({
      projectId: pid,
      answers: JSON.stringify(answers),
      completedAt: new Date(),
    });

    // Gerar briefing inicial
    const briefing1 = await caller.briefing.generate({ projectId: pid });
    console.log("[E2E MOCK] ✅ Briefing inicial gerado");

    // Aguardar 1 segundo para garantir timestamp diferente
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Regenerar briefing
    const briefing2 = await caller.briefing.generate({ projectId: pid });
    console.log("[E2E MOCK] ✅ Briefing regenerado");

    // Verificar que versão foi salva no histórico
    const versions = await caller.briefing.listVersions({ projectId: pid });
    expect(versions.length).toBeGreaterThanOrEqual(1);
    console.log(`[E2E MOCK] ✅ ${versions.length} versão(ões) no histórico`);

    // Verificar estrutura das versões
    if (versions.length > 0) {
      const version = versions[0];
      expect(version.versionNumber).toBeDefined();
      expect(version.content).toBeDefined();
      expect(version.createdAt).toBeDefined();
      console.log(`[E2E MOCK] ✅ Versão ${version.versionNumber} salva em ${version.createdAt}`);
    }

    console.log("\n[E2E MOCK] ========================================");
    console.log("[E2E MOCK] ✅ TESTE CONCLUÍDO COM SUCESSO!");
    console.log("[E2E MOCK] ========================================\n");
  }, 30000); // 30 segundos de timeout
});
