/**
 * z01-rastreabilidade-mista.test.ts — Sprint Z Z-01 · Rastreabilidade 20 Casos v2
 * Bloco J — Empresas mistas: QC e QO simultâneos sem contaminação (J-01 a J-05)
 * DEC-M3-05 v3 · ADR-0009
 *
 * Prova que QC (NCM) e QO (NBS) não se contaminam em empresas mistas.
 *
 * Perfis:
 *   E-6 · Agroindústria (mista):  ncmCodes: ['1701.14.00', '2207.10.00'], nbsCodes: ['1.17.19']
 *   E-8 · Importadora (produto):  ncmCodes: ['8528.72.00', '8516.60.00', '8509.80.10'], nbsCodes: []
 *   E-9 · Construtora (mista):    ncmCodes: ['3816.00.10'], nbsCodes: ['1.05.01', '1.05.11']
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type TrackedQuestion,
  type RagChunk,
} from "../lib/tracked-question";
import { generateProductQuestions } from "../lib/product-questions";
import { generateServiceQuestions } from "../lib/service-questions";

// ─── Mocks de módulos ─────────────────────────────────────────────────────────
vi.mock("../lib/tracked-question", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tracked-question")>();
  return {
    ...actual,
    generateQuestionFromChunk: vi.fn().mockResolvedValue(
      "A empresa realizou o enquadramento nas alíquotas do IBS e CBS?"
    ),
  };
});
vi.mock("../lib/rag-query", () => ({ queryRag: vi.fn() }));
vi.mock("../lib/solaris-query", () => ({ querySolarisByCnaes: vi.fn() }));

describe("Z-01 · Bloco J — Empresas mistas: QC e QO sem contaminação", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── J-01: E-6 QC (açúcar/etanol) e QO (logística) sem contaminação cruzada
  it("J-01: E-6 QC (açúcar/etanol) e QO (logística) sem contaminação cruzada", async () => {
    const mockQCRag = vi.fn().mockImplementation((codes: string[], query: string) => {
      if (query.includes("1701")) return Promise.resolve([{
        anchor_id: "rag-acucar-qc", artigo: "Art. 14", lei: "lc214",
        topicos: "aliquota zero", conteudo: "...", score: 0.93,
      }]);
      if (query.includes("2207")) return Promise.resolve([{
        anchor_id: "rag-etanol-qc", artigo: "Art. 2", lei: "lc214",
        topicos: "imposto seletivo", conteudo: "...", score: 0.94,
      }]);
      return Promise.resolve([]);
    });
    const mockQORag = vi.fn().mockResolvedValue([{
      anchor_id: "rag-logistica-qo", artigo: "Art. 11", lei: "lc214",
      topicos: "logistica frete cbs", conteudo: "...", score: 0.88,
    }]);
    const mockSolaris = vi.fn().mockResolvedValue([]);

    const resultQC = await generateProductQuestions(
      ["1701.14.00", "2207.10.00"],
      ["1071-6/00"],
      { operationType: "mixed" },
      mockQCRag,
      mockSolaris
    );
    const resultQO = await generateServiceQuestions(
      ["1.17.19"],
      ["4930-2/01"],
      { operationType: "mixed" },
      mockQORag,
      mockSolaris
    );

    const qcArr = resultQC as TrackedQuestion[];
    const qoArr = resultQO as TrackedQuestion[];

    // PROVA: QC não tem nbs · QO não tem ncm
    qcArr.forEach(q => expect(q.nbs).toBeUndefined());
    qoArr.forEach(q => { if (q.fonte === "rag") expect(q.ncm).toBeUndefined(); });

    // PROVA: zero fonte_refs em comum entre QC e QO
    const qcRefs = new Set(qcArr.map(q => q.fonte_ref));
    const qoRefs = new Set(qoArr.map(q => q.fonte_ref));
    expect([...qcRefs].filter(r => qoRefs.has(r)).length).toBe(0);
  });

  // ─── J-02: E-9 QC (cimento) + QO (construção + incorporação) = IDs únicos ─
  it("J-02: E-9 QC (cimento) + QO (construção + incorporação) = IDs únicos", async () => {
    const mockProdRag = vi.fn().mockResolvedValue([{
      anchor_id: "rag-cimento-3816", artigo: "Art. 16", lei: "lc214",
      topicos: "materiais construção ibs", conteudo: "...", score: 0.91,
    }]);
    const mockServRag = vi.fn().mockImplementation((codes: string[], query: string) => {
      if (query.includes("1.05.01")) return Promise.resolve([{
        anchor_id: "rag-obra-10501", artigo: "Art. 12", lei: "lc214",
        topicos: "construcao civil cbs", conteudo: "...", score: 0.90,
      }]);
      if (query.includes("1.05.11")) return Promise.resolve([{
        anchor_id: "rag-incorpor-10511", artigo: "Art. 12", lei: "lc214",
        topicos: "incorporacao imobiliaria", conteudo: "...", score: 0.88,
      }]);
      return Promise.resolve([]);
    });
    const mockSolaris = vi.fn().mockResolvedValue([]);

    const resultQC = await generateProductQuestions(
      ["3816.00.10"],
      ["4120-4/00"],
      { operationType: "mixed" },
      mockProdRag,
      mockSolaris
    );
    const resultQO = await generateServiceQuestions(
      ["1.05.01", "1.05.11"],
      ["4120-4/00"],
      { operationType: "mixed" },
      mockServRag,
      mockSolaris
    );

    const qcArr = resultQC as TrackedQuestion[];
    const qoArr = resultQO as TrackedQuestion[];

    expect(qcArr.find(q => q.ncm === "3816.00.10")).toBeDefined();
    expect(qoArr.find(q => q.nbs === "1.05.01")).toBeDefined();
    expect(qoArr.find(q => q.nbs === "1.05.11")).toBeDefined();

    // IDs únicos entre QC e QO
    const allIds = [...qcArr, ...qoArr].map(q => q.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  // ─── J-03: E-6 portfólio completo: 2 NCMs + 1 NBS cobertos na mista ───────
  it("J-03: E-6 portfólio completo: 2 NCMs + 1 NBS cobertos na mista", async () => {
    const mockProdRag = vi.fn().mockImplementation((codes: string[], query: string) => {
      if (query.includes("1701")) return Promise.resolve([{
        anchor_id: "rag-acucar", artigo: "Art. 14", lei: "lc214",
        topicos: "aliquota zero", conteudo: "...", score: 0.93,
      }]);
      if (query.includes("2207")) return Promise.resolve([{
        anchor_id: "rag-etanol", artigo: "Art. 2", lei: "lc214",
        topicos: "imposto seletivo", conteudo: "...", score: 0.94,
      }]);
      return Promise.resolve([]);
    });
    const mockServRag = vi.fn().mockResolvedValue([{
      anchor_id: "rag-logistica", artigo: "Art. 11", lei: "lc214",
      topicos: "frete cbs", conteudo: "...", score: 0.88,
    }]);
    const mockSolaris = vi.fn().mockResolvedValue([]);

    const resultQC = await generateProductQuestions(
      ["1701.14.00", "2207.10.00"],
      ["1071-6/00"],
      { operationType: "mixed" },
      mockProdRag,
      mockSolaris
    );
    const resultQO = await generateServiceQuestions(
      ["1.17.19"],
      ["4930-2/01"],
      { operationType: "mixed" },
      mockServRag,
      mockSolaris
    );

    const total = [
      ...(resultQC as TrackedQuestion[]),
      ...(resultQO as TrackedQuestion[]),
    ];
    const ncmsCobertos = new Set(total.filter(q => q.ncm).map(q => q.ncm));
    const nbsCobertos = new Set(total.filter(q => q.nbs).map(q => q.nbs));

    expect(ncmsCobertos.has("1701.14.00")).toBe(true);
    expect(ncmsCobertos.has("2207.10.00")).toBe(true);
    expect(nbsCobertos.has("1.17.19")).toBe(true);
  });

  // ─── J-04: E-9 SOLARIS filtrado por CNAE construção (41), não saúde (86) ──
  it("J-04: E-9 SOLARIS filtrado por CNAE construção (41), não saúde (86)", async () => {
    const mockSolaris = vi.fn().mockImplementation(async (cnaes: string[]) => {
      const result: any[] = [];
      if (cnaes.some((c: string) => c.startsWith("41"))) {
        result.push({
          id: 30, codigo: "SOL-030",
          texto: "A empresa verificou as regras de CBS para obras de construção civil?",
          categoria: "enquadramento_geral", cnaeGroups: ["41"],
          topicos: "LC 214/2025 construção civil",
        });
      }
      if (cnaes.some((c: string) => c.startsWith("86"))) {
        result.push({
          id: 22, codigo: "SOL-022",
          texto: "Pergunta saúde...", categoria: "regime_diferenciado",
          cnaeGroups: ["86"], topicos: "saúde",
        });
      }
      return result;
    });
    const mockQueryRag = vi.fn().mockResolvedValue([]);

    const result = await generateServiceQuestions(
      ["1.05.01"],
      ["4120-4/00", "4110-7/00"], // CNAE construção — sem saúde
      { operationType: "mixed" },
      mockQueryRag,
      mockSolaris
    );
    const arr = result as TrackedQuestion[];

    expect(arr.find(q => q.fonte_ref === "SOL-030")).toBeDefined();    // construção ✓
    expect(arr.find(q => q.fonte_ref === "SOL-022")).toBeUndefined();  // saúde ✗
    expect(mockSolaris).toHaveBeenCalledWith(["4120-4/00", "4110-7/00"]);
  });

  // ─── J-05: E-8 produto puro: QO = nao_aplicavel · QC cobre 3 NCMs distintos
  it("J-05: E-8 produto puro: QO = nao_aplicavel · QC cobre 3 NCMs distintos", async () => {
    const mockQCRag = vi.fn().mockImplementation((codes: string[], query: string) => {
      if (query.includes("8528")) return Promise.resolve([{
        anchor_id: "rag-tv", artigo: "Art. 18", lei: "lc214",
        topicos: "eletronicos ibs", conteudo: "...", score: 0.89,
      }]);
      if (query.includes("8516")) return Promise.resolve([{
        anchor_id: "rag-forno", artigo: "Art. 18", lei: "lc214",
        topicos: "eletrodomesticos", conteudo: "...", score: 0.87,
      }]);
      if (query.includes("8509")) return Promise.resolve([{
        anchor_id: "rag-elet", artigo: "Art. 18", lei: "lc214",
        topicos: "pequenos eletrodomesticos", conteudo: "...", score: 0.85,
      }]);
      return Promise.resolve([]);
    });
    const mockSolaris = vi.fn().mockResolvedValue([]);

    const resultQC = await generateProductQuestions(
      ["8528.72.00", "8516.60.00", "8509.80.10"],
      ["4751-2/01"],
      { operationType: "product" },
      mockQCRag,
      mockSolaris
    );
    const resultQO = await generateServiceQuestions(
      [],
      ["4751-2/01"],
      { operationType: "product" },
      vi.fn().mockResolvedValue([]),
      vi.fn().mockResolvedValue([])
    );

    expect(resultQO).toEqual({ nao_aplicavel: true });
    const qcArr = resultQC as TrackedQuestion[];
    expect(new Set(qcArr.filter(q => q.fonte === "rag").map(q => q.ncm)).size).toBe(3);
  });
});
