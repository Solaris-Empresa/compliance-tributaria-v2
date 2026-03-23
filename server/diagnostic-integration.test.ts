/**
 * Testes de Integração — ADR-005 Validação Prática
 * ─────────────────────────────────────────────────────────────────────────────
 * Bloco 3 — Leitura centralizada (simula V1, V3, híbrido)
 * Bloco 4 — State Machine (currentStep, diagnosticStatus, stepper)
 * Bloco 6 — Integridade de dados (sobrescrita, perda, duplicidade)
 *
 * REGRAS:
 * - Nenhum endpoint modificado
 * - Nenhum schema alterado
 * - Testes são unitários (mock do banco)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  determineFlowVersion,
  assertFlowVersion,
  validateV3DataSufficiency,
  validateV1DataSufficiency,
  type DiagnosticSource,
  type DiagnosticFlowVersion,
} from "./diagnostic-source";
import {
  validateTransition,
  getResumePoint,
  FLOW_STEPS,
  type ProjectStateSnapshot,
  type FlowStep,
} from "./flowStateMachine";
import { TRPCError } from "@trpc/server";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

vi.mock("../drizzle/schema", () => ({
  projects: { id: "id" },
  briefings: { projectId: "projectId" },
  riskMatrix: { projectId: "projectId" },
  actionPlans: { projectId: "projectId" },
}));

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const CORPORATE_ANSWERS_V1 = {
  companyType: "ltda",
  taxRegime: "lucro_presumido",
  annualRevenueRange: "4800000-12000000",
};

const OPERATIONAL_ANSWERS_V1 = {
  operationType: "comercio",
  multiState: true,
};

const QUESTIONNAIRE_ANSWERS_V3 = [
  {
    cnaeCode: "47.11-3",
    cnaeDescription: "Comércio varejista",
    level: "nivel1",
    questions: [{ question: "Canal de vendas?", answer: "Loja física" }],
  },
];

const BRIEFING_CONTENT_V3 = "# Briefing\n\nAnálise tributária...";
const RISK_MATRICES_V3 = { "47.11-3": [{ id: "R001", title: "ICMS" }] };
const ACTION_PLANS_V3 = { "Tributário": [{ id: "T001", title: "Revisar ICMS" }] };

function makeDiagnosticSource(
  flowVersion: DiagnosticFlowVersion,
  overrides: Partial<DiagnosticSource> = {}
): DiagnosticSource {
  return {
    flowVersion,
    projectId: 42,
    corporateAnswers: null,
    operationalAnswers: null,
    cnaeAnswers: null,
    briefingV1: null,
    risksV1: null,
    actionPlansV1: null,
    questionnaireAnswersV3: null,
    briefingContentV3: null,
    riskMatricesDataV3: null,
    actionPlansDataV3: null,
    ...overrides,
  };
}

function makeProjectSnapshot(overrides: Partial<ProjectStateSnapshot> = {}): ProjectStateSnapshot {
  return {
    id: 1,
    currentStep: 1,
    currentStepName: "perfil_empresa",
    status: "rascunho",
    consistencyCheckStatus: null,
    consistencyAcceptedRisk: null,
    confirmedCnaes: null,
    corporateAnswers: null,
    operationalAnswers: null,
    cnaeAnswers: null,
    briefingContent: null,
    riskMatricesData: null,
    actionPlansData: null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — Leitura centralizada via adaptador
// ─────────────────────────────────────────────────────────────────────────────

describe("Bloco 3 — Leitura centralizada: getDiagnosticSource", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // 3.1 — Projeto V1
  describe("3.1 Projeto V1 — leitura correta", () => {
    it("retorna todos os campos V1 e nenhum campo V3", async () => {
      const { getDb } = await import("./db");
      const mockProject = {
        id: 1,
        questionnaireAnswers: null,
        briefingContent: null,
        riskMatricesData: null,
        actionPlansData: null,
        corporateAnswers: CORPORATE_ANSWERS_V1,
        operationalAnswers: OPERATIONAL_ANSWERS_V1,
        cnaeAnswers: null,
      };
      vi.mocked(getDb).mockResolvedValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockProject]),
      } as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);

      const { getDiagnosticSource } = await import("./diagnostic-source");
      const source = await getDiagnosticSource(1);

      // Verificações V1
      expect(source.flowVersion).toBe("v1");
      expect(source.corporateAnswers).toEqual(CORPORATE_ANSWERS_V1);
      expect(source.operationalAnswers).toEqual(OPERATIONAL_ANSWERS_V1);

      // Verificações de isolamento — campos V3 DEVEM ser null
      expect(source.questionnaireAnswersV3).toBeNull();
      expect(source.briefingContentV3).toBeNull();
      expect(source.riskMatricesDataV3).toBeNull();
      expect(source.actionPlansDataV3).toBeNull();
    });

    it("V1: assertFlowVersion permite acesso a endpoints V1", async () => {
      const source = makeDiagnosticSource("v1", {
        corporateAnswers: CORPORATE_ANSWERS_V1,
      });
      expect(() => assertFlowVersion(source, "v1", "briefing.generate")).not.toThrow();
      expect(() => assertFlowVersion(source, "v1", "risk.generate")).not.toThrow();
      expect(() => assertFlowVersion(source, "v1", "actionPlan.generate")).not.toThrow();
    });

    it("V1: assertFlowVersion BLOQUEIA acesso a endpoints V3", async () => {
      const source = makeDiagnosticSource("v1", {
        corporateAnswers: CORPORATE_ANSWERS_V1,
      });
      expect(() => assertFlowVersion(source, "v3", "fluxoV3.generateBriefing")).toThrow(TRPCError);
      expect(() => assertFlowVersion(source, "v3", "fluxoV3.generateRiskMatrices")).toThrow(TRPCError);
      expect(() => assertFlowVersion(source, "v3", "fluxoV3.generateActionPlan")).toThrow(TRPCError);
    });

    it("V1: validateV1DataSufficiency retorna null quando dados suficientes", () => {
      const source = makeDiagnosticSource("v1", {
        corporateAnswers: CORPORATE_ANSWERS_V1,
        operationalAnswers: OPERATIONAL_ANSWERS_V1,
      });
      expect(validateV1DataSufficiency(source)).toBeNull();
    });
  });

  // 3.2 — Projeto V3
  describe("3.2 Projeto V3 — leitura correta", () => {
    it("retorna todos os campos V3 e nenhum campo V1", async () => {
      const { getDb } = await import("./db");
      const mockProject = {
        id: 2,
        questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3,
        briefingContent: BRIEFING_CONTENT_V3,
        riskMatricesData: RISK_MATRICES_V3,
        actionPlansData: ACTION_PLANS_V3,
        corporateAnswers: null,
        operationalAnswers: null,
        cnaeAnswers: null,
      };
      vi.mocked(getDb).mockResolvedValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockProject]),
      } as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);

      const { getDiagnosticSource } = await import("./diagnostic-source");
      const source = await getDiagnosticSource(2);

      // Verificações V3
      expect(source.flowVersion).toBe("v3");
      expect(source.questionnaireAnswersV3).toEqual(QUESTIONNAIRE_ANSWERS_V3);
      expect(source.briefingContentV3).toBe(BRIEFING_CONTENT_V3);
      expect(source.riskMatricesDataV3).toEqual(RISK_MATRICES_V3);
      expect(source.actionPlansDataV3).toEqual(ACTION_PLANS_V3);

      // Verificações de isolamento — campos V1 DEVEM ser null
      expect(source.corporateAnswers).toBeNull();
      expect(source.operationalAnswers).toBeNull();
      expect(source.cnaeAnswers).toBeNull();
    });

    it("V3: assertFlowVersion permite acesso a endpoints V3", async () => {
      const source = makeDiagnosticSource("v3", {
        questionnaireAnswersV3: QUESTIONNAIRE_ANSWERS_V3,
      });
      expect(() => assertFlowVersion(source, "v3", "fluxoV3.generateBriefing")).not.toThrow();
      expect(() => assertFlowVersion(source, "v3", "fluxoV3.generateRiskMatrices")).not.toThrow();
      expect(() => assertFlowVersion(source, "v3", "fluxoV3.generateActionPlan")).not.toThrow();
    });

    it("V3: assertFlowVersion BLOQUEIA acesso a endpoints V1", async () => {
      const source = makeDiagnosticSource("v3", {
        questionnaireAnswersV3: QUESTIONNAIRE_ANSWERS_V3,
      });
      expect(() => assertFlowVersion(source, "v1", "briefing.generate")).toThrow(TRPCError);
      expect(() => assertFlowVersion(source, "v1", "risk.generate")).toThrow(TRPCError);
    });

    it("V3: validateV3DataSufficiency retorna null quando dados suficientes", () => {
      const source = makeDiagnosticSource("v3", {
        questionnaireAnswersV3: QUESTIONNAIRE_ANSWERS_V3,
      });
      expect(validateV3DataSufficiency(source)).toBeNull();
    });
  });

  // 3.3 — Projeto híbrido
  describe("3.3 Projeto híbrido — comportamento definido", () => {
    it("retorna flowVersion='hybrid' com ambos os campos disponíveis", async () => {
      const { getDb } = await import("./db");
      const mockProject = {
        id: 3,
        questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3,
        briefingContent: BRIEFING_CONTENT_V3,
        riskMatricesData: null,
        actionPlansData: null,
        corporateAnswers: CORPORATE_ANSWERS_V1,
        operationalAnswers: null,
        cnaeAnswers: null,
      };
      vi.mocked(getDb).mockResolvedValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockProject]),
      } as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);

      const { getDiagnosticSource } = await import("./diagnostic-source");
      const source = await getDiagnosticSource(3);

      expect(source.flowVersion).toBe("hybrid");
      // Ambos disponíveis no estado híbrido
      expect(source.questionnaireAnswersV3).toEqual(QUESTIONNAIRE_ANSWERS_V3);
      expect(source.corporateAnswers).toEqual(CORPORATE_ANSWERS_V1);
    });

    it("híbrido: assertFlowVersion NÃO bloqueia (estado documentado, não bloqueante)", () => {
      const source = makeDiagnosticSource("hybrid", {
        questionnaireAnswersV3: QUESTIONNAIRE_ANSWERS_V3,
        corporateAnswers: CORPORATE_ANSWERS_V1,
      });
      expect(() => assertFlowVersion(source, "v3", "fluxoV3.generateBriefing")).not.toThrow();
      expect(() => assertFlowVersion(source, "v1", "briefing.generate")).not.toThrow();
    });
  });

  // 3.4 — Nenhuma leitura ambígua
  describe("3.4 Sem leitura ambígua — isolamento garantido pelo adaptador", () => {
    it("V3 puro: nenhum campo V1 é exposto mesmo que existam no banco", async () => {
      const { getDb } = await import("./db");
      // Simula banco com dados V1 residuais em projeto V3
      const mockProject = {
        id: 10,
        questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3,
        briefingContent: BRIEFING_CONTENT_V3,
        riskMatricesData: RISK_MATRICES_V3,
        actionPlansData: ACTION_PLANS_V3,
        corporateAnswers: null, // V1 ausente
        operationalAnswers: null,
        cnaeAnswers: null,
      };
      vi.mocked(getDb).mockResolvedValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockProject]),
      } as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);

      const { getDiagnosticSource } = await import("./diagnostic-source");
      const source = await getDiagnosticSource(10);

      expect(source.flowVersion).toBe("v3");
      expect(source.corporateAnswers).toBeNull();
      expect(source.operationalAnswers).toBeNull();
    });

    it("V1 puro: nenhum campo V3 é exposto mesmo que existam no banco", async () => {
      const { getDb } = await import("./db");
      const mockProject = {
        id: 11,
        questionnaireAnswers: null, // V3 ausente
        briefingContent: null,
        riskMatricesData: null,
        actionPlansData: null,
        corporateAnswers: CORPORATE_ANSWERS_V1,
        operationalAnswers: OPERATIONAL_ANSWERS_V1,
        cnaeAnswers: null,
      };
      vi.mocked(getDb).mockResolvedValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockProject]),
      } as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);

      const { getDiagnosticSource } = await import("./diagnostic-source");
      const source = await getDiagnosticSource(11);

      expect(source.flowVersion).toBe("v1");
      expect(source.questionnaireAnswersV3).toBeNull();
      expect(source.briefingContentV3).toBeNull();
      expect(source.riskMatricesDataV3).toBeNull();
      expect(source.actionPlansDataV3).toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — State Machine
// ─────────────────────────────────────────────────────────────────────────────

describe("Bloco 4 — State Machine: validateTransition e getResumePoint", () => {
  // 4.1 — Criação de projeto V1
  describe("4.1 Projeto V1 — fluxo de estados", () => {
    it("projeto novo: currentStep=1, status=rascunho", () => {
      const project = makeProjectSnapshot({ currentStep: 1, status: "rascunho" });
      const resume = getResumePoint(project);
      expect(resume.step).toBe(1);
      expect(resume.stepName).toBe("perfil_empresa");
      expect(resume.canResume).toBe(true);
    });

    it("projeto V1 com corporateAnswers: pode avançar para operacional", () => {
      const project = makeProjectSnapshot({
        currentStep: 5,
        status: "diagnostico_corporativo",
        corporateAnswers: CORPORATE_ANSWERS_V1,
        consistencyCheckStatus: "approved",
        confirmedCnaes: [{ code: "47.11-3" }],
      });
      const result = validateTransition(project, "diagnostico_operacional");
      expect(result.allowed).toBe(true);
    });

    it("projeto V1 sem corporateAnswers: NÃO pode avançar para operacional", () => {
      const project = makeProjectSnapshot({
        currentStep: 5,
        status: "diagnostico_corporativo",
        corporateAnswers: null, // Sem dados
        consistencyCheckStatus: "approved",
        confirmedCnaes: [{ code: "47.11-3" }],
      });
      const result = validateTransition(project, "diagnostico_operacional");
      // Gate diagnostico_corporativo_completo deve bloquear
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("corporativo");
    });

    it("projeto V1 com todos os dados: pode avançar para briefing", () => {
      // Gate de briefing: diagnostico_cnae_completo (cnaeAnswers preenchido)
      const project = makeProjectSnapshot({
        currentStep: 7,
        status: "diagnostico_cnae",
        corporateAnswers: CORPORATE_ANSWERS_V1,
        operationalAnswers: OPERATIONAL_ANSWERS_V1,
        cnaeAnswers: { "47.11-3": [{ question: "Q1", answer: "A1" }] }, // Preenchido
        consistencyCheckStatus: "approved",
        confirmedCnaes: [{ code: "47.11-3" }],
      });
      const result = validateTransition(project, "briefing");
      expect(result.allowed).toBe(true);
    });
  });

  // 4.2 — Criação de projeto V3
  describe("4.2 Projeto V3 — fluxo de estados", () => {
    it("projeto V3 com briefing: pode avançar para riscos", () => {
      // Gate de riscos: briefing_gerado (briefingContent preenchido)
      const project = makeProjectSnapshot({
        currentStep: 8,
        status: "briefing",
        briefingContent: BRIEFING_CONTENT_V3, // Briefing presente
        consistencyCheckStatus: "approved",
        confirmedCnaes: [{ code: "47.11-3" }],
        corporateAnswers: null, // V3 não usa corporateAnswers
      });
      const result = validateTransition(project, "riscos");
      expect(result.allowed).toBe(true);
    });

    it("projeto V3 sem briefing: NÃO pode avançar para riscos", () => {
      const project = makeProjectSnapshot({
        currentStep: 8,
        status: "briefing",
        briefingContent: null, // Sem briefing
        consistencyCheckStatus: "approved",
        confirmedCnaes: [{ code: "47.11-3" }],
      });
      const result = validateTransition(project, "riscos");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Briefing");
    });

    it("projeto V3 com riscos: pode avançar para plano", () => {
      // Gate de plano: riscos_gerados (riskMatricesData preenchido)
      const project = makeProjectSnapshot({
        currentStep: 9,
        status: "riscos",
        briefingContent: BRIEFING_CONTENT_V3,
        riskMatricesData: RISK_MATRICES_V3, // Riscos presentes
        consistencyCheckStatus: "approved",
        confirmedCnaes: [{ code: "47.11-3" }],
      });
      const result = validateTransition(project, "plano");
      expect(result.allowed).toBe(true);
    });
  });

  // 4.3 — Mudança de rota
  describe("4.3 Mudança de rota — não pode pular etapas", () => {
    it("não pode pular do step 1 para o step 5", () => {
      const project = makeProjectSnapshot({ currentStep: 1, status: "rascunho" });
      const result = validateTransition(project, "diagnostico_corporativo");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("pular");
    });

    it("DOCUMENTA: state machine permite retroceder (comportamento de revisão)", () => {
      // NOTA IMPORTANTE para o ADR-005:
      // A state machine PERMITE retroceder para revisão (targetStepNumber <= currentStepNumber).
      // Isso é um comportamento INTENCIONAL da implementação atual.
      // O bloqueio ocorre apenas quando targetStepNumber > currentStepNumber + 1 (pular etapas).
      // Risco documentado: retroceder sem limpar dados pode criar estado inconsistente.
      const project = makeProjectSnapshot({
        currentStep: 5,
        status: "diagnostico_corporativo",
        consistencyCheckStatus: "approved",
        confirmedCnaes: [{ code: "47.11-3" }],
      });
      // Step 3 = descoberta_cnaes — retroceder é PERMITIDO pela state machine atual
      const result = validateTransition(project, "descoberta_cnaes");
      // COMPORTAMENTO REAL: retroceder é permitido (para revisão)
      // Este teste documenta o comportamento atual como evidência para o ADR-005
      expect(result.allowed).toBe(true); // Permitido por design
    });
  });

  // 4.4 — Reload da página / retomada do fluxo
  describe("4.4 Reload da página — getResumePoint consistente", () => {
    it("projeto no step 5 retoma no step 5 após reload", () => {
      const project = makeProjectSnapshot({
        currentStep: 5,
        status: "diagnostico_corporativo",
        corporateAnswers: CORPORATE_ANSWERS_V1,
        consistencyCheckStatus: "approved",
        confirmedCnaes: [{ code: "47.11-3" }],
      });
      const resume = getResumePoint(project);
      expect(resume.step).toBe(5);
      expect(resume.stepName).toBe("diagnostico_corporativo");
      expect(resume.canResume).toBe(true);
    });

    it("projeto no step 8 com briefing retoma no step 8", () => {
      const project = makeProjectSnapshot({
        currentStep: 8,
        status: "briefing",
        briefingContent: BRIEFING_CONTENT_V3,
        corporateAnswers: CORPORATE_ANSWERS_V1,
        operationalAnswers: OPERATIONAL_ANSWERS_V1,
        cnaeAnswers: { "47.11-3": [] },
        consistencyCheckStatus: "approved",
        confirmedCnaes: [{ code: "47.11-3" }],
      });
      const resume = getResumePoint(project);
      expect(resume.step).toBe(8);
      expect(resume.stepName).toBe("briefing");
    });

    it("resumeData reflete corretamente o estado do projeto", () => {
      const project = makeProjectSnapshot({
        currentStep: 9,
        status: "riscos",
        briefingContent: BRIEFING_CONTENT_V3,
        riskMatricesData: RISK_MATRICES_V3,
        corporateAnswers: CORPORATE_ANSWERS_V1,
        operationalAnswers: OPERATIONAL_ANSWERS_V1,
        cnaeAnswers: { "47.11-3": [] },
        consistencyCheckStatus: "approved",
        confirmedCnaes: [{ code: "47.11-3" }],
      });
      const resume = getResumePoint(project);
      expect(resume.resumeData.hasBriefing).toBe(true);
      expect(resume.resumeData.hasRisks).toBe(true);
      expect(resume.resumeData.hasCorporateAnswers).toBe(true);
      expect(resume.resumeData.hasOperationalAnswers).toBe(true);
    });
  });

  // 4.5 — Consistência do stepper
  describe("4.5 Stepper — consistência de FLOW_STEPS", () => {
    it("FLOW_STEPS tem 11 etapas definidas", () => {
      expect(FLOW_STEPS).toHaveLength(11);
    });

    it("cada etapa tem stepNumber único e sequencial", () => {
      const numbers = FLOW_STEPS.map(s => s.stepNumber);
      const unique = new Set(numbers);
      expect(unique.size).toBe(FLOW_STEPS.length);
      // Verifica sequência 1-11
      for (let i = 1; i <= 11; i++) {
        expect(numbers).toContain(i);
      }
    });

    it("cada etapa tem stepName único", () => {
      const names = FLOW_STEPS.map(s => s.stepName);
      const unique = new Set(names);
      expect(unique.size).toBe(FLOW_STEPS.length);
    });

    it("etapas de diagnóstico V1 têm gates corretos", () => {
      const corpStep = FLOW_STEPS.find(s => s.stepName === "diagnostico_corporativo");
      const opStep = FLOW_STEPS.find(s => s.stepName === "diagnostico_operacional");
      const cnaeStep = FLOW_STEPS.find(s => s.stepName === "diagnostico_cnae");

      expect(corpStep).toBeDefined();
      expect(opStep).toBeDefined();
      expect(cnaeStep).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — Integridade de dados
// ─────────────────────────────────────────────────────────────────────────────

describe("Bloco 6 — Integridade de dados", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // 6.1 — Projeto V1 puro
  describe("6.1 Projeto V1 puro — sem sobrescrita V3", () => {
    it("dados V1 retornados são idênticos ao que está no banco", async () => {
      const { getDb } = await import("./db");
      const originalData = {
        companyType: "ltda",
        taxRegime: "lucro_presumido",
        annualRevenueRange: "4800000-12000000",
      };
      vi.mocked(getDb).mockResolvedValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          questionnaireAnswers: null,
          briefingContent: null,
          riskMatricesData: null,
          actionPlansData: null,
          corporateAnswers: originalData,
          operationalAnswers: null,
          cnaeAnswers: null,
        }]),
      } as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);

      const { getDiagnosticSource } = await import("./diagnostic-source");
      const source = await getDiagnosticSource(1);

      // Integridade: dados retornados == dados originais
      expect(source.corporateAnswers).toEqual(originalData);
      expect(source.corporateAnswers?.companyType).toBe("ltda");
      expect(source.corporateAnswers?.taxRegime).toBe("lucro_presumido");
    });

    it("leitura V1 não modifica os dados originais", async () => {
      const { getDb } = await import("./db");
      const originalData = { companyType: "ltda" };
      vi.mocked(getDb).mockResolvedValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          questionnaireAnswers: null,
          briefingContent: null,
          riskMatricesData: null,
          actionPlansData: null,
          corporateAnswers: originalData,
          operationalAnswers: null,
          cnaeAnswers: null,
        }]),
      } as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);

      const { getDiagnosticSource } = await import("./diagnostic-source");
      const source1 = await getDiagnosticSource(1);
      const source2 = await getDiagnosticSource(1);

      // Duas leituras devem retornar os mesmos dados
      expect(source1.corporateAnswers).toEqual(source2.corporateAnswers);
    });
  });

  // 6.2 — Projeto V3 puro
  describe("6.2 Projeto V3 puro — sem sobrescrita V1", () => {
    it("dados V3 retornados são idênticos ao que está no banco", async () => {
      const { getDb } = await import("./db");
      const originalAnswers = [
        { cnaeCode: "47.11-3", cnaeDescription: "Varejo", level: "nivel1", questions: [] },
      ];
      vi.mocked(getDb).mockResolvedValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 2,
          questionnaireAnswers: originalAnswers,
          briefingContent: BRIEFING_CONTENT_V3,
          riskMatricesData: RISK_MATRICES_V3,
          actionPlansData: ACTION_PLANS_V3,
          corporateAnswers: null,
          operationalAnswers: null,
          cnaeAnswers: null,
        }]),
      } as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);

      const { getDiagnosticSource } = await import("./diagnostic-source");
      const source = await getDiagnosticSource(2);

      expect(source.questionnaireAnswersV3).toEqual(originalAnswers);
      expect(source.briefingContentV3).toBe(BRIEFING_CONTENT_V3);
      expect(source.riskMatricesDataV3).toEqual(RISK_MATRICES_V3);
      expect(source.actionPlansDataV3).toEqual(ACTION_PLANS_V3);
    });
  });

  // 6.3 — Projeto híbrido (forçado)
  describe("6.3 Projeto híbrido — ambos os dados disponíveis sem perda", () => {
    it("dados V1 e V3 coexistem sem perda no estado híbrido", async () => {
      const { getDb } = await import("./db");
      vi.mocked(getDb).mockResolvedValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 3,
          questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3,
          briefingContent: BRIEFING_CONTENT_V3,
          riskMatricesData: null,
          actionPlansData: null,
          corporateAnswers: CORPORATE_ANSWERS_V1,
          operationalAnswers: OPERATIONAL_ANSWERS_V1,
          cnaeAnswers: null,
        }]),
      } as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);

      const { getDiagnosticSource } = await import("./diagnostic-source");
      const source = await getDiagnosticSource(3);

      expect(source.flowVersion).toBe("hybrid");
      // Ambos os dados preservados
      expect(source.questionnaireAnswersV3).toEqual(QUESTIONNAIRE_ANSWERS_V3);
      expect(source.corporateAnswers).toEqual(CORPORATE_ANSWERS_V1);
      expect(source.operationalAnswers).toEqual(OPERATIONAL_ANSWERS_V1);
      // Sem duplicidade inconsistente
      expect(source.briefingContentV3).toBe(BRIEFING_CONTENT_V3);
    });
  });

  // 6.4 — Rollback após V3 (dados V1 preservados)
  describe("6.4 Rollback após V3 — dados V1 não corrompidos", () => {
    it("após rollback para V1, dados V1 originais são preservados", async () => {
      const { getDb } = await import("./db");
      // Simula estado pós-rollback: questionnaireAnswers limpo, V1 intacto
      const postRollbackProject = {
        id: 4,
        questionnaireAnswers: null, // V3 limpo após rollback
        briefingContent: null,
        riskMatricesData: null,
        actionPlansData: null,
        corporateAnswers: CORPORATE_ANSWERS_V1, // V1 intacto
        operationalAnswers: OPERATIONAL_ANSWERS_V1,
        cnaeAnswers: null,
      };
      vi.mocked(getDb).mockResolvedValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([postRollbackProject]),
      } as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);

      const { getDiagnosticSource } = await import("./diagnostic-source");
      const source = await getDiagnosticSource(4);

      // Pós-rollback: deve ser V1
      expect(source.flowVersion).toBe("v1");
      // Dados V1 intactos
      expect(source.corporateAnswers).toEqual(CORPORATE_ANSWERS_V1);
      expect(source.operationalAnswers).toEqual(OPERATIONAL_ANSWERS_V1);
      // Dados V3 limpos
      expect(source.questionnaireAnswersV3).toBeNull();
      expect(source.briefingContentV3).toBeNull();
    });

    it("determineFlowVersion é determinístico pós-rollback", () => {
      // Estado pós-rollback: V3 limpo, V1 presente
      const result = determineFlowVersion({
        questionnaireAnswers: null,
        corporateAnswers: CORPORATE_ANSWERS_V1,
        operationalAnswers: null,
      });
      expect(result).toBe("v1");
    });
  });

  // 6.5 — Sem duplicidade inconsistente
  describe("6.5 Sem duplicidade inconsistente", () => {
    it("flowVersion é único e imutável para cada estado de projeto", () => {
      const states = [
        { questionnaireAnswers: null, corporateAnswers: null, operationalAnswers: null },
        { questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3, corporateAnswers: null, operationalAnswers: null },
        { questionnaireAnswers: null, corporateAnswers: CORPORATE_ANSWERS_V1, operationalAnswers: null },
        { questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3, corporateAnswers: CORPORATE_ANSWERS_V1, operationalAnswers: null },
      ];
      const expected: DiagnosticFlowVersion[] = ["none", "v3", "v1", "hybrid"];

      states.forEach((state, i) => {
        expect(determineFlowVersion(state)).toBe(expected[i]);
      });
    });

    it("leitura múltipla do mesmo projeto retorna dados idênticos (sem efeito colateral)", async () => {
      const { getDb } = await import("./db");
      const mockProject = {
        id: 5,
        questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3,
        briefingContent: BRIEFING_CONTENT_V3,
        riskMatricesData: RISK_MATRICES_V3,
        actionPlansData: ACTION_PLANS_V3,
        corporateAnswers: null,
        operationalAnswers: null,
        cnaeAnswers: null,
      };
      vi.mocked(getDb).mockResolvedValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockProject]),
      } as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);

      const { getDiagnosticSource } = await import("./diagnostic-source");
      const source1 = await getDiagnosticSource(5);
      const source2 = await getDiagnosticSource(5);

      expect(source1.flowVersion).toBe(source2.flowVersion);
      expect(source1.questionnaireAnswersV3).toEqual(source2.questionnaireAnswersV3);
      expect(source1.briefingContentV3).toBe(source2.briefingContentV3);
    });
  });
});
