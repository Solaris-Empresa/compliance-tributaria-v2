/**
 * z01-qo-nbs.test.ts — Sprint Z Z-01
 * Testes de Q.Serviços (NBS) rastreados
 * DEC-M3-05 v3 · ADR-0009
 *
 * 5 casos:
 *   Caso 7:  NBS 1.01.01.00.00 → TrackedQuestion[] com fonte='rag'
 *   Caso 8:  empresa de produto → { nao_aplicavel: true }
 *   Caso 9:  empresa de serviço sem NBS → fallback com alerta
 *   Caso 10: extractLeiRef extrai referência correta do chunk
 *   Caso 11: operationalAnswers grava TrackedQuestion[] com fonte_ref + lei_ref
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractLeiRef,
  type TrackedQuestion,
  type RagChunk,
} from "../lib/tracked-question";
import { generateServiceQuestions } from "../lib/service-questions";

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
      "A empresa avaliou o enquadramento do serviço NBS 1.01.01.00.00 nas alíquotas do IBS e CBS?"
    ),
  };
});

import { queryRag } from "../lib/rag-query";
import { querySolarisByCnaes } from "../lib/solaris-query";

const mockChunkNbs: RagChunk = {
  anchor_id:   "LC214-art67-nbs101010000",
  conteudo:    "Art. 67 — Serviços de consultoria classificados no NBS 1.01.01.00.00 estão sujeitos ao IBS e CBS.",
  topicos:     "ibs cbs servico",
  score:       0.88,
};

const mockSolarisQServico = {
  id:         55,
  codigo:     "SOL-055",
  texto:      "A empresa possui controle de NBS para os serviços prestados?",
  categoria:  "cadastro_fiscal",
  cnaeGroups: ["62.01", "62.02"],
  obrigatorio: false,
};

// ─── Casos ────────────────────────────────────────────────────────────────────

describe("Z-01 Q.Serviços (NBS)", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryRag).mockResolvedValue([mockChunkNbs]);
    vi.mocked(querySolarisByCnaes).mockResolvedValue([mockSolarisQServico]);
  });

  // Caso 7: NBS 1.01.01.00.00 → TrackedQuestion[] com fonte='rag'
  it("Caso 7: NBS 1.01.01.00.00 → TrackedQuestion[] com fonte='rag'", async () => {
    const result = await generateServiceQuestions(
      ["1.01.01.00.00"],
      ["62.01"],
      { operationType: "servico" },
      vi.mocked(queryRag),
      vi.mocked(querySolarisByCnaes)
    );

    expect(Array.isArray(result)).toBe(true);
    const perguntas = result as TrackedQuestion[];
    const ragQ = perguntas.find(q => q.fonte === "rag");
    expect(ragQ).toBeDefined();
    expect(ragQ!.fonte_ref).toBe("LC214-art67-nbs101010000");
    expect(ragQ!.nbs).toBe("1.01.01.00.00");
    expect(ragQ!.lei_ref).toBeTruthy();
    expect(ragQ!.confidence).toBeGreaterThan(0);
  });

  // Caso 8: empresa de produto → { nao_aplicavel: true }
  it("Caso 8: empresa de produto → { nao_aplicavel: true }", async () => {
    const result = await generateServiceQuestions(
      ["2202.10.00"],
      ["15.1"],
      { operationType: "produto" },
      vi.mocked(queryRag),
      vi.mocked(querySolarisByCnaes)
    );

    expect(result).toEqual({ nao_aplicavel: true });
    expect(queryRag).not.toHaveBeenCalled();
  });

  // Caso 9: empresa de serviço sem NBS → NO_QUESTION protocol (M3.7 Item 5)
  it("Caso 9: empresa de serviço sem NBS → NO_QUESTION protocol com motivo + alerta", async () => {
    const result = await generateServiceQuestions(
      [],
      ["62.01"],
      { operationType: "servico" },
      vi.mocked(queryRag),
      vi.mocked(querySolarisByCnaes)
    );

    // M3.7 Item 5: era { perguntas: hardcoded[], alerta }, agora é NO_QUESTION protocol
    expect(result).toHaveProperty("nao_aplicavel", true);
    expect(result).toHaveProperty("motivo", "no_nbs_codes");
    expect(result).toHaveProperty("alerta");
    const r = result as { nao_aplicavel: true; motivo: string; alerta: string };
    expect(r.alerta).toContain("NBS");
    expect(queryRag).not.toHaveBeenCalled();
  });

  // Caso 10: extractLeiRef extrai referência correta do chunk
  it("Caso 10: extractLeiRef extrai lei_ref do conteúdo do chunk", () => {
    const chunkComLei: RagChunk = {
      anchor_id: "test-lei-001",
      conteudo:  "Conforme o Art. 45 da LC 214/2025, os serviços de TI estão sujeitos ao IBS.",
      topicos:   "ibs cbs",
      score:     0.85,
    };
    const leiRef = extractLeiRef(chunkComLei);
    expect(leiRef).toContain("LC 214/2025");

    const chunkSemLei: RagChunk = {
      anchor_id: "test-sem-lei",
      conteudo:  "Texto sem referência legislativa explícita.",
      topicos:   "enquadramento",
      score:     0.6,
    };
    const leiRefFallback = extractLeiRef(chunkSemLei);
    expect(leiRefFallback).toBeTruthy(); // fallback genérico
  });

  // Caso 11: operationalAnswers grava TrackedQuestion[] com fonte_ref + lei_ref
  it("Caso 11: TrackedQuestion[] gerada tem fonte_ref e lei_ref preenchidos", async () => {
    const result = await generateServiceQuestions(
      ["1.01.01.00.00"],
      ["62.01"],
      { operationType: "servico" },
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

    // JSON.stringify deve funcionar sem erros (compatível com operationalAnswers)
    expect(() => JSON.stringify(perguntas)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(perguntas)) as TrackedQuestion[];
    expect(parsed[0]).toHaveProperty("fonte_ref");
    expect(parsed[0]).toHaveProperty("lei_ref");
  });

});
