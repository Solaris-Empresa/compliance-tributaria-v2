/**
 * z02b-risk-categorizer-integration.test.ts — Z-02b GAP 1
 *
 * Testes de integração: categorizeRisk() + DerivedRisk.categoria
 * 5 casos obrigatórios conforme prompt do Orquestrador.
 */

import { describe, it, expect } from "vitest";
import { categorizeRisk, assertCategoria } from "./lib/risk-categorizer";
import { DerivedRiskSchema } from "./routers/riskEngine";
import { isCategoryAllowed } from "./lib/risk-eligibility";

// ---------------------------------------------------------------------------
// Caso 1: Gap com topicos "imposto seletivo" → categoria = "imposto_seletivo"
// ---------------------------------------------------------------------------
describe("categorizeRisk — Caso 1: Imposto Seletivo", () => {
  it("deve retornar imposto_seletivo para topicos com 'imposto seletivo'", () => {
    const result = categorizeRisk({
      description: "Risco de não conformidade com IS sobre bebidas alcoólicas",
      lei_ref: "Art. 2 LC 214/2025",
      topicos: "imposto seletivo, bebidas alcoólicas, cigarro",
      domain: "fiscal",
      category: "apuracao",
      type: "geral",
    });
    expect(result).toBe("imposto_seletivo");
  });

  it("deve retornar imposto_seletivo quando description menciona 'cigarro'", () => {
    const result = categorizeRisk({
      description: "Empresa produz cigarro e tabaco — obrigação IS",
      lei_ref: "Art. 3 LC 214/2025",
      topicos: null,
      domain: "fiscal",
      category: "apuracao",
      type: "geral",
    });
    expect(result).toBe("imposto_seletivo");
  });
});

// ---------------------------------------------------------------------------
// Caso 2: Gap com topicos "cbs" → categoria = "ibs_cbs"
// ---------------------------------------------------------------------------
describe("categorizeRisk — Caso 2: IBS/CBS", () => {
  it("deve retornar ibs_cbs para topicos com 'cbs'", () => {
    const result = categorizeRisk({
      description: "Apuração de CBS sobre serviços prestados",
      lei_ref: "LC 214/2025",
      topicos: "cbs, contribuição sobre bens e serviços",
      domain: "fiscal",
      category: "apuracao",
      type: "geral",
    });
    expect(result).toBe("ibs_cbs");
  });

  it("deve retornar ibs_cbs para description com 'ibs'", () => {
    const result = categorizeRisk({
      description: "Risco de apuração incorreta de créditos IBS em empresa com múltiplos CNAEs",
      lei_ref: null,
      topicos: null,
      domain: "fiscal",
      category: "apuracao",
      type: "credito_iva",
    });
    expect(result).toBe("ibs_cbs");
  });
});

// ---------------------------------------------------------------------------
// Caso 3: Gap com type = "split_payment" → categoria = "split_payment"
// ---------------------------------------------------------------------------
describe("categorizeRisk — Caso 3: Split Payment", () => {
  it("deve retornar split_payment para type = split_payment", () => {
    const result = categorizeRisk({
      description: "Risco de não conformidade com split payment",
      lei_ref: "LC 214/2024 — Art. 25",
      topicos: null,
      domain: "fiscal",
      category: "recolhimento",
      type: "split_payment",
    });
    expect(result).toBe("split_payment");
  });

  it("deve retornar split_payment para description com 'split payment'", () => {
    const result = categorizeRisk({
      description: "Sistema não suporta recolhimento automático via split payment",
      lei_ref: null,
      topicos: null,
      domain: "fiscal",
      category: "sistemas",
      type: "erp",
    });
    expect(result).toBe("split_payment");
  });
});

// ---------------------------------------------------------------------------
// Caso 4: Gap sem topicos, sem lei_ref → fallback "unmapped" (M3.8-3 PR #970)
// ANTES: fallback retornava "enquadramento_geral" (gap fantasma com base legal "N/A")
// DEPOIS: fallback retorna "unmapped" → handler em risk-engine-v4 skip o risco
// ---------------------------------------------------------------------------
describe("categorizeRisk — Caso 4: Fallback unmapped (M3.8-3)", () => {
  it("deve retornar unmapped quando não há dados suficientes", () => {
    const result = categorizeRisk({
      description: "",
      lei_ref: null,
      topicos: null,
      domain: "fiscal",
      category: "apuracao",
      type: "geral",
    });
    expect(result).toBe("unmapped");
  });

  it("deve retornar unmapped para input completamente vazio", () => {
    const result = categorizeRisk({});
    expect(result).toBe("unmapped");
  });
});

// ---------------------------------------------------------------------------
// Caso 5: DerivedRiskSchema.parse() aceita campo categoria
// ---------------------------------------------------------------------------
describe("DerivedRiskSchema — Caso 5: campo categoria integrado", () => {
  it("deve aceitar DerivedRisk com categoria = 'imposto_seletivo'", () => {
    const risk = DerivedRiskSchema.parse({
      gap_id: 42,
      requirement_id: null,
      source_reference: "Art. 2 LC 214/2025",
      gap_classification: "ausencia",
      origin: "direto",
      origin_justification: "Gap direto identificado no diagnóstico",
      taxonomy: { domain: "fiscal", category: "apuracao", type: "geral" },
      score: {
        base_score: 90,
        adjusted_score: 85,
        severity: "critico",
        scoring_factors: ["base_criticality=critica(90)"],
        confidence: 0.92,
        confidence_reason: "Gap direto com dados completos",
      },
      description: "Risco crítico de IS sobre bebidas alcoólicas",
      mitigation_hint: "Regularizar obrigação IS",
      fonte_risco: "solaris",
      categoria: "imposto_seletivo",
    });
    expect(risk.categoria).toBe("imposto_seletivo");
  });

  it("deve usar default 'enquadramento_geral' quando categoria não é fornecida", () => {
    const risk = DerivedRiskSchema.parse({
      gap_id: null,
      requirement_id: null,
      source_reference: null,
      gap_classification: null,
      origin: "contextual",
      origin_justification: "Risco contextual",
      taxonomy: { domain: "fiscal", category: "apuracao", type: "geral" },
      score: {
        base_score: 50,
        adjusted_score: 45,
        severity: "medio",
        scoring_factors: [],
        confidence: 0.72,
        confidence_reason: "Risco contextual",
      },
      description: "Risco contextual genérico",
      mitigation_hint: "Monitorar",
      fonte_risco: "v1",
      // categoria omitida → deve usar default
    });
    expect(risk.categoria).toBe("enquadramento_geral");
  });

  it("assertCategoria não lança erro para categoria válida", () => {
    expect(() => assertCategoria("ibs_cbs", "RISK-001")).not.toThrow();
  });

  it("assertCategoria lança Error para categoria vazia", () => {
    expect(() => assertCategoria("", "RISK-002")).toThrow(
      "[risk-categorizer] Risco sem categoria: RISK-002"
    );
  });

  it("assertCategoria lança Error para categoria null", () => {
    expect(() => assertCategoria(null, "RISK-003")).toThrow(
      "[risk-categorizer] Risco sem categoria: RISK-003"
    );
  });
});

// ---------------------------------------------------------------------------
// RED TEST — Hotfix IS v1.2: bug imposto_seletivo para transportadora
// SPEC: docs/specs/SPEC-HOTFIX-IS-v1.2.md
// ADR:  docs/adr/ADR-0030-hotfix-is-elegibilidade-por-operationtype-v1.1.md
// ---------------------------------------------------------------------------
describe("RED TEST — bug imposto_seletivo para transportadora (hotfix v1.2)", () => {
  it("[LIM-1:corrigido-para-servicos] transportadora de combustível NÃO deve receber imposto_seletivo", () => {
    const suggested = categorizeRisk({
      description: "Gap sobre veículo e combustível identificado",
      topicos: null,
    });
    expect(suggested).toBe("imposto_seletivo");

    const eligibility = isCategoryAllowed(suggested, "servicos");
    expect(eligibility.allowed).toBe(false);
    // M3.8-3 (PR #970): downgrade_to mudou de "enquadramento_geral" → "unmapped"
    expect(eligibility.final).toBe("unmapped");
    expect(eligibility.reason).toBe("sujeito_passivo_incompativel");
  });
});
