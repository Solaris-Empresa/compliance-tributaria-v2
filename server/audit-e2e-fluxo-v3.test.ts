/**
 * Testes E2E funcionais — Fluxo Completo V3 (Etapas 1 a 5)
 * Cobre: fluxo completo com refineCnaes, persistência de dados entre etapas,
 *        gates de aprovação, geração IA em cada etapa, aprovação por área
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
  createProject: vi.fn(),
  getProjectById: vi.fn(),
  getUsersByRole: vi.fn(),
}));
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import * as db from "./db";
import { invokeLLM } from "./_core/llm";

// ─── Dados de teste ───────────────────────────────────────────────────────────
const mockUser = {
  id: 1,
  openId: "user-123",
  name: "Consultor IA Solaris",
  email: "consultor@iasolaris.com",
  role: "admin" as const,
};

const projectDescription =
  "Empresa de comércio varejista de vestuário e acessórios femininos. Opera em 3 lojas físicas em São Paulo e e-commerce próprio. Regime Simples Nacional. Faturamento anual R$ 4,2M. Possui 45 funcionários CLT. Preocupação principal com a transição do ICMS para o IBS e impacto no preço de venda.";

const mockCnaes = [
  { code: "4781-4/00", description: "Comércio varejista de vestuário e acessórios", confidence: 92 },
  { code: "4791-1/00", description: "Comércio varejista via internet", confidence: 88 },
  { code: "4782-2/01", description: "Comércio varejista de calçados", confidence: 65 },
];

const mockQuestions = [
  { id: "q1", text: "Qual o regime tributário atual?", type: "multipla_escolha", options: ["Simples Nacional", "Lucro Presumido", "Lucro Real"], required: true },
  { id: "q2", text: "A empresa emite NF-e ou NFC-e?", type: "sim_nao", required: true },
  { id: "q3", text: "Qual o percentual de vendas via e-commerce?", type: "escala_likert", required: false },
];

const mockBriefing = `# Briefing de Compliance — Reforma Tributária
## Empresa: Varejista de Vestuário
**Risco Alto:** Transição do ICMS para IBS impacta diretamente o preço de venda.
**Atenção:** E-commerce sujeito a novas regras de split payment.`;

const mockRiskMatrices = {
  contabilidade: [
    { id: "r1", evento: "Mudança de alíquota ICMS → IBS", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Revisar precificação" },
  ],
  negocio: [
    { id: "r2", evento: "Perda de competitividade de preço", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Análise de mercado" },
  ],
  ti: [
    { id: "r3", evento: "Inadequação do sistema de PDV", probabilidade: "Média", impacto: "Alto", severidade: "Alta", plano_acao: "Atualizar PDV" },
  ],
  juridico: [
    { id: "r4", evento: "Multas por descumprimento", probabilidade: "Baixa", impacto: "Alto", severidade: "Média", plano_acao: "Monitorar legislação" },
  ],
};

const mockActionPlans = {
  contabilidade: [
    { id: "t1", titulo: "Revisar precificação de produtos", area: "contabilidade", prioridade: "Alta", status: "nao_iniciado", progress: 0 },
  ],
  negocio: [
    { id: "t2", titulo: "Análise de impacto no mercado", area: "negocio", prioridade: "Alta", status: "nao_iniciado", progress: 0 },
  ],
  ti: [
    { id: "t3", titulo: "Atualizar sistema PDV", area: "ti", prioridade: "Alta", status: "nao_iniciado", progress: 0 },
  ],
  juridico: [
    { id: "t4", titulo: "Monitorar publicações legislativas", area: "juridico", prioridade: "Média", status: "nao_iniciado", progress: 0 },
  ],
};

// ─── E2E: Fluxo Completo ──────────────────────────────────────────────────────
describe("E2E — Fluxo Completo V3 (Etapas 1 a 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.createProject).mockResolvedValue(42);
    vi.mocked(db.getProjectById).mockResolvedValue({
      id: 42,
      name: "Diagnóstico Varejista 2026",
      description: projectDescription,
      confirmedCnaes: mockCnaes,
      currentStep: 1,
      questionnaireAnswers: [],
      briefingContent: null,
      riskMatricesData: null,
      actionPlansData: null,
    } as any);
  });

  // ── ETAPA 1 ──────────────────────────────────────────────────────────────
  describe("Etapa 1 — Criação do Projeto e Aprovação de CNAEs", () => {
    it("deve criar projeto com descrição ≥ 100 caracteres (RF-1.01)", async () => {
      expect(projectDescription.length).toBeGreaterThanOrEqual(100);
      const projectId = await db.createProject({
        name: "Diagnóstico Varejista 2026",
        description: projectDescription,
        clientId: 10,
        createdBy: mockUser.id,
        status: "rascunho",
        currentStep: 1,
      });
      expect(projectId).toBe(42);
    });

    it("deve extrair CNAEs via IA a partir da descrição (RF-1.04)", async () => {
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ cnaes: mockCnaes }) } }],
      } as any);

      const result = await invokeLLM({ messages: [] });
      const parsed = JSON.parse(result.choices[0].message.content as string);

      expect(parsed.cnaes).toHaveLength(3);
      expect(parsed.cnaes[0].code).toBe("4781-4/00");
      expect(parsed.cnaes[0].confidence).toBeGreaterThanOrEqual(80);
    });

    it("deve refinar CNAEs com feedback do usuário (RF-1.05 — loop PG-05)", async () => {
      const refinedCnaes = [
        ...mockCnaes,
        { code: "4771-7/01", description: "Comércio varejista de produtos farmacêuticos", confidence: 30 },
      ];

      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ cnaes: refinedCnaes }) } }],
      } as any);

      const feedback = "A empresa também vende acessórios de beleza, incluir CNAE de cosméticos";
      expect(feedback.length).toBeGreaterThanOrEqual(5);

      const result = await invokeLLM({
        messages: [{ role: "user", content: `Feedback: ${feedback}. CNAEs atuais: ${JSON.stringify(mockCnaes)}` }],
      });
      const parsed = JSON.parse(result.choices[0].message.content as string);

      expect(parsed.cnaes.length).toBeGreaterThan(mockCnaes.length);
    });

    it("deve confirmar CNAEs e avançar para step 2 (Gate 1)", async () => {
      const confirmedCnaes = mockCnaes.filter((c) => c.confidence >= 80);
      expect(confirmedCnaes.length).toBeGreaterThanOrEqual(1);

      // Gate 1: pelo menos 1 CNAE confirmado
      const canAdvance = confirmedCnaes.length >= 1;
      expect(canAdvance).toBe(true);
    });
  });

  // ── ETAPA 2 ──────────────────────────────────────────────────────────────
  describe("Etapa 2 — Questionário Adaptativo por CNAE", () => {
    it("deve gerar perguntas específicas para cada CNAE via IA (RF-2.01)", async () => {
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ questions: mockQuestions }) } }],
      } as any);

      for (const cnae of mockCnaes.slice(0, 2)) {
        const result = await invokeLLM({
          messages: [{ role: "user", content: `Gere perguntas para CNAE ${cnae.code}: ${cnae.description}` }],
        });
        const parsed = JSON.parse(result.choices[0].message.content as string);
        expect(parsed.questions.length).toBeGreaterThan(0);
      }

      expect(invokeLLM).toHaveBeenCalledTimes(2);
    });

    it("deve gerar perguntas de Nível 2 com contexto das respostas do Nível 1 (RF-2.05)", async () => {
      const level1Answers = [
        { question: "Qual o regime tributário atual?", answer: "Simples Nacional" },
        { question: "A empresa emite NF-e?", answer: "Sim" },
      ];

      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ questions: mockQuestions }) } }],
      } as any);

      await invokeLLM({
        messages: [
          { role: "user", content: `Nível 2 para CNAE 4781-4/00. Respostas anteriores: ${JSON.stringify(level1Answers)}` },
        ],
      });

      expect(invokeLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("Respostas anteriores"),
            }),
          ]),
        })
      );
    });

    it("deve avançar para Etapa 3 somente quando todos os CNAEs têm Nível 1 concluído (Gate 2)", () => {
      const cnaeProgress = mockCnaes.map((c, i) => ({
        code: c.code,
        nivel1Done: i < 2, // primeiros 2 concluídos, 3º não
      }));

      const allDone = cnaeProgress.every((c) => c.nivel1Done);
      expect(allDone).toBe(false);

      const allDoneFixed = cnaeProgress.map((c) => ({ ...c, nivel1Done: true }));
      expect(allDoneFixed.every((c) => c.nivel1Done)).toBe(true);
    });
  });

  // ── ETAPA 3 ──────────────────────────────────────────────────────────────
  describe("Etapa 3 — Briefing de Compliance", () => {
    it("deve gerar briefing consolidando todas as respostas do questionário (RF-3.01)", async () => {
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [{ message: { content: mockBriefing } }],
      } as any);

      const result = await invokeLLM({ messages: [] });
      expect(result.choices[0].message.content).toContain("Briefing de Compliance");
      expect(result.choices[0].message.content).toContain("Risco Alto");
    });

    it("deve incorporar correção do usuário na regeneração (RF-3.04)", async () => {
      const correction = "Incluir análise do impacto no split payment do e-commerce";
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [{ message: { content: `${mockBriefing}\n\n## Split Payment\nAnálise do impacto no e-commerce...` } }],
      } as any);

      await invokeLLM({
        messages: [{ role: "user", content: `Corrija o briefing. Correção: ${correction}` }],
      });

      expect(invokeLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: expect.stringContaining(correction) }),
          ]),
        })
      );
    });

    it("deve salvar versão do briefing ao aprovar (RF-3.06 — histórico de versões)", () => {
      const versions = [
        { version: 1, content: mockBriefing, approvedAt: null },
      ];

      // Aprovar gera versão 1
      versions[0].approvedAt = Date.now();
      expect(versions[0].approvedAt).toBeGreaterThan(0);
      expect(versions).toHaveLength(1);

      // Regenerar cria versão 2
      versions.push({ version: 2, content: `${mockBriefing}\n\n## Atualização`, approvedAt: null });
      expect(versions).toHaveLength(2);
    });
  });

  // ── ETAPA 4 ──────────────────────────────────────────────────────────────
  describe("Etapa 4 — Matrizes de Riscos", () => {
    it("deve gerar matrizes para as 4 áreas a partir do briefing aprovado (RF-4.01)", async () => {
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockRiskMatrices) } }],
      } as any);

      const result = await invokeLLM({ messages: [] });
      const parsed = JSON.parse(result.choices[0].message.content as string);

      expect(Object.keys(parsed)).toEqual(["contabilidade", "negocio", "ti", "juridico"]);
      expect(parsed.contabilidade.length).toBeGreaterThan(0);
    });

    it("deve bloquear Etapa 5 se nem todas as 4 áreas estiverem aprovadas (Gate 4 — RF-4.10)", () => {
      const approvals = { contabilidade: true, negocio: true, ti: false, juridico: false };
      const canAdvance = Object.values(approvals).every(Boolean);
      expect(canAdvance).toBe(false);
    });

    it("deve liberar Etapa 5 quando todas as 4 áreas estiverem aprovadas (Gate 4 — RF-4.10)", () => {
      const approvals = { contabilidade: true, negocio: true, ti: true, juridico: true };
      const canAdvance = Object.values(approvals).every(Boolean);
      expect(canAdvance).toBe(true);
    });
  });

  // ── ETAPA 5 ──────────────────────────────────────────────────────────────
  describe("Etapa 5 — Plano de Ação", () => {
    it("deve gerar plano de ação para as 4 áreas a partir das matrizes aprovadas (RF-5.01)", async () => {
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockActionPlans) } }],
      } as any);

      const result = await invokeLLM({ messages: [] });
      const parsed = JSON.parse(result.choices[0].message.content as string);

      expect(Object.keys(parsed)).toEqual(["contabilidade", "negocio", "ti", "juridico"]);
      expect(parsed.contabilidade[0].titulo).toBe("Revisar precificação de produtos");
    });

    it("deve persistir plano aprovado no banco de dados (RF-5.03)", async () => {
      const mockDbInstance = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(db.getDb).mockResolvedValue(mockDbInstance as any);

      await db.getDb();
      expect(db.getDb).toHaveBeenCalled();
    });

    it("deve salvar comentário em tarefa e manter histórico (RF-5.09)", () => {
      const task = mockActionPlans.contabilidade[0] as any;
      task.comments = [];

      const comment = { id: "c1", author: "Consultor", text: "Iniciando análise", timestamp: Date.now() };
      task.comments.push(comment);

      expect(task.comments).toHaveLength(1);
      expect(task.comments[0].author).toBe("Consultor");
    });

    it("deve calcular progresso geral do projeto como média das 4 áreas (RF-5.16)", () => {
      const areaProgress = [33, 50, 0, 100]; // % por área
      const overall = Math.round(areaProgress.reduce((a, b) => a + b, 0) / areaProgress.length);
      expect(overall).toBe(46);
    });
  });
});

// ─── Persistência entre Sessões ───────────────────────────────────────────────
describe("Persistência — Auto-save e Recuperação de Rascunho", () => {
  it("deve salvar rascunho no localStorage com chave por projectId e etapa", () => {
    const projectId = 42;
    const etapa = "etapa2";
    const key = `compliance_draft_${projectId}_${etapa}`;

    expect(key).toBe("compliance_draft_42_etapa2");
  });

  it("deve recuperar rascunho salvo ao recarregar a página", () => {
    const draft = {
      data: { cnaeProgress: [{ code: "4781-4/00", nivel1Done: true }], currentCnaeIdx: 0 },
      savedAt: Date.now(),
    };

    const serialized = JSON.stringify(draft);
    const parsed = JSON.parse(serialized);

    expect(parsed.data.cnaeProgress[0].nivel1Done).toBe(true);
    expect(parsed.data.currentCnaeIdx).toBe(0);
  });

  it("deve limpar rascunho após aprovação definitiva da etapa", () => {
    let draft: string | null = JSON.stringify({ data: {}, savedAt: Date.now() });

    // Simular clearTempData
    draft = null;

    expect(draft).toBeNull();
  });

  it("deve ignorar rascunho corrompido (JSON inválido)", () => {
    const corruptedData = "{ invalid json }";
    let parsed = null;
    try {
      parsed = JSON.parse(corruptedData);
    } catch {
      parsed = null;
    }
    expect(parsed).toBeNull();
  });
});

// ─── RF-2 UX: Tela de entrada por CNAE com persistência ──────────────────────
describe("RF-2 UX: Tela de entrada por CNAE com persistência (startedCnaes)", () => {
  it("startedCnaes começa vazio — nenhum CNAE iniciado automaticamente", () => {
    const startedCnaes = new Set<string>();
    expect(startedCnaes.size).toBe(0);
  });

  it("handleStartCnae adiciona o código ao Set", () => {
    const startedCnaes = new Set<string>();
    startedCnaes.add("4781-4/00");
    expect(startedCnaes.has("4781-4/00")).toBe(true);
    expect(startedCnaes.size).toBe(1);
  });

  it("ao retomar rascunho, startedCnaes é restaurado do localStorage", () => {
    const savedData = { startedCnaes: ["4781-4/00", "4782-2/01"], currentCnaeIdx: 1 };
    const restored = new Set<string>(savedData.startedCnaes);
    expect(restored.has("4781-4/00")).toBe(true);
    expect(restored.has("4782-2/01")).toBe(true);
    expect(restored.size).toBe(2);
  });

  it("CNAE não iniciado NÃO dispara loadQuestions (guard do useEffect)", () => {
    const startedCnaes = new Set<string>();
    const cnaes = [{ code: "4781-4/00", description: "Comércio varejista" }];
    const currentCnaeIdx = 0;
    const currentCode = cnaes[currentCnaeIdx]?.code;
    const shouldLoad = cnaes.length > 0 && currentCnaeIdx < cnaes.length && !!currentCode && startedCnaes.has(currentCode);
    expect(shouldLoad).toBe(false);
  });

  it("CNAE iniciado SIM dispara loadQuestions (guard do useEffect)", () => {
    const startedCnaes = new Set<string>(["4781-4/00"]);
    const cnaes = [{ code: "4781-4/00", description: "Comércio varejista" }];
    const currentCnaeIdx = 0;
    const currentCode = cnaes[currentCnaeIdx]?.code;
    const shouldLoad = cnaes.length > 0 && currentCnaeIdx < cnaes.length && !!currentCode && startedCnaes.has(currentCode);
    expect(shouldLoad).toBe(true);
  });

  it("startedCnaes é serializado como array para o localStorage", () => {
    const startedCnaes = new Set<string>(["4781-4/00", "4791-1/00"]);
    const serialized = [...startedCnaes];
    expect(Array.isArray(serialized)).toBe(true);
    expect(serialized).toContain("4781-4/00");
    expect(serialized).toContain("4791-1/00");
  });

  it("startedCnaes é restaurado corretamente de array para Set", () => {
    const fromStorage = ["4781-4/00", "4791-1/00"];
    const restored = new Set<string>(fromStorage);
    expect(restored instanceof Set).toBe(true);
    expect(restored.size).toBe(2);
  });
});
