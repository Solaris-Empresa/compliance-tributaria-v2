/**
 * sprint-z13.5-engine-tests.test.ts — Sprint Z-13.5 Plano de Testes do Engine
 * HEAD: 37ce1c2 — Testes C1..C5 de validacao da logica do engine.
 *
 * C1: Chave de consolidacao (risk_key)
 * C2: Agregacao de evidencias
 * C3: Severidade maxima
 * C4: RAG timeout (resiliencia)
 * C5: Merge sem duplicatas (infer + consolidate)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  consolidateRisks,
  buildRiskKey,
  SEVERITY_TABLE,
  type GapRule,
  type OperationalContext,
  type ConsolidatedEvidence,
} from "./risk-engine-v4";
import type { InsertRiskV4 } from "./db-queries-risks-v4";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("./db-queries-risk-categories", () => ({
  listActiveCategories: vi.fn().mockResolvedValue([]),
  getCategoryByCode: vi.fn().mockResolvedValue(null),
}));

vi.mock("./rag-risk-validator", () => ({
  enrichRiskWithRag: vi.fn(),
}));

vi.mock("./project-profile-extractor", () => ({
  extractProjectProfile: vi.fn(),
}));

vi.mock("./normative-inference", () => ({
  inferNormativeRisks: vi.fn(),
}));

import { getCategoryByCode } from "./db-queries-risk-categories";
import { enrichRiskWithRag } from "./rag-risk-validator";
import { extractProjectProfile } from "./project-profile-extractor";
import { inferNormativeRisks } from "./normative-inference";

// ─── Helpers ────────────────────────────────────────────────────────────────

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
// TESTE C1 — Chave de consolidacao (risk_key)
// ═══════════════════════════════════════════════════════════════════════════════

describe("C1 — Chave de consolidacao (risk_key)", () => {
  beforeEach(() => {
    vi.mocked(getCategoryByCode).mockResolvedValue(null);
  });

  it("C1: 10 gaps geram 3 riscos distintos agrupados por categoria+contexto", async () => {
    // 5 gaps de split_payment com contexto multi
    const ctxMulti: OperationalContext = {
      tipoOperacao: "comercio",
      multiestadual: true,
    };

    const splitMultiGaps = Array.from({ length: 5 }, (_, i) =>
      makeGap({
        ruleId: `SP-MULTI-${i}`,
        categoria: "split_payment",
        artigo: `Art. ${29 + i}`,
        fonte: (["cnae", "ncm", "solaris", "iagen", "nbs"] as const)[i],
      })
    );

    // 3 gaps de split_payment com contexto mono
    const ctxMono: OperationalContext = {
      tipoOperacao: "comercio",
      multiestadual: false,
    };

    const splitMonoGaps = Array.from({ length: 3 }, (_, i) =>
      makeGap({
        ruleId: `SP-MONO-${i}`,
        categoria: "split_payment",
        artigo: `Art. ${29 + i}`,
        fonte: "cnae",
      })
    );

    // 2 gaps de obrigacao_acessoria com contexto multi
    const obrigGaps = Array.from({ length: 2 }, (_, i) =>
      makeGap({
        ruleId: `OA-${i}`,
        categoria: "obrigacao_acessoria",
        artigo: `Art. ${50 + i}`,
        fonte: "cnae",
      })
    );

    // Consolidar com contexto MULTI (split_multi + obrig)
    const resultsMulti = await consolidateRisks(
      1,
      [...splitMultiGaps, ...obrigGaps],
      ctxMulti,
      1
    );

    // Consolidar com contexto MONO (split_mono)
    const resultsMono = await consolidateRisks(
      1,
      splitMonoGaps,
      ctxMono,
      1
    );

    // Combinar resultados
    const allResults = [...resultsMulti, ...resultsMono];

    // VALIDACAO: 3 riscos distintos
    expect(allResults).toHaveLength(3);

    // VALIDACAO: risk_keys sao unicos
    const keys = allResults.map((r) => r.risk_key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(3);

    // VALIDACAO: chaves distintas para multi vs mono
    const splitMultiKey = buildRiskKey("split_payment", ctxMulti);
    const splitMonoKey = buildRiskKey("split_payment", ctxMono);
    const obrigKey = buildRiskKey("obrigacao_acessoria", ctxMulti);

    expect(splitMultiKey).not.toBe(splitMonoKey);
    expect(splitMultiKey).toBe("split_payment::op:comercio::geo:multi");
    expect(splitMonoKey).toBe("split_payment::op:comercio::geo:mono");
    expect(obrigKey).toBe("obrigacao_acessoria::op:comercio::geo:multi");

    // VALIDACAO: evidence.gaps preserva todos os gaps originais
    const spMultiRisk = resultsMulti.find(
      (r) => r.risk_key === splitMultiKey
    );
    expect(spMultiRisk).toBeDefined();
    const spMultiEvidence = spMultiRisk!.evidence as ConsolidatedEvidence;
    expect(spMultiEvidence.gaps).toHaveLength(5);

    const spMonoRisk = resultsMono.find(
      (r) => r.risk_key === splitMonoKey
    );
    expect(spMonoRisk).toBeDefined();
    const spMonoEvidence = spMonoRisk!.evidence as ConsolidatedEvidence;
    expect(spMonoEvidence.gaps).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTE C2 — Agregacao de evidencias
// ═══════════════════════════════════════════════════════════════════════════════

describe("C2 — Agregacao de evidencias", () => {
  beforeEach(() => {
    vi.mocked(getCategoryByCode).mockResolvedValue(null);
  });

  it("C2: 22 gaps de split_payment — nenhum gap perdido na consolidacao", async () => {
    const ctx: OperationalContext = {
      tipoOperacao: "atacadista",
      multiestadual: true,
    };

    // 22 gaps de split_payment
    const gaps: GapRule[] = Array.from({ length: 22 }, (_, i) =>
      makeGap({
        ruleId: `SP-${i.toString().padStart(3, "0")}`,
        categoria: "split_payment",
        artigo: `Art. ${29 + (i % 5)}`,
        fonte: (["cnae", "ncm", "nbs", "solaris"] as const)[i % 4],
        gapClassification: (["ausencia", "parcial", "inadequado"] as const)[
          i % 3
        ],
      })
    );

    const results = await consolidateRisks(1, gaps, ctx, 1);

    // Todos os 22 gaps devem estar em um unico risco (mesma categoria + contexto)
    const spRisks = results.filter((r) => r.categoria === "split_payment");
    const totalEvidence = spRisks.reduce(
      (sum, r) => sum + (r.evidence_count ?? 0),
      0
    );

    // VALIDACAO: soma de evidence_count = 22
    expect(totalEvidence).toBe(22);

    // VALIDACAO: nenhum gap perdido — evidence.gaps tambem tem 22
    const evidence = spRisks[0].evidence as ConsolidatedEvidence;
    expect(evidence.gaps).toHaveLength(22);

    // VALIDACAO: cada gap original esta representado
    const evidenceRuleIds = evidence.gaps.map((g) => g.ruleId);
    for (let i = 0; i < 22; i++) {
      expect(evidenceRuleIds).toContain(
        `SP-${i.toString().padStart(3, "0")}`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTE C3 — Severidade maxima
// ═══════════════════════════════════════════════════════════════════════════════

describe("C3 — Severidade maxima", () => {
  beforeEach(() => {
    vi.mocked(getCategoryByCode).mockResolvedValue(null);
  });

  it("C3: severidade do risco consolidado e a maxima entre os gaps do grupo", async () => {
    const ctx: OperationalContext = {
      tipoOperacao: "comercio",
      multiestadual: true,
    };

    // Todos sao split_payment (alta na SEVERITY_TABLE)
    // gapClassification varia, mas a severidade vem da SEVERITY_TABLE por categoria
    const gaps: GapRule[] = [
      makeGap({
        ruleId: "SP-PARCIAL",
        categoria: "split_payment",
        gapClassification: "parcial",
      }),
      makeGap({
        ruleId: "SP-INADEQUADO",
        categoria: "split_payment",
        gapClassification: "inadequado",
      }),
      makeGap({
        ruleId: "SP-AUSENCIA",
        categoria: "split_payment",
        gapClassification: "ausencia",
      }),
    ];

    const results = await consolidateRisks(1, gaps, ctx, 1);

    // split_payment e "alta" na SEVERITY_TABLE — getMaxSeverity deve retornar "alta"
    const spRisk = results.find((r) => r.categoria === "split_payment");
    expect(spRisk).toBeDefined();
    expect(spRisk!.severidade).toBe("alta");

    // Agora testar com mix de categorias para validar que maxima domina
    const mixGaps: GapRule[] = [
      makeGap({
        ruleId: "MIX-OPP",
        categoria: "aliquota_zero", // oportunidade
      }),
      makeGap({
        ruleId: "MIX-MED",
        categoria: "obrigacao_acessoria", // media
      }),
      makeGap({
        ruleId: "MIX-ALTA",
        categoria: "split_payment", // alta
      }),
    ];

    const mixResults = await consolidateRisks(1, mixGaps, ctx, 1);

    // Deve ter 3 riscos separados (um por categoria)
    expect(mixResults).toHaveLength(3);

    // Cada um com sua severidade da tabela
    const sp = mixResults.find((r) => r.categoria === "split_payment");
    const oa = mixResults.find((r) => r.categoria === "obrigacao_acessoria");
    const az = mixResults.find((r) => r.categoria === "aliquota_zero");

    expect(sp!.severidade).toBe("alta");
    expect(oa!.severidade).toBe("media");
    expect(az!.severidade).toBe("oportunidade");

    // VALIDACAO: resultado ordenado por severidade (alta primeiro)
    expect(mixResults[0].severidade).toBe("alta");
    expect(mixResults[1].severidade).toBe("media");
    expect(mixResults[2].severidade).toBe("oportunidade");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTE C4 — RAG timeout (resiliencia)
// ═══════════════════════════════════════════════════════════════════════════════

describe("C4 — RAG timeout (resiliencia)", () => {
  beforeEach(() => {
    vi.mocked(getCategoryByCode).mockResolvedValue(null);
    vi.mocked(extractProjectProfile).mockResolvedValue({
      tipoOperacao: "atacadista",
      multiestadual: true,
      tipoCliente: null,
      meiosPagamento: null,
      intermediarios: null,
      cnaes: [],
      ncms: [],
      regimeTributario: null,
    } as any);
    vi.mocked(inferNormativeRisks).mockResolvedValue([]);
  });

  it("C4: pipeline completa mesmo com RAG timeout — riscos retornados sem enriquecimento", async () => {
    // Mock enrichRiskWithRag para demorar 5000ms (acima do timeout de 3000ms)
    vi.mocked(enrichRiskWithRag).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({} as InsertRiskV4), 5000);
        })
    );

    const gaps: GapRule[] = [
      makeGap({ ruleId: "TIMEOUT-1", categoria: "split_payment" }),
      makeGap({ ruleId: "TIMEOUT-2", categoria: "obrigacao_acessoria" }),
    ];

    // Importar o pipeline dinamicamente para que os mocks estejam ativos
    const { generateRisksV4Pipeline } = await import(
      "./generate-risks-pipeline"
    );

    const start = Date.now();
    const result = await generateRisksV4Pipeline(1, gaps, 1);
    const elapsed = Date.now() - start;

    // VALIDACAO: pipeline completa em < 4000ms (timeout de 3s + margem)
    expect(elapsed).toBeLessThan(4000);

    // VALIDACAO: retorna riscos (nao vazio)
    expect(result.risks.length).toBeGreaterThan(0);

    // VALIDACAO: NAO lanca excecao (se chegou aqui, nao lancou)

    // VALIDACAO: rag_validated = 0 nos riscos retornados (sem enriquecimento)
    for (const risk of result.risks) {
      expect(risk.rag_validated).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTE C5 — Merge sem duplicatas (infer + consolidate)
// ═══════════════════════════════════════════════════════════════════════════════

describe("C5 — Merge sem duplicatas (infer + consolidate)", () => {
  beforeEach(() => {
    vi.mocked(getCategoryByCode).mockResolvedValue(null);
    vi.mocked(enrichRiskWithRag).mockImplementation(async (r) => r);
  });

  it("C5: mergeByRiskKey elimina duplicatas entre consolidate e infer", async () => {
    const ctx: OperationalContext = {
      tipoOperacao: "atacadista",
      multiestadual: true,
    };

    // Mock profile
    vi.mocked(extractProjectProfile).mockResolvedValue({
      tipoOperacao: "atacadista",
      multiestadual: true,
      tipoCliente: null,
      meiosPagamento: ["cartao"],
      intermediarios: [],
      cnaes: ["4711-3/01"],
      ncms: [],
      regimeTributario: "lucro_real",
    } as any);

    // inferNormativeRisks retorna um risco com a MESMA risk_key que consolidate geraria
    const inferredRiskKey = buildRiskKey("split_payment", ctx);
    vi.mocked(inferNormativeRisks).mockResolvedValue([
      {
        project_id: 1,
        rule_id: inferredRiskKey,
        type: "risk",
        categoria: "split_payment",
        titulo: "Split Payment (inferred)",
        artigo: "Art. 29",
        severidade: "alta",
        urgencia: "imediata",
        evidence: { gaps: [], rag_validated: false, rag_confidence: 0 },
        breadcrumb: ["iagen", "split_payment", "Art. 29", inferredRiskKey],
        source_priority: "iagen",
        confidence: 0.8,
        risk_key: inferredRiskKey,
        evidence_count: 0,
        rag_validated: 0,
        rag_confidence: 0,
        created_by: 1,
        updated_by: 1,
      } as InsertRiskV4,
    ]);

    const gaps: GapRule[] = [
      makeGap({ ruleId: "SP-DUP-1", categoria: "split_payment" }),
      makeGap({ ruleId: "SP-DUP-2", categoria: "split_payment" }),
    ];

    const { generateRisksV4Pipeline } = await import(
      "./generate-risks-pipeline"
    );

    const result = await generateRisksV4Pipeline(1, gaps, 1);

    // VALIDACAO: 0 duplicatas de risk_key no array final
    const keys = result.risks.map((r) => r.risk_key ?? r.rule_id);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);

    // VALIDACAO: apenas 1 risco de split_payment (nao 2)
    const spRisks = result.risks.filter(
      (r) => r.categoria === "split_payment"
    );
    expect(spRisks).toHaveLength(1);
  });
});
