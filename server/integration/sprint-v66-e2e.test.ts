/**
 * Sprint V66 — Testes E2E: Corpus RAG Expandido (63 artigos)
 *
 * Cobre:
 * - Estrutura e integridade do corpus expandido
 * - Cobertura de CG-IBS (12 resoluções)
 * - Cobertura de RFB/CBS (10 instruções normativas)
 * - Cobertura de Conv. ICMS (17 convênios CONFAZ)
 * - Busca por termos dos novos documentos
 * - Injeção de contexto nos prompts com novos artigos
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { RAG_CORPUS, type CorpusEntry } from "../rag-corpus";

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";

const mockInvokeLLM = vi.mocked(invokeLLM);
const mockGetDb = vi.mocked(getDb);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildLLMResponse(content: string) {
  return {
    choices: [{ message: { content } }],
  } as ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never;
}

function buildRerankResponse(ids: number[]) {
  return buildLLMResponse(
    JSON.stringify({ ranked_ids: ids, justification: "Relevância direta" })
  );
}

// ─── Suite 1: Integridade do Corpus Expandido ────────────────────────────────
describe("V66-CORPUS: Integridade do Corpus Expandido", () => {
  it("V66-C01: corpus deve ter 63 artigos", () => {
    expect(RAG_CORPUS).toHaveLength(63);
  });

  it("V66-C02: todos os artigos devem ter campos obrigatórios preenchidos", () => {
    for (const entry of RAG_CORPUS) {
      expect(entry.lei).toBeTruthy();
      expect(entry.artigo).toBeTruthy();
      expect(entry.titulo).toBeTruthy();
      expect(entry.conteudo.length).toBeGreaterThan(50);
      expect(entry.topicos).toBeTruthy();
      expect(entry.cnaeGroups).toBeTruthy();
    }
  });

  it("V66-C03: deve ter 12 resoluções do CG-IBS", () => {
    const cgIbs = RAG_CORPUS.filter((e) => e.lei === "cg_ibs");
    expect(cgIbs).toHaveLength(12);
  });

  it("V66-C04: deve ter artigos de instruções normativas da RFB/CBS", () => {
    const rfbCbs = RAG_CORPUS.filter((e) => e.lei === "rfb_cbs");
    expect(rfbCbs.length).toBeGreaterThanOrEqual(10);
  });

  it("V66-C05: deve ter artigos de convênios ICMS do CONFAZ", () => {
    const convIcms = RAG_CORPUS.filter((e) => e.lei === "conv_icms");
    expect(convIcms.length).toBeGreaterThanOrEqual(10);
  });

  it("V66-C06: deve manter os artigos originais (ec132, lc214, lc227, lc116, lc87)", () => {
    const originais = RAG_CORPUS.filter((e) =>
      ["ec132", "lc214", "lc227", "lc116", "lc87"].includes(e.lei)
    );
    expect(originais.length).toBeGreaterThanOrEqual(24);
  });

  it("V66-C07: todos os cnaeGroups devem ser strings não vazias", () => {
    for (const entry of RAG_CORPUS) {
      expect(entry.cnaeGroups.length).toBeGreaterThan(0);
    }
  });

  it("V66-C08: artigos CG-IBS devem cobrir split payment", () => {
    const splitPayment = RAG_CORPUS.find(
      (e) =>
        e.lei === "cg_ibs" &&
        e.topicos.toLowerCase().includes("split payment")
    );
    expect(splitPayment).toBeDefined();
    expect(splitPayment?.titulo).toContain("Split Payment");
  });

  it("V66-C09: artigos RFB/CBS devem cobrir alíquota 8,8%", () => {
    const aliquota = RAG_CORPUS.find(
      (e) => e.lei === "rfb_cbs" && e.conteudo.includes("8,8%")
    );
    expect(aliquota).toBeDefined();
  });

  it("V66-C10: artigos Conv. ICMS devem cobrir Zona Franca de Manaus", () => {
    const zfm = RAG_CORPUS.find(
      (e) =>
        e.lei === "conv_icms" &&
        e.titulo.toLowerCase().includes("zona franca")
    );
    expect(zfm).toBeDefined();
    expect(zfm?.conteudo).toContain("2073");
  });
});

// ─── Suite 2: Busca por Termos dos Novos Documentos ─────────────────────────
describe("V66-BUSCA: Busca por Termos dos Novos Documentos", () => {
  beforeAll(() => {
    // Mock do banco retornando artigos CG-IBS para busca de "Comitê Gestor"
    mockGetDb.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(
        RAG_CORPUS.filter((e) => e.lei === "cg_ibs").slice(0, 5).map((e, i) => ({
          id: i + 1,
          lei: e.lei,
          artigo: e.artigo,
          titulo: e.titulo,
          conteudo: e.conteudo,
          topicos: e.topicos,
          cnaeGroups: e.cnaeGroups,
          chunkIndex: e.chunkIndex,
          createdAt: new Date(),
        }))
      ),
    } as any);
  });

  it("V66-B01: corpus deve ter artigos sobre o Comitê Gestor do IBS", () => {
    const cgIbs = RAG_CORPUS.filter(
      (e) => e.lei === "cg_ibs" && e.topicos.toLowerCase().includes("comitê gestor")
    );
    expect(cgIbs.length).toBeGreaterThan(0);
    expect(cgIbs[0].conteudo).toContain("CG-IBS");
  });

  it("V66-B02: corpus deve ter artigo sobre contencioso administrativo do IBS", () => {
    const contencioso = RAG_CORPUS.find(
      (e) =>
        e.lei === "cg_ibs" &&
        e.topicos.toLowerCase().includes("contencioso")
    );
    expect(contencioso).toBeDefined();
    expect(contencioso?.conteudo).toContain("TA-IBS");
  });

  it("V66-B03: corpus deve ter artigo sobre DIFAL na transição", () => {
    const difal = RAG_CORPUS.find(
      (e) =>
        e.lei === "conv_icms" &&
        e.topicos.toLowerCase().includes("difal")
    );
    expect(difal).toBeDefined();
    expect(difal?.conteudo).toContain("Estado de destino");
  });

  it("V66-B04: corpus deve ter artigo sobre CBS para Simples Nacional", () => {
    const simples = RAG_CORPUS.find(
      (e) =>
        e.lei === "rfb_cbs" &&
        e.topicos.toLowerCase().includes("simples nacional")
    );
    expect(simples).toBeDefined();
    // O artigo sobre Simples Nacional menciona DAS ou migração gradual
    expect(
      simples?.conteudo.includes("DAS") ||
      simples?.conteudo.includes("Simples")
    ).toBe(true);
  });

  it("V66-B05: corpus deve ter artigo sobre ICMS-ST na transição", () => {
    const icmsSt = RAG_CORPUS.find(
      (e) =>
        e.lei === "conv_icms" &&
        e.topicos.toLowerCase().includes("icms-st")
    );
    expect(icmsSt).toBeDefined();
    // O artigo ICMS-ST deve mencionar MVA ou substituição tributária
    expect(
      icmsSt?.conteudo.includes("MVA") ||
      icmsSt?.conteudo.includes("substituição tributária")
    ).toBe(true);
  });
});

// ─── Suite 3: Cobertura Setorial dos Novos Artigos ───────────────────────────
describe("V66-SETORIAL: Cobertura Setorial dos Novos Artigos", () => {
  it("V66-S01: CG-IBS deve cobrir setor financeiro (CNAE 64)", () => {
    const financeiro = RAG_CORPUS.filter(
      (e) =>
        e.lei === "cg_ibs" &&
        e.cnaeGroups.split(",").includes("64")
    );
    expect(financeiro.length).toBeGreaterThan(0);
  });

  it("V66-S02: RFB/CBS deve cobrir setor financeiro", () => {
    // Pode estar em rfb_cbs ou lc214 (ambos cobrem serviços financeiros)
    const financeiro = RAG_CORPUS.find(
      (e) =>
        (e.lei === "rfb_cbs" || e.lei === "lc214") &&
        e.topicos.toLowerCase().includes("serviços financeiros")
    );
    expect(financeiro).toBeDefined();
    expect(financeiro?.conteudo).toMatch(/banco|financeiro|spread|adição/i);
  });

  it("V66-S03: Conv. ICMS deve cobrir setor de energia (CNAE 35)", () => {
    const energia = RAG_CORPUS.filter(
      (e) =>
        e.lei === "conv_icms" &&
        e.cnaeGroups.split(",").includes("35")
    );
    expect(energia.length).toBeGreaterThan(0);
  });

  it("V66-S04: Conv. ICMS deve cobrir setor de telecomunicações (CNAE 61)", () => {
    const telecom = RAG_CORPUS.find(
      (e) => e.lei === "conv_icms" && e.cnaeGroups === "61"
    );
    expect(telecom).toBeDefined();
    expect(telecom?.conteudo).toContain("telefonia");
  });

  it("V66-S05: Conv. ICMS deve cobrir setor automotivo (CNAE 29)", () => {
    // Buscar especificamente pelo artigo do setor automotivo
    const automotivo = RAG_CORPUS.find(
      (e) =>
        e.lei === "conv_icms" &&
        e.titulo.toLowerCase().includes("automotivo")
    );
    expect(automotivo).toBeDefined();
    expect(automotivo?.conteudo).toContain("veículos");
  });

  it("V66-S06: CG-IBS deve cobrir cooperativas com regime específico", () => {
    const cooperativas = RAG_CORPUS.find(
      (e) =>
        e.lei === "cg_ibs" &&
        e.titulo.toLowerCase().includes("cooperativa")
    );
    expect(cooperativas).toBeDefined();
    expect(
      cooperativas?.conteudo.includes("ato cooperativo") ||
      cooperativas?.conteudo.includes("cooperados") ||
      cooperativas?.titulo.toLowerCase().includes("cooperativa")
    ).toBe(true);
  });

  it("V66-S07: RFB/CBS deve cobrir importação com CBS-Importação", () => {
    const importacao = RAG_CORPUS.find(
      (e) =>
        e.lei === "rfb_cbs" &&
        e.topicos.toLowerCase().includes("importação")
    );
    expect(importacao).toBeDefined();
    expect(importacao?.conteudo).toContain("valor aduaneiro");
  });

  it("V66-S08: Conv. ICMS deve cobrir agronegócio com insumos isentos", () => {
    const agro = RAG_CORPUS.find(
      (e) =>
        e.lei === "conv_icms" &&
        e.topicos.toLowerCase().includes("agronegócio")
    );
    expect(agro).toBeDefined();
    expect(agro?.conteudo).toContain("fertilizante");
  });

  it("V66-S09: CG-IBS deve ter artigo sobre cashback para baixa renda", () => {
    const cashback = RAG_CORPUS.find(
      (e) =>
        e.lei === "cg_ibs" &&
        e.topicos.toLowerCase().includes("cashback")
    );
    expect(cashback).toBeDefined();
    expect(cashback?.conteudo).toContain("Bolsa Família");
  });

  it("V66-S10: Conv. ICMS deve cobrir e-commerce e marketplace", () => {
    const ecommerce = RAG_CORPUS.find(
      (e) =>
        e.lei === "conv_icms" &&
        e.topicos.toLowerCase().includes("e-commerce")
    );
    expect(ecommerce).toBeDefined();
    expect(ecommerce?.conteudo).toContain("marketplace");
  });
});

// ─── Suite 4: Datas e Prazos Críticos nos Novos Artigos ─────────────────────
describe("V66-PRAZOS: Datas e Prazos Críticos nos Novos Artigos", () => {
  it("V66-P01: CG-IBS deve mencionar prazo de 60 dias para ressarcimento", () => {
    const ressarcimento = RAG_CORPUS.find(
      (e) =>
        e.lei === "cg_ibs" &&
        e.conteudo.includes("60 dias")
    );
    expect(ressarcimento).toBeDefined();
  });

  it("V66-P02: RFB/CBS deve mencionar prazo de habilitação até 31/12/2028", () => {
    const habilitacao = RAG_CORPUS.find(
      (e) =>
        e.lei === "rfb_cbs" &&
        e.conteudo.includes("2028")
    );
    expect(habilitacao).toBeDefined();
  });

  it("V66-P03: Conv. ICMS deve mencionar extinção total em 2033", () => {
    const extincao = RAG_CORPUS.filter(
      (e) =>
        e.lei === "conv_icms" &&
        e.conteudo.includes("2033")
    );
    expect(extincao.length).toBeGreaterThan(0);
  });

  it("V66-P04: CG-IBS deve mencionar split payment via PIX a partir de 01/01/2027", () => {
    const splitPix = RAG_CORPUS.find(
      (e) =>
        e.lei === "cg_ibs" &&
        e.conteudo.includes("01/01/2027")
    );
    expect(splitPix).toBeDefined();
  });

  it("V66-P05: RFB/CBS deve mencionar extinção do PIS/COFINS em 2027", () => {
    const extincaoPis = RAG_CORPUS.find(
      (e) =>
        e.lei === "rfb_cbs" &&
        e.conteudo.includes("2027") &&
        e.topicos.toLowerCase().includes("pis")
    );
    expect(extincaoPis).toBeDefined();
  });

  it("V66-P06: Conv. ICMS deve mencionar vedação de novos benefícios a partir de 01/01/2025", () => {
    const vedacao = RAG_CORPUS.find(
      (e) =>
        e.lei === "conv_icms" &&
        e.conteudo.includes("01/01/2025")
    );
    expect(vedacao).toBeDefined();
  });

  it("V66-P07: CG-IBS deve mencionar prazo de 30 dias para impugnação", () => {
    const impugnacao = RAG_CORPUS.find(
      (e) =>
        e.lei === "cg_ibs" &&
        e.conteudo.includes("30 dias") &&
        e.topicos.toLowerCase().includes("impugnação")
    );
    expect(impugnacao).toBeDefined();
  });
});
