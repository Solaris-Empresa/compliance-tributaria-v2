/**
 * e2e-fluxo-completo.test.ts
 * DEC-M3-05 — Suite E2E automatizada do fluxo completo
 *
 * Bloco 1 — Happy path: cnaes_confirmados → aprovado (8 casos)
 * Bloco 2 — Bloqueios assertValidTransition (4 casos)
 * Bloco 3 — computeCompleteness por cenário (3 casos)
 *
 * HEAD de referência: pós-PR #363
 * Estratégia: mocks de db + flowStateMachine (sem I/O real)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("../db", () => ({
  getDb: vi.fn(),
  createProject: vi.fn(),
  getProjectById: vi.fn(),
  getUsersByRole: vi.fn(),
  isUserInProject: vi.fn(),
  updateProject: vi.fn(),
  saveOnda1Answers: vi.fn(),
  saveOnda2Answers: vi.fn(),
  insertTaskHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("../ai-helpers", () => ({
  generateWithRetry: vi.fn(),
  calculateGlobalScore: vi.fn().mockReturnValue({
    score_global: 75,
    nivel: "Alto",
    impacto_estimado: "R$ 500k",
    custo_inacao: "R$ 1M",
    prioridade: "Urgente",
  }),
  OUTPUT_CONTRACT: "",
}));

vi.mock("../rag-retriever", () => ({
  retrieveArticles: vi.fn().mockResolvedValue([]),
  retrieveArticlesFast: vi.fn().mockResolvedValue([]),
}));

import * as db from "../db";

// ─── Mock DB helper ───────────────────────────────────────────────────────────
const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};

// ─── Usuário mock (equipe_solaris tem acesso irrestrito) ──────────────────────
const mockUser = {
  id: 1,
  openId: "user-e2e",
  name: "Consultor E2E",
  email: "e2e@solaris.com",
  role: "equipe_solaris" as const,
};

const mockCtx = { user: mockUser, req: {} as any, res: {} as any };

// ─── Projeto base ─────────────────────────────────────────────────────────────
const mockProjectBase = {
  id: 99,
  name: "Projeto E2E Reforma Tributária",
  clientId: 1,
  createdById: 1,
  confirmedCnaes: [
    { code: "6201-5/01", description: "Desenvolvimento de software sob encomenda", confidence: 95 },
  ],
  questionnaireAnswers: [],
  briefingContent: "# Briefing E2E\n\nEmpresa de TI com exposição ao IBS e CBS.",
  riskMatricesData: {
    contabilidade: [
      { id: "r1", evento: "Mudança de alíquota", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Revisar contratos" },
    ],
    negocio: [],
    ti: [],
    juridico: [],
  },
  actionPlansData: {
    contabilidade: [
      { id: "t1", titulo: "Revisar contratos", descricao: "...", area: "contabilidade", prazo_sugerido: "30 dias", prioridade: "Alta", responsavel_sugerido: "Controller", status: "nao_iniciado", progress: 0, startDate: null, endDate: null, responsible: null, notifications: { beforeDays: 7, onStatusChange: true, onProgressUpdate: false, onComment: false } },
    ],
  },
  diagnosticStatus: {
    corporate: "not_started",
    operational: "not_started",
    cnae: "not_started",
  },
};

// ─── BLOCO 1: Happy Path — cnaes_confirmados → aprovado ──────────────────────
describe("Bloco 1 — Happy Path: progressão completa cnaes_confirmados → aprovado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.isUserInProject).mockResolvedValue(true);
    vi.mocked(db.updateProject).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda1Answers).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda2Answers).mockResolvedValue(undefined as any);
  });

  // Caso 1: cnaes_confirmados → onda1_solaris
  it("Caso 1: completeOnda1 — cnaes_confirmados → onda1_solaris", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "cnaes_confirmados",
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.completeOnda1({
      projectId: 99,
      answers: [{ questionId: 1, codigo: "6201-5/01", resposta: "Lucro Presumido" }],
    });

    expect(result).toBeDefined();
    expect(vi.mocked(db.saveOnda1Answers)).toHaveBeenCalledWith(99, expect.any(Array));
  });

  // Caso 2: onda1_solaris → onda2_iagen
  it("Caso 2: completeOnda2 — onda1_solaris → onda2_iagen", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "onda1_solaris",
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.completeOnda2({
      projectId: 99,
      answers: [{ questionText: "Qual o regime?", resposta: "Lucro Presumido", confidenceScore: 0.9 }],
    });

    expect(result).toBeDefined();
    expect(vi.mocked(db.saveOnda2Answers)).toHaveBeenCalledWith(99, expect.any(Array));
  });

  // Caso 3: onda2_iagen → diagnostico_corporativo
  it("Caso 3: completeDiagnosticLayer(corporate) — onda2_iagen → diagnostico_corporativo", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "onda2_iagen",
      diagnosticStatus: { corporate: "not_started", operational: "not_started", cnae: "not_started" },
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.completeDiagnosticLayer({
      projectId: 99,
      layer: "corporate",
    });

    expect(result).toBeDefined();
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(
      99,
      expect.objectContaining({ status: "diagnostico_corporativo" })
    );
  });

  // Caso 4: diagnostico_corporativo → diagnostico_operacional
  it("Caso 4: completeDiagnosticLayer(operational) — diagnostico_corporativo → diagnostico_operacional", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "diagnostico_corporativo",
      diagnosticStatus: { corporate: "completed", operational: "not_started", cnae: "not_started" },
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.completeDiagnosticLayer({
      projectId: 99,
      layer: "operational",
    });

    expect(result).toBeDefined();
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(
      99,
      expect.objectContaining({ status: "diagnostico_operacional" })
    );
  });

  // Caso 5: diagnostico_operacional → diagnostico_cnae
  it("Caso 5: completeDiagnosticLayer(cnae) — diagnostico_operacional → diagnostico_cnae", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "diagnostico_operacional",
      diagnosticStatus: { corporate: "completed", operational: "completed", cnae: "not_started" },
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.completeDiagnosticLayer({
      projectId: 99,
      layer: "cnae",
    });

    expect(result).toBeDefined();
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(
      99,
      expect.objectContaining({ status: "diagnostico_cnae" })
    );
  });

  // Caso 6: diagnostico_cnae → matriz_riscos (atômico — PR #363)
  it("Caso 6: approveBriefing — diagnostico_cnae → matriz_riscos (transição atômica)", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "diagnostico_cnae",
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.approveBriefing({
      projectId: 99,
      briefingContent: mockProjectBase.briefingContent,
    });

    expect(result.success).toBe(true);
    expect(result.nextStep).toBe(4);
    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.status).toBe("matriz_riscos");
    expect(setCall.currentStep).toBe(4);
  });

  // Caso 7: matriz_riscos → plano_acao
  it("Caso 7: approveMatrices — matriz_riscos → plano_acao", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "matriz_riscos",
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.approveMatrices({
      projectId: 99,
      matrices: mockProjectBase.riskMatricesData,
    });

    expect(result.success).toBe(true);
    expect(result.nextStep).toBe(5);
    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.status).toBe("plano_acao");
    expect(setCall.currentStep).toBe(5);
  });

  // Caso 8: plano_acao → aprovado
  it("Caso 8: approveActionPlan — plano_acao → aprovado", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "plano_acao",
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.approveActionPlan({
      projectId: 99,
      plans: mockProjectBase.actionPlansData,
    });

    expect(result.success).toBe(true);
    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.status).toBe("aprovado");
  });
});

// ─── BLOCO 2: Bloqueios — assertValidTransition (sad path) ───────────────────
describe("Bloco 2 — Bloqueios: transições inválidas devem lançar FORBIDDEN", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.isUserInProject).mockResolvedValue(true);
    vi.mocked(db.updateProject).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda1Answers).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda2Answers).mockResolvedValue(undefined as any);
  });

  // Caso 9: cnaes_confirmados → completeOnda2 diretamente (pula onda1)
  it("Caso 9: completeOnda2 com status cnaes_confirmados → FORBIDDEN (pula onda1_solaris)", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "cnaes_confirmados",
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    await expect(
      caller.completeOnda2({
        projectId: 99,
        answers: [{ questionText: "Qual o regime?", resposta: "Lucro Presumido", confidenceScore: 0.9 }],
      })
    ).rejects.toThrow(TRPCError);

    await expect(
      caller.completeOnda2({
        projectId: 99,
        answers: [{ questionText: "Qual o regime?", resposta: "Lucro Presumido", confidenceScore: 0.9 }],
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  // Caso 10: onda2_iagen → approveBriefing diretamente (pula diagnóstico)
  it("Caso 10: approveBriefing com status onda2_iagen → FORBIDDEN (pula diagnóstico)", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "onda2_iagen",
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    await expect(
      caller.approveBriefing({
        projectId: 99,
        briefingContent: mockProjectBase.briefingContent,
      })
    ).rejects.toThrow(TRPCError);
  });

  // Caso 11: diagnostico_cnae → approveMatrices diretamente (pula approveBriefing)
  it("Caso 11: approveMatrices com status diagnostico_cnae → FORBIDDEN (pula approveBriefing)", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "diagnostico_cnae",
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    await expect(
      caller.approveMatrices({
        projectId: 99,
        matrices: mockProjectBase.riskMatricesData,
      })
    ).rejects.toThrow(TRPCError);
  });

  // Caso 12: matriz_riscos → approveActionPlan diretamente (pula approveMatrices)
  it("Caso 12: approveActionPlan com status matriz_riscos → FORBIDDEN (pula approveMatrices)", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...mockProjectBase,
      status: "matriz_riscos",
    } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    await expect(
      caller.approveActionPlan({
        projectId: 99,
        plans: mockProjectBase.actionPlansData,
      })
    ).rejects.toThrow(TRPCError);
  });
});

// ─── BLOCO 3: computeCompleteness — cenários de completude diagnóstica ────────
describe("Bloco 3 — computeCompleteness: cenários de status global", () => {
  // Importar diretamente a função pura (sem mock de db necessário)
  // computeCompleteness é determinística — sem I/O

  // Caso 13: empresa de produto com dados completos → status 'completo'
  it("Caso 13: empresa produto + 24 solaris + diagnóstico completo + 1 NCM → status 'completo'", async () => {
    const { computeCompleteness } = await import("../lib/completeness");

    const result = computeCompleteness({
      solarisAnswersCount: 24,
      iagenAnswersCount: 3,
      diagnosticStatus: {
        corporate: "completed",
        operational: "completed",
        cnae: "completed",
      },
      operationProfile: { operationType: "produto" },
      ncmCodesCount: 1,   // empresa de produto → NCM aplicável, NBS não aplicável
      nbsCodesCount: 0,
    });

    expect(result.status).toBe("completo");
    expect(result.completeness_score).toBe(1);
    expect(result.missing_sources).toHaveLength(0);
  });

  // Caso 14: projeto sem nenhuma resposta → status 'insuficiente'
  it("Caso 14: 0 solaris_answers + 0 iagen_answers → status 'insuficiente'", async () => {
    const { computeCompleteness } = await import("../lib/completeness");

    const result = computeCompleteness({
      solarisAnswersCount: 0,
      iagenAnswersCount: 0,
      diagnosticStatus: null,
      operationProfile: null,
      ncmCodesCount: 0,
      nbsCodesCount: 0,
    });

    expect(result.status).toBe("insuficiente");
    expect(result.completeness_score).toBe(0);
  });

  // Caso 15: 12 solaris_answers (suficiente), QC incompleto (0 iagen) → status 'parcial'
  it("Caso 15: 12 solaris_answers + 0 iagen_answers + QC incompleto → status 'parcial'", async () => {
    const { computeCompleteness } = await import("../lib/completeness");

    const result = computeCompleteness({
      solarisAnswersCount: 12,
      iagenAnswersCount: 0,   // iagen nao_iniciado → missing
      diagnosticStatus: {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      },
      operationProfile: null,
      ncmCodesCount: 0,
      nbsCodesCount: 0,
    });

    expect(result.status).toBe("parcial");
    expect(result.missing_sources.length).toBeGreaterThan(0);
    // solaris está suficiente mas iagen e diagnósticos estão faltando
    expect(result.missing_sources).toContain("iagen");
  });
});
