/**
 * action-plan-engine-v4.test.ts — Test contract BUG-PLAN-TITLE (2026-06-02)
 *
 * Cobre:
 *   - 4 entries novas no catálogo PLANS (confissao_automatica, inscricao_cadastral,
 *     obrigacao_acessoria, regime_diferenciado) que estavam caindo em defaultSuggestion
 *     com título ilegível.
 *   - defaultSuggestion NÃO inclui mais `${risk.artigo}` (que duplicava o badge verde
 *     em ActionPlanPage.tsx:556).
 *   - defaultSuggestion usa CATEGORIA_LABELS para gerar título em PT-BR.
 *
 * Origem: PDF E2E projeto 5640001 — 4/6 planos com título fallback ilegível.
 * Análise: docs/governance/relatorios/AS-IS-TO-BE-BUG-PLAN-TITLE-20260602.md
 */
import { describe, it, expect } from "vitest";
import {
  PLANS,
  defaultSuggestion,
  buildActionPlans,
} from "./action-plan-engine-v4";
import type { RiskV4 } from "./risk-engine-v4";

// Helper: cria mock RiskV4 mínimo para os tests (todos os campos required)
function makeRisk(overrides: Partial<RiskV4>): RiskV4 {
  return {
    ruleId: "x::op:default::geo:mono",
    categoria: "imposto_seletivo",
    artigo: "Art. 999 LC 214/2025; Arts. 100, 200 Decreto 12.955/2026",
    fonte: "regulatorio",
    severity: "alta",
    urgency: "imediata",
    breadcrumb: ["regulatorio", "imposto_seletivo", "Art. 999", "x"],
    gapClassification: "ausencia",
    requirementId: "REQ-001",
    sourceReference: "SOL-001",
    domain: "tributario",
    ...overrides,
  };
}

describe("BUG-PLAN-TITLE — catálogo PLANS + defaultSuggestion", () => {
  describe("PLANS catálogo (4 entries novas)", () => {
    it("confissao_automatica tem entrada customizada (não fallback)", () => {
      expect(PLANS["confissao_automatica"]).toBeDefined();
      expect(PLANS["confissao_automatica"]?.length).toBeGreaterThan(0);
      const [plan] = PLANS["confissao_automatica"]!;
      // Título customizado não deve conter snake_case da categoria
      expect(plan.titulo).not.toContain("confissao_automatica");
      // Título customizado não deve conter "Avaliar e mitigar:" (formato fallback)
      expect(plan.titulo).not.toMatch(/^Avaliar e mitigar:/);
    });

    it("inscricao_cadastral tem entrada customizada", () => {
      expect(PLANS["inscricao_cadastral"]).toBeDefined();
      const [plan] = PLANS["inscricao_cadastral"]!;
      expect(plan.titulo).not.toContain("inscricao_cadastral");
      expect(plan.titulo).not.toMatch(/^Avaliar e mitigar:/);
    });

    it("obrigacao_acessoria tem entrada customizada", () => {
      expect(PLANS["obrigacao_acessoria"]).toBeDefined();
      const [plan] = PLANS["obrigacao_acessoria"]!;
      expect(plan.titulo).not.toContain("obrigacao_acessoria");
      expect(plan.titulo).not.toMatch(/^Avaliar e mitigar:/);
    });

    it("regime_diferenciado tem entrada customizada", () => {
      expect(PLANS["regime_diferenciado"]).toBeDefined();
      const [plan] = PLANS["regime_diferenciado"]!;
      expect(plan.titulo).not.toContain("regime_diferenciado");
      expect(plan.titulo).not.toMatch(/^Avaliar e mitigar:/);
    });
  });

  describe("defaultSuggestion — fallback sem artigo + label PT-BR", () => {
    it("NÃO inclui risk.artigo no título (BUG-PLAN-TITLE — duplicação UI)", () => {
      // categoria_futura simula categoria nova ainda sem entrada no PLANS
      const risk = makeRisk({
        categoria: "categoria_futura",
        artigo: "Art. 999 LC 214/2025; Arts. 100, 200 Decreto 12.955/2026",
      });
      const sug = defaultSuggestion(risk);
      expect(sug.titulo).not.toContain(risk.artigo);
      expect(sug.titulo).not.toContain("Art. 999");
      expect(sug.titulo).not.toContain("Decreto");
    });

    it("usa label PT-BR via CATEGORIA_LABELS quando categoria conhecida", () => {
      const risk = makeRisk({ categoria: "obrigacao_acessoria" });
      const sug = defaultSuggestion(risk);
      // Nota: na prática obrigacao_acessoria nunca cai em defaultSuggestion
      // porque tem entrada em PLANS (após este PR). Testamos a lógica do fallback.
      expect(sug.titulo).toBe("Avaliar e mitigar risco de Obrigação Acessória");
    });

    it("fallback gracioso para categoria desconhecida (snake_case literal)", () => {
      const risk = makeRisk({ categoria: "categoria_inventada_futura" });
      const sug = defaultSuggestion(risk);
      expect(sug.titulo).toBe(
        "Avaliar e mitigar risco de categoria_inventada_futura",
      );
    });

    it("prazo derivado de risk.urgency (imediata → 30_dias)", () => {
      const risk = makeRisk({ categoria: "categoria_futura", urgency: "imediata" });
      expect(defaultSuggestion(risk).prazo).toBe("30_dias");
    });
  });

  describe("buildActionPlans — integração lookup chain", () => {
    it("confissao_automatica usa PLANS (não defaultSuggestion)", () => {
      const risk = makeRisk({
        ruleId: "confissao_automatica::op:agronegocio::geo:mono",
        categoria: "confissao_automatica",
        artigo: "Art. 45 LC 214/2025; Arts. 44, 46 Decreto 12.955/2026",
      });
      const plans = buildActionPlans([risk]);
      expect(plans).toHaveLength(1);
      expect(plans[0].titulo).toBe(
        "Implantar controle preventivo de confissão automática de débitos",
      );
      // Anti-regressão: NÃO usa formato fallback
      expect(plans[0].titulo).not.toMatch(/^Avaliar e mitigar:/);
      expect(plans[0].titulo).not.toContain("Art. 45");
    });

    it("categoria desconhecida cai em defaultSuggestion (sem artigo)", () => {
      const risk = makeRisk({
        ruleId: "futura::op:default::geo:mono",
        categoria: "categoria_futura",
        artigo: "Art. 999 LC 214/2025",
      });
      const plans = buildActionPlans([risk]);
      expect(plans).toHaveLength(1);
      expect(plans[0].titulo).toBe("Avaliar e mitigar risco de categoria_futura");
      expect(plans[0].titulo).not.toContain("Art. 999");
    });

    it("oportunidade NÃO gera plano (RN-AP-09 preservado)", () => {
      const risk = makeRisk({
        categoria: "aliquota_zero",
        severity: "oportunidade",
      });
      const plans = buildActionPlans([risk]);
      expect(plans).toHaveLength(0);
    });
  });
});

describe("D-1 / Lição #74 — PLANS com títulos acionáveis para as 9 categorias construção civil", () => {
  const FASE3A = [
    "risco_redutor_ajuste", "risco_sinter_avaliacao", "risco_cib_cadastro",
    "risco_controle_empreendimento", "risco_permuta_imoveis", "risco_tributacao_parcelas",
    "risco_sujeicao_passiva_scp", "risco_custos_historicos", "risco_credito_condicionado_obra",
  ];

  it("PLANS tem entrada para todas as 9 categorias Fase 3a", () => {
    for (const cat of FASE3A) {
      expect(PLANS[cat], `PLANS faltando para ${cat}`).toBeDefined();
      expect(PLANS[cat].length).toBeGreaterThan(0);
    }
  });

  it("nenhum título de plano contém snake_case (risco_)", () => {
    for (const cat of FASE3A) {
      expect(PLANS[cat][0].titulo).not.toMatch(/risco_/);
    }
  });
});
