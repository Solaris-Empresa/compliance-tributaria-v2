/**
 * Test Helpers for Vitest
 */

import { describe } from "vitest";
import type { TrpcContext } from "./_core/context";

// ─── PR-FIX-2: graceful skip de testes integration que requerem DB real ───
//
// Skipa quando rodando em CI sem TEST DB acessível.
// Pós Issue #873 (CI prod isolation): Manus seta secret CI_HAS_TEST_DB=true
// → guard desativa sozinho sem mudança de código.
//
// Vinculadas: PR #889 (CI_SECRETS_GAP_ANALYSIS.md), Lição #46 emergente
//   (validar empiricamente o estado de ambiente antes de propor guard).
export const SKIP_DB_TESTS =
  process.env.CI === "true" && !process.env.CI_HAS_TEST_DB;

/**
 * Use em vez de `describe` em testes que requerem `mysql.createConnection` real.
 *
 * Em CI sem TEST DB provisionado: testes são skipados graciosamente.
 * Localmente (sem CI=true): testes rodam normalmente se DB disponível.
 * Pós Issue #873 + secret CI_HAS_TEST_DB=true: testes voltam a rodar em CI.
 */
export const dbDescribe = SKIP_DB_TESTS ? describe.skip : describe;

export function createMockContext(
  userId: number = 1,
  role: "cliente" | "equipe_solaris" | "advogado_senior" | "advogado_junior" = "equipe_solaris"
): Partial<TrpcContext> {
  return {
    user: {
      id: userId,
      openId: `test-open-id-${userId}`,
      name: `Test User ${userId}`,
      email: `test${userId}@example.com`,
      role,
      cpf: null,
      phone: null,
      companyName: null,
      cnpj: null,
      segment: null,
      observations: null,
      loginMethod: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  };
}

export function generateFakeClient(overrides: any = {}) {
  const timestamp = Date.now();
  return {
    name: `Cliente Teste ${timestamp}`,
    email: `cliente${timestamp}@teste.com`,
    cpf: "123.456.789-00",
    phone: "(11) 98765-4321",
    companyName: `Empresa Teste ${timestamp} LTDA`,
    cnpj: "12.345.678/0001-90",
    segment: "Tecnologia",
    notes: "Cliente de teste",
    ...overrides,
  };
}

export function generateFakeProject(clientId: number, overrides: any = {}) {
  const timestamp = Date.now();
  return {
    name: `Projeto Teste ${timestamp}`,
    clientId,
    planPeriodMonths: 12,
    ...overrides,
  };
}

export function generateFakeAssessmentPhase1(projectId: number, overrides: any = {}) {
  return {
    projectId,
    taxRegime: "lucro_presumido" as const,
    companySize: "media" as const,
    annualRevenue: "5000000",
    businessSector: "Tecnologia",
    employeeCount: 50,
    hasInternationalOperations: false,
    mainChallenges: "Adaptação à reforma tributária",
    complianceGoals: "Estar 100% em conformidade até 2026",
    ...overrides,
  };
}

export function generateFakeAnswers(questions: any[], percentageToAnswer: number = 100) {
  const numToAnswer = Math.ceil((questions.length * percentageToAnswer) / 100);
  const answers: Record<string, string> = {};
  
  for (let i = 0; i < numToAnswer && i < questions.length; i++) {
    answers[questions[i].id] = `Resposta de teste para pergunta ${i + 1}`;
  }
  
  return answers;
}

export function createTestContext(options: {
  userId?: number;
  role?: "cliente" | "equipe_solaris" | "advogado_senior";
} = {}) {
  const userId = options.userId || 1;
  const role = options.role || "equipe_solaris";
  
  return {
    user: {
      id: userId,
      openId: `test-open-id-${userId}`,
      name: `Test User ${userId}`,
      email: `test${userId}@example.com`,
      loginMethod: "oauth",
      role,
      cpf: null,
      phone: null,
      companyName: null,
      cnpj: null,
      segment: null,
      notes: null,
      observations: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  } as TrpcContext;
}

export function generateTestProject() {
  return {
    name: `Test Project ${Date.now()}`,
    clientId: 1,
    actionPlanPeriod: 12,
  };
}

export function generateTestTask() {
  return {
    title: `Test Task ${Date.now()}`,
    description: "Test task description",
    priority: "media" as const,
    status: "a_fazer" as const,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estimatedHours: 8,
  };
}

export function generateTestRisk() {
  return {
    title: `Test Risk ${Date.now()}`,
    description: "Test risk description",
    cosoComponent: "ambiente_controle" as const,
    probability: "media" as const,
    impact: "alto" as const,
    mitigationStatus: "identificado" as const,
  };
}
