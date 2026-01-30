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

import { describe, it, expect, beforeAll } from "vitest";
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
