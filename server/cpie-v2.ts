/**
 * CPIE v2.0 — Company Profile Intelligence Engine (Conflict Intelligence)
 * Issue v6.0.R1 — Reset Conceitual aprovado pelo orquestrador em 22/03/2026
 *
 * MUDANÇA FUNDAMENTAL vs. v1:
 *   v1: mede completude de formulário → confunde preenchimento com coerência
 *   v2: mede coerência de realidade → detecta contradições compostas
 *
 * TRÊS SCORES SEPARADOS (nunca misturar):
 *   completenessScore    — quantos campos foram preenchidos (pode ser 100% com dados ruins)
 *   consistencyScore     — coerência interna (sujeito a veto; cai com contradições)
 *   diagnosticConfidence — confiança diagnóstica real = consistencyScore × completeness/100
 *
 * REGRAS DE VETO:
 *   aiVeto e deterministicVeto são tetos numéricos que o consistencyScore não pode ultrapassar.
 *   Um único conflito composto crítico pode vetar o score em ≤ 15, independente de completude.
 *
 * PAPEL DA IA:
 *   Árbitro de realidade, não assistente de preenchimento.
 *   Pergunta central: "Essa empresa pode existir na realidade brasileira?"
 *
 * COMPATIBILIDADE:
 *   O cpie.ts (v1) permanece intacto. A substituição no router ocorre na Fase 3.
 *   Análises v2 são marcadas com analysisVersion: "cpie-v2.0".
 */

import { invokeLLM, type Message } from "./_core/llm";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CpieProfileInputV2 {
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
  description?: string; // FONTE PRIMÁRIA DE VERDADE — não é campo opcional
}

export interface InferredProfile {
  sector: string;
  estimatedMonthlyRevenue?: number;
  estimatedAnnualRevenue?: number;
  inferredCompanySize?: string;
  inferredTaxRegime?: string;
  inferredOperationType?: string;
  inferredClientType?: string[];
  inferenceConfidence: number; // 0-100
  inferenceNotes: string;
}

export type ConflictType = "direct" | "inference" | "composite";
export type ConflictSeverity = "critical" | "high" | "medium" | "low";

export interface ConflictFinding {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  conflictingFields: string[];
  inferredValue?: string;
  declaredValue?: string;
  consistencyVeto?: number; // teto de score imposto por este conflito
  reconciliationRequired: boolean;
  source: "deterministic" | "inference" | "ai";
}

export interface ReconciliationQuestion {
  id: string;
  conflictId: string;
  question: string;
  purpose: string;
  isBlocking: boolean;
}

export interface AiArbitrationResult {
  aiCoherenceScore: number;      // 0-100
  aiVeto: number | null;         // teto máximo para consistencyScore (null = sem veto)
  aiFindings: ConflictFinding[];
  aiBlockReason?: string;        // obrigatório quando aiVeto < 20
  reconciliationQuestions: ReconciliationQuestion[];
}

export interface CpieAnalysisResultV2 {
  // Os três scores separados — NUNCA misturar
  completenessScore: number;     // 0-100: campos preenchidos
  consistencyScore: number;      // 0-100: coerência interna (sujeito a veto)
  diagnosticConfidence: number;  // 0-100: confiança diagnóstica real

  // Perfil inferido da descrição livre
  inferredProfile: InferredProfile;

  // Conflitos detectados
  conflicts: ConflictFinding[];

  // Perguntas de reconciliação
  reconciliationQuestions: ReconciliationQuestion[];

  // Decisão de bloqueio
  canProceed: boolean;
  blockType?: "hard_block" | "soft_block_with_override";
  blockReason?: string;

  // Metadados de auditoria
  deterministicVeto: number | null;
  aiVeto: number | null;
  analysisVersion: "cpie-v2.0";
}

// ─── Limites de referência ────────────────────────────────────────────────────

const REVENUE_LIMITS: Record<string, { min: number; max: number }> = {
  "0-360000":          { min: 0,          max: 360_000 },
  "360000-4800000":    { min: 360_001,    max: 4_800_000 },
  "4800000-78000000":  { min: 4_800_001,  max: 78_000_000 },
  "78000000+":         { min: 78_000_001, max: Infinity },
};

const REGIME_MAX_REVENUE: Record<string, number> = {
  simples_nacional: 4_800_000,
  lucro_presumido:  78_000_000,
  lucro_real:       Infinity,
};

const SIZE_MAX_REVENUE: Record<string, number> = {
  mei:      81_000,
  micro:    360_000,
  pequena:  4_800_000,
  media:    300_000_000,
  grande:   Infinity,
};

// Setores que são incompatíveis com tipo de operação "serviços"
const MANUFACTURING_KEYWORDS = [
  "cerveja", "bebida", "alimento", "fábrica", "indústria", "manufatura",
  "produção", "fabricação", "confecção", "metalúrgica", "química", "farmacêutica",
  "têxtil", "calçado", "móveis", "papel", "plástico", "borracha", "cerâmica",
];

// Setores incompatíveis com cliente B2G
const B2G_UNLIKELY_SECTORS = [
  "cerveja", "bebida alcoólica", "bar", "restaurante", "lanchonete",
  "moda", "vestuário", "beleza", "estética", "academia", "pet shop",
];

// ─── E1: Extração Semântica (IA) ──────────────────────────────────────────────

export async function extractInferredProfile(input: CpieProfileInputV2): Promise<InferredProfile> {
  if (!input.description || input.description.trim().length < 10) {
    return {
      sector: "não informado",
      inferenceConfidence: 0,
      inferenceNotes: "Descrição livre não fornecida — inferência impossível.",
    };
  }

  const systemPrompt = `Você é um analista de perfil empresarial brasileiro especializado em compliance tributário.

Sua tarefa é extrair o PERFIL REAL da empresa a partir da descrição livre fornecida.

IMPORTANTE: A descrição é a FONTE PRIMÁRIA DE VERDADE. Extraia apenas o que está explícito ou fortemente implícito.

TABELA OFICIAL DE PORTE (BNDES/Sebrae/Receita Federal) — USE PARA INFERIR inferredCompanySize:
- MEI:          faturamento até R$ 81 mil/ano
- Microempresa: faturamento até R$ 360 mil/ano
- Pequena:      faturamento até R$ 4,8 milhões/ano
- Média:        faturamento até R$ 300 milhões/ano
- Grande:       faturamento acima de R$ 300 milhões/ano

Exemplo: empresa com R$ 1M/mês (R$ 12M/ano) → inferredCompanySize = "media" (R$ 12M < R$ 300M).
Exemplo: empresa com R$ 3M/mês (R$ 36M/ano) → inferredCompanySize = "media" (R$ 36M < R$ 300M).

Retorne APENAS JSON válido:
{
  "sector": "setor principal da empresa (ex: manufatura/bebidas, serviços/TI, comércio/varejo)",
  "estimatedMonthlyRevenue": número em reais ou null se não mencionado,
  "estimatedAnnualRevenue": número em reais ou null se não mencionado,
  "inferredCompanySize": "mei|micro|pequena|media|grande" baseado no faturamento/estrutura descrita, ou null,
  "inferredTaxRegime": "simples_nacional|lucro_presumido|lucro_real" compatível com o perfil descrito, ou null,
  "inferredOperationType": "industria|comercio|servicos|agronegocio|financeiro" ou null,
  "inferredClientType": array com "b2c", "b2b", "b2g" conforme descrito, ou null,
  "inferenceConfidence": número 0-100 representando confiança na inferência,
  "inferenceNotes": "observações relevantes sobre a inferência"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: systemPrompt } as Message,
        { role: "user" as const, content: `Descrição da empresa: "${input.description}"` } as Message,
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "inferred_profile",
          strict: true,
          schema: {
            type: "object",
            properties: {
              sector: { type: "string" },
              estimatedMonthlyRevenue: { type: ["number", "null"] },
              estimatedAnnualRevenue: { type: ["number", "null"] },
              inferredCompanySize: { type: ["string", "null"] },
              inferredTaxRegime: { type: ["string", "null"] },
              inferredOperationType: { type: ["string", "null"] },
              inferredClientType: { type: ["array", "null"], items: { type: "string" } },
              inferenceConfidence: { type: "number" },
              inferenceNotes: { type: "string" },
            },
            required: ["sector", "estimatedMonthlyRevenue", "estimatedAnnualRevenue",
                       "inferredCompanySize", "inferredTaxRegime", "inferredOperationType",
                       "inferredClientType", "inferenceConfidence", "inferenceNotes"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("IA não retornou conteúdo");
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    return JSON.parse(content) as InferredProfile;
  } catch {
    return {
      sector: "erro na inferência",
      inferenceConfidence: 0,
      inferenceNotes: "Falha na extração semântica — análise degradada.",
    };
  }
}

// ─── E2: Cálculo de Completude (determinístico) ───────────────────────────────

export function calcCompletenessScore(input: CpieProfileInputV2): number {
  const fields = [
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
    // Descrição livre tem peso próprio
    !!input.description && input.description.trim().length >= 20,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

// ─── E3: Conflict Matrix (determinístico + inferência) ────────────────────────

export function buildConflictMatrix(
  input: CpieProfileInputV2,
  inferred: InferredProfile
): { conflicts: ConflictFinding[]; deterministicVeto: number | null } {
  const conflicts: ConflictFinding[] = [];
  let deterministicVeto: number | null = null;

  const revenueRange = input.annualRevenueRange;
  const revenueMin = revenueRange ? REVENUE_LIMITS[revenueRange]?.min ?? 0 : 0;

  // ── CAMADA A: Regras Objetivas (diretas) ──────────────────────────────────

  // A1: Regime tributário vs. faturamento declarado
  if (input.taxRegime && revenueRange) {
    const maxRevenue = REGIME_MAX_REVENUE[input.taxRegime];
    if (maxRevenue !== undefined && revenueMin > maxRevenue) {
      conflicts.push({
        id: "A1",
        type: "direct",
        severity: "critical",
        title: "Regime tributário incompatível com faturamento declarado",
        description: `${input.taxRegime.replace("_", " ")} tem limite de R$ ${(maxRevenue / 1e6).toFixed(1)}M, mas o faturamento declarado excede esse limite.`,
        conflictingFields: ["taxRegime", "annualRevenueRange"],
        declaredValue: `${input.taxRegime} + ${revenueRange}`,
        consistencyVeto: 15,
        reconciliationRequired: true,
        source: "deterministic",
      });
      deterministicVeto = Math.min(deterministicVeto ?? 100, 15);
    }
  }

  // A2: Porte vs. faturamento declarado
  if (input.companySize && revenueRange) {
    const maxRevenue = SIZE_MAX_REVENUE[input.companySize];
    if (maxRevenue !== undefined && revenueMin > maxRevenue) {
      conflicts.push({
        id: "A2",
        type: "direct",
        severity: "high",
        title: "Porte da empresa incompatível com faturamento declarado",
        description: `Empresas "${input.companySize}" têm faturamento máximo de R$ ${(maxRevenue / 1e6).toFixed(1)}M, mas o faturamento declarado excede esse valor.`,
        conflictingFields: ["companySize", "annualRevenueRange"],
        declaredValue: `${input.companySize} + ${revenueRange}`,
        consistencyVeto: 40,
        reconciliationRequired: true,
        source: "deterministic",
      });
      deterministicVeto = Math.min(deterministicVeto ?? 100, 40);
    }
  }

  // A3: MEI com operações multi-estado
  if (input.companySize === "mei" && input.multiState === true) {
    conflicts.push({
      id: "A3",
      type: "direct",
      severity: "high",
      title: "MEI com operações multi-estado",
      description: "MEI não pode operar em múltiplos estados como estabelecimento fixo.",
      conflictingFields: ["companySize", "multiState"],
      consistencyVeto: 40,
      reconciliationRequired: true,
      source: "deterministic",
    });
    deterministicVeto = Math.min(deterministicVeto ?? 100, 40);
  }

  // A4: MEI com importação/exportação
  if (input.companySize === "mei" && input.hasImportExport === true) {
    conflicts.push({
      id: "A4",
      type: "direct",
      severity: "critical",
      title: "MEI com operações internacionais",
      description: "MEI não pode realizar operações de importação/exportação diretamente.",
      conflictingFields: ["companySize", "hasImportExport"],
      consistencyVeto: 15,
      reconciliationRequired: true,
      source: "deterministic",
    });
    deterministicVeto = Math.min(deterministicVeto ?? 100, 15);
  }

  // ── CAMADA B: Comparação Descrição vs. Campos (inferência) ────────────────

  if (inferred.inferenceConfidence >= 50) {

    // B1: Faturamento descrito vs. faturamento declarado
    if (inferred.estimatedAnnualRevenue && revenueRange) {
      const declared = REVENUE_LIMITS[revenueRange];
      if (declared) {
        const divergence = inferred.estimatedAnnualRevenue / Math.max(declared.max, 1);
        if (divergence > 4) {
          // Faturamento descrito é >4x o máximo do range declarado
          conflicts.push({
            id: "B1",
            type: "inference",
            severity: "critical",
            title: "Faturamento descrito diverge criticamente do declarado",
            description: `A descrição implica faturamento anual de ~R$ ${(inferred.estimatedAnnualRevenue / 1e6).toFixed(1)}M, mas o campo declara faixa de até R$ ${(declared.max / 1e6).toFixed(1)}M — divergência de ${Math.round(divergence)}x.`,
            conflictingFields: ["description", "annualRevenueRange"],
            inferredValue: `~R$ ${(inferred.estimatedAnnualRevenue / 1e3).toFixed(0)}K/ano`,
            declaredValue: revenueRange,
            consistencyVeto: 30,
            reconciliationRequired: true,
            source: "inference",
          });
          deterministicVeto = Math.min(deterministicVeto ?? 100, 30);
        } else if (divergence > 2) {
          conflicts.push({
            id: "B1b",
            type: "inference",
            severity: "high",
            title: "Faturamento descrito diverge do declarado",
            description: `A descrição implica faturamento ~${Math.round(divergence)}x maior que o range declarado.`,
            conflictingFields: ["description", "annualRevenueRange"],
            inferredValue: `~R$ ${(inferred.estimatedAnnualRevenue / 1e3).toFixed(0)}K/ano`,
            declaredValue: revenueRange,
            consistencyVeto: 45,
            reconciliationRequired: true,
            source: "inference",
          });
          deterministicVeto = Math.min(deterministicVeto ?? 100, 45);
        }
      }
    }

    // B2: Tipo de operação inferido vs. declarado
    if (inferred.inferredOperationType && input.operationType) {
      if (inferred.inferredOperationType !== input.operationType) {
        const severity: ConflictSeverity =
          (inferred.inferredOperationType === "industria" && input.operationType === "servicos") ||
          (inferred.inferredOperationType === "servicos" && input.operationType === "industria")
            ? "high" : "medium";
        conflicts.push({
          id: "B2",
          type: "inference",
          severity,
          title: "Tipo de operação incompatível com a descrição",
          description: `A descrição indica operação de "${inferred.inferredOperationType}", mas o campo declara "${input.operationType}".`,
          conflictingFields: ["description", "operationType"],
          inferredValue: inferred.inferredOperationType,
          declaredValue: input.operationType,
          consistencyVeto: severity === "high" ? 40 : 55,
          reconciliationRequired: severity === "high",
          source: "inference",
        });
        if (severity === "high") {
          deterministicVeto = Math.min(deterministicVeto ?? 100, 40);
        }
      }
    }

    // B3: Tipo de cliente inferido vs. declarado
    if (inferred.inferredClientType && input.clientType && input.clientType.length > 0) {
      const declaredHasB2G = input.clientType.includes("b2g");
      const inferredHasB2G = inferred.inferredClientType.includes("b2g");
      const descLower = (input.description || "").toLowerCase();
      const isB2GUnlikelySector = B2G_UNLIKELY_SECTORS.some(kw => descLower.includes(kw));

      if (declaredHasB2G && !inferredHasB2G && isB2GUnlikelySector) {
        conflicts.push({
          id: "B3",
          type: "inference",
          severity: "medium",
          title: "Cliente B2G improvável para o setor descrito",
          description: `O setor "${inferred.sector}" raramente opera com governo como cliente principal. Confirme se há contratos governamentais.`,
          conflictingFields: ["description", "clientType"],
          inferredValue: inferred.inferredClientType.join(", ") || "b2c/b2b",
          declaredValue: input.clientType.join(", "),
          consistencyVeto: 55,
          reconciliationRequired: false,
          source: "inference",
        });
        deterministicVeto = Math.min(deterministicVeto ?? 100, 55);
      }
    }

    // B4: Porte inferido vs. declarado
    if (inferred.inferredCompanySize && input.companySize) {
      const sizeOrder = ["mei", "micro", "pequena", "media", "grande"];
      const inferredIdx = sizeOrder.indexOf(inferred.inferredCompanySize);
      const declaredIdx = sizeOrder.indexOf(input.companySize);
      if (inferredIdx >= 0 && declaredIdx >= 0 && Math.abs(inferredIdx - declaredIdx) >= 2) {
        conflicts.push({
          id: "B4",
          type: "inference",
          severity: "high",
          title: "Porte declarado incompatível com o perfil descrito",
          description: `A descrição sugere porte "${inferred.inferredCompanySize}", mas o campo declara "${input.companySize}" — diferença de ${Math.abs(inferredIdx - declaredIdx)} categorias.`,
          conflictingFields: ["description", "companySize"],
          inferredValue: inferred.inferredCompanySize,
          declaredValue: input.companySize,
          consistencyVeto: 40,
          reconciliationRequired: true,
          source: "inference",
        });
        deterministicVeto = Math.min(deterministicVeto ?? 100, 40);
      }
    }
  }

  // ── CAMADA C: Contradições Compostas (combinações impossíveis) ────────────

  // C1: MEI + indústria manufatureira (pela descrição)
  if (input.companySize === "mei") {
    const descLower = (input.description || "").toLowerCase();
    const isManufacturing = MANUFACTURING_KEYWORDS.some(kw => descLower.includes(kw));
    if (isManufacturing || input.operationType === "industria") {
      conflicts.push({
        id: "C1",
        type: "composite",
        severity: "critical",
        title: "MEI com atividade de manufatura — combinação impossível",
        description: "MEI não pode exercer atividade industrial/manufatureira. O limite de faturamento (R$ 81K/ano) e as restrições de CNAE tornam essa combinação juridicamente impossível.",
        conflictingFields: ["companySize", "operationType", "description"],
        consistencyVeto: 15,
        reconciliationRequired: true,
        source: "deterministic",
      });
      deterministicVeto = Math.min(deterministicVeto ?? 100, 15);
    }
  }

  // C2: MEI + múltiplos canais de venda (varejo + atacado + e-commerce)
  if (input.companySize === "mei" && input.description) {
    const descLower = input.description.toLowerCase();
    const channels = ["varejo", "atacado", "e-commerce", "marketplace", "distribui"].filter(c => descLower.includes(c));
    if (channels.length >= 2) {
      conflicts.push({
        id: "C2",
        type: "composite",
        severity: "high",
        title: "MEI com múltiplos canais de venda — estrutura incompatível",
        description: `A descrição menciona ${channels.length} canais de venda (${channels.join(", ")}), o que implica estrutura operacional incompatível com MEI.`,
        conflictingFields: ["companySize", "description"],
        consistencyVeto: 35,
        reconciliationRequired: true,
        source: "deterministic",
      });
      deterministicVeto = Math.min(deterministicVeto ?? 100, 35);
    }
  }

  // C3: Simples Nacional + B2G + grande faturamento descrito
  if (input.taxRegime === "simples_nacional" && input.clientType?.includes("b2g")) {
    if (inferred.estimatedAnnualRevenue && inferred.estimatedAnnualRevenue > 4_800_000) {
      conflicts.push({
        id: "C3",
        type: "composite",
        severity: "high",
        title: "Simples Nacional com B2G e faturamento acima do limite",
        description: "Contratos B2G com faturamento acima de R$ 4,8M/ano são incompatíveis com Simples Nacional.",
        conflictingFields: ["taxRegime", "clientType", "description"],
        consistencyVeto: 35,
        reconciliationRequired: true,
        source: "inference",
      });
      deterministicVeto = Math.min(deterministicVeto ?? 100, 35);
    }
  }

  return { conflicts, deterministicVeto };
}

// ─── E4: Arbitragem IA ────────────────────────────────────────────────────────

export async function runAiArbitration(
  input: CpieProfileInputV2,
  inferred: InferredProfile,
  existingConflicts: ConflictFinding[]
): Promise<AiArbitrationResult> {
  const profileSummary = {
    descricao_livre: input.description || "(não fornecida)",
    perfil_inferido_da_descricao: {
      setor: inferred.sector,
      faturamento_mensal_estimado: inferred.estimatedMonthlyRevenue
        ? `R$ ${inferred.estimatedMonthlyRevenue.toLocaleString("pt-BR")}`
        : null,
      faturamento_anual_estimado: inferred.estimatedAnnualRevenue
        ? `R$ ${inferred.estimatedAnnualRevenue.toLocaleString("pt-BR")}`
        : null,
      porte_inferido: inferred.inferredCompanySize,
      regime_compativel: inferred.inferredTaxRegime,
      operacao_inferida: inferred.inferredOperationType,
      cliente_inferido: inferred.inferredClientType,
    },
    campos_declarados: {
      tipo_juridico: input.companyType,
      porte: input.companySize,
      regime_tributario: input.taxRegime,
      faturamento_anual: input.annualRevenueRange,
      tipo_operacao: input.operationType,
      tipo_cliente: input.clientType,
      multi_estado: input.multiState,
      importacao_exportacao: input.hasImportExport,
    },
    conflitos_ja_detectados: existingConflicts.map(c => ({
      id: c.id,
      tipo: c.type,
      severidade: c.severity,
      titulo: c.title,
    })),
  };

  const systemPrompt = `Você é um ÁRBITRO DE REALIDADE EMPRESARIAL BRASILEIRA.

Sua única pergunta é: "Essa empresa pode existir na realidade brasileira?"

Você receberá:
1. A descrição livre do negócio (FONTE PRIMÁRIA DE VERDADE)
2. O perfil inferido pela IA a partir da descrição
3. Os campos estruturados declarados pelo usuário
4. Conflitos já detectados por regras determinísticas

Sua tarefa:
1. Identificar CONTRADIÇÕES COMPOSTAS que as regras não detectaram
2. Calcular um score de coerência (aiCoherenceScore: 0-100)
3. Aplicar veto se necessário (aiVeto: número ou null)
4. Gerar perguntas de reconciliação para conflitos críticos

TABELA DE VETO OBRIGATÓRIO:
- Contradição composta crítica (empresa não pode existir como descrita) → aiVeto ≤ 15
- Múltiplos conflitos high sem explicação plausível → aiVeto ≤ 30
- Conflito de faturamento descrito vs. declarado >300% → aiVeto ≤ 30
- Tipo de operação claramente incompatível com setor → aiVeto ≤ 40
- Sem contradições significativas → aiVeto = null

REGRA INVIOLÁVEL: Se você identificar contradição composta crítica, aiVeto DEVE ser ≤ 15.
Não há exceção. Completude de formulário NÃO cancela o veto.

TABELA OFICIAL DE PORTE (BNDES/Sebrae/Receita Federal) — USE COMO REFERÊNCIA INVIOLÁVEL:
- MEI:          faturamento até R$ 81 mil/ano
- Microempresa: faturamento até R$ 360 mil/ano
- Pequena:      faturamento até R$ 4,8 milhões/ano
- Média:        faturamento até R$ 300 milhões/ano  ← ATENÇÃO: limite É R$ 300M, não R$ 36M
- Grande:       faturamento acima de R$ 300 milhões/ano

REGRA ANTI-FALSO-POSITIVO: NÃO gere conflito de porte quando o faturamento declarado está DENTRO do limite oficial.
Exemplo correto: empresa média com R$ 12M/ano → SEM conflito (R$ 12M < R$ 300M).
Exemplo correto: empresa média com R$ 36M/ano → SEM conflito (R$ 36M < R$ 300M).
Exemplo com conflito real: empresa pequena com R$ 36M/ano → conflito (R$ 36M > R$ 4,8M).

IMPORTANTE: Não repita conflitos já detectados (listados em conflitos_ja_detectados).
Foque em contradições COMPOSTAS que só emergem da combinação de múltiplos campos.

Retorne APENAS JSON válido:
{
  "aiCoherenceScore": número 0-100,
  "aiVeto": número 0-100 ou null,
  "aiBlockReason": "explicação se aiVeto ≤ 20, null caso contrário",
  "aiFindings": [
    {
      "id": "AI-001",
      "type": "composite",
      "severity": "critical|high|medium|low",
      "title": "título conciso",
      "description": "descrição clara da contradição composta",
      "conflictingFields": ["campo1", "campo2"],
      "inferredValue": "o que a descrição implica",
      "declaredValue": "o que os campos declaram",
      "consistencyVeto": número ou null,
      "reconciliationRequired": true ou false,
      "source": "ai"
    }
  ],
  "reconciliationQuestions": [
    {
      "id": "RQ-001",
      "conflictId": "AI-001",
      "question": "pergunta para reconciliar o conflito",
      "purpose": "o que será resolvido com a resposta",
      "isBlocking": true ou false
    }
  ]
}`;

  const emptyResult: AiArbitrationResult = {
    aiCoherenceScore: 50,
    aiVeto: null,
    aiFindings: [],
    reconciliationQuestions: [],
  };

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: systemPrompt } as Message,
        { role: "user" as const, content: `Perfil para arbitragem:\n${JSON.stringify(profileSummary, null, 2)}` } as Message,
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ai_arbitration",
          strict: true,
          schema: {
            type: "object",
            properties: {
              aiCoherenceScore: { type: "number" },
              aiVeto: { type: ["number", "null"] },
              aiBlockReason: { type: ["string", "null"] },
              aiFindings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    type: { type: "string", enum: ["composite", "inference", "direct"] },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    title: { type: "string" },
                    description: { type: "string" },
                    conflictingFields: { type: "array", items: { type: "string" } },
                    inferredValue: { type: ["string", "null"] },
                    declaredValue: { type: ["string", "null"] },
                    consistencyVeto: { type: ["number", "null"] },
                    reconciliationRequired: { type: "boolean" },
                    source: { type: "string", enum: ["ai"] },
                  },
                  required: ["id", "type", "severity", "title", "description",
                             "conflictingFields", "inferredValue", "declaredValue",
                             "consistencyVeto", "reconciliationRequired", "source"],
                  additionalProperties: false,
                },
              },
              reconciliationQuestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    conflictId: { type: "string" },
                    question: { type: "string" },
                    purpose: { type: "string" },
                    isBlocking: { type: "boolean" },
                  },
                  required: ["id", "conflictId", "question", "purpose", "isBlocking"],
                  additionalProperties: false,
                },
              },
            },
            required: ["aiCoherenceScore", "aiVeto", "aiBlockReason", "aiFindings", "reconciliationQuestions"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    if (!rawContent) return emptyResult;
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(content);

    // Validação de sanidade pós-IA: se há findings críticos mas sem veto → forçar veto
    const hasCriticalFindings = (parsed.aiFindings || []).some(
      (f: { severity: string }) => f.severity === "critical"
    );
    if (hasCriticalFindings && (parsed.aiVeto === null || parsed.aiVeto > 20)) {
      parsed.aiVeto = 20;
      parsed.aiBlockReason = parsed.aiBlockReason || "Veto forçado por validação de sanidade: findings críticos detectados sem veto aplicado.";
    }

    return {
      aiCoherenceScore: parsed.aiCoherenceScore ?? 50,
      aiVeto: parsed.aiVeto ?? null,
      aiBlockReason: parsed.aiBlockReason ?? undefined,
      aiFindings: (parsed.aiFindings || []).map((f: ConflictFinding) => ({ ...f, source: "ai" as const })),
      reconciliationQuestions: parsed.reconciliationQuestions || [],
    };
  } catch {
    // Falha da IA não resulta em score alto — retorna score conservador
    return {
      aiCoherenceScore: 0,
      aiVeto: 0,
      aiBlockReason: "Falha na arbitragem IA — score zerado por segurança.",
      aiFindings: [{
        id: "AI-ERR",
        type: "composite",
        severity: "critical",
        title: "Falha na arbitragem IA",
        description: "O motor de arbitragem IA falhou. Por segurança, o avanço está bloqueado.",
        conflictingFields: [],
        reconciliationRequired: true,
        source: "ai",
      }],
      reconciliationQuestions: [],
    };
  }
}

// ─── E5: Cálculo Final de Scores ──────────────────────────────────────────────

export function calcFinalScores(
  completenessScore: number,
  conflicts: ConflictFinding[],
  deterministicVeto: number | null,
  aiVeto: number | null,
): { consistencyScore: number; diagnosticConfidence: number } {
  // Penalizações por conflito (acumulativas)
  const penaltyMap: Record<ConflictSeverity, number> = {
    critical: 35,
    high: 20,
    medium: 10,
    low: 5,
  };
  const totalPenalty = conflicts.reduce((sum, c) => sum + (penaltyMap[c.severity] ?? 0), 0);
  const rawScore = Math.max(0, 100 - totalPenalty);

  // Aplicar vetos (tetos de score)
  const consistencyScore = Math.min(
    rawScore,
    deterministicVeto ?? 100,
    aiVeto ?? 100
  );

  // diagnosticConfidence = consistencyScore × completeness / 100
  const diagnosticConfidence = Math.round(consistencyScore * completenessScore / 100);

  return { consistencyScore, diagnosticConfidence };
}

// ─── Runner Principal ─────────────────────────────────────────────────────────

export async function runCpieAnalysisV2(input: CpieProfileInputV2): Promise<CpieAnalysisResultV2> {
  // E1: Extração semântica
  const inferredProfile = await extractInferredProfile(input);

  // E2: Completude
  const completenessScore = calcCompletenessScore(input);

  // E3: Conflict matrix
  const { conflicts: deterministicConflicts, deterministicVeto } = buildConflictMatrix(input, inferredProfile);

  // E4: Arbitragem IA
  const aiResult = await runAiArbitration(input, inferredProfile, deterministicConflicts);

  // Filtrar findings da IA que contradizem os limites oficiais de porte
  // (a IA pode gerar falsos positivos sobre porte médio/grande quando o faturamento
  //  está dentro dos limites do BNDES/Sebrae)
  const filteredAiFindings = aiResult.aiFindings.filter(f => {
    // Remover conflitos de porte quando companySize e annualRevenueRange são compatíveis
    const isPorteConflict = f.conflictingFields.includes("companySize") &&
      (f.conflictingFields.includes("annualRevenueRange") || f.conflictingFields.includes("description"));
    if (isPorteConflict && input.companySize && input.annualRevenueRange) {
      const maxRevenue = SIZE_MAX_REVENUE[input.companySize];
      const revenueRange = REVENUE_LIMITS[input.annualRevenueRange];
      if (maxRevenue !== undefined && revenueRange) {
        // Se o faturamento declarado está dentro do limite oficial do porte declarado,
        // o conflito da IA é um falso positivo — remover
        const isWithinOfficialLimit = revenueRange.min <= maxRevenue;
        if (isWithinOfficialLimit) {
          console.log(`[CPIE v2] Removendo falso positivo da IA sobre porte: ${f.id} (${f.title}) — faturamento dentro do limite oficial`);
          return false;
        }
      }
    }
    return true;
  });

  // Merge de todos os conflitos
  const allConflicts: ConflictFinding[] = [
    ...deterministicConflicts,
    ...filteredAiFindings,
  ];

  // Fallback conservador: se a IA retornou aiVeto=null E aiFindings=[] (IA silenciosa)
  // mas há conflitos determinísticos high/critical, o deterministicVeto já governa.
  // Adicionalmente: se a IA retornou aiVeto=null mas há conflitos high determinísticos,
  // garantir que o consistencyScore não ultrapasse o deterministicVeto (já garantido pelo calcFinalScores).
  // Caso extremo: IA silenciosa + sem deterministicVeto + conflitos high → aplicar veto conservador de 40
  const hasHighOrCriticalDet = deterministicConflicts.some(c => c.severity === "critical" || c.severity === "high");
  // Se todos os findings da IA foram filtrados (falsos positivos), tratar como IA silenciosa
  const effectiveAiVeto = (aiResult.aiVeto === null && filteredAiFindings.length === 0 && hasHighOrCriticalDet && deterministicVeto === null)
    ? 40  // IA silenciosa sem deterministicVeto: aplicar veto conservador de 40
    // Se a IA gerou veto mas todos os seus findings foram filtrados, anular o veto da IA
    : (filteredAiFindings.length === 0 && aiResult.aiFindings.length > 0 && aiResult.aiVeto !== null)
      ? null  // Todos os findings da IA eram falsos positivos — anular veto
      : aiResult.aiVeto;

  // E5: Scores finais
  const { consistencyScore, diagnosticConfidence } = calcFinalScores(
    completenessScore,
    allConflicts,
    deterministicVeto,
    effectiveAiVeto
  );

  // Decisão de bloqueio
  const hasCriticalConflict = allConflicts.some(c => c.severity === "critical");
  const hasCompositeConflict = allConflicts.some(c => c.type === "composite" && c.severity === "critical");

  let canProceed = true;
  let blockType: CpieAnalysisResultV2["blockType"] = undefined;
  let blockReason: string | undefined = undefined;

  if (diagnosticConfidence < 15 || hasCriticalConflict) {
    canProceed = false;
    blockType = "hard_block";
    blockReason = aiResult.aiBlockReason
      || (hasCriticalConflict ? `Conflito crítico detectado: ${allConflicts.find(c => c.severity === "critical")?.title}` : undefined)
      || `Confiança diagnóstica insuficiente: ${diagnosticConfidence}% (mínimo: 15%)`;
  } else if (hasCompositeConflict || allConflicts.some(c => c.severity === "high")) {
    canProceed = false;
    blockType = "soft_block_with_override";
    blockReason = `Conflitos de alta severidade detectados. Override permitido com justificativa ≥ 50 caracteres.`;
  }

  // Coletar perguntas de reconciliação
  const reconciliationQuestions: ReconciliationQuestion[] = [
    ...aiResult.reconciliationQuestions,
    // Gerar perguntas para conflitos determinísticos críticos sem pergunta
    ...deterministicConflicts
      .filter(c => c.reconciliationRequired && c.severity === "critical")
      .map((c, i) => ({
        id: `RQ-DET-${String(i + 1).padStart(3, "0")}`,
        conflictId: c.id,
        question: `Confirme: ${c.title}. ${c.description}`,
        purpose: "Reconciliar conflito crítico detectado por regra determinística.",
        isBlocking: true,
      })),
  ];

  return {
    completenessScore,
    consistencyScore,
    diagnosticConfidence,
    inferredProfile,
    conflicts: allConflicts,
    reconciliationQuestions,
    canProceed,
    blockType,
    blockReason,
    deterministicVeto,
    aiVeto: aiResult.aiVeto,
    analysisVersion: "cpie-v2.0",
  };
}
