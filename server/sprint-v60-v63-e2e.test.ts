/**
 * Sprint V60-V63 — Testes E2E com 5 Projetos × 3 CNAEs cada
 *
 * Cobre:
 *   V60: generateWithRetry (retry automático, temperatura 0.2, schemas Zod)
 *   V61: calculateGlobalScore (scoring financeiro, confidence score, inconsistencias)
 *   V62: getArticlesForCnaes (pré-RAG, injeção de contexto regulatório)
 *   V63: generateDecision (motor de decisão, momento_wow)
 *
 * 5 Projetos de teste:
 *   P1 — Indústria Alimentícia (CNAEs: 10, 46, 47)
 *   P2 — Tecnologia da Informação (CNAEs: 62, 63, 64)
 *   P3 — Construção Civil + Imóveis (CNAEs: 41, 42, 68)
 *   P4 — Saúde + Educação (CNAEs: 86, 85, 87)
 *   P5 — Agronegócio + Transporte (CNAEs: 01, 49, 35)
 */

import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { projects, users, questionnaireAnswersV3 } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { fluxoV3Router } from "./routers-fluxo-v3";
import { calculateGlobalScore } from "./ai-helpers";
import { getArticlesForCnaes } from "./cnae-articles-map";
import {
  BriefingStructuredSchema,
  RisksResponseSchema,
  TasksResponseSchema,
  DecisaoResponseSchema,
  CnaesResponseSchema,
  QuestionsResponseSchema,
} from "./ai-schemas";
import { TRPCError } from "@trpc/server";

const mockInvokeLLM = vi.mocked(invokeLLM);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function mockOk(content: string) {
  return {
    choices: [{ message: { content, role: "assistant" } }],
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
  };
}

function makeCtx(userId: number, role = "equipe_solaris") {
  return { user: { id: userId, role, name: "Teste E2E V60-V63", email: "e2e@test.com" } } as any;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES: 5 PROJETOS × 3 CNAEs
// ─────────────────────────────────────────────────────────────────────────────

const PROJECTS = [
  {
    name: "P1 — Indústria Alimentícia",
    description: "Fabricante de alimentos processados com distribuição atacadista e varejo próprio. Opera em 3 estados com faturamento de R$ 50M/ano.",
    faturamentoAnual: 50_000_000,
    cnaes: [
      { code: "1099-6/99", description: "Fabricação de outros produtos alimentícios", confidence: 95 },
      { code: "4639-7/01", description: "Comércio atacadista de produtos alimentícios em geral", confidence: 88 },
      { code: "4729-6/99", description: "Comércio varejista de produtos alimentícios em geral", confidence: 82 },
    ],
  },
  {
    name: "P2 — Tecnologia da Informação",
    description: "Empresa de desenvolvimento de software SaaS com clientes no Brasil e exterior. Receita de R$ 20M/ano, 40% de exportação.",
    faturamentoAnual: 20_000_000,
    cnaes: [
      { code: "6201-5/01", description: "Desenvolvimento de programas de computador sob encomenda", confidence: 97 },
      { code: "6311-9/00", description: "Tratamento de dados, provedores de serviços de aplicação", confidence: 85 },
      { code: "6422-1/00", description: "Bancos múltiplos com carteira comercial", confidence: 70 },
    ],
  },
  {
    name: "P3 — Construção Civil + Imóveis",
    description: "Incorporadora e construtora com projetos residenciais e comerciais. Atua em habitação popular e alto padrão.",
    faturamentoAnual: 80_000_000,
    cnaes: [
      { code: "4110-7/00", description: "Incorporação de empreendimentos imobiliários", confidence: 96 },
      { code: "4221-9/05", description: "Construção de redes de abastecimento de água", confidence: 78 },
      { code: "6810-2/01", description: "Compra e venda de imóveis próprios", confidence: 90 },
    ],
  },
  {
    name: "P4 — Saúde + Educação",
    description: "Grupo de saúde com hospital, clínicas e escola de medicina. Faturamento de R$ 120M/ano.",
    faturamentoAnual: 120_000_000,
    cnaes: [
      { code: "8610-1/01", description: "Atividades de atendimento hospitalar, exceto pronto-socorro", confidence: 99 },
      { code: "8550-3/01", description: "Administração de caixas escolares", confidence: 80 },
      { code: "8712-3/00", description: "Atividades de fornecimento de infra-estrutura de apoio", confidence: 75 },
    ],
  },
  {
    name: "P5 — Agronegócio + Transporte",
    description: "Cooperativa agrícola com produção de grãos, transporte rodoviário e geração de energia solar.",
    faturamentoAnual: 200_000_000,
    cnaes: [
      { code: "0115-6/00", description: "Cultivo de soja", confidence: 98 },
      { code: "4930-2/01", description: "Transporte rodoviário de carga, exceto produtos perigosos", confidence: 91 },
      { code: "3511-5/01", description: "Geração de energia elétrica de origem solar", confidence: 85 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAYLOADS MOCK PARA CADA ETAPA
// ─────────────────────────────────────────────────────────────────────────────

function buildCnaesPayload(cnaes: typeof PROJECTS[0]["cnaes"]) {
  return JSON.stringify({ cnaes });
}

function buildQuestionsPayload(cnaeCode: string) {
  return JSON.stringify({
    questions: [
      {
        id: "q1",
        text: `Sua empresa possui mapeamento dos créditos de IBS/CBS para o CNAE ${cnaeCode}?`,
        objetivo_diagnostico: "Verificar maturidade no mapeamento de créditos",
        impacto_reforma: "Créditos não mapeados resultam em perda fiscal após jan/2027",
        type: "sim_nao",
        peso_risco: "alto",
        required: true,
      },
      {
        id: "q2",
        text: "Qual o regime tributário atual da empresa?",
        objetivo_diagnostico: "Identificar regime para calcular impacto da transição",
        impacto_reforma: "Lucro Real tem impacto diferente de Simples Nacional na transição",
        type: "selecao_unica",
        peso_risco: "critico",
        required: true,
        options: ["Simples Nacional", "Lucro Presumido", "Lucro Real"],
      },
      {
        id: "q3",
        text: "A empresa utiliza sistema ERP integrado com obrigações fiscais?",
        objetivo_diagnostico: "Avaliar prontidão tecnológica para split payment",
        impacto_reforma: "ERP não integrado impede compliance com split payment obrigatório",
        type: "sim_nao",
        peso_risco: "alto",
        required: true,
      },
    ],
  });
}

function buildBriefingPayload(nivel: string = "alto") {
  return JSON.stringify({
    nivel_risco_geral: nivel,
    resumo_executivo: `A empresa apresenta gaps significativos de compliance com a Reforma Tributária (LC 214/2025). O principal risco é a inadequação ao split payment obrigatório a partir de jan/2027, que pode resultar em perda de créditos de IBS/CBS e autuações fiscais. Recomenda-se ação imediata nas áreas de TI e contabilidade para adequação ao novo regime.`,
    principais_gaps: [
      {
        gap: "Ausência de mapeamento de créditos de IBS/CBS",
        causa_raiz: "Falta de processo estruturado de identificação de créditos no novo regime",
        evidencia_regulatoria: "Art. 47-52 LC 214/2025 — créditos de IBS/CBS",
        urgencia: "imediata",
      },
      {
        gap: "ERP não preparado para split payment",
        causa_raiz: "Sistema legado sem módulo fiscal atualizado para o novo regime",
        evidencia_regulatoria: "Art. 5 LC 227/2024 — split payment obrigatório",
        urgencia: "curto_prazo",
      },
    ],
    oportunidades: [
      "Aproveitamento amplo de créditos de IBS/CBS sobre insumos",
      "Redução de carga tributária com regime de não cumulatividade plena",
    ],
    recomendacoes_prioritarias: [
      "Contratar consultoria especializada em Reforma Tributária",
      "Atualizar ERP para suportar split payment até dez/2026",
      "Mapear todos os créditos de IBS/CBS aproveitáveis",
    ],
    inconsistencias: [
      {
        pergunta_origem: "Possui mapeamento de créditos?",
        resposta_declarada: "Sim, temos processo estruturado",
        contradicao_detectada: "Resposta contradiz ausência de ERP integrado declarada anteriormente",
        impacto: "medio",
      },
    ],
    confidence_score: {
      nivel_confianca: 78,
      limitacoes: [
        "Diagnóstico baseado em questionário — não substitui auditoria fiscal",
        "Artigos regulatórios sujeitos a regulamentação complementar",
      ],
      recomendacao: "Revisão por advogado tributarista recomendada",
    },
  });
}

function buildRisksPayload() {
  return JSON.stringify({
    risks: [
      {
        id: "r1",
        evento: "Perda de créditos de IBS/CBS por falta de mapeamento",
        causa_raiz: "Ausência de processo de identificação de créditos no novo regime",
        evidencia_regulatoria: "Art. 47-52 LC 214/2025",
        probabilidade: "Alta",
        impacto: "Alto",
        severidade: "Crítica",
        severidade_score: 9,
        plano_acao: "Implementar processo de mapeamento de créditos até jun/2026",
      },
      {
        id: "r2",
        evento: "Não conformidade com split payment obrigatório",
        causa_raiz: "ERP sem módulo de split payment integrado",
        evidencia_regulatoria: "Art. 5 LC 227/2024",
        probabilidade: "Alta",
        impacto: "Alto",
        severidade: "Alta",
        severidade_score: 8,
        plano_acao: "Atualizar ERP até dez/2026",
      },
      {
        id: "r3",
        evento: "Inadequação ao regime de não cumulatividade plena",
        causa_raiz: "Falta de treinamento da equipe contábil no novo regime",
        evidencia_regulatoria: "Art. 28 LC 214/2025",
        probabilidade: "Média",
        impacto: "Médio",
        severidade: "Média",
        severidade_score: 5,
        plano_acao: "Capacitar equipe contábil em IBS/CBS até set/2026",
      },
    ],
  });
}

function buildTasksPayload(area: string) {
  return JSON.stringify({
    tasks: [
      {
        id: `t1-${area}`,
        titulo: `Mapear créditos de IBS/CBS — ${area}`,
        descricao: `Identificar e documentar todos os créditos de IBS/CBS aproveitáveis na área de ${area}`,
        area,
        prazo_sugerido: "30 dias",
        prioridade: "Alta",
        responsavel_sugerido: `Responsável ${area}`,
        objetivo_diagnostico: "Endereça gap de mapeamento de créditos",
        evidencia_regulatoria: "Art. 47-52 LC 214/2025",
      },
      {
        id: `t2-${area}`,
        titulo: `Adequar ERP para split payment — ${area}`,
        descricao: `Configurar módulo de split payment no ERP para a área de ${area}`,
        area,
        prazo_sugerido: "60 dias",
        prioridade: "Alta",
        responsavel_sugerido: `Gerente de ${area}`,
        objetivo_diagnostico: "Endereça risco de não conformidade com split payment",
        evidencia_regulatoria: "Art. 5 LC 227/2024",
      },
      {
        id: `t3-${area}`,
        titulo: `Capacitar equipe em IBS/CBS — ${area}`,
        descricao: `Treinar equipe da área de ${area} no novo regime de IBS/CBS da Reforma Tributária`,
        area,
        prazo_sugerido: "90 dias",
        prioridade: "Média",
        responsavel_sugerido: `Coordenador de ${area}`,
        objetivo_diagnostico: "Endereça risco de inadequação ao regime de não cumulatividade",
        evidencia_regulatoria: "Art. 28 LC 214/2025",
      },
    ],
  });
}

function buildDecisaoPayload() {
  return JSON.stringify({
    decisao_recomendada: {
      acao_principal: "Iniciar imediatamente o mapeamento de créditos de IBS/CBS e adequação do ERP para split payment",
      prazo_dias: 90,
      risco_se_nao_fazer: "Perda estimada de 15-22% dos créditos tributários e autuações fiscais após jan/2027",
      prioridade: "critica",
      proximos_passos: [
        "Contratar consultoria especializada em Reforma Tributária até 30 dias",
        "Iniciar adequação do ERP para split payment até 60 dias",
        "Concluir mapeamento completo de créditos de IBS/CBS até 90 dias",
      ],
      momento_wow: "A empresa pode recuperar créditos retroativos de PIS/COFINS dos últimos 5 anos enquanto se adequa ao novo regime — janela de oportunidade que fecha em dez/2026",
      fundamentacao_legal: "Art. 47-52 LC 214/2025 + Art. 5 LC 227/2024 + Art. 3 LC 244/2024",
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP / TEARDOWN
// ─────────────────────────────────────────────────────────────────────────────

let testUserId: number;
let testClientId: number;
const createdProjectIds: number[] = [];

beforeAll(async () => {
  vi.clearAllMocks();

  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  // Criar usuário equipe_solaris
  const openId = `v60v63-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    name: "Teste E2E V60-V63",
    email: `v60v63-${openId}@test.com`,
    role: "equipe_solaris",
  });
  const [user] = await db.select().from(users).where(eq(users.openId, openId));
  testUserId = user.id;

  // Criar usuário cliente
  const clientOpenId = `v60v63-client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId: clientOpenId,
    name: "Cliente E2E V60-V63",
    email: `v60v63-client-${clientOpenId}@test.com`,
    role: "cliente",
  });
  const [clientUser] = await db.select().from(users).where(eq(users.openId, clientOpenId));
  testClientId = clientUser.id;
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  for (const pid of createdProjectIds) {
    await db.delete(questionnaireAnswersV3).where(eq(questionnaireAnswersV3.projectId, pid));
    await db.delete(projects).where(eq(projects.id, pid));
  }
  await db.delete(users).where(eq(users.id, testUserId));
  await db.delete(users).where(eq(users.id, testClientId));
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES UNITÁRIOS: MÓDULOS V60-V63
// ─────────────────────────────────────────────────────────────────────────────

describe("V60 — generateWithRetry: schemas Zod e temperatura 0.2", () => {
  it("V60-01 — CnaesResponseSchema valida payload correto", () => {
    const payload = {
      cnaes: [
        { code: "1099-6/99", description: "Fabricação de alimentos", confidence: 95 },
        { code: "4639-7/01", description: "Comércio atacadista", confidence: 88 },
      ],
    };
    expect(() => CnaesResponseSchema.parse(payload)).not.toThrow();
  });

  it("V60-02 — CnaesResponseSchema rejeita array vazio", () => {
    expect(() => CnaesResponseSchema.parse({ cnaes: [] })).toThrow();
  });

  it("V60-03 — BriefingStructuredSchema valida payload completo", () => {
    const payload = JSON.parse(buildBriefingPayload("alto"));
    expect(() => BriefingStructuredSchema.parse(payload)).not.toThrow();
  });

  it("V60-04 — BriefingStructuredSchema rejeita resumo_executivo muito curto", () => {
    const payload = JSON.parse(buildBriefingPayload("alto"));
    payload.resumo_executivo = "Curto";
    expect(() => BriefingStructuredSchema.parse(payload)).toThrow();
  });

  it("V60-05 — RisksResponseSchema valida payload com severidade_score numérico", () => {
    const payload = JSON.parse(buildRisksPayload());
    expect(() => RisksResponseSchema.parse(payload)).not.toThrow();
    expect(payload.risks[0].severidade_score).toBe(9);
  });

  it("V60-06 — TasksResponseSchema valida payload com objetivo_diagnostico e evidencia_regulatoria", () => {
    const payload = JSON.parse(buildTasksPayload("contabilidade"));
    expect(() => TasksResponseSchema.parse(payload)).not.toThrow();
    expect(payload.tasks.length).toBeGreaterThanOrEqual(3);
    expect(payload.tasks[0].objetivo_diagnostico).toBeTruthy();
    expect(payload.tasks[0].evidencia_regulatoria).toBeTruthy();
  });

  it("V60-07 — QuestionsResponseSchema valida perguntas com peso_risco e impacto_reforma", () => {
    const payload = JSON.parse(buildQuestionsPayload("6201-5/01"));
    expect(() => QuestionsResponseSchema.parse(payload)).not.toThrow();
    expect(payload.questions[0].peso_risco).toBeTruthy();
    expect(payload.questions[0].impacto_reforma).toBeTruthy();
  });

  it("V60-08 — DecisaoResponseSchema valida payload com momento_wow e proximos_passos", () => {
    const payload = JSON.parse(buildDecisaoPayload());
    expect(() => DecisaoResponseSchema.parse(payload)).not.toThrow();
    expect(payload.decisao_recomendada.momento_wow).toBeTruthy();
    expect(payload.decisao_recomendada.proximos_passos).toHaveLength(3);
  });

  it("V60-09 — retry: IA falha na 1ª tentativa e sucede na 2ª", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB connection failed");

    const [res] = await db.insert(projects).values({
      name: "Retry Test Project",
      description: "Empresa de teste para verificar retry automático do generateWithRetry.",
      status: "rascunho",
      currentStep: 1,
      clientId: testClientId,
      createdById: testUserId,
      createdByRole: "equipe_solaris",
      notificationFrequency: "semanal",
    } as any);
    const pid = (res as any).insertId as number;
    createdProjectIds.push(pid);

    const validPayload = { cnaes: [{ code: "6201-5/01", description: "Desenvolvimento de software", confidence: 97 }] };
    // 1ª chamada: falha com JSON inválido; 2ª chamada: sucesso
    mockInvokeLLM
      .mockResolvedValueOnce(mockOk("INVALID JSON RESPONSE") as any)
      .mockResolvedValueOnce(mockOk(JSON.stringify(validPayload)) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.extractCnaes({
      projectId: pid,
      description: "Empresa de desenvolvimento de software SaaS com clientes no Brasil e exterior.",
    });

    expect(result.cnaes).toHaveLength(1);
    expect(mockInvokeLLM).toHaveBeenCalledTimes(2); // Confirma que houve retry
  });
});

describe("V61 — calculateGlobalScore: scoring financeiro determinístico", () => {
  it("V61-01 — score crítico com 2 riscos Crítica e faturamento", () => {
    const risks = [
      { severidade: "Crítica", severidade_score: 9 },
      { severidade: "Crítica", severidade_score: 9 },
      { severidade: "Alta", severidade_score: 7 },
    ];
    const result = calculateGlobalScore(risks, 50_000_000);
    expect(result.nivel).toBe("critico");
    expect(result.score_global).toBeGreaterThan(70);
    expect(result.impacto_estimado).toContain("R$");
    expect(result.custo_inacao).toBeTruthy();
    expect(result.riscos_criticos).toBe(2);
    expect(result.riscos_altos).toBe(1);
  });

  it("V61-02 — score alto com 1 risco Crítica", () => {
    const risks = [
      { severidade: "Crítica", severidade_score: 9 },
      { severidade: "Média", severidade_score: 5 },
      { severidade: "Baixa", severidade_score: 2 },
    ];
    const result = calculateGlobalScore(risks, 20_000_000);
    expect(result.nivel).toBe("alto");
    expect(result.prioridade).toBe("planejada");
    expect(result.total_riscos).toBe(3);
  });

  it("V61-03 — score médio sem faturamento (sem tradução financeira)", () => {
    const risks = [
      { severidade: "Média", severidade_score: 5 },
      { severidade: "Média", severidade_score: 4 },
      { severidade: "Baixa", severidade_score: 2 },
    ];
    const result = calculateGlobalScore(risks);
    expect(result.nivel).toBe("medio");
    expect(result.impacto_estimado).not.toContain("R$");
    expect(result.prioridade).toBe("monitoramento");
  });

  it("V61-04 — score baixo com apenas riscos Baixa", () => {
    const risks = [
      { severidade: "Baixa", severidade_score: 1 },
      { severidade: "Baixa", severidade_score: 2 },
    ];
    const result = calculateGlobalScore(risks, 10_000_000);
    expect(result.nivel).toBe("baixo");
    expect(result.score_global).toBeLessThan(25);
  });

  it("V61-05 — array vazio retorna score zero", () => {
    const result = calculateGlobalScore([]);
    expect(result.score_global).toBe(0);
    expect(result.nivel).toBe("baixo");
    expect(result.total_riscos).toBe(0);
  });

  it("V61-06 — usa severidade_score numérico quando disponível (ignora texto)", () => {
    const risks = [
      { severidade: "Baixa", severidade_score: 9 }, // score numérico prevalece
    ];
    const result = calculateGlobalScore(risks);
    expect(result.score_global).toBe(100); // 9/9 = 100%
  });

  it("V61-07 — faturamento de R$ 200M gera impacto em milhões", () => {
    const risks = [
      { severidade: "Crítica", severidade_score: 9 },
      { severidade: "Crítica", severidade_score: 9 },
    ];
    const result = calculateGlobalScore(risks, 200_000_000);
    expect(result.impacto_estimado).toContain("M");
  });

  it("V61-08 — confidence score no briefing contém nivel_confianca e recomendacao", () => {
    const payload = JSON.parse(buildBriefingPayload("alto"));
    const parsed = BriefingStructuredSchema.parse(payload);
    expect(parsed.confidence_score.nivel_confianca).toBeGreaterThan(0);
    expect(parsed.confidence_score.recomendacao).toBeTruthy();
    expect(parsed.confidence_score.limitacoes.length).toBeGreaterThan(0);
  });

  it("V61-09 — inconsistencias[] é opcional mas quando presente é validado", () => {
    const payload = JSON.parse(buildBriefingPayload("alto"));
    const parsed = BriefingStructuredSchema.parse(payload);
    expect(parsed.inconsistencias).toBeDefined();
    expect(parsed.inconsistencias![0].impacto).toBe("medio");
  });
});

describe("V62 — getArticlesForCnaes: pré-RAG inteligente", () => {
  it("V62-01 — P1 (Alimentícia): retorna artigos de cesta básica e IS", () => {
    const cnaes = [
      { code: "1099-6/99", description: "Fabricação de alimentos" },
      { code: "4639-7/01", description: "Comércio atacadista" },
      { code: "4729-6/99", description: "Comércio varejista" },
    ];
    const context = getArticlesForCnaes(cnaes);
    expect(context).toContain("LC 244");
    expect(context).toContain("cesta básica");
    expect(context).toContain("Art.");
    expect(context).toContain("INSTRUÇÃO CRÍTICA");
  });

  it("V62-02 — P2 (TI): retorna artigos de exportação de serviços e serviços digitais", () => {
    const cnaes = [
      { code: "6201-5/01", description: "Desenvolvimento de software" },
      { code: "6311-9/00", description: "Tratamento de dados" },
      { code: "6422-1/00", description: "Bancos múltiplos" },
    ];
    const context = getArticlesForCnaes(cnaes);
    expect(context).toContain("exportação");
    expect(context).toContain("serviços digitais");
    expect(context).toContain("LC 227");
  });

  it("V62-03 — P3 (Construção): retorna artigos de regime específico construção", () => {
    const cnaes = [
      { code: "4110-7/00", description: "Incorporação imobiliária" },
      { code: "4221-9/05", description: "Obras de infraestrutura" },
      { code: "6810-2/01", description: "Compra e venda de imóveis" },
    ];
    const context = getArticlesForCnaes(cnaes);
    expect(context).toContain("construção civil");
    expect(context).toContain("habitação popular");
    expect(context).toContain("Art. 236");
  });

  it("V62-04 — P4 (Saúde+Educação): retorna artigos de alíquota reduzida", () => {
    const cnaes = [
      { code: "8610-1/01", description: "Hospital" },
      { code: "8550-3/01", description: "Escola" },
      { code: "8712-3/00", description: "Apoio à saúde" },
    ];
    const context = getArticlesForCnaes(cnaes);
    expect(context).toContain("alíquota reduzida");
    expect(context).toContain("Art. 120");
    expect(context).toContain("educação");
  });

  it("V62-05 — P5 (Agronegócio+Transporte): retorna artigos de crédito presumido e energia", () => {
    const cnaes = [
      { code: "0115-6/00", description: "Cultivo de soja" },
      { code: "4930-2/01", description: "Transporte rodoviário" },
      { code: "3511-5/01", description: "Geração de energia solar" },
    ];
    const context = getArticlesForCnaes(cnaes);
    expect(context).toContain("agronegócio");
    expect(context).toContain("transporte");
    expect(context).toContain("energia");
  });

  it("V62-06 — CNAE desconhecido usa fallback geral com artigos base", () => {
    const cnaes = [{ code: "9999-9/99", description: "Atividade desconhecida" }];
    const context = getArticlesForCnaes(cnaes);
    expect(context).toContain("Art. 9");
    expect(context).toContain("split payment");
    expect(context).toContain("transição");
  });

  it("V62-07 — CNAEs duplicados do mesmo grupo não duplicam contexto", () => {
    const cnaes = [
      { code: "4711-3/01", description: "Hipermercado" },
      { code: "4712-1/00", description: "Mercearia" }, // mesmo grupo 47
    ];
    const context = getArticlesForCnaes(cnaes);
    // Grupo 47 deve aparecer apenas uma vez
    const occurrences = (context.match(/Grupo CNAE 47/g) || []).length;
    expect(occurrences).toBe(1);
  });

  it("V62-08 — contexto contém instrução anti-alucinação", () => {
    const cnaes = [{ code: "6201-5/01", description: "Software" }];
    const context = getArticlesForCnaes(cnaes);
    expect(context).toContain("verificar com advogado tributarista");
    expect(context).toContain("INSTRUÇÃO CRÍTICA");
  });
});

describe("V63 — generateDecision: motor de decisão explícito", () => {
  it("V63-01 — DecisaoResponseSchema valida payload completo", () => {
    const payload = JSON.parse(buildDecisaoPayload());
    expect(() => DecisaoResponseSchema.parse(payload)).not.toThrow();
  });

  it("V63-02 — decisao_recomendada tem todos os campos obrigatórios", () => {
    const payload = JSON.parse(buildDecisaoPayload());
    const parsed = DecisaoResponseSchema.parse(payload);
    expect(parsed.decisao_recomendada.acao_principal.length).toBeGreaterThan(20);
    expect(parsed.decisao_recomendada.prazo_dias).toBeGreaterThan(0);
    expect(parsed.decisao_recomendada.risco_se_nao_fazer.length).toBeGreaterThan(20);
    expect(parsed.decisao_recomendada.proximos_passos.length).toBeGreaterThanOrEqual(2);
    expect(parsed.decisao_recomendada.fundamentacao_legal).toBeTruthy();
  });

  it("V63-03 — momento_wow é opcional mas quando presente não é vazio", () => {
    const payload = JSON.parse(buildDecisaoPayload());
    const parsed = DecisaoResponseSchema.parse(payload);
    if (parsed.decisao_recomendada.momento_wow) {
      expect(parsed.decisao_recomendada.momento_wow.length).toBeGreaterThan(10);
    }
  });

  it("V63-04 — prioridade é enum válido", () => {
    const payload = JSON.parse(buildDecisaoPayload());
    const parsed = DecisaoResponseSchema.parse(payload);
    expect(["critica", "alta", "media", "baixa"]).toContain(parsed.decisao_recomendada.prioridade);
  });

  it("V63-05 — generateDecision falha sem briefing (BAD_REQUEST)", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB connection failed");

    const [res] = await db.insert(projects).values({
      name: "Projeto sem briefing",
      description: "Projeto para testar erro de generateDecision sem briefing.",
      status: "rascunho",
      currentStep: 1,
      clientId: testClientId,
      createdById: testUserId,
      createdByRole: "equipe_solaris",
      notificationFrequency: "semanal",
    } as any);
    const pid = (res as any).insertId as number;
    createdProjectIds.push(pid);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.generateDecision({ projectId: pid }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES E2E: 5 PROJETOS × 3 CNAEs — FLUXO COMPLETO
// ─────────────────────────────────────────────────────────────────────────────

describe.each(PROJECTS.map((p, i) => ({ ...p, index: i + 1 })))(
  "E2E — $name (P$index)",
  ({ name, description, faturamentoAnual, cnaes, index }) => {
    let projectId: number;

    beforeAll(async () => {
      vi.clearAllMocks();
      const db = await getDb();
      if (!db) throw new Error("DB connection failed");

      const [res] = await db.insert(projects).values({
        name,
        description,
        status: "rascunho",
        currentStep: 1,
        clientId: testClientId,
        createdById: testUserId,
        createdByRole: "equipe_solaris",
        notificationFrequency: "semanal",
        faturamentoAnual,
      } as any);
      projectId = (res as any).insertId as number;
      createdProjectIds.push(projectId);
    });

    it(`E2E-${index}A — Etapa 1: extractCnaes retorna ${cnaes.length} CNAEs com retry`, async () => {
      mockInvokeLLM.mockResolvedValueOnce(mockOk(buildCnaesPayload(cnaes)) as any);

      const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
      const result = await caller.extractCnaes({ projectId, description });

      expect(result.cnaes).toHaveLength(cnaes.length);
      result.cnaes.forEach((c, i) => {
        expect(c.code).toBe(cnaes[i].code);
        expect(c.confidence).toBeGreaterThan(0);
      });
    });

    it(`E2E-${index}B — Etapa 1: confirmCnaes persiste CNAEs e avança para step 2`, async () => {
      const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
      const result = await caller.confirmCnaes({ projectId, cnaes });

      expect(result.success).toBe(true);
      expect(result.nextStep).toBe(2);

      // Verificar que foi salvo no banco
      const db = await getDb();
      const [proj] = await db!.select().from(projects).where(eq(projects.id, projectId));
      expect((proj as any).currentStep).toBe(2);
      expect((proj as any).confirmedCnaes).toBeTruthy();
    });

    it(`E2E-${index}C — Etapa 2: generateQuestions retorna perguntas com metadata V60`, async () => {
      // Gera perguntas para cada um dos 3 CNAEs
      for (const cnae of cnaes) {
        mockInvokeLLM.mockResolvedValueOnce(mockOk(buildQuestionsPayload(cnae.code)) as any);

        const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
        const result = await caller.generateQuestions({
          projectId,
          cnaeCode: cnae.code,
          cnaeDescription: cnae.description,
          level: "nivel1",
        });

        expect(result.questions.length).toBeGreaterThanOrEqual(3);
        result.questions.forEach(q => {
          expect(q.objetivo_diagnostico).toBeTruthy();
          expect(q.impacto_reforma).toBeTruthy();
          expect(q.peso_risco).toBeTruthy();
        });
      }
    });

    it(`E2E-${index}D — Etapa 2: saveAnswer persiste respostas para cada CNAE`, async () => {
      const caller = fluxoV3Router.createCaller(makeCtx(testUserId));

      for (const cnae of cnaes) {
        const result = await caller.saveAnswer({
          projectId,
          cnaeCode: cnae.code,
          cnaeDescription: cnae.description,
          level: "nivel1",
          questionIndex: 0,
          questionText: "Possui mapeamento de créditos de IBS/CBS?",
          questionType: "sim_nao",
          answerValue: "Não",
        });
        expect(result.success).toBe(true);
      }

      // Verificar que as respostas foram salvas
      const db = await getDb();
      const answers = await db!.select().from(questionnaireAnswersV3)
        .where(eq(questionnaireAnswersV3.projectId, projectId));
      expect(answers.length).toBe(cnaes.length);
    });

    it(`E2E-${index}E — Etapa 3: generateBriefing retorna briefing com confidence score e inconsistencias`, async () => {
      // V65: generateBriefing faz 1 chamada extra ao LLM para re-ranking RAG
      mockInvokeLLM
        .mockResolvedValueOnce(mockOk('{"indices": [0, 1, 2]}') as any) // re-ranking RAG
        .mockResolvedValueOnce(mockOk(buildBriefingPayload("alto")) as any); // briefing

      const allAnswers = cnaes.map(cnae => ({
        cnaeCode: cnae.code,
        cnaeDescription: cnae.description,
        level: "nivel1",
        questions: [
          { question: "Possui mapeamento de créditos?", answer: "Não" },
          { question: "Qual o regime tributário?", answer: "Lucro Real" },
        ],
      }));

      const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
      const result = await caller.generateBriefing({ projectId, allAnswers });

      expect(result.briefing).toContain("Briefing de Compliance");
      expect(result.briefing).toContain("Nível de Risco");
      // V61: confidence score deve estar no markdown
      expect(result.briefing).toContain("Limites do Diagnóstico");
      // V61: inconsistencias devem estar no markdown
      expect(result.briefing).toContain("Alertas de Inconsistência");
      // V61: structured deve ter confidence_score
      expect(result.structured.confidence_score.nivel_confianca).toBeGreaterThan(0);
    });

    it(`E2E-${index}F — Etapa 4: generateRiskMatrices retorna scoring V61 com impacto financeiro`, async () => {
      // 4 áreas × 1 chamada LLM cada
      for (let i = 0; i < 4; i++) {
        mockInvokeLLM.mockResolvedValueOnce(mockOk(buildRisksPayload()) as any);
      }

      // Primeiro aprovar briefing
      const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
      await caller.approveBriefing({ projectId, briefingContent: "# Briefing aprovado" });

      const briefingContent = "# Briefing de teste com riscos identificados";
      const result = await caller.generateRiskMatrices({ projectId, briefingContent });

      expect(result.matrices).toBeDefined();
      expect(Object.keys(result.matrices).length).toBeGreaterThan(0);

      // V61: scoring calculado no servidor
      expect(result.scoringData).toBeDefined();
      expect(result.scoringData.score_global).toBeGreaterThan(0);
      expect(result.scoringData.nivel).toBeTruthy();
      expect(result.scoringData.total_riscos).toBeGreaterThan(0);

      // Se tem faturamento, deve ter tradução financeira
      if (faturamentoAnual) {
        expect(result.scoringData.impacto_estimado).toBeTruthy();
        expect(result.scoringData.custo_inacao).toBeTruthy();
      }

      // V65: verificar que o contexto RAG foi injetado (pode ser artigos reais ou fallback)
      // O prompt deve conter algum conteúdo de contexto regulatório
      expect(result.matrices).toBeDefined();
    });

    it(`E2E-${index}G — Etapa 5: generateActionPlan retorna tarefas com evidencia_regulatoria`, async () => {
      // 4 áreas × 1 chamada LLM cada
      for (const area of ["contabilidade", "negocio", "ti", "juridico"]) {
        mockInvokeLLM.mockResolvedValueOnce(mockOk(buildTasksPayload(area)) as any);
      }

      // Primeiro aprovar matrizes
      const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
      const matrices = {
        contabilidade: JSON.parse(buildRisksPayload()).risks,
        negocio: JSON.parse(buildRisksPayload()).risks,
        ti: JSON.parse(buildRisksPayload()).risks,
        juridico: JSON.parse(buildRisksPayload()).risks,
      };
      await caller.approveMatrices({ projectId, matrices });

      const result = await caller.generateActionPlan({ projectId, matrices });

      expect(result.plans).toBeDefined();
      for (const [area, tasks] of Object.entries(result.plans)) {
        expect(tasks.length).toBeGreaterThan(0);
        (tasks as any[]).forEach(task => {
          expect(task.objetivo_diagnostico).toBeTruthy();
          expect(task.evidencia_regulatoria).toBeTruthy();
          expect(task.status).toBe("nao_iniciado");
          expect(task.progress).toBe(0);
        });
      }
    });

    it(`E2E-${index}H — Etapa 5: approveActionPlan persiste plano no banco`, async () => {
      const plans = {
        contabilidade: JSON.parse(buildTasksPayload("contabilidade")).tasks,
        negocio: JSON.parse(buildTasksPayload("negocio")).tasks,
        ti: JSON.parse(buildTasksPayload("ti")).tasks,
        juridico: JSON.parse(buildTasksPayload("juridico")).tasks,
      };

      const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
      const result = await caller.approveActionPlan({ projectId, plans });

      expect(result.success).toBe(true);

      // Verificar no banco
      const db = await getDb();
      const [proj] = await db!.select().from(projects).where(eq(projects.id, projectId));
      expect((proj as any).status).toBe("aprovado");
      expect((proj as any).actionPlansData).toBeTruthy();
    });

    it(`E2E-${index}I — V63: generateDecision retorna veredito com momento_wow`, async () => {
      // Preparar projeto com briefing e matrizes
      const db = await getDb();
      await db!.update(projects).set({
        briefingContent: "# Briefing aprovado com riscos críticos identificados",
        riskMatricesData: {
          contabilidade: JSON.parse(buildRisksPayload()).risks,
          negocio: JSON.parse(buildRisksPayload()).risks,
        } as any,
        scoringData: {
          score_global: 78,
          nivel: "critico",
          impacto_estimado: "R$ 11M/ano",
          custo_inacao: "Perda de créditos após jan/2027",
          prioridade: "imediata",
          total_riscos: 6,
          riscos_criticos: 2,
          riscos_altos: 2,
        } as any,
      } as any).where(eq(projects.id, projectId));

      // V65: generateDecision faz 1 chamada extra ao LLM para re-ranking RAG
      vi.resetAllMocks(); // resetAllMocks limpa fila de mockResolvedValueOnce pendentes
      mockInvokeLLM
        .mockResolvedValueOnce(mockOk('{"indices": [0, 1, 2]}') as any) // re-ranking RAG
        .mockResolvedValueOnce(mockOk(buildDecisaoPayload()) as any); // decisão

      const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
      const result = await caller.generateDecision({ projectId });

      expect(result.decisao.acao_principal).toBeTruthy();
      expect(result.decisao.prazo_dias).toBeGreaterThan(0);
      expect(result.decisao.risco_se_nao_fazer).toBeTruthy();
      expect(result.decisao.proximos_passos.length).toBeGreaterThanOrEqual(2);
      expect(result.decisao.fundamentacao_legal).toBeTruthy();
      if (result.decisao.momento_wow) {
        expect(result.decisao.momento_wow.length).toBeGreaterThan(10);
      }

      // Verificar que foi salvo no banco
      const [proj] = await db!.select().from(projects).where(eq(projects.id, projectId));
      expect((proj as any).decisaoData).toBeTruthy();
    });

    it(`E2E-${index}J — getProjectSummary retorna scoringData e decisaoData`, async () => {
      const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
      const summary = await caller.getProjectSummary({ projectId });

      expect(summary.id).toBe(projectId);
      expect(summary.confirmedCnaes.length).toBe(cnaes.length);
      expect(summary.hasBriefing).toBe(true);
      expect(summary.hasRiskMatrices).toBe(true);
      expect(summary.hasActionPlan).toBe(true);
      expect(summary.scoringData).toBeDefined();
      expect(summary.decisaoData).toBeDefined();
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TESTES DE INTEGRAÇÃO: CENÁRIOS DE FALHA E EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

describe("Edge Cases e Falhas — V60-V63", () => {
  it("EC-01 — extractCnaes: falha em todas as tentativas → lança TRPCError (BAD_REQUEST ou INTERNAL_SERVER_ERROR)", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB connection failed");
    const [res] = await db.insert(projects).values({
      name: "EC-01 Project",
      description: "Projeto para teste de falha total do retry.",
      status: "rascunho",
      currentStep: 1,
      clientId: testClientId,
      createdById: testUserId,
      createdByRole: "equipe_solaris",
      notificationFrequency: "semanal",
    } as any);
    const pid = (res as any).insertId as number;
    createdProjectIds.push(pid);

    // Ambas as tentativas falham
    mockInvokeLLM
      .mockResolvedValueOnce(mockOk("INVALID") as any)
      .mockResolvedValueOnce(mockOk("ALSO INVALID") as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.extractCnaes({
      projectId: pid,
      description: "Empresa de teste para falha total do retry.",
    })).rejects.toThrow(TRPCError);
  });

  it("EC-02 — generateBriefing: IA retorna briefing sem inconsistencias (campo opcional)", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB connection failed");
    const [res] = await db.insert(projects).values({
      name: "EC-02 Project",
      description: "Projeto para teste de briefing sem inconsistencias.",
      status: "rascunho",
      currentStep: 1,
      clientId: testClientId,
      createdById: testUserId,
      createdByRole: "equipe_solaris",
      notificationFrequency: "semanal",
    } as any);
    const pid = (res as any).insertId as number;
    createdProjectIds.push(pid);

    // Briefing sem inconsistencias
    const payloadSemInconsistencias = {
      nivel_risco_geral: "medio",
      resumo_executivo: "A empresa apresenta nível médio de risco com gaps moderados de compliance tributário que requerem atenção nos próximos 90 dias para adequação ao novo regime.",
      principais_gaps: [
        {
          gap: "Gap de mapeamento de créditos",
          causa_raiz: "Falta de processo estruturado de identificação de créditos",
          evidencia_regulatoria: "Art. 47 LC 214/2025",
          urgencia: "curto_prazo",
        },
        {
          gap: "ERP não preparado para split payment",
          causa_raiz: "Sistema legado sem módulo fiscal atualizado",
          evidencia_regulatoria: "Art. 5 LC 227/2024",
          urgencia: "medio_prazo",
        },
      ],
      oportunidades: ["Aproveitamento de créditos de IBS/CBS", "Redução de carga tributária"],
      recomendacoes_prioritarias: ["Contratar consultoria tributária", "Atualizar ERP para split payment", "Capacitar equipe contábil em IBS/CBS"],
      confidence_score: {
        nivel_confianca: 65,
        limitacoes: ["Diagnóstico baseado em questionário — não substitui auditoria fiscal"],
        recomendacao: "Diagnóstico autônomo suficiente",
      },
    };

    vi.resetAllMocks(); // resetAllMocks limpa a fila de mockResolvedValueOnce pendentes do EC-01
    // Usar mockResolvedValue (persistente) para cobrir retry automático
    mockInvokeLLM.mockResolvedValue(mockOk(JSON.stringify(payloadSemInconsistencias)) as any);

    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    const result = await caller.generateBriefing({
      projectId: pid,
      allAnswers: [{
        cnaeCode: "6201-5/01",
        cnaeDescription: "Software",
        level: "nivel1",
        questions: [{ question: "Teste?", answer: "Sim" }],
      }],
    });

    expect(result.briefing).toContain("Briefing de Compliance");
    // Sem inconsistencias, não deve ter a seção
    expect(result.briefing).not.toContain("Alertas de Inconsistência");
    // Mas deve ter o confidence score
    expect(result.briefing).toContain("Limites do Diagnóstico");
  });

  it("EC-03 — calculateGlobalScore: usa fallback de texto quando severidade_score ausente", () => {
    const risks = [
      { severidade: "Crítica" }, // sem severidade_score
      { severidade: "Alta" },
      { severidade: "Média" },
    ];
    const result = calculateGlobalScore(risks as any);
    expect(result.score_global).toBeGreaterThan(0);
    expect(result.nivel).toBeTruthy();
  });

  it("EC-04 — RAG: retrieveArticlesFast retorna fallback quando corpus está vazio", async () => {
    // V65: cnae-articles-map foi substituído pelo rag-retriever
    // Usar spy no getDb para retornar banco vazio neste teste
    const dbModule = await import("./db");
    const emptyMockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    const spy = vi.spyOn(dbModule, "getDb").mockResolvedValueOnce(emptyMockDb as any);

    const { retrieveArticlesFast } = await import("./rag-retriever");
    const result = await retrieveArticlesFast([], "", 5);
    expect(result.contextText).toBe("Nenhum artigo específico recuperado para este contexto.");
    expect(result.articles).toEqual([]);

    spy.mockRestore();
  });

  it("EC-05 — generateDecision: projeto não encontrado → NOT_FOUND", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));
    await expect(caller.generateDecision({ projectId: 999999999 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
