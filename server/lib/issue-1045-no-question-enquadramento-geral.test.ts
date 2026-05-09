/**
 * Issue #1045 — NO_QUESTION protocol para `enquadramento_geral`
 *
 * Causa raiz (caso #5040001):
 *   risk_v4 com categoria='enquadramento_geral', rag_validated=false,
 *   artigo='N/A (categoria fallback)' — risco órfão de fundamentação.
 *
 * Cadeia de geração observada:
 *   iagen-gap-analyzer.ts:162 (fallback 'risco_sistemico')
 *     → mapTopicToCategory → 'enquadramento_geral'
 *     → consolidateRisks gera risco com categoria='enquadramento_geral'
 *
 * Fix: guard em consolidateRisks (REGRA-ORQ-29 / NO_QUESTION protocol).
 *
 * Comportamento esperado pós-fix:
 *   - Gap permanece em project_gaps_v3 (auditoria preservada)
 *   - Risco NÃO é gerado em risks_v4 (skip + warn)
 *   - Outras categorias continuam gerando risco normalmente
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { consolidateRisks, type GapRule } from "./risk-engine-v4";

// Mock de módulos que tocam DB — testa lógica pura do engine.
vi.mock("./db-queries-risk-categories", () => ({
  listActiveCategories: vi.fn().mockResolvedValue([]),
  getCategoryByCode: vi.fn().mockResolvedValue(null),
}));
vi.mock("./risk-eligibility", () => ({
  isCategoryAllowed: vi.fn(({}) => ({})),
  insertEligibilityAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import * as eligibilityModule from "./risk-eligibility";

const baseGap = (overrides: Partial<GapRule> = {}): GapRule => ({
  ruleId: "test-rule-1",
  categoria: "enquadramento_geral",
  artigo: "N/A (categoria fallback)",
  fonte: "iagen",
  gapClassification: "iagen",
  requirementId: "req-1",
  sourceReference: "risco_sistemico",
  domain: "tax",
  ...overrides,
});

describe("Issue #1045 — NO_QUESTION protocol para enquadramento_geral", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // eligibility passa categoria suggested direto (sem downgrade)
    vi.mocked(eligibilityModule.isCategoryAllowed).mockImplementation((cat) => ({
      final: cat as never,
      reason: null,
      original: cat as never,
    } as any));
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("Bloqueio de geração", () => {
    it("gap com categoria 'enquadramento_geral' NÃO gera risco", async () => {
      const gaps = [baseGap({ categoria: "enquadramento_geral" })];
      const result = await consolidateRisks(
        5040001,
        gaps,
        { tipoOperacao: "misto", multiestadual: true },
        1,
      );
      expect(result).toEqual([]);
    });

    it("warn message inclui REGRA-ORQ-29 + Issue #1045 + reason=no_normative_base", async () => {
      const gaps = [baseGap({ categoria: "enquadramento_geral" })];
      await consolidateRisks(
        5040001,
        gaps,
        { tipoOperacao: "misto", multiestadual: true },
        1,
      );
      const warnCalls = warnSpy.mock.calls.flat().join(" ");
      expect(warnCalls).toMatch(/enquadramento_geral/);
      expect(warnCalls).toMatch(/NO_QUESTION/);
      expect(warnCalls).toMatch(/REGRA-ORQ-29/);
      expect(warnCalls).toMatch(/#1045/);
      expect(warnCalls).toMatch(/no_normative_base/);
    });

    it("múltiplos gaps com categoria 'enquadramento_geral' resultam em zero riscos", async () => {
      const gaps = [
        baseGap({ ruleId: "r1", categoria: "enquadramento_geral", sourceReference: "risco_sistemico" }),
        baseGap({ ruleId: "r2", categoria: "enquadramento_geral", sourceReference: "governanca" }),
        baseGap({ ruleId: "r3", categoria: "enquadramento_geral", sourceReference: "trilha_auditoria" }),
      ];
      const result = await consolidateRisks(
        5040001,
        gaps,
        { tipoOperacao: "misto", multiestadual: true },
        1,
      );
      expect(result).toEqual([]);
    });

    it("warn é emitido uma vez por grupo de risk_key (não por gap individual)", async () => {
      const gaps = [
        baseGap({ ruleId: "r1", categoria: "enquadramento_geral" }),
        baseGap({ ruleId: "r2", categoria: "enquadramento_geral" }),
      ];
      await consolidateRisks(
        5040001,
        gaps,
        { tipoOperacao: "misto", multiestadual: true },
        1,
      );
      // 1 risk_key (mesma categoria + contexto) → 1 warn
      const enqWarns = warnSpy.mock.calls.filter((args) =>
        String(args[0] ?? "").includes("enquadramento_geral"),
      );
      expect(enqWarns.length).toBe(1);
    });
  });

  describe("Comportamento preservado para outras categorias", () => {
    it("gap com categoria 'split_payment' continua gerando risco", async () => {
      const gaps = [
        baseGap({
          categoria: "split_payment",
          artigo: "Art. 9 LC 214/2025",
          fonte: "solaris",
        }),
      ];
      const result = await consolidateRisks(
        5040001,
        gaps,
        { tipoOperacao: "misto", multiestadual: true },
        1,
      );
      expect(result.length).toBe(1);
      expect(result[0].categoria).toBe("split_payment");
    });

    it("gap com categoria 'imposto_seletivo' continua gerando risco (não confundir com #1046)", async () => {
      const gaps = [
        baseGap({
          categoria: "imposto_seletivo",
          artigo: "Art. 393 LC 214/2025",
          fonte: "regulatorio",
        }),
      ];
      const result = await consolidateRisks(
        5040001,
        gaps,
        { tipoOperacao: "misto", multiestadual: true },
        1,
      );
      expect(result.length).toBe(1);
      expect(result[0].categoria).toBe("imposto_seletivo");
    });

    it("mix de categorias: enquadramento_geral é descartada, outras passam", async () => {
      const gaps = [
        baseGap({ ruleId: "r1", categoria: "split_payment", artigo: "Art. 9" }),
        baseGap({ ruleId: "r2", categoria: "enquadramento_geral" }),
        baseGap({ ruleId: "r3", categoria: "obrigacao_acessoria", artigo: "Art. 102" }),
      ];
      const result = await consolidateRisks(
        5040001,
        gaps,
        { tipoOperacao: "misto", multiestadual: true },
        1,
      );
      const categorias = result.map((r) => r.categoria);
      expect(categorias).toContain("split_payment");
      expect(categorias).toContain("obrigacao_acessoria");
      expect(categorias).not.toContain("enquadramento_geral");
      expect(result.length).toBe(2);
    });
  });

  describe("Caso canônico empírico — projeto #5040001", () => {
    it("gap iagen com tópico 'risco_sistemico' (categoria=enquadramento_geral) NÃO gera risco", async () => {
      // Replica exata do gap observado no CSV exportado 2026-05-09:
      //   "risk","enquadramento_geral","Risco de enquadramento tributário..."
      //   evidence: "[iagen] enquadramento_geral: risco_sistemico | ..."
      const gaps = [
        baseGap({
          ruleId: "iagen-fallback-1",
          categoria: "enquadramento_geral",
          artigo: "N/A (categoria fallback)",
          fonte: "iagen",
          sourceReference: "risco_sistemico",
        }),
        baseGap({
          ruleId: "iagen-fallback-2",
          categoria: "enquadramento_geral",
          artigo: "N/A (categoria fallback)",
          fonte: "iagen",
          sourceReference: "risco_sistemico",
        }),
      ];
      const result = await consolidateRisks(
        5040001,
        gaps,
        { tipoOperacao: "misto", multiestadual: true },
        1,
      );
      expect(result).toEqual([]);
    });

    it("eligibility downgrade para 'enquadramento_geral' também é bloqueado", async () => {
      // Cenário: gap original 'imposto_seletivo' mas eligibility faz downgrade
      // para 'enquadramento_geral' (caso teórico — preserva guard se voltar).
      vi.mocked(eligibilityModule.isCategoryAllowed).mockImplementation(() => ({
        final: "enquadramento_geral" as never,
        reason: "ineligible_archetype",
        original: "imposto_seletivo" as never,
      } as any));

      const gaps = [
        baseGap({ categoria: "imposto_seletivo", artigo: "Art. 393" }),
      ];
      const result = await consolidateRisks(
        5040001,
        gaps,
        { tipoOperacao: "misto", multiestadual: true },
        1,
      );
      expect(result).toEqual([]);
    });
  });

  describe("DoD POSITIVO + NEGATIVO", () => {
    it("DoD POSITIVO: nenhum risco com categoria=enquadramento_geral é retornado por consolidateRisks", async () => {
      const gaps = [
        baseGap({ ruleId: "r1", categoria: "enquadramento_geral" }),
        baseGap({ ruleId: "r2", categoria: "split_payment", artigo: "Art. 9" }),
      ];
      const result = await consolidateRisks(
        5040001,
        gaps,
        { tipoOperacao: "misto", multiestadual: true },
        1,
      );
      const enqRisks = result.filter((r) => r.categoria === "enquadramento_geral");
      expect(enqRisks.length).toBe(0);
    });

    it("DoD NEGATIVO: regressão proibida — engine não pode gerar risco com artigo='N/A (categoria fallback)'", async () => {
      const gaps = [
        baseGap({
          categoria: "enquadramento_geral",
          artigo: "N/A (categoria fallback)",
        }),
      ];
      const result = await consolidateRisks(
        5040001,
        gaps,
        { tipoOperacao: "misto", multiestadual: true },
        1,
      );
      const fallbackArtigos = result.filter((r) =>
        String(r.artigo).includes("N/A"),
      );
      expect(fallbackArtigos.length).toBe(0);
    });
  });
});
