/**
 * Demo Engine — carrega dados gerados pelo motor v3 real (sem backend)
 * Usado pelo site de demonstração público (sem login)
 */
import demoData from "./demo-data.json";

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
  generatedAt: string;
  overallScore: number;
  totalRequirements: number;
  criticalRisks: number;
  highRisks: number;
  immediateActions: number;
  radar: { domain: string; score: number }[];
  requirements: DemoRequirement[];
};

export const DEMO: DemoData = demoData as DemoData;

export const DEMO_RADAR: Record<string, number> = Object.fromEntries(
  DEMO.radar.map(r => [r.domain, r.score])
);

export const DEMO_MATRIX_CELLS = (() => {
  const map = new Map<string, number>();
  for (const r of DEMO.requirements) {
    const key = `${r.risk.probability}-${r.risk.impact}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([key, count]) => {
    const [probability, impact] = key.split("-").map(Number);
    return { probability, impact, count };
  });
})();

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
  // aliases
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
