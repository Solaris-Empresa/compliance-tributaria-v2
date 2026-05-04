/**
 * z01-qc-ncm.test.ts — Sprint Z Z-01
 * Testes de Q.Produtos (NCM) rastreados
 * DEC-M3-05 v3 · ADR-0009
 *
 * 6 casos:
 *   Caso 1: NCM 2202.10.00 → TrackedQuestion[] com fonte='rag'
 *   Caso 2: inferCategoria com chunk { topicos: 'imposto seletivo' } → 'imposto_seletivo'
 *   Caso 3: empresa de serviço → { nao_aplicavel: true }
 *   Caso 4: empresa de produto sem NCM → fallback com alerta
 *   Caso 5: deduplicateById remove duplicatas por id
 *   Caso 6: corporateAnswers grava TrackedQuestion[] com fonte_ref + lei_ref
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deduplicateById,
  inferCategoria,
  extractLeiRef,
  type TrackedQuestion,
  type RagChunk,
} from "../lib/tracked-question";
import { generateProductQuestions } from "../lib/product-questions";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../lib/rag-query", () => ({
  queryRag: vi.fn(),
}));

vi.mock("../lib/solaris-query", () => ({
  querySolarisByCnaes: vi.fn(),
}));

vi.mock("../lib/tracked-question", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tracked-question")>();
  return {
    ...actual,
    generateQuestionFromChunk: vi.fn().mockResolvedValue(
      "A empresa realizou o enquadramento do NCM 2202.10.00 nas alíquotas do IBS e CBS?"
    ),
  };
});

import { queryRag } from "../lib/rag-query";
import { querySolarisByCnaes } from "../lib/solaris-query";

const mockChunkNcm: RagChunk = {
  anchor_id:   "LC214-art45-ncm220210",
  conteudo:    "Art. 45 — Bebidas açucaradas classificadas no NCM 2202.10.00 estão sujeitas ao Imposto Seletivo.",
  topicos:     "imposto seletivo",
  score:       0.92,
};

const mockSolarisQ = {
  id:         42,
  codigo:     "SOL-042",
  texto:      "A empresa possui controle de estoque por NCM?",
  categoria:  "controle_fiscal",
  cnaeGroups: ["15.1", "15.2"],
  obrigatorio: false,
};

// ─── Casos ────────────────────────────────────────────────────────────────────

describe("Z-01 Q.Produtos (NCM)", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryRag).mockResolvedValue([mockChunkNcm]);
    vi.mocked(querySolarisByCnaes).mockResolvedValue([mockSolarisQ]);
  });

  // Caso 1: NCM 2202.10.00 → TrackedQuestion[] com fonte='rag'
  it("Caso 1: NCM 2202.10.00 → TrackedQuestion[] com fonte='rag'", async () => {
    const result = await generateProductQuestions(
      ["2202.10.00"],
      ["15.1"],
      { operationType: "produto" },
      vi.mocked(queryRag),
      vi.mocked(querySolarisByCnaes)
    );

    expect(Array.isArray(result)).toBe(true);
    const perguntas = result as TrackedQuestion[];
    const ragQ = perguntas.find(q => q.fonte === "regulatorio");
    expect(ragQ).toBeDefined();
    expect(ragQ!.fonte_ref).toBe("LC214-art45-ncm220210");
    expect(ragQ!.ncm).toBe("2202.10.00");
    expect(ragQ!.lei_ref).toBeTruthy();
    expect(ragQ!.confidence).toBeGreaterThan(0);
  });

  // Caso 2: inferCategoria com chunk { topicos: 'imposto seletivo' } → 'imposto_seletivo'
  it("Caso 2: inferCategoria com topicos 'imposto seletivo' → 'imposto_seletivo'", () => {
    const chunk: RagChunk = {
      anchor_id: "test-001",
      conteudo:  "Artigo sobre imposto seletivo",
      topicos:   "imposto seletivo",
      score:     0.8,
    };
    expect(inferCategoria(chunk)).toBe("imposto_seletivo");
  });

  // Caso 3: empresa de serviço → { nao_aplicavel: true }
  it("Caso 3: empresa de serviço → { nao_aplicavel: true }", async () => {
    const result = await generateProductQuestions(
      ["1.01.01.00.00"],
      ["62.01"],
      { operationType: "servico" },
      vi.mocked(queryRag),
      vi.mocked(querySolarisByCnaes)
    );

    expect(result).toEqual({ nao_aplicavel: true });
    expect(queryRag).not.toHaveBeenCalled();
  });

  // Caso 4: empresa de produto sem NCM → NO_QUESTION protocol (M3.7 Item 5)
  it("Caso 4: empresa de produto sem NCM → NO_QUESTION protocol com motivo + alerta", async () => {
    const result = await generateProductQuestions(
      [],
      ["15.1"],
      { operationType: "produto" },
      vi.mocked(queryRag),
      vi.mocked(querySolarisByCnaes)
    );

    // M3.7 Item 5: era { perguntas: hardcoded[], alerta }, agora é NO_QUESTION protocol
    expect(result).toHaveProperty("nao_aplicavel", true);
    expect(result).toHaveProperty("motivo", "no_ncm_codes");
    expect(result).toHaveProperty("alerta");
    const r = result as { nao_aplicavel: true; motivo: string; alerta: string };
    expect(r.alerta).toContain("NCM");
    expect(queryRag).not.toHaveBeenCalled();
  });

  // Caso 5: deduplicateById remove duplicatas por id
  it("Caso 5: deduplicateById remove duplicatas por id", () => {
    const q1: TrackedQuestion = {
      id: "rag-ncm-001", fonte: "rag", fonte_ref: "art1", lei_ref: "LC 214/2025",
      texto: "Pergunta A", categoria: "enquadramento_geral", confidence: 0.9,
    };
    const q2: TrackedQuestion = {
      id: "rag-ncm-001", fonte: "rag", fonte_ref: "art1", lei_ref: "LC 214/2025",
      texto: "Pergunta A duplicada", categoria: "enquadramento_geral", confidence: 0.8,
    };
    const q3: TrackedQuestion = {
      id: "solaris-042", fonte: "solaris", fonte_ref: "SOL-042", lei_ref: "LC 214/2025",
      texto: "Pergunta B", categoria: "controle_fiscal", confidence: 1.0,
    };

    const result = deduplicateById([q1, q2, q3]);
    expect(result).toHaveLength(2);
    expect(result.map(q => q.id)).toEqual(["rag-ncm-001", "solaris-042"]);
    // Mantém o primeiro (q1), descarta q2
    expect(result[0].texto).toBe("Pergunta A");
  });

  // Caso 6: corporateAnswers grava TrackedQuestion[] com fonte_ref + lei_ref
  it("Caso 6: TrackedQuestion[] gerada tem fonte_ref e lei_ref preenchidos", async () => {
    const result = await generateProductQuestions(
      ["2202.10.00"],
      ["15.1"],
      { operationType: "produto" },
      vi.mocked(queryRag),
      vi.mocked(querySolarisByCnaes)
    );

    expect(Array.isArray(result)).toBe(true);
    const perguntas = result as TrackedQuestion[];

    // Todas as perguntas devem ter fonte_ref e lei_ref preenchidos (rastreabilidade Z-01)
    for (const q of perguntas) {
      expect(q.fonte_ref).toBeTruthy();
      expect(q.lei_ref).toBeTruthy();
      expect(q.id).toBeTruthy();
    }

    // JSON.stringify deve funcionar sem erros (compatível com corporateAnswers)
    expect(() => JSON.stringify(perguntas)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(perguntas)) as TrackedQuestion[];
    expect(parsed[0]).toHaveProperty("fonte_ref");
    expect(parsed[0]).toHaveProperty("lei_ref");
  });

});
