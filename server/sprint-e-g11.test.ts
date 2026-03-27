/**
 * Sprint E — G11: Cobertura e Fundamentação da Matriz de Riscos
 *
 * Critérios de aceite:
 * G11-1: FundamentacaoSchema valida objeto completo
 * G11-2: calcularFundamentacao retorna cobertura "completa" com >=3 artigos
 * G11-3: calcularFundamentacao retorna cobertura "parcial" com 1-2 artigos
 * G11-4: calcularFundamentacao retorna cobertura "insuficiente" com 0 artigos
 * G11-5: calcularFundamentacao preenche dispositivos com anchorIds reais
 * G11-6: calcularFundamentacao ignora artigos sem anchorId (sem quebrar)
 * G11-7: calcularFundamentacao com fonte_risco válida retorna confiabilidade=1.0
 * G11-8: calcularFundamentacao com fonte "fonte não identificada" retorna confiabilidade=0.9
 * G11-9: calcularMatrizMetadata agrega corretamente 3 fundamentacoes mistas
 * G11-10: calcularMatrizMetadata com 0 itens retorna confiabilidade_media=0
 * G11-11: calcularMatrizMetadata com insuficiente gera alerta_geral
 * G11-12: MatrizMetadataSchema valida objeto completo
 * G11-13: RiskItemSchema aceita campo fundamentacao opcional
 * G11-14: RiskItemSchema aceita item sem fundamentacao (retrocompatibilidade)
 * G11-15: anchorId exposto no RetrievedArticle (interface)
 */

import { describe, it, expect } from "vitest";
import {
  FundamentacaoSchema,
  MatrizMetadataSchema,
  RiskItemSchema,
  calcularFundamentacao,
  calcularMatrizMetadata,
  type Fundamentacao,
} from "./ai-schemas";
import type { RetrievedArticle } from "./rag-retriever";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const artigos3: RetrievedArticle[] = [
  { lei: "lc214", artigo: "Anexo I, item 3", titulo: "Arroz", conteudo: "...", anchorId: "lc214-anexo-i-item-3-arroz" },
  { lei: "lc214", artigo: "Anexo I, item 5", titulo: "Feijão", conteudo: "...", anchorId: "lc214-anexo-i-item-5-feijao" },
  { lei: "ec132", artigo: "Art. 3", titulo: "IBS", conteudo: "...", anchorId: "ec132-art-3-ibs" },
];

const artigos2: RetrievedArticle[] = [
  { lei: "lc214", artigo: "Anexo XIV, item 42", titulo: "Metformina", conteudo: "...", anchorId: "lc214-anexo-xiv-item-42-metformina" },
  { lei: "ec132", artigo: "Art. 9", titulo: "CBS", conteudo: "...", anchorId: "ec132-art-9-cbs" },
];

const artigos0: RetrievedArticle[] = [];

const artigosSemAnchor: RetrievedArticle[] = [
  { lei: "lc214", artigo: "Art. 1", titulo: "Sem anchor", conteudo: "..." },
  { lei: "ec132", artigo: "Art. 2", titulo: "Sem anchor 2", conteudo: "..." },
];

// ─────────────────────────────────────────────────────────────────────────────
// G11-1: FundamentacaoSchema valida objeto completo
// ─────────────────────────────────────────────────────────────────────────────
describe("G11 — FundamentacaoSchema", () => {
  it("G11-1: valida objeto completo com todos os campos", () => {
    const obj = {
      chunks_utilizados: 3,
      dispositivos: ["lc214-anexo-i-item-3", "ec132-art-3"],
      cobertura: "completa",
      confiabilidade: 1.0,
      alerta: undefined,
    };
    const result = FundamentacaoSchema.safeParse(obj);
    expect(result.success).toBe(true);
  });

  it("G11-1b: rejeita cobertura inválida", () => {
    const obj = {
      chunks_utilizados: 3,
      dispositivos: [],
      cobertura: "total", // inválido
      confiabilidade: 1.0,
    };
    const result = FundamentacaoSchema.safeParse(obj);
    expect(result.success).toBe(false);
  });

  it("G11-1c: rejeita confiabilidade > 1", () => {
    const obj = {
      chunks_utilizados: 3,
      dispositivos: [],
      cobertura: "completa",
      confiabilidade: 1.5, // inválido
    };
    const result = FundamentacaoSchema.safeParse(obj);
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G11-2 a G11-8: calcularFundamentacao
// ─────────────────────────────────────────────────────────────────────────────
describe("G11 — calcularFundamentacao", () => {
  it("G11-2: cobertura=completa com >=3 artigos", () => {
    const f = calcularFundamentacao(artigos3, "LC 214/2025, Anexo I");
    expect(f.cobertura).toBe("completa");
    expect(f.chunks_utilizados).toBe(3);
  });

  it("G11-3: cobertura=parcial com 1-2 artigos", () => {
    const f = calcularFundamentacao(artigos2, "EC 132/2023, Art. 9");
    expect(f.cobertura).toBe("parcial");
    expect(f.confiabilidade).toBe(0.7);
    expect(f.chunks_utilizados).toBe(2);
  });

  it("G11-4: cobertura=insuficiente com 0 artigos", () => {
    const f = calcularFundamentacao(artigos0, "fonte não identificada");
    expect(f.cobertura).toBe("insuficiente");
    expect(f.confiabilidade).toBe(0.4);
    expect(f.chunks_utilizados).toBe(0);
  });

  it("G11-5: dispositivos preenchidos com anchorIds reais", () => {
    const f = calcularFundamentacao(artigos3, "LC 214/2025, Anexo I");
    expect(f.dispositivos).toEqual([
      "lc214-anexo-i-item-3-arroz",
      "lc214-anexo-i-item-5-feijao",
      "ec132-art-3-ibs",
    ]);
  });

  it("G11-6: artigos sem anchorId não quebram — dispositivos vazios", () => {
    const f = calcularFundamentacao(artigosSemAnchor, "LC 214/2025, Art. 1");
    expect(f.cobertura).toBe("parcial"); // 2 artigos mas sem anchorId
    expect(f.dispositivos).toEqual([]); // sem anchorId → array vazio
    expect(f.chunks_utilizados).toBe(2);
  });

  it("G11-7: fonte_risco válida → confiabilidade=1.0", () => {
    const f = calcularFundamentacao(artigos3, "LC 214/2025, Anexo XIV");
    expect(f.confiabilidade).toBe(1.0);
    expect(f.alerta).toBeUndefined();
  });

  it("G11-8: fonte 'fonte não identificada' com >=3 artigos → confiabilidade=0.9", () => {
    const f = calcularFundamentacao(artigos3, "fonte não identificada");
    expect(f.confiabilidade).toBe(0.9);
    expect(f.cobertura).toBe("completa");
  });

  it("G11-4b: cobertura insuficiente gera alerta", () => {
    const f = calcularFundamentacao(artigos0, "fonte não identificada");
    expect(f.alerta).toBeDefined();
    expect(f.alerta).toContain("insuficiente");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G11-9 a G11-11: calcularMatrizMetadata
// ─────────────────────────────────────────────────────────────────────────────
describe("G11 — calcularMatrizMetadata", () => {
  const fundamentacoes: Fundamentacao[] = [
    { chunks_utilizados: 3, dispositivos: ["a1"], cobertura: "completa", confiabilidade: 1.0 },
    { chunks_utilizados: 2, dispositivos: ["a2"], cobertura: "parcial", confiabilidade: 0.7 },
    { chunks_utilizados: 0, dispositivos: [], cobertura: "insuficiente", confiabilidade: 0.4 },
  ];

  it("G11-9: agrega corretamente 3 fundamentacoes mistas", () => {
    const meta = calcularMatrizMetadata(fundamentacoes);
    expect(meta.total_itens).toBe(3);
    expect(meta.itens_cobertura_completa).toBe(1);
    expect(meta.itens_cobertura_parcial).toBe(1);
    expect(meta.itens_cobertura_insuficiente).toBe(1);
    // confiabilidade_media = (1.0 + 0.7 + 0.4) / 3 = 0.7
    expect(meta.confiabilidade_media).toBe(0.7);
  });

  it("G11-10: 0 itens → confiabilidade_media=0, sem alerta", () => {
    const meta = calcularMatrizMetadata([]);
    expect(meta.total_itens).toBe(0);
    expect(meta.confiabilidade_media).toBe(0);
    expect(meta.alerta_geral).toBeUndefined();
  });

  it("G11-11: itens insuficientes geram alerta_geral", () => {
    const meta = calcularMatrizMetadata(fundamentacoes);
    expect(meta.alerta_geral).toBeDefined();
    expect(meta.alerta_geral).toContain("insuficiente");
  });

  it("G11-11b: sem insuficientes → sem alerta_geral", () => {
    const semInsuficiente: Fundamentacao[] = [
      { chunks_utilizados: 3, dispositivos: [], cobertura: "completa", confiabilidade: 1.0 },
      { chunks_utilizados: 2, dispositivos: [], cobertura: "parcial", confiabilidade: 0.7 },
    ];
    const meta = calcularMatrizMetadata(semInsuficiente);
    expect(meta.alerta_geral).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G11-12: MatrizMetadataSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("G11 — MatrizMetadataSchema", () => {
  it("G11-12: valida objeto completo", () => {
    const obj = {
      total_itens: 5,
      itens_cobertura_completa: 3,
      itens_cobertura_parcial: 1,
      itens_cobertura_insuficiente: 1,
      confiabilidade_media: 0.82,
      alerta_geral: "1 item(ns) com cobertura insuficiente.",
    };
    const result = MatrizMetadataSchema.safeParse(obj);
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G11-13 a G11-14: RiskItemSchema retrocompatibilidade
// ─────────────────────────────────────────────────────────────────────────────
describe("G11 — RiskItemSchema retrocompatibilidade", () => {
  const baseRisk = {
    id: "r1",
    evento: "Risco de alíquota",
    probabilidade: "Alta",
    impacto: "Alto",
    severidade: "Crítica",
    severidade_score: 9,
  };

  it("G11-13: aceita campo fundamentacao opcional", () => {
    const risk = {
      ...baseRisk,
      fundamentacao: {
        chunks_utilizados: 3,
        dispositivos: ["lc214-anexo-i-item-3"],
        cobertura: "completa",
        confiabilidade: 1.0,
      },
    };
    const result = RiskItemSchema.safeParse(risk);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fundamentacao?.cobertura).toBe("completa");
    }
  });

  it("G11-14: aceita item sem fundamentacao (retrocompatibilidade)", () => {
    const result = RiskItemSchema.safeParse(baseRisk);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fundamentacao).toBeUndefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G11-15: RetrievedArticle expõe anchorId
// ─────────────────────────────────────────────────────────────────────────────
describe("G11 — RetrievedArticle interface", () => {
  it("G11-15: anchorId está presente na interface RetrievedArticle", () => {
    const article: RetrievedArticle = {
      lei: "lc214",
      artigo: "Anexo I, item 3",
      titulo: "Arroz",
      conteudo: "Arroz — alíquota zero",
      anchorId: "lc214-anexo-i-item-3-arroz",
    };
    expect(article.anchorId).toBe("lc214-anexo-i-item-3-arroz");
  });

  it("G11-15b: anchorId é opcional — artigo sem anchorId é válido", () => {
    const article: RetrievedArticle = {
      lei: "lc227",
      artigo: "Art. 1",
      titulo: "Sem anchor",
      conteudo: "...",
    };
    expect(article.anchorId).toBeUndefined();
  });
});
