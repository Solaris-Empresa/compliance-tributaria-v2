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

// ─── Sprint L2: Função de geração de relatório mensal (usada pelo job cron) ───

/**
 * Gera o HTML do relatório executivo mensal CPIE buscando todos os projetos
 * diretamente do banco (sem filtro de usuário — para uso pelo job cron).
 */
export async function generateMonthlyReportHtml(month?: number, year?: number): Promise<{
  html: string;
  month: number;
  year: number;
  monthName: string;
  stats: { total: number; avgScore: number; highRisk: number; lowScore: number; excellent: number };
}> {
  const { getDb } = await import("./db");
  const { projects: projectsTable } = await import("../drizzle/schema");

  const drizzle = await getDb();
  if (!drizzle) throw new Error("DB indisponível");

  const now = new Date();
  const m = month ?? (now.getMonth() + 1);
  const y = year ?? now.getFullYear();
  const monthName = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const allProjects = await drizzle.select({
    id: projectsTable.id,
    name: projectsTable.name,
    status: projectsTable.status,
    profileCompleteness: projectsTable.profileCompleteness,
    consistencyStatus: projectsTable.consistencyStatus,
    consistencyAcceptedRiskReason: projectsTable.consistencyAcceptedRiskReason,
  }).from(projectsTable);

  const total = allProjects.length;
  const withScore = allProjects.filter(p => p.profileCompleteness && p.profileCompleteness > 0);
  const avgScore = withScore.length > 0
    ? Math.round(withScore.reduce((sum, p) => sum + (p.profileCompleteness || 0), 0) / withScore.length)
    : 0;
  const highRisk = allProjects.filter(p => p.consistencyStatus === "warning" || p.consistencyStatus === "blocked");
  const lowScore = allProjects.filter(p => (p.profileCompleteness ?? 0) < 50);
  const excellent = allProjects.filter(p => (p.profileCompleteness ?? 0) >= 80);

  const reportDate = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Executivo Mensal — ${monthName}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 32px; background: #fff; max-width: 900px; }
    h1 { color: #0f3460; font-size: 24px; border-bottom: 3px solid #0f3460; padding-bottom: 10px; }
    h2 { color: #16213e; font-size: 17px; margin-top: 28px; border-left: 4px solid #0f3460; padding-left: 10px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
    .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; }
    .kpi .value { font-size: 32px; font-weight: 700; color: #0f3460; }
    .kpi .label { font-size: 12px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th { background: #0f3460; color: #fff; padding: 8px 12px; text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .badge-risk { background: #fef9c3; color: #854d0e; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .badge-low { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>📊 Relatório Executivo de Compliance Tributário</h1>
  <p style="color:#64748b;font-size:14px;">Período: <strong>${monthName}</strong> &nbsp;|&nbsp; Gerado em: ${reportDate} &nbsp;|&nbsp; Plataforma IA SOLARIS</p>
  <h2>Indicadores Gerais</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="value">${total}</div><div class="label">Total de Projetos</div></div>
    <div class="kpi"><div class="value">${avgScore}%</div><div class="label">Score Médio CPIE</div></div>
    <div class="kpi"><div class="value">${highRisk.length}</div><div class="label">Projetos com Risco</div></div>
    <div class="kpi"><div class="value">${excellent.length}</div><div class="label">Score Excelente (≥80%)</div></div>
  </div>
  <h2>Projetos com Risco de Consistência</h2>
  ${highRisk.length === 0 ? '<p style="color:#16a34a;">Nenhum projeto com risco de consistência no período.</p>' : `
  <table>
    <thead><tr><th>Projeto</th><th>Status</th><th>Score CPIE</th><th>Justificativa</th></tr></thead>
    <tbody>
      ${highRisk.map(p => `
        <tr>
          <td>${p.name}</td>
          <td><span class="badge-risk">${p.consistencyStatus === 'warning' ? 'Risco Aceito' : 'Bloqueado'}</span></td>
          <td>${p.profileCompleteness ?? 0}%</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.consistencyAcceptedRiskReason ?? '—'}</td>
        </tr>`).join('')}
    </tbody>
  </table>`}
  <h2>Projetos com Score Baixo (&lt; 50%)</h2>
  ${lowScore.length === 0 ? '<p style="color:#16a34a;">Todos os projetos com score adequado.</p>' : `
  <table>
    <thead><tr><th>Projeto</th><th>Score CPIE</th><th>Status</th></tr></thead>
    <tbody>
      ${lowScore.slice(0, 10).map(p => `
        <tr>
          <td>${p.name}</td>
          <td><span class="badge-low">${p.profileCompleteness ?? 0}%</span></td>
          <td>${p.status ?? 'rascunho'}</td>
        </tr>`).join('')}
      ${lowScore.length > 10 ? `<tr><td colspan="3" style="color:#64748b;font-style:italic;">... e mais ${lowScore.length - 10} projetos</td></tr>` : ''}
    </tbody>
  </table>`}
  <div class="footer">
    Relatório gerado automaticamente pela Plataforma IA SOLARIS &mdash; Compliance Tributário &mdash; Reforma Tributária 2024-2033
  </div>
</body>
</html>`;

  return { html, month: m, year: y, monthName, stats: { total, avgScore, highRisk: highRisk.length, lowScore: lowScore.length, excellent: excellent.length } };
}
