// artigo-base-subdispositivo-1691.test.ts
// Contract tests (DB-free) para #1691 — citação por sub-dispositivo + re-escopo art_269_270.
// Trava as 2 regressões user-facing: título de plano acionável + label sem "apuração".
// A paridade de `artigo` (data-driven vs hardcoded) exige DB → dbDescribe (tech-debt #1691).

import { describe, it, expect } from "vitest";
import { PLANS, buildActionPlans } from "./action-plan-engine-v4";
import { CATEGORIA_LABELS } from "@shared/categoria-labels";
import type { RiskV4 } from "./risk-engine-v4";

describe("#1691 — art_269_270 re-escopado (269 + 270 §único)", () => {
  it("tem entrada no catálogo PLANS (não cai no defaultSuggestion genérico)", () => {
    expect(PLANS["risco_art_269_270"]).toBeDefined();
    expect(PLANS["risco_art_269_270"]!.length).toBeGreaterThan(0);
    const titulo = PLANS["risco_art_269_270"]![0].titulo;
    // NÃO pode ser o padrão genérico "Avaliar e mitigar risco de ..."
    expect(titulo).not.toMatch(/^Avaliar e mitigar risco de /);
    expect(titulo).toContain("CIB");
  });

  it("buildActionPlans gera título acionável (não genérico) para art_269_270", () => {
    const risk = {
      ruleId: "risco_art_269_270::op:servicos::geo:mono",
      categoria: "risco_art_269_270",
      artigo: "Art. 269 e Art. 270, § único, LC 214/2025",
      severity: "media",
      urgency: "curto_prazo",
      breadcrumb: ["inferred", "risco_art_269_270", "Art. 269 e Art. 270, § único, LC 214/2025", "x"],
    } as unknown as RiskV4;
    const [plano] = buildActionPlans([risk]);
    expect(plano.titulo).not.toMatch(/^Avaliar e mitigar risco de /);
  });

  it("label não menciona mais 'Apuração' (apuração é de controle_empreendimento)", () => {
    expect(CATEGORIA_LABELS["risco_art_269_270"]).toBeDefined();
    expect(CATEGORIA_LABELS["risco_art_269_270"]).not.toMatch(/[Aa]pura/);
  });

  it("controle_empreendimento continua sendo o dono da apuração (label intacto)", () => {
    expect(CATEGORIA_LABELS["risco_controle_empreendimento"]).toMatch(/[Aa]pura/);
  });
});
