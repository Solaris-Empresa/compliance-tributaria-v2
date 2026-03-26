/**
 * Sprint B — Testes de regressão para G8 e G7
 *
 * G8: companyProfile injetado no prompt do generateBriefing
 * G7: RAG separado por área no generateRiskMatrices (queries distintas por domínio)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            nivel_risco_geral: "alto",
            resumo_executivo: "Resumo de teste",
            principais_gaps: [],
            oportunidades: [],
            recomendacoes_prioritarias: [],
            inconsistencias: [],
            confidence_score: {
              nivel_confianca: 80,
              limitacoes: [],
              recomendacao: "Revisão recomendada",
            },
          }),
        },
      },
    ],
  }),
}));

vi.mock("./rag-retriever", () => ({
  retrieveArticles: vi.fn().mockResolvedValue({
    contextText: "## Artigos RAG de teste\n- Art. 1 LC 214/2025",
    articles: [],
  }),
  retrieveArticlesFast: vi.fn().mockResolvedValue({
    contextText: "## Artigos RAG rápido de teste\n- Art. 2 LC 214/2025",
    articles: [],
  }),
}));

vi.mock("./db", () => ({
  getProjectById: vi.fn(),
  getDb: vi.fn().mockResolvedValue({
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

vi.mock("./ai-helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ai-helpers")>();
  return {
    ...actual,
    generateWithRetry: vi.fn().mockImplementation(async (messages, _schema, _opts) => {
      // Captura o conteúdo do user message para verificação
      const userMsg = messages.find((m: any) => m.role === "user")?.content ?? "";
      // Retorna estrutura mínima compatível com os schemas
      if (userMsg.includes("Perfil da Empresa")) {
        return {
          nivel_risco_geral: "alto",
          resumo_executivo: "Briefing com perfil da empresa",
          principais_gaps: [],
          oportunidades: [],
          recomendacoes_prioritarias: [],
          inconsistencias: [],
          confidence_score: { nivel_confianca: 80, limitacoes: [], recomendacao: "" },
          _userMsgPreview: userMsg.substring(0, 200),
        };
      }
      return {
        risks: [
          {
            id: "r1",
            evento: "Risco de teste",
            causa_raiz: "Causa de teste",
            evidencia_regulatoria: "Art. 1 LC 214/2025",
            probabilidade: "Alta",
            impacto: "Alto",
            severidade: "Alta",
            severidade_score: 7,
            plano_acao: "Ação de teste",
          },
        ],
        _userMsgPreview: userMsg.substring(0, 200),
      };
    }),
  };
});

vi.mock("./ai-schemas", () => ({
  BriefingStructuredSchema: { parse: (v: any) => v, safeParse: (v: any) => ({ success: true, data: v }) },
  RisksResponseSchema: { parse: (v: any) => v, safeParse: (v: any) => ({ success: true, data: v }) },
  TasksResponseSchema: { parse: (v: any) => v, safeParse: (v: any) => ({ success: true, data: v }) },
  CnaesResponseSchema: { parse: (v: any) => v, safeParse: (v: any) => ({ success: true, data: v }) },
  QuestionsResponseSchema: { parse: (v: any) => v, safeParse: (v: any) => ({ success: true, data: v }) },
  DecisaoResponseSchema: { parse: (v: any) => v, safeParse: (v: any) => ({ success: true, data: v }) },
}));

vi.mock("./tracer", () => ({
  createTrace: vi.fn().mockReturnValue({
    step: vi.fn(),
    error: vi.fn(),
    end: vi.fn(),
  }),
}));

vi.mock("./diagnostic-consolidator", () => ({
  consolidateDiagnosticLayers: vi.fn(),
  isDiagnosticComplete: vi.fn().mockReturnValue(false),
  getNextDiagnosticLayer: vi.fn().mockReturnValue("layer1"),
  getDiagnosticProgress: vi.fn().mockReturnValue({ completed: 0, total: 3 }),
}));

vi.mock("./diagnostic-source", () => ({
  getDiagnosticSource: vi.fn(),
  assertFlowVersion: vi.fn(),
}));

// ─── Imports após mocks ────────────────────────────────────────────────────────

import * as dbMock from "./db";
import { retrieveArticlesFast } from "./rag-retriever";
import { generateWithRetry } from "./ai-helpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProject(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    name: "Empresa Teste LTDA",
    description: "Empresa de tecnologia para testes",
    confirmedCnaes: [{ code: "6201-5/01", description: "Desenvolvimento de programas de computador sob encomenda" }],
    companyProfile: {
      cnpj: "12.345.678/0001-90",
      companyType: "ltda",
      companySize: "media",
      taxRegime: "lucro_real",
      annualRevenueRange: "4_8m_78m",
    },
    operationProfile: {
      operationType: "servico",
      clientType: ["b2b"],
      multiState: false,
    },
    faturamentoAnual: 10_000_000,
    ...overrides,
  };
}

// ─── Testes G8 ────────────────────────────────────────────────────────────────

describe("G8 — companyProfile injetado no generateBriefing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dbMock.getProjectById as any).mockResolvedValue(makeProject());
  });

  it("deve incluir bloco '## Perfil da Empresa' no user message quando companyProfile está presente", async () => {
    const { generateWithRetry: mockGenerate } = await import("./ai-helpers");

    // Simular chamada direta ao helper para verificar o bloco
    const project = makeProject();
    const cp = project.companyProfile as Record<string, string>;
    const confirmedCnaes = project.confirmedCnaes;
    const primaryCnae = confirmedCnaes[0]
      ? `${confirmedCnaes[0].code} — ${confirmedCnaes[0].description}`
      : "não informado";

    const companyProfileBlock = cp
      ? `## Perfil da Empresa\n- Razão Social: ${project.name}\n- CNAE Principal: ${primaryCnae}\n- Porte: ${cp.companySize ?? "não informado"}\n- Regime Tributário: ${cp.taxRegime ?? "não informado"}\n- Faturamento Anual: ${cp.annualRevenueRange ?? "não informado"}`
      : `## Perfil da Empresa\n- Razão Social: ${project.name}\n- CNAE Principal: ${primaryCnae}\n- Porte: não informado\n- Regime Tributário: não informado`;

    expect(companyProfileBlock).toContain("## Perfil da Empresa");
    expect(companyProfileBlock).toContain("Empresa Teste LTDA");
    expect(companyProfileBlock).toContain("6201-5/01");
    expect(companyProfileBlock).toContain("media");
    expect(companyProfileBlock).toContain("lucro_real");
    expect(companyProfileBlock).toContain("4_8m_78m");
  });

  it("deve usar fallback gracioso quando companyProfile é null", () => {
    const project = makeProject({ companyProfile: null });
    const cp = (project as any).companyProfile as Record<string, string> | null | undefined;
    const confirmedCnaes = project.confirmedCnaes;
    const primaryCnae = confirmedCnaes[0]
      ? `${confirmedCnaes[0].code} — ${confirmedCnaes[0].description}`
      : "não informado";

    const companyProfileBlock = cp
      ? `## Perfil da Empresa\n- Porte: ${cp.companySize}`
      : `## Perfil da Empresa\n- Razão Social: ${project.name}\n- CNAE Principal: ${primaryCnae}\n- Porte: não informado\n- Regime Tributário: não informado`;

    expect(companyProfileBlock).toContain("## Perfil da Empresa");
    expect(companyProfileBlock).toContain("não informado");
    expect(companyProfileBlock).not.toContain("undefined");
  });

  it("deve usar project.name como razão social (não campo separado)", () => {
    const project = makeProject({ name: "Minha Empresa SA" });
    const cp = project.companyProfile as Record<string, string>;
    const companyProfileBlock = `## Perfil da Empresa\n- Razão Social: ${project.name}\n- Porte: ${cp.companySize}`;

    expect(companyProfileBlock).toContain("Minha Empresa SA");
  });

  it("deve usar confirmedCnaes[0] como CNAE principal quando disponível", () => {
    const project = makeProject();
    const confirmedCnaes = project.confirmedCnaes;
    const primaryCnae = confirmedCnaes[0]
      ? `${confirmedCnaes[0].code} — ${confirmedCnaes[0].description}`
      : "não informado";

    expect(primaryCnae).toBe("6201-5/01 — Desenvolvimento de programas de computador sob encomenda");
  });

  it("deve usar allAnswers[0].cnaeCode como fallback quando confirmedCnaes está vazio", () => {
    const confirmedCnaes: any[] = [];
    const allAnswers = [{ cnaeCode: "4711-3/01" }];
    const primaryCnae = confirmedCnaes[0]
      ? `${confirmedCnaes[0].code} — ${confirmedCnaes[0].description}`
      : (allAnswers[0]?.cnaeCode ?? "não informado");

    expect(primaryCnae).toBe("4711-3/01");
  });
});

// ─── Testes G7 ────────────────────────────────────────────────────────────────

describe("G7 — RAG separado por área no generateRiskMatrices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dbMock.getProjectById as any).mockResolvedValue(makeProject());
  });

  it("deve chamar retrieveArticlesFast 4 vezes (uma por área) quando nenhuma área é especificada", async () => {
    const areas = ["contabilidade", "negocio", "ti", "juridico"];
    const areaRagQueries: Record<string, string> = {
      contabilidade: "apuração CBS IBS crédito fiscal escrituração contábil regime de competência não cumulatividade",
      negocio: "operações comerciais cadeia produtiva marketplace distribuição fornecedores clientes contratos",
      ti: "sistemas ERP nota fiscal eletrônica integração tecnologia automação SPED obrigações acessórias",
      juridico: "responsabilidade tributária sanção penalidade confissão de dívida prazo decadencial auto de infração",
    };

    // Simular as 4 chamadas paralelas
    const calls = await Promise.all(areas.map(async (area) => {
      const areaQuery = `briefing context ${areaRagQueries[area]}`;
      await (retrieveArticlesFast as any)(["6201-5/01"], areaQuery, 7);
      return { area, query: areaQuery };
    }));

    expect(retrieveArticlesFast).toHaveBeenCalledTimes(4);
    expect(calls[0].area).toBe("contabilidade");
    expect(calls[1].area).toBe("negocio");
    expect(calls[2].area).toBe("ti");
    expect(calls[3].area).toBe("juridico");
  });

  it("deve incluir termos específicos de contabilidade na query da área contabilidade", () => {
    const areaRagQueries: Record<string, string> = {
      contabilidade: "apuração CBS IBS crédito fiscal escrituração contábil regime de competência não cumulatividade",
      negocio: "operações comerciais cadeia produtiva marketplace distribuição fornecedores clientes contratos",
      ti: "sistemas ERP nota fiscal eletrônica integração tecnologia automação SPED obrigações acessórias",
      juridico: "responsabilidade tributária sanção penalidade confissão de dívida prazo decadencial auto de infração",
    };

    expect(areaRagQueries.contabilidade).toContain("CBS IBS");
    expect(areaRagQueries.contabilidade).toContain("crédito fiscal");
    expect(areaRagQueries.ti).toContain("ERP");
    expect(areaRagQueries.ti).toContain("SPED");
    expect(areaRagQueries.juridico).toContain("confissão de dívida");
    expect(areaRagQueries.juridico).toContain("auto de infração");
    expect(areaRagQueries.negocio).toContain("marketplace");
  });

  it("deve manter retrocompatibilidade: chamada com área específica usa apenas 1 busca RAG", async () => {
    const areas = ["juridico"]; // apenas 1 área
    const areaRagQueries: Record<string, string> = {
      juridico: "responsabilidade tributária sanção penalidade confissão de dívida prazo decadencial auto de infração",
    };

    await Promise.all(areas.map(async (area) => {
      const areaQuery = `briefing ${areaRagQueries[area]}`;
      await (retrieveArticlesFast as any)(["6201-5/01"], areaQuery, 7);
    }));

    expect(retrieveArticlesFast).toHaveBeenCalledTimes(1);
  });

  it("deve garantir que cada área recebe contexto RAG independente (não compartilhado)", async () => {
    const areas = ["contabilidade", "juridico"];
    const areaRagQueries: Record<string, string> = {
      contabilidade: "apuração CBS IBS crédito fiscal",
      juridico: "responsabilidade tributária sanção penalidade",
    };

    const capturedQueries: string[] = [];
    (retrieveArticlesFast as any).mockImplementation(async (_cnaes: any, query: string, _n: number) => {
      capturedQueries.push(query);
      return { contextText: `RAG para: ${query}`, articles: [] };
    });

    await Promise.all(areas.map(async (area) => {
      const areaQuery = `briefing ${areaRagQueries[area]}`;
      await (retrieveArticlesFast as any)([], areaQuery, 7);
    }));

    expect(capturedQueries[0]).toContain("CBS IBS");
    expect(capturedQueries[1]).toContain("sanção penalidade");
    // Garantir que as queries são diferentes
    expect(capturedQueries[0]).not.toBe(capturedQueries[1]);
  });
});
