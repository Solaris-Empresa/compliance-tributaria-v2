/**
 * BUG-RESP-01 — Pipeline de Respostas: resolveProjectAnswers + buildProductServiceLayers
 * ADR-0011: Consolidação de respostas com fallback V3+/V1-V2
 *
 * Specs: R01-01 a R01-05
 */
import { describe, it, expect } from "vitest";
import {
  resolveProjectAnswers,
  buildProductServiceLayers,
} from "../diagnostic-consolidator";

// ─── R01-01: Projeto V3+ usa productAnswers/serviceAnswers ───────────────────
describe("R01-01: Projeto V3+ prioriza colunas TO-BE", () => {
  it("deve retornar productAnswers e serviceAnswers quando ambas existem", () => {
    const project = {
      productAnswers: [{ pergunta: "Qual NCM?", resposta: "2202.10.00" }],
      serviceAnswers: [{ pergunta: "Qual NBS?", resposta: "1.03.01.00" }],
      corporateAnswers: { perguntas: [{ pergunta: "Legado", resposta: "ignorado" }] },
      operationalAnswers: { perguntas: [{ pergunta: "Legado", resposta: "ignorado" }] },
    };
    const result = resolveProjectAnswers(project);
    expect(result.productAnswers).toEqual(project.productAnswers);
    expect(result.serviceAnswers).toEqual(project.serviceAnswers);
  });
});

// ─── R01-02: Projeto V1/V2 faz fallback para colunas legadas ────────────────
describe("R01-02: Projeto V1/V2 faz fallback para colunas legadas", () => {
  it("deve usar corporateAnswers quando productAnswers é null", () => {
    const project = {
      productAnswers: null,
      serviceAnswers: null,
      corporateAnswers: [{ pergunta: "Tipo produto?", resposta: "Bebidas" }],
      operationalAnswers: [{ pergunta: "Tipo serviço?", resposta: "Saúde" }],
    };
    const result = resolveProjectAnswers(project);
    expect(result.productAnswers).toEqual(project.corporateAnswers);
    expect(result.serviceAnswers).toEqual(project.operationalAnswers);
  });

  it("deve retornar null quando não há nenhuma coluna preenchida", () => {
    const project = {
      productAnswers: null,
      serviceAnswers: null,
      corporateAnswers: null,
      operationalAnswers: null,
    };
    const result = resolveProjectAnswers(project);
    expect(result.productAnswers).toBeNull();
    expect(result.serviceAnswers).toBeNull();
  });
});

// ─── R01-03: buildProductServiceLayers com TrackedAnswer[] (formato Z-02) ───
describe("R01-03: buildProductServiceLayers com formato Z-02 (TrackedAnswer[])", () => {
  it("deve criar camada NCM_PRODUTO com perguntas do TrackedAnswer[]", () => {
    const productAnswers = [
      { pergunta: "Produto sujeito ao IS?", resposta: "Sim — bebidas açucaradas" },
      { pergunta: "Percentual IS estimado?", resposta: "10%" },
    ];
    const layers = buildProductServiceLayers(productAnswers, null);
    expect(layers).toHaveLength(1);
    expect(layers[0].cnaeCode).toBe("NCM_PRODUTO");
    expect(layers[0].level).toBe("q_produto");
    expect(layers[0].questions).toHaveLength(2);
    expect(layers[0].questions[0].question).toBe("Produto sujeito ao IS?");
    expect(layers[0].questions[0].answer).toBe("Sim — bebidas açucaradas");
  });

  it("deve criar camada NBS_SERVICO com perguntas do TrackedAnswer[]", () => {
    const serviceAnswers = [
      { pergunta: "Serviço de saúde?", resposta: "Sim — plano de saúde" },
    ];
    const layers = buildProductServiceLayers(null, serviceAnswers);
    expect(layers).toHaveLength(1);
    expect(layers[0].cnaeCode).toBe("NBS_SERVICO");
    expect(layers[0].level).toBe("q_servico");
    expect(layers[0].questions[0].question).toBe("Serviço de saúde?");
  });

  it("deve criar 2 camadas quando ambas têm respostas", () => {
    const productAnswers = [{ pergunta: "NCM?", resposta: "2202" }];
    const serviceAnswers = [{ pergunta: "NBS?", resposta: "1.03" }];
    const layers = buildProductServiceLayers(productAnswers, serviceAnswers);
    expect(layers).toHaveLength(2);
    expect(layers.map(l => l.cnaeCode)).toEqual(["NCM_PRODUTO", "NBS_SERVICO"]);
  });
});

// ─── R01-04: buildProductServiceLayers com formato legado (objeto com perguntas) ─
describe("R01-04: buildProductServiceLayers com formato legado (objeto com perguntas)", () => {
  it("deve processar formato legado com campo perguntas[]", () => {
    const legacyAnswers = {
      perguntas: [
        { pergunta: "Tipo produto?", resposta: "Bebidas" },
        { pergunta: "Alíquota?", resposta: "10%" },
      ],
    };
    const layers = buildProductServiceLayers(legacyAnswers, null);
    expect(layers).toHaveLength(1);
    expect(layers[0].questions).toHaveLength(2);
  });
});

// ─── R01-05: Projeto sem respostas retorna array vazio ───────────────────────
describe("R01-05: Projeto sem respostas retorna array vazio", () => {
  it("deve retornar array vazio quando productAnswers e serviceAnswers são null", () => {
    const layers = buildProductServiceLayers(null, null);
    expect(layers).toHaveLength(0);
  });

  it("deve retornar array vazio quando arrays estão vazios", () => {
    const layers = buildProductServiceLayers([], []);
    expect(layers).toHaveLength(0);
  });

  it("deve parsear string JSON corretamente", () => {
    const project = {
      productAnswers: JSON.stringify([{ pergunta: "NCM?", resposta: "2202" }]),
      serviceAnswers: null,
    };
    const result = resolveProjectAnswers(project);
    expect(Array.isArray(result.productAnswers)).toBe(true);
    expect(result.productAnswers[0].pergunta).toBe("NCM?");
  });
});
