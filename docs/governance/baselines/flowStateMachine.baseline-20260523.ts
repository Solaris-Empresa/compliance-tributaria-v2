import { TRPCError } from '@trpc/server';

/**
 * FLOW STATE MACHINE — v2.3
 * Máquina de estados para o fluxo de compliance tributário.
 * Gerencia transições válidas, bloqueios e persistência de etapas.
 *
 * FLUXO OBRIGATÓRIO:
 * 1. perfil_empresa       → status: rascunho
 * 2. consistencia         → status: consistencia_pendente
 * 3. descoberta_cnaes     → status: consistencia_pendente (gate: consistência aprovada)
 * 4. confirmacao_cnaes    → status: cnaes_confirmados
 * 5. diagnostico_corporativo → status: diagnostico_corporativo
 * 6. diagnostico_operacional → status: diagnostico_operacional
 * 7. diagnostico_cnae     → status: diagnostico_cnae
 * 8. briefing             → status: briefing
 * 9. riscos               → status: riscos
 * 10. plano               → status: plano
 * 11. dashboard           → status: dashboard
 */

export type FlowStep =
  | "perfil_empresa"
  | "consistencia"
  | "descoberta_cnaes"
  | "confirmacao_cnaes"
  | "diagnostico_corporativo"
  | "diagnostico_operacional"
  | "diagnostico_cnae"
  | "briefing"
  | "riscos"
  | "plano"
  | "dashboard";

export type ProjectStatus =
  | "rascunho"
  | "consistencia_pendente"
  | "cnaes_confirmados"
  // M2 PR-A — novo status (com prefixo perfil_) — controlado por feature flag m2-perfil-entidade-enabled
  | "perfil_entidade_confirmado"
  | "diagnostico_corporativo"
  | "diagnostico_operacional"
  // Z-02 TO-BE — ADR-0010 — Q.Produtos (NCM) e Q.Serviços (NBS)
  | "q_produto"
  | "q_servico"
  | "diagnostico_cnae"
  | "briefing"
  | "riscos"
  | "plano"
  | "dashboard"
  | "matriz_riscos"
  | "plano_acao"
  | "em_avaliacao"
  | "aprovado"
  | "em_andamento"
  | "concluido"
  | "arquivado";

export interface StepConfig {
  stepNumber: number;
  stepName: FlowStep;
  label: string;
  statusOnEnter: ProjectStatus;
  requiredFields?: string[];
  gates?: string[]; // condições que devem ser verdadeiras para avançar
}

// Mapa de configuração de cada etapa
export const FLOW_STEPS: StepConfig[] = [
  {
    stepNumber: 1,
    stepName: "perfil_empresa",
    label: "Perfil da Empresa",
    statusOnEnter: "rascunho",
    requiredFields: ["name", "description"],
  },
  {
    stepNumber: 2,
    stepName: "consistencia",
    label: "Análise de Consistência",
    statusOnEnter: "consistencia_pendente",
    gates: ["perfil_completo"],
  },
  {
    stepNumber: 3,
    stepName: "descoberta_cnaes",
    label: "Descoberta de CNAEs",
    statusOnEnter: "consistencia_pendente",
    gates: ["consistencia_aprovada_ou_risco_aceito"],
  },
  {
    stepNumber: 4,
    stepName: "confirmacao_cnaes",
    label: "Confirmação de CNAEs",
    statusOnEnter: "cnaes_confirmados",
    gates: ["cnaes_descobertos"],
  },
  {
    stepNumber: 5,
    stepName: "diagnostico_corporativo",
    label: "Diagnóstico Corporativo",
    statusOnEnter: "diagnostico_corporativo",
    gates: ["cnaes_confirmados"],
  },
  {
    stepNumber: 6,
    stepName: "diagnostico_operacional",
    label: "Diagnóstico Operacional",
    statusOnEnter: "diagnostico_operacional",
    gates: ["diagnostico_corporativo_completo"],
  },
  {
    stepNumber: 7,
    stepName: "diagnostico_cnae",
    label: "Diagnóstico CNAE",
    statusOnEnter: "diagnostico_cnae",
    gates: ["diagnostico_operacional_completo"],
  },
  {
    stepNumber: 8,
    stepName: "briefing",
    label: "Briefing",
    statusOnEnter: "briefing",
    gates: ["diagnostico_cnae_completo"],
  },
  {
    stepNumber: 9,
    stepName: "riscos",
    label: "Riscos",
    statusOnEnter: "riscos",
    gates: ["briefing_gerado"],
  },
  {
    stepNumber: 10,
    stepName: "plano",
    label: "Plano de Ação",
    statusOnEnter: "plano",
    gates: ["riscos_gerados"],
  },
  {
    stepNumber: 11,
    stepName: "dashboard",
    label: "Dashboard",
    statusOnEnter: "dashboard",
    gates: ["plano_gerado"],
  },
];

// Mapa rápido por nome
export const STEP_BY_NAME = new Map<FlowStep, StepConfig>(
  FLOW_STEPS.map((s) => [s.stepName, s])
);

// Mapa rápido por número
export const STEP_BY_NUMBER = new Map<number, StepConfig>(
  FLOW_STEPS.map((s) => [s.stepNumber, s])
);

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
  newStep?: number;
  newStepName?: FlowStep;
  newStatus?: ProjectStatus;
}

export interface ProjectStateSnapshot {
  id: number;
  currentStep: number;
  currentStepName: string | null;
  status: string;
  consistencyCheckStatus?: string | null;
  consistencyAcceptedRisk?: boolean | null;
  confirmedCnaes?: unknown;
  // ── Fluxo V1 ────────────────────────────────────────────────────────────
  corporateAnswers?: unknown;
  operationalAnswers?: unknown;
  cnaeAnswers?: unknown;
  /** Briefing gerado pelo Fluxo V1 (coluna briefingContent). @deprecated para V3 use briefingContentV3 */
  briefingContent?: string | null;
  /** Matrizes de risco do Fluxo V1 (coluna riskMatricesData). @deprecated para V3 use riskMatricesDataV3 */
  riskMatricesData?: unknown;
  /** Plano de ação do Fluxo V1 (coluna actionPlansData). @deprecated para V3 use actionPlansDataV3 */
  actionPlansData?: unknown;
  // ── Fluxo V3 ────────────────────────────────────────────────────────────
  questionnaireAnswersV3?: unknown;
  briefingContentV3?: string | null;
  riskMatricesDataV3?: unknown;
  actionPlansDataV3?: unknown;
  // ── Compartilhado ────────────────────────────────────────────────────────────
  /** Versão do fluxo detectada pelo adaptador getDiagnosticSource: 'v1' | 'v3' | 'hybrid' | 'none' */
  flowVersion?: string;
  diagnosticStatus?: unknown;
}

/**
 * Valida se uma transição de etapa é permitida.
 * Verifica gates baseados no estado atual do projeto.
 */
export function validateTransition(
  project: ProjectStateSnapshot,
  targetStepName: FlowStep
): TransitionResult {
  const targetConfig = STEP_BY_NAME.get(targetStepName);
  if (!targetConfig) {
    return { allowed: false, reason: `Etapa desconhecida: ${targetStepName}` };
  }

  const currentStepNumber = project.currentStep || 1;
  const targetStepNumber = targetConfig.stepNumber;

  // Permitir retroceder (para revisão) ou avançar apenas 1 etapa
  if (targetStepNumber > currentStepNumber + 1) {
    return {
      allowed: false,
      reason: `Não é possível pular etapas. Etapa atual: ${currentStepNumber}, etapa solicitada: ${targetStepNumber}`,
    };
  }

  // Verificar gates da etapa alvo
  if (targetConfig.gates) {
    for (const gate of targetConfig.gates) {
      const gateResult = checkGate(gate, project);
      if (!gateResult.passed) {
        return { allowed: false, reason: gateResult.reason };
      }
    }
  }

  return {
    allowed: true,
    newStep: targetStepNumber,
    newStepName: targetStepName,
    newStatus: targetConfig.statusOnEnter,
  };
}

interface GateResult {
  passed: boolean;
  reason?: string;
}

function checkGate(gate: string, project: ProjectStateSnapshot): GateResult {
  switch (gate) {
    case "perfil_completo":
      if (!project.id) return { passed: false, reason: "Projeto não encontrado" };
      return { passed: true };

    case "consistencia_aprovada_ou_risco_aceito": {
      const status = project.consistencyCheckStatus;
      const accepted = project.consistencyAcceptedRisk;
      if (status === "approved" || status === "low" || accepted === true) {
        return { passed: true };
      }
      if (status === "critical" && !accepted) {
        return {
          passed: false,
          reason: "Inconsistências críticas detectadas. Corrija os dados ou aceite o risco antes de prosseguir.",
        };
      }
      if (!status) {
        return {
          passed: false,
          reason: "Análise de consistência ainda não foi executada. Execute a análise antes de prosseguir.",
        };
      }
      return { passed: true };
    }

    case "cnaes_descobertos": {
      const cnaes = project.confirmedCnaes;
      if (!cnaes) {
        return { passed: false, reason: "CNAEs ainda não foram descobertos. Execute a descoberta de CNAEs primeiro." };
      }
      return { passed: true };
    }

    case "cnaes_confirmados": {
      const cnaes = project.confirmedCnaes;
      if (!cnaes) {
        return { passed: false, reason: "CNAEs não foram confirmados. Confirme os CNAEs antes de iniciar o diagnóstico." };
      }
      const cnaeArray = Array.isArray(cnaes) ? cnaes : [];
      if (cnaeArray.length === 0) {
        return { passed: false, reason: "Nenhum CNAE confirmado. Confirme pelo menos 1 CNAE antes de prosseguir." };
      }
      return { passed: true };
    }

    case "diagnostico_corporativo_completo": {
      if (!project.corporateAnswers) {
        return { passed: false, reason: "Diagnóstico corporativo não foi completado." };
      }
      return { passed: true };
    }

    case "diagnostico_operacional_completo": {
      if (!project.operationalAnswers) {
        return { passed: false, reason: "Diagnóstico operacional não foi completado." };
      }
      return { passed: true };
    }

    case "diagnostico_cnae_completo": {
      if (!project.cnaeAnswers) {
        return { passed: false, reason: "Diagnóstico CNAE não foi completado." };
      }
      return { passed: true };
    }

    case "briefing_gerado": {
      // V3: verifica briefingContentV3; V1 (ou sem flowVersion): verifica briefingContent
      const isV3 = project.flowVersion === "v3" || project.flowVersion === "hybrid";
      const hasBriefing = isV3 ? !!project.briefingContentV3 : !!project.briefingContent;
      if (!hasBriefing) {
        return { passed: false, reason: "Briefing ainda não foi gerado." };
      }
      return { passed: true };
    }

    case "riscos_gerados": {
      // V3: verifica riskMatricesDataV3; V1 (ou sem flowVersion): verifica riskMatricesData
      const isV3 = project.flowVersion === "v3" || project.flowVersion === "hybrid";
      const hasRisks = isV3 ? !!project.riskMatricesDataV3 : !!project.riskMatricesData;
      if (!hasRisks) {
        return { passed: false, reason: "Matrizes de risco ainda não foram geradas." };
      }
      return { passed: true };
    }

    case "plano_gerado": {
      // V3: verifica actionPlansDataV3; V1 (ou sem flowVersion): verifica actionPlansData
      const isV3 = project.flowVersion === "v3" || project.flowVersion === "hybrid";
      const hasPlan = isV3 ? !!project.actionPlansDataV3 : !!project.actionPlansData;
      if (!hasPlan) {
        return { passed: false, reason: "Plano de ação ainda não foi gerado." };
      }
      return { passed: true };
    }

    default:
      return { passed: true }; // gate desconhecido: permitir por padrão
  }
}

/**
 * Determina o ponto de retomada para um projeto.
 * Retorna a etapa atual e os dados necessários para continuar.
 */
export function getResumePoint(project: ProjectStateSnapshot): {
  step: number;
  stepName: FlowStep;
  label: string;
  canResume: boolean;
  resumeData: Record<string, unknown>;
} {
  const currentStep = project.currentStep || 1;
  const config = STEP_BY_NUMBER.get(currentStep) || FLOW_STEPS[0];

  return {
    step: currentStep,
    stepName: config.stepName,
    label: config.label,
    canResume: true,
    resumeData: {
      hasConsistencyCheck: !!project.consistencyCheckStatus,
      consistencyStatus: project.consistencyCheckStatus,
      hasCnaes: !!(project.confirmedCnaes && Array.isArray(project.confirmedCnaes) && (project.confirmedCnaes as unknown[]).length > 0),
      cnaeCount: Array.isArray(project.confirmedCnaes) ? (project.confirmedCnaes as unknown[]).length : 0,
      hasCorporateAnswers: !!project.corporateAnswers,
      hasOperationalAnswers: !!project.operationalAnswers,
      hasCnaeAnswers: !!project.cnaeAnswers,
      // Briefing: V3 usa briefingContentV3, V1 usa briefingContent
      hasBriefing: project.flowVersion === "v3" || project.flowVersion === "hybrid"
        ? !!project.briefingContentV3
        : !!project.briefingContent,
      // Riscos: V3 usa riskMatricesDataV3, V1 usa riskMatricesData
      hasRisks: project.flowVersion === "v3" || project.flowVersion === "hybrid"
        ? !!project.riskMatricesDataV3
        : !!project.riskMatricesData,
      // Plano: V3 usa actionPlansDataV3, V1 usa actionPlansData
      hasPlan: project.flowVersion === "v3" || project.flowVersion === "hybrid"
        ? !!project.actionPlansDataV3
        : !!project.actionPlansData,
      // Metadados do adaptador
      flowVersion: project.flowVersion || "v1",
    },
  };
}

/**
 * Cria uma entrada de histórico de transição.
 */
export function createHistoryEntry(
  stepNumber: number,
  stepName: FlowStep,
  userId?: number
): { step: number; stepName: string; timestamp: string; userId?: number } {
  return {
    step: stepNumber,
    stepName,
    timestamp: new Date().toISOString(),
    userId,
  };
}

// ─── Sprint K — K-4-A: VALID_TRANSITIONS e assertValidTransition ──────────────
// Seção 10 do contrato FLUXO-3-ONDAS-AS-IS-TO-BE v1.1 (PR #174, mergeado)
// Regras:
//   - Transições são unidirecionais no avanço
//   - Retrocesso é permitido com modal de confirmação
//   - Retrocesso sempre limpa dados das etapas posteriores
//   - Nenhuma transição é permitida sem enforcement no backend
//   - O frontend NUNCA transita o status diretamente

/**
 * Mapa canônico de transições válidas.
 * Cada chave é o status atual; o valor é a lista de status para os quais
 * o projeto pode transitar (avanço OU retrocesso).
 *
 * Inclui os novos status onda1_solaris e onda2_iagen (K-4-A).
 */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  'rascunho':                  ['consistencia_pendente'],  // rascunho → consistência (não pula para Onda 1)
  'onda1_solaris':             ['onda2_iagen', 'rascunho'],
  'onda2_iagen':               ['diagnostico_corporativo', 'q_produto'],  // K-4-C: sem retrocesso para Onda 1 | Z-02: TO-BE adiciona q_produto
  // Z-02 TO-BE — ADR-0010 — Q.Produtos (NCM) e Q.Serviços (NBS)
  // Estratégia ADITIVA: diagnostico_corporativo/operacional preservados para projetos legados
  'q_produto':                 ['q_servico', 'diagnostico_cnae', 'onda2_iagen'],  // produto/comercio → cnae; demais → q_servico
  'q_servico':                 ['diagnostico_cnae', 'q_produto'],                 // sempre → diagnostico_cnae
  'diagnostico_corporativo':   ['diagnostico_operacional', 'onda2_iagen'],
  'diagnostico_operacional':   ['diagnostico_cnae', 'diagnostico_corporativo'],
  'diagnostico_cnae':          ['briefing', 'diagnostico_operacional', 'q_servico', 'q_produto'],  // Z-02: retrocesso para q_produto/q_servico
  'briefing':                  ['matriz_riscos', 'diagnostico_cnae'],
  'matriz_riscos':             ['plano_acao', 'briefing'],  // BUG-UAT-08 fix: fluxo 3 passos — plano_acao é Etapa 8 obrigatória (não pular para aprovado)
  'aprovado':                  ['matriz_riscos'],
  // Status legados — mantidos para compatibilidade com projetos existentes
  'consistencia_pendente':     ['cnaes_confirmados', 'rascunho'],
  // M2 PR-A — dual-path: legado (onda1_solaris) preservado para flag=false; novo path para flag=true
  // (Manus Nota #1 — não remover transição legada para evitar quebra de fluxo cliente atual)
  'cnaes_confirmados':         ['onda1_solaris', 'perfil_entidade_confirmado', 'consistencia_pendente'],
  'perfil_entidade_confirmado': ['onda1_solaris'],
  'assessment_fase1':          ['assessment_fase2', 'cnaes_confirmados'],
  'assessment_fase2':          ['onda1_solaris', 'assessment_fase1'],  // legado: também passa por Onda 1
  'riscos':                    ['plano', 'briefing'],
  'plano':                     ['dashboard', 'riscos'],
  'dashboard':                 ['plano'],
  'plano_acao':                ['aprovado', 'matriz_riscos'],
  'em_avaliacao':              ['aprovado', 'plano_acao'],
  'em_andamento':              ['concluido', 'aprovado'],
  'concluido':                 ['arquivado'],
  'arquivado':                 [],
};

/**
 * Valida se a transição de `from` para `to` é permitida.
 * Lança TRPCError com code FORBIDDEN se a transição for inválida.
 *
 * Uso: chamar antes de qualquer UPDATE no campo `status` de um projeto.
 *
 * @param from - Status atual do projeto
 * @param to   - Status desejado após a transição
 * @throws TRPCError({ code: 'FORBIDDEN' }) se a transição não for permitida
 */
export function assertValidTransition(from: string, to: string): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `[flowStateMachine] Status de origem desconhecido: "${from}". ` +
               `Adicione-o a VALID_TRANSITIONS antes de usar.`
    });
  }
  if (!allowed.includes(to)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `[flowStateMachine] Transição inválida: "${from}" → "${to}". ` +
               `Transições permitidas a partir de "${from}": ` +
               `[${VALID_TRANSITIONS[from]?.join(', ') ?? 'nenhuma'}]`
    });
  }
}

// ─── Z-02 TO-BE — ADR-0010 — Funções de roteamento Q.Produtos e Q.Serviços ──

/**
 * Determina o próximo estado após o Q.Produtos (NCM) com base no operationType.
 *
 * DIV-Z02-003 aplicada: usa valores em PORTUGUÊS ('produto', 'servico', 'comercio', 'misto').
 * O valor 'product' (inglês) é tratado como fallback → 'q_servico' para evitar bug silencioso.
 *
 * Tabela de verdade (CONTRATO-DEC-M3-05-v3-interface Parte 3):
 *   'produto'  → 'diagnostico_cnae'  (empresa de produto puro — Q.Serviços não aplicável)
 *   'comercio' → 'diagnostico_cnae'  (comércio — Q.Serviços não aplicável)
 *   'servico'  → 'q_servico'         (empresa de serviço — precisa responder Q.Serviços)
 *   'misto'    → 'q_servico'         (empresa mista — precisa responder Q.Serviços)
 *   demais     → 'q_servico'         (fallback seguro — inclui 'product' inglês)
 *
 * @param operationType - Tipo de operação da empresa (campo operationProfile.operationType)
 * @returns 'diagnostico_cnae' ou 'q_servico'
 */
export function getNextStateAfterProductQ(operationType: string | undefined | null): 'diagnostico_cnae' | 'q_servico' {
  const type = (operationType ?? '').toLowerCase().trim();
  if (type === 'produto' || type === 'comercio') {
    return 'diagnostico_cnae';
  }
  // 'servico', 'misto', '' (vazio), 'product' (inglês — fallback), ou qualquer outro
  return 'q_servico';
}

/**
 * Determina o próximo estado após o Q.Serviços (NBS).
 * Sempre retorna 'diagnostico_cnae' — Q.Serviços é sempre o último questionário.
 *
 * @returns 'diagnostico_cnae'
 */
export function getNextStateAfterServiceQ(): 'diagnostico_cnae' {
  return 'diagnostico_cnae';
}

/**
 * Verifica se o projeto está em um estado TO-BE (Q.Produtos ou Q.Serviços).
 * Usado pelo DiagnosticoStepper para renderizar o componente correto.
 *
 * @param status - Status atual do projeto
 * @returns true se o projeto está no fluxo TO-BE
 */
export function isToBeFlowState(status: string): boolean {
  return status === 'q_produto' || status === 'q_servico';
}
