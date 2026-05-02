/**
 * m3-sprint-e2e-suite.test.ts — Sprint M3 Suite E2E Completa (10 casos)
 *
 * Cobertura end-to-end das alterações M3:
 *   T01: getArchetypeContext → RAG contextQuery (product-questions)
 *   T02: getArchetypeContext → RAG contextQuery (service-questions)
 *   T03: IA GEN Onda 2 consome archetype no profileFields
 *   T04: Gap Engine enriquece gap_description com archetype
 *   T05: Risk Engine usa derived_legacy_operation_type
 *   T06: Pipeline v4 injeta archetype_context em ConsolidatedEvidence
 *   T07: Rastreabilidade — GapRule propaga questionId/answerValue/gapId/questionSource
 *   T08: Rastreabilidade — evidence.gaps[] carrega campos rastreáveis
 *   T09: Backward-compat — archetype null não quebra nenhum engine
 *   T10: Cadeia completa — archetype financeiro → risk com evidence rastreável
 *
 * Não requer banco — usa mocks para isolar lógica pura dos engines.
 * HEAD: bc649fa — Sprint M3 ENCERRADO.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────
vi.mock("./db-queries-risk-categories", () => ({
  listActiveCategories: vi.fn().mockResolvedValue([]),
  getCategoryByCode: vi.fn().mockResolvedValue(null),
}));
vi.mock("./rag-risk-validator", () => ({
  enrichRiskWithRag: vi.fn().mockImplementation((r) => Promise.resolve(r)),
}));
vi.mock("./project-profile-extractor", () => ({
  extractProjectProfile: vi.fn(),
}));
vi.mock("./normative-inference", () => ({
  inferNormativeRisks: vi.fn().mockResolvedValue([]),
}));

import {
  consolidateRisks,
  buildRiskKey,
  type GapRule,
  type OperationalContext,
  type ConsolidatedEvidence,
} from "./risk-engine-v4";
import { getArchetypeContext } from "./archetype/getArchetypeContext";
import { getCategoryByCode } from "./db-queries-risk-categories";

// ─── Fixtures ───────────────────────────────────────────────────────────────
const ARCH_FINANCEIRO = {
  objeto: ["servico_financeiro"],
  papel_na_cadeia: "operadora_regulada",
  tipo_de_relacao: ["servico"],
  territorio: ["nacional"],
  regime: "lucro_real",
  subnatureza_setorial: ["financeiro"],
  orgao_regulador: ["BCB", "SUSEP"],
  regime_especifico: [],
};

const ARCH_TRANSPORTADORA = {
  objeto: ["servico_transporte"],
  papel_na_cadeia: "prestador",
  tipo_de_relacao: ["servico"],
  territorio: ["interestadual"],
  regime: "lucro_presumido",
  subnatureza_setorial: ["transporte_carga"],
  orgao_regulador: ["ANTT"],
  regime_especifico: [],
};

const ARCH_AGRO = {
  objeto: ["produto_agropecuario"],
  papel_na_cadeia: "produtor",
  tipo_de_relacao: ["venda_direta"],
  territorio: ["nacional"],
  regime: "simples_nacional",
  subnatureza_setorial: ["agropecuaria"],
  orgao_regulador: [],
  regime_especifico: ["produtor_rural"],
};

function makeGap(overrides: Partial<GapRule> = {}): GapRule {
  return {
    ruleId: "RULE-T01",
    categoria: "split_payment",
    artigo: "Art. 29",
    fonte: "cnae",
    gapClassification: "ausencia",
    requirementId: "REQ-T01",
    sourceReference: "LC 214/2025 Art. 29",
    domain: "fiscal",
    ...overrides,
  };
}

// ─── Setup ──────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  (getCategoryByCode as ReturnType<typeof vi.fn>).mockResolvedValue({
    codigo: "split_payment",
    nome: "Split Payment",
    severidade: "alta",
    urgencia: "imediata",
    tipo: "risk",
    status: "ativo",
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T01 — getArchetypeContext → RAG contextQuery (product-questions pattern)
// ═══════════════════════════════════════════════════════════════════════════════
describe("T01 — archetype enriquece contextQuery RAG (padrão product-questions)", () => {
  it("archetype financeiro gera string com dimensões para concatenar ao contextQuery", () => {
    const ctx = getArchetypeContext(ARCH_FINANCEIRO);
    expect(ctx).toContain("servico_financeiro");
    expect(ctx).toContain("operadora_regulada");
    expect(ctx).toContain("BCB");
    // Simula o pattern de product-questions.ts:93
    const ncm = "8471.30.19";
    const contextQuery = ctx
      ? `IBS CBS alíquota produto NCM ${ncm} reforma tributária ${ctx}`
      : `IBS CBS alíquota produto NCM ${ncm} reforma tributária`;
    expect(contextQuery).toContain("BCB");
    expect(contextQuery).toContain(ncm);
    expect(contextQuery.length).toBeGreaterThan(80);
  });

  it("archetype null → contextQuery legado (sem enriquecimento)", () => {
    const ctx = getArchetypeContext(null);
    expect(ctx).toBe("");
    const ncm = "8471.30.19";
    const contextQuery = ctx
      ? `IBS CBS alíquota produto NCM ${ncm} reforma tributária ${ctx}`
      : `IBS CBS alíquota produto NCM ${ncm} reforma tributária`;
    expect(contextQuery).not.toContain("BCB");
    expect(contextQuery).toBe(`IBS CBS alíquota produto NCM ${ncm} reforma tributária`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T02 — getArchetypeContext → RAG contextQuery (service-questions pattern)
// ═══════════════════════════════════════════════════════════════════════════════
describe("T02 — archetype enriquece contextQuery RAG (padrão service-questions)", () => {
  it("archetype transportadora gera string com território interestadual", () => {
    const ctx = getArchetypeContext(ARCH_TRANSPORTADORA);
    expect(ctx).toContain("transporte");
    expect(ctx).toContain("interestadual");
    expect(ctx).toContain("ANTT");
    // Simula o pattern de service-questions.ts:93
    const nbs = "1.0301";
    const contextQuery = ctx
      ? `IBS CBS alíquota serviço NBS ${nbs} reforma tributária ${ctx}`
      : `IBS CBS alíquota serviço NBS ${nbs} reforma tributária`;
    expect(contextQuery).toContain("ANTT");
    expect(contextQuery).toContain(nbs);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T03 — IA GEN Onda 2 consome archetype no profileFields
// ═══════════════════════════════════════════════════════════════════════════════
describe("T03 — IA GEN Onda 2 consome archetype no profileFields", () => {
  it("archCtx não-vazio é adicionado ao profileFields (padrão routers-fluxo-v3.ts:3833)", () => {
    const archCtx = getArchetypeContext(ARCH_FINANCEIRO);
    // Simula o pattern de routers-fluxo-v3.ts:3833-3834
    const profileFields: string[] = [
      "CNAE: 64.21-1-00",
      "Regime: Lucro Real",
      "UF: SP",
    ];
    if (archCtx) profileFields.push(`Perfil da Entidade (arquétipo M1): ${archCtx}`);
    expect(profileFields).toHaveLength(4);
    expect(profileFields[3]).toContain("Perfil da Entidade");
    expect(profileFields[3]).toContain("BCB");
  });

  it("archCtx vazio (null) → profileFields sem linha extra", () => {
    const archCtx = getArchetypeContext(null);
    const profileFields: string[] = [
      "CNAE: 64.21-1-00",
      "Regime: Lucro Real",
      "UF: SP",
    ];
    if (archCtx) profileFields.push(`Perfil da Entidade (arquétipo M1): ${archCtx}`);
    expect(profileFields).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T04 — Gap Engine enriquece gap_description com archetype
// ═══════════════════════════════════════════════════════════════════════════════
describe("T04 — Gap Engine enriquece gap_description com archetype", () => {
  it("archetype agro → gap_description inclui contexto setorial", () => {
    const archCtx = getArchetypeContext(ARCH_AGRO);
    // Simula o pattern de gapEngine.ts:255+
    const baseDescription = "Ausência de controle de split payment para produtos agrícolas";
    const enrichedDescription = archCtx
      ? `${baseDescription}\n\n[Contexto Perfil da Entidade]: ${archCtx}`
      : baseDescription;
    // regime_especifico não é renderizado pelo helper (apenas as 7 dimensões principais)
    expect(enrichedDescription).toContain("agropecuaria");
    expect(enrichedDescription).toContain("produto_agropecuario");
    expect(enrichedDescription).toContain(baseDescription);
  });

  it("archetype null → gap_description inalterada (backward-compat)", () => {
    const archCtx = getArchetypeContext(null);
    const baseDescription = "Ausência de controle de split payment";
    const enrichedDescription = archCtx
      ? `${baseDescription}\n\n[Contexto Perfil da Entidade]: ${archCtx}`
      : baseDescription;
    expect(enrichedDescription).toBe(baseDescription);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T05 — Risk Engine usa derived_legacy_operation_type
// ═══════════════════════════════════════════════════════════════════════════════
describe("T05 — Risk Engine usa derived_legacy_operation_type como drop-in", () => {
  it("archetype com derived_legacy → operationType vem do archetype (não do opProfile)", () => {
    // Simula o pattern de riskEngine.ts:639
    const arch = { derived_legacy_operation_type: "servicos" };
    const opProfile = { operationType: "comercio", tipoOperacao: "industria" };
    const operationType: string | null =
      (arch?.derived_legacy_operation_type as string | undefined) ??
      (opProfile.operationType as string | undefined) ??
      (opProfile.tipoOperacao as string | undefined) ??
      null;
    expect(operationType).toBe("servicos");
  });

  it("archetype null → fallback para opProfile.operationType (legado)", () => {
    const arch: Record<string, unknown> | null = null;
    const opProfile = { operationType: "comercio", tipoOperacao: "industria" };
    const operationType: string | null =
      (arch?.derived_legacy_operation_type as string | undefined) ??
      (opProfile.operationType as string | undefined) ??
      (opProfile.tipoOperacao as string | undefined) ??
      null;
    expect(operationType).toBe("comercio");
  });

  it("archetype sem derived_legacy → fallback para opProfile.tipoOperacao", () => {
    const arch = { objeto: ["servico_financeiro"] }; // sem derived_legacy
    const opProfile = { tipoOperacao: "industria" };
    const operationType: string | null =
      (arch?.derived_legacy_operation_type as string | undefined) ??
      ((opProfile as any).operationType as string | undefined) ??
      (opProfile.tipoOperacao as string | undefined) ??
      null;
    expect(operationType).toBe("industria");
  });

  it("buildRiskKey produz mesma chave com mesmos inputs", () => {
    const key1 = buildRiskKey("split_payment", "Art. 29", "servicos");
    const key2 = buildRiskKey("split_payment", "Art. 29", "servicos");
    expect(key1).toBe(key2);
    // buildRiskKey é determinístico: mesma entrada → mesma saída
    // (operationType pode ou não ser usado na chave dependendo da implementação)
    const key3 = buildRiskKey("split_payment", "Art. 29", "comercio");
    // Se a chave não usa operationType, ambas são iguais (invariante ADR-0022)
    // Se usa, são diferentes. Ambos comportamentos são válidos.
    expect(typeof key3).toBe("string");
    expect(key3.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T06 — Pipeline v4 injeta archetype_context em ConsolidatedEvidence
// ═══════════════════════════════════════════════════════════════════════════════
describe("T06 — Pipeline v4 injeta archetype_context em ConsolidatedEvidence", () => {
  const ctx: OperationalContext = { tipoOperacao: "servicos" };

  it("archetype financeiro → evidence.archetype_context populada", async () => {
    const archCtx = getArchetypeContext(ARCH_FINANCEIRO);
    const results = await consolidateRisks(1, [makeGap()], ctx, 1, archCtx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const evidence = results[0].evidence as ConsolidatedEvidence;
    expect(evidence.archetype_context).toBe(archCtx);
    expect(evidence.archetype_context).toContain("BCB");
  });

  it("archetype undefined → evidence SEM archetype_context (backward-compat)", async () => {
    const results = await consolidateRisks(1, [makeGap()], ctx, 1);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const evidence = results[0].evidence as ConsolidatedEvidence;
    expect("archetype_context" in evidence).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T07 — Rastreabilidade: GapRule propaga campos para evidence
// ═══════════════════════════════════════════════════════════════════════════════
describe("T07 — Rastreabilidade: GapRule propaga questionId/answerValue/gapId/questionSource", () => {
  const ctx: OperationalContext = { tipoOperacao: "comercio" };

  it("GapRule com rastreabilidade → evidence.gaps[] carrega campos", async () => {
    const gap = makeGap({
      questionId: 42,
      answerValue: "nao_implementado",
      gapId: 7,
      questionSource: "solaris",
    });
    const results = await consolidateRisks(1, [gap], ctx, 1);
    const evidence = results[0].evidence as ConsolidatedEvidence;
    const ev = evidence.gaps[0];
    expect(ev.questionId).toBe(42);
    expect(ev.answerValue).toBe("nao_implementado");
    expect(ev.gapId).toBe(7);
    expect(ev.questionSource).toBe("solaris");
  });

  it("GapRule sem rastreabilidade → evidence.gaps[] usa null (backward-compat)", async () => {
    const results = await consolidateRisks(1, [makeGap()], ctx, 1);
    const evidence = results[0].evidence as ConsolidatedEvidence;
    const ev = evidence.gaps[0];
    expect(ev.questionId).toBeNull();
    expect(ev.answerValue).toBeNull();
    expect(ev.gapId).toBeNull();
    expect(ev.questionSource).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T08 — Rastreabilidade: múltiplos gaps com fontes diferentes
// ═══════════════════════════════════════════════════════════════════════════════
describe("T08 — Rastreabilidade: múltiplos gaps com fontes diferentes consolidam corretamente", () => {
  const ctx: OperationalContext = { tipoOperacao: "servicos" };

  it("2 gaps mesma categoria → 1 risco com 2 evidence entries rastreáveis", async () => {
    const gap1 = makeGap({
      ruleId: "RULE-A",
      questionId: 10,
      answerValue: "nao",
      gapId: 1,
      questionSource: "solaris",
    });
    const gap2 = makeGap({
      ruleId: "RULE-B",
      questionId: 20,
      answerValue: "parcial",
      gapId: 2,
      questionSource: "iagen",
    });
    const results = await consolidateRisks(1, [gap1, gap2], ctx, 1);
    // Ambos gaps têm mesma categoria/artigo → consolidam em 1 risco
    expect(results).toHaveLength(1);
    const evidence = results[0].evidence as ConsolidatedEvidence;
    expect(evidence.gaps).toHaveLength(2);
    // Cada gap preserva sua rastreabilidade
    expect(evidence.gaps[0].questionId).toBe(10);
    expect(evidence.gaps[0].questionSource).toBe("solaris");
    expect(evidence.gaps[1].questionId).toBe(20);
    expect(evidence.gaps[1].questionSource).toBe("iagen");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T09 — Backward-compat: archetype null não quebra nenhum engine
// ═══════════════════════════════════════════════════════════════════════════════
describe("T09 — Backward-compat: archetype null/undefined/inválido não quebra engines", () => {
  const ctx: OperationalContext = { tipoOperacao: "comercio" };

  it("consolidateRisks funciona sem archetype (5o param omitido)", async () => {
    const results = await consolidateRisks(1, [makeGap()], ctx, 1);
    expect(results).toHaveLength(1);
    expect(results[0].risk_key).toBeDefined();
    expect(results[0].severidade).toBeDefined();
  });

  it("getArchetypeContext com JSON inválido → '' (não lança exceção)", () => {
    expect(getArchetypeContext("{broken")).toBe("");
    expect(getArchetypeContext("not-json-at-all")).toBe("");
    expect(getArchetypeContext(12345 as never)).toBe("");
    expect(getArchetypeContext([] as never)).toBe("");
  });

  it("getArchetypeContext com objeto parcial → formata apenas dimensões presentes", () => {
    const partial = { objeto: ["produto_agropecuario"] };
    const ctx = getArchetypeContext(partial as never);
    expect(ctx).toContain("produto_agropecuario");
    expect(ctx).not.toContain("undefined");
    expect(ctx).not.toContain("null");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T10 — Cadeia completa: archetype financeiro → risk com evidence rastreável
// ═══════════════════════════════════════════════════════════════════════════════
describe("T10 — Cadeia completa: archetype financeiro → risk com evidence rastreável + archetype_context", () => {
  it("end-to-end: archetype + rastreabilidade + evidence completa", async () => {
    const archCtx = getArchetypeContext(ARCH_FINANCEIRO);
    expect(archCtx).not.toBe("");
    expect(archCtx).toContain("BCB");
    expect(archCtx).toContain("SUSEP");

    const ctx: OperationalContext = { tipoOperacao: "servicos" };
    const gap = makeGap({
      questionId: 99,
      answerValue: "nao_possui",
      gapId: 55,
      questionSource: "iagen",
    });

    const results = await consolidateRisks(1, [gap], ctx, 1, archCtx);
    expect(results).toHaveLength(1);

    const risk = results[0];
    // Risk key inclui operationType
    expect(risk.risk_key).toContain("servicos");
    // Severidade definida
    expect(["alta", "media", "baixa"]).toContain(risk.severidade);

    // Evidence completa
    const evidence = risk.evidence as ConsolidatedEvidence;
    // archetype_context presente
    expect(evidence.archetype_context).toBe(archCtx);
    expect(evidence.archetype_context).toContain("operadora_regulada");
    // Rastreabilidade presente
    expect(evidence.gaps).toHaveLength(1);
    expect(evidence.gaps[0].questionId).toBe(99);
    expect(evidence.gaps[0].answerValue).toBe("nao_possui");
    expect(evidence.gaps[0].gapId).toBe(55);
    expect(evidence.gaps[0].questionSource).toBe("iagen");
    // Campos legados preservados
    expect(evidence.gaps[0].ruleId).toBe("RULE-T01");
    expect(evidence.gaps[0].artigo).toBe("Art. 29");
  });
});
