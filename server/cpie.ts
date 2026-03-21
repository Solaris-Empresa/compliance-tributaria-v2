/**
 * CPIE — Company Profile Intelligence Engine
 * Sprint v6.0 — Issue C1
 *
 * Motor de análise inteligente do perfil da empresa.
 * Recebe o PerfilEmpresaData e retorna:
 *   - profileScore: score explicável (0-100) com breakdown por dimensão
 *   - dynamicQuestions: perguntas contextuais geradas pela IA
 *   - suggestions: sugestões de correção com justificativa tributária
 *   - insights: observações relevantes para o compliance
 *
 * Princípio: não reimplementar o motor CNAE nem o Consistency Engine.
 * O CPIE é complementar — foca em enriquecer o perfil ANTES do diagnóstico.
 */

import { invokeLLM, type Message } from "./_core/llm";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CpieProfileInput {
  cnpj?: string;
  companyType?: string;
  companySize?: string;
  annualRevenueRange?: string;
  taxRegime?: string;
  operationType?: string;
  clientType?: string[];
  multiState?: boolean | null;
  hasMultipleEstablishments?: boolean | null;
  hasImportExport?: boolean | null;
  hasSpecialRegimes?: boolean | null;
  paymentMethods?: string[];
  hasIntermediaries?: boolean | null;
  hasTaxTeam?: boolean | null;
  hasAudit?: boolean | null;
  hasTaxIssues?: boolean | null;
  description?: string; // descrição livre do negócio
}

export interface DynamicQuestion {
  id: string;
  question: string;
  rationale: string; // por que essa pergunta é relevante
  field?: string; // campo do perfil que seria preenchido
  priority: "high" | "medium" | "low";
  category: "tax_regime" | "operations" | "governance" | "risk" | "opportunity";
}

export interface ProfileSuggestion {
  id: string;
  field: string;
  currentValue?: string;
  suggestedValue?: string;
  explanation: string; // justificativa tributária
  confidence: number; // 0-100
  severity: "info" | "warning" | "critical";
}

export interface ProfileInsight {
  id: string;
  title: string;
  description: string;
  category: "risk" | "opportunity" | "compliance" | "transition";
  relevance: "high" | "medium" | "low";
}

export interface ScoreDimension {
  name: string;
  score: number; // 0-100
  weight: number; // peso na composição do score final
  explanation: string;
  fieldsEvaluated: string[];
}

export interface CpieAnalysisResult {
  overallScore: number; // 0-100
  confidenceScore: number; // 0-100
  dimensions: ScoreDimension[];
  dynamicQuestions: DynamicQuestion[];
  suggestions: ProfileSuggestion[];
  insights: ProfileInsight[];
  readinessLevel: "insufficient" | "basic" | "good" | "excellent";
  readinessMessage: string;
  analysisVersion: string;
}

// ─── Score determinístico por dimensão ───────────────────────────────────────

const REVENUE_LIMITS: Record<string, { min: number; max: number }> = {
  "0-360000": { min: 0, max: 360_000 },
  "360000-4800000": { min: 360_001, max: 4_800_000 },
  "4800000-78000000": { min: 4_800_001, max: 78_000_000 },
  "78000000+": { min: 78_000_001, max: Infinity },
};

export function calcDimensionScores(input: CpieProfileInput): ScoreDimension[] {
  const dimensions: ScoreDimension[] = [];

  // Dimensão 1: Identificação (20%)
  const idFields = [
    input.cnpj && input.cnpj.replace(/\D/g, "").length === 14,
    !!input.companyType,
    !!input.companySize,
  ];
  const idScore = Math.round((idFields.filter(Boolean).length / idFields.length) * 100);
  dimensions.push({
    name: "Identificação",
    score: idScore,
    weight: 20,
    explanation: idScore === 100
      ? "CNPJ, tipo jurídico e porte preenchidos corretamente."
      : "Dados básicos de identificação incompletos.",
    fieldsEvaluated: ["cnpj", "companyType", "companySize"],
  });

  // Dimensão 2: Regime Tributário (25%)
  const taxFields = [
    !!input.taxRegime,
    !!input.annualRevenueRange,
  ];
  let taxScore = Math.round((taxFields.filter(Boolean).length / taxFields.length) * 100);
  // Penalizar inconsistência regime x faturamento
  if (input.taxRegime === "simples_nacional" && input.annualRevenueRange) {
    const rev = REVENUE_LIMITS[input.annualRevenueRange];
    if (rev && rev.min > 4_800_000) taxScore = Math.max(0, taxScore - 40);
  }
  if (input.companySize === "mei" && input.taxRegime && input.taxRegime !== "simples_nacional") {
    taxScore = Math.max(0, taxScore - 30);
  }
  dimensions.push({
    name: "Regime Tributário",
    score: taxScore,
    weight: 25,
    explanation: taxScore >= 80
      ? "Regime tributário e faturamento consistentes."
      : taxScore >= 50
      ? "Regime tributário declarado, mas há inconsistências ou dados faltantes."
      : "Regime tributário ou faturamento não informados, ou há inconsistência crítica.",
    fieldsEvaluated: ["taxRegime", "annualRevenueRange"],
  });

  // Dimensão 3: Operações (20%)
  const opFields = [
    !!input.operationType,
    input.clientType && input.clientType.length > 0,
    input.multiState !== null && input.multiState !== undefined,
  ];
  const opScore = Math.round((opFields.filter(Boolean).length / opFields.length) * 100);
  dimensions.push({
    name: "Operações",
    score: opScore,
    weight: 20,
    explanation: opScore === 100
      ? "Tipo de operação, clientes e abrangência geográfica informados."
      : "Dados operacionais incompletos — impacta a precisão do diagnóstico de IBS/CBS.",
    fieldsEvaluated: ["operationType", "clientType", "multiState"],
  });

  // Dimensão 4: Complexidade Tributária (20%)
  const complexFields = [
    input.hasMultipleEstablishments !== null && input.hasMultipleEstablishments !== undefined,
    input.hasImportExport !== null && input.hasImportExport !== undefined,
    input.hasSpecialRegimes !== null && input.hasSpecialRegimes !== undefined,
  ];
  const complexScore = Math.round((complexFields.filter(Boolean).length / complexFields.length) * 100);
  dimensions.push({
    name: "Complexidade Tributária",
    score: complexScore,
    weight: 20,
    explanation: complexScore === 100
      ? "Todos os indicadores de complexidade informados."
      : "Indicadores de complexidade não informados — pode subestimar o escopo do compliance.",
    fieldsEvaluated: ["hasMultipleEstablishments", "hasImportExport", "hasSpecialRegimes"],
  });

  // Dimensão 5: Governança (15%)
  const govFields = [
    input.hasTaxTeam !== null && input.hasTaxTeam !== undefined,
    input.hasAudit !== null && input.hasAudit !== undefined,
    input.hasTaxIssues !== null && input.hasTaxIssues !== undefined,
  ];
  const govScore = Math.round((govFields.filter(Boolean).length / govFields.length) * 100);
  dimensions.push({
    name: "Governança Tributária",
    score: govScore,
    weight: 15,
    explanation: govScore === 100
      ? "Dados de governança tributária completos."
      : "Informações de governança incompletas — impacta o plano de ação recomendado.",
    fieldsEvaluated: ["hasTaxTeam", "hasAudit", "hasTaxIssues"],
  });

  return dimensions;
}

export function calcOverallScore(dimensions: ScoreDimension[]): number {
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
  const weightedSum = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

function getReadinessLevel(score: number): { level: CpieAnalysisResult["readinessLevel"]; message: string } {
  if (score >= 85) return { level: "excellent", message: "Perfil excelente. A IA identificará CNAEs e riscos com alta precisão." };
  if (score >= 65) return { level: "good", message: "Perfil bom. Adicione os dados faltantes para maximizar a precisão do diagnóstico." };
  if (score >= 40) return { level: "basic", message: "Perfil básico. Complete as informações para um diagnóstico confiável." };
  return { level: "insufficient", message: "Perfil insuficiente. Preencha os campos obrigatórios para prosseguir." };
}

// ─── Geração de perguntas dinâmicas via IA ────────────────────────────────────

export async function generateDynamicQuestions(input: CpieProfileInput): Promise<DynamicQuestion[]> {
  // Montar contexto do perfil para a IA
  const profileContext = buildProfileContext(input);

  const systemPrompt = `Você é um especialista em compliance tributário brasileiro, especializado na Reforma Tributária (LC 214/2025).

Analise o perfil da empresa abaixo e gere PERGUNTAS DINÂMICAS contextuais que ajudariam a completar o diagnóstico.

REGRAS:
- Gere apenas perguntas para dados que NÃO foram informados ou que parecem inconsistentes
- Priorize perguntas com maior impacto no compliance da Reforma Tributária
- Cada pergunta deve ter uma justificativa clara e objetiva
- Máximo 5 perguntas, ordenadas por prioridade
- Se o perfil estiver completo e consistente, retorne array vazio
- Foque em: regime tributário, operações multi-estado, CNAEs, regimes especiais, passivo tributário

Retorne APENAS JSON válido:
{
  "questions": [
    {
      "id": "DQ-001",
      "question": "Texto da pergunta em linguagem natural",
      "rationale": "Por que essa informação é relevante para o compliance",
      "field": "nome_do_campo_relacionado",
      "priority": "high|medium|low",
      "category": "tax_regime|operations|governance|risk|opportunity"
    }
  ]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: systemPrompt } as Message,
        { role: "user" as const, content: `Perfil da empresa:\n${profileContext}` } as Message,
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "dynamic_questions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    question: { type: "string" },
                    rationale: { type: "string" },
                    field: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    category: { type: "string", enum: ["tax_regime", "operations", "governance", "risk", "opportunity"] },
                  },
                  required: ["id", "question", "rationale", "field", "priority", "category"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    if (!rawContent) return [];
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(content);
    return parsed.questions || [];
  } catch {
    return [];
  }
}

// ─── Geração de sugestões de correção via IA ──────────────────────────────────

export async function generateSuggestions(input: CpieProfileInput): Promise<ProfileSuggestion[]> {
  const profileContext = buildProfileContext(input);

  const systemPrompt = `Você é um especialista em compliance tributário brasileiro, especializado na Reforma Tributária (LC 214/2025).

Analise o perfil da empresa e gere SUGESTÕES DE CORREÇÃO para campos que parecem incorretos ou inconsistentes.

REGRAS:
- Identifique apenas inconsistências reais com base em regras tributárias brasileiras
- Explique a justificativa tributária de forma clara e objetiva
- Confidence: 90+ para regras objetivas, 60-89 para inferências, <60 para sugestões especulativas
- Máximo 4 sugestões
- Se não houver inconsistências, retorne array vazio
- Exemplos de inconsistências: MEI com regime diferente de Simples, Simples Nacional com faturamento > R$4,8M, grande empresa sem equipe tributária

Retorne APENAS JSON válido:
{
  "suggestions": [
    {
      "id": "SUG-001",
      "field": "nome_do_campo",
      "currentValue": "valor_atual",
      "suggestedValue": "valor_sugerido",
      "explanation": "Justificativa tributária clara",
      "confidence": 85,
      "severity": "info|warning|critical"
    }
  ]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: systemPrompt } as Message,
        { role: "user" as const, content: `Perfil da empresa:\n${profileContext}` } as Message,
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "profile_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    field: { type: "string" },
                    currentValue: { type: "string" },
                    suggestedValue: { type: "string" },
                    explanation: { type: "string" },
                    confidence: { type: "number" },
                    severity: { type: "string", enum: ["info", "warning", "critical"] },
                  },
                  required: ["id", "field", "currentValue", "suggestedValue", "explanation", "confidence", "severity"],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    if (!rawContent) return [];
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(content);
    return parsed.suggestions || [];
  } catch {
    return [];
  }
}

// ─── Geração de insights via IA ───────────────────────────────────────────────

export async function generateInsights(input: CpieProfileInput): Promise<ProfileInsight[]> {
  const profileContext = buildProfileContext(input);

  const systemPrompt = `Você é um especialista em compliance tributário brasileiro, especializado na Reforma Tributária (LC 214/2025 e LC 227/2025).

Analise o perfil da empresa e gere INSIGHTS relevantes sobre riscos, oportunidades e obrigações de compliance na Reforma Tributária.

REGRAS:
- Foque em implicações práticas da Reforma Tributária para o perfil específico
- Mencione IBS, CBS, IS, período de transição 2026-2033 quando relevante
- Máximo 3 insights de alta relevância
- Seja específico e objetivo — evite generalidades

Retorne APENAS JSON válido:
{
  "insights": [
    {
      "id": "INS-001",
      "title": "Título conciso",
      "description": "Descrição clara e específica",
      "category": "risk|opportunity|compliance|transition",
      "relevance": "high|medium|low"
    }
  ]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: systemPrompt } as Message,
        { role: "user" as const, content: `Perfil da empresa:\n${profileContext}` } as Message,
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "profile_insights",
          strict: true,
          schema: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    category: { type: "string", enum: ["risk", "opportunity", "compliance", "transition"] },
                    relevance: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["id", "title", "description", "category", "relevance"],
                  additionalProperties: false,
                },
              },
            },
            required: ["insights"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    if (!rawContent) return [];
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(content);
    return parsed.insights || [];
  } catch {
    return [];
  }
}

// ─── Runner principal ─────────────────────────────────────────────────────────

export async function runCpieAnalysis(input: CpieProfileInput): Promise<CpieAnalysisResult> {
  const dimensions = calcDimensionScores(input);
  const overallScore = calcOverallScore(dimensions);
  const { level: readinessLevel, message: readinessMessage } = getReadinessLevel(overallScore);

  // Calcular confidence score: penaliza campos null/undefined
  const totalFields = 16;
  const filledFields = [
    input.cnpj && input.cnpj.replace(/\D/g, "").length === 14,
    !!input.companyType,
    !!input.companySize,
    !!input.annualRevenueRange,
    !!input.taxRegime,
    !!input.operationType,
    input.clientType && input.clientType.length > 0,
    input.multiState !== null && input.multiState !== undefined,
    input.hasMultipleEstablishments !== null && input.hasMultipleEstablishments !== undefined,
    input.hasImportExport !== null && input.hasImportExport !== undefined,
    input.hasSpecialRegimes !== null && input.hasSpecialRegimes !== undefined,
    input.paymentMethods && input.paymentMethods.length > 0,
    input.hasIntermediaries !== null && input.hasIntermediaries !== undefined,
    input.hasTaxTeam !== null && input.hasTaxTeam !== undefined,
    input.hasAudit !== null && input.hasAudit !== undefined,
    input.hasTaxIssues !== null && input.hasTaxIssues !== undefined,
  ].filter(Boolean).length;
  const confidenceScore = Math.round((filledFields / totalFields) * 100);

  // Executar análises IA em paralelo
  const [dynamicQuestions, suggestions, insights] = await Promise.all([
    generateDynamicQuestions(input),
    generateSuggestions(input),
    generateInsights(input),
  ]);

  return {
    overallScore,
    confidenceScore,
    dimensions,
    dynamicQuestions,
    suggestions,
    insights,
    readinessLevel,
    readinessMessage,
    analysisVersion: "cpie-v1.0",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildProfileContext(input: CpieProfileInput): string {
  const lines: string[] = [];

  if (input.cnpj) lines.push(`CNPJ: ${input.cnpj}`);
  if (input.companyType) lines.push(`Tipo Jurídico: ${input.companyType}`);
  if (input.companySize) lines.push(`Porte: ${input.companySize}`);
  if (input.annualRevenueRange) lines.push(`Faturamento Anual: ${input.annualRevenueRange}`);
  if (input.taxRegime) lines.push(`Regime Tributário: ${input.taxRegime}`);
  if (input.operationType) lines.push(`Tipo de Operação: ${input.operationType}`);
  if (input.clientType?.length) lines.push(`Tipo de Cliente: ${input.clientType.join(", ")}`);
  if (input.multiState !== null && input.multiState !== undefined) lines.push(`Operação Multi-estado: ${input.multiState ? "Sim" : "Não"}`);
  if (input.hasMultipleEstablishments !== null && input.hasMultipleEstablishments !== undefined) lines.push(`Múltiplos Estabelecimentos: ${input.hasMultipleEstablishments ? "Sim" : "Não"}`);
  if (input.hasImportExport !== null && input.hasImportExport !== undefined) lines.push(`Importação/Exportação: ${input.hasImportExport ? "Sim" : "Não"}`);
  if (input.hasSpecialRegimes !== null && input.hasSpecialRegimes !== undefined) lines.push(`Regimes Especiais: ${input.hasSpecialRegimes ? "Sim" : "Não"}`);
  if (input.paymentMethods?.length) lines.push(`Meios de Pagamento: ${input.paymentMethods.join(", ")}`);
  if (input.hasIntermediaries !== null && input.hasIntermediaries !== undefined) lines.push(`Intermediários Financeiros: ${input.hasIntermediaries ? "Sim" : "Não"}`);
  if (input.hasTaxTeam !== null && input.hasTaxTeam !== undefined) lines.push(`Equipe Tributária: ${input.hasTaxTeam ? "Sim" : "Não"}`);
  if (input.hasAudit !== null && input.hasAudit !== undefined) lines.push(`Auditoria Fiscal: ${input.hasAudit ? "Sim" : "Não"}`);
  if (input.hasTaxIssues !== null && input.hasTaxIssues !== undefined) lines.push(`Passivo Tributário: ${input.hasTaxIssues ? "Sim" : "Não"}`);
  if (input.description) lines.push(`\nDescrição do Negócio:\n${input.description.slice(0, 600)}`);

  return lines.join("\n") || "Perfil ainda não preenchido.";
}
