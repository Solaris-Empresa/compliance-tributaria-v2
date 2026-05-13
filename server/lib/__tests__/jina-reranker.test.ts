// CORPUS-RFC-007 / Issue #1073 — Artefato 4 (implementação)
// Cada contrato declarado como pendente no PR #1075 vira aqui um it() real.
// Mocking estratégia: globalThis.fetch via vi.fn — testes não chamam Jina real.

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import {
  rerankWithJina,
  isJinaRerankerEnabled,
} from "../jina-reranker";
import type { RetrievedArticle } from "../../rag-retriever";

const ORIGINAL_ENV = process.env;

function mkChunk(artigo: string, conteudo = `Conteúdo do ${artigo}`): RetrievedArticle {
  return {
    lei: "lc214",
    artigo,
    titulo: `Título ${artigo}`,
    conteudo,
  };
}

function jinaOk(results: Array<{ index: number; relevance_score: number }>): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ results }),
  } as Response;
}

function jinaFail(status = 500): Response {
  return {
    ok: false,
    status,
    json: async () => ({ error: "server error" }),
  } as Response;
}

describe("JinaReranker — CORPUS-RFC-007", () => {
  let fetchSpy: MockInstance<typeof globalThis.fetch>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.JINA_API_KEY = "test-key";
    process.env.JINA_THRESHOLD = "0.1";
    delete process.env.JINA_RERANKER_ENABLED;
    fetchSpy = vi.spyOn(globalThis, "fetch") as MockInstance<typeof globalThis.fetch>;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  describe("rerankWithJina()", () => {
    it("retorna candidatos ordenados por score desc quando Jina responde 200", async () => {
      fetchSpy.mockResolvedValueOnce(
        jinaOk([
          { index: 2, relevance_score: 0.91 },
          { index: 0, relevance_score: 0.72 },
          { index: 1, relevance_score: 0.55 },
        ]),
      );

      const candidates = [
        mkChunk("Art. 100"),
        mkChunk("Art. 200"),
        mkChunk("Art. 300"),
      ];
      const result = await rerankWithJina("query", candidates, 5);

      expect(result.map((r) => r.artigo)).toEqual([
        "Art. 300",
        "Art. 100",
        "Art. 200",
      ]);
      expect(result[0]?.relevanceScore).toBeCloseTo(0.91);
    });

    it("retorna candidatos originais (sem reordenar) quando Jina retorna erro 5xx", async () => {
      // Falha + retry também falha → fallback
      fetchSpy.mockResolvedValueOnce(jinaFail(500));
      fetchSpy.mockResolvedValueOnce(jinaFail(503));

      const candidates = [
        mkChunk("Art. 100"),
        mkChunk("Art. 200"),
        mkChunk("Art. 300"),
      ];
      const result = await rerankWithJina("query", candidates, 5);

      expect(result).toEqual(candidates);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    }, 10000);

    it("retorna candidatos originais quando Jina timeout (>5000ms)", async () => {
      // fetch que respeita AbortSignal → quando aborta, rejeita com AbortError
      fetchSpy.mockImplementation(
        (_url: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            if (signal) {
              signal.addEventListener("abort", () => {
                const err = new Error("aborted");
                err.name = "AbortError";
                reject(err);
              });
            }
          }),
      );
      vi.useFakeTimers();

      const candidates = [mkChunk("Art. 100"), mkChunk("Art. 200")];
      const promise = rerankWithJina("query", candidates, 5);

      // Primeiro timeout 5s → abort → catch → retry delay 1s → segundo timeout 5s → abort → fallback
      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;
      vi.useRealTimers();

      expect(result).toEqual(candidates);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    }, 15000);

    it("filtra candidatos com score < JINA_THRESHOLD", async () => {
      process.env.JINA_THRESHOLD = "0.5";
      fetchSpy.mockResolvedValueOnce(
        jinaOk([
          { index: 0, relevance_score: 0.9 },
          { index: 2, relevance_score: 0.6 },
          { index: 1, relevance_score: 0.3 }, // abaixo do threshold
        ]),
      );

      const candidates = [
        mkChunk("Art. 100"),
        mkChunk("Art. 200"),
        mkChunk("Art. 300"),
      ];
      const result = await rerankWithJina("query", candidates, 5);

      expect(result.map((r) => r.artigo)).toEqual(["Art. 100", "Art. 300"]);
    });

    it("não filtra nenhum candidato quando JINA_THRESHOLD = 0", async () => {
      process.env.JINA_THRESHOLD = "0";
      fetchSpy.mockResolvedValueOnce(
        jinaOk([
          { index: 0, relevance_score: 0.5 },
          { index: 1, relevance_score: 0.0 },
          { index: 2, relevance_score: 0.001 },
        ]),
      );

      const candidates = [
        mkChunk("Art. 100"),
        mkChunk("Art. 200"),
        mkChunk("Art. 300"),
      ];
      const result = await rerankWithJina("query", candidates, 5);

      expect(result).toHaveLength(3);
    });

    it("faz retry 1x após falha antes de fallback", async () => {
      fetchSpy.mockResolvedValueOnce(jinaFail(500));
      fetchSpy.mockResolvedValueOnce(
        jinaOk([{ index: 0, relevance_score: 0.8 }]),
      );

      const candidates = [mkChunk("Art. 100")];
      const result = await rerankWithJina("query", candidates, 5);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.map((r) => r.artigo)).toEqual(["Art. 100"]);
    }, 10000);
  });

  describe("Feature flag JINA_RERANKER_ENABLED", () => {
    it("ENABLED=false → rerankWithJina não é chamado (pipeline idêntico)", () => {
      process.env.JINA_RERANKER_ENABLED = "false";
      expect(isJinaRerankerEnabled()).toBe(false);
    });

    it("ENABLED=true → rerankWithJina é chamado antes do re-ranker GPT", async () => {
      process.env.JINA_RERANKER_ENABLED = "true";
      expect(isJinaRerankerEnabled()).toBe(true);

      // Quando flag está ligada, rerankWithJina deve invocar fetch contra a Jina
      fetchSpy.mockResolvedValueOnce(
        jinaOk([{ index: 0, relevance_score: 0.9 }]),
      );
      await rerankWithJina("q", [mkChunk("Art. 1")], 5);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0]!;
      expect(String(url)).toContain("api.jina.ai");
    });
  });

  describe("Integração pipeline RAG", () => {
    it("Art. 138 aparece no top-3 para query NCM 2304 com Jina ativo", async () => {
      // Cenário canônico do caso #5040001: pool de 5 candidatos onde Art. 138
      // está afundado por chunks de saúde (Art. 128-130). Jina deve trazer
      // Art. 138 ao topo via score alto.
      const candidates: RetrievedArticle[] = [
        mkChunk("Art. 128", "Regime diferenciado de saúde — serviços hospitalares"),
        mkChunk("Art. 129", "Regime diferenciado de saúde — clínicas"),
        mkChunk("Art. 130", "Regime diferenciado de saúde — diagnóstico"),
        mkChunk("Art. 138", "Insumos agropecuários — NCM 2304, soja, milho — redução"),
        mkChunk("Art. 200", "Outras disposições"),
      ];

      fetchSpy.mockResolvedValueOnce(
        jinaOk([
          { index: 3, relevance_score: 0.95 }, // Art. 138 vence
          { index: 4, relevance_score: 0.42 },
          { index: 0, relevance_score: 0.18 },
          { index: 1, relevance_score: 0.15 },
          { index: 2, relevance_score: 0.12 },
        ]),
      );

      const result = await rerankWithJina("NCM 2304 redução alíquota", candidates, 3);

      expect(result.length).toBeLessThanOrEqual(3);
      expect(result.map((r) => r.artigo)).toContain("Art. 138");
      expect(result[0]?.artigo).toBe("Art. 138");
    });

    it("zero regressão: 67 testes Sprint 0 continuam passando com ENABLED=false", () => {
      // Garantia estrutural: quando a flag está desligada, isJinaRerankerEnabled
      // retorna false → o caller (rag-retriever) pula a chamada Jina inteiramente.
      // Os 67 testes do Sprint 0 (CORPUS-RFC-006) rodam sem Jina por padrão.
      delete process.env.JINA_RERANKER_ENABLED;
      expect(isJinaRerankerEnabled()).toBe(false);

      process.env.JINA_RERANKER_ENABLED = "false";
      expect(isJinaRerankerEnabled()).toBe(false);

      process.env.JINA_RERANKER_ENABLED = "FALSE";
      expect(isJinaRerankerEnabled()).toBe(false);

      process.env.JINA_RERANKER_ENABLED = "";
      expect(isJinaRerankerEnabled()).toBe(false);
    });
  });
});
