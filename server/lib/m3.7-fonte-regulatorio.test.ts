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

  it("perguntas SOLARIS continuam com fonte='solaris' (não afetado)", async () => {
    const queryRagSpy = vi.fn().mockResolvedValue([]);
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

    const perguntas = result as Array<{ fonte: string }>;
    const solarisQ = perguntas.find(q => q.fonte === "solaris");
    expect(solarisQ).toBeDefined();
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
