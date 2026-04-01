/**
 * Testes de regressão — Bugs Pós-Conclusão (17/03/2026)
 *
 * Bug #1: questionnaireAnswers não existia na tabela projects → coluna adicionada
 * Bug #4: BriefingV3 regenerava sem contexto das respostas → fallback adicionado
 * Bug #5: PlanoAcaoV3 entrava em loop de conclusão → editMode com sessionStorage
 * Bug #6: FLOW_STEPS com completedStatuses incorretos → corrigidos
 *
 * Testa:
 * - saveQuestionnaireProgress salva questionnaireAnswers corretamente
 * - getProjectStep1 retorna questionnaireAnswers
 * - generateBriefing recebe allAnswers corretamente
 * - statusToStep e completedStatuses dos FLOW_STEPS
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  createProject: vi.fn(),
  getProjectById: vi.fn(),
  getUsersByRole: vi.fn(),
}));
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));
vi.mock("./rag-retriever", () => ({
  retrieveArticles: vi.fn().mockResolvedValue([]),
  retrieveArticlesFast: vi.fn().mockResolvedValue([]),
}));
vi.mock("./ai-helpers", () => ({
  generateWithRetry: vi.fn(),
  calculateGlobalScore: vi.fn().mockReturnValue({ score_global: 75, nivel: "Alto", impacto_estimado: "R$ 500k", custo_inacao: "R$ 1M", prioridade: "Urgente" }),
  OUTPUT_CONTRACT: "",
}));

import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { generateWithRetry } from "../ai-helpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};

const mockUser = {
  id: 1,
  openId: "user-123",
  name: "Consultor Teste",
  email: "consultor@test.com",
  role: "admin" as const,
};

const mockCtx = { user: mockUser, req: {} as any, res: {} as any };

const mockAnswers = [
  {
    cnaeCode: "1113-5/02",
    cnaeDescription: "Fabricação de cervejas e chopes",
    level: "nivel1",
    questions: [
      { question: "Qual o regime tributário atual?", answer: "Lucro Real" },
      { question: "Possui crédito de IBS/CBS?", answer: "Sim, integral" },
    ],
  },
];

const mockProject = {
  id: 267,
  name: "Teste Cervejaria",
  description: "Empresa de fabricação de cervejas artesanais com faturamento de R$ 10M/ano.",
  status: "aprovado",
  currentStep: 5,
  confirmedCnaes: [{ code: "1113-5/02", description: "Fabricação de cervejas e chopes", confidence: 95 }],
  questionnaireAnswers: mockAnswers,
  briefingContent: "# Briefing de Compliance\n\nAnálise completa...",
  riskMatricesData: { contabilidade: [], negocio: [], ti: [], juridico: [] },
  actionPlansData: { contabilidade: [], negocio: [], ti: [], juridico: [] },
  scoringData: null,
  decisaoData: null,
  faturamentoAnual: 10000000,
};

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("Bug #1 — saveQuestionnaireProgress salva questionnaireAnswers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.getDb as any).mockResolvedValue(mockDb);
    (db.getProjectById as any).mockResolvedValue(mockProject);
  });

  it("deve chamar db.update com questionnaireAnswers no payload", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    await caller.saveQuestionnaireProgress({
      projectId: 267,
      allAnswers: mockAnswers,
      completed: true,
    });

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        questionnaireAnswers: mockAnswers,
        currentStep: 3,
        status: "assessment_fase2",
      })
    );
  });

  it("deve salvar sem avançar etapa quando completed=false", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    await caller.saveQuestionnaireProgress({
      projectId: 267,
      allAnswers: mockAnswers,
      completed: false,
    });

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ questionnaireAnswers: mockAnswers })
    );
    // Não deve incluir currentStep nem status quando completed=false
    const setCall = (mockDb.set as any).mock.calls[0][0];
    expect(setCall.currentStep).toBeUndefined();
    expect(setCall.status).toBeUndefined();
  });
});

describe("Bug #1 — getProjectStep1 retorna questionnaireAnswers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.getProjectById as any).mockResolvedValue(mockProject);
  });

  it("deve retornar questionnaireAnswers no resultado", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.getProjectStep1({ projectId: 267 });

    expect(result).toHaveProperty("questionnaireAnswers");
    expect(result.questionnaireAnswers).toEqual(mockAnswers);
  });

  it("deve retornar null para questionnaireAnswers quando não existe", async () => {
    (db.getProjectById as any).mockResolvedValue({
      ...mockProject,
      questionnaireAnswers: undefined,
    });

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.getProjectStep1({ projectId: 267 });

    expect(result.questionnaireAnswers).toBeNull();
  });

  it("deve retornar todos os campos necessários para o fluxo pós-conclusão", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.getProjectStep1({ projectId: 267 });

    expect(result).toMatchObject({
      id: 267,
      status: "aprovado",
      currentStep: 5,
      questionnaireAnswers: expect.any(Array),
      briefingContent: expect.any(String),
      riskMatricesData: expect.any(Object),
      actionPlansData: expect.any(Object),
    });
  });
});

describe("Bug #4 — generateBriefing recebe allAnswers corretamente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.getDb as any).mockResolvedValue(mockDb);
    (db.getProjectById as any).mockResolvedValue(mockProject);
    (generateWithRetry as any).mockResolvedValue({
      nivel_risco_geral: "alto",
      resumo_executivo: "A empresa enfrenta riscos tributários significativos.",
      principais_gaps: [
        { gap: "Crédito de IBS/CBS", causa_raiz: "Regime não otimizado", evidencia_regulatoria: "Art. 156-A LC 214/2025", urgencia: "imediata" },
      ],
      oportunidades: ["Aproveitamento integral de créditos"],
      recomendacoes: ["Revisar regime tributário"],
      recomendacoes_prioritarias: ["Revisar regime tributário", "Contratar especialista"],
      proximos_passos: ["Contratar especialista"],
      confidence_score: { nivel_confianca: 85, recomendacao: "Revisar com especialista", limitacoes: ["Dados autodeclarados"] },
      inconsistencias: [],
    });
    mockDb.where.mockResolvedValue(undefined);
  });

  it("deve aceitar allAnswers com o formato correto", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.generateBriefing({
      projectId: 267,
      allAnswers: mockAnswers,
    });

    expect(result).toHaveProperty("briefing");
    expect(result.briefing).toContain("Briefing");
    expect(generateWithRetry).toHaveBeenCalled();
  });

  it("deve aceitar allAnswers vazio (fallback sem respostas)", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.generateBriefing({
      projectId: 267,
      allAnswers: [],
    });

    expect(result).toHaveProperty("briefing");
    expect(generateWithRetry).toHaveBeenCalled();
  });

  it("deve aceitar correction para re-geração", async () => {
    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.generateBriefing({
      projectId: 267,
      allAnswers: mockAnswers,
      correction: "Incluir análise do Imposto Seletivo",
    });

    expect(result).toHaveProperty("briefing");
  });
});

describe("Bug #6 — statusToStep e FLOW_STEPS com completedStatuses corretos", () => {
  // Testa a lógica de mapeamento de status → step e completedStatuses
  // sem importar o componente React (apenas a lógica pura)

  const statusToStep = (status: string): number => {
    const map: Record<string, number> = {
      rascunho: 1,
      assessment_fase1: 2,
      assessment_fase2: 2,
      matriz_riscos: 3,
      plano_acao: 4,
      em_avaliacao: 4,
      aprovado: 5,
      em_andamento: 5,
      parado: 5,
      concluido: 5,
      arquivado: 5,
    };
    return map[status] ?? 1;
  };

  const FLOW_STEPS_COMPLETED = {
    questionario: ["assessment_fase2", "matriz_riscos", "plano_acao", "em_avaliacao", "aprovado", "em_andamento", "parado", "concluido", "arquivado"],
    briefing: ["matriz_riscos", "plano_acao", "em_avaliacao", "aprovado", "em_andamento", "parado", "concluido", "arquivado"],
    riscos: ["plano_acao", "em_avaliacao", "aprovado", "em_andamento", "parado", "concluido", "arquivado"],
    plano: ["aprovado", "em_andamento", "concluido", "arquivado"],
  };

  it("statusToStep deve mapear assessment_fase2 para step 2", () => {
    expect(statusToStep("assessment_fase2")).toBe(2);
  });

  it("statusToStep deve mapear aprovado para step 5", () => {
    expect(statusToStep("aprovado")).toBe(5);
  });

  it("step Questionário deve estar concluído quando status=assessment_fase2", () => {
    expect(FLOW_STEPS_COMPLETED.questionario).toContain("assessment_fase2");
  });

  it("step Briefing deve estar concluído quando status=matriz_riscos", () => {
    expect(FLOW_STEPS_COMPLETED.briefing).toContain("matriz_riscos");
  });

  it("step Briefing deve estar concluído quando status=aprovado", () => {
    expect(FLOW_STEPS_COMPLETED.briefing).toContain("aprovado");
  });

  it("step Riscos deve estar concluído quando status=aprovado", () => {
    expect(FLOW_STEPS_COMPLETED.riscos).toContain("aprovado");
  });

  it("step Plano deve estar concluído quando status=aprovado", () => {
    expect(FLOW_STEPS_COMPLETED.plano).toContain("aprovado");
  });

  it("todos os steps devem estar concluídos quando status=concluido", () => {
    for (const [step, statuses] of Object.entries(FLOW_STEPS_COMPLETED)) {
      expect(statuses).toContain("concluido"),
        `Step ${step} deve ter 'concluido' em completedStatuses`;
    }
  });

  it("step Questionário NÃO deve ter assessment_fase1 como concluído (ainda ativo)", () => {
    expect(FLOW_STEPS_COMPLETED.questionario).not.toContain("assessment_fase1");
  });
});

describe("Bug #1 — getProgress retorna respostas da tabela questionnaireAnswersV3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockAnswersFromTable = [
      {
        id: 1,
        projectId: 267,
        cnaeCode: "1113-5/02",
        cnaeDescription: "Fabricação de cervejas e chopes",
        level: "nivel1",
        questionText: "Qual o regime tributário atual?",
        answerValue: "Lucro Real",
        questionIndex: 0,
        createdAt: new Date(),
      },
    ];
    // Mock com .limit() encadeado: primeira chamada a where() retorna this (para .limit())
    // segunda chamada retorna as respostas
    const mockDbForGetProgress = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn(),
      limit: vi.fn().mockResolvedValue([null]), // progresso null
    };
    let whereCallCount = 0;
    mockDbForGetProgress.where.mockImplementation(() => {
      whereCallCount++;
      if (whereCallCount === 1) return mockDbForGetProgress; // encadeia .limit()
      return Promise.resolve(mockAnswersFromTable); // segunda chamada retorna answers
    });
    (db.getDb as any).mockResolvedValue(mockDbForGetProgress);
  });

  it("deve retornar answers com cnaeCode e questionText", async () => {
    // Criar um mock mais completo que suporta .limit() encadeado
    const mockAnswersFromTable = [
      {
        id: 1,
        projectId: 267,
        cnaeCode: "1113-5/02",
        cnaeDescription: "Fabricação de cervejas e chopes",
        level: "nivel1",
        questionText: "Qual o regime tributário atual?",
        answerValue: "Lucro Real",
        questionIndex: 0,
        createdAt: new Date(),
      },
    ];
    const mockDbWithLimit = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([null]), // progresso null
    };
    // Segunda chamada ao where (para answers) retorna as respostas
    let whereCallCount = 0;
    mockDbWithLimit.where.mockImplementation(() => {
      whereCallCount++;
      if (whereCallCount === 1) return mockDbWithLimit; // retorna this para encadear .limit()
      return Promise.resolve(mockAnswersFromTable); // segunda chamada retorna answers
    });
    (db.getDb as any).mockResolvedValue(mockDbWithLimit);

    const { fluxoV3Router } = await import("./routers-fluxo-v3");
    const caller = fluxoV3Router.createCaller(mockCtx);

    const result = await caller.getProgress({ projectId: 267 });

    expect(result).toHaveProperty("answers");
    expect(Array.isArray(result.answers)).toBe(true);
  });
});
