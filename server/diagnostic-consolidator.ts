/**
 * IA SOLARIS — Diagnostic Consolidator v2.1
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptador que agrega as respostas das 3 camadas de diagnóstico em um payload
 * consolidado compatível com generateBriefing, generateRiskMatrices e generateActionPlan.
 *
 * Fonte          | Papel
 * ───────────────|──────────────────────────────────────────────────────────────
 * corporateAnswers   | Base da empresa (regime, porte, tipo jurídico, governança)
 * operationalAnswers | Execução real (operação, clientes, multiestado, marketplace)
 * cnaeAnswers        | Refinamento setorial (CNAEs confirmados + perguntas por CNAE)
 *
 * Output: aggregatedDiagnosticAnswers — payload no formato allAnswers[] que o
 * generateBriefing já aceita, sem nenhuma alteração naquele módulo.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type DiagnosticLayerStatus = "not_started" | "in_progress" | "completed";

export interface DiagnosticStatus {
  corporate: DiagnosticLayerStatus;
  operational: DiagnosticLayerStatus;
  cnae: DiagnosticLayerStatus;
}

export interface DiagnosticAnswer {
  question: string;
  answer: string;
}

export interface DiagnosticLayer {
  cnaeCode: string;
  cnaeDescription: string;
  level: string;
  questions: DiagnosticAnswer[];
}

export interface CorporateAnswers {
  companyType?: string;
  companySize?: string;
  taxRegime?: string;
  annualRevenueRange?: string;
  stateUF?: string;
  employeeCount?: string;
  foundingYear?: number;
  hasTaxTeam?: boolean;
  hasAudit?: boolean;
  hasTaxIssues?: boolean;
  hasInternationalOps?: boolean;
  usesTaxIncentives?: boolean;
  hasSpecialRegimes?: boolean;
  hasImportExport?: boolean;
}

export interface OperationalAnswers {
  operationType?: string;
  clientType?: string[];
  multiState?: boolean;
  geographicScope?: string;
  usesMarketplace?: boolean;
  hasMultipleEstablishments?: boolean;
  paymentMethods?: string[];
  hasIntermediaries?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPEADORES DE RÓTULOS
// ─────────────────────────────────────────────────────────────────────────────

const COMPANY_TYPE_LABELS: Record<string, string> = {
  ltda: "Sociedade Limitada (LTDA)",
  sa: "Sociedade Anônima (S.A.)",
  mei: "Microempreendedor Individual (MEI)",
  eireli: "Empresa Individual de Responsabilidade Limitada (EIRELI)",
  scp: "Sociedade em Conta de Participação (SCP)",
  cooperativa: "Cooperativa",
  outro: "Outro tipo societário",
};

const COMPANY_SIZE_LABELS: Record<string, string> = {
  mei: "MEI",
  micro: "Microempresa",
  pequena: "Pequena Empresa",
  media: "Média Empresa",
  grande: "Grande Empresa",
};

const TAX_REGIME_LABELS: Record<string, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

const REVENUE_LABELS: Record<string, string> = {
  ate_360k: "Até R$ 360 mil/ano",
  "360k_4_8m": "De R$ 360 mil a R$ 4,8 milhões/ano",
  "4_8m_78m": "De R$ 4,8 milhões a R$ 78 milhões/ano",
  acima_78m: "Acima de R$ 78 milhões/ano",
};

const OPERATION_TYPE_LABELS: Record<string, string> = {
  produto: "Venda de Produtos",
  servico: "Prestação de Serviços",
  misto: "Misto (Produtos e Serviços)",
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUTOR DO PAYLOAD CORPORATIVO
// ─────────────────────────────────────────────────────────────────────────────

function buildCorporateLayer(corporate: CorporateAnswers): DiagnosticLayer {
  const questions: DiagnosticAnswer[] = [];

  if (corporate.companyType) {
    questions.push({
      question: "Qual é o tipo jurídico da empresa?",
      answer: COMPANY_TYPE_LABELS[corporate.companyType] ?? corporate.companyType,
    });
  }

  if (corporate.companySize) {
    questions.push({
      question: "Qual é o porte da empresa?",
      answer: COMPANY_SIZE_LABELS[corporate.companySize] ?? corporate.companySize,
    });
  }

  if (corporate.taxRegime) {
    questions.push({
      question: "Qual é o regime tributário atual?",
      answer: TAX_REGIME_LABELS[corporate.taxRegime] ?? corporate.taxRegime,
    });
  }

  if (corporate.annualRevenueRange) {
    questions.push({
      question: "Qual é a faixa de faturamento anual?",
      answer: REVENUE_LABELS[corporate.annualRevenueRange] ?? corporate.annualRevenueRange,
    });
  }

  if (corporate.stateUF) {
    questions.push({
      question: "Em qual estado (UF) a empresa está sediada?",
      answer: corporate.stateUF,
    });
  }

  if (corporate.employeeCount) {
    questions.push({
      question: "Qual é o número aproximado de funcionários?",
      answer: corporate.employeeCount,
    });
  }

  if (corporate.foundingYear) {
    questions.push({
      question: "Qual é o ano de fundação da empresa?",
      answer: String(corporate.foundingYear),
    });
  }

  if (corporate.hasTaxTeam !== undefined) {
    questions.push({
      question: "A empresa possui equipe interna de tributos/fiscal?",
      answer: corporate.hasTaxTeam ? "Sim" : "Não",
    });
  }

  if (corporate.hasAudit !== undefined) {
    questions.push({
      question: "A empresa realiza auditoria fiscal periódica?",
      answer: corporate.hasAudit ? "Sim" : "Não",
    });
  }

  if (corporate.hasTaxIssues !== undefined) {
    questions.push({
      question: "A empresa possui pendências ou contenciosos tributários?",
      answer: corporate.hasTaxIssues ? "Sim" : "Não",
    });
  }

  if (corporate.hasInternationalOps !== undefined) {
    questions.push({
      question: "A empresa realiza operações internacionais (importação/exportação)?",
      answer: corporate.hasInternationalOps ? "Sim" : "Não",
    });
  }

  if (corporate.usesTaxIncentives !== undefined) {
    questions.push({
      question: "A empresa utiliza incentivos fiscais ou regimes especiais?",
      answer: corporate.usesTaxIncentives ? "Sim" : "Não",
    });
  }

  if (corporate.hasImportExport !== undefined) {
    questions.push({
      question: "A empresa realiza importação ou exportação de produtos/serviços?",
      answer: corporate.hasImportExport ? "Sim" : "Não",
    });
  }

  return {
    cnaeCode: "CORPORATIVO",
    cnaeDescription: "Diagnóstico Corporativo — Perfil da Empresa",
    level: "diagnostico_corporativo",
    questions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUTOR DO PAYLOAD OPERACIONAL
// ─────────────────────────────────────────────────────────────────────────────

function buildOperationalLayer(operational: OperationalAnswers): DiagnosticLayer {
  const questions: DiagnosticAnswer[] = [];

  if (operational.operationType) {
    questions.push({
      question: "Qual é o tipo de operação principal da empresa?",
      answer: OPERATION_TYPE_LABELS[operational.operationType] ?? operational.operationType,
    });
  }

  if (operational.clientType && operational.clientType.length > 0) {
    questions.push({
      question: "Quais são os tipos de clientes atendidos?",
      answer: operational.clientType.join(", "),
    });
  }

  if (operational.multiState !== undefined) {
    questions.push({
      question: "A empresa opera em múltiplos estados?",
      answer: operational.multiState ? "Sim" : "Não",
    });
  }

  if (operational.geographicScope) {
    questions.push({
      question: "Qual é o escopo geográfico das operações?",
      answer: operational.geographicScope,
    });
  }

  if (operational.usesMarketplace !== undefined) {
    questions.push({
      question: "A empresa utiliza marketplace para vendas?",
      answer: operational.usesMarketplace ? "Sim" : "Não",
    });
  }

  if (operational.hasMultipleEstablishments !== undefined) {
    questions.push({
      question: "A empresa possui múltiplos estabelecimentos?",
      answer: operational.hasMultipleEstablishments ? "Sim" : "Não",
    });
  }

  if (operational.paymentMethods && operational.paymentMethods.length > 0) {
    questions.push({
      question: "Quais são os métodos de pagamento utilizados?",
      answer: operational.paymentMethods.join(", "),
    });
  }

  if (operational.hasIntermediaries !== undefined) {
    questions.push({
      question: "A empresa utiliza intermediários financeiros ou de pagamento?",
      answer: operational.hasIntermediaries ? "Sim" : "Não",
    });
  }

  return {
    cnaeCode: "OPERACIONAL",
    cnaeDescription: "Diagnóstico Operacional — Perfil de Operação",
    level: "diagnostico_operacional",
    questions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSOLIDADOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consolida as 3 camadas de diagnóstico em um payload aggregatedDiagnosticAnswers
 * compatível com o generateBriefing (formato allAnswers[]).
 *
 * @param companyProfile  — dados do Company Profile (obrigatório)
 * @param operationProfile — dados do Operation Profile (obrigatório)
 * @param taxComplexity   — dados de complexidade tributária (opcional)
 * @param financialProfile — dados financeiros (opcional)
 * @param governanceProfile — dados de governança (opcional)
 * @param cnaeAnswers     — respostas do questionário CNAE (formato allAnswers[])
 * @returns aggregatedDiagnosticAnswers — payload consolidado para generateBriefing
 */
export function consolidateDiagnosticLayers(params: {
  companyProfile: any;
  operationProfile: any;
  taxComplexity?: any;
  financialProfile?: any;
  governanceProfile?: any;
  cnaeAnswers?: DiagnosticLayer[];
}): DiagnosticLayer[] {
  const { companyProfile, operationProfile, taxComplexity, financialProfile, governanceProfile, cnaeAnswers } = params;

  const layers: DiagnosticLayer[] = [];

  // ── Camada 1: Corporativo ──────────────────────────────────────────────────
  if (companyProfile) {
    const corporate: CorporateAnswers = {
      companyType: companyProfile.companyType,
      companySize: companyProfile.companySize,
      taxRegime: companyProfile.taxRegime,
      annualRevenueRange: companyProfile.annualRevenueRange,
      stateUF: companyProfile.stateUF,
      employeeCount: companyProfile.employeeCount,
      foundingYear: companyProfile.foundingYear,
      // Governança
      hasTaxTeam: governanceProfile?.hasTaxTeam,
      hasAudit: governanceProfile?.hasAudit,
      hasTaxIssues: governanceProfile?.hasTaxIssues,
      // Complexidade tributária
      hasInternationalOps: taxComplexity?.hasInternationalOps,
      usesTaxIncentives: taxComplexity?.usesTaxIncentives,
      hasImportExport: taxComplexity?.hasImportExport,
    };
    layers.push(buildCorporateLayer(corporate));
  }

  // ── Camada 2: Operacional ──────────────────────────────────────────────────
  if (operationProfile) {
    const operational: OperationalAnswers = {
      operationType: operationProfile.operationType,
      clientType: operationProfile.clientType,
      multiState: operationProfile.multiState,
      geographicScope: operationProfile.geographicScope,
      // Complexidade tributária
      usesMarketplace: taxComplexity?.usesMarketplace,
      hasMultipleEstablishments: taxComplexity?.hasMultipleEstablishments,
      // Financeiro
      paymentMethods: financialProfile?.paymentMethods,
      hasIntermediaries: financialProfile?.hasIntermediaries,
    };
    layers.push(buildOperationalLayer(operational));
  }

  // ── Camada 3: CNAE ─────────────────────────────────────────────────────────
  if (cnaeAnswers && cnaeAnswers.length > 0) {
    layers.push(...cnaeAnswers);
  }

  return layers;
}

/**
 * Verifica se todas as 3 camadas estão concluídas para liberar o generateBriefing.
 */
export function isDiagnosticComplete(diagnosticStatus: DiagnosticStatus): boolean {
  return (
    diagnosticStatus.corporate === "completed" &&
    diagnosticStatus.operational === "completed" &&
    diagnosticStatus.cnae === "completed"
  );
}

/**
 * Retorna a próxima camada disponível para preenchimento.
 */
export function getNextDiagnosticLayer(diagnosticStatus: DiagnosticStatus): "corporate" | "operational" | "cnae" | null {
  if (diagnosticStatus.corporate !== "completed") return "corporate";
  if (diagnosticStatus.operational !== "completed") return "operational";
  if (diagnosticStatus.cnae !== "completed") return "cnae";
  return null; // Todas concluídas
}

/**
 * Calcula o progresso percentual do diagnóstico (0–100).
 */
export function getDiagnosticProgress(diagnosticStatus: DiagnosticStatus): number {
  const weights = { corporate: 33, operational: 33, cnae: 34 };
  let progress = 0;
  if (diagnosticStatus.corporate === "completed") progress += weights.corporate;
  else if (diagnosticStatus.corporate === "in_progress") progress += Math.round(weights.corporate / 2);
  if (diagnosticStatus.operational === "completed") progress += weights.operational;
  else if (diagnosticStatus.operational === "in_progress") progress += Math.round(weights.operational / 2);
  if (diagnosticStatus.cnae === "completed") progress += weights.cnae;
  else if (diagnosticStatus.cnae === "in_progress") progress += Math.round(weights.cnae / 2);
  return Math.min(100, progress);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADR-0011 — Resolução de respostas com fallback V3+/V1-V2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve as respostas de produto e serviço de um projeto,
 * priorizando as colunas TO-BE (productAnswers/serviceAnswers) da Z-02
 * e fazendo fallback para as colunas legadas (corporateAnswers/operationalAnswers).
 *
 * Projetos V3+ → productAnswers / serviceAnswers
 * Projetos V1/V2 → corporateAnswers / operationalAnswers
 */
export function resolveProjectAnswers(project: Record<string, any>): {
  productAnswers: any | null;
  serviceAnswers: any | null;
} {
  const parseIfString = (v: any) => {
    if (!v) return null;
    if (typeof v === "string") {
      try { return JSON.parse(v); } catch { return null; }
    }
    return v;
  };

  // Prioridade 1: colunas TO-BE (Z-02)
  const rawProduct = project.productAnswers ?? project.product_answers ?? null;
  const rawService = project.serviceAnswers ?? project.service_answers ?? null;

  // Fallback: colunas legadas V1/V2
  const rawCorporate = project.corporateAnswers ?? project.corporate_answers ?? null;
  const rawOperational = project.operationalAnswers ?? project.operational_answers ?? null;

  return {
    productAnswers: parseIfString(rawProduct) ?? parseIfString(rawCorporate),
    serviceAnswers: parseIfString(rawService) ?? parseIfString(rawOperational),
  };
}

/**
 * Constrói camadas DiagnosticLayer a partir das respostas de produto/serviço
 * resolvidas por resolveProjectAnswers. Compatível com TrackedAnswer[].
 */
export function buildProductServiceLayers(
  productAnswers: any | null,
  serviceAnswers: any | null
): DiagnosticLayer[] {
  const layers: DiagnosticLayer[] = [];

  // fix(briefing 2026-04-20): aceita pergunta_texto (novo formato Z-02 pós-fix)
  // e encoda NCM/NBS no prefixo da pergunta para alimentar o prompt do LLM.
  const prefixWithCode = (text: string, code?: string): string => {
    const t = (text ?? "").trim();
    if (!code) return t;
    return `[${code}] ${t}`;
  };

  const toQuestions = (answers: any, codeField: "ncm_code" | "nbs_code"): DiagnosticAnswer[] => {
    if (!answers) return [];
    // TrackedAnswer[] — formato Z-02
    if (Array.isArray(answers)) {
      return answers
        .filter((a: any) => a && (a.pergunta_texto || a.pergunta || a.question) && (a.resposta || a.answer))
        .map((a: any) => ({
          question: prefixWithCode(a.pergunta_texto ?? a.pergunta ?? a.question ?? "", a[codeField]),
          answer: String(a.resposta ?? a.answer ?? ""),
        }));
    }
    // Objeto com campo 'perguntas' (formato Z-01 legado)
    if (answers.perguntas && Array.isArray(answers.perguntas)) {
      return answers.perguntas
        .filter((a: any) => a && (a.pergunta_texto || a.pergunta || a.question))
        .map((a: any) => ({
          question: prefixWithCode(a.pergunta_texto ?? a.pergunta ?? a.question ?? "", a[codeField]),
          answer: String(a.resposta ?? a.answer ?? "Não respondido"),
        }));
    }
    return [];
  };

  const productQs = toQuestions(productAnswers, "ncm_code");
  if (productQs.length > 0) {
    layers.push({
      cnaeCode: "NCM_PRODUTO",
      cnaeDescription: "Questionário de Produtos — NCM e Imposto Seletivo",
      level: "q_produto",
      questions: productQs,
    });
  }

  const serviceQs = toQuestions(serviceAnswers, "nbs_code");
  if (serviceQs.length > 0) {
    layers.push({
      cnaeCode: "NBS_SERVICO",
      cnaeDescription: "Questionário de Serviços — NBS e Regime Diferenciado",
      level: "q_servico",
      questions: serviceQs,
    });
  }

  return layers;
}
