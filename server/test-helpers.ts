/**
 * Test Helpers for Vitest
 */

import type { TrpcContext } from "./_core/context";

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
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
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
    annualRevenue: 5000000,
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
