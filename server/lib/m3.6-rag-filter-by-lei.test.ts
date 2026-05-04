/**
 * m3.6-rag-filter-by-lei.test.ts
 * Sprint M3.6 — Test contracts (it) para Bug P0 (RAG filter por lei)
 *
 * Issue: #932
 * PR: implementação M3.6 (label `m3.6-impl`)
 *
 * REGRA-ORQ-27 (Lição #59): cada teste valida CONSUMPTION efetivo via spy
 * (não apenas assemble point). Como `inArray` é named export de ESM
 * `drizzle-orm` (read-only), usamos `vi.mock()` factory para wrappear com
 * `vi.fn()` que rastreia chamadas preservando o comportamento original.
 *
 * Vinculadas:
 * - Issue #932 (M3.6 — RAG filter por lei + IA Gen description)
 * - PR #918 (M3-AC-11/12 padrão de spy queryRagFn já estabelecido)
 * - REGRA-ORQ-27 (PR #917)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock de drizzle-orm: wrappa inArray com vi.fn rastreável ─────────────
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    inArray: vi.fn(actual.inArray),
  };
});

// ── Mock de getDb: captura where clause sem hit em DB real ───────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockImplementation(async () => ({
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([]) }),
        limit: () => Promise.resolve([]),
      }),
    }),
    insert: () => ({ values: () => Promise.resolve() }),
  })),
}));

// Mocks para Q.NBS (generateServiceQuestions)
vi.mock("./tracked-question", () => ({
  generateQuestionFromChunk: vi.fn().mockResolvedValue("Pergunta mock"),
  extractLeiRef: vi.fn().mockReturnValue("LC 214/2025 art. 1"),
  inferCategoria: vi.fn().mockReturnValue("ibs_cbs"),
  extractLeiRefFromSolaris: vi.fn().mockReturnValue("LC 214/2025"),
  deduplicateById: vi.fn((arr: unknown[]) => arr),
  TrackedQuestion: {},
  QuestionResult: {},
  RagChunk: {},
  SolarisQuestion: {},
}));
vi.mock("./solaris-query", () => ({
  querySolarisByCnaes: vi.fn().mockResolvedValue([]),
}));
vi.mock("./completeness", () => ({
  inferCompanyType: vi.fn().mockReturnValue("servico"),
}));

// LLM mock — re-rank usa invokeLLM internamente
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{"indices": []}' } }],
  }),
}));

// Imports após mocks
import { queryRag } from "./rag-query";
import { retrieveArticles, retrieveArticlesFast } from "../rag-retriever";
import { generateServiceQuestions } from "./service-questions";
import { inArray } from "drizzle-orm";

beforeEach(() => {
  vi.mocked(inArray).mockClear();
});

describe("M3.6 P0 — RAG filter por documento-fonte (lei)", () => {
  it("queryRag aceita parâmetro leiFilter opcional (4º argumento) — server/lib/rag-query.ts:14", async () => {
    // REGRA-ORQ-27 Plano A: chamada com leiFilter dinâmico chega ao caller final
    const result = await queryRag(["1.0501.14.51"], "ibs cbs", 3, ["lc214", "lc227"]);
    expect(Array.isArray(result)).toBe(true);

    // inArray foi invocado com o 4º argumento dinâmico
    const leiCall = vi.mocked(inArray).mock.calls.find(
      c => Array.isArray(c[1]) && (c[1] as readonly string[]).includes("lc214"),
    );
    expect(leiCall).toBeDefined();
    expect(leiCall![1]).toEqual(["lc214", "lc227"]);
  });

  it("fetchCandidates aplica inArray(ragDocuments.lei, leiFilter) quando definido — server/rag-retriever.ts:113", async () => {
    await retrieveArticles(["4711-3/01"], "comercio varejo", 5, ["lc214", "lc227"]);

    // REGRA-ORQ-27 Plano A: inArray chamado com VALOR DINÂMICO leiFilter
    expect(vi.mocked(inArray)).toHaveBeenCalled();
    const leiCall = vi.mocked(inArray).mock.calls.find(
      c => Array.isArray(c[1]) && (c[1] as readonly string[]).includes("lc214"),
    );
    expect(leiCall).toBeDefined();
    expect(leiCall![1]).toEqual(["lc214", "lc227"]);
  });

  it("Q.NBS (generateServiceQuestions) chama queryRagFn com leiFilter=['lc214','lc227'] — server/lib/service-questions.ts:100", async () => {
    const queryRagSpy = vi.fn().mockResolvedValue([]);

    await generateServiceQuestions(
      ["1.0501.14.51"],
      ["4930-2/02"],
      { operationType: "servico", archetype: null },
      queryRagSpy,
    );

    expect(queryRagSpy).toHaveBeenCalled();
    // 4º argumento (leiFilter) deve ser ["lc214","lc227"] — REGRA-ORQ-27 valor dinâmico
    const firstCall = queryRagSpy.mock.calls[0];
    expect(firstCall[3]).toEqual(["lc214", "lc227"]);
  });

  it("backward-compat: leiFilter undefined → comportamento idêntico ao legado (sem filtro lei na query SQL)", async () => {
    // Chamada sem leiFilter (3 args) — mesma semântica antes/depois M3.6
    await retrieveArticles(["4711-3/01"], "comercio varejo", 5);

    // inArray NUNCA é chamado com array de leis (lc...) quando leiFilter undefined.
    const leiCalls = vi.mocked(inArray).mock.calls.filter(
      c => Array.isArray(c[1]) && (c[1] as readonly string[]).some(v => /^lc\d+/.test(v)),
    );
    expect(leiCalls.length).toBe(0);
  });

  // M3.6 Manus review (2026-05-04): test contract para retrieveArticlesFast.
  // Sem este teste, implementador pode propagar leiFilter em retrieveArticles
  // mas esquecer retrieveArticlesFast — bug persiste em callsites que usam a "fast".
  it("retrieveArticlesFast aceita e propaga leiFilter para fetchCandidates — server/rag-retriever.ts:~289", async () => {
    await retrieveArticlesFast(["4711-3/01"], "comercio varejo", 5, ["lc214", "lc227"]);

    // Mesma asserção: inArray chamado com leiFilter via fetchCandidates
    const leiCall = vi.mocked(inArray).mock.calls.find(
      c => Array.isArray(c[1]) && (c[1] as readonly string[]).includes("lc214"),
    );
    expect(leiCall).toBeDefined();
    expect(leiCall![1]).toEqual(["lc214", "lc227"]);
  });
});
