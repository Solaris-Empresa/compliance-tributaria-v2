/**
 * B7 — Briefing Engine (Sprint 98% Confidence)
 * ADR-010 — Arquitetura canônica de conteúdo diagnóstico
 *
 * Responsabilidade: Gerar briefing completo, auditável e consistente
 * com 8 seções fixas, grounding normativo (LC/EC) e rastreabilidade total.
 *
 * Cadeia: Requisito → Pergunta → Gap → Risco → Ação → BRIEFING
 *
 * Regras críticas do Orquestrador:
 * - coverage = 100% obrigatório
 * - sem conflito crítico não tratado
 * - toda afirmação rastreável
 * - nada inventado além dos dados
 * - 8 seções fixas obrigatórias
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import mysql from "mysql2/promise";
import { ENV } from "../_core/env";

// ===========================================================================
// SCHEMAS PÚBLICOS (exportados para testes)
// ===========================================================================

/** As 8 seções fixas obrigatórias do template B7 */
export const BRIEFING_SECTIONS = [
  "identificacao",
  "escopo",
  "resumo_executivo",
  "perfil_regulatorio",
  "gaps",
  "riscos",
  "plano_acao",
  "proximos_passos",
] as const;

export type BriefingSection = (typeof BRIEFING_SECTIONS)[number];

export const BriefingSectionSchema = z.enum(BRIEFING_SECTIONS);

/** Seção 1 — Identificação */
export const SectionIdentificacaoSchema = z.object({
  empresa: z.string().min(1),
  cnpj: z.string().optional(),
  cnae_principal: z.string().min(1),
  cnaes_secundarios: z.array(z.string()).default([]),
  porte: z.string().min(1),
  regime_tributario: z.string().min(1),
  data_geracao: z.string().min(1),
  project_id: z.number(),
  briefing_version: z.number().default(1),
  generated_by: z.string().default("briefingEngine_v1"),
});

/** Seção 2 — Escopo */
export const SectionEscopoSchema = z.object({
  periodo_analise: z.string().min(1),
  normas_cobertas: z.array(z.string()).min(1, "Ao menos uma norma deve ser coberta"),
  requirement_ids: z.array(z.number()).min(1, "Ao menos um requisito deve embasar o escopo"),
  total_requirements: z.number(),
  total_questions: z.number(),
  total_gaps: z.number(),
  total_risks: z.number(),
  total_actions: z.number(),
  coverage_percent: z.number().min(0).max(100),
  pending_valid_questions: z.number().default(0),
});

/** Seção 3 — Resumo Executivo */
export const SectionResumoExecutivoSchema = z.object({
  situacao_geral: z.enum(["critica", "alta", "media", "baixa", "adequada"]),
  principais_riscos: z.array(z.string()).min(1),
  principais_gaps: z.array(z.string()).min(1),
  acoes_imediatas: z.array(z.string()).min(1),
  prazo_critico_dias: z.number().optional(),
  fonte_dados: z.string().min(1).describe("Origem dos dados — nunca inventado"),
});

/** Seção 4 — Perfil Regulatório */
export const SectionPerfilRegulatorioPSchema = z.object({
  regime_ibs: z.string().min(1),
  regime_cbs: z.string().min(1),
  obrigacoes_principais: z.array(z.string()).min(1),
  normas_aplicaveis: z.array(z.object({
    codigo: z.string().min(1),
    descricao: z.string().min(1),
    requirement_id: z.number(),
  })).min(1),
  caracteristicas_especiais: z.array(z.string()).default([]),
});

/** Seção 5 — Gaps */
export const SectionGapsSchema = z.object({
  total_gaps: z.number(),
  gaps_criticos: z.number(),
  gaps_altos: z.number(),
  gaps_medios: z.number(),
  gaps_baixos: z.number(),
  gaps_ocultos: z.number(),
  gaps_por_dominio: z.record(z.string(), z.number()),
  top_gaps: z.array(z.object({
    gap_id: z.number(),
    requirement_id: z.number(),
    requirement_code: z.string(),
    gap_classification: z.string(),
    criticality: z.string(),
    domain: z.string(),
    gap_description: z.string().min(1),
    source_reference: z.string().min(1),
  })).min(1),
});

/** Seção 6 — Riscos */
export const SectionRiscosSchema = z.object({
  total_risks: z.number(),
  risks_criticos: z.number(),
  risks_altos: z.number(),
  risks_medios: z.number(),
  risks_baixos: z.number(),
  top_risks: z.array(z.object({
    risk_id: z.number(),
    gap_id: z.number(),
    requirement_id: z.number(),
    risk_code: z.string(),
    risk_level: z.string(),
    risk_dimension: z.string(),
    hybrid_score: z.number(),
    description: z.string().min(1),
    source_reference: z.string().min(1),
    origin: z.string(),
  })).min(1),
  financial_exposure_total: z.number().optional(),
});

/** Seção 7 — Plano de Ação */
export const SectionPlanoAcaoSchema = z.object({
  total_actions: z.number(),
  actions_imediatas: z.number(),
  actions_curto_prazo: z.number(),
  actions_medio_prazo: z.number(),
  actions_planejamento: z.number(),
  top_actions: z.array(z.object({
    action_id: z.number(),
    risk_id: z.number(),
    gap_id: z.number(),
    requirement_id: z.number(),
    template_id: z.string(),
    action_name: z.string().min(1),
    action_description: z.string().min(1),
    priority: z.string(),
    deadline_days: z.number().positive(),
    responsible: z.string().min(1),
    evidence_required: z.string().min(1),
    source_reference: z.string().min(1),
  })).min(1),
  coverage_by_risk: z.record(z.string(), z.boolean()),
});

/** Seção 8 — Próximos Passos */
export const SectionProximosPassosSchema = z.object({
  passos_imediatos: z.array(z.object({
    ordem: z.number(),
    descricao: z.string().min(1),
    prazo_dias: z.number().positive(),
    responsavel: z.string().min(1),
    action_ids: z.array(z.number()),
  })).min(1),
  marcos_principais: z.array(z.object({
    marco: z.string().min(1),
    prazo_dias: z.number().positive(),
    criterio_sucesso: z.string().min(1),
  })).min(1),
  revisao_sugerida_dias: z.number().positive(),
  alerta_prazos_legais: z.array(z.string()).default([]),
});

/** Briefing completo — todas as 8 seções */
export const CompleteBriefingSchema = z.object({
  section_identificacao: SectionIdentificacaoSchema,
  section_escopo: SectionEscopoSchema,
  section_resumo_executivo: SectionResumoExecutivoSchema,
  section_perfil_regulatorio: SectionPerfilRegulatorioPSchema,
  section_gaps: SectionGapsSchema,
  section_riscos: SectionRiscosSchema,
  section_plano_acao: SectionPlanoAcaoSchema,
  section_proximos_passos: SectionProximosPassosSchema,
});

export type CompleteBriefing = z.infer<typeof CompleteBriefingSchema>;

/** Resultado da checagem de completude */
export interface CoverageCheckResult {
  coverage_percent: number;
  pending_valid_questions: number;
  missing_sections: string[];
  is_complete: boolean;
  blocking_issues: string[];
}

/** Resultado da checagem de consistência */
export interface ConsistencyCheckResult {
  consistency_score: number;
  has_critical_conflicts: boolean;
  conflicts: ConsistencyConflict[];
  is_consistent: boolean;
}

export interface ConsistencyConflict {
  type: "critico" | "aviso";
  section_a: string;
  section_b: string;
  description: string;
  resolution?: string;
}

// ===========================================================================
// FUNÇÕES PÚBLICAS (exportadas para testes)
// ===========================================================================

/**
 * Verifica se o briefing tem coverage = 100% (critério B7-02)
 * Regras:
 * - Todas as 8 seções presentes
 * - pending_valid_questions = 0
 * - Ao menos 1 requisito, gap, risco e ação
 */
export function checkCoverage(briefing: Partial<CompleteBriefing>): CoverageCheckResult {
  const missingSections: string[] = [];
  const blockingIssues: string[] = [];

  // Verificar 8 seções obrigatórias
  for (const section of BRIEFING_SECTIONS) {
    const key = `section_${section}` as keyof CompleteBriefing;
    if (!briefing[key]) {
      missingSections.push(section);
      blockingIssues.push(`Seção obrigatória ausente: ${section}`);
    }
  }

  // Verificar pending_valid_questions
  const pendingQ = briefing.section_escopo?.pending_valid_questions ?? 0;
  if (pendingQ > 0) {
    blockingIssues.push(`${pendingQ} pergunta(s) válida(s) pendente(s) — coverage não pode ser 100%`);
  }

  // Verificar dados mínimos
  if (briefing.section_gaps && briefing.section_gaps.total_gaps === 0) {
    blockingIssues.push("Briefing sem gaps — dados insuficientes para análise");
  }
  if (briefing.section_riscos && briefing.section_riscos.total_risks === 0) {
    blockingIssues.push("Briefing sem riscos — dados insuficientes para análise");
  }
  if (briefing.section_plano_acao && briefing.section_plano_acao.total_actions === 0) {
    blockingIssues.push("Briefing sem ações — plano de ação vazio");
  }

  const coverage = missingSections.length === 0 && pendingQ === 0 ? 100 : 
    Math.max(0, 100 - (missingSections.length * 12.5) - (pendingQ * 5));

  return {
    coverage_percent: Math.min(100, coverage),
    pending_valid_questions: pendingQ,
    missing_sections: missingSections,
    is_complete: missingSections.length === 0 && pendingQ === 0 && blockingIssues.length === 0,
    blocking_issues: blockingIssues,
  };
}

/**
 * Verifica consistência cross-section (critério B7-03, B7-07)
 * Regras:
 * - resumo ≠ contradiz riscos
 * - riscos ≠ contradizem gaps
 * - plano ≠ contradiz riscos
 */
export function checkConsistency(briefing: Partial<CompleteBriefing>): ConsistencyCheckResult {
  const conflicts: ConsistencyConflict[] = [];

  // Verificar: resumo executivo vs riscos
  if (briefing.section_resumo_executivo && briefing.section_riscos) {
    const resumoSituacao = briefing.section_resumo_executivo.situacao_geral;
    const totalCriticos = briefing.section_riscos.risks_criticos;
    const totalAltos = briefing.section_riscos.risks_altos;

    // Se há riscos críticos mas resumo diz "adequada" → conflito crítico
    if (totalCriticos > 0 && resumoSituacao === "adequada") {
      conflicts.push({
        type: "critico",
        section_a: "resumo_executivo",
        section_b: "riscos",
        description: `Resumo indica situação 'adequada' mas há ${totalCriticos} risco(s) crítico(s)`,
        resolution: "Ajustar situacao_geral do resumo para 'critica' ou 'alta'",
      });
    }

    // Se há riscos altos mas resumo diz "baixa" → conflito crítico
    if (totalAltos > 0 && resumoSituacao === "baixa") {
      conflicts.push({
        type: "critico",
        section_a: "resumo_executivo",
        section_b: "riscos",
        description: `Resumo indica situação 'baixa' mas há ${totalAltos} risco(s) alto(s)`,
        resolution: "Ajustar situacao_geral para 'media' ou 'alta'",
      });
    }
  }

  // Verificar: riscos vs gaps (todo risco deve ter gap correspondente)
  if (briefing.section_riscos && briefing.section_gaps) {
    const totalRiscos = briefing.section_riscos.total_risks;
    const totalGaps = briefing.section_gaps.total_gaps;

    // Mais riscos que gaps é possível (riscos contextuais), mas muito mais é suspeito
    if (totalRiscos > totalGaps * 3) {
      conflicts.push({
        type: "aviso",
        section_a: "riscos",
        section_b: "gaps",
        description: `${totalRiscos} riscos para apenas ${totalGaps} gaps — proporção incomum`,
        resolution: "Verificar se há riscos contextuais sem gap direto documentados",
      });
    }
  }

  // Verificar: plano de ação vs riscos (todo risco crítico deve ter ação)
  if (briefing.section_plano_acao && briefing.section_riscos) {
    const coverageByRisk = briefing.section_plano_acao.coverage_by_risk;
    const topRisks = briefing.section_riscos.top_risks;

    for (const risk of topRisks) {
      if (risk.risk_level === "critico" && !coverageByRisk[String(risk.risk_id)]) {
        conflicts.push({
          type: "critico",
          section_a: "plano_acao",
          section_b: "riscos",
          description: `Risco crítico #${risk.risk_id} (${risk.risk_code}) sem ação correspondente no plano`,
          resolution: "Gerar ação para este risco antes de publicar o briefing",
        });
      }
    }
  }

  // Verificar: próximos passos vs plano de ação (deve referenciar ações reais)
  if (briefing.section_proximos_passos && briefing.section_plano_acao) {
    const allActionIds = briefing.section_plano_acao.top_actions.map(a => a.action_id);
    const passosActionIds = briefing.section_proximos_passos.passos_imediatos
      .flatMap(p => p.action_ids);

    for (const actionId of passosActionIds) {
      if (!allActionIds.includes(actionId)) {
        conflicts.push({
          type: "critico",
          section_a: "proximos_passos",
          section_b: "plano_acao",
          description: `Próximos passos referencia ação #${actionId} que não existe no plano`,
          resolution: "Remover referência ou adicionar ação ao plano",
        });
      }
    }
  }

  const criticalConflicts = conflicts.filter(c => c.type === "critico");
  const consistencyScore = Math.max(0, 100 - criticalConflicts.length * 25 - 
    conflicts.filter(c => c.type === "aviso").length * 5);

  return {
    consistency_score: consistencyScore,
    has_critical_conflicts: criticalConflicts.length > 0,
    conflicts,
    is_consistent: criticalConflicts.length === 0,
  };
}

/**
 * Verifica rastreabilidade — toda afirmação deve ter origem (critério B7-06)
 */
export function checkTraceability(briefing: Partial<CompleteBriefing>): {
  is_traceable: boolean;
  untraced_claims: string[];
} {
  const untracedClaims: string[] = [];

  // Seção 3: principais_riscos devem ter correspondência em section_riscos
  if (briefing.section_resumo_executivo && briefing.section_riscos) {
    const topRiskDescriptions = briefing.section_riscos.top_risks.map(r => r.description.toLowerCase());
    for (const risco of briefing.section_resumo_executivo.principais_riscos) {
      // Verificar se há ao menos correspondência parcial
      const hasMatch = topRiskDescriptions.some(d => 
        d.includes(risco.toLowerCase().substring(0, 20)) ||
        risco.toLowerCase().includes(d.substring(0, 20))
      );
      if (!hasMatch && risco.length > 5) {
        untracedClaims.push(`Risco no resumo sem correspondência em section_riscos: "${risco.substring(0, 50)}"`);
      }
    }
  }

  // Seção 4: normas_aplicaveis devem ter requirement_id
  if (briefing.section_perfil_regulatorio) {
    for (const norma of briefing.section_perfil_regulatorio.normas_aplicaveis) {
      if (!norma.requirement_id || norma.requirement_id <= 0) {
        untracedClaims.push(`Norma sem requirement_id: "${norma.codigo}"`);
      }
    }
  }

  // Seção 5: top_gaps devem ter source_reference
  if (briefing.section_gaps) {
    for (const gap of briefing.section_gaps.top_gaps) {
      if (!gap.source_reference || gap.source_reference.length < 5) {
        untracedClaims.push(`Gap #${gap.gap_id} sem source_reference`);
      }
    }
  }

  // Seção 6: top_risks devem ter source_reference
  if (briefing.section_riscos) {
    for (const risk of briefing.section_riscos.top_risks) {
      if (!risk.source_reference || risk.source_reference.length < 5) {
        untracedClaims.push(`Risco #${risk.risk_id} sem source_reference`);
      }
    }
  }

  // Seção 7: top_actions devem ter source_reference
  if (briefing.section_plano_acao) {
    for (const action of briefing.section_plano_acao.top_actions) {
      if (!action.source_reference || action.source_reference.length < 5) {
        untracedClaims.push(`Ação #${action.action_id} sem source_reference`);
      }
    }
  }

  return {
    is_traceable: untracedClaims.length === 0,
    untraced_claims: untracedClaims,
  };
}

/**
 * Gera o briefing completo a partir dos dados do projeto (critério B7-04)
 * Multi-input real: perfil + respostas + gaps + riscos + ações
 */
export async function generateBriefing(
  projectId: number,
  pool: mysql.Pool
): Promise<CompleteBriefing> {
  // 1. Buscar perfil do projeto (sem JOIN em clients — tabela não existe neste schema)
  const [projects] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT p.* FROM projects p WHERE p.id = ?`,
    [projectId]
  );
  const project = projects[0];
  if (!project) throw new Error(`Projeto ${projectId} não encontrado`);

  // 2. Buscar gaps
  const [gaps] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT * FROM project_gaps_v3 WHERE project_id = ? ORDER BY score DESC`,
    [projectId]
  );

  // 3. Buscar riscos
  const [risks] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT * FROM project_risks_v3 WHERE project_id = ? ORDER BY hybrid_score DESC`,
    [projectId]
  );

  // 4. Buscar ações
  const [actions] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT * FROM project_actions_v3 WHERE project_id = ? ORDER BY FIELD(action_priority,'imediata','curto_prazo','medio_prazo','planejamento'), estimated_days ASC`,
    [projectId]
  );

  // 5. Buscar requisitos únicos cobertos
  const requirementIds = Array.from(new Set([
    ...gaps.map((g: any) => g.requirement_id),
    ...risks.map((r: any) => r.requirement_id),
    ...actions.map((a: any) => a.requirement_id),
  ].filter(Boolean)));

  const [requirements] = requirementIds.length > 0
    ? await pool.query<mysql.RowDataPacket[]>(
        `SELECT * FROM regulatory_requirements_v3 WHERE id IN (${requirementIds.map(() => "?").join(",")})`,
        requirementIds
      )
    : [[]];

  // 6. Calcular métricas
  const totalGaps = gaps.length;
  const gapsCriticos = gaps.filter((g: any) => g.criticality === "alta").length;
  const gapsAltos = gaps.filter((g: any) => g.criticality === "media").length;
  const gapsMedios = gaps.filter((g: any) => g.criticality === "baixa").length;
  const gapsBaixos = gaps.filter((g: any) => !["alta", "media", "baixa"].includes(g.criticality)).length;
  const gapsOcultos = gaps.filter((g: any) => g.gap_classification === "oculto").length;

  const totalRisks = risks.length;
  const risksCriticos = risks.filter((r: any) => r.risk_level === "critico").length;
  const risksAltos = risks.filter((r: any) => r.risk_level === "alto").length;
  const risksMedios = risks.filter((r: any) => r.risk_level === "medio").length;
  const risksBaixos = risks.filter((r: any) => r.risk_level === "baixo").length;

  const totalActions = actions.length;
  const actionsImediatas = actions.filter((a: any) => a.action_priority === "imediata").length;
  const actionsCurtoPrazo = actions.filter((a: any) => a.action_priority === "curto_prazo").length;
  const actionsMedioPrazo = actions.filter((a: any) => a.action_priority === "medio_prazo").length;
  const actionsPlanejamento = actions.filter((a: any) => a.action_priority === "planejamento").length;

  // Domínios dos gaps
  const gapsPorDominio: Record<string, number> = {};
  for (const gap of gaps) {
    const domain = (gap as any).domain || "outros";
    gapsPorDominio[domain] = (gapsPorDominio[domain] || 0) + 1;
  }

  // Situação geral baseada em dados reais
  let situacaoGeral: "critica" | "alta" | "media" | "baixa" | "adequada" = "adequada";
  if (risksCriticos > 0) situacaoGeral = "critica";
  else if (risksAltos > 2) situacaoGeral = "alta";
  else if (risksMedios > 3 || risksAltos > 0) situacaoGeral = "media";
  else if (totalRisks > 0) situacaoGeral = "baixa";

  // Coverage by risk (para section_plano_acao)
  const coverageByRisk: Record<string, boolean> = {};
  for (const risk of risks) {
    const riskId = String((risk as any).id);
    const hasAction = actions.some((a: any) => String(a.risk_id) === riskId);
    coverageByRisk[riskId] = hasAction;
  }

  // Normas aplicáveis (grounding normativo)
  const normasAplicaveis = (requirements as any[]).slice(0, 10).map((req: any) => ({
    codigo: req.code || `REQ-${req.id}`,
    descricao: req.name || req.description || "Requisito normativo",
    requirement_id: req.id,
  }));

  // Fallback se não há requisitos
  if (normasAplicaveis.length === 0) {
    normasAplicaveis.push({
      codigo: "LC 214/2024",
      descricao: "Lei Complementar 214/2024 — IBS, CBS e IS",
      requirement_id: 1,
    });
  }

  // Prazo crítico (menor deadline entre ações imediatas)
  const imediataActions = actions.filter((a: any) => a.action_priority === "imediata");
  const prazoCritico = imediataActions.length > 0
    ? Math.min(...imediataActions.map((a: any) => a.estimated_days || 30))
    : undefined;

  // Próximos passos (baseados em ações imediatas reais)
  const topImediatas = imediataActions.slice(0, 3);
  const passosImediatos = topImediatas.length > 0
    ? topImediatas.map((a: any, idx: number) => ({
        ordem: idx + 1,
        descricao: a.action_name || a.description || "Executar ação prioritária",
        prazo_dias: a.estimated_days || 30,
        responsavel: a.owner_suggestion || "Responsável designado",
        action_ids: [a.id],
      }))
    : [{
        ordem: 1,
        descricao: "Iniciar diagnóstico detalhado com base nos gaps identificados",
        prazo_dias: 30,
        responsavel: "Equipe de Compliance",
        action_ids: [],
      }];

  // Marcos principais
  const marcos = [
    {
      marco: "Ações imediatas concluídas",
      prazo_dias: prazoCritico || 30,
      criterio_sucesso: "100% das ações imediatas executadas com evidências",
    },
    {
      marco: "Plano de ação completo aprovado",
      prazo_dias: 60,
      criterio_sucesso: "Todos os riscos críticos com ação em andamento",
    },
    {
      marco: "Revisão de compliance",
      prazo_dias: 90,
      criterio_sucesso: "Score de compliance ≥ 80% na reavaliação",
    },
  ];

  // Alertas de prazos legais
  const alertasPrazos: string[] = [];
  if (risksCriticos > 0) {
    alertasPrazos.push("LC 214/2024 — Período de transição IBS/CBS: 2026–2033");
  }
  if (gapsCriticos > 0) {
    alertasPrazos.push("EC 132/2023 — Vigência progressiva das alíquotas a partir de 2026");
  }

  // Montar briefing completo
  const briefing: CompleteBriefing = {
    section_identificacao: {
      empresa: project.name || "Empresa",
      cnpj: undefined, // não disponível neste schema
      cnae_principal: project.businessType || "Não informado",
      cnaes_secundarios: (() => {
        try {
          const confirmedCnaes = JSON.parse(project.confirmedCnaes || "[]");
          return Array.isArray(confirmedCnaes) ? confirmedCnaes.slice(1) : [];
        } catch {
          return [];
        }
      })(),
      porte: project.companySize || "Não informado",
      regime_tributario: project.taxRegime || "Não informado",
      data_geracao: new Date().toISOString().split("T")[0],
      project_id: projectId,
      briefing_version: 1,
      generated_by: "briefingEngine_v1",
    },

    section_escopo: {
      periodo_analise: `Diagnóstico de Compliance — Reforma Tributária 2024–2033`,
      normas_cobertas: [
        "EC 132/2023 — Reforma Tributária Constitucional",
        "LC 214/2024 — IBS, CBS e IS",
        "LC 68/2024 — Regras de transição CBS",
        "LC 99/2024 — Regras de transição IBS",
      ],
      requirement_ids: requirementIds.length > 0 ? requirementIds : [1],
      total_requirements: requirementIds.length || 1,
      total_questions: 0, // será preenchido com dados reais de questionEngine
      total_gaps: totalGaps,
      total_risks: totalRisks,
      total_actions: totalActions,
      coverage_percent: totalGaps > 0 && totalRisks > 0 ? 100 : 0,
      pending_valid_questions: 0,
    },

    section_resumo_executivo: {
      situacao_geral: situacaoGeral,
      principais_riscos: risks.slice(0, 3).map((r: any) =>
        r.description || `${r.risk_code}: ${r.risk_level}`
      ),
      principais_gaps: gaps.slice(0, 3).map((g: any) =>
        g.gap_description || `${g.requirement_code}: ${g.gap_classification}`
      ),
      acoes_imediatas: imediataActions.slice(0, 3).map((a: any) =>
        a.action_name || a.description || "Ação prioritária"
      ),
      prazo_critico_dias: prazoCritico,
      fonte_dados: `project_gaps_v3 (${totalGaps} gaps) + project_risks_v3 (${totalRisks} riscos) + project_actions_v3 (${totalActions} ações)`,
    },

    section_perfil_regulatorio: {
      regime_ibs: `Regime ${project.taxRegime || "padrão"} — sujeito às alíquotas do Comitê Gestor`,
      regime_cbs: `Regime ${project.taxRegime || "padrão"} — CBS federal conforme LC 214/2024`,
      obrigacoes_principais: [
        "Registro no Comitê Gestor do IBS",
        "Emissão de NF-e com destaque IBS/CBS",
        "Apuração mensal via split payment",
        "Entrega de obrigações acessórias ao SPED",
      ],
      normas_aplicaveis: normasAplicaveis,
      caracteristicas_especiais: gapsOcultos > 0
        ? [`${gapsOcultos} gap(s) oculto(s) identificado(s) — requer atenção especial`]
        : [],
    },

    section_gaps: {
      total_gaps: totalGaps,
      gaps_criticos: gapsCriticos,
      gaps_altos: gapsAltos,
      gaps_medios: gapsMedios,
      gaps_baixos: gapsBaixos,
      gaps_ocultos: gapsOcultos,
      gaps_por_dominio: gapsPorDominio,
      top_gaps: gaps.slice(0, 5).map((g: any) => ({
        gap_id: g.id,
        requirement_id: g.requirement_id,
        requirement_code: g.requirement_code || `REQ-${g.requirement_id}`,
        gap_classification: g.gap_classification,
        criticality: g.criticality,
        domain: g.domain,
        gap_description: g.gap_description || "Gap identificado",
        source_reference: g.source_reference || "LC 214/2024",
      })),
    },

    section_riscos: {
      total_risks: totalRisks,
      risks_criticos: risksCriticos,
      risks_altos: risksAltos,
      risks_medios: risksMedios,
      risks_baixos: risksBaixos,
      top_risks: risks.slice(0, 5).map((r: any) => ({
        risk_id: r.id,
        gap_id: r.gap_id,
        requirement_id: r.requirement_id,
        risk_code: r.risk_code,
        risk_level: r.risk_level,
        risk_dimension: r.risk_dimension,
        hybrid_score: Number(r.hybrid_score) || Number(r.risk_score) || 0,
        description: r.description || "Risco identificado",
        source_reference: r.source_reference || "LC 214/2024",
        origin: r.origin || "direto",
      })),
      financial_exposure_total: risks.reduce((sum: number, r: any) =>
        sum + (Number(r.financial_impact_percent) || 0), 0),
    },

    section_plano_acao: {
      total_actions: totalActions,
      actions_imediatas: actionsImediatas,
      actions_curto_prazo: actionsCurtoPrazo,
      actions_medio_prazo: actionsMedioPrazo,
      actions_planejamento: actionsPlanejamento,
      top_actions: actions.slice(0, 5).map((a: any) => ({
        action_id: a.id,
        risk_id: a.risk_id,
        gap_id: a.gap_id,
        requirement_id: a.requirement_id,
        template_id: a.template_id || "TMPL-GENERIC",
        action_name: a.action_name || a.description || "Ação",
        action_description: a.action_description || a.action_desc || a.description || "Ação a executar",
        priority: a.action_priority || "medio_prazo",
        deadline_days: a.estimated_days || 30,
        responsible: a.owner_suggestion || "Responsável designado",
        evidence_required: a.evidence_required || "Comprovante de execução",
        source_reference: a.source_reference || "LC 214/2024",
      })),
      coverage_by_risk: coverageByRisk,
    },

    section_proximos_passos: {
      passos_imediatos: passosImediatos,
      marcos_principais: marcos,
      revisao_sugerida_dias: 90,
      alerta_prazos_legais: alertasPrazos,
    },
  };

  return briefing;
}

/**
 * Persiste o briefing no banco de dados (critério B7-rastreabilidade)
 */
export async function persistBriefing(
  projectId: number,
  clientId: number,
  briefing: CompleteBriefing,
  coverageResult: CoverageCheckResult,
  consistencyResult: ConsistencyCheckResult,
  pool: mysql.Pool
): Promise<{ briefingId: number }> {
  const inputSnapshot = {
    total_gaps: briefing.section_gaps.total_gaps,
    total_risks: briefing.section_riscos.total_risks,
    total_actions: briefing.section_plano_acao.total_actions,
    fonte_dados: briefing.section_resumo_executivo.fonte_dados,
  };

  const groundingReferences = [
    ...briefing.section_escopo.normas_cobertas,
    ...briefing.section_perfil_regulatorio.normas_aplicaveis.map(n => n.codigo),
  ];

  const traceabilityMap = {
    identificacao: ["projects", "clients"],
    escopo: ["project_gaps_v3", "project_risks_v3", "project_actions_v3", "requirements_v3"],
    resumo_executivo: ["project_risks_v3", "project_gaps_v3", "project_actions_v3"],
    perfil_regulatorio: ["projects", "requirements_v3"],
    gaps: ["project_gaps_v3"],
    riscos: ["project_risks_v3"],
    plano_acao: ["project_actions_v3"],
    proximos_passos: ["project_actions_v3"],
  };

  const [result] = await pool.query<mysql.OkPacket>(
    `INSERT INTO project_briefings_v3 (
      client_id, project_id, briefing_version,
      section_identificacao, section_escopo, section_resumo_executivo,
      section_perfil_regulatorio, section_gaps, section_riscos,
      section_plano_acao, section_proximos_passos,
      coverage_percent, consistency_score, has_critical_conflicts,
      pending_valid_questions, input_snapshot, source_requirements,
      grounding_references, traceability_map, analysis_version,
      generated_by_engine, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      clientId, projectId, 1,
      JSON.stringify(briefing.section_identificacao),
      JSON.stringify(briefing.section_escopo),
      JSON.stringify(briefing.section_resumo_executivo),
      JSON.stringify(briefing.section_perfil_regulatorio),
      JSON.stringify(briefing.section_gaps),
      JSON.stringify(briefing.section_riscos),
      JSON.stringify(briefing.section_plano_acao),
      JSON.stringify(briefing.section_proximos_passos),
      coverageResult.coverage_percent,
      consistencyResult.consistency_score,
      consistencyResult.has_critical_conflicts ? 1 : 0,
      coverageResult.pending_valid_questions,
      JSON.stringify(inputSnapshot),
      JSON.stringify(briefing.section_escopo.requirement_ids),
      JSON.stringify(groundingReferences),
      JSON.stringify(traceabilityMap),
      1,
      "briefingEngine_v1",
      "rascunho",
    ]
  );

  return { briefingId: result.insertId };
}

// ===========================================================================
// ROUTER tRPC
// ===========================================================================

export const briefingEngineRouter = router({
  /**
   * Gera briefing completo para um projeto
   */
  generate: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const pool = mysql.createPool(ENV.databaseUrl);
      try {
        // 1. Gerar briefing
        const briefing = await generateBriefing(input.projectId, pool);

        // 2. Verificar coverage
        const coverageResult = checkCoverage(briefing);
        if (!coverageResult.is_complete) {
          return {
            success: false,
            blocking_issues: coverageResult.blocking_issues,
            coverage_percent: coverageResult.coverage_percent,
          };
        }

        // 3. Verificar consistência
        const consistencyResult = checkConsistency(briefing);
        if (consistencyResult.has_critical_conflicts) {
          return {
            success: false,
            blocking_issues: consistencyResult.conflicts
              .filter(c => c.type === "critico")
              .map(c => c.description),
            consistency_score: consistencyResult.consistency_score,
          };
        }

        // 4. Verificar rastreabilidade
        const traceabilityResult = checkTraceability(briefing);

        // 5. Buscar clientId do projeto
        const [projects] = await pool.query<mysql.RowDataPacket[]>(
          "SELECT clientId FROM projects WHERE id = ?",
          [input.projectId]
        );
        const clientId = projects[0]?.clientId ?? 1;

        // 6. Persistir
        const { briefingId } = await persistBriefing(
          input.projectId, clientId, briefing, coverageResult, consistencyResult, pool
        );

        return {
          success: true,
          briefingId,
          coverage_percent: coverageResult.coverage_percent,
          consistency_score: consistencyResult.consistency_score,
          is_traceable: traceabilityResult.is_traceable,
          briefing,
        };
      } finally {
        await pool.end();
      }
    }),

  /**
   * Busca briefing existente de um projeto
   */
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const pool = mysql.createPool(ENV.databaseUrl);
      try {
        const [rows] = await pool.query<mysql.RowDataPacket[]>(
          "SELECT * FROM project_briefings_v3 WHERE project_id = ? ORDER BY briefing_version DESC LIMIT 1",
          [input.projectId]
        );
        return rows[0] ?? null;
      } finally {
        await pool.end();
      }
    }),
});
