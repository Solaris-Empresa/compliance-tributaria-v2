/**
 * Consistency Engine — v2.2
 * Analisa a consistência do perfil da empresa antes do diagnóstico.
 * Combina regras determinísticas + análise IA (OpenAI).
 *
 * Princípio: inconsistência ≠ erro → é um sinal de risco que precisa ser
 * reconhecido explicitamente pelo usuário antes de avançar.
 */

import { invokeLLM, type Message } from "./_core/llm";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ConsistencyLevel = "none" | "low" | "medium" | "high" | "critical";

export interface ConsistencyFinding {
  id: string;
  level: ConsistencyLevel;
  category: "revenue_size" | "tax_regime" | "employee_size" | "cnae_sector" | "operations" | "governance" | "ai_detected";
  title: string;
  description: string;
  field?: string;
  expectedValue?: string;
  actualValue?: string;
  recommendation?: string;
  source: "deterministic" | "ai";
}

export interface CompanyProfileInput {
  cnpj?: string;
  companyType?: string;
  companySize?: "mei" | "micro" | "pequena" | "media" | "grande";
  taxRegime?: "simples_nacional" | "lucro_presumido" | "lucro_real";
  annualRevenueRange?: string; // ex: "0-360000", "360000-4800000", "4800000-78000000", "78000000+"
}

export interface OperationProfileInput {
  operationType?: string;
  clientType?: string[];
  multiState?: boolean;
}

export interface TaxComplexityInput {
  hasInternationalOps?: boolean;
  usesTaxIncentives?: boolean;
  usesMarketplace?: boolean;
}

export interface FinancialProfileInput {
  paymentMethods?: string[];
  hasIntermediaries?: boolean;
}

export interface GovernanceProfileInput {
  hasTaxTeam?: boolean;
  hasAudit?: boolean;
  hasTaxIssues?: boolean;
}

export interface ConsistencyInput {
  companyProfile?: CompanyProfileInput;
  operationProfile?: OperationProfileInput;
  taxComplexity?: TaxComplexityInput;
  financialProfile?: FinancialProfileInput;
  governanceProfile?: GovernanceProfileInput;
  confirmedCnaes?: Array<{ code: string; description: string }>;
  description?: string;
}

export interface ConsistencyResult {
  overallLevel: ConsistencyLevel;
  findings: ConsistencyFinding[];
  deterministicScore: number;
  aiScore: number;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  canProceed: boolean; // false se critical sem acceptedRisk
}

// ─── Limites por porte e regime ───────────────────────────────────────────────

const REVENUE_LIMITS: Record<string, { min: number; max: number }> = {
  "0-360000": { min: 0, max: 360_000 },
  "360000-4800000": { min: 360_001, max: 4_800_000 },
  "4800000-78000000": { min: 4_800_001, max: 78_000_000 },
  "78000000+": { min: 78_000_001, max: Infinity },
};

const REGIME_REVENUE_RULES: Record<string, { maxRevenue: number; label: string }> = {
  simples_nacional: { maxRevenue: 4_800_000, label: "R$ 4,8 milhões" },
  lucro_presumido: { maxRevenue: 78_000_000, label: "R$ 78 milhões" },
  lucro_real: { maxRevenue: Infinity, label: "ilimitado" },
};

const SIZE_REVENUE_RULES: Record<string, { maxRevenue: number; label: string }> = {
  mei: { maxRevenue: 81_000, label: "R$ 81 mil" },
  micro: { maxRevenue: 360_000, label: "R$ 360 mil" },
  pequena: { maxRevenue: 4_800_000, label: "R$ 4,8 milhões" },
  media: { maxRevenue: 300_000_000, label: "R$ 300 milhões" },
  grande: { maxRevenue: Infinity, label: "ilimitado" },
};

// ─── Regras determinísticas ───────────────────────────────────────────────────

export function runDeterministicChecks(input: ConsistencyInput): ConsistencyFinding[] {
  const findings: ConsistencyFinding[] = [];
  const cp = input.companyProfile;
  if (!cp) return findings;

  const revenueRange = cp.annualRevenueRange;
  const revenueMin = revenueRange ? REVENUE_LIMITS[revenueRange]?.min ?? 0 : 0;
  const revenueMax = revenueRange ? REVENUE_LIMITS[revenueRange]?.max ?? Infinity : Infinity;
  const revenueMid = revenueRange ? (revenueMin + Math.min(revenueMax, revenueMin * 10)) / 2 : 0;

  // Regra 1: Regime tributário vs. faturamento
  if (cp.taxRegime && revenueRange) {
    const rule = REGIME_REVENUE_RULES[cp.taxRegime];
    if (rule && revenueMin > rule.maxRevenue) {
      findings.push({
        id: "DET-001",
        level: "critical",
        category: "tax_regime",
        title: "Regime tributário incompatível com faturamento",
        description: `O regime ${cp.taxRegime.replace("_", " ")} tem limite de ${rule.label}, mas o faturamento declarado (${revenueRange}) excede esse limite.`,
        field: "taxRegime",
        expectedValue: "lucro_real ou lucro_presumido",
        actualValue: cp.taxRegime,
        recommendation: "Verifique o regime tributário correto com seu contador.",
        source: "deterministic",
      });
    }
  }

  // Regra 2: Porte vs. faturamento
  if (cp.companySize && revenueRange) {
    const rule = SIZE_REVENUE_RULES[cp.companySize];
    if (rule && revenueMin > rule.maxRevenue) {
      findings.push({
        id: "DET-002",
        level: "high",
        category: "revenue_size",
        title: "Porte da empresa inconsistente com faturamento",
        description: `Empresas de porte "${cp.companySize}" têm faturamento máximo de ${rule.label}, mas o faturamento declarado excede esse valor.`,
        field: "companySize",
        expectedValue: "media ou grande",
        actualValue: cp.companySize,
        recommendation: "Revise o porte declarado da empresa.",
        source: "deterministic",
      });
    }
  }

  // Regra 3: MEI com operações complexas
  if (cp.companySize === "mei") {
    if (input.operationProfile?.multiState) {
      findings.push({
        id: "DET-003",
        level: "high",
        category: "operations",
        title: "MEI com operações multi-estado",
        description: "Microempreendedor Individual (MEI) não pode operar em múltiplos estados como estabelecimento fixo.",
        field: "multiState",
        expectedValue: "false",
        actualValue: "true",
        recommendation: "Verifique se a empresa é realmente MEI ou se precisa de outro enquadramento.",
        source: "deterministic",
      });
    }
    if (input.taxComplexity?.hasInternationalOps) {
      findings.push({
        id: "DET-004",
        level: "critical",
        category: "operations",
        title: "MEI com operações internacionais",
        description: "MEI não pode realizar operações de importação/exportação diretamente.",
        field: "hasInternationalOps",
        expectedValue: "false",
        actualValue: "true",
        recommendation: "MEI com operações internacionais precisa migrar para outro regime.",
        source: "deterministic",
      });
    }
  }

  // Regra 4: Simples Nacional com operações internacionais
  if (cp.taxRegime === "simples_nacional" && input.taxComplexity?.hasInternationalOps) {
    findings.push({
      id: "DET-005",
      level: "medium",
      category: "tax_regime",
      title: "Simples Nacional com operações internacionais",
      description: "Empresas do Simples Nacional com operações internacionais frequentes podem ter restrições e obrigações acessórias adicionais.",
      recommendation: "Avalie se o Simples Nacional é o regime mais adequado para operações internacionais.",
      source: "deterministic",
    });
  }

  // Regra 5: Grande empresa sem equipe tributária
  if (
    (cp.companySize === "grande" || cp.companySize === "media") &&
    input.governanceProfile?.hasTaxTeam === false
  ) {
    findings.push({
      id: "DET-006",
      level: "high",
      category: "governance",
      title: "Empresa de médio/grande porte sem equipe tributária",
      description: "Empresas de médio e grande porte geralmente necessitam de equipe tributária dedicada para gestão de compliance.",
      recommendation: "Considere estruturar uma equipe ou contratar assessoria tributária especializada.",
      source: "deterministic",
    });
  }

  // Regra 6: Empresa com problemas tributários sem auditoria
  if (input.governanceProfile?.hasTaxIssues && !input.governanceProfile?.hasAudit) {
    findings.push({
      id: "DET-007",
      level: "high",
      category: "governance",
      title: "Pendências tributárias sem auditoria interna",
      description: "A empresa declarou ter pendências ou problemas tributários, mas não possui auditoria interna.",
      recommendation: "Implemente auditoria interna ou contrate auditoria externa para mapear e resolver as pendências.",
      source: "deterministic",
    });
  }

  // Regra 7: Marketplace sem regime compatível
  if (input.taxComplexity?.usesMarketplace && cp.taxRegime === "simples_nacional" && revenueMin > 3_600_000) {
    findings.push({
      id: "DET-008",
      level: "medium",
      category: "tax_regime",
      title: "Uso de marketplace com faturamento próximo ao limite do Simples",
      description: "Empresas que operam em marketplaces e estão próximas ao limite do Simples Nacional devem monitorar o faturamento com atenção.",
      recommendation: "Monitore o faturamento mensal e planeje a eventual migração de regime.",
      source: "deterministic",
    });
  }

  return findings;
}

// ─── Análise IA ───────────────────────────────────────────────────────────────

export async function runAIConsistencyCheck(input: ConsistencyInput): Promise<ConsistencyFinding[]> {
  const profileSummary = JSON.stringify({
    companyProfile: input.companyProfile,
    operationProfile: input.operationProfile,
    taxComplexity: input.taxComplexity,
    financialProfile: input.financialProfile,
    governanceProfile: input.governanceProfile,
    confirmedCnaes: input.confirmedCnaes?.slice(0, 5),
    description: input.description?.slice(0, 500),
  }, null, 2);

  const systemPrompt = `Você é um especialista em compliance tributário brasileiro, especializado na Reforma Tributária (LC 214/2025 e LC 227/2025).

Analise o perfil da empresa abaixo e identifique INCONSISTÊNCIAS que podem comprometer a qualidade do diagnóstico tributário.

REGRAS:
- Identifique apenas inconsistências reais e relevantes para compliance tributário
- Não repita inconsistências já detectadas por regras determinísticas óbvias (regime vs. faturamento)
- Foque em inconsistências sutis: CNAEs incompatíveis com o setor declarado, operações que contradizem o porte, etc.
- Máximo 5 findings
- Se não houver inconsistências relevantes, retorne array vazio

Retorne APENAS um JSON válido no formato:
{
  "findings": [
    {
      "id": "AI-001",
      "level": "low|medium|high|critical",
      "category": "revenue_size|tax_regime|employee_size|cnae_sector|operations|governance|ai_detected",
      "title": "Título conciso",
      "description": "Descrição clara da inconsistência",
      "recommendation": "Ação recomendada"
    }
  ]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: systemPrompt } as Message,
        { role: "user" as const, content: `Perfil da empresa:\n${profileSummary}` } as Message,
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "consistency_findings",
          strict: true,
          schema: {
            type: "object",
            properties: {
              findings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                    category: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    recommendation: { type: "string" },
                  },
                  required: ["id", "level", "category", "title", "description", "recommendation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["findings"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    if (!rawContent) return [];
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(content);
    return (parsed.findings || []).map((f: ConsistencyFinding) => ({
      ...f,
      source: "ai" as const,
    }));
  } catch {
    return [];
  }
}

// ─── Agregação e score ────────────────────────────────────────────────────────

export function aggregateFindings(
  deterministicFindings: ConsistencyFinding[],
  aiFindings: ConsistencyFinding[]
): ConsistencyResult {
  const allFindings = [...deterministicFindings, ...aiFindings];

  const criticalCount = allFindings.filter((f) => f.level === "critical").length;
  const highCount = allFindings.filter((f) => f.level === "high").length;
  const mediumCount = allFindings.filter((f) => f.level === "medium").length;
  const lowCount = allFindings.filter((f) => f.level === "low").length;

  // Score: cada nível tem peso
  const deterministicScore = deterministicFindings.reduce((acc, f) => {
    const weights: Record<ConsistencyLevel, number> = { critical: 40, high: 20, medium: 10, low: 5, none: 0 };
    return acc + (weights[f.level] ?? 0);
  }, 0);

  const aiScore = aiFindings.reduce((acc, f) => {
    const weights: Record<ConsistencyLevel, number> = { critical: 40, high: 20, medium: 10, low: 5, none: 0 };
    return acc + (weights[f.level] ?? 0);
  }, 0);

  // Overall level
  let overallLevel: ConsistencyLevel = "none";
  if (criticalCount > 0) overallLevel = "critical";
  else if (highCount > 0) overallLevel = "high";
  else if (mediumCount > 0) overallLevel = "medium";
  else if (lowCount > 0) overallLevel = "low";

  return {
    overallLevel,
    findings: allFindings,
    deterministicScore: Math.min(100, deterministicScore),
    aiScore: Math.min(100, aiScore),
    totalIssues: allFindings.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    canProceed: criticalCount === 0, // critical bloqueia sem acceptedRisk
  };
}

// ─── Runner principal ─────────────────────────────────────────────────────────

export async function runConsistencyAnalysis(input: ConsistencyInput): Promise<ConsistencyResult> {
  const deterministicFindings = runDeterministicChecks(input);
  const aiFindings = await runAIConsistencyCheck(input);
  return aggregateFindings(deterministicFindings, aiFindings);
}
