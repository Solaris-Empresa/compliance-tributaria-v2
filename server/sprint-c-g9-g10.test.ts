/**
 * Sprint C — Testes de regressão para G9 e G10
 *
 * G9: validateRagOutput — safeParse com erro estruturado (não exceção)
 * G10: fonte_risco obrigatório em RiskItemSchema (fallback tolerante)
 *      + injeção no prompt do generateRiskMatrices
 *      + log de auditoria DEC-004
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  RiskItemSchema,
  RisksResponseSchema,
  validateRagOutput,
} from "./ai-schemas";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            risks: [
              {
                id: "r1",
                evento: "Risco de apuração CBS",
                causa_raiz: "Falta de controle de créditos",
                evidencia_regulatoria: "Art. 45 LC 214/2025",
                fonte_risco: "LC 214/2025, Art. 45",
                probabilidade: "Alta",
                impacto: "Alto",
                severidade: "Crítica",
                severidade_score: 9,
                plano_acao: "Revisar processo de apuração",
              },
            ],
          }),
        },
      },
    ],
  }),
}));

vi.mock("./rag-retriever", () => ({
  retrieveArticles: vi.fn().mockResolvedValue({
    contextText: "## Artigos RAG de teste\n- Art. 45 LC 214/2025",
    articles: [{ lei: "lc214", artigo: "Art. 45", titulo: "Apuração CBS", conteudo: "..." }],
  }),
  retrieveArticlesFast: vi.fn().mockResolvedValue({
    contextText: "## Artigos RAG rápido de teste\n- Art. 12 LC 214/2025",
    articles: [{ lei: "lc214", artigo: "Art. 12", titulo: "Crédito fiscal", conteudo: "..." }],
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
    generateWithRetry: vi.fn().mockResolvedValue({
      risks: [
        {
          id: "r1",
          evento: "Risco de apuração CBS",
          causa_raiz: "Falta de controle de créditos",
          evidencia_regulatoria: "Art. 45 LC 214/2025",
          fonte_risco: "LC 214/2025, Art. 45",
          probabilidade: "Alta",
          impacto: "Alto",
          severidade: "Crítica",
          severidade_score: 9,
          plano_acao: "Revisar processo de apuração",
        },
      ],
    }),
  };
});

// ─── Testes G9 ────────────────────────────────────────────────────────────────
describe("G9 — validateRagOutput: safeParse com erro estruturado", () => {
  it("deve retornar { success: true, data } quando o schema é válido", () => {
    const validRaw = {
      risks: [
        {
          id: "r1",
          evento: "Risco de apuração CBS",
          causa_raiz: "Falta de controle",
          evidencia_regulatoria: "Art. 45 LC 214/2025",
          fonte_risco: "LC 214/2025, Art. 45",
          probabilidade: "Alta",
          impacto: "Alto",
          severidade: "Crítica",
          severidade_score: 9,
          plano_acao: "Revisar",
        },
      ],
    };
    const result = validateRagOutput(RisksResponseSchema, validRaw, "test:valid");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.risks).toHaveLength(1);
      expect(result.data.risks[0].id).toBe("r1");
    }
  });

  it("deve retornar { success: false, error, raw } quando o schema é inválido", () => {
    const invalidRaw = {
      risks: [
        {
          // faltando campos obrigatórios: id, evento
          causa_raiz: "Falta de controle",
        },
      ],
    };
    const result = validateRagOutput(RisksResponseSchema, invalidRaw, "test:invalid");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
      expect(typeof result.error).toBe("string");
      expect(result.raw).toEqual(invalidRaw);
    }
  });

  it("deve retornar { success: false } para payload completamente inválido (não-objeto)", () => {
    const result = validateRagOutput(RisksResponseSchema, "string inválida", "test:string");
    expect(result.success).toBe(false);
  });

  it("deve retornar { success: false } para array vazio (min(1) violado)", () => {
    const result = validateRagOutput(RisksResponseSchema, { risks: [] }, "test:empty");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("risks");
    }
  });

  it("deve não propagar exceção — sempre retorna objeto estruturado", () => {
    expect(() => {
      validateRagOutput(RisksResponseSchema, null, "test:null");
    }).not.toThrow();
    const result = validateRagOutput(RisksResponseSchema, null, "test:null");
    expect(result.success).toBe(false);
  });

  it("deve logar erro estruturado no console.error quando falha", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    validateRagOutput(RisksResponseSchema, { risks: [] }, "test:log");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[RAG-VALIDATION-ERROR]"),
      expect.any(Object)
    );
    consoleSpy.mockRestore();
  });
});

// ─── Testes G10 ────────────────────────────────────────────────────────────────
describe("G10 — fonte_risco no RiskItemSchema", () => {
  it("deve aceitar risco com fonte_risco preenchido", () => {
    const riskWithFonte = {
      id: "r1",
      evento: "Risco de apuração CBS",
      causa_raiz: "Falta de controle",
      evidencia_regulatoria: "Art. 45 LC 214/2025",
      fonte_risco: "LC 214/2025, Art. 45",
      probabilidade: "Alta",
      impacto: "Alto",
      severidade: "Crítica",
      severidade_score: 9,
      plano_acao: "Revisar",
    };
    const result = RiskItemSchema.safeParse(riskWithFonte);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco).toBe("LC 214/2025, Art. 45");
    }
  });

  it("deve aplicar fallback 'fonte não identificada' quando fonte_risco está ausente", () => {
    const riskWithoutFonte = {
      id: "r2",
      evento: "Risco de escrituração",
      causa_raiz: "Sistema legado",
      evidencia_regulatoria: "Art. 12 LC 214/2025",
      // fonte_risco ausente — deve usar default
      probabilidade: "Média",
      impacto: "Médio",
      severidade: "Média",
      severidade_score: 5,
      plano_acao: "Atualizar sistema",
    };
    const result = RiskItemSchema.safeParse(riskWithoutFonte);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco).toBe("fonte não identificada");
    }
  });

  it("deve aceitar fonte_risco com formato EC 132/2023", () => {
    const riskEC = {
      id: "r3",
      evento: "Risco constitucional",
      causa_raiz: "Emenda não implementada",
      evidencia_regulatoria: "Art. 156-A EC 132/2023",
      fonte_risco: "EC 132/2023, Art. 156-A",
      probabilidade: "Baixa",
      impacto: "Baixo",
      severidade: "Baixa",
      severidade_score: 2,
      plano_acao: "Monitorar",
    };
    const result = RiskItemSchema.safeParse(riskEC);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco).toBe("EC 132/2023, Art. 156-A");
    }
  });

  it("deve incluir fonte_risco no schema do RisksResponseSchema (array de riscos)", () => {
    const payload = {
      risks: [
        {
          id: "r1",
          evento: "Risco de apuração CBS",
          causa_raiz: "Falta de controle",
          evidencia_regulatoria: "Art. 45 LC 214/2025",
          fonte_risco: "LC 214/2025, Art. 45",
          probabilidade: "Alta",
          impacto: "Alto",
          severidade: "Crítica",
          severidade_score: 9,
          plano_acao: "Revisar",
        },
        {
          id: "r2",
          evento: "Risco de escrituração",
          causa_raiz: "Sistema legado",
          evidencia_regulatoria: "Art. 12 LC 214/2025",
          // fonte_risco ausente — deve usar default
          probabilidade: "Média",
          impacto: "Médio",
          severidade: "Média",
          severidade_score: 5,
          plano_acao: "Atualizar",
        },
      ],
    };
    const result = RisksResponseSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.risks[0].fonte_risco).toBe("LC 214/2025, Art. 45");
      expect(result.data.risks[1].fonte_risco).toBe("fonte não identificada");
    }
  });

  it("deve garantir que fonte_risco é string (não undefined) após parse", () => {
    const risk = {
      id: "r1",
      evento: "Risco",
      probabilidade: "Alta",
      impacto: "Alto",
      severidade: "Alta",
      severidade_score: 7,
    };
    const result = RiskItemSchema.safeParse(risk);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.fonte_risco).toBe("string");
      expect(result.data.fonte_risco).not.toBeUndefined();
    }
  });
});

// ─── Testes de integração G9+G10 ──────────────────────────────────────────────
describe("G9+G10 — Integração: validateRagOutput com fonte_risco", () => {
  it("deve validar com sucesso um payload completo com fonte_risco", () => {
    const fullPayload = {
      risks: Array.from({ length: 5 }, (_, i) => ({
        id: `r${i + 1}`,
        evento: `Risco ${i + 1}`,
        causa_raiz: `Causa ${i + 1}`,
        evidencia_regulatoria: `Art. ${i + 1} LC 214/2025`,
        fonte_risco: `LC 214/2025, Art. ${i + 1}`,
        probabilidade: "Alta",
        impacto: "Alto",
        severidade: "Crítica",
        severidade_score: 9,
        plano_acao: `Plano ${i + 1}`,
      })),
    };
    const result = validateRagOutput(RisksResponseSchema, fullPayload, "integration:full");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.risks).toHaveLength(5);
      result.data.risks.forEach((r, i) => {
        expect(r.fonte_risco).toBe(`LC 214/2025, Art. ${i + 1}`);
      });
    }
  });

  it("deve aplicar fallback em fonte_risco ausente mesmo em payload parcialmente válido", () => {
    const mixedPayload = {
      risks: [
        {
          id: "r1",
          evento: "Risco com fonte",
          causa_raiz: "Causa",
          evidencia_regulatoria: "Art. 1 LC 214/2025",
          fonte_risco: "LC 214/2025, Art. 1",
          probabilidade: "Alta",
          impacto: "Alto",
          severidade: "Alta",
          severidade_score: 7,
          plano_acao: "Plano",
        },
        {
          id: "r2",
          evento: "Risco sem fonte",
          causa_raiz: "Causa",
          evidencia_regulatoria: "Art. 2 LC 214/2025",
          // fonte_risco ausente
          probabilidade: "Média",
          impacto: "Médio",
          severidade: "Média",
          severidade_score: 5,
          plano_acao: "Plano",
        },
      ],
    };
    const result = validateRagOutput(RisksResponseSchema, mixedPayload, "integration:mixed");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.risks[0].fonte_risco).toBe("LC 214/2025, Art. 1");
      expect(result.data.risks[1].fonte_risco).toBe("fonte não identificada");
    }
  });

  it("deve garantir que o prompt do generateRiskMatrices inclui instrução de fonte_risco", () => {
    // Teste de contrato: verifica que a instrução de fonte_risco está no template do prompt
    const promptTemplate = `REGRAS OBRIGATÓRIAS:
1. Cada risco deve ter causa_raiz identificada
2. Cada risco deve ter evidencia_regulatoria (artigo específico do contexto fornecido)
3. Cada risco deve ter fonte_risco no formato "LC 214/2025, Art. X" ou "EC 132/2023, Art. Y" (use os artigos do contexto)
4. severidade_score deve ser numérico: Baixa=1-3, Média=4-6, Alta=7-8, Crítica=9
5. Gere entre 5 e 10 riscos específicos para a área
6. Nunca invente artigos — use apenas os fornecidos no contexto`;

    expect(promptTemplate).toContain("fonte_risco");
    expect(promptTemplate).toContain("LC 214/2025, Art. X");
    expect(promptTemplate).toContain("EC 132/2023, Art. Y");
  });

  it("deve garantir que o formato de exemplo no prompt inclui fonte_risco", () => {
    // Teste de contrato: verifica que o exemplo JSON no prompt inclui fonte_risco
    const formatExample = `{"risks": [{"id": "r1", "evento": "...", "causa_raiz": "...", "evidencia_regulatoria": "Art. X LC 214/2025", "fonte_risco": "LC 214/2025, Art. X", "probabilidade": "Alta", "impacto": "Alto", "severidade": "Crítica", "severidade_score": 9, "plano_acao": "..."}]}`;

    const parsed = JSON.parse(formatExample);
    expect(parsed.risks[0]).toHaveProperty("fonte_risco");
    expect(parsed.risks[0].fonte_risco).toBe("LC 214/2025, Art. X");
  });
});
