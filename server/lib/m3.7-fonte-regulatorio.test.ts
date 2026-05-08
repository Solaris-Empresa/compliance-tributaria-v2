/**
 * m3.7-fonte-regulatorio.test.ts
 * Sprint M3.7 — Item 4 — Padronização da fonte canônica "regulatorio" (Onda 3)
 *
 * Issue: #941
 * Spec: docs/arquitetura/E2E-3-ONDAS-QUESTIONARIOS-v1.md:79 — Onda 3 fonte = "regulatorio"
 *
 * Bug A (backend): service-questions e product-questions retornavam fonte: "rag",
 * divergindo da fonte canônica. OndaBadge no frontend retornava null para "rag".
 * Foi a raiz do "blind faith" da auditoria do P.O.
 *
 * Bug B (frontend, MatrizesV3.tsx): risk.fonte_risco lia texto livre em vez de
 * risk.fonte_risco_tipo (enum). Adicionalmente, FONTE_BADGE não tinha entrada
 * "regulatorio" — testado via leitura source (Plano B REGRA-ORQ-27).
 *
 * Vinculadas:
 * - PR #939 — REGRAs ORQ-29 a 32 (governance)
 * - PR #948 — REGRA-ORQ-33 (RACI)
 * - Issue #941 (esta)
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("./tracked-question", () => ({
  generateQuestionFromChunk: vi.fn().mockResolvedValue("Pergunta mock"),
  extractLeiRef: vi.fn().mockReturnValue("LC 214/2025 art. 1"),
  inferCategoria: vi.fn().mockReturnValue("ibs_cbs"),
  extractLeiRefFromSolaris: vi.fn().mockReturnValue("LC 214/2025"),
  deduplicateById: vi.fn((arr: unknown[]) => arr),
  TrackedQuestion: {},
  QuestionResult: {},
  RagChunk: {},
  SolarisQuestion: {},
}));
vi.mock("./solaris-query", () => ({
  querySolarisByCnaes: vi.fn().mockResolvedValue([]),
}));
vi.mock("./completeness", () => ({
  inferCompanyType: vi.fn().mockImplementation((profile: { operationType?: string }) => {
    if (profile.operationType === "produto") return "produto";
    return "servico";
  }),
}));

import { generateServiceQuestions } from "./service-questions";
import { generateProductQuestions } from "./product-questions";

describe("M3.7 Item 4 — Backend: fonte canônica 'regulatorio' (Onda 3)", () => {
  it("generateServiceQuestions retorna fonte='regulatorio' para perguntas RAG (Q.NBS)", async () => {
    const mockChunk = {
      anchor_id: "lc214-art1-nbs",
      conteudo: "Conteúdo RAG",
      lei: "lc214",
      score: 0.9,
    };
    const queryRagSpy = vi.fn().mockResolvedValue([mockChunk]);

    const result = await generateServiceQuestions(
      ["1.0501.14.51"],
      ["4930-2/02"],
      { operationType: "servico", archetype: null },
      queryRagSpy,
    );

    expect(Array.isArray(result)).toBe(true);
    const perguntas = result as Array<{ fonte: string }>;
    const ragQ = perguntas.find(q => q.fonte === "regulatorio");
    expect(ragQ).toBeDefined();
    // Garantir que NÃO retorna mais "rag" (valor legado)
    const ragLegado = perguntas.find(q => q.fonte === "rag");
    expect(ragLegado).toBeUndefined();
  });

  it("generateProductQuestions retorna fonte='regulatorio' para perguntas RAG (Q.NCM)", async () => {
    const mockChunk = {
      anchor_id: "lc214-art1-ncm",
      conteudo: "Conteúdo RAG",
      lei: "lc214",
      score: 0.9,
    };
    const queryRagSpy = vi.fn().mockResolvedValue([mockChunk]);

    const result = await generateProductQuestions(
      ["2710.19.21"],
      ["4681-8/02"],
      { operationType: "produto", archetype: null },
      queryRagSpy,
    );

    expect(Array.isArray(result)).toBe(true);
    const perguntas = result as Array<{ fonte: string }>;
    const ragQ = perguntas.find(q => q.fonte === "regulatorio");
    expect(ragQ).toBeDefined();
    const ragLegado = perguntas.find(q => q.fonte === "rag");
    expect(ragLegado).toBeUndefined();
  });

  it("Issue #1035 V1 — SOLARIS bloqueado em Q.NBS pelo airbag (retorna nao_aplicavel)", async () => {
    // Pós-PR #1036: querySolarisByCnaes com contextType='q_nbs' é bloqueado pelo airbag V1.
    // Mesmo que o caller passe um querySolarisFn que retornaria perguntas,
    // o mock global (vi.mock) retorna [] — simulando o airbag.
    // Com RAG também vazio, resultado = { nao_aplicavel: true, motivo: 'no_applicable_requirements' }
    const queryRagSpy = vi.fn().mockResolvedValue([]);
    // querySolarisFn injetado retorna perguntas, mas o vi.mock global
    // de solaris-query já retorna [] (airbag). O parâmetro querySolarisFn
    // é passado diretamente à função, então usamos um spy que simula
    // o comportamento real do airbag (retorna []).
    const querySolarisSpy = vi.fn().mockResolvedValue([]);

    const result = await generateServiceQuestions(
      ["1.0501.14.51"],
      ["4930-2/02"],
      { operationType: "servico", archetype: null },
      queryRagSpy,
      querySolarisSpy,
    );

    // Pós-Issue #1035: sem RAG e sem SOLARIS → NO_QUESTION protocol
    expect(Array.isArray(result)).toBe(false);
    const naoAplicavel = result as { nao_aplicavel: boolean; motivo?: string };
    expect(naoAplicavel.nao_aplicavel).toBe(true);
    expect(naoAplicavel.motivo).toBe("no_applicable_requirements");
  });

  it("Issue #1035 V1 — SOLARIS NÃO é injetado em Q.NBS mesmo com querySolarisFn retornando dados", async () => {
    // Cenário: querySolarisFn retorna perguntas (simulando bypass do airbag no mock),
    // mas o código em service-questions.ts NÃO injeta SOLARIS no resultado (bloco comentado).
    // Resultado: apenas perguntas RAG aparecem no output.
    const mockChunk = {
      anchor_id: "lc214-art1-nbs-solaris-test",
      conteudo: "Conteúdo RAG para teste",
      lei: "lc214",
      score: 0.85,
    };
    const queryRagSpy = vi.fn().mockResolvedValue([mockChunk]);
    // Mesmo retornando SOLARIS, o código não injeta (bloco comentado pós-PR #1036)
    const querySolarisSpy = vi.fn().mockResolvedValue([
      {
        id: 1,
        codigo: "SOL-001",
        texto: "Pergunta SOLARIS",
        categoria: "controle_fiscal",
        topicos: "LC 214/2025",
      },
    ]);

    const result = await generateServiceQuestions(
      ["1.0501.14.51"],
      ["4930-2/02"],
      { operationType: "servico", archetype: null },
      queryRagSpy,
      querySolarisSpy,
    );

    // Resultado é array de perguntas (apenas RAG, sem SOLARIS)
    expect(Array.isArray(result)).toBe(true);
    const perguntas = result as Array<{ fonte: string }>;
    // Nenhuma pergunta SOLARIS no resultado
    const solarisQ = perguntas.find(q => q.fonte === "solaris");
    expect(solarisQ).toBeUndefined();
    // Apenas perguntas regulatórias (RAG)
    const ragQ = perguntas.find(q => q.fonte === "regulatorio");
    expect(ragQ).toBeDefined();
  });
});

// ─── Frontend: validação por leitura source (REGRA-ORQ-27 Plano B) ──────────

const MATRIZES_V3_SRC = readFileSync(
  path.resolve(__dirname, "..", "..", "client", "src", "pages", "MatrizesV3.tsx"),
  "utf-8",
);

describe("M3.7 Item 4 — Frontend: MatrizesV3 lê fonte_risco_tipo + badge 'regulatorio'", () => {
  it("MatrizesV3 lê risk.fonte_risco_tipo (enum estruturado)", () => {
    expect(MATRIZES_V3_SRC).toMatch(/risk\.fonte_risco_tipo\s*\?\?/);
  });

  it("FONTE_BADGE inclui entrada 'regulatorio' com label 'Legislação'", () => {
    // Padrão flexível: regulatorio: { label: 'Legislação' ... }
    expect(MATRIZES_V3_SRC).toMatch(/regulatorio:\s*\{\s*label:\s*['"]Legislação['"]/);
  });

  it("FONTE_BADGE preserva entradas legadas (cnae, iagen, v1) para backward-compat", () => {
    expect(MATRIZES_V3_SRC).toMatch(/cnae:\s*\{/);
    expect(MATRIZES_V3_SRC).toMatch(/iagen:\s*\{/);
    expect(MATRIZES_V3_SRC).toMatch(/v1:\s*\{/);
  });

  it("Risk interface declara fonte_risco_tipo opcional (M3.7)", () => {
    expect(MATRIZES_V3_SRC).toMatch(/fonte_risco_tipo\?:/);
  });
});
