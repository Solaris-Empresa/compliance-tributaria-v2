/**
 * z01-rastreabilidade-nbs.test.ts — Sprint Z Z-01 · Rastreabilidade 20 Casos v2
 * Bloco I — Isolamento de NBS (I-01 a I-05)
 * DEC-M3-05 v3 · ADR-0009
 *
 * Prova que cada pergunta gerada pertence ao NBS declarado no perfil da empresa.
 *
 * Perfis:
 *   E-6 · Agroindústria (mista):    nbsCodes: ['1.17.19']
 *   E-7 · Clínica médica (serviço): nbsCodes: ['1.03.01', '1.03.11']
 *   E-9 · Construtora (mista):      nbsCodes: ['1.05.01', '1.05.11']
 *   E-10 · Transportadora (serviço): nbsCodes: ['1.09.01', '1.09.11']
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type TrackedQuestion,
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
vi.mock("../lib/rag-query", () => ({ queryRag: vi.fn() }));
vi.mock("../lib/solaris-query", () => ({ querySolarisByCnaes: vi.fn() }));

describe("Z-01 · Bloco I — Isolamento de NBS", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── I-01: E-7 clínica médica → regime diferenciado CBS, SOLARIS + RAG ────
  it("I-01: E-7 clínica médica → regime diferenciado CBS, SOLARIS + RAG", async () => {
    const mockSolaris = vi.fn().mockResolvedValue([{
      id: 22, codigo: "SOL-022",
      texto: "A empresa verificou o regime diferenciado de CBS para serviços de saúde (Art. 29)?",
      categoria: "regime_diferenciado", cnaeGroups: ["86"],
      topicos: "LC 214/2025 saúde Art. 29",
    }]);
    const mockQueryRag = vi.fn().mockImplementation((codes: string[], query: string) => {
      if (query.includes("1.03")) return Promise.resolve([{
        anchor_id: "lc214-art29-saude", artigo: "Art. 29", lei: "lc214",
        topicos: "saude hospitalar cbs reducao aliquota", conteudo: "...", score: 0.95,
      }]);
      return Promise.resolve([]);
    });

    const result = await generateServiceQuestions(
      ["1.03.01", "1.03.11"],
      ["8630-5/01"],
      { operationType: "service" },
      mockQueryRag,
      mockSolaris
    );
    const arr = result as TrackedQuestion[];

    const sol = arr.find(q => q.fonte === "solaris");
    expect(sol?.fonte_ref).toBe("SOL-022");
    expect(sol?.confidence).toBe(1.0);
    expect(sol?.nbs).toBeUndefined(); // SOLARIS por CNAE, não por NBS

    const ragSaude = arr.find(q => q.fonte === "rag");
    expect(["1.03.01", "1.03.11"]).toContain(ragSaude?.nbs);
    expect(ragSaude?.fonte_ref).toBe("lc214-art29-saude");
  });

  // ─── I-02: E-7 vs E-10 → pergunta de saúde não aparece em transportadora ──
  it("I-02: E-7 vs E-10 → pergunta de saúde não aparece em transportadora", async () => {
    const mockSolaris = vi.fn().mockResolvedValue([]);
    const mockQueryRag = vi.fn().mockImplementation((codes: string[], query: string) => {
      if (query.includes("1.09")) return Promise.resolve([{
        anchor_id: "lc214-transporte-109", artigo: "Art. 11", lei: "lc214",
        topicos: "transporte carga cbs frete", conteudo: "...", score: 0.90,
      }]);
      return Promise.resolve([]);
    });

    const result = await generateServiceQuestions(
      ["1.09.01", "1.09.11"],
      ["4930-2/02"],
      { operationType: "service" },
      mockQueryRag,
      mockSolaris
    );
    const arr = result as TrackedQuestion[];

    arr.forEach(q => { if (q.nbs) expect(q.nbs).not.toMatch(/^1\.03/); });
    const calls = mockQueryRag.mock.calls.map((c: any[]) => c[1] as string);
    expect(calls.some(q => q.includes("1.03"))).toBe(false);
    expect(calls.some(q => q.includes("1.09"))).toBe(true);
  });

  // ─── I-03: E-9 NBS construção e incorporação → perguntas distintas por NBS ─
  it("I-03: E-9 NBS construção e incorporação → perguntas distintas por NBS", async () => {
    const mockSolaris = vi.fn().mockResolvedValue([]);
    const mockQueryRag = vi.fn().mockImplementation((codes: string[], query: string) => {
      if (query.includes("1.05.01")) return Promise.resolve([{
        anchor_id: "lc214-obra-10501", artigo: "Art. 12", lei: "lc214",
        topicos: "construcao civil cbs credito obra", conteudo: "...", score: 0.91,
      }]);
      if (query.includes("1.05.11")) return Promise.resolve([{
        anchor_id: "lc214-incorpor-10511", artigo: "Art. 12", lei: "lc214",
        topicos: "incorporacao imobiliaria cbs regime", conteudo: "...", score: 0.89,
      }]);
      return Promise.resolve([]);
    });

    const result = await generateServiceQuestions(
      ["1.05.01", "1.05.11"],
      ["4120-4/00", "4110-7/00"],
      { operationType: "mixed" },
      mockQueryRag,
      mockSolaris
    );
    const arr = result as TrackedQuestion[];

    const obra = arr.find(q => q.fonte_ref === "lc214-obra-10501");
    expect(obra?.nbs).toBe("1.05.01");
    const incorpor = arr.find(q => q.fonte_ref === "lc214-incorpor-10511");
    expect(incorpor?.nbs).toBe("1.05.11");
    expect(obra?.id).not.toBe(incorpor?.id);
  });

  // ─── I-04: E-7 vs E-10 → zero fonte_ref em comum ─────────────────────────
  it("I-04: E-7 vs E-10 → zero fonte_ref em comum entre clínica e transportadora", async () => {
    const mockRagClinica = vi.fn().mockResolvedValue([{
      anchor_id: "rag-saude-103", artigo: "Art. 29", lei: "lc214",
      topicos: "saude cbs reducao", conteudo: "...", score: 0.94,
    }]);
    const mockSolarisSaude = vi.fn().mockResolvedValue([{
      id: 22, codigo: "SOL-022", texto: "...", categoria: "regime_diferenciado",
      cnaeGroups: ["86"], topicos: "saúde",
    }]);

    const resultClinica = await generateServiceQuestions(
      ["1.03.01"],
      ["8630-5/01"],
      { operationType: "service" },
      mockRagClinica,
      mockSolarisSaude
    );

    const mockRagTransp = vi.fn().mockResolvedValue([{
      anchor_id: "rag-frete-109", artigo: "Art. 11", lei: "lc214",
      topicos: "transporte frete cbs", conteudo: "...", score: 0.90,
    }]);
    const resultTransp = await generateServiceQuestions(
      ["1.09.01"],
      ["4930-2/02"],
      { operationType: "service" },
      mockRagTransp,
      vi.fn().mockResolvedValue([])
    );

    const refsClinica = new Set((resultClinica as TrackedQuestion[]).map(q => q.fonte_ref));
    const refsTransp = new Set((resultTransp as TrackedQuestion[]).map(q => q.fonte_ref));
    const intersecao = [...refsClinica].filter(r => refsTransp.has(r));
    expect(intersecao.length).toBe(0); // zero perguntas em comum
  });

  // ─── I-05: E-6 mista NBS logística (1.17.19) → frete, não saúde nem construção
  it("I-05: E-6 mista NBS logística (1.17.19) → frete, não saúde nem construção", async () => {
    const mockSolaris = vi.fn().mockResolvedValue([]);
    const mockQueryRag = vi.fn().mockImplementation((codes: string[], query: string) => {
      if (query.includes("1.17")) return Promise.resolve([{
        anchor_id: "lc214-logistica-117", artigo: "Art. 11", lei: "lc214",
        topicos: "logistica frete armazenagem cbs", conteudo: "...", score: 0.88,
      }]);
      return Promise.resolve([]);
    });

    const result = await generateServiceQuestions(
      ["1.17.19"],
      ["1071-6/00", "4930-2/01"],
      { operationType: "mixed" },
      mockQueryRag,
      mockSolaris
    );
    const arr = result as TrackedQuestion[];

    const logistica = arr.find(q => q.fonte_ref === "lc214-logistica-117");
    expect(logistica?.nbs).toBe("1.17.19");
    expect(logistica?.categoria).not.toBe("regime_diferenciado");
  });
});
