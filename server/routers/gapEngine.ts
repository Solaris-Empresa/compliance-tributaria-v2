/**
 * B4 — Gap Engine
 * Classifica gaps por tipo (ausência/parcial/inadequado), calcula evaluation_confidence,
 * deriva gap de requisito (não de CNAE), e registra logs de decisão.
 *
 * Princípios ADR-010:
 * - Gap deriva de requisito (requirement_id obrigatório)
 * - gap_classification: ausencia | parcial | inadequado
 * - evaluation_confidence: 0.0–1.0 obrigatório
 * - Fonte normativa rastreável (source_reference)
 * - Gap sem requisito = impossível
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";
// M3.8-2: estrutura UnifiedAnswer + extractRequirementId determinístico para service_answers padrão idN
import {
  normalizeServiceAnswers,
  groupByRequirement,
  resolveAnswer,
  type UnifiedAnswer,
  type ServiceAnswerInput,
} from "../lib/unified-answer";
import { getServiceAnswersForProject } from "../db";

// ---------------------------------------------------------------------------
// Tipos e schemas
// ---------------------------------------------------------------------------

export const GapClassificationSchema = z.enum(["ausencia", "parcial", "inadequado"]);
export type GapClassification = z.infer<typeof GapClassificationSchema>;

// M3.8-1A — fontes possíveis de uma resposta que origina o gap
// "regulatory_only" = sem resposta (gap criado pela ausência do requisito ser atendido)
export const QuestionSourceSchema = z.enum([
  "qnbs_regulatorio",   // service_answers padrão idN (Q.NBS regulatório)
  "qnbs_solaris",       // service_answers padrão SOL-XXX (Q.NBS solaris)
  "solaris_onda1",      // solaris_answers (Onda 1)
  "iagen_onda2",        // iagen_answers (Onda 2)
  "qcnae_onda3",        // questionnaireAnswersV3 (Q.CNAE Onda 3 LLM)
  "regulatory_only",    // sem resposta — gap por ausência
]);
export type QuestionSource = z.infer<typeof QuestionSourceSchema>;

export const GapSchema = z.object({
  requirement_id: z.string().min(1),          // OBRIGATÓRIO — ADR-010 ponto inviolável
  requirement_name: z.string().min(1),
  source_reference: z.string().min(1),        // EC 132 Art. X / LC 214 Art. Y
  domain: z.string().min(1),
  layer: z.enum(["corporativo", "operacional", "cnae"]),
  gap_classification: GapClassificationSchema, // ausencia | parcial | inadequado
  gap_type: z.enum(["normativo", "processo", "sistema", "cadastro", "contrato", "financeiro", "acessorio"]),
  compliance_status: z.enum(["atendido", "parcialmente_atendido", "nao_atendido", "nao_aplicavel"]),
  criticality: z.enum(["baixa", "media", "alta", "critica"]),
  evidence_status: z.enum(["completa", "parcial", "ausente"]),
  gap_description: z.string().min(1),
  deterministic_reason: z.string().min(1),
  evaluation_confidence: z.number().min(0).max(1),   // OBRIGATÓRIO — ADR-010
  evaluation_confidence_reason: z.string().min(1),   // OBRIGATÓRIO — ADR-010
  question_id: z.number().int().nullable(),
  answer_value: z.string().nullable(),
  score: z.number().min(0).max(100),
  risk_level: z.enum(["baixo", "medio", "alto", "critico"]),
  priority_score: z.number().min(0).max(100),
  action_priority: z.enum(["imediata", "curto_prazo", "medio_prazo", "planejamento"]),
  estimated_days: z.number().int().min(1),
  recommended_actions: z.string(),
  // B-Z13-004: risk_category_code propagado do regulatory_requirements_v3
  risk_category_code: z.string().nullable().optional(),
  // M3.8-1A: fonte da resposta que originou o gap (ou "regulatory_only" para gap sem resposta)
  question_source: QuestionSourceSchema,
});

export type Gap = z.infer<typeof GapSchema>;

export interface GapEngineResult {
  project_id: number;
  total_requirements_evaluated: number;
  total_gaps_found: number;
  gaps_by_classification: {
    ausencia: number;
    parcial: number;
    inadequado: number;
  };
  gaps_by_criticality: {
    critica: number;
    alta: number;
    media: number;
    baixa: number;
  };
  avg_evaluation_confidence: number;
  gaps: Gap[];
  decision_log: GapDecisionLog[];
}

export interface GapDecisionLog {
  requirement_id: string;
  requirement_name: string;
  answer_value: string | null;
  gap_found: boolean;
  gap_classification: GapClassification | null;
  evaluation_confidence: number;
  decision_reason: string;
  compliance_status: string;
}

// ---------------------------------------------------------------------------
// Lógica determinística de classificação de gap
// ---------------------------------------------------------------------------

/**
 * Classifica o gap com base na resposta e no tipo de requisito.
 * Retorna null se não há gap (atendido).
 */
function classifyGap(
  answerValue: string | null,
  complianceStatus: string,
  evidenceStatus: string
): { classification: GapClassification | null; confidence: number; reason: string } {
  // Sem resposta = ausência total
  if (!answerValue || answerValue.trim() === "" || answerValue === "nao_respondido") {
    return {
      classification: "ausencia",
      confidence: 0.95,
      reason: "Requisito sem resposta registrada — ausência total de evidência",
    };
  }

  const answer = answerValue.toLowerCase().trim();

  // Atendido completo
  if (
    complianceStatus === "atendido" &&
    evidenceStatus === "completa" &&
    (answer === "sim" || answer === "yes" || answer === "atendido" || answer === "completo")
  ) {
    return {
      classification: null,
      confidence: 0.97,
      reason: "Requisito atendido com evidência completa — sem gap",
    };
  }

  // Não aplicável
  if (complianceStatus === "nao_aplicavel" || answer === "nao_aplicavel" || answer === "n/a") {
    return {
      classification: null,
      confidence: 0.90,
      reason: "Requisito não aplicável ao perfil da empresa — sem gap",
    };
  }

  // Ausência: não atendido + sem evidência
  if (
    complianceStatus === "nao_atendido" &&
    (evidenceStatus === "ausente" || answer === "nao" || answer === "não" || answer === "no")
  ) {
    return {
      classification: "ausencia",
      confidence: 0.93,
      reason: "Requisito não atendido e sem evidência — ausência total",
    };
  }

  // Inadequado: tem evidência mas não atende o requisito
  if (
    complianceStatus === "nao_atendido" &&
    evidenceStatus !== "ausente"
  ) {
    return {
      classification: "inadequado",
      confidence: 0.85,
      reason: "Evidência presente mas não atende o requisito normativo — inadequado",
    };
  }

  // Parcial: parcialmente atendido
  if (
    complianceStatus === "parcialmente_atendido" ||
    evidenceStatus === "parcial" ||
    answer.includes("parcial") ||
    answer.includes("em andamento") ||
    answer.includes("em progresso")
  ) {
    return {
      classification: "parcial",
      confidence: 0.88,
      reason: "Requisito parcialmente atendido — implementação incompleta",
    };
  }

  // Default: ausência quando não há clareza
  return {
    classification: "ausencia",
    confidence: 0.70,
    reason: "Classificação por default — resposta ambígua, tratada como ausência",
  };
}

/**
 * Calcula score do gap baseado em criticidade, evidência e classification.
 */
function calculateGapScore(
  criticality: string,
  evidenceStatus: string,
  classification: GapClassification
): { score: number; riskLevel: string; priorityScore: number; actionPriority: string; estimatedDays: number } {
  const criticalityWeight = { critica: 40, alta: 30, media: 20, baixa: 10 };
  const evidenceWeight = { ausente: 30, parcial: 15, completa: 0 };
  const classificationWeight = { ausencia: 30, parcial: 20, inadequado: 25 };

  const score = Math.min(100,
    (criticalityWeight[criticality as keyof typeof criticalityWeight] ?? 20) +
    (evidenceWeight[evidenceStatus as keyof typeof evidenceWeight] ?? 15) +
    (classificationWeight[classification] ?? 20)
  );

  let riskLevel: string;
  let actionPriority: string;
  let estimatedDays: number;

  if (score >= 80) {
    riskLevel = "critico";
    actionPriority = "imediata";
    estimatedDays = 15;
  } else if (score >= 60) {
    riskLevel = "alto";
    actionPriority = "curto_prazo";
    estimatedDays = 30;
  } else if (score >= 40) {
    riskLevel = "medio";
    actionPriority = "medio_prazo";
    estimatedDays = 60;
  } else {
    riskLevel = "baixo";
    actionPriority = "planejamento";
    estimatedDays = 90;
  }

  return { score, riskLevel, priorityScore: score, actionPriority, estimatedDays };
}

// ---------------------------------------------------------------------------
// Router B4
// ---------------------------------------------------------------------------

export const gapEngineRouter = router({
  /**
   * Analisa as respostas de um projeto e classifica os gaps.
   * OBRIGATÓRIO: requirement_id em cada gap.
   */
  analyzeGaps: protectedProcedure
    .input(
      z.object({
        project_id: z.number().int().positive(),
        dry_run: z.boolean().default(false), // true = não persiste, só retorna análise
      })
    )
    .mutation(async ({ input, ctx }): Promise<GapEngineResult> => {
      const pool = mysql.createPool(process.env.DATABASE_URL ?? "");

      try {
        // 1. Buscar projeto
        // M3 NOVA-04: SELECT estendido com `archetype` para enriquecer gap_description.
        const [[project]] = await pool.query<mysql.RowDataPacket[]>(
          "SELECT id, name, status, clientId, archetype FROM projects WHERE id = ? AND createdById = ?",
          [input.project_id, ctx.user.id]
        );

        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
        }

        // M3 NOVA-04 (Opção A): formatar archetype context UMA vez antes do loop.
        // Backward-compat: arch=null → string vazia → gap_description idêntico ao legado.
        const { getArchetypeContext } = await import("../lib/archetype/getArchetypeContext");
        const archetypeContext = getArchetypeContext(project.archetype as never);

        // 2. Buscar requisitos aplicáveis com fonte
        const [requirements] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT r.id, r.code, r.name, r.domain, r.layer, r.source_reference,
                  r.gap_level, r.default_gap_type AS gap_type, r.base_criticality AS criticality, r.evaluation_criteria, r.evidence_required,
                  r.risk_category_code
           FROM regulatory_requirements_v3 r
           WHERE r.active = 1
             AND r.source_reference IS NOT NULL
             AND r.source_reference != ''
           ORDER BY r.domain, r.code`,
          []
        );

        if (requirements.length === 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Nenhum requisito com fonte normativa encontrado — B2 deve ser executado primeiro",
          });
        }

        // 3. Buscar respostas do questionário do projeto
        const [answers] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT qa.id, qa.cnaeCode, qa.questionIndex, qa.questionText, qa.answerValue
           FROM questionnaireAnswersV3 qa
           WHERE qa.projectId = ?
           ORDER BY qa.questionIndex`,
          [input.project_id]
        );

        // 3.5. M3.8-2 — Buscar service_answers (Q.NBS) e normalizar via UnifiedAnswer
        // Lição #62 (Contexto vs Evidência): service_answers é EVIDÊNCIA — alimenta Gap Engine.
        // Lição #63 (Spec ≠ Viável): em M3.8 Fase 1, apenas service_answers padrão idN é mapeável.
        // Outros padrões (SOL-XXX) e outras fontes (iagen, solaris_answers, qcnae_onda3 LLM)
        // ficam stubs até M3.9 (curadoria SOLARIS jurídica).
        const serviceAnswersRaw = await getServiceAnswersForProject(input.project_id);
        // Cast: getServiceAnswersForProject retorna Record<string,unknown>[]; normalizeServiceAnswers
        // tolera campos ausentes (filtra via Regra de Integridade).
        const unifiedFromService: UnifiedAnswer[] = normalizeServiceAnswers(
          serviceAnswersRaw as unknown as ServiceAnswerInput[]
        );
        // Build map por requirement.id (numérico) para resolver via resolveAnswer
        const unifiedByReqId = groupByRequirement(unifiedFromService);

        // 4. Mapear respostas por requirement_id
        // M3.8-1A: registrar question_source para cada resposta (preparação M3.8-1B + M3.8-2)
        // M3.8-2: também consome unifiedFromService (service_answers padrão idN) — única fonte ATIVA
        //   além de questionnaireAnswersV3. Outros normalizers em unified-answer.ts são stubs M3.9.
        const answerMap = new Map<string, {
          answer: string;
          questionId: number | null;
          evidenceStatus: string;
          questionSource: QuestionSource;
        }>();
        for (const a of answers) {
          const reqId = a.requirement_id ?? `Q${a.questionIndex}`;
          const evidenceStatus = a.answerValue && a.answerValue !== "nao" ? "parcial" : "ausente";
          answerMap.set(reqId, {
            answer: a.answerValue ?? "",
            questionId: a.id,
            evidenceStatus,
            questionSource: "qcnae_onda3", // questionnaireAnswersV3 = Q.CNAE Onda 3 LLM
          });
        }

        // 5. Classificar gaps para cada requisito
        const gaps: Gap[] = [];
        const decisionLog: GapDecisionLog[] = [];

        for (const req of requirements) {
          const reqId = req.code;
          let answerData = answerMap.get(reqId);

          // M3.8-2: consultar service_answers (Q.NBS) via UnifiedAnswer
          // Match por requirement.id numérico (extractRequirementId derivou de fonte_ref idN).
          // Apenas aplica se answerData ainda não foi populado por questionnaireAnswersV3.
          if (!answerData && req.id !== undefined) {
            const reqIdNumeric = typeof req.id === "number" ? req.id : parseInt(String(req.id), 10);
            if (!Number.isNaN(reqIdNumeric)) {
              const unifiedMatches = unifiedByReqId.get(reqIdNumeric);
              if (unifiedMatches && unifiedMatches.length > 0) {
                const resolvedValue = resolveAnswer(unifiedMatches);
                if (resolvedValue !== null) {
                  // Map "Não" → "nao", "Sim" → "sim" (compatibilidade com classifyGap downstream)
                  const answerStr = resolvedValue === "Não" ? "nao"
                    : resolvedValue === "Sim" ? "sim"
                    : "parcial";
                  const evidenceStatusFromUnified = resolvedValue === "Sim" ? "parcial" : "ausente";
                  answerData = {
                    answer: answerStr,
                    questionId: null, // service_answers JSON não tem questionId numérico
                    evidenceStatus: evidenceStatusFromUnified,
                    questionSource: unifiedMatches[0].source as QuestionSource, // "qnbs_regulatorio"
                  };
                }
              }
            }
          }

          const answerValue = answerData?.answer ?? null;
          const evidenceStatus = answerData?.evidenceStatus ?? "ausente";

          // Determinar compliance_status baseado na resposta
          let complianceStatus: string;
          if (!answerValue || answerValue === "" || answerValue === "nao_respondido") {
            complianceStatus = "nao_atendido";
          } else if (answerValue.toLowerCase() === "sim" || answerValue.toLowerCase() === "yes") {
            complianceStatus = evidenceStatus === "completa" ? "atendido" : "parcialmente_atendido";
          } else if (answerValue.toLowerCase() === "nao" || answerValue.toLowerCase() === "não") {
            complianceStatus = "nao_atendido";
          } else if (answerValue.toLowerCase() === "nao_aplicavel" || answerValue.toLowerCase() === "n/a") {
            complianceStatus = "nao_aplicavel";
          } else {
            complianceStatus = "parcialmente_atendido";
          }

          const { classification, confidence, reason } = classifyGap(answerValue, complianceStatus, evidenceStatus);

          // Log de decisão sempre
          decisionLog.push({
            requirement_id: reqId,
            requirement_name: req.name,
            answer_value: answerValue,
            gap_found: classification !== null,
            gap_classification: classification,
            evaluation_confidence: confidence,
            decision_reason: reason,
            compliance_status: complianceStatus,
          });

          // Se não há gap, continua
          if (classification === null) continue;

          // Calcular scores
          const criticality = req.criticality ?? "media";
          const { score, riskLevel, priorityScore, actionPriority, estimatedDays } =
            calculateGapScore(criticality, evidenceStatus, classification);

          const gap: Gap = {
            requirement_id: reqId,                    // OBRIGATÓRIO
            requirement_name: req.name,
            source_reference: req.source_reference,   // OBRIGATÓRIO
            domain: req.domain,
            layer: req.layer ?? "operacional",
            gap_classification: classification,        // ausencia | parcial | inadequado
            gap_type: req.gap_type ?? "normativo",
            compliance_status: complianceStatus as Gap["compliance_status"],
            criticality: criticality as Gap["criticality"],
            evidence_status: evidenceStatus as Gap["evidence_status"],
            // M3 NOVA-04: enriquecer descrição com contexto do archetype quando disponível.
            // Sem mudança na lógica de classificação (texto cosmético — Opção A).
            gap_description: archetypeContext
              ? `Gap identificado em ${req.name}: ${reason} (contexto: ${archetypeContext})`
              : `Gap identificado em ${req.name}: ${reason}`,
            deterministic_reason: reason,
            evaluation_confidence: confidence,         // OBRIGATÓRIO
            evaluation_confidence_reason: reason,      // OBRIGATÓRIO
            question_id: answerData?.questionId ?? null,
            answer_value: answerValue,
            score,
            risk_level: riskLevel as Gap["risk_level"],
            priority_score: priorityScore,
            action_priority: actionPriority as Gap["action_priority"],
            estimated_days: estimatedDays,
            recommended_actions: `Regularizar ${req.name} conforme ${req.source_reference}`,
            // B-Z13-004: propagar risk_category_code para o GapToRuleMapper (Caso A)
            risk_category_code: req.risk_category_code ?? null,
            // M3.8-1A: fonte da resposta que originou o gap
            // Se sem resposta (answerData undefined), gap é por ausência → "regulatory_only"
            question_source: answerData?.questionSource ?? "regulatory_only",
          };

          gaps.push(gap);
        }

        // 6. Persistir gaps no banco (se não for dry_run)
        if (!input.dry_run && gaps.length > 0) {
          // Limpar gaps anteriores desta versão de análise
          await pool.query(
            "DELETE FROM project_gaps_v3 WHERE project_id = ? AND analysis_version = 3",
            [input.project_id]
          );

          // Inserir novos gaps
          for (const gap of gaps) {
            await pool.query(
              `INSERT INTO project_gaps_v3 (
                client_id, project_id, requirement_code, requirement_name, domain,
                gap_level, gap_type, compliance_status, criticality, evidence_status,
                operational_dependency, score, risk_level, priority_score,
                critical_evidence_flag, action_priority, estimated_days,
                gap_description, deterministic_reason, unmet_criteria, recommended_actions,
                analysis_version, created_at, updated_at,
                requirement_id, gap_classification, evaluation_confidence,
                evaluation_confidence_reason, question_id, answer_value, source_reference,
                risk_category_code
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                project.clientId ?? 1,
                input.project_id,
                gap.requirement_id,
                gap.requirement_name,
                gap.domain,
                "operacional",
                gap.gap_type,
                gap.compliance_status,
                gap.criticality,
                gap.evidence_status,
                "media",
                gap.score,
                gap.risk_level,
                gap.priority_score,
                gap.criticality === "critica" ? 1 : 0,
                gap.action_priority,
                gap.estimated_days,
                gap.gap_description,
                gap.deterministic_reason,
                gap.evaluation_confidence_reason,
                gap.recommended_actions,
                3, // analysis_version
                gap.requirement_id,
                gap.gap_classification,
                gap.evaluation_confidence,
                gap.evaluation_confidence_reason,
                gap.question_id,
                gap.answer_value,
                gap.source_reference,
                // B-Z13-004: persistir risk_category_code para novos gaps
                gap.risk_category_code ?? null,
              ]
            );
          }
        }

        // 7. Calcular métricas
        const avgConfidence = gaps.length > 0
          ? gaps.reduce((sum, g) => sum + g.evaluation_confidence, 0) / gaps.length
          : 1.0;

        const result: GapEngineResult = {
          project_id: input.project_id,
          total_requirements_evaluated: requirements.length,
          total_gaps_found: gaps.length,
          gaps_by_classification: {
            ausencia: gaps.filter(g => g.gap_classification === "ausencia").length,
            parcial: gaps.filter(g => g.gap_classification === "parcial").length,
            inadequado: gaps.filter(g => g.gap_classification === "inadequado").length,
          },
          gaps_by_criticality: {
            critica: gaps.filter(g => g.criticality === "critica").length,
            alta: gaps.filter(g => g.criticality === "alta").length,
            media: gaps.filter(g => g.criticality === "media").length,
            baixa: gaps.filter(g => g.criticality === "baixa").length,
          },
          avg_evaluation_confidence: Math.round(avgConfidence * 100) / 100,
          gaps,
          decision_log: decisionLog,
        };

        return result;
      } finally {
        await pool.end();
      }
    }),

  /**
   * Retorna os gaps persistidos de um projeto.
   */
  getGaps: protectedProcedure
    .input(z.object({ project_id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const pool = mysql.createPool(process.env.DATABASE_URL ?? "");
      try {
        const [[project]] = await pool.query<mysql.RowDataPacket[]>(
          "SELECT id FROM projects WHERE id = ? AND createdById = ?",
          [input.project_id, ctx.user.id]
        );
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });

        const [gaps] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT * FROM project_gaps_v3
           WHERE project_id = ? AND analysis_version = 3
           ORDER BY priority_score DESC, criticality DESC`,
          [input.project_id]
        );

        return {
          project_id: input.project_id,
          total: gaps.length,
          gaps,
        };
      } finally {
        await pool.end();
      }
    }),

  /**
   * Valida que todos os gaps têm requirement_id e evaluation_confidence.
   * Usado pelos testes de checklist.
   */
  validateGapIntegrity: protectedProcedure
    .input(z.object({ project_id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const pool = mysql.createPool(process.env.DATABASE_URL ?? "");
      try {
        const [[project]] = await pool.query<mysql.RowDataPacket[]>(
          "SELECT id FROM projects WHERE id = ? AND createdById = ?",
          [input.project_id, ctx.user.id]
        );
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });

        const [gaps] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT id, requirement_id, gap_classification, evaluation_confidence, source_reference
           FROM project_gaps_v3 WHERE project_id = ? AND analysis_version = 3`,
          [input.project_id]
        );

        const withoutReqId = gaps.filter(g => !g.requirement_id);
        const withoutConfidence = gaps.filter(g => g.evaluation_confidence === null || g.evaluation_confidence === undefined);
        const withoutClassification = gaps.filter(g => !g.gap_classification);
        const withoutSource = gaps.filter(g => !g.source_reference);

        return {
          total: gaps.length,
          valid: withoutReqId.length === 0 && withoutConfidence.length === 0 &&
                 withoutClassification.length === 0 && withoutSource.length === 0,
          without_requirement_id: withoutReqId.length,
          without_evaluation_confidence: withoutConfidence.length,
          without_gap_classification: withoutClassification.length,
          without_source_reference: withoutSource.length,
        };
      } finally {
        await pool.end();
      }
    }),
});
