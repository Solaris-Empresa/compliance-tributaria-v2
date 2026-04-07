/**
 * z01-qc-ncm.test.ts — Sprint Z Z-01 · 22 Casos de Validação
 * Blocos A (A-01 a A-08) + C-01 + C-02
 * DEC-M3-05 v3 · ADR-0009
 *
 * Casos:
 *   A-01: NCM 1006 com RAG retornando chunk válido
 *   A-02: NCM 2202 com chunk de Imposto Seletivo
 *   A-03: NCM sem cobertura RAG (retorna vazio)
 *   A-04: Sem NCM cadastrado (array vazio)
 *   A-05: Empresa serviço puro
 *   A-06: 2 NCMs iguais → deduplicação
 *   A-07: lei_ref nunca null ou vazio em fallback
 *   A-08: inferCategoria determinístico com mock
 *   C-01: Narrowing TrackedQuestion[]
 *   C-02: Narrowing { nao_aplicavel: true }
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  inferCategoria,
  extractLeiRef,
  deduplicateById,
  type TrackedQuestion,
  type QuestionResult,
  type RagChunk,
} from "../lib/tracked-question";
import { generateProductQuestions } from "../lib/product-questions";

// ─── Mocks de módulos ─────────────────────────────────────────────────────────
vi.mock("../lib/tracked-question", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tracked-question")>();
  return {
    ...actual,
    generateQuestionFromChunk: vi.fn().mockResolvedValue(
      "A empresa realizou o enquadramento do produto nas alíquotas do IBS e CBS?"
    ),
  };
});

vi.mock("../lib/rag-query", () => ({
  queryRag: vi.fn(),
}));
vi.mock("../lib/solaris-query", () => ({
  querySolarisByCnaes: vi.fn(),
}));

// ─── Bloco A — generateProductQuestions ──────────────────────────────────────

describe("Z-01 · Bloco A — generateProductQuestions (NCM)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── A-01: NCM 1006 com RAG retornando chunk válido ────────────────────────
  it("A-01: NCM 1006 com RAG retornando chunk válido", async () => {
    const mockChunk: RagChunk = {
      anchor_id: "lc214-art14-001",
      artigo:    "Art. 14",
      lei:       "lc214",
      topicos:   "aliquota zero arroz",
      conteudo:  "Ficam sujeitos à alíquota zero do IBS e CBS os seguintes bens...",
      score:     0.94,
    };
    const mockQueryRag = vi.fn().mockResolvedValue([mockChunk]);
    const mockSolaris  = vi.fn().mockResolvedValue([]);

    const result = await generateProductQuestions(
      ["1006.40.00"],
      ["4632-0/01"],
      {},
      mockQueryRag,
      mockSolaris
    );

    expect(Array.isArray(result)).toBe(true);
    expect((result as TrackedQuestion[])[0].fonte).toBe("rag");
    expect((result as TrackedQuestion[])[0].fonte_ref).toBe("lc214-art14-001");
    expect((result as TrackedQuestion[])[0].ncm).toBe("1006.40.00");
    expect((result as TrackedQuestion[])[0].lei_ref).toContain("Art. 14");
    expect((result as TrackedQuestion[])[0].confidence).toBe(0.94);
  });

  // ─── A-02: NCM 2202 com chunk de Imposto Seletivo ─────────────────────────
  it("A-02: NCM 2202 com chunk de Imposto Seletivo", async () => {
    const mockChunk: RagChunk = {
      anchor_id: "lc214-art2-001",
      artigo:    "Art. 2",
      lei:       "lc214",
      topicos:   "imposto seletivo bebidas",
      conteudo:  "O Imposto Seletivo incide sobre bens e serviços prejudiciais...",
      score:     0.91,
    };
    const mockQueryRag = vi.fn().mockResolvedValue([mockChunk]);
    const mockSolaris  = vi.fn().mockResolvedValue([]);

    const result = await generateProductQuestions(
      ["2202.10.00"],
      ["4635-4/02"],
      {},
      mockQueryRag,
      mockSolaris
    );

    expect((result as TrackedQuestion[])[0].categoria).toBe("imposto_seletivo");
    expect((result as TrackedQuestion[])[0].ncm).toBe("2202.10.00");
    expect((result as TrackedQuestion[])[0].fonte).toBe("rag");
  });

  // ─── A-03: NCM sem cobertura RAG (retorna vazio) ──────────────────────────
  it("A-03: NCM sem cobertura RAG (retorna vazio)", async () => {
    const mockQueryRag = vi.fn().mockResolvedValue([]);
    const mockSolaris  = vi.fn().mockResolvedValue([]);

    const result = await generateProductQuestions(
      ["9999.99.99"],
      ["4632-0/01"],
      {},
      mockQueryRag,
      mockSolaris
    );

    expect(Array.isArray(result)).toBe(true);
    const r = (result as TrackedQuestion[]);
    expect(r[0].fonte).toBe("fallback");
    expect(r[0].confidence).toBe(0.5);
    expect(r[0].lei_ref).toBe("LC 214/2025 (genérico)");
    expect(r[0].ncm).toBe("9999.99.99");
  });

  // ─── A-04: Sem NCM cadastrado (array vazio) ───────────────────────────────
  it("A-04: Sem NCM cadastrado (array vazio)", async () => {
    const mockQueryRag = vi.fn().mockResolvedValue([]);
    const mockSolaris  = vi.fn().mockResolvedValue([]);

    const result = await generateProductQuestions(
      [],
      ["4632-0/01"],
      {},
      mockQueryRag,
      mockSolaris
    );

    expect(Array.isArray(result)).toBe(true);
    expect((result as TrackedQuestion[]).length).toBeGreaterThanOrEqual(1);
    expect((result as TrackedQuestion[])[0].lei_ref).not.toBe("");
    expect((result as TrackedQuestion[])[0].lei_ref).not.toBeNull();
    expect((result as TrackedQuestion[])[0].fonte).toBe("fallback");
    // queryRag NÃO deve ter sido chamado (sem NCM para consultar)
    expect(mockQueryRag).not.toHaveBeenCalled();
  });

  // ─── A-05: Empresa serviço puro ───────────────────────────────────────────
  it("A-05: Empresa serviço puro", async () => {
    const mockQueryRag = vi.fn();
    const mockSolaris  = vi.fn();

    const result = await generateProductQuestions(
      ["1006.40.00"],
      ["8599-6/99"],
      { operationType: "service" },
      mockQueryRag,
      mockSolaris
    );

    expect(result).toEqual({ nao_aplicavel: true });
    expect(mockQueryRag).not.toHaveBeenCalled();
  });

  // ─── A-06: 2 NCMs iguais → deduplicação ──────────────────────────────────
  it("A-06: 2 NCMs iguais → deduplicação", async () => {
    const mockChunk: RagChunk = {
      anchor_id: "lc214-art14-001",
      artigo:    "Art. 14",
      lei:       "lc214",
      topicos:   "aliquota zero",
      conteudo:  "...",
      score:     0.94,
    };
    // Mesmo chunk retornado para ambos os NCMs
    const mockQueryRag = vi.fn().mockResolvedValue([mockChunk]);
    const mockSolaris  = vi.fn().mockResolvedValue([]);

    const result = await generateProductQuestions(
      ["1006.40.00", "1006.40.00"],
      ["4632-0/01"],
      {},
      mockQueryRag,
      mockSolaris
    );

    // ID gerado é rag-ncm-1006.40.00-lc214-art14-001 — deve aparecer 1 vez
    const arr = result as TrackedQuestion[];
    const ids = arr.map(q => q.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length); // sem duplicatas
  });

  // ─── A-07: lei_ref nunca null ou vazio em fallback ────────────────────────
  it("A-07: lei_ref nunca null ou vazio em fallback", async () => {
    const mockQueryRag = vi.fn().mockResolvedValue([]);
    const mockSolaris  = vi.fn().mockResolvedValue([]);

    const result = await generateProductQuestions(
      ["0000.00.00"],
      ["4632-0/01"],
      {},
      mockQueryRag,
      mockSolaris
    );

    const arr = result as TrackedQuestion[];
    arr.forEach(q => {
      expect(q.lei_ref).toBeTruthy();
      expect(q.lei_ref).not.toBe("");
      expect(q.lei_ref).not.toBeNull();
      expect(q.lei_ref).not.toBeUndefined();
    });
  });

  // ─── A-08: inferCategoria determinístico com mock ─────────────────────────
  it("A-08: inferCategoria determinístico com mock", () => {
    const chunk1: RagChunk = { anchor_id: "x", conteudo: "", topicos: "aliquota zero arroz" };
    const chunk2: RagChunk = { anchor_id: "x", conteudo: "", topicos: "imposto seletivo" };
    const chunk3: RagChunk = { anchor_id: "x", conteudo: "", topicos: "cbs ibs tributo" };
    const chunk4: RagChunk = { anchor_id: "x", conteudo: "", topicos: "inscrição cadastro" };
    const chunk5: RagChunk = { anchor_id: "x", conteudo: "", topicos: "outro assunto" };

    expect(inferCategoria(chunk1)).toBe("aliquota_zero");
    expect(inferCategoria(chunk2)).toBe("imposto_seletivo");
    expect(inferCategoria(chunk3)).toBe("ibs_cbs");
    expect(inferCategoria(chunk4)).toBe("cadastro_fiscal");
    expect(inferCategoria(chunk5)).toBe("enquadramento_geral");
  });
});

// ─── Bloco C — Handler narrowing (C-01 e C-02) ───────────────────────────────

describe("Z-01 · Bloco C — Handler narrowing QC (C-01 e C-02)", () => {
  // ─── C-01: Narrowing TrackedQuestion[] ────────────────────────────────────
  it("C-01: Narrowing TrackedQuestion[] — corporateAnswers é array serializado", () => {
    // Simula o narrowing que o handler faz em getProductQuestions
    const mockPerguntas: TrackedQuestion[] = [
      {
        id:         "rag-ncm-2202.10.00-lc214-art14-001",
        fonte:      "rag",
        fonte_ref:  "lc214-art14-001",
        lei_ref:    "Art. 14 LC214",
        texto:      "A empresa realizou o enquadramento do NCM 2202.10.00?",
        categoria:  "aliquota_zero",
        ncm:        "2202.10.00",
        confidence: 0.94,
      },
    ];

    // Simular resultado TrackedQuestion[] (array direto)
    const result: QuestionResult = mockPerguntas;

    // Narrowing explícito (como no handler)
    let corporateAnswersJson: string;
    if ("nao_aplicavel" in result) {
      corporateAnswersJson = JSON.stringify([{ nao_aplicavel: true }]);
    } else if ("perguntas" in result) {
      corporateAnswersJson = JSON.stringify(result.perguntas);
    } else {
      // result é TrackedQuestion[]
      corporateAnswersJson = JSON.stringify(result);
    }

    const corporateAnswers = JSON.parse(corporateAnswersJson);
    expect(Array.isArray(corporateAnswers)).toBe(true);
    expect(corporateAnswers[0].fonte).toBeDefined();
    expect(corporateAnswers[0].fonte_ref).toBeDefined();
  });

  // ─── C-02: Narrowing { nao_aplicavel: true } ──────────────────────────────
  it("C-02: Narrowing { nao_aplicavel: true } — corporateAnswers grava nao_aplicavel", () => {
    // Simula o narrowing que o handler faz quando generateProductQuestions retorna nao_aplicavel
    const result: QuestionResult = { nao_aplicavel: true };

    // Narrowing explícito (como no handler)
    let corporateAnswersJson: string;
    if ("nao_aplicavel" in result) {
      corporateAnswersJson = JSON.stringify([{ nao_aplicavel: true }]);
    } else if ("perguntas" in result) {
      corporateAnswersJson = JSON.stringify(result.perguntas);
    } else {
      corporateAnswersJson = JSON.stringify(result);
    }

    const corporateAnswers = JSON.parse(corporateAnswersJson);
    expect(corporateAnswers[0].nao_aplicavel).toBe(true);
  });
});
