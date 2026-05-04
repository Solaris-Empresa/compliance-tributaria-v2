/**
 * m3.7-no-question-protocol.test.ts
 * Sprint M3.7 — Item 5 — NO_QUESTION protocol substitui fallbacks hardcoded
 *
 * Issue: #942
 * Spec: REGRA-ORQ-29 — sem requisito = sem pergunta = sem gap.
 * ADR-010 Regra 5: registrar como skipped com motivo no_applicable_requirements.
 *
 * Tests:
 * - Plano A (REGRA-ORQ-27): vi.fn captura retorno de generateServiceQuestions/Product
 * - Plano B: leitura source para confirmar remoção das funções hardcoded
 *
 * Vinculadas:
 * - PR #939 — REGRA-ORQ-29 (governance)
 * - PR #948 — REGRA-ORQ-33 (RACI)
 * - Issue #942 (esta)
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

const SERVICE_QUESTIONS_SRC = readFileSync(
  path.resolve(__dirname, "service-questions.ts"),
  "utf-8",
);
const PRODUCT_QUESTIONS_SRC = readFileSync(
  path.resolve(__dirname, "product-questions.ts"),
  "utf-8",
);
const ROUTERS_SRC = readFileSync(
  path.resolve(__dirname, "..", "routers-fluxo-v3.ts"),
  "utf-8",
);

describe("M3.7 Item 5 — NO_QUESTION protocol substitui fallbacks hardcoded", () => {
  it("generateServiceQuestions sem NBS retorna nao_aplicavel + motivo + alerta", async () => {
    const result = await generateServiceQuestions(
      [],
      ["62.01"],
      { operationType: "servico" },
      vi.fn().mockResolvedValue([]),
      vi.fn().mockResolvedValue([]),
    );

    expect(result).toMatchObject({
      nao_aplicavel: true,
      motivo: "no_nbs_codes",
    });
    expect((result as { alerta?: string }).alerta).toContain("NBS");
  });

  it("generateProductQuestions sem NCM retorna nao_aplicavel + motivo + alerta", async () => {
    const result = await generateProductQuestions(
      [],
      ["15.1"],
      { operationType: "produto" },
      vi.fn().mockResolvedValue([]),
      vi.fn().mockResolvedValue([]),
    );

    expect(result).toMatchObject({
      nao_aplicavel: true,
      motivo: "no_ncm_codes",
    });
    expect((result as { alerta?: string }).alerta).toContain("NCM");
  });

  it("generateServiceQuestions com NBS mas RAG/SOLARIS vazios retorna no_applicable_requirements", async () => {
    const result = await generateServiceQuestions(
      ["1.0501.14.51"],
      ["49.30"],
      { operationType: "servico" },
      vi.fn().mockResolvedValue([]),  // RAG vazio
      vi.fn().mockResolvedValue([]),  // SOLARIS vazio
    );

    expect(result).toMatchObject({
      nao_aplicavel: true,
      motivo: "no_applicable_requirements",
    });
  });

  it("generateProductQuestions com NCM mas RAG/SOLARIS vazios retorna no_applicable_requirements", async () => {
    const result = await generateProductQuestions(
      ["2710.19.21"],
      ["46.81"],
      { operationType: "produto" },
      vi.fn().mockResolvedValue([]),
      vi.fn().mockResolvedValue([]),
    );

    expect(result).toMatchObject({
      nao_aplicavel: true,
      motivo: "no_applicable_requirements",
    });
  });
});

describe("M3.7 Item 5 — fallbacks hardcoded REMOVIDOS do código", () => {
  it("service-questions.ts NÃO contém função buildServiceFallback", () => {
    expect(SERVICE_QUESTIONS_SRC).not.toMatch(/function buildServiceFallback/);
  });

  it("product-questions.ts NÃO contém função buildProductFallback", () => {
    expect(PRODUCT_QUESTIONS_SRC).not.toMatch(/function buildProductFallback/);
  });

  it("routers-fluxo-v3.ts NÃO contém const FALLBACK_QUESTIONS", () => {
    expect(ROUTERS_SRC).not.toMatch(/const FALLBACK_QUESTIONS\s*=/);
  });

  it("routers-fluxo-v3.ts NÃO contém perguntas hardcoded com confidence_score: 0.5", () => {
    // A âncora textual que existia em FALLBACK_QUESTIONS (perguntas inventadas)
    expect(ROUTERS_SRC).not.toMatch(/'A empresa possui operações com substituição tributária/);
    expect(ROUTERS_SRC).not.toMatch(/'Qual o percentual estimado de receita sujeita ao IBS\/CBS/);
  });

  it("service-questions.ts retorna NO_QUESTION protocol em vez de hardcoded", () => {
    expect(SERVICE_QUESTIONS_SRC).toMatch(/motivo:\s*['"]no_nbs_codes['"]/);
    expect(SERVICE_QUESTIONS_SRC).toMatch(/motivo:\s*['"]no_applicable_requirements['"]/);
  });

  it("product-questions.ts retorna NO_QUESTION protocol em vez de hardcoded", () => {
    expect(PRODUCT_QUESTIONS_SRC).toMatch(/motivo:\s*['"]no_ncm_codes['"]/);
    expect(PRODUCT_QUESTIONS_SRC).toMatch(/motivo:\s*['"]no_applicable_requirements['"]/);
  });

  it("routers-fluxo-v3.ts Onda 2 retorna source: 'unavailable' em falha", () => {
    expect(ROUTERS_SRC).toMatch(/source:\s*['"]unavailable['"]/);
    expect(ROUTERS_SRC).toMatch(/motivo:\s*['"]llm_failure['"]/);
    expect(ROUTERS_SRC).toMatch(/motivo:\s*['"]insufficient_valid_questions['"]/);
  });
});
