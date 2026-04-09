import { describe, it, expect } from "vitest";
import {
  classifyRisk,
  buildBreadcrumb,
  sortBySourceRank,
  computeRiskMatrix,
  buildActionPlans,
  SEVERITY_TABLE,
  SOURCE_RANK,
  type GapRule,
  type RiskV4,
  type ActionPlanV4,
} from "./risk-engine-v4";

// ---------------------------------------------------------------------------
// Helpers — dados simulados
// ---------------------------------------------------------------------------

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

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO A — Classificação determinística (7 testes)
// ═══════════════════════════════════════════════════════════════════════════

describe("Bloco A — classificação determinística", () => {
  it("A1: imposto_seletivo → severity alta, urgência imediata", () => {
    const r = classifyRisk(makeGap({ categoria: "imposto_seletivo" }));
    expect(r.severity).toBe("alta");
    expect(r.urgency).toBe("imediata");
  });

  it("A2: confissao_automatica → severity alta, urgência imediata", () => {
    const r = classifyRisk(makeGap({ categoria: "confissao_automatica" }));
    expect(r.severity).toBe("alta");
    expect(r.urgency).toBe("imediata");
  });

  it("A3: split_payment → severity alta, urgência imediata", () => {
    const r = classifyRisk(makeGap({ categoria: "split_payment" }));
    expect(r.severity).toBe("alta");
    expect(r.urgency).toBe("imediata");
  });

  it("A4: inscricao_cadastral → severity alta, urgência imediata", () => {
    const r = classifyRisk(makeGap({ categoria: "inscricao_cadastral" }));
    expect(r.severity).toBe("alta");
    expect(r.urgency).toBe("imediata");
  });

  it("A5: regime_diferenciado → severity media, urgência curto_prazo", () => {
    const r = classifyRisk(makeGap({ categoria: "regime_diferenciado" }));
    expect(r.severity).toBe("media");
    expect(r.urgency).toBe("curto_prazo");
  });

  it("A6: obrigacao_acessoria → severity media, urgência curto_prazo", () => {
    const r = classifyRisk(makeGap({ categoria: "obrigacao_acessoria" }));
    expect(r.severity).toBe("media");
    expect(r.urgency).toBe("curto_prazo");
  });

  it("A7: SEVERITY_TABLE cobre exatamente 10 categorias", () => {
    const categorias = Object.keys(SEVERITY_TABLE);
    expect(categorias).toHaveLength(10);
    expect(categorias).toContain("imposto_seletivo");
    expect(categorias).toContain("confissao_automatica");
    expect(categorias).toContain("split_payment");
    expect(categorias).toContain("inscricao_cadastral");
    expect(categorias).toContain("regime_diferenciado");
    expect(categorias).toContain("transicao_iss_ibs");
    expect(categorias).toContain("obrigacao_acessoria");
    expect(categorias).toContain("aliquota_zero");
    expect(categorias).toContain("aliquota_reduzida");
    expect(categorias).toContain("credito_presumido");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO B — Invariantes críticas (7 testes)
// ═══════════════════════════════════════════════════════════════════════════

describe("Bloco B — invariantes críticas", () => {
  it("B1: ruleId nunca é null no risco produzido", () => {
    const r = classifyRisk(makeGap({ ruleId: "RULE-999" }));
    expect(r.ruleId).not.toBeNull();
    expect(r.ruleId).toBe("RULE-999");
  });

  it("B2: artigo vem do GapRule, nunca inventado", () => {
    const gap = makeGap({ artigo: "Art. 156-A §3º" });
    const r = classifyRisk(gap);
    expect(r.artigo).toBe("Art. 156-A §3º");
  });

  it("B3: breadcrumb tem exatamente 4 nós", () => {
    const bc = buildBreadcrumb(makeGap({
      fonte: "cnae",
      categoria: "split_payment",
      artigo: "Art. 29",
      ruleId: "RULE-001",
    }));
    expect(bc).toHaveLength(4);
    expect(bc).toEqual(["cnae", "split_payment", "Art. 29", "RULE-001"]);
  });

  it("B4: oportunidade → buildActionPlans retorna array vazio", () => {
    const gap = makeGap({ categoria: "aliquota_zero" });
    const risk = classifyRisk(gap);
    expect(risk.severity).toBe("oportunidade");
    const plans = buildActionPlans([risk]);
    expect(plans).toEqual([]);
  });

  it("B5: evidence ordenada por SOURCE_RANK (menor = primeiro)", () => {
    const gaps = [
      makeGap({ fonte: "solaris", ruleId: "R-S" }),
      makeGap({ fonte: "cnae", ruleId: "R-C" }),
      makeGap({ fonte: "nbs", ruleId: "R-N" }),
    ];
    const sorted = sortBySourceRank(gaps);
    expect(sorted[0].fonte).toBe("cnae");   // rank 1
    expect(sorted[1].fonte).toBe("nbs");    // rank 3
    expect(sorted[2].fonte).toBe("solaris"); // rank 4
  });

  it("B6: função pura — mesma entrada produz mesma saída", () => {
    const gap = makeGap({ categoria: "split_payment" });
    const r1 = classifyRisk(gap);
    const r2 = classifyRisk(gap);
    expect(r1).toEqual(r2);
  });

  it("B7: array vazio de gaps → array vazio de riscos", () => {
    const result = computeRiskMatrix([]);
    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO C — Decision table: 10 categorias (8 testes)
// ═══════════════════════════════════════════════════════════════════════════

describe("Bloco C — decision table completa", () => {
  it("C1: todas as categorias 'alta' têm urgência 'imediata'", () => {
    const altas = ["imposto_seletivo", "confissao_automatica", "split_payment", "inscricao_cadastral"];
    for (const cat of altas) {
      const r = classifyRisk(makeGap({ categoria: cat }));
      expect(r.severity, `${cat} deve ser alta`).toBe("alta");
      expect(r.urgency, `${cat} deve ser imediata`).toBe("imediata");
    }
  });

  it("C2: transicao_iss_ibs → severity media, urgência medio_prazo", () => {
    const r = classifyRisk(makeGap({ categoria: "transicao_iss_ibs" }));
    expect(r.severity).toBe("media");
    expect(r.urgency).toBe("medio_prazo");
  });

  it("C3: aliquota_zero → severity oportunidade, urgência curto_prazo", () => {
    const r = classifyRisk(makeGap({ categoria: "aliquota_zero" }));
    expect(r.severity).toBe("oportunidade");
    expect(r.urgency).toBe("curto_prazo");
  });

  it("C4: aliquota_reduzida → severity oportunidade, urgência curto_prazo", () => {
    const r = classifyRisk(makeGap({ categoria: "aliquota_reduzida" }));
    expect(r.severity).toBe("oportunidade");
    expect(r.urgency).toBe("curto_prazo");
  });

  it("C5: credito_presumido → severity oportunidade, urgência curto_prazo", () => {
    const r = classifyRisk(makeGap({ categoria: "credito_presumido" }));
    expect(r.severity).toBe("oportunidade");
    expect(r.urgency).toBe("curto_prazo");
  });

  it("C6: SOURCE_RANK respeita ordem cnae < ncm < nbs < solaris < iagen", () => {
    expect(SOURCE_RANK.cnae).toBe(1);
    expect(SOURCE_RANK.ncm).toBe(2);
    expect(SOURCE_RANK.nbs).toBe(3);
    expect(SOURCE_RANK.solaris).toBe(4);
    expect(SOURCE_RANK.iagen).toBe(5);
  });

  it("C7: computeRiskMatrix preserva ruleId de cada gap na saída", () => {
    const gaps = [
      makeGap({ ruleId: "R-A", categoria: "split_payment" }),
      makeGap({ ruleId: "R-B", categoria: "obrigacao_acessoria" }),
    ];
    const risks = computeRiskMatrix(gaps);
    expect(risks).toHaveLength(2);
    expect(risks[0].ruleId).toBe("R-A");
    expect(risks[1].ruleId).toBe("R-B");
  });

  it("C8: computeRiskMatrix ordena riscos por severity (alta > media > oportunidade)", () => {
    const gaps = [
      makeGap({ ruleId: "R-OPP", categoria: "aliquota_zero" }),
      makeGap({ ruleId: "R-ALT", categoria: "split_payment" }),
      makeGap({ ruleId: "R-MED", categoria: "obrigacao_acessoria" }),
    ];
    const risks = computeRiskMatrix(gaps);
    expect(risks[0].severity).toBe("alta");
    expect(risks[1].severity).toBe("media");
    expect(risks[2].severity).toBe("oportunidade");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO D — Action plan engine (8 testes)
// ═══════════════════════════════════════════════════════════════════════════

describe("Bloco D — action plan engine", () => {
  it("D1: risco severity alta gera plano de ação com prioridade imediata", () => {
    const risk = classifyRisk(makeGap({ categoria: "split_payment" }));
    const plans = buildActionPlans([risk]);
    expect(plans).toHaveLength(1);
    expect(plans[0].prioridade).toBe("imediata");
  });

  it("D2: risco severity media gera plano com prioridade correspondente à urgência", () => {
    const risk = classifyRisk(makeGap({ categoria: "obrigacao_acessoria" }));
    const plans = buildActionPlans([risk]);
    expect(plans).toHaveLength(1);
    expect(plans[0].prioridade).toBe("curto_prazo");
  });

  it("D3: múltiplos riscos alta geram um plano por risco", () => {
    const risks = [
      classifyRisk(makeGap({ ruleId: "R-1", categoria: "split_payment" })),
      classifyRisk(makeGap({ ruleId: "R-2", categoria: "confissao_automatica" })),
      classifyRisk(makeGap({ ruleId: "R-3", categoria: "imposto_seletivo" })),
    ];
    const plans = buildActionPlans(risks);
    expect(plans).toHaveLength(3);
    plans.forEach(p => expect(p.prioridade).toBe("imediata"));
  });

  it("D4: plano de ação preserva ruleId do risco de origem", () => {
    const risk = classifyRisk(makeGap({ ruleId: "RULE-XYZ", categoria: "split_payment" }));
    const plans = buildActionPlans([risk]);
    expect(plans[0].riskRuleId).toBe("RULE-XYZ");
  });

  it("D5: plano de ação contém breadcrumb de 4 nós", () => {
    const risk = classifyRisk(makeGap({
      fonte: "ncm",
      categoria: "confissao_automatica",
      artigo: "Art. 44",
      ruleId: "RULE-044",
    }));
    const plans = buildActionPlans([risk]);
    expect(plans[0].breadcrumb).toHaveLength(4);
    expect(plans[0].breadcrumb).toEqual(["ncm", "confissao_automatica", "Art. 44", "RULE-044"]);
  });

  it("D6: mix de severidades — oportunidades filtradas, demais geram planos", () => {
    const risks = [
      classifyRisk(makeGap({ ruleId: "R-A", categoria: "split_payment" })),
      classifyRisk(makeGap({ ruleId: "R-B", categoria: "aliquota_zero" })),
      classifyRisk(makeGap({ ruleId: "R-C", categoria: "obrigacao_acessoria" })),
      classifyRisk(makeGap({ ruleId: "R-D", categoria: "credito_presumido" })),
    ];
    const plans = buildActionPlans(risks);
    // oportunidades (aliquota_zero, credito_presumido) não geram plano
    expect(plans).toHaveLength(2);
    expect(plans.map(p => p.riskRuleId)).toEqual(["R-A", "R-C"]);
  });

  it("D7: buildActionPlans é função pura — mesma entrada, mesma saída", () => {
    const risks = [
      classifyRisk(makeGap({ ruleId: "R-1", categoria: "split_payment" })),
      classifyRisk(makeGap({ ruleId: "R-2", categoria: "regime_diferenciado" })),
    ];
    const p1 = buildActionPlans(risks);
    const p2 = buildActionPlans(risks);
    expect(p1).toEqual(p2);
  });

  it("D8: buildActionPlans com array vazio retorna array vazio", () => {
    const plans = buildActionPlans([]);
    expect(plans).toEqual([]);
  });
});
