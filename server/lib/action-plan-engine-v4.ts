// action-plan-engine-v4.ts — Engine determinístico de planos de ação (Sprint Z-07 / ADR-0022)
// oportunidade → [] sempre. Função pura.
// Sprint Z-14: catálogo PLANS por ruleId (RN_PLANOS_TAREFAS_V4.md)

import type { RiskV4, ActionPlanV4 } from "./risk-engine-v4";

// ─── Catálogo canônico de planos por ruleId ─────────────────────────────────

interface ActionPlanSuggestion {
  titulo: string;
  responsavel: string;
  prazo: "30_dias" | "60_dias" | "90_dias" | "180_dias";
}

const PLANS: Record<string, ActionPlanSuggestion[]> = {
  "GAP-IS-001": [
    { titulo: "Implantar controle de apuração do IS", responsavel: "gestor_fiscal", prazo: "90_dias" },
    { titulo: "Contratar assessoria tributária IS", responsavel: "diretor", prazo: "30_dias" },
  ],
  "GAP-SP-001": [
    { titulo: "Adequar sistema para split payment", responsavel: "ti", prazo: "90_dias" },
  ],
  "GAP-AZ-001": [
    { titulo: "Parametrizar alíquota zero nos produtos elegíveis", responsavel: "gestor_fiscal", prazo: "60_dias" },
  ],
  "GAP-TR-001": [
    { titulo: "Plano de transição ISS para IBS 2026 a 2032", responsavel: "juridico", prazo: "180_dias" },
  ],
};

function defaultSuggestion(risk: RiskV4): ActionPlanSuggestion {
  const prazoMap: Record<string, "30_dias" | "60_dias" | "90_dias" | "180_dias"> = {
    imediata: "30_dias",
    curto_prazo: "60_dias",
    medio_prazo: "90_dias",
  };
  return {
    titulo: `Avaliar e mitigar: ${risk.categoria} — ${risk.artigo}`,
    responsavel: "advogado",
    prazo: prazoMap[risk.urgency] ?? "60_dias",
  };
}

// ─── buildActionPlans ───────────────────────────────────────────────────────

export function buildActionPlans(risks: RiskV4[]): ActionPlanV4[] {
  const plans: ActionPlanV4[] = [];

  for (const risk of risks) {
    // RN-AP-09: oportunidade NUNCA gera plano
    if (risk.severity === "oportunidade") continue;

    const suggestions = PLANS[risk.ruleId] ?? [defaultSuggestion(risk)];

    for (const s of suggestions) {
      plans.push({
        riskRuleId: risk.ruleId,
        categoria: risk.categoria,
        artigo: risk.artigo,
        prioridade: risk.urgency,
        breadcrumb: risk.breadcrumb,
        severity: risk.severity,
        titulo: s.titulo,
        responsavel: s.responsavel,
        prazo: s.prazo,
      });
    }
  }

  return plans;
}
