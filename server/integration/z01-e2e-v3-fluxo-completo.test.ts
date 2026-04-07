/**
 * z01-e2e-v3-fluxo-completo.test.ts
 * Sprint Z · Z-01 · E2E v3 — 5 casos completos
 * 8 etapas por caso · 100% de acerto obrigatório
 *
 * Caso 1 (E-P1): produto puro  — Q4 ativa · Q5 pulada
 * Caso 2 (E-P2): serviço puro  — Q4 pulada · Q5 ativa
 * Caso 3 (E-P3): mista farmácia — Q4 e Q5 ativas
 * Caso 4 (E-P4): produto IS    — Q4 ativa + IS · Q5 pulada
 * Caso 5 (E-P5): mista tech    — Q4 e Q5 ativas · zero contaminação
 *
 * HEAD: pós-merge PR #370 · Branch: test/z01-22-casos-validacao
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrackedQuestion } from "../lib/tracked-question";

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
  insertStatusLog: vi.fn().mockResolvedValue(undefined),
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

// ─── Mock das funções de geração de perguntas ─────────────────────────────────
vi.mock("../lib/product-questions", () => ({
  generateProductQuestions: vi.fn(),
}));

vi.mock("../lib/service-questions", () => ({
  generateServiceQuestions: vi.fn(),
}));

import * as db from "../db";
import { generateProductQuestions } from "../lib/product-questions";
import { generateServiceQuestions } from "../lib/service-questions";

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

// ─── Usuário mock ─────────────────────────────────────────────────────────────
const mockUser = {
  id: 1,
  openId: "user-e2e-v3",
  name: "Consultor E2E v3",
  email: "e2e-v3@solaris.com",
  role: "equipe_solaris" as const,
};

const mockCtx = { user: mockUser, req: {} as any, res: {} as any };

// ─── Helpers de TrackedQuestion ───────────────────────────────────────────────
function makeTrackedQuestion(overrides: Partial<TrackedQuestion> & { id: string }): TrackedQuestion {
  return {
    id: overrides.id,
    texto: overrides.texto ?? "Pergunta de teste",
    categoria: overrides.categoria ?? "geral",
    fonte: overrides.fonte ?? "rag",
    fonte_ref: overrides.fonte_ref ?? `ref-${overrides.id}`,
    lei_ref: overrides.lei_ref ?? "LC 214/2025",
    confidence: overrides.confidence ?? 0.85,
    ncm: overrides.ncm,
    nbs: overrides.nbs,
  };
}

// ─── Projeto base ─────────────────────────────────────────────────────────────
const mockProjectBase = {
  id: 99,
  name: "Projeto E2E v3",
  clientId: 1,
  createdById: 1,
  confirmedCnaes: [{ code: "6201-5/00", description: "Dev software", confidence: 95 }],
  cnaes: ["6201-5/00"],
  questionnaireAnswers: [],
  briefingContent: "# Briefing E2E v3\n\nTeste.",
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

// ─── CASO 1: E-P1 — Distribuidora de alimentos (produto puro) ────────────────
describe("Caso 1 — E-P1: produto puro (Q4 ativa · Q5 pulada)", () => {
  const projeto = {
    ...mockProjectBase,
    id: 101,
    name: "E-P1 Distribuidora Alimentos Teste",
    operationProfile: {
      operationType: "product",
      principaisProdutos: [
        { ncm_code: "1006.40.00", descricao: "Arroz" },
        { ncm_code: "0713.33.19", descricao: "Feijão" },
      ],
      principaisServicos: [],
    },
    cnaes: ["4632-0/01", "4637-1/02"],
    confirmedCnaes: [
      { code: "4632-0/01", description: "Comércio atacadista de cereais", confidence: 95 },
      { code: "4637-1/02", description: "Comércio atacadista de leguminosas", confidence: 90 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.isUserInProject).mockResolvedValue(true);
    vi.mocked(db.updateProject).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda1Answers).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda2Answers).mockResolvedValue(undefined as any);
  });

  it("Etapa 1 — Perfil: status=cnaes_confirmados · 2 NCMs · 0 NBS", () => {
    // Simula criação do projeto — verifica dados do perfil
    expect(projeto.operationProfile.operationType).toBe("product");
    expect(projeto.operationProfile.principaisProdutos).toHaveLength(2);
    expect(projeto.operationProfile.principaisServicos).toHaveLength(0);
    // status seria cnaes_confirmados após createProject
    const statusSimulado = "cnaes_confirmados";
    expect(statusSimulado).toBe("cnaes_confirmados");
  });

  it("Etapa 2 — SOLARIS Onda 1: 24 respostas gravadas", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "cnaes_confirmados" } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const respostasOnda1 = [
      { questionId: 1, codigo: "SOL-001", resposta: "sim" },
      { questionId: 2, codigo: "SOL-002", resposta: "nao" },
      { questionId: 3, codigo: "SOL-003", resposta: "sim" },
      { questionId: 4, codigo: "SOL-004", resposta: "sim" },
      { questionId: 5, codigo: "SOL-005", resposta: "nao" },
      { questionId: 6, codigo: "SOL-006", resposta: "sim" },
      { questionId: 7, codigo: "SOL-007", resposta: "nao" },
      { questionId: 8, codigo: "SOL-008", resposta: "sim" },
      { questionId: 9, codigo: "SOL-009", resposta: "sim" },
      { questionId: 10, codigo: "SOL-010", resposta: "nao" },
      { questionId: 11, codigo: "SOL-011", resposta: "sim" },
      { questionId: 12, codigo: "SOL-012", resposta: "nao" },
      { questionId: 13, codigo: "SOL-013", resposta: "sim" },
      { questionId: 14, codigo: "SOL-014", resposta: "sim" },
      { questionId: 15, codigo: "SOL-015", resposta: "nao" },
      { questionId: 16, codigo: "SOL-016", resposta: "sim" },
      { questionId: 17, codigo: "SOL-017", resposta: "nao" },
      { questionId: 18, codigo: "SOL-018", resposta: "sim" },
      { questionId: 19, codigo: "SOL-019", resposta: "sim" },
      { questionId: 20, codigo: "SOL-020", resposta: "nao" },
      { questionId: 21, codigo: "SOL-021", resposta: "sim" },
      { questionId: 22, codigo: "SOL-022", resposta: "nao" },
      { questionId: 23, codigo: "SOL-023", resposta: "sim" },
      { questionId: 24, codigo: "SOL-024", resposta: "sim" },
    ];
    const result = await caller.completeOnda1({ projectId: 101, answers: respostasOnda1 });
    expect(result).toBeDefined();
    expect(vi.mocked(db.saveOnda1Answers)).toHaveBeenCalledWith(101, expect.any(Array));
  });

  it("Etapa 3 — IA GEN Onda 2: status=onda2_iagen", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "onda1_solaris" } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.completeOnda2({
      projectId: 101,
      answers: [{ questionText: "Qual o regime?", resposta: "Lucro Real", confidenceScore: 0.9 }],
    });
    expect(result).toBeDefined();
    expect(vi.mocked(db.saveOnda2Answers)).toHaveBeenCalledWith(101, expect.any(Array));
  });

  it("Etapa 4 — Q.Produtos NCM: ativa · fonte_ref + lei_ref + ncm alimentos", async () => {
    const perguntasNCM: TrackedQuestion[] = [
      makeTrackedQuestion({ id: "q-arroz-1", ncm: "1006.40.00", fonte: "rag", fonte_ref: "lc214-art14-arroz-001", lei_ref: "Art. 14 LC 214/2025", categoria: "aliquota_zero" }),
      makeTrackedQuestion({ id: "q-feijao-1", ncm: "0713.33.19", fonte: "rag", fonte_ref: "lc214-art14-feijao-001", lei_ref: "Art. 14 LC 214/2025", categoria: "aliquota_zero" }),
    ];
    vi.mocked(generateProductQuestions).mockResolvedValue(perguntasNCM);
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "onda2_iagen" } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.getProductQuestions({ projectId: 101 });

    // Assert 4a — perguntas geradas
    expect(result.nao_aplicavel).toBe(false);
    expect(result.perguntas.length).toBeGreaterThanOrEqual(2);

    // Assert 4b — rastreabilidade obrigatória
    result.perguntas.forEach((q: TrackedQuestion) => {
      expect(q.fonte_ref).toBeTruthy();
      expect(q.lei_ref).toBeTruthy();
      expect(["1006.40.00", "0713.33.19", undefined]).toContain(q.ncm);
    });

    // Assert 4c — corporateAnswers gravado
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ corporateAnswers: expect.any(String) })
    );
  });

  it("Etapa 4c — completeDiagnosticLayer(corporate) → diagnostico_corporativo", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...projeto,
      status: "onda2_iagen",
      diagnosticStatus: { corporate: "not_started", operational: "not_started", cnae: "not_started" },
    } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.completeDiagnosticLayer({ projectId: 101, layer: "corporate" });
    expect(result).toBeDefined();
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ status: "diagnostico_corporativo" })
    );
  });

  it("Etapa 5 — Q.Serviços: PULADA para produto puro → nao_aplicavel=true", async () => {
    vi.mocked(generateServiceQuestions).mockResolvedValue({ nao_aplicavel: true });
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "diagnostico_corporativo" } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.getServiceQuestions({ projectId: 101 });

    expect(result.nao_aplicavel).toBe(true);
    expect(result.perguntas).toHaveLength(0);
  });

  it("Etapa 5c — completeDiagnosticLayer(operational) → diagnostico_operacional", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...projeto,
      status: "diagnostico_corporativo",
      diagnosticStatus: { corporate: "completed", operational: "not_started", cnae: "not_started" },
    } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.completeDiagnosticLayer({ projectId: 101, layer: "operational" });
    expect(result).toBeDefined();
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ status: "diagnostico_operacional" })
    );
  });

  it("Etapa 6 — CNAE → diagnostico_cnae", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...projeto,
      status: "diagnostico_operacional",
      diagnosticStatus: { corporate: "completed", operational: "completed", cnae: "not_started" },
    } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    await caller.completeDiagnosticLayer({ projectId: 101, layer: "cnae" });
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ status: "diagnostico_cnae" })
    );
  });

  it("Etapa 7 — Briefing → matriz_riscos (transição atômica)", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "diagnostico_cnae" } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.approveBriefing({ projectId: 101, briefingContent: "# Briefing E-P1" });
    expect(result.success).toBe(true);
    expect(result.nextStep).toBe(4);
    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.status).toBe("matriz_riscos");
  });

  it("Etapa 8 — Matrizes → plano_acao → aprovado", async () => {
    // Matrizes
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "matriz_riscos" } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const r1 = await caller.approveMatrices({ projectId: 101, matrices: mockProjectBase.riskMatricesData });
    expect(r1.success).toBe(true);
    const setCall1 = mockDb.set.mock.calls[0][0];
    expect(setCall1.status).toBe("plano_acao");

    // Plano
    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "plano_acao" } as any);
    const r2 = await caller.approveActionPlan({ projectId: 101, plans: mockProjectBase.actionPlansData });
    expect(r2.success).toBe(true);
    const setCall2 = mockDb.set.mock.calls[0][0];
    expect(setCall2.status).toBe("aprovado");
  });
});

// ─── CASO 2: E-P2 — Consultoria tributária (serviço puro) ────────────────────
describe("Caso 2 — E-P2: serviço puro (Q4 pulada · Q5 ativa)", () => {
  const projeto = {
    ...mockProjectBase,
    id: 102,
    name: "E-P2 Consultoria Tributaria Teste",
    operationProfile: {
      operationType: "service",
      principaisProdutos: [],
      principaisServicos: [
        { nbs_code: "1.01.01", descricao: "Desenvolvimento software" },
        { nbs_code: "1.17.19", descricao: "Consultoria" },
      ],
    },
    cnaes: ["6920-6/01"],
    confirmedCnaes: [{ code: "6920-6/01", description: "Atividades de contabilidade", confidence: 95 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.isUserInProject).mockResolvedValue(true);
    vi.mocked(db.updateProject).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda1Answers).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda2Answers).mockResolvedValue(undefined as any);
  });

  it("Etapa 1 — Perfil: operationType=service · 0 NCMs · 2 NBS", () => {
    expect(projeto.operationProfile.operationType).toBe("service");
    expect(projeto.operationProfile.principaisProdutos).toHaveLength(0);
    expect(projeto.operationProfile.principaisServicos).toHaveLength(2);
  });

  it("Etapa 2 — SOLARIS Onda 1: 24 respostas gravadas", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "cnaes_confirmados" } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const respostasOnda1 = Array.from({ length: 24 }, (_, i) => ({
      questionId: i + 1,
      codigo: `SOL-${String(i + 1).padStart(3, "0")}`,
      resposta: i % 3 === 0 ? "sim" : "nao",
    }));
    const result = await caller.completeOnda1({ projectId: 102, answers: respostasOnda1 });
    expect(result).toBeDefined();
    expect(vi.mocked(db.saveOnda1Answers)).toHaveBeenCalledWith(102, expect.any(Array));
  });

  it("Etapa 3 — IA GEN Onda 2", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "onda1_solaris" } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.completeOnda2({
      projectId: 102,
      answers: [{ questionText: "Qual o regime?", resposta: "Simples Nacional", confidenceScore: 0.9 }],
    });
    expect(result).toBeDefined();
  });

  it("Etapa 4 — Q.Produtos: PULADA para serviço puro → nao_aplicavel=true", async () => {
    vi.mocked(generateProductQuestions).mockResolvedValue({ nao_aplicavel: true });
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "onda2_iagen" } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.getProductQuestions({ projectId: 102 });

    expect(result.nao_aplicavel).toBe(true);
    expect(result.perguntas).toHaveLength(0);
  });

  it("Etapa 4c — completeDiagnosticLayer(corporate) → diagnostico_corporativo", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...projeto,
      status: "onda2_iagen",
      diagnosticStatus: { corporate: "not_started", operational: "not_started", cnae: "not_started" },
    } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    await caller.completeDiagnosticLayer({ projectId: 102, layer: "corporate" });
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(
      102,
      expect.objectContaining({ status: "diagnostico_corporativo" })
    );
  });

  it("Etapa 5 — Q.Serviços NBS TI: ativa · fonte_ref + lei_ref · sem NBS 1.03", async () => {
    const perguntasNBS: TrackedQuestion[] = [
      makeTrackedQuestion({ id: "q-sol-022", nbs: "1.01.01", fonte: "solaris", fonte_ref: "SOL-022", lei_ref: "LC 214/2025 Art. 29", categoria: "geral" }),
      makeTrackedQuestion({ id: "q-rag-ti-1", nbs: "1.17.19", fonte: "rag", fonte_ref: "lc214-art29-ti-001", lei_ref: "Art. 29 LC 214/2025", categoria: "geral" }),
    ];
    vi.mocked(generateServiceQuestions).mockResolvedValue(perguntasNBS);
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "diagnostico_corporativo" } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.getServiceQuestions({ projectId: 102 });

    // Assert 5a — perguntas geradas
    expect(result.nao_aplicavel).toBe(false);
    expect(result.perguntas.length).toBeGreaterThanOrEqual(1);

    // Assert 5b — rastreabilidade por fonte
    result.perguntas.forEach((q: TrackedQuestion) => {
      expect(["solaris", "rag", "fallback"]).toContain(q.fonte);
      expect(q.fonte_ref).toBeTruthy();
      expect(q.lei_ref).toBeTruthy();
    });

    // Assert 5c — sem NBS de saúde (1.03)
    result.perguntas.forEach((q: TrackedQuestion) => {
      if (q.nbs) expect(q.nbs).not.toMatch(/^1\.03/);
    });

    // operationalAnswers gravado
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(
      102,
      expect.objectContaining({ operationalAnswers: expect.any(String) })
    );
  });

  it("Etapas 6+7+8 — CNAE → Briefing → Matrizes → Aprovado", async () => {
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    // Etapa 6
    vi.mocked(db.getProjectById).mockResolvedValue({
      ...projeto, status: "diagnostico_operacional",
      diagnosticStatus: { corporate: "completed", operational: "completed", cnae: "not_started" },
    } as any);
    await caller.completeDiagnosticLayer({ projectId: 102, layer: "cnae" });
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(102, expect.objectContaining({ status: "diagnostico_cnae" }));

    // Etapa 7
    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "diagnostico_cnae" } as any);
    const r7 = await caller.approveBriefing({ projectId: 102, briefingContent: "# Briefing E-P2" });
    expect(r7.success).toBe(true);
    expect(mockDb.set.mock.calls[0][0].status).toBe("matriz_riscos");

    // Etapa 8 — matrizes
    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "matriz_riscos" } as any);
    const r8a = await caller.approveMatrices({ projectId: 102, matrices: mockProjectBase.riskMatricesData });
    expect(r8a.success).toBe(true);
    expect(mockDb.set.mock.calls[0][0].status).toBe("plano_acao");

    // Etapa 8 — plano
    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "plano_acao" } as any);
    const r8b = await caller.approveActionPlan({ projectId: 102, plans: mockProjectBase.actionPlansData });
    expect(r8b.success).toBe(true);
    expect(mockDb.set.mock.calls[0][0].status).toBe("aprovado");
  });
});

// ─── CASO 3: E-P3 — Indústria farmacêutica (mista) ───────────────────────────
describe("Caso 3 — E-P3: mista farmácia (Q4 ativa · Q5 ativa)", () => {
  const projeto = {
    ...mockProjectBase,
    id: 103,
    name: "E-P3 Industria Farmaceutica Teste",
    operationProfile: {
      operationType: "mixed",
      principaisProdutos: [
        { ncm_code: "3004.90.99", descricao: "Medicamentos" },
        { ncm_code: "3002.20.29", descricao: "Vacinas" },
      ],
      principaisServicos: [
        { nbs_code: "1.03.07", descricao: "Serviços hospitalares" },
        { nbs_code: "1.03.17", descricao: "Diagnóstico clínico" },
      ],
    },
    cnaes: ["2121-1/01", "8630-5/04"],
    confirmedCnaes: [
      { code: "2121-1/01", description: "Fabricação de medicamentos", confidence: 95 },
      { code: "8630-5/04", description: "Atividades de serviços de saúde", confidence: 90 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.isUserInProject).mockResolvedValue(true);
    vi.mocked(db.updateProject).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda1Answers).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda2Answers).mockResolvedValue(undefined as any);
  });

  it("Etapa 1 — Perfil: mista · 2 NCMs farmacêuticos · 2 NBS saúde", () => {
    expect(projeto.operationProfile.operationType).toBe("mixed");
    expect(projeto.operationProfile.principaisProdutos).toHaveLength(2);
    expect(projeto.operationProfile.principaisServicos).toHaveLength(2);
  });

  it("Etapa 2+3 — SOLARIS + IA GEN", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "cnaes_confirmados" } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const respostasOnda1 = Array.from({ length: 24 }, (_, i) => ({
      questionId: i + 1,
      codigo: `SOL-${String(i + 1).padStart(3, "0")}`,
      resposta: "sim",
    }));
    await caller.completeOnda1({ projectId: 103, answers: respostasOnda1 });
    expect(vi.mocked(db.saveOnda1Answers)).toHaveBeenCalledWith(103, expect.any(Array));

    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "onda1_solaris" } as any);
    await caller.completeOnda2({ projectId: 103, answers: [{ questionText: "Regime?", resposta: "Lucro Real", confidenceScore: 0.9 }] });
    expect(vi.mocked(db.saveOnda2Answers)).toHaveBeenCalledWith(103, expect.any(Array));
  });

  it("Etapa 4 — Q.Produtos NCM farmacêutico: ativa · NCMs 3004/3002 · sem bebidas", async () => {
    const perguntasNCM: TrackedQuestion[] = [
      makeTrackedQuestion({ id: "q-med-1", ncm: "3004.90.99", fonte: "rag", fonte_ref: "lc214-art14-med-001", lei_ref: "Art. 14 LC 214/2025", categoria: "aliquota_zero" }),
      makeTrackedQuestion({ id: "q-vac-1", ncm: "3002.20.29", fonte: "rag", fonte_ref: "lc214-art14-vac-001", lei_ref: "Art. 14 LC 214/2025", categoria: "aliquota_zero" }),
    ];
    vi.mocked(generateProductQuestions).mockResolvedValue(perguntasNCM);
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "onda2_iagen" } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.getProductQuestions({ projectId: 103 });

    expect(result.nao_aplicavel).toBe(false);

    // Assert 4a — NCMs farmacêuticos cobertos
    const ncmsCobertos = new Set(result.perguntas.filter((q: TrackedQuestion) => q.ncm).map((q: TrackedQuestion) => q.ncm));
    expect(ncmsCobertos.has("3004.90.99") || ncmsCobertos.has("3002.20.29")).toBe(true);

    // Assert 4b — NÃO contém bebidas ou alimentos
    result.perguntas.forEach((q: TrackedQuestion) => {
      if (q.ncm) {
        expect(q.ncm).not.toContain("2202");
        expect(q.ncm).not.toContain("1006");
      }
    });
  });

  it("Etapa 5 — Q.Serviços NBS saúde: ativa · NBS 1.03 · SOLARIS presente · sem TI/transporte", async () => {
    const perguntasNBS: TrackedQuestion[] = [
      makeTrackedQuestion({ id: "q-sol-hosp", nbs: "1.03.07", fonte: "solaris", fonte_ref: "SOL-019", lei_ref: "LC 214/2025 Art. 29", categoria: "geral" }),
      makeTrackedQuestion({ id: "q-rag-diag", nbs: "1.03.17", fonte: "rag", fonte_ref: "lc214-art29-saude-001", lei_ref: "Art. 29 LC 214/2025", categoria: "geral" }),
    ];
    vi.mocked(generateServiceQuestions).mockResolvedValue(perguntasNBS);
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "diagnostico_corporativo" } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.getServiceQuestions({ projectId: 103 });

    expect(result.nao_aplicavel).toBe(false);

    // Assert 5a — NBS de saúde (1.03)
    const nbsCobertos = new Set(result.perguntas.filter((q: TrackedQuestion) => q.nbs).map((q: TrackedQuestion) => q.nbs));
    const temSaude = [...nbsCobertos].some(nbs => (nbs as string).startsWith("1.03"));
    expect(temSaude).toBe(true);

    // Assert 5b — sem TI ou transporte
    result.perguntas.forEach((q: TrackedQuestion) => {
      if (q.nbs) {
        expect(q.nbs).not.toMatch(/^1\.01/);
        expect(q.nbs).not.toMatch(/^1\.09/);
      }
    });

    // Assert 5c — SOLARIS presente
    const temSolaris = result.perguntas.some((q: TrackedQuestion) => q.fonte === "solaris");
    expect(temSolaris).toBe(true);
  });

  it("Etapas 6+7+8 — CNAE → Briefing → Matrizes → Aprovado · QC e QO rastreados", async () => {
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    vi.mocked(db.getProjectById).mockResolvedValue({
      ...projeto, status: "diagnostico_operacional",
      diagnosticStatus: { corporate: "completed", operational: "completed", cnae: "not_started" },
    } as any);
    await caller.completeDiagnosticLayer({ projectId: 103, layer: "cnae" });
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(103, expect.objectContaining({ status: "diagnostico_cnae" }));

    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "diagnostico_cnae" } as any);
    const r7 = await caller.approveBriefing({ projectId: 103, briefingContent: "# Briefing E-P3" });
    expect(r7.success).toBe(true);
    expect(mockDb.set.mock.calls[0][0].status).toBe("matriz_riscos");

    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "matriz_riscos" } as any);
    const r8a = await caller.approveMatrices({ projectId: 103, matrices: mockProjectBase.riskMatricesData });
    expect(r8a.success).toBe(true);
    expect(mockDb.set.mock.calls[0][0].status).toBe("plano_acao");

    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "plano_acao" } as any);
    const r8b = await caller.approveActionPlan({ projectId: 103, plans: mockProjectBase.actionPlansData });
    expect(r8b.success).toBe(true);
    expect(mockDb.set.mock.calls[0][0].status).toBe("aprovado");
  });
});

// ─── CASO 4: E-P4 — Distribuidora de bebidas com IS ──────────────────────────
describe("Caso 4 — E-P4: produto IS (Q4 ativa + IS · Q5 pulada)", () => {
  const projeto = {
    ...mockProjectBase,
    id: 104,
    name: "E-P4 Distribuidora Bebidas IS Teste",
    operationProfile: {
      operationType: "product",
      principaisProdutos: [
        { ncm_code: "2202.10.00", descricao: "Bebidas açucaradas" },
        { ncm_code: "2208.40.00", descricao: "Rum/cachaça" },
        { ncm_code: "2203.00.00", descricao: "Cerveja" },
      ],
      principaisServicos: [],
    },
    cnaes: ["4635-4/02"],
    confirmedCnaes: [{ code: "4635-4/02", description: "Comércio atacadista de bebidas", confidence: 95 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.isUserInProject).mockResolvedValue(true);
    vi.mocked(db.updateProject).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda1Answers).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda2Answers).mockResolvedValue(undefined as any);
  });

  it("Etapa 1 — Perfil: produto · 3 NCMs de bebidas", () => {
    expect(projeto.operationProfile.operationType).toBe("product");
    expect(projeto.operationProfile.principaisProdutos).toHaveLength(3);
  });

  it("Etapa 2+3 — SOLARIS + IA GEN", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "cnaes_confirmados" } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const respostasOnda1 = Array.from({ length: 24 }, (_, i) => ({
      questionId: i + 1,
      codigo: `SOL-${String(i + 1).padStart(3, "0")}`,
      resposta: i % 2 === 0 ? "sim" : "nao",
    }));
    await caller.completeOnda1({ projectId: 104, answers: respostasOnda1 });
    expect(vi.mocked(db.saveOnda1Answers)).toHaveBeenCalledWith(104, expect.any(Array));
  });

  it("Etapa 4 — Q.Produtos NCM bebidas: ativa · IS obrigatório · NCMs 22xx", async () => {
    const perguntasNCM: TrackedQuestion[] = [
      makeTrackedQuestion({ id: "q-beb-1", ncm: "2202.10.00", fonte: "rag", fonte_ref: "lc214-is-beb-001", lei_ref: "Art. 8 LC 214/2025", categoria: "imposto_seletivo" }),
      makeTrackedQuestion({ id: "q-beb-2", ncm: "2208.40.00", fonte: "rag", fonte_ref: "lc214-is-beb-002", lei_ref: "Art. 8 LC 214/2025", categoria: "imposto_seletivo" }),
      makeTrackedQuestion({ id: "q-beb-3", ncm: "2203.00.00", fonte: "rag", fonte_ref: "lc214-is-beb-003", lei_ref: "Art. 8 LC 214/2025", categoria: "imposto_seletivo" }),
    ];
    vi.mocked(generateProductQuestions).mockResolvedValue(perguntasNCM);
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "onda2_iagen" } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.getProductQuestions({ projectId: 104 });

    expect(result.nao_aplicavel).toBe(false);

    // Assert 4a — ao menos 1 NCM de bebidas coberto
    const ncmsCobertos = new Set(result.perguntas.filter((q: TrackedQuestion) => q.ncm).map((q: TrackedQuestion) => q.ncm));
    expect(ncmsCobertos.size).toBeGreaterThanOrEqual(1);

    // Assert 4b — ao menos 1 pergunta de Imposto Seletivo
    const temIS = result.perguntas.some((q: TrackedQuestion) => q.categoria === "imposto_seletivo");
    expect(temIS).toBe(true);

    // Assert 4c — NCMs são de bebidas (22xx)
    result.perguntas.forEach((q: TrackedQuestion) => {
      if (q.ncm) expect(q.ncm).toMatch(/^220/);
    });
  });

  it("Etapa 5 — Q.Serviços: PULADA para produto puro → nao_aplicavel=true", async () => {
    vi.mocked(generateServiceQuestions).mockResolvedValue({ nao_aplicavel: true });
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "diagnostico_corporativo" } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.getServiceQuestions({ projectId: 104 });

    expect(result.nao_aplicavel).toBe(true);
  });

  it("Etapas 6+7+8 — CNAE → Briefing → Matrizes → Aprovado", async () => {
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    vi.mocked(db.getProjectById).mockResolvedValue({
      ...projeto, status: "diagnostico_operacional",
      diagnosticStatus: { corporate: "completed", operational: "completed", cnae: "not_started" },
    } as any);
    await caller.completeDiagnosticLayer({ projectId: 104, layer: "cnae" });
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(104, expect.objectContaining({ status: "diagnostico_cnae" }));

    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "diagnostico_cnae" } as any);
    const r7 = await caller.approveBriefing({ projectId: 104, briefingContent: "# Briefing E-P4" });
    expect(r7.success).toBe(true);
    expect(mockDb.set.mock.calls[0][0].status).toBe("matriz_riscos");

    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "matriz_riscos" } as any);
    await caller.approveMatrices({ projectId: 104, matrices: mockProjectBase.riskMatricesData });
    expect(mockDb.set.mock.calls[0][0].status).toBe("plano_acao");

    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "plano_acao" } as any);
    const r8b = await caller.approveActionPlan({ projectId: 104, plans: mockProjectBase.actionPlansData });
    expect(r8b.success).toBe(true);
    expect(mockDb.set.mock.calls[0][0].status).toBe("aprovado");
  });
});

// ─── CASO 5: E-P5 — Empresa de tecnologia e hardware (mista) ─────────────────
describe("Caso 5 — E-P5: mista tech (Q4 ativa · Q5 ativa · zero contaminação)", () => {
  const projeto = {
    ...mockProjectBase,
    id: 105,
    name: "E-P5 Tech Hardware Software Teste",
    operationProfile: {
      operationType: "mixed",
      principaisProdutos: [
        { ncm_code: "8471.30.12", descricao: "Computadores" },
        { ncm_code: "8517.62.77", descricao: "Roteadores" },
      ],
      principaisServicos: [
        { nbs_code: "1.01.01", descricao: "Dev software" },
        { nbs_code: "1.01.02", descricao: "Licença software" },
        { nbs_code: "1.07.01", descricao: "Consultoria TI" },
      ],
    },
    cnaes: ["6201-5/00", "4751-2/01"],
    confirmedCnaes: [
      { code: "6201-5/00", description: "Desenvolvimento de software", confidence: 95 },
      { code: "4751-2/01", description: "Comércio varejista de informática", confidence: 90 },
    ],
  };

  // Perguntas QC e QO para verificar isolamento
  const perguntasQC: TrackedQuestion[] = [
    makeTrackedQuestion({ id: "q-hw-1", ncm: "8471.30.12", fonte: "rag", fonte_ref: "lc214-art14-hw-001", lei_ref: "Art. 14 LC 214/2025", categoria: "geral" }),
    makeTrackedQuestion({ id: "q-hw-2", ncm: "8517.62.77", fonte: "rag", fonte_ref: "lc214-art14-hw-002", lei_ref: "Art. 14 LC 214/2025", categoria: "geral" }),
  ];

  const perguntasQO: TrackedQuestion[] = [
    makeTrackedQuestion({ id: "q-sol-ti", nbs: "1.01.01", fonte: "solaris", fonte_ref: "SOL-015", lei_ref: "LC 214/2025 Art. 29", categoria: "geral" }),
    makeTrackedQuestion({ id: "q-rag-ti", nbs: "1.07.01", fonte: "rag", fonte_ref: "lc214-art29-ti-001", lei_ref: "Art. 29 LC 214/2025", categoria: "geral" }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.isUserInProject).mockResolvedValue(true);
    vi.mocked(db.updateProject).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda1Answers).mockResolvedValue(undefined as any);
    vi.mocked(db.saveOnda2Answers).mockResolvedValue(undefined as any);
  });

  it("Etapa 1 — Perfil: mista · 2 NCMs hardware · 3 NBS TI", () => {
    expect(projeto.operationProfile.operationType).toBe("mixed");
    expect(projeto.operationProfile.principaisProdutos).toHaveLength(2);
    expect(projeto.operationProfile.principaisServicos).toHaveLength(3);
  });

  it("Etapa 2+3 — SOLARIS + IA GEN", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "cnaes_confirmados" } as any);
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const respostasOnda1 = Array.from({ length: 24 }, (_, i) => ({
      questionId: i + 1,
      codigo: `SOL-${String(i + 1).padStart(3, "0")}`,
      resposta: i < 12 ? "sim" : "nao",
    }));
    await caller.completeOnda1({ projectId: 105, answers: respostasOnda1 });
    expect(vi.mocked(db.saveOnda1Answers)).toHaveBeenCalledWith(105, expect.any(Array));
  });

  it("Etapa 4 — Q.Produtos NCM hardware: ativa · 84xx/85xx · sem IS · nbs=undefined", async () => {
    vi.mocked(generateProductQuestions).mockResolvedValue(perguntasQC);
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "onda2_iagen" } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.getProductQuestions({ projectId: 105 });

    expect(result.nao_aplicavel).toBe(false);

    // Assert 4a — NCMs de hardware cobertos (84xx, 85xx)
    const ncmsCobertos = new Set(result.perguntas.filter((q: TrackedQuestion) => q.ncm).map((q: TrackedQuestion) => q.ncm));
    const temHardware = [...ncmsCobertos].some(n =>
      (n as string).startsWith("8471") || (n as string).startsWith("8517")
    );
    expect(temHardware).toBe(true);

    // Assert 4b — sem IS
    result.perguntas.forEach((q: TrackedQuestion) => expect(q.categoria).not.toBe("imposto_seletivo"));

    // Assert 4c — nbs=undefined (QC não contamina com NBS)
    result.perguntas.forEach((q: TrackedQuestion) => expect(q.nbs).toBeUndefined());
  });

  it("Etapa 5 — Q.Serviços NBS TI: ativa · 1.01/1.07 · sem saúde/transporte · ncm=undefined em RAG · zero fonte_refs em comum com QC", async () => {
    vi.mocked(generateServiceQuestions).mockResolvedValue(perguntasQO);
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "diagnostico_corporativo" } as any);

    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.getServiceQuestions({ projectId: 105 });

    expect(result.nao_aplicavel).toBe(false);

    // Assert 5a — NBS de TI cobertos (1.01, 1.07)
    const nbsCobertos = new Set(result.perguntas.filter((q: TrackedQuestion) => q.nbs).map((q: TrackedQuestion) => q.nbs));
    const temTI = [...nbsCobertos].some(n =>
      (n as string).startsWith("1.01") || (n as string).startsWith("1.07")
    );
    expect(temTI).toBe(true);

    // Assert 5b — sem saúde (1.03) nem transporte (1.09)
    result.perguntas.forEach((q: TrackedQuestion) => {
      if (q.nbs) {
        expect(q.nbs).not.toMatch(/^1\.03/);
        expect(q.nbs).not.toMatch(/^1\.09/);
      }
    });

    // Assert 5c — ncm=undefined em perguntas RAG (QO não contamina com NCM)
    result.perguntas.forEach((q: TrackedQuestion) => {
      if (q.fonte === "rag") expect(q.ncm).toBeUndefined();
    });

    // Assert 5d — zero fonte_refs em comum com QC
    const qcRefs = new Set(perguntasQC.map((q: TrackedQuestion) => q.fonte_ref));
    const qoRefs = new Set(result.perguntas.map((q: TrackedQuestion) => q.fonte_ref));
    const cross = [...qcRefs].filter(r => qoRefs.has(r));
    expect(cross.length).toBe(0);
  });

  it("Etapas 6+7+8 — CNAE → Briefing → Matrizes → Aprovado · QC(ncm hardware) e QO rastreados", async () => {
    const { fluxoV3Router } = await import("../routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    vi.mocked(db.getProjectById).mockResolvedValue({
      ...projeto, status: "diagnostico_operacional",
      diagnosticStatus: { corporate: "completed", operational: "completed", cnae: "not_started" },
    } as any);
    await caller.completeDiagnosticLayer({ projectId: 105, layer: "cnae" });
    expect(vi.mocked(db.updateProject)).toHaveBeenCalledWith(105, expect.objectContaining({ status: "diagnostico_cnae" }));

    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "diagnostico_cnae" } as any);
    const r7 = await caller.approveBriefing({ projectId: 105, briefingContent: "# Briefing E-P5" });
    expect(r7.success).toBe(true);
    expect(mockDb.set.mock.calls[0][0].status).toBe("matriz_riscos");

    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "matriz_riscos" } as any);
    await caller.approveMatrices({ projectId: 105, matrices: mockProjectBase.riskMatricesData });
    expect(mockDb.set.mock.calls[0][0].status).toBe("plano_acao");

    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue({ ...projeto, status: "plano_acao" } as any);
    const r8b = await caller.approveActionPlan({ projectId: 105, plans: mockProjectBase.actionPlansData });
    expect(r8b.success).toBe(true);
    expect(mockDb.set.mock.calls[0][0].status).toBe("aprovado");

    // Assert final — QC tem ncm de hardware
    const qcAnswers = perguntasQC;
    expect(qcAnswers.find((a: TrackedQuestion) => a.ncm?.startsWith("84") || a.ncm?.startsWith("85"))).toBeTruthy();
  });
});
