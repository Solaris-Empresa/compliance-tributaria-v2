/**
 * AI Schemas — Schemas Zod para validação estruturada dos outputs da IA
 * Sprint V60: schemas enriquecidos com metadata diagnóstica
 * Sprint V61: scoring financeiro + confidence score
 * Sprint V63: motor de decisão explícito
 * Bugfix V66b: normalização robusta de enums para Gemini 2.5-flash
 * Sprint C G9: validateRagOutput — safeParse com erro estruturado (não exceção)
 * Sprint C G10: fonte_risco obrigatório em RiskItemSchema (fallback tolerante)
 *
 * ESTRATÉGIA DE ROBUSTEZ:
 * - Todos os enums críticos usam z.preprocess() para normalizar antes de validar
 * - Enums com acentos usam .catch() para fallback silencioso
 * - Campos opcionais têm .default() para evitar undefined
 */
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE NORMALIZAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/** Normaliza strings de nível de risco: remove acentos, lowercase, trim */
function normalizeRiskLevel(val: unknown): unknown {
  if (typeof val !== "string") return val;
  const normalized = val.toLowerCase().trim()
    .replace(/[áàãâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòõôö]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/[ç]/g, "c");
  // Mapear variações comuns
  if (normalized === "critical" || normalized === "critico" || normalized === "crítico") return "critico";
  if (normalized === "high" || normalized === "alto") return "alto";
  if (normalized === "medium" || normalized === "medio" || normalized === "médio") return "medio";
  if (normalized === "low" || normalized === "baixo") return "baixo";
  return normalized;
}

/** Normaliza strings de impacto (sem "critico") */
function normalizeImpact(val: unknown): unknown {
  const normalized = normalizeRiskLevel(val);
  // Se retornar "critico", mapear para "alto" (fallback)
  if (normalized === "critico") return "alto";
  return normalized;
}

/** Normaliza recomendação do confidence score */
function normalizeRecomendacao(val: unknown): unknown {
  if (typeof val !== "string") return val;
  const v = val.toLowerCase().trim();
  if (v.includes("obrigat") || v.includes("alta complexidade") || v.includes("mandatory") || v.includes("required")) {
    return "Revisão obrigatória — alta complexidade regulatória";
  }
  if (v.includes("recomend") || v.includes("advogado") || v.includes("recommended") || v.includes("tributarista")) {
    return "Revisão por advogado tributarista recomendada";
  }
  // Default: diagnóstico autônomo
  return "Diagnóstico autônomo suficiente";
}

/** Normaliza urgência */
function normalizeUrgencia(val: unknown): unknown {
  if (typeof val !== "string") return val;
  const v = val.toLowerCase().trim()
    .replace(/[áàãâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòõôö]/g, "o")
    .replace(/[úùûü]/g, "u");
  if (v.includes("imediata") || v.includes("immediate") || v.includes("urgent")) return "imediata";
  if (v.includes("curto") || v.includes("short") || v.includes("30") || v.includes("60")) return "curto_prazo";
  return "medio_prazo";
}

/** Normaliza probabilidade/impacto com inicial maiúscula */
function normalizeCapitalized(val: unknown): unknown {
  if (typeof val !== "string") return val;
  const v = val.trim()
    .replace(/[áàãâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòõôö]/g, "o")
    .replace(/[úùûü]/g, "u");
  const lower = v.toLowerCase();
  if (lower.includes("alta") || lower.includes("high")) return "Alta";
  if (lower.includes("media") || lower.includes("medium")) return "Média";
  if (lower.includes("baixa") || lower.includes("low")) return "Baixa";
  return v;
}

/** Normaliza severidade */
function normalizeSeveridade(val: unknown): unknown {
  if (typeof val !== "string") return val;
  const v = val.trim()
    .replace(/[áàãâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòõôö]/g, "o")
    .replace(/[úùûü]/g, "u");
  const lower = v.toLowerCase();
  if (lower.includes("critica") || lower.includes("critico") || lower.includes("critical")) return "Crítica";
  if (lower.includes("alta") || lower.includes("high")) return "Alta";
  if (lower.includes("media") || lower.includes("medium")) return "Média";
  return "Baixa";
}

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 1: CNAEs
// ─────────────────────────────────────────────────────────────────────────────

export const CnaeItemSchema = z.object({
  code: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(100),
  justification: z.string().optional(),
});

export const CnaesResponseSchema = z.object({
  cnaes: z.array(CnaeItemSchema).min(1).max(6),
});

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2: Perguntas do Questionário
// ─────────────────────────────────────────────────────────────────────────────

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  objetivo_diagnostico: z.string().optional().default(""),
  impacto_reforma: z.string().optional().default(""),
  type: z.enum(["sim_nao", "multipla_escolha", "escala_likert", "texto_curto", "texto_longo", "selecao_unica"])
    .optional()
    .catch("sim_nao")
    .default("sim_nao"),
  peso_risco: z.preprocess(normalizeRiskLevel,
    z.enum(["baixo", "medio", "alto", "critico"]).catch("medio")
  ).optional().default("medio"),
  required: z.boolean().optional().default(true),
  options: z.union([z.array(z.string()), z.null()]).optional().transform(v => v ?? []),
  scale_labels: z.object({ min: z.string(), max: z.string() }).optional().nullable().transform(v => v ?? undefined),
  placeholder: z.string().optional().nullable().transform(v => v ?? undefined),
});

export const QuestionsResponseSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(15),
});

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 3: Briefing de Compliance
// ─────────────────────────────────────────────────────────────────────────────

export const InconsistenciaSchema = z.object({
  pergunta_origem: z.string(),
  resposta_declarada: z.string(),
  contradicao_detectada: z.string(),
  // Normalizar impacto antes de validar
  impacto: z.preprocess(normalizeImpact,
    z.enum(["baixo", "medio", "alto"]).catch("medio")
  ),
});

export const BriefingStructuredSchema = z.object({
  // Normalizar nivel_risco_geral: Gemini pode retornar "crítico" (com acento) ou "ALTO" (maiúsculo)
  nivel_risco_geral: z.preprocess(normalizeRiskLevel,
    z.enum(["baixo", "medio", "alto", "critico"]).catch("medio")
  ),
  resumo_executivo: z.string().min(50), // Reduzido de 100 para 50 — Gemini às vezes é mais conciso
  principais_gaps: z.array(z.object({
    gap: z.string(),
    causa_raiz: z.string(),
    evidencia_regulatoria: z.string().optional().default("Reforma Tributária — EC 132/2023"),
    urgencia: z.preprocess(normalizeUrgencia,
      z.enum(["imediata", "curto_prazo", "medio_prazo"]).catch("medio_prazo")
    ),
  })).min(1).max(8),
  oportunidades: z.array(z.string()).min(1).max(5),
  recomendacoes_prioritarias: z.array(z.string()).min(1).max(5), // Reduzido min de 3 para 1
  inconsistencias: z.array(InconsistenciaSchema).optional().default([]),
  confidence_score: z.object({
    nivel_confianca: z.number().min(0).max(100).catch(70),
    limitacoes: z.array(z.string()).default([]),
    // Normalizar recomendacao: Gemini não reproduz fielmente strings longas com acentos
    recomendacao: z.preprocess(normalizeRecomendacao,
      z.enum([
        "Diagnóstico autônomo suficiente",
        "Revisão por advogado tributarista recomendada",
        "Revisão obrigatória — alta complexidade regulatória",
      ]).catch("Revisão por advogado tributarista recomendada")
    ),
  }).optional().default({
    nivel_confianca: 70,
    limitacoes: [],
    recomendacao: "Revisão por advogado tributarista recomendada",
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 4: Matriz de Riscos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * G11 — FundamentacaoSchema: auditabilidade por item de risco
 * Campos calculados deterministicamente no código (não pelo LLM):
 *   - chunks_utilizados: ragCtxArea.articles.length
 *   - dispositivos: anchor_ids reais dos chunks recuperados
 *   - cobertura: derivada de chunks_utilizados (>=3 completa, 1-2 parcial, 0 insuficiente)
 *   - confiabilidade: score determinístico (1.0 / 0.7 / 0.4 / 0.0)
 * Apenas `alerta` é texto livre (preenchido pelo código, não pelo LLM).
 */
export const FundamentacaoSchema = z.object({
  chunks_utilizados: z.number().min(0),
  dispositivos: z.array(z.string()),
  cobertura: z.enum(["completa", "parcial", "insuficiente"]),
  confiabilidade: z.number().min(0).max(1),
  alerta: z.string().optional(),
});

export type Fundamentacao = z.infer<typeof FundamentacaoSchema>;

/**
 * G11 — MatrizMetadataSchema: score de confiabilidade da matriz completa
 */
export const MatrizMetadataSchema = z.object({
  total_itens: z.number().min(0),
  itens_cobertura_completa: z.number().min(0),
  itens_cobertura_parcial: z.number().min(0),
  itens_cobertura_insuficiente: z.number().min(0),
  confiabilidade_media: z.number().min(0).max(1),
  alerta_geral: z.string().optional(),
});

export type MatrizMetadata = z.infer<typeof MatrizMetadataSchema>;

/**
 * G11 — calcularFundamentacao: calcula deterministicamente a fundamentacao
 * de um item de risco com base nos chunks RAG recuperados.
 * Não usa LLM — auditabilidade real.
 */
export function calcularFundamentacao(
  articles: Array<{ anchorId?: string; lei?: string; artigo?: string }>,
  fonteRisco: string
): Fundamentacao {
  const chunksUtilizados = articles.length;
  const dispositivos = articles
    .map(a => a.anchorId)
    .filter((id): id is string => !!id);

  // Critérios de cobertura (determinísticos)
  let cobertura: "completa" | "parcial" | "insuficiente";
  let confiabilidade: number;

  if (chunksUtilizados >= 3) {
    cobertura = "completa";
    // 1.0 se fonte_risco tem referência legal específica, 0.9 caso contrário
    confiabilidade = fonteRisco !== "fonte não identificada" && fonteRisco.length > 5 ? 1.0 : 0.9;
  } else if (chunksUtilizados >= 1) {
    cobertura = "parcial";
    confiabilidade = 0.7;
  } else {
    cobertura = "insuficiente";
    confiabilidade = 0.4;
  }

  const alerta =
    cobertura === "insuficiente" || confiabilidade < 0.5
      ? "Cobertura legal insuficiente para este item. Recomenda-se revisão por especialista antes de decisão fiscal."
      : undefined;

  return { chunks_utilizados: chunksUtilizados, dispositivos, cobertura, confiabilidade, alerta };
}

/**
 * G11 — calcularMatrizMetadata: agrega os scores de todos os itens da matriz
 */
export function calcularMatrizMetadata(
  fundamentacoes: Fundamentacao[]
): MatrizMetadata {
  const total = fundamentacoes.length;
  const completa = fundamentacoes.filter(f => f.cobertura === "completa").length;
  const parcial = fundamentacoes.filter(f => f.cobertura === "parcial").length;
  const insuficiente = fundamentacoes.filter(f => f.cobertura === "insuficiente").length;
  const media = total > 0
    ? fundamentacoes.reduce((acc, f) => acc + f.confiabilidade, 0) / total
    : 0;
  const alertaGeral =
    insuficiente > 0
      ? `${insuficiente} item(ns) com cobertura legal insuficiente. Revisão por especialista recomendada.`
      : undefined;

  return {
    total_itens: total,
    itens_cobertura_completa: completa,
    itens_cobertura_parcial: parcial,
    itens_cobertura_insuficiente: insuficiente,
    confiabilidade_media: Math.round(media * 100) / 100,
    alerta_geral: alertaGeral,
  };
}

export const RiskItemSchema = z.object({
  id: z.string(),
  evento: z.string(),
  causa_raiz: z.string().optional().default(""),
  evidencia_regulatoria: z.string().optional().default("Reforma Tributária — EC 132/2023"),
  // G10: fonte_risco — rastreabilidade da origem do risco (lei + artigo)
  // Tolerante a fallback: se o LLM não retornar, usa "fonte não identificada"
  fonte_risco: z.string().optional().default("fonte não identificada"),
  probabilidade: z.preprocess(normalizeCapitalized,
    z.enum(["Baixa", "Média", "Alta"]).catch("Média")
  ),
  impacto: z.preprocess(normalizeCapitalized,
    z.enum(["Baixo", "Médio", "Alto"]).catch("Médio")
  ),
  severidade: z.preprocess(normalizeSeveridade,
    z.enum(["Baixa", "Média", "Alta", "Crítica"]).catch("Média")
  ),
  severidade_score: z.number().min(1).max(9).catch(4),
  plano_acao: z.string().optional().default(""),
  // G11: fundamentacao — calculada deterministicamente no código, não pelo LLM
  // opcional para compatibilidade retroativa com testes existentes
  fundamentacao: FundamentacaoSchema.optional(),
});

export const RisksResponseSchema = z.object({
  risks: z.array(RiskItemSchema).min(1).max(12), // Reduzido min de 3 para 1
});

// ─────────────────────────────────────────────────────────────────────────────
// G9 — validateRagOutput: safeParse com erro estruturado
// Aplica validação Zod sem propagar exceção não tratada.
// Retorna { success: true, data } ou { success: false, error, raw }
// ─────────────────────────────────────────────────────────────────────────────
export type RagValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; raw: unknown };

export function validateRagOutput<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  context: string
): RagValidationResult<T> {
  const result = schema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorSummary = result.error.issues
    .slice(0, 5)
    .map((e: { path: PropertyKey[]; message: string }) => `${String(e.path.join("."))}: ${e.message}`)
    .join(" | ");
  console.error(
    `[RAG-VALIDATION-ERROR] context=${context} errors=${errorSummary}`,
    { raw }
  );
  return { success: false, error: errorSummary, raw };
}

// ────────────────────────────────────────────────────────────────────────────────
// ETAPA 5: Plano de Ação
// V70.2: Schema fortalecido — campos obrigatórios para rastreabilidade CNAE-tarefa
// ────────────────────────────────────────────────────────────────────────────────

export const TaskItemSchema = z.object({
  id: z.string(),
  titulo: z.string().min(10, "Título deve ser descritivo"),
  descricao: z.string().min(30, "Descrição deve ser detalhada").catch("Implementar adequação ao novo regime tributário conforme LC 214/2025"),
  area: z.enum(["contabilidade", "negocio", "ti", "juridico"])
    .catch("juridico"),
  prazo_sugerido: z.enum(["30 dias", "60 dias", "90 dias"])
    .catch("60 dias"),
  prioridade: z.enum(["Alta", "Média", "Baixa"])
    .catch("Média"),
  responsavel_sugerido: z.string().min(5).catch("Equipe Tributária"),
  // V70.2: Campos obrigatórios com fallback robusto
  objetivo_diagnostico: z.string().min(15).catch("Adequar processo ao novo regime tributário IBS/CBS"),
  evidencia_regulatoria: z.string().min(5).catch("LC 214/2025"),
  // V70.2: Novos campos de rastreabilidade CNAE-tarefa
  cnae_origem: z.string().optional().default(""),
  gap_especifico: z.string().optional().default(""),
  acao_concreta: z.string().optional().default(""),
  // B2 — G12: rastreabilidade normativa da ação (anchor_id do chunk RAG de origem)
  fonte_acao: z.object({
    lei: z.string().default("não identificado"),
    artigo: z.string().default("não identificado"),
    anchor_id: z.string().default(""),
    tipo_obrigacao: z.string().default("recomendacao"),
    descricao: z.string().default("fonte não rastreada"),
  }).optional(),
});

export const TasksResponseSchema = z.object({
  tasks: z.array(TaskItemSchema).min(3).max(12),
});
// ─────────────────────────────────────────────────────────────────────────────
// SCORING GLOBAL (Sprint V61)
// ─────────────────────────────────────────────────────────────────────────────

export const ScoringDataSchema = z.object({
  score_global: z.number().min(0).max(100),
  nivel: z.preprocess(normalizeRiskLevel,
    z.enum(["baixo", "medio", "alto", "critico"]).catch("medio")
  ),
  impacto_estimado: z.string(),
  custo_inacao: z.string(),
  prioridade: z.enum(["imediata", "planejada", "monitoramento"]).catch("planejada"),
  total_riscos: z.number(),
  riscos_criticos: z.number(),
  riscos_altos: z.number(),
});

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE DECISÃO (Sprint V63)
// ─────────────────────────────────────────────────────────────────────────────

export const DecisaoRecomendadaSchema = z.object({
  acao_principal: z.string().min(10), // Reduzido de 20 para 10
  prazo_dias: z.number().min(1).max(365).catch(90),
  risco_se_nao_fazer: z.string().min(10), // Reduzido de 20 para 10
  prioridade: z.preprocess(normalizeRiskLevel,
    z.enum(["critica", "alta", "media", "baixa"]).catch("alta")
  ),
  proximos_passos: z.array(z.string()).min(1).max(3), // Reduzido min de 2 para 1
  momento_wow: z.string().optional(),
  fundamentacao_legal: z.string().optional().default("Reforma Tributária — EC 132/2023"),
});

export const DecisaoResponseSchema = z.object({
  decisao_recomendada: DecisaoRecomendadaSchema,
});
