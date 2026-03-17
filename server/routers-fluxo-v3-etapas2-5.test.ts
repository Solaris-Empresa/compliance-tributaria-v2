/**
 * Testes unitários — fluxoV3Router (Etapas 2 a 5)
 * Cobre: generateQuestions, saveQuestionnaireProgress, generateBriefing,
 *        approveBriefing, generateRiskMatrices, approveMatrices,
 *        generateActionPlan, updateTask, approveActionPlan
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  createProject: vi.fn(),
  getProjectById: vi.fn(),
  getUsersByRole: vi.fn(),
  insertTaskHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./ai-helpers", () => ({
  generateWithRetry: vi.fn(),
  calculateGlobalScore: vi.fn().mockReturnValue({ score_global: 75, nivel: "Alto", impacto_estimado: "R$ 500k", custo_inacao: "R$ 1M", prioridade: "Urgente" }),
  OUTPUT_CONTRACT: "",
}));

vi.mock("./rag-retriever", () => ({
  retrieveArticles: vi.fn().mockResolvedValue([]),
  retrieveArticlesFast: vi.fn().mockResolvedValue([]),
}));

import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { generateWithRetry } from "./ai-helpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
};

const mockUser = {
  id: 1,
  openId: "user-123",
  name: "Consultor Teste",
  email: "consultor@test.com",
  role: "admin" as const,
};

const mockCtx = { user: mockUser, req: {} as any, res: {} as any };

const mockProject = {
  id: 42,
  name: "Projeto Reforma Tributária",
  description: "Empresa de serviços de TI com faturamento de R$ 5M/ano, regime Lucro Presumido.",
  confirmedCnaes: [
    { code: "6201-5/01", description: "Desenvolvimento de programas de computador sob encomenda", confidence: 95 },
    { code: "6202-3/00", description: "Desenvolvimento e licenciamento de programas de computador customizáveis", confidence: 80 },
  ],
  questionnaireAnswers: [
    {
      cnaeCode: "6201-5/01",
      cnaeDescription: "Desenvolvimento de programas de computador",
      level: "nivel1",
      questions: [
        { question: "Qual o regime tributário atual?", answer: "Lucro Presumido" },
        { question: "Emite NFS-e?", answer: "Sim" },
      ],
    },
  ],
  briefingContent: "# Briefing de Compliance\n\nEmpresa de TI com exposição ao IBS e CBS...",
  riskMatricesData: {
    contabilidade: [
      { id: "r1", evento: "Mudança de alíquota ISS para CBS", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Revisar contratos" },
    ],
    negocio: [],
    ti: [],
    juridico: [],
  },
  actionPlansData: {
    contabilidade: [
      { id: "t1", titulo: "Revisar contratos de serviço", descricao: "...", area: "contabilidade", prazo_sugerido: "30 dias", prioridade: "Alta", responsavel_sugerido: "Controller", status: "nao_iniciado", progress: 0, startDate: null, endDate: null, responsible: null, notifications: { beforeDays: 7, onStatusChange: true, onProgressUpdate: false, onComment: false } },
    ],
  },
};

// ─── ETAPA 2: Questionário Adaptativo ─────────────────────────────────────────
describe("fluxoV3Router — Etapa 2: Questionário Adaptativo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
  });

  it("generateQuestions — gera perguntas Nível 1 para um CNAE", async () => {
    const mockQuestions = {
      questions: [
        { id: "q1", text: "Qual o regime tributário atual?", type: "selecao_unica", required: true, options: ["Simples Nacional", "Lucro Presumido", "Lucro Real"] },
        { id: "q2", text: "A empresa emite NFS-e?", type: "sim_nao", required: true },
        { id: "q3", text: "Qual o faturamento anual aproximado?", type: "escala_likert", required: false, scale_labels: { min: "Até R$360k", max: "Acima de R$78M" } },
      ],
    };
    vi.mocked(generateWithRetry).mockResolvedValue(mockQuestions);

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.generateQuestions({
      projectId: 42,
      cnaeCode: "6201-5/01",
      cnaeDescription: "Desenvolvimento de programas de computador",
      level: "nivel1",
    });

    expect(result.questions).toHaveLength(3);
    expect(result.questions[0].id).toBe("q1");
    expect(result.questions[0].type).toBe("selecao_unica");
    expect(result.questions[1].type).toBe("sim_nao");
    expect(result.questions[2].type).toBe("escala_likert");
    expect(generateWithRetry).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(generateWithRetry).mock.calls[0];
    const prompt = JSON.stringify(callArgs);
    expect(prompt).toContain("6201-5/01");
  });

  it("generateQuestions — gera perguntas Nível 2 com contexto das respostas anteriores", async () => {
    const mockQuestions = {
      questions: [
        { id: "q1", text: "Detalhe como o Split Payment impactará seu fluxo de caixa", type: "texto_longo", required: true },
        { id: "q2", text: "Qual percentual do faturamento é de contratos recorrentes?", type: "escala_likert", required: true, scale_labels: { min: "0%", max: "100%" } },
      ],
    };
    vi.mocked(generateWithRetry).mockResolvedValue(mockQuestions);

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.generateQuestions({
      projectId: 42,
      cnaeCode: "6201-5/01",
      cnaeDescription: "Desenvolvimento de programas de computador",
      level: "nivel2",
      previousAnswers: [
        { question: "Qual o regime tributário?", answer: "Lucro Presumido" },
      ],
    });

    expect(result.questions).toHaveLength(2);
    expect(generateWithRetry).toHaveBeenCalledOnce();
    // Verificar que o level nivel2 foi passado (aparece no messages como "aprofundamento")
    const callArgs = vi.mocked(generateWithRetry).mock.calls[0];
    const prompt = JSON.stringify(callArgs);
    expect(prompt).toContain("aprofundamento");
  });

  it("generateQuestions — lança NOT_FOUND se projeto não existe", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue(null);
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    await expect(caller.generateQuestions({
      projectId: 999,
      cnaeCode: "6201-5/01",
      cnaeDescription: "Teste",
      level: "nivel1",
    })).rejects.toThrow(TRPCError);
  });

  it("generateQuestions — lança INTERNAL_SERVER_ERROR se IA retorna JSON inválido", async () => {
    vi.mocked(generateWithRetry).mockRejectedValue(new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha após 2 tentativas" }));
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    await expect(caller.generateQuestions({
      projectId: 42,
      cnaeCode: "6201-5/01",
      cnaeDescription: "Teste",
      level: "nivel1",
    })).rejects.toThrow(TRPCError);
  });

  it("saveQuestionnaireProgress — salva respostas parciais sem avançar etapa", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.saveQuestionnaireProgress({
      projectId: 42,
      allAnswers: mockProject.questionnaireAnswers,
      completed: false,
    });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledOnce();
    // Não deve avançar o step quando completed=false
    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.currentStep).toBeUndefined();
  });

  it("saveQuestionnaireProgress — avança para Etapa 3 quando completed=true", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.saveQuestionnaireProgress({
      projectId: 42,
      allAnswers: mockProject.questionnaireAnswers,
      completed: true,
    });

    expect(result.success).toBe(true);
    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.currentStep).toBe(3);
    expect(setCall.status).toBe("assessment_fase2");
  });
});

// ─── ETAPA 3: Briefing de Compliance ─────────────────────────────────────────
describe("fluxoV3Router — Etapa 3: Briefing de Compliance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
  });

  it("generateBriefing — gera briefing a partir das respostas do questionário", async () => {
    vi.mocked(generateWithRetry).mockResolvedValue({
      nivel_risco_geral: "alto",
      resumo_executivo: "A empresa de TI com CNAE 6201-5/01 está exposta ao IBS e CBS.",
      principais_gaps: [{ gap: "CBS", causa_raiz: "Regime", evidencia_regulatoria: "Art. 156-A", urgencia: "imediata" }],
      oportunidades: ["Créditos"],
      recomendacoes_prioritarias: ["Revisar regime"],
      proximos_passos: ["Contratar especialista"],
      confidence_score: { nivel_confianca: 85, recomendacao: "Revisar", limitacoes: [] },
      inconsistencias: [],
    });

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.generateBriefing({
      projectId: 42,
      allAnswers: mockProject.questionnaireAnswers,
    });

    expect(result.briefing).toContain("Briefing de Compliance");
    expect(mockDb.update).toHaveBeenCalledOnce();
    expect(generateWithRetry).toHaveBeenCalledOnce();
  });

  it("generateBriefing — incorpora correção do usuário na regeneração", async () => {
    vi.mocked(generateWithRetry).mockResolvedValue({
      nivel_risco_geral: "alto",
      resumo_executivo: "Correção aplicada: regime Lucro Real.",
      principais_gaps: [],
      oportunidades: [],
      recomendacoes_prioritarias: [],
      proximos_passos: [],
      confidence_score: { nivel_confianca: 90, recomendacao: "OK", limitacoes: [] },
      inconsistencias: [],
    });

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.generateBriefing({
      projectId: 42,
      allAnswers: mockProject.questionnaireAnswers,
      correction: "O regime tributário está errado, somos Lucro Real",
    });

    expect(result.briefing).toContain("Briefing de Compliance");
    expect(generateWithRetry).toHaveBeenCalledOnce();
    // Verificar que a correção foi passada para o generateWithRetry
    const callArgs = vi.mocked(generateWithRetry).mock.calls[0];
    const prompt = JSON.stringify(callArgs);
    expect(prompt).toContain("Lucro Real");
  });

  it("generateBriefing — incorpora informações adicionais do usuário", async () => {
    vi.mocked(generateWithRetry).mockResolvedValue({
      nivel_risco_geral: "medio",
      resumo_executivo: "Mercado internacional considerado na análise.",
      principais_gaps: [],
      oportunidades: ["Mercado internacional"],
      recomendacoes_prioritarias: [],
      proximos_passos: [],
      confidence_score: { nivel_confianca: 80, recomendacao: "OK", limitacoes: [] },
      inconsistencias: [],
    });

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.generateBriefing({
      projectId: 42,
      allAnswers: mockProject.questionnaireAnswers,
      complement: "Também atuamos no mercado internacional com contratos em dólar",
    });

    expect(result.briefing).toBeTruthy();
    expect(generateWithRetry).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(generateWithRetry).mock.calls[0];
    const prompt = JSON.stringify(callArgs);
    expect(prompt).toContain("internacional");
  });

  it("approveBriefing — aprova e avança para Etapa 4", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.approveBriefing({
      projectId: 42,
      briefingContent: mockProject.briefingContent,
    });

    expect(result.success).toBe(true);
    expect(result.nextStep).toBe(4);
    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.currentStep).toBe(4);
    expect(setCall.status).toBe("matriz_riscos");
  });
});

// ─── ETAPA 4: Matrizes de Riscos ─────────────────────────────────────────────
describe("fluxoV3Router — Etapa 4: Matrizes de Riscos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
  });

  it("generateRiskMatrices — gera matrizes para todas as 4 áreas", async () => {
    const mockRisks = {
      risks: [
        { id: "r1", evento: "Mudança de alíquota CBS", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Revisar precificação" },
        { id: "r2", evento: "Prazo de adaptação do ERP", probabilidade: "Média", impacto: "Médio", severidade: "Média", plano_acao: "Contratar consultoria" },
      ],
    };
    vi.mocked(generateWithRetry).mockResolvedValue(mockRisks);

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.generateRiskMatrices({
      projectId: 42,
      briefingContent: mockProject.briefingContent,
    });

    // Deve gerar para as 4 áreas
    expect(Object.keys(result.matrices)).toHaveLength(4);
    expect(result.matrices.contabilidade).toHaveLength(2);
    expect(result.matrices.negocio).toHaveLength(2);
    expect(result.matrices.ti).toHaveLength(2);
    expect(result.matrices.juridico).toHaveLength(2);
    // generateWithRetry chamado 4 vezes (uma por área)
    expect(generateWithRetry).toHaveBeenCalledTimes(4);
  });

  it("generateRiskMatrices — regenera apenas uma área específica com ajuste", async () => {
    const mockRisks = {
      risks: [
        { id: "r1", evento: "Split Payment impacta fluxo de caixa", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Negociar antecipação" },
      ],
    };
    vi.mocked(generateWithRetry).mockResolvedValue(mockRisks);

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.generateRiskMatrices({
      projectId: 42,
      briefingContent: mockProject.briefingContent,
      area: "contabilidade",
      adjustment: "Adicione riscos relacionados ao Split Payment",
    });

    expect(Object.keys(result.matrices)).toHaveLength(1);
    expect(result.matrices.contabilidade).toHaveLength(1);
    // generateWithRetry chamado apenas 1 vez
    expect(generateWithRetry).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(generateWithRetry).mock.calls[0];
    const prompt = JSON.stringify(callArgs);
    expect(prompt).toContain("Split Payment");
  });

  it("generateRiskMatrices — lança NOT_FOUND se projeto não existe", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue(null);
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    await expect(caller.generateRiskMatrices({
      projectId: 999,
      briefingContent: "...",
    })).rejects.toThrow(TRPCError);
  });

  it("approveMatrices — aprova e avança para Etapa 5", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.approveMatrices({
      projectId: 42,
      matrices: mockProject.riskMatricesData,
    });

    expect(result.success).toBe(true);
    expect(result.nextStep).toBe(5);
    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.currentStep).toBe(5);
    expect(setCall.status).toBe("plano_acao");
  });
});

// ─── ETAPA 5: Plano de Ação ───────────────────────────────────────────────────
describe("fluxoV3Router — Etapa 5: Plano de Ação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
  });

  it("generateActionPlan — gera plano para todas as 4 áreas", async () => {
    const mockTasks = {
      tasks: [
        { id: "t1", titulo: "Revisar contratos de serviço", descricao: "Adaptar cláusulas para CBS/IBS", area: "contabilidade", prazo_sugerido: "30 dias", prioridade: "Alta", responsavel_sugerido: "Controller" },
        { id: "t2", titulo: "Atualizar sistema de faturamento", descricao: "Adaptar NFS-e para novo padrão", area: "contabilidade", prazo_sugerido: "60 dias", prioridade: "Alta", responsavel_sugerido: "TI" },
      ],
    };
    vi.mocked(generateWithRetry).mockResolvedValue(mockTasks);

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.generateActionPlan({
      projectId: 42,
      matrices: mockProject.riskMatricesData,
    });

    expect(Object.keys(result.plans)).toHaveLength(4);
    // Cada área deve ter tarefas com campos de gestão inicializados
    const task = result.plans.contabilidade[0];
    expect(task.status).toBe("nao_iniciado");
    expect(task.progress).toBe(0);
    expect(task.notifications).toBeDefined();
    expect(task.notifications.beforeDays).toBe(7);
    expect(generateWithRetry).toHaveBeenCalledTimes(4);
  });

  it("generateActionPlan — regenera apenas uma área com ajuste", async () => {
    const mockTasks = {
      tasks: [
        { id: "t1", titulo: "Treinamento da equipe contábil", descricao: "Capacitar equipe na Reforma Tributária", area: "contabilidade", prazo_sugerido: "30 dias", prioridade: "Alta", responsavel_sugerido: "RH" },
      ],
    };
    vi.mocked(generateWithRetry).mockResolvedValue(mockTasks);

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.generateActionPlan({
      projectId: 42,
      matrices: mockProject.riskMatricesData,
      area: "contabilidade",
      adjustment: "Adicione uma tarefa de treinamento da equipe",
    });

    expect(Object.keys(result.plans)).toHaveLength(1);
    expect(generateWithRetry).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(generateWithRetry).mock.calls[0];
    const prompt = JSON.stringify(callArgs);
    expect(prompt).toContain("treinamento");
  });

  it("updateTask — atualiza status e progresso de uma tarefa", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.updateTask({
      projectId: 42,
      area: "contabilidade",
      taskId: "t1",
      updates: {
        status: "em_andamento",
        progress: 50,
        responsible: "Maria Silva",
      },
    });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledOnce();
  });

  it("updateTask — atualiza configurações de notificação de uma tarefa", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.updateTask({
      projectId: 42,
      area: "contabilidade",
      taskId: "t1",
      updates: {
        notifications: {
          beforeDays: 14,
          onStatusChange: true,
          onProgressUpdate: true,
          onComment: false,
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("updateTask — atualiza datas de início e fim de uma tarefa", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.updateTask({
      projectId: 42,
      area: "ti",
      taskId: "t1",
      updates: {
        startDate: "2026-04-01",
        endDate: "2026-06-30",
      },
    });

    expect(result.success).toBe(true);
  });

  it("approveActionPlan — aprova plano e marca projeto como aprovado", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);
    const result = await caller.approveActionPlan({
      projectId: 42,
      plans: mockProject.actionPlansData,
    });

    expect(result.success).toBe(true);
    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.currentStep).toBe(5);
    expect(setCall.status).toBe("aprovado");
  });
});

// ─── Testes de Integração do Fluxo Completo ───────────────────────────────────
describe("fluxoV3Router — Fluxo Completo E2E (mock)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
    vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
  });

  it("fluxo completo: Etapa 2 → 3 → 4 → 5 executa sem erros", async () => {
    // Mock generateWithRetry para todas as chamadas
    vi.mocked(generateWithRetry)
      .mockResolvedValueOnce({ questions: [{ id: "q1", text: "Pergunta 1", type: "sim_nao", required: true }] })
      .mockResolvedValueOnce({
        nivel_risco_geral: "alto",
        resumo_executivo: "Briefing de Compliance gerado.",
        principais_gaps: [],
        oportunidades: [],
        recomendacoes_prioritarias: [],
        proximos_passos: [],
        confidence_score: { nivel_confianca: 85, recomendacao: "OK", limitacoes: [] },
        inconsistencias: [],
      })
      .mockResolvedValue({ risks: [{ id: "r1", evento: "Risco 1", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Ação 1" }] });

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    // Etapa 2: Gerar perguntas
    const questions = await caller.generateQuestions({
      projectId: 42, cnaeCode: "6201-5/01", cnaeDescription: "TI", level: "nivel1",
    });
    expect(questions.questions).toHaveLength(1);

    // Etapa 2: Salvar respostas e completar
    const saved = await caller.saveQuestionnaireProgress({
      projectId: 42,
      allAnswers: [{ cnaeCode: "6201-5/01", cnaeDescription: "TI", level: "nivel1", questions: [{ question: "Pergunta 1", answer: "Sim" }] }],
      completed: true,
    });
    expect(saved.success).toBe(true);

    // Etapa 3: Gerar briefing
    const briefing = await caller.generateBriefing({
      projectId: 42,
      allAnswers: mockProject.questionnaireAnswers,
    });
    expect(briefing.briefing).toContain("Briefing");

    // Etapa 3: Aprovar briefing
    const approvedBriefing = await caller.approveBriefing({
      projectId: 42, briefingContent: briefing.briefing,
    });
    expect(approvedBriefing.nextStep).toBe(4);

    // Etapa 4: Gerar matrizes (apenas contabilidade para simplificar)
    const matrices = await caller.generateRiskMatrices({
      projectId: 42, briefingContent: briefing.briefing, area: "contabilidade",
    });
    expect(matrices.matrices.contabilidade).toBeDefined();

    // Etapa 4: Aprovar matrizes
    const approvedMatrices = await caller.approveMatrices({
      projectId: 42, matrices: { contabilidade: matrices.matrices.contabilidade, negocio: [], ti: [], juridico: [] },
    });
    expect(approvedMatrices.nextStep).toBe(5);

    // Etapa 5: Aprovar plano
    const approvedPlan = await caller.approveActionPlan({
      projectId: 42, plans: mockProject.actionPlansData,
    });
    expect(approvedPlan.success).toBe(true);
  });
});
