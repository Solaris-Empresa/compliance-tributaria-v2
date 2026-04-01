/**
 * Sprint V59 — Testes do Fluxo V3 com Mocks de IA
 *
 * Cobre as 7 procedures que chamam invokeLLM:
 *   A. extractCnaes
 *   B. refineCnaes
 *   C. generateQuestions
 *   D. generateBriefing
 *   E. generateRiskMatrices
 *   F. generateActionPlan
 *
 * Procedures sem IA:
 *   G. saveAnswer / getProgress
 *   H. approveBriefing / approveMatrices / approveActionPlan
 *
 * Cenários de falha cobertos:
 *   - IA retorna conteúdo vazio/null
 *   - IA retorna JSON malformado
 *   - IA retorna JSON sem o campo esperado
 *   - Projeto não encontrado (NOT_FOUND)
 *   - IA lança exceção de rede / timeout / rate limit
 */

// IMPORTANTE: vi.mock deve vir antes de qualquer import que use o módulo mockado
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./_core/trpc", async () => {
  const actual = await vi.importActual<typeof import("./_core/trpc")>("./_core/trpc");
  return actual;
});

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { projects, users, questionnaireAnswersV3 } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { fluxoV3Router } from "../routers-fluxo-v3";
import { TRPCError } from "@trpc/server";

const mockInvokeLLM = vi.mocked(invokeLLM);

// ─── Helpers de resposta mock ──────────────────────────────────────────────────
function mockOk(content: string) {
  return {
    choices: [{ message: { content, role: "assistant" } }],
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
  };
}

function mockEmpty() {
  return { choices: [{ message: { content: null, role: "assistant" } }] };
}

function mockNoChoices() {
  return { choices: [] };
}

// ─── Contexto de usuário autenticado para createCaller ────────────────────────
function makeCtx(userId: number, role = "equipe_solaris") {
  return { user: { id: userId, role, name: "Teste V59", email: "v59@test.com" } } as any;
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
let testUserId: number;
let testClientId: number;
let testProjectId: number;

beforeEach(async () => {
  vi.clearAllMocks();

  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  // Criar usuário equipe_solaris (criador do projeto)
  const openId = `v59-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    name: "Teste V59",
    email: `v59-${openId}@test.com`,
    role: "equipe_solaris",
  });
  const [user] = await db.select().from(users).where(eq(users.openId, openId));
  testUserId = user.id;

  // Criar usuário cliente (necessário para clientId NOT NULL)
  const clientOpenId = `v59-client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId: clientOpenId,
    name: "Cliente Teste V59",
    email: `v59-client-${clientOpenId}@test.com`,
    role: "cliente",
  });
  const [clientUser] = await db.select().from(users).where(eq(users.openId, clientOpenId));
  testClientId = clientUser.id;

  // Criar projeto de teste
  const [res] = await db.insert(projects).values({
    name: "Projeto Teste V59",
    description: "Empresa de fabricação de vinhos e comércio varejista de bebidas alcoólicas com distribuição nacional.",
    status: "rascunho",
    currentStep: 1,
    clientId: testClientId,
    createdById: testUserId,
    createdByRole: "equipe_solaris",
    notificationFrequency: "semanal",
  } as any);
  testProjectId = (res as any).insertId as number;
});

afterEach(async () => {
  const db = await getDb();
  if (!db) return;
  await db.delete(questionnaireAnswersV3).where(eq(questionnaireAnswersV3.projectId, testProjectId));
  await db.delete(projects).where(eq(projects.id, testProjectId));
  await db.delete(users).where(eq(users.id, testUserId));
  await db.delete(users).where(eq(users.id, testClientId));
});

// =============================================================================
// A. extractCnaes
// =============================================================================
describe("A. extractCnaes", () => {
  const desc = "Empresa de fabricação de vinhos e comércio varejista de bebidas alcoólicas com distribuição nacional.";

  it("A01 — sucesso: retorna CNAEs válidos quando IA responde corretamente", async () => {
    const payload = {
      cnaes: [
        { code: "1112-7/00", description: "Fabricação de vinho", confidence: 98, justification: "Atividade principal" },
        { code: "4723-7/00", description: "Comércio varejista de bebidas", confidence: 92, justification: "Atividade secundária" },
      ],
    };
    mockInvokeLLM.mockResolvedValueOnce(mockOk(JSON.stringify(payload)) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.extractCnaes({ projectId: testProjectId, description: desc });

    expect(result.cnaes).toHaveLength(2);
    expect(result.cnaes[0].code).toBe("1112-7/00");
    expect(result.cnaes[0].confidence).toBe(98);
    expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
  });

  it("A02 — sucesso: IA retorna JSON com markdown code block, ainda parseia corretamente", async () => {
    const payload = { cnaes: [{ code: "1112-7/00", description: "Fabricação de vinho", confidence: 95 }] };
    const wrapped = "```json\n" + JSON.stringify(payload) + "\n```";
    mockInvokeLLM.mockResolvedValueOnce(mockOk(wrapped) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.extractCnaes({ projectId: testProjectId, description: desc });

    expect(result.cnaes).toHaveLength(1);
    expect(result.cnaes[0].code).toBe("1112-7/00");
  });

  it("A03 — sucesso: IA retorna JSON com array vazio → retorna array vazio sem lançar erro", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockOk('{"cnaes": []}') as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.extractCnaes({ projectId: testProjectId, description: desc });

    expect(result.cnaes).toEqual([]);
  });

  it("A04 — falha: IA retorna conteúdo null → lança INTERNAL_SERVER_ERROR", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockEmpty() as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.extractCnaes({ projectId: testProjectId, description: desc }))
      .rejects.toThrow(TRPCError);
  });

  it("A05 — falha: IA retorna texto sem JSON → lança INTERNAL_SERVER_ERROR", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockOk("Desculpe, não consigo processar esta solicitação.") as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.extractCnaes({ projectId: testProjectId, description: desc }))
      .rejects.toThrow(TRPCError);
  });

  it("A06 — falha: projeto não encontrado → lança NOT_FOUND sem chamar IA", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.extractCnaes({ projectId: 999999999, description: desc }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockInvokeLLM).not.toHaveBeenCalled();
  });

  it("A07 — falha: IA lança exceção de rede → propaga sem swallow", async () => {
    mockInvokeLLM.mockRejectedValueOnce(new Error("Network timeout after 30s"));

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.extractCnaes({ projectId: testProjectId, description: desc }))
      .rejects.toThrow("Network timeout after 30s");
  });

  it("A08 — verifica que o prompt inclui a descrição do negócio", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockOk('{"cnaes": [{"code": "1112-7/00", "description": "Fabricação de vinho", "confidence": 95}]}') as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await caller.extractCnaes({ projectId: testProjectId, description: desc });

    const callArgs = mockInvokeLLM.mock.calls[0][0];
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[1].role).toBe("user");
    expect(callArgs.messages[1].content).toContain("fabricação de vinhos");
  });
});

// =============================================================================
// B. refineCnaes
// =============================================================================
describe("B. refineCnaes", () => {
  const desc = "Empresa de fabricação de vinhos e comércio varejista de bebidas alcoólicas com distribuição nacional.";
  const currentCnaes = [{ code: "1112-7/00", description: "Fabricação de vinho", confidence: 90 }];

  it("B01 — sucesso: retorna CNAEs refinados com feedback do usuário", async () => {
    const refined = {
      cnaes: [
        { code: "1112-7/00", description: "Fabricação de vinho", confidence: 98, justification: "Confirmado" },
        { code: "4635-4/99", description: "Comércio atacadista de bebidas", confidence: 85, justification: "Adicionado conforme feedback" },
      ],
    };
    mockInvokeLLM.mockResolvedValueOnce(mockOk(JSON.stringify(refined)) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.refineCnaes({
      projectId: testProjectId,
      description: desc,
      feedback: "Adicionar CNAE de comércio atacadista",
      currentCnaes,
      iteration: 2,
    });

    expect(result.cnaes).toHaveLength(2);
    expect(result.cnaes[1].code).toBe("4635-4/99");
    expect(result.iteration).toBe(3);
  });

  it("B02 — falha: IA retorna null → lança INTERNAL_SERVER_ERROR", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockEmpty() as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.refineCnaes({
      projectId: testProjectId,
      description: desc,
      feedback: "Adicionar CNAE de comércio atacadista",
      currentCnaes,
    })).rejects.toThrow(TRPCError);
  });

  it("B03 — falha: projeto não encontrado → lança NOT_FOUND sem chamar IA", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.refineCnaes({
      projectId: 999999999,
      description: desc,
      feedback: "Adicionar CNAE",
      currentCnaes,
    })).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockInvokeLLM).not.toHaveBeenCalled();
  });

  it("B04 — verifica que o feedback é incluído no prompt", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockOk('{"cnaes": [{"code": "1112-7/00", "description": "Fabricação de vinho", "confidence": 95}]}') as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await caller.refineCnaes({
      projectId: testProjectId,
      description: desc,
      feedback: "Incluir CNAE de distribuição",
      currentCnaes,
    });

    const callArgs = mockInvokeLLM.mock.calls[0][0];
    const userMsg = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMsg?.content).toContain("Incluir CNAE de distribuição");
  });
});

// =============================================================================
// C. generateQuestions
// =============================================================================
describe("C. generateQuestions", () => {
  it("C01 — sucesso: retorna perguntas nível 1 para um CNAE", async () => {
    const payload = {
      questions: [
        { id: "q1", text: "Sua empresa emite NF-e?", type: "sim_nao", required: true, options: [] },
        { id: "q2", text: "Qual o regime tributário atual?", type: "selecao_unica", required: true, options: ["Simples Nacional", "Lucro Presumido", "Lucro Real"] },
      ],
    };
    mockInvokeLLM.mockResolvedValueOnce(mockOk(JSON.stringify(payload)) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.generateQuestions({
      projectId: testProjectId,
      cnaeCode: "1112-7/00",
      cnaeDescription: "Fabricação de vinho",
      level: "nivel1",
    });

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].id).toBe("q1");
    expect(result.questions[0].type).toBe("sim_nao");
  });

  it("C02 — sucesso: nível 2 inclui contexto das respostas anteriores no prompt", async () => {
    const payload = { questions: [{ id: "q1", text: "Volume mensal de NF-e?", type: "multipla_escolha", required: true, options: ["< 100", "100-500", "> 500"] }] };
    mockInvokeLLM.mockResolvedValueOnce(mockOk(JSON.stringify(payload)) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await caller.generateQuestions({
      projectId: testProjectId,
      cnaeCode: "1112-7/00",
      cnaeDescription: "Fabricação de vinho",
      level: "nivel2",
      previousAnswers: [{ question: "Sua empresa emite NF-e?", answer: "Sim" }],
    });

    const callArgs = mockInvokeLLM.mock.calls[0][0];
    const userMsg = callArgs.messages.find((m: any) => m.role === "user");
    // O prompt usa "NÍVEL: 2" (número) e inclui as respostas anteriores do nível 1
    expect(userMsg?.content).toContain("NÍVEL: 2");
    expect(userMsg?.content).toContain("Sua empresa emite NF-e?");
  });

  it("C03 — falha: IA retorna JSON malformado → lança INTERNAL_SERVER_ERROR", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockOk("Aqui estão as perguntas: 1. Emite NF-e? 2. Regime?") as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.generateQuestions({
      projectId: testProjectId,
      cnaeCode: "1112-7/00",
      cnaeDescription: "Fabricação de vinho",
      level: "nivel1",
    })).rejects.toThrow(TRPCError);
  });

  it("C04 — falha: projeto não encontrado → lança NOT_FOUND sem chamar IA", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.generateQuestions({
      projectId: 999999999,
      cnaeCode: "1112-7/00",
      cnaeDescription: "Fabricação de vinho",
      level: "nivel1",
    })).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockInvokeLLM).not.toHaveBeenCalled();
  });

  it("C05 — falha: IA lança RateLimitError → propaga sem swallow", async () => {
    mockInvokeLLM.mockRejectedValueOnce(new Error("Rate limit exceeded: 429 Too Many Requests"));

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.generateQuestions({
      projectId: testProjectId,
      cnaeCode: "1112-7/00",
      cnaeDescription: "Fabricação de vinho",
      level: "nivel1",
    })).rejects.toThrow("Rate limit exceeded");
  });
});

// =============================================================================
// G. saveAnswer / getProgress (sem IA)
// =============================================================================
describe("G. saveAnswer e getProgress", () => {
  it("G01 — saveAnswer: salva nova resposta com sucesso", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.saveAnswer({
      projectId: testProjectId,
      cnaeCode: "1112-7/00",
      cnaeDescription: "Fabricação de vinho",
      level: "nivel1",
      questionIndex: 0,
      questionText: "Sua empresa emite NF-e?",
      questionType: "sim_nao",
      answerValue: "Sim",
    });

    expect(result.success).toBe(true);
  });

  it("G02 — saveAnswer: upsert — atualiza resposta existente sem duplicar", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));

    await caller.saveAnswer({ projectId: testProjectId, cnaeCode: "1112-7/00", level: "nivel1", questionIndex: 0, questionText: "Q1", answerValue: "Sim" });
    await caller.saveAnswer({ projectId: testProjectId, cnaeCode: "1112-7/00", level: "nivel1", questionIndex: 0, questionText: "Q1", answerValue: "Não" });

    const db = await getDb();
    if (!db) throw new Error("DB connection failed");
    const answers = await db.select().from(questionnaireAnswersV3).where(
      and(
        eq(questionnaireAnswersV3.projectId, testProjectId),
        eq(questionnaireAnswersV3.cnaeCode, "1112-7/00"),
        eq(questionnaireAnswersV3.questionIndex, 0),
      )
    );

    expect(answers).toHaveLength(1);
    expect(answers[0].answerValue).toBe("Não");
  });

  it("G03 — getProgress: retorna todas as respostas salvas", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));

    await caller.saveAnswer({ projectId: testProjectId, cnaeCode: "1112-7/00", level: "nivel1", questionIndex: 0, questionText: "P1", answerValue: "Sim" });
    await caller.saveAnswer({ projectId: testProjectId, cnaeCode: "1112-7/00", level: "nivel1", questionIndex: 1, questionText: "P2", answerValue: "Lucro Real" });

    const progress = await caller.getProgress({ projectId: testProjectId });

    expect(progress.answers).toHaveLength(2);
    expect(progress.answers.some((a: any) => a.answerValue === "Sim")).toBe(true);
    expect(progress.answers.some((a: any) => a.answerValue === "Lucro Real")).toBe(true);
  });

  it("G04 — getProgress: retorna arrays vazios para projeto sem respostas", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const progress = await caller.getProgress({ projectId: testProjectId });

    expect(progress.answers).toEqual([]);
    expect(progress.progress).toBeNull();
  });
});

// =============================================================================
// D. generateBriefing
// =============================================================================
describe("D. generateBriefing", () => {
  const sampleAnswers = [{
    cnaeCode: "1112-7/00",
    cnaeDescription: "Fabricação de vinho",
    level: "nivel1",
    questions: [
      { question: "Sua empresa emite NF-e?", answer: "Sim" },
      { question: "Qual o regime tributário?", answer: "Lucro Presumido" },
    ],
  }];

  it("D01 — sucesso: retorna briefing em markdown e salva no banco", async () => {
    const briefingMd = `# Briefing de Compliance\n## Resumo Executivo\n**Nível de Risco: Alto**\nA empresa apresenta exposição significativa.`;
    mockInvokeLLM.mockResolvedValueOnce(mockOk(briefingMd) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.generateBriefing({ projectId: testProjectId, allAnswers: sampleAnswers });

    expect(result.briefing).toContain("Briefing de Compliance");
    expect(result.briefing).toContain("Nível de Risco: Alto");

    // Verificar que foi salvo no banco
    const db = await getDb();
    if (!db) throw new Error("DB connection failed");
    const [proj] = await db.select().from(projects).where(eq(projects.id, testProjectId));
    expect((proj as any).briefingContent).toBeTruthy();
  });

  it("D02 — sucesso: inclui contexto de correção no prompt quando fornecido", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockOk("# Briefing Corrigido\nConteúdo atualizado.") as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await caller.generateBriefing({
      projectId: testProjectId,
      allAnswers: sampleAnswers,
      correction: "Focar mais nos impactos do IBS",
    });

    const callArgs = mockInvokeLLM.mock.calls[0][0];
    const userMsg = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMsg?.content).toContain("CORREÇÃO SOLICITADA");
    expect(userMsg?.content).toContain("Focar mais nos impactos do IBS");
  });

  it("D03 — falha: IA retorna null → lança INTERNAL_SERVER_ERROR", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockEmpty() as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.generateBriefing({ projectId: testProjectId, allAnswers: sampleAnswers }))
      .rejects.toThrow(TRPCError);
  });

  it("D04 — falha: IA lança timeout → propaga sem salvar no banco", async () => {
    mockInvokeLLM.mockRejectedValueOnce(new Error("Request timeout: LLM took > 60s"));

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.generateBriefing({ projectId: testProjectId, allAnswers: sampleAnswers }))
      .rejects.toThrow("Request timeout");

    // Verificar que briefingContent não foi salvo
    const db = await getDb();
    if (!db) throw new Error("DB connection failed");
    const [proj] = await db.select().from(projects).where(eq(projects.id, testProjectId));
    expect((proj as any).briefingContent).toBeNull();
  });
});

// =============================================================================
// H. approveBriefing (sem IA)
// =============================================================================
describe("H. approveBriefing", () => {
  it("H01 — sucesso: avança status para matriz_riscos e salva briefing", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.approveBriefing({
      projectId: testProjectId,
      briefingContent: "# Briefing Aprovado\nConteúdo final.",
    });

    expect(result.success).toBe(true);
    expect(result.nextStep).toBe(4);

    const db = await getDb();
    if (!db) throw new Error("DB connection failed");
    const [proj] = await db.select().from(projects).where(eq(projects.id, testProjectId));
    expect((proj as any).status).toBe("matriz_riscos");
    expect((proj as any).currentStep).toBe(4);
  });
});

// =============================================================================
// E. generateRiskMatrices
// =============================================================================
describe("E. generateRiskMatrices", () => {
  const briefingContent = "# Briefing\nEmpresa de fabricação de vinhos com alto impacto do IBS.";
  const mockRisks = {
    risks: [
      { id: "r1", evento: "Mudança no cálculo do IBS", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Revisar sistema fiscal" },
      { id: "r2", evento: "Requalificação de alíquotas", probabilidade: "Média", impacto: "Alto", severidade: "Alta", plano_acao: "Consultar advogado" },
    ],
  };

  it("E01 — sucesso: gera matrizes para todas as 4 áreas (4 chamadas à IA)", async () => {
    mockInvokeLLM.mockResolvedValue(mockOk(JSON.stringify(mockRisks)) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.generateRiskMatrices({ projectId: testProjectId, briefingContent });

    expect(Object.keys(result.matrices)).toHaveLength(4);
    expect(result.matrices.contabilidade).toHaveLength(2);
    expect(result.matrices.juridico).toHaveLength(2);
    expect(mockInvokeLLM).toHaveBeenCalledTimes(4);
  });

  it("E02 — sucesso: gera matriz apenas para área específica (1 chamada à IA)", async () => {
    const singleRisk = { risks: [{ id: "r1", evento: "Risco TI", probabilidade: "Baixa", impacto: "Médio", severidade: "Média", plano_acao: "Atualizar sistemas" }] };
    mockInvokeLLM.mockResolvedValueOnce(mockOk(JSON.stringify(singleRisk)) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.generateRiskMatrices({ projectId: testProjectId, briefingContent, area: "ti" });

    expect(Object.keys(result.matrices)).toHaveLength(1);
    expect(result.matrices.ti).toHaveLength(1);
    expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
  });

  it("E03 — falha parcial: IA retorna texto inválido para 1 área → área omitida, outras retornam", async () => {
    mockInvokeLLM
      .mockResolvedValueOnce(mockOk(JSON.stringify(mockRisks)) as any)   // contabilidade OK
      .mockResolvedValueOnce(mockOk("Texto inválido sem JSON") as any)   // negocio FALHA
      .mockResolvedValueOnce(mockOk(JSON.stringify(mockRisks)) as any)   // ti OK
      .mockResolvedValueOnce(mockOk(JSON.stringify(mockRisks)) as any);  // juridico OK

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.generateRiskMatrices({ projectId: testProjectId, briefingContent });

    expect(result.matrices.contabilidade).toHaveLength(2);
    expect(result.matrices.negocio).toBeUndefined(); // falhou silenciosamente
    expect(result.matrices.ti).toHaveLength(2);
    expect(result.matrices.juridico).toHaveLength(2);
  });

  it("E04 — falha: projeto não encontrado → lança NOT_FOUND sem chamar IA", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.generateRiskMatrices({ projectId: 999999999, briefingContent }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockInvokeLLM).not.toHaveBeenCalled();
  });
});

// =============================================================================
// H2. approveMatrices (sem IA)
// =============================================================================
describe("H2. approveMatrices", () => {
  it("H2-01 — sucesso: avança status para plano_acao e persiste matrizes no banco", async () => {
    const matrices = {
      contabilidade: [{ id: "r1", evento: "Risco fiscal", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Revisar" }],
    };

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.approveMatrices({ projectId: testProjectId, matrices });

    expect(result.success).toBe(true);
    expect(result.nextStep).toBe(5);

    const db = await getDb();
    if (!db) throw new Error("DB connection failed");
    const [proj] = await db.select().from(projects).where(eq(projects.id, testProjectId));
    expect((proj as any).status).toBe("plano_acao");
    expect((proj as any).riskMatricesData).toBeTruthy();
  });
});

// =============================================================================
// F. generateActionPlan
// =============================================================================
describe("F. generateActionPlan", () => {
  const matrices = {
    contabilidade: [{ id: "r1", evento: "Mudança IBS", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Revisar" }],
    negocio: [],
    ti: [],
    juridico: [],
  };
  const mockTasks = {
    tasks: [
      { id: "t1", titulo: "Revisar sistema de NF-e", descricao: "Atualizar para novo padrão", area: "contabilidade", prazo_sugerido: "30 dias", prioridade: "Alta", responsavel_sugerido: "Contador" },
      { id: "t2", titulo: "Treinamento da equipe", descricao: "Capacitar equipe fiscal", area: "contabilidade", prazo_sugerido: "60 dias", prioridade: "Média", responsavel_sugerido: "RH" },
    ],
  };

  it("F01 — sucesso: gera plano para todas as 4 áreas com campos padrão", async () => {
    mockInvokeLLM.mockResolvedValue(mockOk(JSON.stringify(mockTasks)) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.generateActionPlan({ projectId: testProjectId, matrices });

    expect(Object.keys(result.plans)).toHaveLength(4);
    expect(result.plans.contabilidade).toHaveLength(2);
    // Campos padrão adicionados pelo servidor
    expect(result.plans.contabilidade[0].status).toBe("nao_iniciado");
    expect(result.plans.contabilidade[0].progress).toBe(0);
    expect(mockInvokeLLM).toHaveBeenCalledTimes(4);
  });

  it("F02 — sucesso: gera plano apenas para área específica", async () => {
    const tiTasks = { tasks: [{ id: "t1", titulo: "Atualizar ERP", descricao: "Migrar sistema", area: "ti", prazo_sugerido: "90 dias", prioridade: "Alta", responsavel_sugerido: "CTO" }] };
    mockInvokeLLM.mockResolvedValueOnce(mockOk(JSON.stringify(tiTasks)) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.generateActionPlan({ projectId: testProjectId, matrices, area: "ti" });

    expect(Object.keys(result.plans)).toHaveLength(1);
    expect(result.plans.ti).toHaveLength(1);
    expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
  });

  it("F03 — falha: IA retorna JSON sem campo 'tasks' → área retorna array vazio", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockOk('{"tarefas": []}') as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.generateActionPlan({ projectId: testProjectId, matrices, area: "contabilidade" });

    expect(result.plans.contabilidade).toEqual([]);
  });

  it("F04 — falha: projeto não encontrado → lança NOT_FOUND sem chamar IA", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.generateActionPlan({ projectId: 999999999, matrices }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockInvokeLLM).not.toHaveBeenCalled();
  });

  it("F05 — sucesso: inclui contexto de ajuste no prompt quando fornecido", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockOk(JSON.stringify(mockTasks)) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await caller.generateActionPlan({
      projectId: testProjectId,
      matrices,
      area: "contabilidade",
      adjustment: "Priorizar tarefas de curto prazo",
    });

    const callArgs = mockInvokeLLM.mock.calls[0][0];
    const userMsg = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMsg?.content).toContain("AJUSTE SOLICITADO");
    expect(userMsg?.content).toContain("Priorizar tarefas de curto prazo");
  });
});

// =============================================================================
// H3. approveActionPlan (sem IA)
// =============================================================================
describe("H3. approveActionPlan", () => {
  it("H3-01 — sucesso: avança status para aprovado e persiste plano no banco", async () => {
    const plans = {
      contabilidade: [{ id: "t1", titulo: "Revisar NF-e", status: "nao_iniciado", progress: 0 }],
    };

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.approveActionPlan({ projectId: testProjectId, plans });

    expect(result.success).toBe(true);

    const db = await getDb();
    if (!db) throw new Error("DB connection failed");
    const [proj] = await db.select().from(projects).where(eq(projects.id, testProjectId));
    expect((proj as any).status).toBe("aprovado");
    expect((proj as any).actionPlansData).toBeTruthy();
  });

  it("H3-02 — fluxo E2E completo: rascunho → aprovado via 3 aprovações sequenciais", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));

    // 1. Aprovar briefing → matriz_riscos
    await caller.approveBriefing({ projectId: testProjectId, briefingContent: "# Briefing Final" });

    // 2. Aprovar matrizes → plano_acao
    await caller.approveMatrices({
      projectId: testProjectId,
      matrices: { contabilidade: [{ id: "r1", evento: "Risco", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Ação" }] },
    });

    // 3. Aprovar plano → aprovado
    await caller.approveActionPlan({
      projectId: testProjectId,
      plans: { contabilidade: [{ id: "t1", titulo: "Tarefa", status: "nao_iniciado", progress: 0 }] },
    });

    // Verificar estado final
    const db = await getDb();
    if (!db) throw new Error("DB connection failed");
    const [proj] = await db.select().from(projects).where(eq(projects.id, testProjectId));
    expect((proj as any).status).toBe("aprovado");
    expect((proj as any).currentStep).toBe(5);
    expect((proj as any).briefingContent).toBeTruthy();
    expect((proj as any).riskMatricesData).toBeTruthy();
    expect((proj as any).actionPlansData).toBeTruthy();
  });
});

// =============================================================================
// I. Cenários de falha de infraestrutura
// =============================================================================
describe("I. Cenários de falha de infraestrutura", () => {
  const desc = "Empresa de fabricação de vinhos e comércio varejista de bebidas alcoólicas com distribuição nacional.";

  it("I01 — IA retorna choices vazio → lança erro", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockNoChoices() as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.extractCnaes({ projectId: testProjectId, description: desc }))
      .rejects.toThrow();
  });

  it("I02 — IA retorna JSON com array vazio de CNAEs → retorna array vazio sem lançar erro", async () => {
    mockInvokeLLM.mockResolvedValueOnce(mockOk('{"cnaes": []}') as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.extractCnaes({ projectId: testProjectId, description: desc });

    expect(result.cnaes).toEqual([]);
  });

  it("I03 — IA lança RateLimitError → propaga sem swallow", async () => {
    const rateLimitError = new Error("Rate limit exceeded: 429 Too Many Requests");
    mockInvokeLLM.mockRejectedValueOnce(rateLimitError);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.generateBriefing({
      projectId: testProjectId,
      allAnswers: [{ cnaeCode: "1112-7/00", cnaeDescription: "Fabricação de vinho", level: "nivel1", questions: [{ question: "Q1", answer: "A1" }] }],
    })).rejects.toThrow("Rate limit exceeded");
  });

  it("I04 — IA retorna choices com message undefined → lança erro", async () => {
    mockInvokeLLM.mockResolvedValueOnce({ choices: [{ message: undefined }] } as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.extractCnaes({ projectId: testProjectId, description: desc }))
      .rejects.toThrow();
  });
});
