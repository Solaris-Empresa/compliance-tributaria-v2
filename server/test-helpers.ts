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
// CI hygiene 2026-05-08 (PR ci/hygiene): expandido para skipar também quando
// `DATABASE_URL` ausente (ex: dev local sem TiDB, CI sem secret configurado).
// Cobertura ampliada para 11 testes adicionais que falhavam silenciosamente.
//
// Vinculadas: PR #889 (CI_SECRETS_GAP_ANALYSIS.md), Lição #46 emergente
//   (validar empiricamente o estado de ambiente antes de propor guard).
export const HAS_DB = !!process.env.DATABASE_URL;
export const SKIP_DB_TESTS =
  (process.env.CI === "true" && !process.env.CI_HAS_TEST_DB) ||
  !HAS_DB;

/**
 * Use em vez de `describe` em testes que requerem `mysql.createConnection` real.
 *
 * Em CI sem TEST DB provisionado: testes são skipados graciosamente.
 * Em ambiente sem DATABASE_URL: testes são skipados (CI hygiene 2026-05-08).
 * Localmente com DATABASE_URL: testes rodam normalmente.
 * Pós Issue #873 + secret CI_HAS_TEST_DB=true: testes voltam a rodar em CI.
 */
export const dbDescribe = SKIP_DB_TESTS ? describe.skip : describe;

// CI hygiene 2026-05-08 (PR ci/hygiene): testes que invocam OpenAI real
// sem mock devem skipar quando OPENAI_API_KEY ausente. Cobre llm-timeout
// e openai-key-validation que falhavam com "OPENAI_API_KEY is not configured".
export const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
export const SKIP_OPENAI_TESTS = !HAS_OPENAI;
export const openaiDescribe = SKIP_OPENAI_TESTS ? describe.skip : describe;

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

// ─────────────────────────────────────────────────────────────────────────────
// BUG-AGRO-CPF F5 (#1290) — Fixtures de identidade fiscal dual
// ─────────────────────────────────────────────────────────────────────────────
//
// 3 fixtures canônicas para testes de PF (produtor rural — Art. 164 LC 214/2025)
// e retrocompat PJ legacy. Usadas em:
//   - server/integration/bug-agro-cpf.test.ts (5 TB bloqueantes)
//   - testes futuros que precisem de projeto PF ou PJ legacy sem boilerplate.
//
// Decisões:
//   - CPF válido `529.982.247-25` é o mesmo do plano (TC-01 de validate-cpf).
//   - `cnpj=null` em PF: F0 schema torna a coluna NULL-safe; refine F1 deriva
//     taxId de cpf quando taxIdType='cpf'.
//   - `companyProfile=null` em mockProjectPFSemProfile cobre o achado do Gate 3
//     F0 (3202/3400 projetos com companyProfile=NULL).
//   - mockProjectPJLegacy não declara `taxIdType` → Zod default 'cnpj' (F1
//     refine) + perfilHash mantém retrocompat byte-by-byte (F3 ADR-0032).
//

/**
 * Projeto PF (produtor rural) com CPF válido e companyProfile preenchido.
 * Cobre cenário "novo projeto PF criado via UI F2+ com radio PF + input CPF".
 */
export const mockProjectPF = {
  id: 99001,
  name: "Sítio Esperança — Produtor Rural PF",
  clientId: 1,
  taxIdType: "cpf" as const,
  taxId: "529.982.247-25",
  cnpj: null as string | null,
  // companyProfile espelha o que o frontend F2+ envia para PF: cnpj OMITIDO
  // (não-null) porque o schema F1 (routers-fluxo-v3.ts:204) é
  // `cnpj: z.string().optional()` — null não é string nem undefined.
  // BUG-AGRO-CPF-UX (#1299) — PF agro NÃO tem companyType/companySize/taxRegime
  // (todos enum PJ-only no schema). Campos ficam null por design (Lição #109 + #110:
  // não inventar valores; tabela de visibilidade REGRA-ORQ-42 §1).
  companyProfile: {
    cpf: "52998224725",
    taxIdType: "cpf" as const,
    taxId: "529.982.247-25",
    companyType: null,
    companySize: null,
    taxRegime: null,
  },
  // coluna DB F0 (migration 0119): tax_id_type ENUM('cnpj','cpf') NOT NULL
  tax_id_type: "cpf" as const,
};

/**
 * Projeto PF com companyProfile=null — cobre o achado do Gate 3 F0
 * (94% da base de produção: 3202/3400 projetos sem profile preenchido).
 * Garante que perfilHash + briefing signals não crasham mesmo sem profile.
 */
export const mockProjectPFSemProfile = {
  id: 99002,
  name: "Projeto PF legado sem profile",
  clientId: 1,
  taxIdType: "cpf" as const,
  taxId: "529.982.247-25",
  cnpj: null as string | null,
  companyProfile: null as Record<string, unknown> | null,
  tax_id_type: "cpf" as const,
};

/**
 * Projeto PJ legado SEM taxIdType — cobre retrocompat F1 Opção 1
 * (frontend pre-F2 envia apenas cnpj; refine deriva taxId='cnpj' por default).
 * perfilHash F3 preserva canonical byte-by-byte para este cenário (ADR-0032).
 */
export const mockProjectPJLegacy = {
  id: 99003,
  name: "Empresa PJ legacy SA",
  clientId: 1,
  taxIdType: undefined as "cnpj" | "cpf" | undefined,
  taxId: undefined as string | undefined,
  cnpj: "11.222.333/0001-81",
  companyProfile: {
    cnpj: "11222333000181",
    companyType: "ltda" as const,
    companySize: "media" as const,
    taxRegime: "lucro_presumido" as const,
  },
  // F0 default da coluna: pré-F2 → 'cnpj' (backfill da migration 0119)
  tax_id_type: "cnpj" as const,
};
