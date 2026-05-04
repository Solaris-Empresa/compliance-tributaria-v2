/**
 * questionEngine.ts — Question Engine B3
 * Sprint 98% Confidence — ADR-010
 *
 * Implementa:
 * - Prompt estruturado com requirement_id obrigatório
 * - LLM-as-judge com score 1–5 em 4 critérios
 * - Quality Gate: score < 3.5 → reformular até 2x → NO_QUESTION
 * - Deduplicação semântica (threshold 0.92, cross-stage)
 * - Loop por CNAE (cada CNAE gera perguntas próprias)
 * - Logs de decisão completos (geradas, descartadas, motivo, retries, NO_QUESTION)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";


// ---------------------------------------------------------------------------
// Tipos e schemas
// ---------------------------------------------------------------------------

export const QuestionSchema = z.object({
  requirement_id: z.string(),
  source_reference: z.string(),
  source_type: z.enum(["EC", "LC", "IN", "RFB", "CGSN", "ADI"]),
  confidence: z.number().min(0).max(1),
  question_text: z.string(),
  evidence_type: z.string(),
  evidence_description: z.string(),
  layer: z.enum(["corporativo", "operacional", "cnae", "universal"]),
  cnae_code: z.string().nullable(),
  quality_gate_status: z.enum(["approved", "discarded", "no_valid_question_generated"]),
  quality_gate_score: z.number().min(0).max(5),
  quality_gate_attempts: z.number().int().min(1).max(3),
});

export type Question = z.infer<typeof QuestionSchema>;

export interface QuestionGenerationLog {
  requirement_id: string;
  attempts: number;
  scores: number[];
  final_status: "approved" | "discarded" | "no_valid_question_generated";
  discard_reason?: string;
  retry_reasons?: string[];
}

export interface QuestionEngineResult {
  project_id: number;
  cnae_code: string | null;
  questions_generated: Question[];
  questions_discarded: number;
  no_valid_question_count: number;
  dedup_removed: number;
  logs: QuestionGenerationLog[];
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

const QUALITY_THRESHOLD = 3.5;
const MAX_RETRIES = 2;
const DEDUP_THRESHOLD = 0.92;

/**
 * Gera uma pergunta estruturada para um requisito via LLM
 */
async function generateQuestionForRequirement(
  req: {
    code: string;
    name: string;
    description: string;
    source_reference: string;
    layer: string;
    evaluation_criteria: any;
    evidence_required: any;
    domain: string;
  },
  projectContext: {
    cnae_codes: string[];
    regime: string;
    uf: string;
    porte: string;
    // M3.5 RAG-COVERAGE / Issue #926: archetype_context (Perfil da Entidade M1) — opcional, backward-compat
    archetype_context?: string;
    // M3.6 (Issue #932): descrição livre do negócio (P1-1) — opcional, backward-compat
    description?: string | null;
  },
  cnaeCode: string | null,
  attempt: number
): Promise<{ question_text: string; evidence_type: string; evidence_description: string }> {
  const criteriaList = Array.isArray(req.evaluation_criteria)
    ? req.evaluation_criteria.join("\n- ")
    : String(req.evaluation_criteria);

  const evidenceList = Array.isArray(req.evidence_required)
    ? req.evidence_required.join("\n- ")
    : String(req.evidence_required);

  const prompt = `Você é um especialista em compliance tributário da Reforma Tributária brasileira.

REQUISITO NORMATIVO:
- ID: ${req.code}
- Nome: ${req.name}
- Descrição: ${req.description}
- Fonte normativa: ${req.source_reference}
- Camada: ${req.layer}
- Domínio: ${req.domain}
${cnaeCode ? `- CNAE específico: ${cnaeCode}` : ""}

CRITÉRIOS DE AVALIAÇÃO:
- ${criteriaList}

EVIDÊNCIAS NECESSÁRIAS:
- ${evidenceList}

PERFIL DA EMPRESA:
- CNAEs: ${projectContext.cnae_codes.join(", ")}
- Regime tributário: ${projectContext.regime}
- UF: ${projectContext.uf}
- Porte: ${projectContext.porte}${projectContext.archetype_context ? `\n- Perfil da Entidade (arquétipo M1): ${projectContext.archetype_context}` : ""}${projectContext.description ? `\n- Descrição do negócio: ${projectContext.description}` : ""}

REGRAS OBRIGATÓRIAS:
1. A pergunta NÃO pode repetir dados do perfil (regime, UF, porte já são conhecidos)
2. A pergunta DEVE aprofundar o requisito ${req.code}, não replicar informações já coletadas
3. A pergunta DEVE mencionar a fonte normativa (${req.source_reference}) de forma natural
4. A pergunta DEVE ser específica, acionável e direcionar a uma evidência concreta
5. A pergunta DEVE ser diferente das tentativas anteriores${attempt > 1 ? ` (tentativa ${attempt} — seja mais específico e objetivo)` : ""}

Gere APENAS um JSON com esta estrutura exata:
{
  "question_text": "pergunta específica e rastreável",
  "evidence_type": "tipo de evidência (documento/sistema/processo/declaração)",
  "evidence_description": "o que exatamente valida a resposta"
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "Você é um especialista em compliance tributário. Responda APENAS com JSON válido, sem markdown." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "question_output",
        strict: true,
        schema: {
          type: "object",
          properties: {
            question_text: { type: "string" },
            evidence_type: { type: "string" },
            evidence_description: { type: "string" },
          },
          required: ["question_text", "evidence_type", "evidence_description"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("LLM não retornou conteúdo");

  const parsed = typeof content === "string" ? JSON.parse(content) : content;
  return parsed;
}

/**
 * LLM-as-judge: avalia a qualidade de uma pergunta em 4 critérios (score 1–5 cada)
 * Score final = média dos 4 critérios
 */
async function evaluateQuestionQuality(
  questionText: string,
  requirementId: string,
  sourceReference: string
): Promise<{ score: number; breakdown: Record<string, number>; reason: string }> {
  const prompt = `Avalie a qualidade desta pergunta de compliance tributário em 4 critérios. Responda APENAS com JSON.

PERGUNTA: "${questionText}"
REQUISITO: ${requirementId}
FONTE NORMATIVA: ${sourceReference}

Critérios de avaliação (1 = péssimo, 5 = excelente):
1. especificidade_normativa: A pergunta menciona a fonte normativa de forma natural e específica?
2. acionabilidade: A pergunta direciona a uma evidência concreta e verificável?
3. nao_redundancia: A pergunta NÃO repete dados do perfil (regime, UF, porte)?
4. adequacao_perfil: A pergunta é adequada ao contexto de compliance tributário?

JSON esperado:
{
  "especificidade_normativa": <1-5>,
  "acionabilidade": <1-5>,
  "nao_redundancia": <1-5>,
  "adequacao_perfil": <1-5>,
  "reason": "justificativa em 1 frase"
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "Você é um avaliador de qualidade de perguntas de compliance. Responda APENAS com JSON válido." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "quality_evaluation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            especificidade_normativa: { type: "number" },
            acionabilidade: { type: "number" },
            nao_redundancia: { type: "number" },
            adequacao_perfil: { type: "number" },
            reason: { type: "string" },
          },
          required: ["especificidade_normativa", "acionabilidade", "nao_redundancia", "adequacao_perfil", "reason"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("LLM-as-judge não retornou conteúdo");

  const parsed = typeof content === "string" ? JSON.parse(content) : content;
  const breakdown = {
    especificidade_normativa: parsed.especificidade_normativa,
    acionabilidade: parsed.acionabilidade,
    nao_redundancia: parsed.nao_redundancia,
    adequacao_perfil: parsed.adequacao_perfil,
  };
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0) / 4;

  return { score, breakdown, reason: parsed.reason };
}

/**
 * Deduplicação semântica simples baseada em similaridade de texto (Jaccard)
 * Em produção, substituir por embeddings vetoriais com threshold 0.92
 */
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set(Array.from(setA).filter(x => setB.has(x)));
  const union = new Set([...Array.from(setA), ...Array.from(setB)]);
  return intersection.size / union.size;
}

function isDuplicate(newQuestion: string, existingQuestions: string[]): boolean {
  return existingQuestions.some(q => jaccardSimilarity(newQuestion, q) >= DEDUP_THRESHOLD);
}

/**
 * Determina o source_type a partir da source_reference
 */
function getSourceType(sourceRef: string): "EC" | "LC" | "IN" | "RFB" | "CGSN" | "ADI" {
  if (sourceRef.includes("EC")) return "EC";
  if (sourceRef.includes("LC")) return "LC";
  if (sourceRef.includes("IN")) return "IN";
  if (sourceRef.includes("CGSN")) return "CGSN";
  if (sourceRef.includes("ADI")) return "ADI";
  return "RFB";
}

// ---------------------------------------------------------------------------
// Router B3 — Question Engine
// ---------------------------------------------------------------------------

export const questionEngineRouter = router({
  /**
   * Gera perguntas para um projeto específico
   * Implementa: Quality Gate, dedup, NO_QUESTION, loop por CNAE, logs
   */
  generateQuestions: protectedProcedure
    .input(
      z.object({
        project_id: z.number().int().positive(),
        cnae_code: z.string().nullable().optional(),
        layer: z.enum(["corporativo", "operacional", "cnae", "all"]).default("all"),
        max_questions: z.number().int().min(1).max(50).default(20),
      })
    )
    .mutation(async ({ input, ctx }): Promise<QuestionEngineResult> => {
      const pool = mysql.createPool(process.env.DATABASE_URL ?? "");

      try {
        // 1. Buscar projeto e contexto
        // M3 NOVA-02: SELECT estendido com `archetype` para consumo do helper.
        const [[project]] = await pool.query<mysql.RowDataPacket[]>(
          "SELECT id, name, description, regime, uf, porte, confirmedCnaes, archetype FROM projects WHERE id = ? AND userId = ?",
          [input.project_id, ctx.user.id]
        ) as any;

        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
        }

        const cnaeCodes: string[] = (() => {
          try {
            const raw = project.confirmedCnaes;
            if (!raw) return [];
            const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
            return Array.isArray(parsed) ? parsed.map((c: any) => String(c.code || c)) : [];
          } catch { return []; }
        })();

        // M3 NOVA-02: archetype context formatado via helper compartilhado.
        // Backward-compat: arch=null → string vazia → projectContext.archetype_context = ''.
        const { getArchetypeContext } = await import("../lib/archetype/getArchetypeContext");
        const archetypeContext = getArchetypeContext(project.archetype);

        const projectContext = {
          cnae_codes: cnaeCodes,
          regime: project.regime || "Não informado",
          uf: project.uf || "Não informado",
          porte: project.porte || "Não informado",
          archetype_context: archetypeContext,
          // M3.6 (Issue #932) — descrição livre do negócio (P1-1) — backward-compat: null/undefined
          description: project.description ?? null,
        };

        // 2. Buscar requisitos aplicáveis
        let whereLayer = "";
        const params: any[] = [1];
        if (input.layer !== "all") {
          whereLayer = "AND layer = ?";
          params.push(input.layer);
        }
        if (input.cnae_code) {
          whereLayer += " AND (cnae_scope IS NULL OR JSON_CONTAINS(cnae_scope, ?))";
          params.push(JSON.stringify(input.cnae_code));
        }

        const [requirements] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT code, name, description, source_reference, layer, evaluation_criteria, evidence_required, domain
           FROM regulatory_requirements_v3
           WHERE active = ? ${whereLayer}
           ORDER BY assessment_order ASC
           LIMIT ?`,
          [...params, input.max_questions * 2] // buscar mais para compensar descartes
        );

        if (requirements.length === 0) {
          return {
            project_id: input.project_id,
            cnae_code: input.cnae_code || null,
            questions_generated: [],
            questions_discarded: 0,
            no_valid_question_count: 0,
            dedup_removed: 0,
            logs: [],
            generated_at: new Date().toISOString(),
          };
        }

        // 3. Gerar perguntas com Quality Gate
        const approvedQuestions: Question[] = [];
        const approvedTexts: string[] = [];
        const logs: QuestionGenerationLog[] = [];
        let questionsDiscarded = 0;
        let noValidQuestionCount = 0;
        let dedupRemoved = 0;

        for (const req of requirements) {
          if (approvedQuestions.length >= input.max_questions) break;

          const reqData = {
            code: req.code,
            name: req.name,
            description: req.description,
            source_reference: req.source_reference || "EC 132/2023, LC 214/2024",
            layer: req.layer,
            evaluation_criteria: typeof req.evaluation_criteria === "string"
              ? JSON.parse(req.evaluation_criteria)
              : req.evaluation_criteria,
            evidence_required: typeof req.evidence_required === "string"
              ? JSON.parse(req.evidence_required)
              : req.evidence_required,
            domain: req.domain,
          };

          const log: QuestionGenerationLog = {
            requirement_id: req.code,
            attempts: 0,
            scores: [],
            final_status: "no_valid_question_generated",
            retry_reasons: [],
          };

          let approved = false;

          for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
            log.attempts = attempt;

            try {
              // Gerar pergunta
              const generated = await generateQuestionForRequirement(
                reqData,
                projectContext,
                input.cnae_code || null,
                attempt
              );

              // Verificar deduplicação antes do quality gate
              if (isDuplicate(generated.question_text, approvedTexts)) {
                dedupRemoved++;
                log.final_status = "discarded";
                log.discard_reason = "deduplicação semântica (similaridade ≥ 0.92)";
                questionsDiscarded++;
                break;
              }

              // LLM-as-judge
              const evaluation = await evaluateQuestionQuality(
                generated.question_text,
                req.code,
                reqData.source_reference
              );

              log.scores.push(evaluation.score);

              if (evaluation.score >= QUALITY_THRESHOLD) {
                // Aprovada
                const question: Question = {
                  requirement_id: req.code,
                  source_reference: reqData.source_reference,
                  source_type: getSourceType(reqData.source_reference),
                  confidence: evaluation.score / 5,
                  question_text: generated.question_text,
                  evidence_type: generated.evidence_type,
                  evidence_description: generated.evidence_description,
                  layer: req.layer as any,
                  cnae_code: input.cnae_code || null,
                  quality_gate_status: "approved",
                  quality_gate_score: evaluation.score,
                  quality_gate_attempts: attempt,
                };

                approvedQuestions.push(question);
                approvedTexts.push(generated.question_text);
                log.final_status = "approved";
                approved = true;
                break;
              } else {
                // Score baixo — registrar motivo e tentar novamente
                log.retry_reasons?.push(
                  `Tentativa ${attempt}: score ${evaluation.score.toFixed(2)} < ${QUALITY_THRESHOLD} — ${evaluation.reason}`
                );
              }
            } catch (err: any) {
              log.retry_reasons?.push(`Tentativa ${attempt}: erro LLM — ${err.message}`);
            }
          }

          if (!approved && log.final_status !== "discarded") {
            // Esgotou tentativas sem aprovação
            log.final_status = "no_valid_question_generated";
            log.discard_reason = `Esgotou ${MAX_RETRIES + 1} tentativas sem atingir score ≥ ${QUALITY_THRESHOLD}`;
            noValidQuestionCount++;
          }

          logs.push(log);
        }

        return {
          project_id: input.project_id,
          cnae_code: input.cnae_code || null,
          questions_generated: approvedQuestions,
          questions_discarded: questionsDiscarded,
          no_valid_question_count: noValidQuestionCount,
          dedup_removed: dedupRemoved,
          logs,
          generated_at: new Date().toISOString(),
        };
      } finally {
        await pool.end();
      }
    }),

  /**
   * Retorna os logs de decisão do Question Engine para um projeto
   * (para auditoria e monitoramento pelo Orquestrador)
   */
  getDecisionLogs: protectedProcedure
    .input(z.object({ project_id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      // Retorna logs salvos no banco (se implementado) ou mock para testes
      return {
        project_id: input.project_id,
        message: "Logs de decisão disponíveis via generateQuestions.logs",
        checklist_b3: {
          fonte_obrigatoria: "requirement_id + source_reference + source_type + confidence em cada pergunta",
          pergunta_nao_repete_perfil: "validado no prompt (regra obrigatória #1)",
          deduplicacao_semantica: `threshold Jaccard ${DEDUP_THRESHOLD} (produção: embeddings vetoriais)`,
          quality_gate: `score ≥ ${QUALITY_THRESHOLD} (4 critérios, LLM-as-judge), até ${MAX_RETRIES} retries`,
          no_question_protocol: "após 3 tentativas sem aprovação → no_valid_question_generated",
          loop_por_cnae: "cnae_code por chamada, não mistura CNAEs",
        },
      };
    }),
});
