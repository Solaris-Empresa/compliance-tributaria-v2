/**
 * z01-qo-nbs.test.ts — Sprint Z Z-01 · 22 Casos de Validação
 * Bloco B (B-01 a B-07) + C-03
 * DEC-M3-05 v3 · ADR-0009
 *
 * Casos:
 *   B-01: SOLARIS retorna perguntas válidas
 *   B-02: RAG por NBS retorna chunk válido
 *   B-03: SOLARIS + RAG combinados e deduplicados
 *   B-04: Ambas fontes vazias → fallback com alerta
 *   B-05: Empresa produto puro
 *   B-06: SOLARIS: fonte_ref nunca usa anchor_id RAG
 *   B-07: RAG: nbs por pergunta de origem (não posição 0)
 *   C-03: Narrowing { perguntas, alerta }
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type TrackedQuestion,
  type QuestionResult,
  type RagChunk,
} from "../lib/tracked-question";
import { generateServiceQuestions } from "../lib/service-questions";

// ─── Mocks de módulos ─────────────────────────────────────────────────────────
vi.mock("../lib/tracked-question", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tracked-question")>();
  return {
    ...actual,
    generateQuestionFromChunk: vi.fn().mockResolvedValue(
      "A empresa realizou o enquadramento do serviço nas alíquotas do IBS e CBS?"
    ),
  };
});

vi.mock("../lib/rag-query", () => ({
  queryRag: vi.fn(),
}));
vi.mock("../lib/solaris-query", () => ({
  querySolarisByCnaes: vi.fn(),
}));

// ─── Bloco B — generateServiceQuestions ──────────────────────────────────────

describe("Z-01 · Bloco B — generateServiceQuestions (NBS)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── B-01: SOLARIS retorna perguntas válidas ───────────────────────────────
  it("B-01: SOLARIS retorna perguntas válidas", async () => {
    const mockSolaris = vi.fn().mockResolvedValue([{
      id: 19, codigo: "SOL-019",
      texto: "A empresa mapeou a incidência de CBS sobre seus serviços?",
      categoria: "cbs_aliquota",
      cnaeGroups: ["46"],
      topicos: "CBS LC 214/2025",
    }]);
    const mockQueryRag = vi.fn().mockResolvedValue([]);

    const result = await generateServiceQuestions(
      ["1.01.00"],
      ["4632-0/01"],
      { operationType: "service" },
      mockQueryRag,
      mockSolaris
    );

    const arr = result as TrackedQuestion[];
    expect(arr[0].fonte).toBe("solaris");
    expect(arr[0].fonte_ref).toBe("SOL-019");
    expect(arr[0].confidence).toBe(1.0);
    expect(arr[0].nbs).toBeUndefined(); // SOLARIS é por CNAE, não por NBS
  });

  // ─── B-02: RAG por NBS retorna chunk válido ────────────────────────────────
  it("B-02: RAG por NBS retorna chunk válido", async () => {
    const mockSolaris = vi.fn().mockResolvedValue([]);
    const mockChunk: RagChunk = {
      anchor_id: "lc214-cbs-001",
      artigo:    "Art. 8",
      lei:       "lc214",
      topicos:   "cbs aliquota servicos",
      conteudo:  "...",
      score:     0.88,
    };
    const mockQueryRag = vi.fn().mockResolvedValue([mockChunk]);

    const result = await generateServiceQuestions(
      ["1.01.00"],
      ["4632-0/01"],
      { operationType: "service" },
      mockQueryRag,
      mockSolaris
    );

    const arr = result as TrackedQuestion[];
    expect(arr[0].fonte).toBe("rag");
    expect(arr[0].fonte_ref).toBe("lc214-cbs-001");
    expect(arr[0].nbs).toBe("1.01.00"); // NBS de origem da query
    expect(arr[0].confidence).toBe(0.88);
  });

  // ─── B-03: SOLARIS + RAG combinados e deduplicados ────────────────────────
  it("B-03: SOLARIS + RAG combinados e deduplicados", async () => {
    const mockSolaris = vi.fn().mockResolvedValue([{
      id: 5, codigo: "SOL-005",
      texto: "Pergunta SOLARIS...", categoria: "enquadramento_geral",
      cnaeGroups: ["46"], topicos: "LC 214/2025",
    }]);
    const mockChunk: RagChunk = {
      anchor_id: "lc116-art1-001",
      artigo:    "Art. 1",
      lei:       "lc116",
      topicos:   "iss servicos",
      conteudo:  "...",
      score:     0.85,
    };
    const mockQueryRag = vi.fn().mockResolvedValue([mockChunk]);

    const result = await generateServiceQuestions(
      ["1.01.00"],
      ["4632-0/01"],
      { operationType: "service" },
      mockQueryRag,
      mockSolaris
    );

    const arr = result as TrackedQuestion[];
    expect(arr.length).toBe(2);
    expect(arr[0].fonte).toBe("solaris");
    expect(arr[1].fonte).toBe("rag");
    // IDs distintos
    expect(arr[0].id).not.toBe(arr[1].id);
  });

  // ─── B-04: Ambas fontes vazias → fallback com alerta ─────────────────────
  it("B-04: Ambas fontes vazias → fallback com alerta", async () => {
    const mockSolaris  = vi.fn().mockResolvedValue([]);
    const mockQueryRag = vi.fn().mockResolvedValue([]);

    const result = await generateServiceQuestions(
      [],
      ["4632-0/01"],
      { operationType: "service" },
      mockQueryRag,
      mockSolaris
    );

    expect("perguntas" in result).toBe(true);
    const r = result as { perguntas: TrackedQuestion[]; alerta: string };
    expect(r.alerta.length).toBeGreaterThan(0);
    expect(r.perguntas.length).toBeGreaterThanOrEqual(1);
    expect(r.perguntas[0].lei_ref).toBeTruthy();
    expect(r.perguntas[0].confidence).toBe(0.5);
  });

  // ─── B-05: Empresa produto puro ───────────────────────────────────────────
  it("B-05: Empresa produto puro", async () => {
    const mockSolaris  = vi.fn();
    const mockQueryRag = vi.fn();

    const result = await generateServiceQuestions(
      ["1.01.00"],
      ["4632-0/01"],
      { operationType: "product" },
      mockQueryRag,
      mockSolaris
    );

    expect(result).toEqual({ nao_aplicavel: true });
    expect(mockSolaris).not.toHaveBeenCalled();
    expect(mockQueryRag).not.toHaveBeenCalled();
  });

  // ─── B-06: SOLARIS: fonte_ref nunca usa anchor_id RAG ────────────────────
  it("B-06: SOLARIS: fonte_ref nunca usa anchor_id RAG", async () => {
    const mockSolaris = vi.fn().mockResolvedValue([{
      id: 5, codigo: "SOL-005", texto: "...", categoria: "enquadramento_geral",
      cnaeGroups: ["46"], topicos: "LC 214/2025",
    }]);
    const mockQueryRag = vi.fn().mockResolvedValue([]);

    const result = await generateServiceQuestions(
      [],
      ["4632-0/01"],
      { operationType: "service" },
      mockQueryRag,
      mockSolaris
    );

    const arr = result as TrackedQuestion[];
    expect(arr[0].fonte_ref).toBe("SOL-005");
    // fonte_ref deve ser o codigo SOLARIS, não um anchor_id
    expect(arr[0].fonte_ref).not.toMatch(/^lc\d+/);
    expect(arr[0].fonte_ref).not.toMatch(/^ec\d+/);
  });

  // ─── B-07: RAG: nbs por pergunta de origem (não posição 0) ───────────────
  it("B-07: RAG: nbs por pergunta de origem (não posição 0)", async () => {
    const chunk1: RagChunk = {
      anchor_id: "chunk-nbs1",
      artigo:    "Art. 1",
      lei:       "lc214",
      topicos:   "cbs",
      conteudo:  "...",
      score:     0.9,
    };
    const chunk2: RagChunk = {
      anchor_id: "chunk-nbs2",
      artigo:    "Art. 2",
      lei:       "lc214",
      topicos:   "iss",
      conteudo:  "...",
      score:     0.85,
    };

    const mockSolaris = vi.fn().mockResolvedValue([]);
    // queryRag retorna chunk diferente dependendo do NBS consultado
    const mockQueryRag = vi.fn()
      .mockImplementation((codes: string[], _contextQuery: string) => {
        if (codes.includes("1.01.00")) return Promise.resolve([chunk1]);
        if (codes.includes("1.02.00")) return Promise.resolve([chunk2]);
        return Promise.resolve([]);
      });

    const result = await generateServiceQuestions(
      ["1.01.00", "1.02.00"],
      ["4632-0/01"],
      { operationType: "service" },
      mockQueryRag,
      mockSolaris
    );

    const arr = result as TrackedQuestion[];
    // Pergunta do NBS 1.01.00 tem nbs='1.01.00'
    const p1 = arr.find(q => q.fonte_ref === "chunk-nbs1");
    expect(p1?.nbs).toBe("1.01.00");
    // Pergunta do NBS 1.02.00 tem nbs='1.02.00'
    const p2 = arr.find(q => q.fonte_ref === "chunk-nbs2");
    expect(p2?.nbs).toBe("1.02.00");
  });
});

// ─── Bloco C — Handler narrowing (C-03) ──────────────────────────────────────

describe("Z-01 · Bloco C — Handler narrowing QO (C-03)", () => {
  // ─── C-03: Narrowing { perguntas, alerta } ────────────────────────────────
  it("C-03: Narrowing { perguntas, alerta } — operationalAnswers grava array de perguntas", () => {
    // Simula o narrowing que o handler faz quando generateServiceQuestions retorna { perguntas, alerta }
    const mockPerguntas: TrackedQuestion[] = [
      {
        id:         "fallback-servico-001",
        fonte:      "fallback",
        fonte_ref:  "fallback-servico-001",
        lei_ref:    "LC 214/2025 (genérico)",
        texto:      "A empresa possui códigos NBS cadastrados?",
        categoria:  "cadastro_fiscal",
        confidence: 0.5,
      },
    ];

    const result: QuestionResult = {
      perguntas: mockPerguntas,
      alerta: "Adicione códigos NBS para diagnóstico mais preciso.",
    };

    // Narrowing explícito (como no handler)
    let operationalAnswersJson: string;
    if ("nao_aplicavel" in result) {
      operationalAnswersJson = JSON.stringify([{ nao_aplicavel: true }]);
    } else if ("perguntas" in result) {
      operationalAnswersJson = JSON.stringify(result.perguntas);
    } else {
      operationalAnswersJson = JSON.stringify(result);
    }

    const operationalAnswers = JSON.parse(operationalAnswersJson);
    expect(Array.isArray(operationalAnswers)).toBe(true);
    expect(operationalAnswers[0].fonte).toBeDefined();
  });
});
