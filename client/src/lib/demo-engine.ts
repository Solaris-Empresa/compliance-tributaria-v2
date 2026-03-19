/**
 * Demo Engine — carrega dados gerados pelo motor v3 real (sem backend)
 * Suporta 3 cenários: simples, medio, complexo
 */
import scenariosData from "./scenarios.json";

export type ScenarioKey = "simples" | "medio" | "complexo";

export type DemoRequirement = {
  code: string;
  name: string;
  domain: string;
  score: {
    finalScore: number;
    weightedScore: number;
    status: string;
    criticalEvidenceFlag: boolean;
    effectiveCriticality: string;
  };
  gap: {
    gapType: string;
    gapLevel: string;
    evidenceStatus: string;
    priorityScore: number;
    unmetCriteria: string[];
    recommendedActions: (string | null)[];
  };
  risk: {
    riskLevel: string;
    riskDimension: string;
    probability: number;
    impact: number;
    estimatedFinancialImpact: {
      revenuePercent: number;
      description: string;
      formula: string;
    };
  };
  action: {
    actionCode: string;
    priority: string;
    estimatedDays: number;
    description: string;
  };
  tasks: {
    taskCode: string;
    title: string;
    responsible: string;
    estimatedDays: number;
    executionOrder: number;
  }[];
};

export type DemoData = {
  scenario: string;
  companyName: string;
  generatedAt: string;
  overallScore: number;
  totalRequirements: number;
  criticalRisks: number;
  highRisks: number;
  immediateActions: number;
  radar: { domain: string; score: number }[];
  requirements: DemoRequirement[];
};

export type ScenariosData = {
  simples: DemoData;
  medio: DemoData;
  complexo: DemoData;
};

export const SCENARIOS: ScenariosData = scenariosData as ScenariosData;

export function getScenario(key: ScenarioKey): DemoData {
  return SCENARIOS[key];
}

export function getScenarioRadar(key: ScenarioKey): Record<string, number> {
  return Object.fromEntries(SCENARIOS[key].radar.map(r => [r.domain, r.score]));
}

export function getScenarioMatrixCells(key: ScenarioKey) {
  const map = new Map<string, number>();
  for (const r of SCENARIOS[key].requirements) {
    const k = `${r.risk.probability}-${r.risk.impact}`;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([k, count]) => {
    const [probability, impact] = k.split("-").map(Number);
    return { probability, impact, count };
  });
}

// Backward compat — default para complexo (cenário original)
export const DEMO: DemoData = SCENARIOS.complexo;
export const DEMO_RADAR = getScenarioRadar("complexo");
export const DEMO_MATRIX_CELLS = getScenarioMatrixCells("complexo");

export const DOMAIN_LABELS_DEMO: Record<string, string> = {
  governanca_transicao: "Governança da Transição",
  sistemas_erp_dados: "Sistemas ERP e Dados",
  gestao_fiscal_operacional: "Gestão Fiscal Operacional",
  cadastros_tabelas_fiscais: "Cadastros e Tabelas Fiscais",
  gestao_pessoas_cultura: "Gestão de Pessoas e Cultura",
  contratos_fornecedores: "Contratos e Fornecedores",
  planejamento_financeiro_tributario: "Planejamento Financeiro",
  juridico_regulatorio: "Jurídico e Regulatório",
  obrigacoes_acessorias: "Obrigações Acessórias",
  creditos_compensacoes: "Créditos e Compensações",
  contratos_comerciais: "Contratos Comerciais",
  precificacao_repasse: "Precificação e Repasse",
  planejamento_financeiro: "Planejamento Financeiro",
  juridico: "Jurídico e Regulatório",
};

export const GAP_TYPE_LABELS: Record<string, string> = {
  normativo: "Normativo",
  sistema: "Sistema",
  processo: "Processo",
  cadastro: "Cadastro",
  contrato: "Contrato",
  financeiro: "Financeiro",
  acessorio: "Acessório",
};

export const PRIORITY_LABELS: Record<string, string> = {
  imediata: "Imediata",
  curto_prazo: "Curto Prazo",
  medio_prazo: "Médio Prazo",
  planejamento: "Planejamento",
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
};

export const CRITICALITY_LABELS: Record<string, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const GAP_LEVEL_LABELS: Record<string, string> = {
  nao_atendido: "Não Atendido",
  parcial: "Parcial",
  atendido: "Atendido",
};

export const SCENARIO_META: Record<ScenarioKey, {
  label: string;
  subtitle: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  badge: string;
  badgeColor: string;
}> = {
  simples: {
    label: "Empresa Simples",
    subtitle: "Comércio Digital ME",
    description: "Empresa de comércio com equipe fiscal estruturada. Já realizou treinamentos e revisou contratos. Poucos gaps residuais a resolver.",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: "✅",
    badge: "Bem Preparada",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  medio: {
    label: "Empresa Média",
    subtitle: "Serviços Integrados Ltda.",
    description: "Empresa de serviços em transição. Iniciou a adequação mas ainda tem gaps críticos no ERP e provisão financeira.",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: "⚠️",
    badge: "Em Transição",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  complexo: {
    label: "Empresa Complexa",
    subtitle: "Indústria Nacional S.A.",
    description: "Indústria de médio porte sem estrutura fiscal para a reforma. Múltiplos riscos críticos e ações imediatas necessárias.",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: "🚨",
    badge: "Situação Crítica",
    badgeColor: "bg-red-100 text-red-700",
  },
};
