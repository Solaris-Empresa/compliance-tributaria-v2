/**
 * gap-to-rule-mapper.test.ts — Sprint Z-10 Gold Set (7 testes)
 *
 * Testes unitários para o ACL Gap→GapRule v2 (classe GapToRuleMapper).
 * Não requer banco — usa resolver mockado.
 *
 * PROIBIDO nos testes: score, confidence, ranking, fallback por domínio.
 */

import { describe, it, expect, vi } from "vitest";
import {
  GapToRuleMapper,
  type CategoryResolver,
} from "./gap-to-rule-mapper";
import type { GapInput, CategoryACL } from "../schemas/gap-risk.schemas";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGap(overrides: Partial<GapInput> = {}): GapInput {
  return {
    id: "GAP-001",
    canonicalId: "CAN-001",
    gapStatus: "nao_compliant",
    gapSeverity: "alta",
    gapType: "ausencia",
    area: "fiscal",
    descricao: "Gap de teste",
    categoria: undefined,
    sourceOrigin: "cnae",
    requirementId: "REQ-001",
    sourceReference: "Art. 9 LC 214/2025",
    domain: "fiscal",
    ...overrides,
  };
}

function makeCat(overrides: Partial<CategoryACL> = {}): CategoryACL {
  return {
    codigo: "split_payment",
    nome: "Split Payment",
    severidade: "alta",
    urgencia: "imediata",
    tipo: "risk",
    status: "ativo",
    allowedDomains: null,
    allowedGapTypes: null,
    ruleCode: null,
    ...overrides,
  };
}

function makeResolver(
  overrides: Partial<CategoryResolver> = {},
): CategoryResolver {
  return {
    findByCodigo: vi.fn().mockResolvedValue(undefined),
    findByArticle: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Gold Set — 7 testes (spec Z-10 aprovada)
// ═══════════════════════════════════════════════════════════════════════════

describe("Gap-to-Rule Mapper v2 — Gold Set Z-10", () => {
  // ─── T1: categoria explícita válida → mapped ──────────────────────────
  it("T1: gap com categoria explícita válida em risk_categories → mapped", async () => {
    const cat = makeCat({ codigo: "split_payment", status: "ativo" });
    const resolver = makeResolver({
      findByCodigo: vi.fn().mockResolvedValue(cat),
    });
    const mapper = new GapToRuleMapper(resolver);
    const gap = makeGap({ id: "GAP-T1", categoria: "split_payment" });

    const result = await mapper.mapOne(gap);

    expect(result.status).toBe("mapped");
    expect(result.categoria).toBe("split_payment");
    expect(result.reason).toContain("explicit");
  });

  // ─── T2: categoria explícita inválida → unmapped ──────────────────────
  it("T2: gap com categoria explícita inexistente/inativa → unmapped (DEC-Z10-06)", async () => {
    const resolver = makeResolver({
      findByCodigo: vi.fn().mockResolvedValue(undefined),
    });
    const mapper = new GapToRuleMapper(resolver);
    const gap = makeGap({ id: "GAP-T2", categoria: "categoria_fantasma" });

    const result = await mapper.mapOne(gap);

    expect(result.status).toBe("unmapped");
    expect(result.categoria).toBeNull();
    expect(result.reason).toContain("explicit_not_found");
  });

  // ─── T3: artigo com 1 candidato → mapped ─────────────────────────────
  it("T3: artigo com exatamente 1 candidato em risk_categories → mapped", async () => {
    const cat = makeCat({
      codigo: "split_payment",
      status: "ativo",
    });
    const resolver = makeResolver({
      findByArticle: vi.fn().mockResolvedValue([cat]),
    });
    const mapper = new GapToRuleMapper(resolver);
    const gap = makeGap({
      id: "GAP-T3",
      categoria: undefined,
      sourceReference: "Art. 9 LC 214/2025",
    });

    const result = await mapper.mapOne(gap);

    expect(result.status).toBe("mapped");
    expect(result.categoria).toBe("split_payment");
    expect(result.reason).toContain("article");
  });

  // ─── T4: artigo com 2 candidatos → ambiguous (NÃO mapped) ────────────
  it("T4: artigo com 2+ candidatos → ambiguous, NUNCA mapped", async () => {
    const cat1 = makeCat({ codigo: "obrigacao_acessoria" });
    const cat2 = makeCat({ codigo: "regime_diferenciado" });
    const resolver = makeResolver({
      findByArticle: vi.fn().mockResolvedValue([cat1, cat2]),
    });
    const mapper = new GapToRuleMapper(resolver);
    const gap = makeGap({
      id: "GAP-T4",
      categoria: undefined,
      sourceReference: "Art. 102 LC 214/2025",
    });

    const result = await mapper.mapOne(gap);

    expect(result.status).toBe("ambiguous");
    expect(result.status).not.toBe("mapped");
    expect(result.categoria).toBeNull();
    expect(result.reason).toContain("ambiguous");
  });

  // ─── T5: artigo sem candidato → unmapped ──────────────────────────────
  it("T5: artigo sem nenhum candidato em risk_categories → unmapped", async () => {
    const resolver = makeResolver({
      findByArticle: vi.fn().mockResolvedValue([]),
    });
    const mapper = new GapToRuleMapper(resolver);
    const gap = makeGap({
      id: "GAP-T5",
      categoria: undefined,
      sourceReference: "Art. 999 LC 214/2025",
    });

    const result = await mapper.mapOne(gap);

    expect(result.status).toBe("unmapped");
    expect(result.categoria).toBeNull();
    expect(result.reason).toContain("article_not_found");
  });

  // ─── T6: sem source_origin + allowLayerInference=false → unmapped ─────
  it("T6: gap sem categoria, sem artigo, allowLayerInference=false → unmapped", async () => {
    const resolver = makeResolver();
    const mapper = new GapToRuleMapper(resolver, {
      allowLayerInference: false,
    });
    const gap = makeGap({
      id: "GAP-T6",
      categoria: undefined,
      sourceOrigin: undefined,
      sourceReference: undefined,
    });

    const result = await mapper.mapOne(gap);

    expect(result.status).toBe("unmapped");
    expect(result.categoria).toBeNull();
    expect(result.reason).toContain("unmapped");
  });

  // ─── T7: allowLayerInference=true + layer=onda2 → fonte=iagen ────────
  it("T7: allowLayerInference=true + layer=onda2 + artigo 1 candidato → mapped com fonte=iagen", async () => {
    const cat = makeCat({
      codigo: "confissao_automatica",
      status: "ativo",
    });
    const resolver = makeResolver({
      findByArticle: vi.fn().mockResolvedValue([cat]),
    });
    const mapper = new GapToRuleMapper(resolver, {
      allowLayerInference: true,
    });
    const gap = makeGap({
      id: "GAP-T7",
      categoria: undefined,
      sourceOrigin: undefined,
      sourceReference: "Art. 45 LC 214/2025",
      layer: "onda2",
    });

    const result = await mapper.mapMany([gap]);

    expect(result.stats.mapped).toBe(1);
    expect(result.mappedRules).toHaveLength(1);
    expect(result.mappedRules[0].categoria).toBe("confissao_automatica");
    expect(result.mappedRules[0].fonte).toBe("iagen");
  });
});
