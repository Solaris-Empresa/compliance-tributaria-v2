/**
 * m3-archetype-e2e.test.ts — Sprint M3 NOVA-09
 *
 * Suite de integração end-to-end do contrato M3 (arquétipo + rastreabilidade):
 *
 *   E1: getArchetypeContext formata 7 dimensões corretamente
 *   E2: archetype null/undefined/inválido retorna "" (backward-compat)
 *   E3: GapToRuleMapper propaga questionId/answerValue/gapId/questionSource
 *   E4: consolidateRisks injeta archetype_context em ConsolidatedEvidence
 *   E5: mapGapToEvidence propaga campos de rastreabilidade para evidence
 *   E6: pipeline completa (mockada) com archetype emite evidence enriquecida
 *
 * Não toca DB. Não toca LLM. Pode rodar em CI sem credenciais.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getArchetypeContext } from "./archetype/getArchetypeContext";
import {
  consolidateRisks,
  type GapRule,
  type OperationalContext,
  type ConsolidatedEvidence,
} from "./risk-engine-v4";
import { GapToRuleMapper, type CategoryResolver } from "./gap-to-rule-mapper";
import type { GapInput, CategoryACL } from "../schemas/gap-risk.schemas";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("./db-queries-risk-categories", () => ({
  listActiveCategories: vi.fn().mockResolvedValue([]),
  getCategoryByCode: vi.fn().mockResolvedValue(null),
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────

const ARCH_FINANCEIRO = {
  objeto: ["instrumentos financeiros"],
  papel_na_cadeia: "intermediario_financeiro",
  tipo_de_relacao: ["B2B"],
  territorio: ["nacional"],
  regime: "lucro_real",
  subnatureza_setorial: ["seguros"],
  orgao_regulador: ["BACEN", "SUSEP"],
};

const ARCH_AGRO = {
  objeto: ["soja", "milho"],
  papel_na_cadeia: "produtor_rural",
  regime: "lucro_presumido",
};

function makeGap(overrides: Partial<GapRule> = {}): GapRule {
  return {
    ruleId: "RULE-001",
    categoria: "split_payment",
    artigo: "Art. 29",
    fonte: "cnae",
    gapClassification: "ausencia",
    requirementId: "REQ-001",
    sourceReference: "LC 214/2025 Art. 29",
    domain: "fiscal",
    ...overrides,
  };
}

function makeGapInput(overrides: Partial<GapInput> = {}): GapInput {
  return {
    id: "gap-1",
    canonicalId: "REQ-001",
    gapStatus: "nao_compliant",
    requirementId: "REQ-001",
    sourceReference: "LC 214/2025 Art. 29",
    domain: "fiscal",
    categoria: "split_payment",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// E1 — getArchetypeContext formata 7 dimensões
// ═══════════════════════════════════════════════════════════════════════════════

describe("E1 — getArchetypeContext format", () => {
  it("formata todas as 7 dimensões do arquétipo financeiro", () => {
    const ctx = getArchetypeContext(ARCH_FINANCEIRO);
    expect(ctx).toContain("Objeto econômico: instrumentos financeiros");
    expect(ctx).toContain("Papel na cadeia: intermediario_financeiro");
    expect(ctx).toContain("Tipo de relação: B2B");
    expect(ctx).toContain("Território: nacional");
    expect(ctx).toContain("Regime tributário: lucro_real");
    expect(ctx).toContain("Subnatureza setorial: seguros");
    expect(ctx).toContain("Órgão regulador: BACEN, SUSEP");
    // separador " | "
    expect(ctx.split(" | ").length).toBe(7);
  });

  it("omite dimensões ausentes", () => {
    const ctx = getArchetypeContext(ARCH_AGRO);
    expect(ctx).toContain("soja, milho");
    expect(ctx).toContain("produtor_rural");
    expect(ctx).toContain("lucro_presumido");
    expect(ctx).not.toContain("Território:");
    expect(ctx).not.toContain("Órgão regulador:");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2 — Backward-compat absoluta (null/inválido)
// ═══════════════════════════════════════════════════════════════════════════════

describe("E2 — backward-compat null/inválido", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["invalid JSON string", "{not-json}"],
    ["non-object", 42],
    ["array", []],
  ])("retorna string vazia para %s", (_label, value) => {
    expect(getArchetypeContext(value as never)).toBe("");
  });

  it("aceita JSON string válida e parseia", () => {
    const json = JSON.stringify(ARCH_AGRO);
    expect(getArchetypeContext(json)).toContain("produtor_rural");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E3 — GapToRuleMapper propaga rastreabilidade
// ═══════════════════════════════════════════════════════════════════════════════

describe("E3 — mapper propaga questionId/answerValue/gapId/questionSource", () => {
  function makeResolver(): CategoryResolver {
    const cat: CategoryACL = {
      codigo: "split_payment",
      nome: "Split Payment",
      severidade: "alta",
      urgencia: "imediata",
      tipo: "risk",
      status: "ativo",
      allowedDomains: null,
      allowedGapTypes: null,
      ruleCode: "RULE-SP-01",
    };
    return {
      findByCodigo: vi.fn().mockResolvedValue(cat),
      findByArticle: vi.fn().mockResolvedValue([cat]),
    };
  }

  it("propaga 4 campos de rastreabilidade quando presentes", async () => {
    const mapper = new GapToRuleMapper(makeResolver());
    const result = await mapper.mapMany([
      makeGapInput({
        questionId: 42,
        answerValue: "sim",
        gapId: 7,
        questionSource: "iagen",
      }),
    ]);
    expect(result.mappedRules).toHaveLength(1);
    const rule = result.mappedRules[0];
    expect(rule.questionId).toBe(42);
    expect(rule.answerValue).toBe("sim");
    expect(rule.gapId).toBe(7);
    expect(rule.questionSource).toBe("iagen");
  });

  it("usa null quando campos de rastreabilidade ausentes (backward-compat)", async () => {
    const mapper = new GapToRuleMapper(makeResolver());
    const result = await mapper.mapMany([makeGapInput()]);
    expect(result.mappedRules).toHaveLength(1);
    const rule = result.mappedRules[0];
    expect(rule.questionId).toBeNull();
    expect(rule.answerValue).toBeNull();
    expect(rule.gapId).toBeNull();
    expect(rule.questionSource).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E4 — consolidateRisks injeta archetype_context
// ═══════════════════════════════════════════════════════════════════════════════

describe("E4 — consolidateRisks emite archetype_context", () => {
  const ctx: OperationalContext = { tipoOperacao: "servicos" };

  it("inclui archetype_context na evidence quando passado", async () => {
    const archCtx = "Objeto: soja | Papel: produtor_rural";
    const results = await consolidateRisks(1, [makeGap()], ctx, 1, archCtx);
    expect(results).toHaveLength(1);
    const evidence = results[0].evidence as ConsolidatedEvidence;
    expect(evidence.archetype_context).toBe(archCtx);
  });

  it("omite archetype_context quando não passado (backward-compat)", async () => {
    const results = await consolidateRisks(1, [makeGap()], ctx, 1);
    expect(results).toHaveLength(1);
    const evidence = results[0].evidence as ConsolidatedEvidence;
    expect("archetype_context" in evidence).toBe(false);
  });

  it("omite archetype_context quando string vazia", async () => {
    const results = await consolidateRisks(1, [makeGap()], ctx, 1, "");
    expect(results).toHaveLength(1);
    const evidence = results[0].evidence as ConsolidatedEvidence;
    expect("archetype_context" in evidence).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E5 — mapGapToEvidence propaga rastreabilidade para evidence
// ═══════════════════════════════════════════════════════════════════════════════

describe("E5 — evidence carrega rastreabilidade end-to-end", () => {
  const ctx: OperationalContext = { tipoOperacao: "comercio" };

  it("evidence inclui questionId/answerValue/gapId/questionSource quando GapRule traz", async () => {
    const gap = makeGap({
      questionId: 99,
      answerValue: "nao",
      gapId: 14,
      questionSource: "solaris",
    });
    const results = await consolidateRisks(1, [gap], ctx, 1);
    expect(results).toHaveLength(1);
    const evidence = results[0].evidence as ConsolidatedEvidence;
    expect(evidence.gaps).toHaveLength(1);
    const ev = evidence.gaps[0];
    expect(ev.questionId).toBe(99);
    expect(ev.answerValue).toBe("nao");
    expect(ev.gapId).toBe(14);
    expect(ev.questionSource).toBe("solaris");
  });

  it("evidence usa null para rastreabilidade quando GapRule não traz (backward-compat)", async () => {
    const results = await consolidateRisks(1, [makeGap()], ctx, 1);
    expect(results).toHaveLength(1);
    const evidence = results[0].evidence as ConsolidatedEvidence;
    const ev = evidence.gaps[0];
    expect(ev.questionId).toBeNull();
    expect(ev.answerValue).toBeNull();
    expect(ev.gapId).toBeNull();
    expect(ev.questionSource).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E6 — Cadeia completa: archetype → context string → evidence enriquecida
// ═══════════════════════════════════════════════════════════════════════════════

describe("E6 — cadeia completa archetype → evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("archetype financeiro → contextString → evidence.archetype_context populada", async () => {
    const archCtx = getArchetypeContext(ARCH_FINANCEIRO);
    expect(archCtx).not.toBe("");

    const ctx: OperationalContext = { tipoOperacao: "servicos" };
    const gapWithRastr = makeGap({
      questionId: 1,
      answerValue: "sim",
      gapId: 1,
      questionSource: "iagen",
    });

    const results = await consolidateRisks(1, [gapWithRastr], ctx, 1, archCtx);
    expect(results).toHaveLength(1);
    const evidence = results[0].evidence as ConsolidatedEvidence;

    // Top-level archetype_context
    expect(evidence.archetype_context).toBe(archCtx);
    expect(evidence.archetype_context).toContain("Órgão regulador: BACEN, SUSEP");

    // Per-evidence rastreabilidade
    expect(evidence.gaps[0].questionId).toBe(1);
    expect(evidence.gaps[0].questionSource).toBe("iagen");
  });
});
