/**
 * AI Schemas — Schemas Zod para validação estruturada dos outputs da IA
 * Sprint V60: schemas enriquecidos com metadata diagnóstica
 * Sprint V61: scoring financeiro + confidence score
 * Sprint V63: motor de decisão explícito
 */
import { z } from "zod";

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
  objetivo_diagnostico: z.string().describe("O que esta pergunta diagnostica"),
  impacto_reforma: z.string().describe("Como a resposta impacta o compliance com a Reforma Tributária"),
  type: z.enum(["sim_nao", "multipla_escolha", "escala_likert", "texto_curto", "texto_longo", "selecao_unica"]),
  peso_risco: z.enum(["baixo", "medio", "alto", "critico"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  scale_labels: z.object({ min: z.string(), max: z.string() }).optional(),
  placeholder: z.string().optional(),
});

export const QuestionsResponseSchema = z.object({
  questions: z.array(QuestionSchema).min(3).max(12),
});

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 3: Briefing de Compliance
// ─────────────────────────────────────────────────────────────────────────────

export const InconsistenciaSchema = z.object({
  pergunta_origem: z.string(),
  resposta_declarada: z.string(),
  contradicao_detectada: z.string(),
  impacto: z.enum(["baixo", "medio", "alto"]),
});

export const BriefingStructuredSchema = z.object({
  nivel_risco_geral: z.enum(["baixo", "medio", "alto", "critico"]),
  resumo_executivo: z.string().min(100),
  principais_gaps: z.array(z.object({
    gap: z.string(),
    causa_raiz: z.string(),
    evidencia_regulatoria: z.string().describe("Artigo ou dispositivo legal que fundamenta o gap"),
    urgencia: z.enum(["imediata", "curto_prazo", "medio_prazo"]),
  })).min(1).max(8),
  oportunidades: z.array(z.string()).min(1).max(5),
  recomendacoes_prioritarias: z.array(z.string()).min(3).max(5),
  inconsistencias: z.array(InconsistenciaSchema).optional(),
  confidence_score: z.object({
    nivel_confianca: z.number().min(0).max(100),
    limitacoes: z.array(z.string()),
    recomendacao: z.enum([
      "Diagnóstico autônomo suficiente",
      "Revisão por advogado tributarista recomendada",
      "Revisão obrigatória — alta complexidade regulatória",
    ]),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 4: Matriz de Riscos
// ─────────────────────────────────────────────────────────────────────────────

export const RiskItemSchema = z.object({
  id: z.string(),
  evento: z.string(),
  causa_raiz: z.string().describe("Causa raiz do risco"),
  evidencia_regulatoria: z.string().describe("Artigo ou dispositivo legal que fundamenta o risco"),
  probabilidade: z.enum(["Baixa", "Média", "Alta"]),
  impacto: z.enum(["Baixo", "Médio", "Alto"]),
  severidade: z.enum(["Baixa", "Média", "Alta", "Crítica"]),
  severidade_score: z.number().min(1).max(9).describe("Score numérico: Baixa=1-3, Média=4-6, Alta=7-8, Crítica=9"),
  plano_acao: z.string(),
});

export const RisksResponseSchema = z.object({
  risks: z.array(RiskItemSchema).min(3).max(12),
});

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 5: Plano de Ação
// ─────────────────────────────────────────────────────────────────────────────

export const TaskItemSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  area: z.enum(["contabilidade", "negocio", "ti", "juridico"]),
  prazo_sugerido: z.enum(["30 dias", "60 dias", "90 dias"]),
  prioridade: z.enum(["Alta", "Média", "Baixa"]),
  responsavel_sugerido: z.string(),
  objetivo_diagnostico: z.string().describe("Qual gap ou risco esta tarefa endereça"),
  evidencia_regulatoria: z.string().describe("Base legal que justifica a tarefa"),
});

export const TasksResponseSchema = z.object({
  tasks: z.array(TaskItemSchema).min(3).max(10),
});

// ─────────────────────────────────────────────────────────────────────────────
// SCORING GLOBAL (Sprint V61)
// ─────────────────────────────────────────────────────────────────────────────

export const ScoringDataSchema = z.object({
  score_global: z.number().min(0).max(100),
  nivel: z.enum(["baixo", "medio", "alto", "critico"]),
  impacto_estimado: z.string(),
  custo_inacao: z.string(),
  prioridade: z.enum(["imediata", "planejada", "monitoramento"]),
  total_riscos: z.number(),
  riscos_criticos: z.number(),
  riscos_altos: z.number(),
});

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE DECISÃO (Sprint V63)
// ─────────────────────────────────────────────────────────────────────────────

export const DecisaoRecomendadaSchema = z.object({
  acao_principal: z.string().min(20),
  prazo_dias: z.number().min(1).max(365),
  risco_se_nao_fazer: z.string().min(20),
  prioridade: z.enum(["critica", "alta", "media", "baixa"]),
  proximos_passos: z.array(z.string()).min(2).max(3),
  momento_wow: z.string().optional().describe("Insight inesperado que surpreende o cliente"),
  fundamentacao_legal: z.string().describe("Base legal que fundamenta a decisão"),
});

export const DecisaoResponseSchema = z.object({
  decisao_recomendada: DecisaoRecomendadaSchema,
});
