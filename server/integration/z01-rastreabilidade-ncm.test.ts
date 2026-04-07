/**
 * z01-rastreabilidade-ncm.test.ts — Sprint Z Z-01 · Rastreabilidade 20 Casos v2
 * Bloco H — Isolamento de NCM (H-01 a H-05)
 * DEC-M3-05 v3 · ADR-0009
 *
 * Prova que cada pergunta gerada pertence ao NCM declarado no perfil da empresa.
 *
 * Perfis:
 *   E-6 · Agroindústria (mista):  ncmCodes: ['1701.14.00', '2207.10.00']
 *   E-8 · Importadora eletrônicos: ncmCodes: ['8528.72.00', '8516.60.00', '8509.80.10']
 *   E-9 · Construtora (mista):    ncmCodes: ['3816.00.10']
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type TrackedQuestion,
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
vi.mock("../lib/rag-query", () => ({ queryRag: vi.fn() }));
vi.mock("../lib/solaris-query", () => ({ querySolarisByCnaes: vi.fn() }));

describe("Z-01 · Bloco H — Isolamento de NCM", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── H-01: E-6 açúcar+etanol → ncm de origem correto por chunk ────────────
  it("H-01: E-6 açúcar+etanol → ncm de origem correto por chunk", async () => {
    const chunks: Record<string, RagChunk> = {
      "1701": {
        anchor_id: "lc214-art14-acucar-001", artigo: "Art. 14", lei: "lc214",
        topicos: "aliquota zero acucar cana",
        conteudo: "Ficam sujeitos à alíquota zero do IBS e CBS o açúcar...", score: 0.93,
      },
      "2207": {
        anchor_id: "lc214-art2-etanol-001", artigo: "Art. 2", lei: "lc214",
        topicos: "imposto seletivo combustivel etanol",
        conteudo: "O IS incide sobre combustíveis, incluindo etanol...", score: 0.95,
      },
    };
    const mockQueryRag = vi.fn().mockImplementation((codes: string[], query: string) => {
      const key = Object.keys(chunks).find(k => query.includes(k));
      return Promise.resolve(key ? [chunks[key]] : []);
    });
    const mockSolaris = vi.fn().mockResolvedValue([]);

    const result = await generateProductQuestions(
      ["1701.14.00", "2207.10.00"],
      ["1071-6/00"],
      { operationType: "mixed" },
      mockQueryRag,
      mockSolaris
    );
    const arr = result as TrackedQuestion[];

    // PROVA 1: pergunta de açúcar tem ncm correto
    const acucar = arr.find(q => q.fonte_ref === "lc214-art14-acucar-001");
    expect(acucar).toBeDefined();
    expect(acucar?.ncm).toBe("1701.14.00");
    expect(acucar?.ncm).not.toBe("2207.10.00");

    // PROVA 2: pergunta de etanol tem ncm correto e IS como categoria
    const etanol = arr.find(q => q.fonte_ref === "lc214-art2-etanol-001");
    expect(etanol).toBeDefined();
    expect(etanol?.ncm).toBe("2207.10.00");
    expect(etanol?.categoria).toBe("imposto_seletivo");

    // PROVA 3: queryRag chamado 1x para cada NCM
    expect(mockQueryRag).toHaveBeenCalledTimes(2);
    const calls = mockQueryRag.mock.calls.map((c: any[]) => c[1] as string);
    expect(calls.some(q => q.includes("1701"))).toBe(true);
    expect(calls.some(q => q.includes("2207"))).toBe(true);
  });

  // ─── H-02: E-8 3 NCMs eletrônicos → 3 grupos isolados sem cruzamento ──────
  it("H-02: E-8 3 NCMs eletrônicos → 3 grupos isolados sem cruzamento", async () => {
    const chunkMap: Record<string, RagChunk> = {
      "8528": { anchor_id: "rag-tv-8528", artigo: "Art. 18", lei: "lc214",
                topicos: "eletronicos ibs credito", conteudo: "...", score: 0.89 },
      "8516": { anchor_id: "rag-forno-8516", artigo: "Art. 18", lei: "lc214",
                topicos: "eletrodomesticos aliquota", conteudo: "...", score: 0.87 },
      "8509": { anchor_id: "rag-elet-8509", artigo: "Art. 18", lei: "lc214",
                topicos: "pequenos eletrodomesticos ibs", conteudo: "...", score: 0.85 },
    };
    const mockQueryRag = vi.fn().mockImplementation((codes: string[], query: string) => {
      const k = Object.keys(chunkMap).find(k => query.includes(k));
      return Promise.resolve(k ? [chunkMap[k]] : []);
    });
    const mockSolaris = vi.fn().mockResolvedValue([]);

    const result = await generateProductQuestions(
      ["8528.72.00", "8516.60.00", "8509.80.10"],
      ["4751-2/01"],
      { operationType: "product" },
      mockQueryRag,
      mockSolaris
    );
    const arr = result as TrackedQuestion[];

    // PROVA: 3 NCMs distintos cobertos
    const ncmsCobertos = new Set(arr.filter(q => q.fonte === "rag").map(q => q.ncm));
    expect(ncmsCobertos.size).toBe(3);
    expect(ncmsCobertos.has("8528.72.00")).toBe(true);
    expect(ncmsCobertos.has("8516.60.00")).toBe(true);
    expect(ncmsCobertos.has("8509.80.10")).toBe(true);

    // PROVA: nenhuma pergunta com NCM fora do portfólio
    arr.forEach(q => {
      if (q.fonte === "rag")
        expect(["8528.72.00", "8516.60.00", "8509.80.10"]).toContain(q.ncm);
    });
  });

  // ─── H-03: E-8 eletrônicos não geram IS ───────────────────────────────────
  it("H-03: E-8 eletrônicos não geram IS (IS é para bebidas/combustíveis)", async () => {
    const mockQueryRag = vi.fn().mockResolvedValue([{
      anchor_id: "rag-tv-8528", artigo: "Art. 18", lei: "lc214",
      topicos: "eletronicos credito ibs", conteudo: "...", score: 0.88,
    }]);
    const mockSolaris = vi.fn().mockResolvedValue([]);

    const result = await generateProductQuestions(
      ["8528.72.00"],
      ["4751-2/01"],
      { operationType: "product" },
      mockQueryRag,
      mockSolaris
    );
    const arr = result as TrackedQuestion[];

    // PROVA: nenhuma pergunta de IS para eletrônicos
    arr.forEach(q => expect(q.categoria).not.toBe("imposto_seletivo"));
  });

  // ─── H-04: E-6 etanol→IS · açúcar→alíquota zero ──────────────────────────
  it("H-04: E-6 NCM 2207 (etanol) → IS · NCM 1701 (açúcar) → alíquota zero", async () => {
    const mockQueryRag = vi.fn().mockImplementation((codes: string[], query: string) => {
      if (query.includes("2207")) return Promise.resolve([{
        anchor_id: "rag-is-etanol", artigo: "Art. 2", lei: "lc214",
        topicos: "imposto seletivo combustivel", conteudo: "...", score: 0.94,
      }]);
      if (query.includes("1701")) return Promise.resolve([{
        anchor_id: "rag-zero-acucar", artigo: "Art. 14", lei: "lc214",
        topicos: "aliquota zero acucar", conteudo: "...", score: 0.92,
      }]);
      return Promise.resolve([]);
    });
    const mockSolaris = vi.fn().mockResolvedValue([]);

    const result = await generateProductQuestions(
      ["1701.14.00", "2207.10.00"],
      ["1071-6/00"],
      { operationType: "mixed" },
      mockQueryRag,
      mockSolaris
    );
    const arr = result as TrackedQuestion[];

    expect(arr.find(q => q.ncm === "1701.14.00")?.categoria).toBe("aliquota_zero");
    expect(arr.find(q => q.ncm === "2207.10.00")?.categoria).toBe("imposto_seletivo");
  });

  // ─── H-05: E-9 NCM cimento (3816) → materiais construção, não alimentos ───
  it("H-05: E-9 NCM cimento (3816) → materiais construção, não alimentos", async () => {
    const mockQueryRag = vi.fn().mockResolvedValue([{
      anchor_id: "rag-cimento-3816", artigo: "Art. 16", lei: "lc214",
      topicos: "materiais construção ibs credito",
      conteudo: "A apuração do IBS para materiais de construção...", score: 0.91,
    }]);
    const mockSolaris = vi.fn().mockResolvedValue([]);

    const result = await generateProductQuestions(
      ["3816.00.10"],
      ["4120-4/00"],
      { operationType: "mixed" },
      mockQueryRag,
      mockSolaris
    );
    const arr = result as TrackedQuestion[];

    expect(arr[0].ncm).toBe("3816.00.10");
    expect(arr[0].fonte_ref).toBe("rag-cimento-3816");
    expect(arr[0].categoria).not.toBe("imposto_seletivo");
    expect(arr[0].categoria).not.toBe("aliquota_zero");
  });
});
