// action-plan-engine-v4.ts — Engine determinístico de planos de ação (Sprint Z-07 / ADR-0022)
// oportunidade → [] sempre. Função pura.

import type { RiskV4, ActionPlanV4 } from "./risk-engine-v4";

export function buildActionPlans(risks: RiskV4[]): ActionPlanV4[] {
  return risks
    .filter(r => r.severity !== "oportunidade")
    .map(r => ({
      riskRuleId: r.ruleId,
      categoria: r.categoria,
      artigo: r.artigo,
      prioridade: r.urgency,
      breadcrumb: r.breadcrumb,
      severity: r.severity,
    }));
}
