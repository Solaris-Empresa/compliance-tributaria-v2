/**
 * FLOW STATE MACHINE — Testes Vitest v2.3
 * Cobertura: transições válidas, bloqueios de gate, retomada e histórico.
 */
import { describe, it, expect } from "vitest";
import {
  validateTransition,
  getResumePoint,
  createHistoryEntry,
  FLOW_STEPS,
  STEP_BY_NAME,
  STEP_BY_NUMBER,
  type ProjectStateSnapshot,
  type FlowStep,
} from "./flowStateMachine";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<ProjectStateSnapshot> = {}): ProjectStateSnapshot {
  return {
    id: 1,
    currentStep: 1,
    currentStepName: "perfil_empresa",
    status: "rascunho",
    confirmedCnaes: null,
    corporateAnswers: null,
    operationalAnswers: null,
    cnaeAnswers: null,
    briefingContent: null,
    riskMatricesData: null,
    actionPlansData: null,
    diagnosticStatus: null,
    ...overrides,
  };
}

// ─── FASE 1: Estrutura do FLOW_STEPS ────────────────────────────────────────

describe("FLOW_STEPS — estrutura", () => {
  it("deve ter 11 etapas", () => {
    expect(FLOW_STEPS).toHaveLength(11);
  });

  it("deve ter stepNumbers sequenciais de 1 a 11", () => {
    const numbers = FLOW_STEPS.map((s) => s.stepNumber);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("deve ter a primeira etapa como perfil_empresa", () => {
    expect(FLOW_STEPS[0].stepName).toBe("perfil_empresa");
    expect(FLOW_STEPS[0].statusOnEnter).toBe("rascunho");
  });

  it("deve ter a última etapa como dashboard", () => {
    expect(FLOW_STEPS[10].stepName).toBe("dashboard");
    expect(FLOW_STEPS[10].statusOnEnter).toBe("dashboard");
  });

  it("STEP_BY_NAME deve mapear todas as etapas corretamente", () => {
    expect(STEP_BY_NAME.get("confirmacao_cnaes")?.stepNumber).toBe(4);
    expect(STEP_BY_NAME.get("briefing")?.stepNumber).toBe(8);
    expect(STEP_BY_NAME.get("dashboard")?.stepNumber).toBe(11);
  });

  it("STEP_BY_NUMBER deve mapear todos os números corretamente", () => {
    expect(STEP_BY_NUMBER.get(1)?.stepName).toBe("perfil_empresa");
    expect(STEP_BY_NUMBER.get(4)?.stepName).toBe("confirmacao_cnaes");
    expect(STEP_BY_NUMBER.get(11)?.stepName).toBe("dashboard");
  });
});

// ─── FASE 2: validateTransition ─────────────────────────────────────────────

describe("validateTransition — transições válidas", () => {
  it("deve permitir avançar da etapa 1 para a 2", () => {
    const project = makeProject({ currentStep: 1 });
    const result = validateTransition(project, "consistencia");
    expect(result.allowed).toBe(true);
    expect(result.newStep).toBe(2);
    expect(result.newStatus).toBe("consistencia_pendente");
  });

  it("deve permitir retroceder (revisão)", () => {
    const project = makeProject({ currentStep: 4, currentStepName: "confirmacao_cnaes" });
    const result = validateTransition(project, "consistencia");
    expect(result.allowed).toBe(true);
  });

  it("deve bloquear pular etapas (etapa 1 → etapa 4)", () => {
    const project = makeProject({ currentStep: 1 });
    const result = validateTransition(project, "confirmacao_cnaes");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("pular etapas");
  });

  it("deve bloquear etapa desconhecida", () => {
    const project = makeProject({ currentStep: 1 });
    const result = validateTransition(project, "etapa_inexistente" as FlowStep);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("desconhecida");
  });
});

describe("validateTransition — gates de consistência", () => {
  it("deve bloquear descoberta_cnaes sem consistência executada", () => {
    const project = makeProject({
      currentStep: 2,
      consistencyCheckStatus: undefined,
    });
    const result = validateTransition(project, "descoberta_cnaes");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("consistência");
  });

  it("deve bloquear descoberta_cnaes com inconsistências críticas não aceitas", () => {
    const project = makeProject({
      currentStep: 2,
      consistencyCheckStatus: "critical",
      consistencyAcceptedRisk: false,
    });
    const result = validateTransition(project, "descoberta_cnaes");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("críticas");
  });

  it("deve permitir descoberta_cnaes com consistência aprovada", () => {
    const project = makeProject({
      currentStep: 2,
      consistencyCheckStatus: "approved",
    });
    const result = validateTransition(project, "descoberta_cnaes");
    expect(result.allowed).toBe(true);
  });

  it("deve permitir descoberta_cnaes com risco aceito mesmo com inconsistências críticas", () => {
    const project = makeProject({
      currentStep: 2,
      consistencyCheckStatus: "critical",
      consistencyAcceptedRisk: true,
    });
    const result = validateTransition(project, "descoberta_cnaes");
    expect(result.allowed).toBe(true);
  });

  it("deve permitir descoberta_cnaes com status low", () => {
    const project = makeProject({
      currentStep: 2,
      consistencyCheckStatus: "low",
    });
    const result = validateTransition(project, "descoberta_cnaes");
    expect(result.allowed).toBe(true);
  });
});

describe("validateTransition — gates de CNAEs", () => {
  it("deve bloquear confirmacao_cnaes sem CNAEs descobertos", () => {
    const project = makeProject({
      currentStep: 3,
      confirmedCnaes: null,
    });
    const result = validateTransition(project, "confirmacao_cnaes");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("CNAEs");
  });

  it("deve bloquear diagnostico_corporativo sem CNAEs confirmados", () => {
    const project = makeProject({
      currentStep: 4,
      confirmedCnaes: [],
    });
    const result = validateTransition(project, "diagnostico_corporativo");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("CNAE");
  });

  it("deve permitir diagnostico_corporativo com CNAEs confirmados", () => {
    const project = makeProject({
      currentStep: 4,
      confirmedCnaes: [{ code: "4711-3/01", description: "Comércio varejista", confidence: 90 }],
    });
    const result = validateTransition(project, "diagnostico_corporativo");
    expect(result.allowed).toBe(true);
    expect(result.newStatus).toBe("diagnostico_corporativo");
  });
});

describe("validateTransition — gates de diagnóstico", () => {
  it("deve bloquear diagnostico_operacional sem diagnóstico corporativo", () => {
    const project = makeProject({
      currentStep: 5,
      confirmedCnaes: [{ code: "4711-3/01", description: "Comércio varejista", confidence: 90 }],
      corporateAnswers: null,
    });
    const result = validateTransition(project, "diagnostico_operacional");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("corporativo");
  });

  it("deve bloquear diagnostico_cnae sem diagnóstico operacional", () => {
    const project = makeProject({
      currentStep: 6,
      confirmedCnaes: [{ code: "4711-3/01", description: "Comércio varejista", confidence: 90 }],
      corporateAnswers: { q1: "sim" },
      operationalAnswers: null,
    });
    const result = validateTransition(project, "diagnostico_cnae");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("operacional");
  });

  it("deve bloquear briefing sem diagnóstico CNAE", () => {
    const project = makeProject({
      currentStep: 7,
      confirmedCnaes: [{ code: "4711-3/01", description: "Comércio varejista", confidence: 90 }],
      corporateAnswers: { q1: "sim" },
      operationalAnswers: { q1: "sim" },
      cnaeAnswers: null,
    });
    const result = validateTransition(project, "briefing");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("CNAE");
  });

  it("deve bloquear riscos sem briefing gerado", () => {
    const project = makeProject({
      currentStep: 8,
      confirmedCnaes: [{ code: "4711-3/01", description: "Comércio varejista", confidence: 90 }],
      corporateAnswers: { q1: "sim" },
      operationalAnswers: { q1: "sim" },
      cnaeAnswers: { q1: "sim" },
      briefingContent: null,
    });
    const result = validateTransition(project, "riscos");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Briefing");
  });

  it("deve bloquear plano sem riscos gerados", () => {
    const project = makeProject({
      currentStep: 9,
      confirmedCnaes: [{ code: "4711-3/01", description: "Comércio varejista", confidence: 90 }],
      corporateAnswers: { q1: "sim" },
      operationalAnswers: { q1: "sim" },
      cnaeAnswers: { q1: "sim" },
      briefingContent: "Briefing gerado",
      riskMatricesData: null,
    });
    const result = validateTransition(project, "plano");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("risco");
  });

  it("deve bloquear dashboard sem plano gerado", () => {
    const project = makeProject({
      currentStep: 10,
      confirmedCnaes: [{ code: "4711-3/01", description: "Comércio varejista", confidence: 90 }],
      corporateAnswers: { q1: "sim" },
      operationalAnswers: { q1: "sim" },
      cnaeAnswers: { q1: "sim" },
      briefingContent: "Briefing gerado",
      riskMatricesData: { "4711-3/01": [] },
      actionPlansData: null,
    });
    const result = validateTransition(project, "dashboard");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Plano");
  });
});

describe("validateTransition — fluxo completo (happy path)", () => {
  it("deve permitir o fluxo completo de 1 a 11", () => {
    const fullProject = makeProject({
      currentStep: 10,
      consistencyCheckStatus: "approved",
      confirmedCnaes: [{ code: "4711-3/01", description: "Comércio varejista", confidence: 90 }],
      corporateAnswers: { q1: "sim" },
      operationalAnswers: { q1: "sim" },
      cnaeAnswers: { q1: "sim" },
      briefingContent: "Briefing gerado",
      riskMatricesData: { "4711-3/01": [] },
      actionPlansData: { financeiro: [] },
    });

    const result = validateTransition(fullProject, "dashboard");
    expect(result.allowed).toBe(true);
    expect(result.newStep).toBe(11);
    expect(result.newStatus).toBe("dashboard");
  });
});

// ─── FASE 3: getResumePoint ──────────────────────────────────────────────────

describe("getResumePoint", () => {
  it("deve retornar etapa 1 para projeto novo", () => {
    const project = makeProject({ currentStep: 1 });
    const resume = getResumePoint(project);
    expect(resume.step).toBe(1);
    expect(resume.stepName).toBe("perfil_empresa");
    expect(resume.canResume).toBe(true);
  });

  it("deve retornar etapa 4 para projeto com CNAEs confirmados", () => {
    const project = makeProject({
      currentStep: 4,
      confirmedCnaes: [{ code: "4711-3/01", description: "Comércio varejista", confidence: 90 }],
    });
    const resume = getResumePoint(project);
    expect(resume.step).toBe(4);
    expect(resume.stepName).toBe("confirmacao_cnaes");
    expect(resume.resumeData.hasCnaes).toBe(true);
    expect(resume.resumeData.cnaeCount).toBe(1);
  });

  it("deve retornar etapa 8 para projeto com briefing gerado", () => {
    const project = makeProject({
      currentStep: 8,
      briefingContent: "Conteúdo do briefing",
    });
    const resume = getResumePoint(project);
    expect(resume.step).toBe(8);
    expect(resume.stepName).toBe("briefing");
    expect(resume.resumeData.hasBriefing).toBe(true);
  });

  it("deve retornar resumeData com todos os flags corretos", () => {
    const project = makeProject({
      currentStep: 9,
      consistencyCheckStatus: "approved",
      confirmedCnaes: [{ code: "4711-3/01", description: "Comércio varejista", confidence: 90 }],
      corporateAnswers: { q1: "sim" },
      operationalAnswers: { q1: "sim" },
      cnaeAnswers: { q1: "sim" },
      briefingContent: "Briefing",
      riskMatricesData: { "4711-3/01": [] },
    });
    const resume = getResumePoint(project);
    expect(resume.resumeData.hasConsistencyCheck).toBe(true);
    expect(resume.resumeData.hasCnaes).toBe(true);
    expect(resume.resumeData.hasCorporateAnswers).toBe(true);
    expect(resume.resumeData.hasOperationalAnswers).toBe(true);
    expect(resume.resumeData.hasCnaeAnswers).toBe(true);
    expect(resume.resumeData.hasBriefing).toBe(true);
    expect(resume.resumeData.hasRisks).toBe(true);
    expect(resume.resumeData.hasPlan).toBe(false);
  });
});

// ─── FASE 4: createHistoryEntry ──────────────────────────────────────────────

describe("createHistoryEntry", () => {
  it("deve criar entrada de histórico com timestamp ISO", () => {
    const entry = createHistoryEntry(4, "confirmacao_cnaes", 42);
    expect(entry.step).toBe(4);
    expect(entry.stepName).toBe("confirmacao_cnaes");
    expect(entry.userId).toBe(42);
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it("deve criar entrada sem userId quando não fornecido", () => {
    const entry = createHistoryEntry(1, "perfil_empresa");
    expect(entry.userId).toBeUndefined();
  });
});

// ─── FASE 5: Testes de borda ─────────────────────────────────────────────────

describe("validateTransition — testes de borda", () => {
  it("deve lidar com currentStep undefined (projeto sem step)", () => {
    const project = makeProject({ currentStep: undefined as unknown as number });
    const result = validateTransition(project, "consistencia");
    // currentStep undefined → 1, pode avançar para 2
    expect(result.allowed).toBe(true);
  });

  it("deve bloquear avanço de 11 etapas de uma vez", () => {
    const project = makeProject({ currentStep: 1 });
    const result = validateTransition(project, "dashboard");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("pular etapas");
  });

  it("deve permitir avançar exatamente 1 etapa", () => {
    const project = makeProject({
      currentStep: 3,
      consistencyCheckStatus: "approved",
      confirmedCnaes: [{ code: "4711-3/01", description: "Comércio varejista", confidence: 90 }],
    });
    const result = validateTransition(project, "confirmacao_cnaes");
    expect(result.allowed).toBe(true);
  });
});
