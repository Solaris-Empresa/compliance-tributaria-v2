// ============================================================
// Tipos Compliance v3 — Solaris Compliance (Sprint 7)
// Baseado na especificação canônica do orquestrador
// ============================================================

// --- Dashboard ---

export type DashboardFullData = {
  project: {
    id: number;
    name: string;
    clientName: string;
    status: string;
    analysisVersion: number;
    updatedAt: string;
  };
  kpis: {
    complianceScore: number;
    criticalRisks: number;
    immediateActions: number;
    progressPercent: number;
    estimatedFinancialImpact: number;
  };
  radar: {
    byDomain: Record<string, number>;
    overallScore: number;
    criticalDomains: string[];
    generatedAt: string;
  };
  risks: {
    summary: {
      totalRisks: number;
      critico: number;
      alto: number;
      medio: number;
      baixo: number;
    };
    matrix: Array<{
      probability: number;
      impact: number;
      count: number;
      riskIds?: string[];
    }>;
  };
  topRisks: RiskItem[];
  immediateActions: ImmediateActionItem[];
  criticalGaps: GapItem[];
  actions: {
    summary: {
      totalActions: number;
      imediata: number;
      curto_prazo: number;
      medio_prazo: number;
      planejamento: number;
    };
    items: ActionPlanItem[];
  };
  tasks: {
    summary: TaskExecutionSummary;
  };
  executive: {
    executiveSummary: string;
    topRisksNarrative: string;
    actionPlanNarrative: string;
  };
};

export type DashboardFilters = {
  domain?: string;
  riskLevel?: string;
  priority?: string;
};

// --- Assessment ---

export type AssessmentQuestion = {
  id: string;
  label: string;
  type: "boolean" | "text" | "textarea" | "select" | "multiselect" | "number";
  required: boolean;
  options?: string[];
  helperText?: string;
};

export type AssessmentRequirement = {
  id: number;
  code: string;
  name: string;
  domain: string;
  description: string;
  layer: "universal" | "contextual" | "operacional";
  baseCriticality: "baixa" | "media" | "alta" | "critica";
  evaluationCriteria: string[];
  evidenceRequired: string[];
  tags: string[];
  assessmentOrder: number;
};

export type AssessmentEvidenceDraft = {
  text?: string;
  urls?: string[];
  files?: Array<{
    name: string;
    storageKey?: string;
  }>;
};

export type AssessmentAnswers = Record<string, boolean | string | number | string[]>;

// --- Gaps ---

export type GapItem = {
  id: number;
  requirementId: number;
  requirementCode: string;
  requirementName: string;
  domain: string;
  score: number;
  criticality: "baixa" | "media" | "alta" | "critica";
  complianceStatus: "atendido" | "parcial" | "nao_atendido";
  gapType: string;
  evidenceStatus: string;
  actionPriority: "imediata" | "curto_prazo" | "medio_prazo" | "planejamento";
  estimatedDays: number;
  unmetCriteria: string[];
  recommendedActions: string[];
  priorityScore: number;
  riskLevel: "baixo" | "medio" | "alto" | "critico";
};

// --- Risks ---

export type RiskItem = {
  id: number;
  requirementId: number;
  requirementName: string;
  domain: string;
  riskCode: string;
  riskLevel: "baixo" | "medio" | "alto" | "critico";
  riskDimension: "regulatorio" | "operacional" | "financeiro" | "reputacional";
  probability: number;
  impact: number;
  riskScore: number;
  riskScoreNormalized: number;
  financialImpactPercent: number;
};

export type RiskMatrixCell = {
  probability: number;
  impact: number;
  count: number;
  riskIds?: string[];
};

export type RiskSummary = {
  totalRisks: number;
  critico: number;
  alto: number;
  medio: number;
  baixo: number;
};

// --- Actions ---

export type ActionPlanItem = {
  id: number;
  requirementId: number;
  domain: string;
  actionCode: string;
  actionName: string;
  actionType: string;
  actionPriority: "imediata" | "curto_prazo" | "medio_prazo" | "planejamento";
  estimatedDays: number;
  ownerSuggestion: string;
  status: "nao_iniciado" | "em_andamento" | "em_revisao" | "concluido" | "cancelado";
  progressPercent: number;
};

export type ImmediateActionItem = ActionPlanItem;

// --- Tasks ---

export type AtomicTaskItem = {
  id: number;
  actionId: number;
  actionCode: string;
  taskCode: string;
  taskName: string;
  taskType: string;
  ownerType: string;
  estimatedDays: number;
  executionOrder: number;
  status: "nao_iniciado" | "em_andamento" | "em_revisao" | "concluido" | "cancelado";
  progressPercent: number;
};

export type TaskExecutionSummary = {
  totalTasks: number;
  nao_iniciado: number;
  em_andamento: number;
  em_revisao: number;
  concluido: number;
  cancelado: number;
  progressPercent: number;
};

// --- Exports ---

export type ExportResult = {
  filename: string;
  contentType: string;
  content: string;
};

// --- Dashboard raw from API ---

export type DashboardRaw = {
  fromCache: boolean;
  analysisVersion: number;
  confidenceScoreGlobal: number | null;
  overallScore: number;
  summary: {
    totalRequirements: number;
    totalGaps: number;
    criticalGaps: number;
    totalRisks: number;
    criticalRisks: number;
    totalActions: number;
    immediateActions: number;
  };
  radar: Record<string, number>;
  riskSummary: {
    total: number;
    critico: number;
    alto: number;
    medio: number;
    baixo: number;
  };
  actionSummary: {
    total: number;
    imediata: number;
    curto_prazo: number;
    medio_prazo: number;
    planejamento: number;
    concluido: number;
  };
  taskSummary: {
    total: number;
    concluido: number;
    em_andamento: number;
    nao_iniciado: number;
    progressPercent: number;
  };
  generatedAt: Date | string;
};

// --- Permissions ---

export type CompliancePermissions = {
  canEditAssessment: boolean;
  canViewDashboard: boolean;
  canUpdateActions: boolean;
  canUpdateTasks: boolean;
  canExport: boolean;
};

// --- Domain labels ---

export const DOMAIN_LABELS: Record<string, string> = {
  governanca_transicao: "Governança da Transição",
  sistemas_erp_dados: "Sistemas ERP e Dados",
  obrigacoes_acessorias: "Obrigações Acessórias",
  creditos_compensacoes: "Créditos e Compensações",
  contratos_comerciais: "Contratos Comerciais",
  precificacao_repasse: "Precificação e Repasse",
  operacoes_importacao: "Operações de Importação",
  regimes_especiais: "Regimes Especiais",
  folha_beneficios: "Folha e Benefícios",
  imunidades_isencoes: "Imunidades e Isenções",
  contencioso_riscos: "Contencioso e Riscos",
  setor_especifico: "Setor Específico",
};

export const CRITICALITY_COLORS: Record<string, string> = {
  critica: "text-red-600 bg-red-50",
  alta: "text-orange-600 bg-orange-50",
  media: "text-yellow-600 bg-yellow-50",
  baixa: "text-green-600 bg-green-50",
};

export const RISK_LEVEL_COLORS: Record<string, string> = {
  critico: "text-red-600 bg-red-50",
  alto: "text-orange-600 bg-orange-50",
  medio: "text-yellow-600 bg-yellow-50",
  baixo: "text-green-600 bg-green-50",
};

export const PRIORITY_COLORS: Record<string, string> = {
  imediata: "text-red-600 bg-red-50",
  curto_prazo: "text-orange-600 bg-orange-50",
  medio_prazo: "text-yellow-600 bg-yellow-50",
  planejamento: "text-blue-600 bg-blue-50",
};

export const STATUS_COLORS: Record<string, string> = {
  nao_iniciado: "text-gray-600 bg-gray-50",
  em_andamento: "text-blue-600 bg-blue-50",
  em_revisao: "text-yellow-600 bg-yellow-50",
  concluido: "text-green-600 bg-green-50",
  cancelado: "text-red-600 bg-red-50",
};
