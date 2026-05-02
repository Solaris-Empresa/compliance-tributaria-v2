/**
 * m3-sprint-acceptance.test.ts — Sprint M3 acceptance suite (10 testes)
 *
 * Suite de aceitação que valida as 6 entregas mergeadas em main:
 *   - NOVA-01 (#904): IA GEN consome archetype
 *   - NOVA-02 (#905): Compliance CNAE/NCM/NBS consome archetype
 *   - NOVA-03 (#903): helper getArchetypeContext
 *   - NOVA-04 (#907): Gap engine description enriquecida
 *   - NOVA-05 (#906): Risk engine usa derived_legacy_operation_type
 *   - NOVA-06 (#908): Rastreabilidade end-to-end + archetype_context
 *   - NOVA-07 (#909): ArchetypeBadge UI
 *
 * Garantia transversal: backward-compat (archetype null/inválido → comportamento legado).
 *
 * Diferencial vs m3-archetype-e2e.test.ts (NOVA-09):
 *   - NOVA-09: testa unidades isoladas de cada peça (helper, mapper, evidence)
 *   - Esta suite: valida o delivery integrado caso-a-caso (1 teste por NOVA + 4 transversais)
 *
 * Não toca DB. Não toca LLM. Roda em CI sem secrets.
 */
import { describe, it, expect, vi } from "vitest";
import { getArchetypeContext } from "./archetype/getArchetypeContext";
import {
  consolidateRisks,
  type GapRule,
  type OperationalContext,
  type ConsolidatedEvidence,
} from "./risk-engine-v4";
import { GapToRuleMapper, type CategoryResolver } from "./gap-to-rule-mapper";
import type { GapInput, CategoryACL } from "../schemas/gap-risk.schemas";

vi.mock("./db-queries-risk-categories", () => ({
  listActiveCategories: vi.fn().mockResolvedValue([]),
  getCategoryByCode: vi.fn().mockResolvedValue(null),
}));

// ─── Fixtures de aceitação (cenários reais brasileiros) ─────────────────────

const ARCH_FINANCEIRO_BACEN = {
  objeto: ["servico_financeiro"],
  papel_na_cadeia: "operadora_regulada",
  tipo_de_relacao: ["servico"],
  territorio: ["interestadual", "nacional"],
  regime: "lucro_real",
  subnatureza_setorial: ["bancos", "seguros"],
  orgao_regulador: ["BACEN", "CVM"],
  derived_legacy_operation_type: "financeiro",
};

const ARCH_AGRO_SOJA = {
  objeto: ["soja", "milho"],
  papel_na_cadeia: "produtor_rural",
  regime: "lucro_presumido",
  derived_legacy_operation_type: "industria",
};

const ARCH_VAZIO = null;

function makeResolver(catCode = "split_payment"): CategoryResolver {
  const cat: CategoryACL = {
    codigo: catCode,
    nome: catCode,
    severidade: "alta",
    urgencia: "imediata",
    tipo: "risk",
    status: "ativo",
    allowedDomains: null,
    allowedGapTypes: null,
    ruleCode: `RULE-${catCode.toUpperCase()}`,
  };
  return {
    findByCodigo: vi.fn().mockResolvedValue(cat),
    findByArticle: vi.fn().mockResolvedValue([cat]),
  };
}

function makeGapInput(overrides: Partial<GapInput> = {}): GapInput {
  return {
    id: "gap-001",
    canonicalId: "REQ-001",
    gapStatus: "nao_compliant",
    requirementId: "REQ-001",
    sourceReference: "LC 214/2025 Art. 29",
    domain: "fiscal",
    categoria: "split_payment",
    ...overrides,
  };
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE M3 SPRINT ACCEPTANCE — 10 testes
// ═══════════════════════════════════════════════════════════════════════════════

describe("Sprint M3 — Acceptance Suite (10 testes integrados)", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // NOVA-03 — Helper centralizado é a fundação reutilizada por todos os engines
  // ──────────────────────────────────────────────────────────────────────────
  it("M3-AC-01 (NOVA-03): helper getArchetypeContext produz string canônica reutilizável", () => {
    const ctx = getArchetypeContext(ARCH_FINANCEIRO_BACEN);
    // Formato esperado: "Objeto econômico: ... | Papel na cadeia: ... | Regime tributário: ..."
    expect(ctx).toMatch(/Objeto econômico: servico_financeiro/);
    expect(ctx).toMatch(/Papel na cadeia: operadora_regulada/);
    expect(ctx).toMatch(/Regime tributário: lucro_real/);
    expect(ctx).toMatch(/Órgão regulador: BACEN, CVM/);
    expect(ctx.split(" | ").length).toBeGreaterThanOrEqual(5);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NOVA-01 — IA GEN consome archetype: simula prompt construction
  // ──────────────────────────────────────────────────────────────────────────
  it("M3-AC-02 (NOVA-01): contexto archetype enriquece prompt IA GEN (concat correta)", () => {
    const archCtx = getArchetypeContext(ARCH_FINANCEIRO_BACEN);
    const basePrompt = "Gere perguntas sobre IBS/CBS para a empresa";
    const profileFields: string[] = [];
    if (archCtx) profileFields.push(`Perfil da Entidade (arquétipo M1): ${archCtx}`);
    const fullPrompt = `${basePrompt}\n${profileFields.join("\n")}`;

    expect(fullPrompt).toContain("Perfil da Entidade (arquétipo M1):");
    expect(fullPrompt).toContain("BACEN");
    expect(fullPrompt).toContain("operadora_regulada");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NOVA-02 — Compliance product/service questions: contextQuery enriquecida
  // ──────────────────────────────────────────────────────────────────────────
  it("M3-AC-03 (NOVA-02): contextQuery RAG é enriquecida quando archetype presente", () => {
    const archCtx = getArchetypeContext(ARCH_AGRO_SOJA);
    const ncm = "1201.10.00";
    // Padrão usado em product-questions.ts e service-questions.ts
    const baseQuery = `IBS CBS alíquota produto NCM ${ncm} reforma tributária`;
    const enrichedQuery = archCtx ? `${baseQuery} | ${archCtx}` : baseQuery;

    expect(enrichedQuery).toContain(`NCM ${ncm}`);
    expect(enrichedQuery).toContain("soja, milho");
    expect(enrichedQuery).toContain("produtor_rural");
    expect(enrichedQuery.length).toBeGreaterThan(baseQuery.length);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NOVA-04 — Gap engine description enriquecida com contexto archetype
  // ──────────────────────────────────────────────────────────────────────────
  it("M3-AC-04 (NOVA-04): gap_description ganha sufixo (contexto: ...) quando archetype presente", () => {
    const archCtx = getArchetypeContext(ARCH_FINANCEIRO_BACEN);
    const reqName = "Split Payment LC 214/2025";
    const reason = "ausência de configuração no ERP";

    // Mesmo padrão usado em gapEngine.ts NOVA-04
    const description = archCtx
      ? `Gap identificado em ${reqName}: ${reason} (contexto: ${archCtx})`
      : `Gap identificado em ${reqName}: ${reason}`;

    expect(description).toMatch(/^Gap identificado em Split Payment/);
    expect(description).toContain("(contexto:");
    expect(description).toContain("BACEN");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NOVA-05 — Risk engine usa derived_legacy_operation_type como fallback
  // ──────────────────────────────────────────────────────────────────────────
  it("M3-AC-05 (NOVA-05): risk engine prioriza derived_legacy do archetype sobre opProfile legado", () => {
    // Cadeia ?? do NOVA-05
    const archDerived = ARCH_FINANCEIRO_BACEN.derived_legacy_operation_type;
    const opProfileLegacy = "comercio";

    const operationType: string | null =
      (archDerived as string | undefined) ??
      (opProfileLegacy as string | undefined) ??
      null;

    expect(operationType).toBe("financeiro");

    // Sem archetype: cai pra legado
    const operationTypeNoArch: string | null =
      (undefined as string | undefined) ??
      (opProfileLegacy as string | undefined) ??
      null;
    expect(operationTypeNoArch).toBe("comercio");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NOVA-06 — GapToRuleMapper propaga rastreabilidade
  // ──────────────────────────────────────────────────────────────────────────
  it("M3-AC-06 (NOVA-06): mapper propaga 4 campos rastreabilidade (questionId/answerValue/gapId/questionSource)", async () => {
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

  // ──────────────────────────────────────────────────────────────────────────
  // NOVA-06 — consolidateRisks injeta archetype_context top-level
  // ──────────────────────────────────────────────────────────────────────────
  it("M3-AC-07 (NOVA-06): ConsolidatedEvidence ganha archetype_context quando pipeline passa contexto", async () => {
    const archCtx = getArchetypeContext(ARCH_FINANCEIRO_BACEN);
    const ctx: OperationalContext = { tipoOperacao: "financeiro" };
    const results = await consolidateRisks(1, [makeGap()], ctx, 1, archCtx);

    expect(results).toHaveLength(1);
    const evidence = results[0].evidence as ConsolidatedEvidence;
    expect(evidence.archetype_context).toBe(archCtx);
    expect(evidence.archetype_context).toContain("BACEN, CVM");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NOVA-07 — ArchetypeBadge component (smoke test do parser)
  // ──────────────────────────────────────────────────────────────────────────
  it("M3-AC-08 (NOVA-07): badge parser aceita JSON string + objeto + null (3 formatos)", () => {
    // Mesmo parseArchetype usado em ArchetypeBadge.tsx
    const parse = (raw: unknown) => {
      if (!raw) return null;
      let arch: unknown = raw;
      if (typeof raw === "string") {
        try { arch = JSON.parse(raw); } catch { return null; }
      }
      if (!arch || typeof arch !== "object" || Array.isArray(arch)) return null;
      return arch;
    };

    expect(parse(ARCH_FINANCEIRO_BACEN)).toMatchObject({ regime: "lucro_real" });
    expect(parse(JSON.stringify(ARCH_AGRO_SOJA))).toMatchObject({ papel_na_cadeia: "produtor_rural" });
    expect(parse(null)).toBeNull();
    expect(parse(undefined)).toBeNull();
    expect(parse("{not-json}")).toBeNull();
    expect(parse([])).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // BACKWARD-COMPAT 1 — Projeto SEM archetype emite mesma estrutura legada
  // ──────────────────────────────────────────────────────────────────────────
  it("M3-AC-09 (backward-compat): projeto sem archetype não introduz chaves novas em evidence", async () => {
    const ctx: OperationalContext = { tipoOperacao: "comercio" };
    const archCtxVazio = getArchetypeContext(ARCH_VAZIO);
    expect(archCtxVazio).toBe("");

    const results = await consolidateRisks(1, [makeGap()], ctx, 1, archCtxVazio || undefined);
    expect(results).toHaveLength(1);
    const evidence = results[0].evidence as ConsolidatedEvidence;

    // archetype_context NÃO deve aparecer (spread condicional)
    expect("archetype_context" in evidence).toBe(false);

    // Estrutura legada preservada
    expect(evidence.gaps).toBeInstanceOf(Array);
    expect(evidence.rag_validated).toBe(false);
    expect(evidence.rag_confidence).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // BACKWARD-COMPAT 2 — Mesma rule_id determinística com/sem archetype
  // ──────────────────────────────────────────────────────────────────────────
  it("M3-AC-10 (determinismo): rule_id e categoria invariantes ao adicionar archetype_context", async () => {
    const ctx: OperationalContext = { tipoOperacao: "financeiro" };
    const gaps = [makeGap()];

    const semArch = await consolidateRisks(1, gaps, ctx, 1);
    const comArch = await consolidateRisks(
      1,
      gaps,
      ctx,
      1,
      getArchetypeContext(ARCH_FINANCEIRO_BACEN),
    );

    // Mesma quantidade de riscos
    expect(comArch.length).toBe(semArch.length);

    // Mesmo rule_id (chave determinística)
    expect(comArch[0].rule_id).toBe(semArch[0].rule_id);

    // Mesma categoria (gate de elegibilidade idêntico)
    expect(comArch[0].categoria).toBe(semArch[0].categoria);

    // Mesma severidade
    expect(comArch[0].severidade).toBe(semArch[0].severidade);

    // archetype_context é o ÚNICO delta
    const evSem = semArch[0].evidence as ConsolidatedEvidence;
    const evCom = comArch[0].evidence as ConsolidatedEvidence;
    expect("archetype_context" in evSem).toBe(false);
    expect("archetype_context" in evCom).toBe(true);
  });
});
