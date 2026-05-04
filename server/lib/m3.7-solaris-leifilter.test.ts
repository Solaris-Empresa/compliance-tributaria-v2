/**
 * m3.7-solaris-leifilter.test.ts
 * Sprint M3.7 — Item 11 — querySolarisByCnaes com leiFilter (paridade RAG)
 *
 * Issue: #944 (depende de #940 — campo leiRef no schema)
 * Spec: paridade arquitetural com queryRag (PR #937).
 * Q.NBS e Q.NCM passam whitelist `["lc214", "lc227"]` para SOLARIS path.
 *
 * Vinculadas:
 * - PR #937 — queryRag com leiFilter (padrão original)
 * - PR #939 — REGRA-ORQ-29 (governance)
 * - PR #948 — REGRA-ORQ-33 (RACI)
 * - Issue #940 — campo leiRef no schema (pré-requisito)
 * - Issue #944 (esta)
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("../db", () => ({
  getOnda1Questions: vi.fn(),
}));

import { querySolarisByCnaes } from "./solaris-query";
import { getOnda1Questions } from "../db";

const mockSq = (overrides: Record<string, unknown>) => ({
  id: 1,
  texto: "Pergunta",
  categoria: "geral",
  cnaeGroups: null,
  obrigatorio: 1,
  ativo: 1,
  observacao: null,
  fonte: "solaris",
  criadoPorId: null,
  criadoEm: 0,
  atualizadoEm: null,
  uploadBatchId: null,
  codigo: "SOL-001",
  titulo: null,
  topicos: null,
  severidade_base: null,
  vigencia_inicio: null,
  riskCategoryCode: null,
  classificationScope: "risk_engine" as const,
  mappingReviewStatus: "curated_internal" as const,
  leiRef: null,
  artigoRef: null,
  ...overrides,
});

describe("M3.7 Item 11 — querySolarisByCnaes com leiFilter", () => {
  it("backward-compat: sem leiFilter retorna todas (comportamento atual)", async () => {
    const all = [
      mockSq({ id: 1, leiRef: "lc214" }),
      mockSq({ id: 2, leiRef: "lc224" }),
      mockSq({ id: 3, leiRef: null }),
    ];
    vi.mocked(getOnda1Questions).mockResolvedValue(all as never);

    const result = await querySolarisByCnaes([]);

    expect(result.length).toBe(3);
  });

  it("filtra perguntas com leiRef fora da whitelist", async () => {
    const all = [
      mockSq({ id: 1, leiRef: "lc214" }),
      mockSq({ id: 2, leiRef: "lc224" }),  // bloqueado
      mockSq({ id: 3, leiRef: "lc227" }),
    ];
    vi.mocked(getOnda1Questions).mockResolvedValue(all as never);

    const result = await querySolarisByCnaes([], ["lc214", "lc227"]);

    expect(result.length).toBe(2);
    expect(result.map(q => q.leiRef)).toEqual(["lc214", "lc227"]);
  });

  it("preserva perguntas com leiRef=null (legado pré-M3.7) mesmo com leiFilter", async () => {
    // M3.7 Item 11: backward-compat para perguntas pré-curadoria
    const all = [
      mockSq({ id: 1, leiRef: "lc214" }),
      mockSq({ id: 2, leiRef: null }),  // legado pré-M3.7
      mockSq({ id: 3, leiRef: "lc224" }),  // bloqueado
    ];
    vi.mocked(getOnda1Questions).mockResolvedValue(all as never);

    const result = await querySolarisByCnaes([], ["lc214", "lc227"]);

    expect(result.length).toBe(2);
    expect(result.map(q => q.id).sort()).toEqual([1, 2]);
  });

  it("leiFilter=[] (vazio) é tratado como undefined (sem filtro)", async () => {
    const all = [
      mockSq({ id: 1, leiRef: "lc224" }),
    ];
    vi.mocked(getOnda1Questions).mockResolvedValue(all as never);

    const result = await querySolarisByCnaes([], []);

    expect(result.length).toBe(1);
  });

  it("combina filtro CNAE + leiFilter", async () => {
    const all = [
      mockSq({ id: 1, leiRef: "lc214", cnaeGroups: '["49"]' }),  // match CNAE 49xx + lei
      mockSq({ id: 2, leiRef: "lc224", cnaeGroups: '["49"]' }),  // match CNAE mas lei bloqueada
      mockSq({ id: 3, leiRef: "lc214", cnaeGroups: '["10"]' }),  // não match CNAE
    ];
    vi.mocked(getOnda1Questions).mockResolvedValue(all as never);

    const result = await querySolarisByCnaes(["49.30"], ["lc214", "lc227"]);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(1);
  });
});

describe("M3.7 Item 11 — Q.NBS e Q.NCM passam whitelist correta", () => {
  it("service-questions.ts chama querySolarisFn com leiFilter=['lc214','lc227']", async () => {
    const querySolarisSpy = vi.fn().mockResolvedValue([]);

    vi.doMock("./tracked-question", () => ({
      generateQuestionFromChunk: vi.fn().mockResolvedValue("Pergunta mock"),
      extractLeiRef: vi.fn(),
      inferCategoria: vi.fn(),
      extractLeiRefFromSolaris: vi.fn().mockReturnValue("LC 214/2025"),
      deduplicateById: vi.fn((arr: unknown[]) => arr),
      TrackedQuestion: {},
      QuestionResult: {},
      RagChunk: {},
      SolarisQuestion: {},
    }));
    vi.doMock("./completeness", () => ({
      inferCompanyType: vi.fn().mockReturnValue("servico"),
    }));

    const { generateServiceQuestions } = await import("./service-questions");
    await generateServiceQuestions(
      ["1.0501.14.51"],
      ["49.30"],
      { operationType: "servico" },
      vi.fn().mockResolvedValue([]),
      querySolarisSpy,
    );

    expect(querySolarisSpy).toHaveBeenCalled();
    const callArgs = querySolarisSpy.mock.calls[0];
    expect(callArgs[1]).toEqual(["lc214", "lc227"]);

    vi.doUnmock("./tracked-question");
    vi.doUnmock("./completeness");
  });

  it("product-questions.ts chama querySolarisFn com leiFilter=['lc214','lc227']", async () => {
    const querySolarisSpy = vi.fn().mockResolvedValue([]);

    vi.doMock("./tracked-question", () => ({
      generateQuestionFromChunk: vi.fn().mockResolvedValue("Pergunta mock"),
      extractLeiRef: vi.fn(),
      inferCategoria: vi.fn(),
      extractLeiRefFromSolaris: vi.fn().mockReturnValue("LC 214/2025"),
      deduplicateById: vi.fn((arr: unknown[]) => arr),
      TrackedQuestion: {},
      QuestionResult: {},
      RagChunk: {},
      SolarisQuestion: {},
    }));
    vi.doMock("./completeness", () => ({
      inferCompanyType: vi.fn().mockReturnValue("produto"),
    }));

    const { generateProductQuestions } = await import("./product-questions");
    await generateProductQuestions(
      ["2710.19.21"],
      ["46.81"],
      { operationType: "produto" },
      vi.fn().mockResolvedValue([]),
      querySolarisSpy,
    );

    expect(querySolarisSpy).toHaveBeenCalled();
    const callArgs = querySolarisSpy.mock.calls[0];
    expect(callArgs[1]).toEqual(["lc214", "lc227"]);
  });
});
