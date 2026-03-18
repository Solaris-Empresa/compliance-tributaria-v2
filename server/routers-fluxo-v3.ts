/**
 * Router do Novo Fluxo v3.0 — 5 Etapas de Compliance Tributário
 *
 * V60: Schemas Zod enriquecidos + generateWithRetry + temperatura 0.2 + system prompts com papéis
 * V61: Scoring financeiro + confidence score + campo inconsistencias preparado
 * V62: Pré-RAG inteligente — injeção de contexto regulatório CNAE→artigos
 * V63: Motor de decisão explícito (decisao_recomendada + momento_wow)
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { projects, questionnaireAnswersV3, questionnaireProgressV3, questionnaireQuestionsCache } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Importações dos novos módulos V60-V63
import {
  CnaesResponseSchema,
  QuestionsResponseSchema,
  BriefingStructuredSchema,
  RisksResponseSchema,
  TasksResponseSchema,
  DecisaoResponseSchema,
} from "./ai-schemas";
import { generateWithRetry, calculateGlobalScore, OUTPUT_CONTRACT } from "./ai-helpers";
// V65: RAG híbrido (LIKE + re-ranking LLM) substitui o pré-RAG estático
import { retrieveArticles, retrieveArticlesFast } from "./rag-retriever";

const CnaeSchema = z.object({
  code: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(100),
  justification: z.string().optional(),
});

export const fluxoV3Router = router({

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Criar projeto
  // ─────────────────────────────────────────────────────────────────────────
  createProject: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Nome é obrigatório"),
      description: z.string().min(50, "Descrição deve ter pelo menos 50 caracteres"),
      clientId: z.number({ message: "Cliente é obrigatório" }),
      faturamentoAnual: z.number().optional(), // V61: para tradução financeira do risco
    }))
    .mutation(async ({ input, ctx }) => {
      const projectId = await db.createProject({
        name: input.name,
        description: input.description,
        clientId: input.clientId,
        status: "rascunho",
        createdById: ctx.user.id,
        createdByRole: ctx.user.role as any,
        notificationFrequency: "semanal",
        currentStep: 1,
        faturamentoAnual: input.faturamentoAnual,
      } as any);
      return { projectId };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Extrair CNAEs via IA (V60: retry + temperatura 0.2)
  // ─────────────────────────────────────────────────────────────────────────
  extractCnaes: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      description: z.string().min(50),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });

      // RAG: buscar CNAEs candidatos na tabela oficial IBGE (1332 subclasses)
      // Isso elimina alucinações e aumenta a precisão para ~98%
      const { buildCnaeRagContext } = await import("./cnae-rag");
      const ragContext = buildCnaeRagContext(input.description);

      const result = await generateWithRetry(
        [
          {
            role: "system",
            content: `Você é um Classificador Tributário Especialista em CNAE e Reforma Tributária brasileira (LC 214/2025, IBS, CBS, IS).
Sua função é identificar com ALTA PRECISÃO os CNAEs que mais impactam o negócio descrito.

REGRAS CRÍTICAS:
1. SOMENTE use códigos da lista CNAE OFICIAL fornecida abaixo. NUNCA invente códigos.
2. Prefira CNAEs de 7 dígitos (ex: 6201-5/01) a grupos genéricos.
3. Escolha os CNAEs que MELHOR descrevem a atividade principal e secundária do negócio.
4. Se a empresa fabrica E vende, inclua CNAEs de fabricação E comércio.
5. Não escolha CNAEs genéricos como "outros" se houver um específico.
Responda APENAS com JSON válido no formato especificado.`,
          },
          {
            role: "user",
            content: `Analise a descrição do negócio abaixo e identifique entre 2 e 6 CNAEs mais relevantes.

DESCRIÇÃO DO NEGÓCIO:
${input.description}

---
LISTA CNAE OFICIAL IBGE (use APENAS códigos desta lista):
${ragContext}
---

Para cada CNAE forneça: código (EXATAMENTE como na lista acima), descrição oficial, confidence (0-100) e justificativa breve.
Considere especialmente os CNAEs mais impactados pela Reforma Tributária (IBS, CBS, IS).

Responda em JSON:
{"cnaes": [{"code": "XXXX-X/XX", "description": "...", "confidence": 95, "justification": "..."}]}`,
          },
        ],
        CnaesResponseSchema,
        { temperature: 0.1, context: "extractCnaes" }
      );

      return { cnaes: result.cnaes };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Refinar CNAEs via feedback (V60: retry + temperatura 0.2)
  // ─────────────────────────────────────────────────────────────────────────
  refineCnaes: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      description: z.string().min(50),
      feedback: z.string().min(5, "Descreva o que precisa ser ajustado"),
      currentCnaes: z.array(CnaeSchema),
      iteration: z.number().default(1),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });

      const currentList = input.currentCnaes.map(c =>
        `- ${c.code}: ${c.description} (confiança: ${c.confidence}%)`
      ).join("\n");

      // RAG: buscar candidatos com base no feedback + descrição original
      const { buildCnaeRagContext } = await import("./cnae-rag");
      const ragContext = buildCnaeRagContext(`${input.description} ${input.feedback}`);

      const result = await generateWithRetry(
        [
          {
            role: "system",
            content: `Você é um Classificador Tributário Especialista em CNAE e Reforma Tributária brasileira.
Revise a lista de CNAEs com base no feedback do usuário.
MANTENHA os corretos, AJUSTE os que precisam de correção, ADICIONE os que estão faltando.
USE APENAS códigos da lista CNAE OFICIAL fornecida. NUNCA invente códigos.
Responda APENAS com JSON válido.`,
          },
          {
            role: "user",
            content: `CNAEs sugeridos (iteração ${input.iteration}):
${currentList}

Feedback do usuário: "${input.feedback}"

Descrição original: ${input.description}

---
LISTA CNAE OFICIAL IBGE (use APENAS códigos desta lista):
${ragContext}
---

Retorne entre 2 e 6 CNAEs revisados com base no feedback.
{"cnaes": [{"code": "XXXX-X/XX", "description": "...", "confidence": 95, "justification": "..."}]}`,
          },
        ],
        CnaesResponseSchema,
        { temperature: 0.1, context: "refineCnaes" }
      );

      return { cnaes: result.cnaes, iteration: input.iteration + 1 };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Confirmar CNAEs e avançar para Etapa 2
  // ─────────────────────────────────────────────────────────────────────────
  confirmCnaes: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaes: z.array(CnaeSchema).min(1, "Selecione pelo menos 1 CNAE"),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({
          confirmedCnaes: input.cnaes as any,
          currentStep: 2,
          status: "assessment_fase1",
        } as any)
        .where(eq(projects.id, input.projectId));

      return { success: true, nextStep: 2 };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Criar cliente on the fly
  // ─────────────────────────────────────────────────────────────────────────
  createClientOnTheFly: protectedProcedure
    .input(z.object({
      companyName: z.string().min(1, "Razão Social é obrigatória"),
      cnpj: z.string().optional(),
      email: z.string().email("E-mail inválido").optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas a equipe SOLARIS pode criar clientes" });
      }

      const rawCnpjDigits = (input.cnpj || "").replace(/\D/g, "");
      const formattedCnpj = rawCnpjDigits.length === 14
        ? rawCnpjDigits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
        : rawCnpjDigits.length > 0
          ? rawCnpjDigits.slice(0, 18)
          : undefined;

      const userId = await db.createUser({
        name: input.companyName,
        email: input.email || `cliente-${Date.now()}@solaris.temp`,
        companyName: input.companyName,
        cnpj: formattedCnpj,
        phone: (input.phone || "").slice(0, 20) || undefined,
        role: "cliente",
        openId: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      return { userId, companyName: input.companyName };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Buscar dados do projeto
  // ─────────────────────────────────────────────────────────────────────────
  getProjectStep1: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      // Buscar dados do cliente para exibir no formulário
      const client = project.clientId ? await db.getUserById(project.clientId) : null;
      return {
        id: project.id,
        name: project.name,
        description: (project as any).description,
        clientId: project.clientId,
        clientName: client?.companyName || client?.name || null,
        clientCnpj: (client as any)?.cnpj || null,
        confirmedCnaes: (project as any).confirmedCnaes,
        currentStep: (project as any).currentStep ?? 1,
        status: project.status,
        questionnaireAnswers: (project as any).questionnaireAnswers ?? null,
        briefingContent: (project as any).briefingContent ?? null,
        riskMatricesData: (project as any).riskMatricesData ?? null,
        actionPlansData: (project as any).actionPlansData ?? null,
        scoringData: (project as any).scoringData ?? null,      // V61
        decisaoData: (project as any).decisaoData ?? null,      // V63
        faturamentoAnual: (project as any).faturamentoAnual ?? null, // V61
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Gerar perguntas do questionário (V60: retry + temperatura 0.2 + metadata)
  // ─────────────────────────────────────────────────────────────────────────
  generateQuestions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaeCode: z.string(),
      cnaeDescription: z.string(),
      level: z.enum(["nivel1", "nivel2"]),
      roundIndex: z.number().optional().default(0), // 0=primeiro aprofundamento, 1=segundo, etc.
      previousAnswers: z.array(z.object({
        question: z.string(),
        answer: z.string(),
      })).optional(),
      contextNote: z.string().optional(), // Campo livre de contexto adicional do usuário
    }))
    .mutation(async ({ input }) => {
      console.log(`[generateQuestions] START projectId=${input.projectId} cnae=${input.cnaeCode} level=${input.level} round=${input.roundIndex}`);
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const projectDescription = (project as any).description || "";
      const roundLabel = (input.roundIndex ?? 0) > 0 ? ` (Round ${(input.roundIndex ?? 0) + 1})` : "";
      const contextNoteSection = input.contextNote?.trim()
        ? `\nCONTEXTO ADICIONAL FORNECIDO PELO USUÁRIO:\n${input.contextNote.trim()}\n`
        : "";
      const nivel2Context = input.level === "nivel2" && input.previousAnswers?.length
        ? `\nRESPOSTAS ANTERIORES:\n${input.previousAnswers.map(a => `P: ${a.question}\nR: ${a.answer}`).join("\n\n")}\n${contextNoteSection}\nGere perguntas de APROFUNDAMENTO${roundLabel} baseadas nessas respostas e no contexto adicional.`
        : contextNoteSection ? `\n${contextNoteSection}\nGere perguntas considerando este contexto adicional.` : "";

      // V65: RAG híbrido — busca artigos relevantes para o CNAE (versão rápida sem re-ranking para perguntas)
      let ragCtx;
      try {
        ragCtx = await retrieveArticlesFast(
          [input.cnaeCode],
          `${input.cnaeCode} ${input.cnaeDescription} ${projectDescription}`,
          5
        );
      } catch (ragErr) {
        console.error(`[generateQuestions] RAG error (non-fatal):`, ragErr);
        ragCtx = { articles: [], contextText: "", totalCandidates: 0 };
      }
      const regulatoryContext = ragCtx?.contextText ?? "";
      console.log(`[generateQuestions] RAG ok, articles=${ragCtx?.articles?.length ?? 0}`);

      let result;
      try {
        result = await generateWithRetry(
        [
          {
            role: "system",
            content: `Você é um Auditor de Diagnóstico Tributário especializado na Reforma Tributária brasileira (LC 214/2025, IBS, CBS, IS).
Sua função é gerar perguntas de diagnóstico precisas e acionáveis para identificar gaps de compliance.

REGRAS OBRIGATÓRIAS:
1. Cada pergunta deve ter objetivo_diagnostico claro (o que ela diagnostica)
2. Cada pergunta deve ter impacto_reforma específico (como a resposta impacta o compliance)
3. Cada pergunta deve ter peso_risco definido (baixo/medio/alto/critico)
4. Perguntas de nível 1: diagnóstico essencial (máximo 10 perguntas)
5. Perguntas de nível 2: aprofundamento baseado nas respostas anteriores (máximo 10 perguntas)
6. Nunca seja genérico — cada pergunta deve ser específica para o CNAE informado

${regulatoryContext}

${OUTPUT_CONTRACT}`,
          },
          {
            role: "user",
            content: `CNAE: ${input.cnaeCode} — ${input.cnaeDescription}
DESCRIÇÃO DA EMPRESA: ${projectDescription}
NÍVEL: ${input.level === "nivel1" ? "1 (perguntas essenciais)" : `2 (aprofundamento${roundLabel})`}
${nivel2Context}

Gere as perguntas no formato:
{"questions": [{"id": "q1", "text": "...", "objetivo_diagnostico": "...", "impacto_reforma": "...", "type": "sim_nao", "peso_risco": "alto", "required": true, "options": [], "scale_labels": {"min": "Nunca", "max": "Sempre"}, "placeholder": "..."}]}`,
          },
        ],
          QuestionsResponseSchema,
          { temperature: 0.2, context: "generateQuestions" }
        );
      } catch (llmErr) {
        console.error(`[generateQuestions] LLM error for cnae=${input.cnaeCode}:`, llmErr);
        throw llmErr;
      }
      console.log(`[generateQuestions] OK questions=${result.questions.length}`);
      return { questions: result.questions };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Salvar resposta individual
  // ─────────────────────────────────────────────────────────────────────────
  saveAnswer: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaeCode: z.string(),
      cnaeDescription: z.string().optional(),
      level: z.enum(["nivel1", "nivel2"]),
      roundIndex: z.number().optional().default(0),
      questionIndex: z.number(),
      questionText: z.string(),
      questionType: z.string().optional(),
      answerValue: z.string(),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const roundIdx = input.roundIndex ?? 0;
      const existing = await database
        .select()
        .from(questionnaireAnswersV3)
        .where(
          and(
            eq(questionnaireAnswersV3.projectId, input.projectId),
            eq(questionnaireAnswersV3.cnaeCode, input.cnaeCode),
            eq(questionnaireAnswersV3.level, input.level),
            eq(questionnaireAnswersV3.roundIndex, roundIdx),
            eq(questionnaireAnswersV3.questionIndex, input.questionIndex)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await database
          .update(questionnaireAnswersV3)
          .set({ answerValue: input.answerValue })
          .where(eq(questionnaireAnswersV3.id, existing[0].id));
      } else {
        await database.insert(questionnaireAnswersV3).values({
          projectId: input.projectId,
          cnaeCode: input.cnaeCode,
          cnaeDescription: input.cnaeDescription,
          level: input.level,
          roundIndex: roundIdx,
          questionIndex: input.questionIndex,
          questionText: input.questionText,
          questionType: input.questionType,
          answerValue: input.answerValue,
        });
      }
      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Recuperar progresso salvo
  // ─────────────────────────────────────────────────────────────────────────
  getProgress: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [progress] = await database
        .select()
        .from(questionnaireProgressV3)
        .where(eq(questionnaireProgressV3.projectId, input.projectId))
        .limit(1);

      const answers = await database
        .select()
        .from(questionnaireAnswersV3)
        .where(eq(questionnaireAnswersV3.projectId, input.projectId));

      return { progress: progress || null, answers };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Validar nota de contexto adicional (Feature 2: campo livre)
  // ─────────────────────────────────────────────────────────────────────────
  validateContextNote: protectedProcedure
    .input(z.object({
      cnaeCode: z.string(),
      cnaeDescription: z.string(),
      contextNote: z.string(),
    }))
    .mutation(async ({ input }) => {
      const text = input.contextNote.trim();
      if (!text || text.length < 10) {
        return { relevant: false, reason: "Texto muito curto para avaliar." };
      }
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Você é um especialista em compliance tributário. Avalie se o texto fornecido tem relevância para o CNAE informado. Responda APENAS com JSON válido.",
            },
            {
              role: "user",
              content: `CNAE: ${input.cnaeCode} — ${input.cnaeDescription}\n\nTexto do usuário:\n"${text}"\n\nEste texto descreve desafios, cenários, exceções ou pontos de atenção relevantes para este CNAE específico? Retorne: {"relevant": true/false, "reason": "explicação breve em português"}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "context_validation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  relevant: { type: "boolean" },
                  reason: { type: "string" },
                },
                required: ["relevant", "reason"],
                additionalProperties: false,
              },
            },
          } as any,
        });
        const content = response.choices?.[0]?.message?.content;
        if (!content) return { relevant: true, reason: "Não foi possível validar, prosseguindo." };
        const parsed = typeof content === "string" ? JSON.parse(content) : content;
        return { relevant: parsed.relevant as boolean, reason: parsed.reason as string };
      } catch (err) {
        console.error("[validateContextNote] erro:", err);
        // Em caso de erro, deixar passar (não bloquear o usuário)
        return { relevant: true, reason: "Validação indisponível, prosseguindo." };
      }
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Cache de perguntas geradas (persistência cross-device)
  // ─────────────────────────────────────────────────────────────────────────
  saveQuestionsCache: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaeCode: z.string(),
      level: z.enum(["nivel1", "nivel2"]),
      roundIndex: z.number().default(0),
      questionsJson: z.string(),
      contextNote: z.string().optional(), // Contexto adicional usado na geração deste round
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const existing = await database
        .select({ id: questionnaireQuestionsCache.id })
        .from(questionnaireQuestionsCache)
        .where(
          and(
            eq(questionnaireQuestionsCache.projectId, input.projectId),
            eq(questionnaireQuestionsCache.cnaeCode, input.cnaeCode),
            eq(questionnaireQuestionsCache.level, input.level),
            eq(questionnaireQuestionsCache.roundIndex, input.roundIndex)
          )
        )
        .limit(1);
      if (existing.length > 0) {
        await database
          .update(questionnaireQuestionsCache)
          .set({ questionsJson: input.questionsJson, contextNote: input.contextNote ?? null })
          .where(eq(questionnaireQuestionsCache.id, existing[0].id));
      } else {
        await database.insert(questionnaireQuestionsCache).values({
          projectId: input.projectId,
          cnaeCode: input.cnaeCode,
          level: input.level,
          roundIndex: input.roundIndex,
          questionsJson: input.questionsJson,
          contextNote: input.contextNote ?? null,
        });
      }
      return { ok: true };
    }),

  getRoundsSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return { summary: [] };
      // Buscar todas as respostas do projeto
      const answers = await database
        .select({
          cnaeCode: questionnaireAnswersV3.cnaeCode,
          cnaeDescription: questionnaireAnswersV3.cnaeDescription,
          level: questionnaireAnswersV3.level,
          roundIndex: questionnaireAnswersV3.roundIndex,
        })
        .from(questionnaireAnswersV3)
        .where(eq(questionnaireAnswersV3.projectId, input.projectId));

      // Agregar por CNAE: contar rounds de aprofundamento (nivel2)
      const byCnae: Record<string, {
        cnaeCode: string;
        cnaeDescription: string;
        nivel1Done: boolean;
        roundsCompleted: number; // quantos rounds de nivel2 foram feitos
        maxRoundIndex: number;   // índice do round mais alto (0-based)
      }> = {};

      for (const a of answers) {
        if (!byCnae[a.cnaeCode]) {
          byCnae[a.cnaeCode] = {
            cnaeCode: a.cnaeCode,
            cnaeDescription: a.cnaeDescription || a.cnaeCode,
            nivel1Done: false,
            roundsCompleted: 0,
            maxRoundIndex: -1,
          };
        }
        if (a.level === "nivel1") {
          byCnae[a.cnaeCode].nivel1Done = true;
        }
        if (a.level === "nivel2") {
          const ri = a.roundIndex ?? 0;
          if (ri > byCnae[a.cnaeCode].maxRoundIndex) {
            byCnae[a.cnaeCode].maxRoundIndex = ri;
            byCnae[a.cnaeCode].roundsCompleted = ri + 1; // roundIndex 0 = 1 round, 1 = 2 rounds, etc.
          }
        }
      }

       // Buscar contextNotes por CNAE/round da tabela de cache de perguntas
      const cacheRows = await database
        .select({
          cnaeCode: questionnaireQuestionsCache.cnaeCode,
          roundIndex: questionnaireQuestionsCache.roundIndex,
          contextNote: questionnaireQuestionsCache.contextNote,
        })
        .from(questionnaireQuestionsCache)
        .where(
          and(
            eq(questionnaireQuestionsCache.projectId, input.projectId),
            eq(questionnaireQuestionsCache.level, "nivel2")
          )
        );
      // Montar mapa cnaeCode -> roundIndex -> contextNote
      const contextMap: Record<string, Record<number, string | null>> = {};
      for (const row of cacheRows) {
        if (!contextMap[row.cnaeCode]) contextMap[row.cnaeCode] = {};
        contextMap[row.cnaeCode][row.roundIndex] = row.contextNote ?? null;
      }
      const summary = Object.values(byCnae)
        .filter(c => c.nivel1Done)
        .sort((a, b) => b.roundsCompleted - a.roundsCompleted)
        .map(c => ({
          ...c,
          roundContextNotes: contextMap[c.cnaeCode] ?? {}, // { roundIndex: contextNote | null }
        }));
      return { summary };
    }),

  getQuestionsCache: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaeCode: z.string(),
      level: z.enum(["nivel1", "nivel2"]),
      roundIndex: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return { questionsJson: null };
      const rows = await database
        .select()
        .from(questionnaireQuestionsCache)
        .where(
          and(
            eq(questionnaireQuestionsCache.projectId, input.projectId),
            eq(questionnaireQuestionsCache.cnaeCode, input.cnaeCode),
            eq(questionnaireQuestionsCache.level, input.level),
            eq(questionnaireQuestionsCache.roundIndex, input.roundIndex)
          )
        )
        .limit(1);
      if (rows.length === 0) return { questionsJson: null, contextNote: null };
      return { questionsJson: rows[0].questionsJson, contextNote: rows[0].contextNote ?? null };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Salvar progresso e avançar para Etapa 3
  // ─────────────────────────────────────────────────────────────────────────
  saveQuestionnaireProgress: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      allAnswers: z.array(z.object({
        cnaeCode: z.string(),
        cnaeDescription: z.string(),
        level: z.string(),
        questions: z.array(z.object({
          question: z.string(),
          answer: z.string(),
        })),
      })),
      completed: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const updateData: any = {
        questionnaireAnswers: input.allAnswers as any,
      };
      if (input.completed) {
        updateData.currentStep = 3;
        updateData.status = "assessment_fase2";
      }
      await database
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, input.projectId));
      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 3: Gerar Briefing de Compliance
  // V60: sistema prompt com papel + temperatura 0.2 + contrato de saída
  // V61: confidence score + inconsistencias
  // V62: injeção de contexto regulatório CNAE→artigos
  // ─────────────────────────────────────────────────────────────────────────
  generateBriefing: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      allAnswers: z.array(z.object({
        cnaeCode: z.string(),
        cnaeDescription: z.string(),
        level: z.string(),
        questions: z.array(z.object({
          question: z.string(),
          answer: z.string(),
        })),
      })),
      correction: z.string().optional(),
      complement: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const answersText = input.allAnswers.map(cnae =>
        `## CNAE: ${cnae.cnaeCode} — ${cnae.cnaeDescription} (${cnae.level})\n` +
        cnae.questions.map(q => `**P:** ${q.question}\n**R:** ${q.answer}`).join("\n\n")
      ).join("\n\n---\n\n");

      const correctionContext = input.correction ? `\n\nCORREÇÃO SOLICITADA:\n${input.correction}` : "";
      const complementContext = input.complement ? `\n\nINFORMAÇÕES ADICIONAIS:\n${input.complement}` : "";

      // V65: RAG híbrido — busca artigos relevantes para o briefing (com re-ranking LLM)
      const confirmedCnaes = ((project as any).confirmedCnaes as any[]) || [];
      const cnaeCodesForRag = confirmedCnaes.length > 0
        ? confirmedCnaes.map((c: any) => c.code)
        : input.allAnswers.map(a => a.cnaeCode);
      const briefingQueryCtx = `${(project as any).description || ""} ${answersText.substring(0, 500)}`;
      const ragCtxBriefing = await retrieveArticles(cnaeCodesForRag, briefingQueryCtx, 7);
      const regulatoryContext = ragCtxBriefing.contextText;

      // V60: Geração com retry + temperatura 0.2 + schema estruturado
      const structured = await generateWithRetry(
        [
          {
            role: "system",
            content: `Você é um Consultor Sênior de Compliance Tributário com 15 anos de experiência na Reforma Tributária brasileira.
Sua função é gerar um Briefing de Compliance preciso, baseado em evidências regulatórias reais.

RESPONSABILIDADES:
1. Identificar gaps de compliance com base nas respostas do questionário
2. Citar APENAS artigos dos documentos regulatórios fornecidos no contexto
3. Calcular nível de risco geral (baixo/medio/alto/critico)
4. Identificar inconsistências nas respostas quando existirem
5. Gerar confidence score honesto com limitações declaradas

${regulatoryContext}

${OUTPUT_CONTRACT}`,
          },
          {
            role: "user",
            content: `PROJETO: ${project.name}
DESCRIÇÃO: ${(project as any).description || ""}

RESPOSTAS DO QUESTIONÁRIO:
${answersText}
${correctionContext}
${complementContext}

Gere o Briefing estruturado em JSON:
{
  "nivel_risco_geral": "alto",
  "resumo_executivo": "...",
  "principais_gaps": [{"gap": "...", "causa_raiz": "...", "evidencia_regulatoria": "Art. X LC 214/2025", "urgencia": "imediata"}],
  "oportunidades": ["..."],
  "recomendacoes_prioritarias": ["..."],
  "inconsistencias": [{"pergunta_origem": "...", "resposta_declarada": "...", "contradicao_detectada": "...", "impacto": "alto"}],
  "confidence_score": {"nivel_confianca": 85, "limitacoes": ["..."], "recomendacao": "Revisão por advogado tributarista recomendada"}
}`,
          },
        ],
        BriefingStructuredSchema,
        { temperature: 0.2, context: "generateBriefing" }
      );

      // Converter estruturado para Markdown (compatibilidade com UI existente)
      const briefingMarkdown = buildBriefingMarkdown(structured);

      // Salvar briefing no banco (markdown + estruturado)
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({
          briefingContent: briefingMarkdown as any,
          briefingStructured: JSON.stringify(structured) as any,
          currentStep: 3,
        } as any)
        .where(eq(projects.id, input.projectId));

      return { briefing: briefingMarkdown, structured };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 3: Aprovar Briefing
  // ─────────────────────────────────────────────────────────────────────────
  approveBriefing: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      briefingContent: z.string(),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ currentStep: 4, status: "matriz_riscos", briefingContent: input.briefingContent as any } as any)
        .where(eq(projects.id, input.projectId));
      return { success: true, nextStep: 4 };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 4: Gerar Matrizes de Riscos
  // V60: papel definido + temperatura 0.2 + retry
  // V61: severidade_score numérico + scoring global calculado no servidor
  // V62: injeção de contexto regulatório
  // ─────────────────────────────────────────────────────────────────────────
  generateRiskMatrices: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      briefingContent: z.string(),
      area: z.enum(["contabilidade", "negocio", "ti", "juridico"]).optional(),
      adjustment: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const areas = input.area ? [input.area] : ["contabilidade", "negocio", "ti", "juridico"];
      const matrices: Record<string, any[]> = {};
      const areaNames: Record<string, string> = {
        contabilidade: "Contabilidade e Fiscal",
        negocio: "Áreas de Negócio e Operações",
        ti: "Tecnologia da Informação e Sistemas",
        juridico: "Advocacia Tributária e Jurídico",
      };

      // V65: RAG híbrido — busca artigos para matrizes de risco (versão rápida, 1 chamada para todas as áreas)
      const confirmedCnaes = ((project as any).confirmedCnaes as any[]) || [];
      const cnaeCodesMatrix = confirmedCnaes.map((c: any) => c.code);
      const ragCtxMatrix = await retrieveArticlesFast(cnaeCodesMatrix, input.briefingContent?.substring(0, 500) ?? "", 7);
      const regulatoryContext = ragCtxMatrix.contextText;

      // V70.3: Paralelizar as 4 áreas com Promise.all (reduz ~3min sequencial para ~45s paralelo)
      // Nota: regulatoryContext é compartilhado (1 busca RAG para todas as áreas)
      const matrixResults = await Promise.all(areas.map(async (area) => {
        const adjustmentContext = input.adjustment ? `\n\nAJUSTE SOLICITADO: ${input.adjustment}` : "";

        const result = await generateWithRetry(
          [
            {
              role: "system",
              content: `Você é um Auditor de Riscos Regulatórios especializado na Reforma Tributária brasileira (LC 214/2025).
Sua função é identificar e quantificar riscos de compliance para a área de ${areaNames[area]}.

REGRAS OBRIGATÓRIAS:
1. Cada risco deve ter causa_raiz identificada
2. Cada risco deve ter evidencia_regulatoria (artigo específico do contexto fornecido)
3. severidade_score deve ser numérico: Baixa=1-3, Média=4-6, Alta=7-8, Crítica=9
4. Gere entre 5 e 10 riscos específicos para a área
5. Nunca invente artigos — use apenas os fornecidos no contexto

${regulatoryContext}

${OUTPUT_CONTRACT}`,
            },
            {
              role: "user",
              content: `BRIEFING DO PROJETO:
${input.briefingContent}

ÁREA: ${areaNames[area]}
${adjustmentContext}

Formato:
{"risks": [{"id": "r1", "evento": "...", "causa_raiz": "...", "evidencia_regulatoria": "Art. X LC 214/2025", "probabilidade": "Alta", "impacto": "Alto", "severidade": "Crítica", "severidade_score": 9, "plano_acao": "..."}]}`,
            },
          ],
          RisksResponseSchema,
          { temperature: 0.2, context: `generateRiskMatrices:${area}` }
        );

        return { area, risks: result.risks };
      }));

      // Montar o objeto matrices a partir dos resultados paralelos
      for (const { area, risks } of matrixResults) {
        matrices[area] = risks;
      }

      // V61: Calcular scoring global no servidor (determinístico)
      const allRisks = Object.values(matrices).flat();
      const faturamentoAnual = (project as any).faturamentoAnual as number | undefined;
      const scoringData = calculateGlobalScore(allRisks, faturamentoAnual);

      // Salvar scoring no banco
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ scoringData: scoringData as any } as any)
        .where(eq(projects.id, input.projectId));

      return { matrices, scoringData };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 4: Aprovar todas as matrizes
  // ─────────────────────────────────────────────────────────────────────────
  approveMatrices: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      matrices: z.record(z.string(), z.array(z.any())),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ currentStep: 5, status: "plano_acao", riskMatricesData: input.matrices as any } as any)
        .where(eq(projects.id, input.projectId));
      return { success: true, nextStep: 5 };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 5: Gerar Plano de Ação
  // V60: papel definido + temperatura 0.2 + retry
  // V62: injeção de contexto regulatório
  // ─────────────────────────────────────────────────────────────────────────
  generateActionPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      matrices: z.record(z.string(), z.array(z.any())),
      area: z.enum(["contabilidade", "negocio", "ti", "juridico"]).optional(),
      adjustment: z.string().optional(),
      // V70.2: Briefing context para enriquecer o plano de ação
      briefingContent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const areas = input.area ? [input.area] : ["contabilidade", "negocio", "ti", "juridico"];
      const plans: Record<string, any[]> = {};
      const areaNames: Record<string, string> = {
        contabilidade: "Contabilidade e Fiscal",
        negocio: "Áreas de Negócio e Operações",
        ti: "Tecnologia da Informação e Sistemas",
        juridico: "Advocacia Tributária e Jurídico",
      };

      // V70.2: Buscar respostas do questionário do banco para enriquecer o prompt
      const database = await db.getDb();
      let questionnaireContext = "";
      if (database) {
        const answers = await database
          .select()
          .from(questionnaireAnswersV3)
          .where(eq(questionnaireAnswersV3.projectId, input.projectId));
        if (answers.length > 0) {
          // Agrupar por CNAE e formatar como texto legível
          const byCnae: Record<string, typeof answers> = {};
          for (const a of answers) {
            if (!byCnae[a.cnaeCode]) byCnae[a.cnaeCode] = [];
            byCnae[a.cnaeCode].push(a);
          }
          questionnaireContext = Object.entries(byCnae).map(([cnae, ans]) =>
            `CNAE ${cnae}:\n` + (ans as any[]).map((a: any) => `  P: ${a.questionText}\n  R: ${a.answer}`).join("\n")
          ).join("\n\n");
        }
      }

      // V70.2: CNAEs confirmados com descrições
      const confirmedCnaes = ((project as any).confirmedCnaes as any[]) || [];
      const cnaeCodesAction = confirmedCnaes.map((c: any) => c.code);
      const cnaeDescriptions = confirmedCnaes.map((c: any) => `${c.code} — ${c.description || c.code}`).join(", ");

      // V70.3: Paralelizar as 4 áreas com Promise.all (reduz ~3min sequencial para ~45s paralelo)
      const areaResults = await Promise.all(areas.map(async (area) => {
        const areaRisks = input.matrices[area] || [];
        if (areaRisks.length === 0) {
          return { area, tasks: [] as any[] };
        }
        const adjustmentContext = input.adjustment ? `\n\nAJUSTE SOLICITADO: ${input.adjustment}` : "";

        // V70.2: RAG específico por área (query inclui nome da área + top riscos)
        const areaQuery = `${areaNames[area]} ${cnaeDescriptions} ${areaRisks.slice(0, 3).map((r: any) => r.evento || "").join(" ")}`;
        const ragCtxArea = await retrieveArticlesFast(cnaeCodesAction, areaQuery, 10);
        const regulatoryContext = ragCtxArea.contextText;

        // V70.2: Briefing context (resumo dos gaps identificados)
        const briefingCtx = input.briefingContent
          ? `\n\nBRIEFING DO PROJETO (gaps identificados):\n${input.briefingContent.substring(0, 1500)}`
          : "";

        const result = await generateWithRetry(
          [
            {
              role: "system",
              content: `Você é um Gestor Sênior de Compliance Tributário especializado na Reforma Tributária brasileira (LC 214/2025, LC 224/2025, LC 227/2025).

Sua missão é criar um Plano de Ação CONCRETO, ESPECÍFICO e EXECUTÁVEL para a área de ${areaNames[area]}.

CONTEXTO DO PROJETO:
- Empresa: ${project.name}
- CNAEs analisados: ${cnaeDescriptions}
- Faturamento anual: ${(project as any).faturamentoAnual ? `R$ ${((project as any).faturamentoAnual / 1000000).toFixed(1)}M` : "não informado"}

RESPOSTAS DO QUESTIONÁRIO (o que o cliente declarou):
${questionnaireContext || "Não disponível"}
${briefingCtx}

LEGISLAÇÃO APLICÁVEL (use APENAS estes artigos como evidência):
${regulatoryContext}

REGRAS CRÍTICAS — NUNCA VIOLE:
1. PROIBIDO gerar tarefas genéricas como "Revisar processos" ou "Avaliar impactos" sem especificar O QUE revisar e QUAL impacto
2. OBRIGATÓRIO: cada tarefa deve citar a RESPOSTA ESPECÍFICA do questionário que originou o gap (campo objetivo_diagnostico)
3. OBRIGATÓRIO: cada tarefa deve citar o ARTIGO ESPECÍFICO da legislação fornecida (campo evidencia_regulatoria)
4. OBRIGATÓRIO: o campo descricao deve ter NO MÍNIMO 3 ações concretas numeradas (ex: "1. Mapear... 2. Contratar... 3. Implementar...")
5. OBRIGATÓRIO: responsavel_sugerido deve ser um cargo específico (ex: "Controller Fiscal", "Gerente de TI", "Advogado Tributário")
6. OBRIGATÓRIO: prazo_sugerido deve refletir a severidade do risco (riscos críticos = 30 dias, altos = 60 dias, médios = 90 dias)
7. Gere entre 4 e 10 tarefas por área, priorizando por severidade
8. campo cnae_origem: informe o CNAE específico que originou a tarefa
9. campo gap_especifico: descreva o gap de compliance em uma frase objetiva
10. campo acao_concreta: descreva a ação imediata (primeira coisa a fazer)
${OUTPUT_CONTRACT}`,
            },
            {
              role: "user",
              content: `ÁREA: ${areaNames[area]}

RISCOS IDENTIFICADOS NA MATRIZ (ordenados por severidade):
${JSON.stringify(areaRisks.sort((a: any, b: any) => (b.severidade_score || 0) - (a.severidade_score || 0)), null, 2)}
${adjustmentContext}

Gere o plano de ação em JSON:
{"tasks": [
  {
    "id": "t1",
    "titulo": "[Verbo de ação] + [objeto específico] + [contexto CNAE]",
    "descricao": "1. [Ação concreta 1]\\n2. [Ação concreta 2]\\n3. [Ação concreta 3]",
    "area": "${area}",
    "prazo_sugerido": "30 dias",
    "prioridade": "Alta",
    "responsavel_sugerido": "[Cargo específico]",
    "objetivo_diagnostico": "Gap identificado: [resposta do questionário que revelou o problema]",
    "evidencia_regulatoria": "Art. X, \u00a7 Y da LC 214/2025",
    "cnae_origem": "${cnaeCodesAction[0] || ""}",
    "gap_especifico": "[Descrição objetiva do gap de compliance]",
    "acao_concreta": "[Primeira ação imediata a executar]"
  }
]}`,
            },
          ],
          TasksResponseSchema,
          { temperature: 0.15, context: `generateActionPlan:${area}` }
        );

        return {
          area,
          tasks: result.tasks.map((t: any) => ({
            ...t,
            status: "nao_iniciado",
            progress: 0,
            startDate: null,
            endDate: null,
            responsible: null,
            comments: [],
            notifications: { beforeDays: 7, onStatusChange: true, onProgressUpdate: false, onComment: false },
          })),
        };
      }));

      // Montar o objeto plans a partir dos resultados paralelos
      for (const { area, tasks } of areaResults) {
        plans[area] = tasks;
      }

      return { plans };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 5: Atualizar tarefa do plano de ação
  // ─────────────────────────────────────────────────────────────────────────
  updateTask: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      area: z.enum(["contabilidade", "negocio", "ti", "juridico"]),
      taskId: z.string(),
      updates: z.object({
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        status: z.enum(["nao_iniciado", "em_andamento", "parado", "concluido"]).optional(),
        progress: z.number().min(0).max(100).optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        responsible: z.string().nullable().optional(),
        notifications: z.object({
          beforeDays: z.number().optional(),
          onStatusChange: z.boolean().optional(),
          onProgressUpdate: z.boolean().optional(),
          onComment: z.boolean().optional(),
        }).optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const currentPlans = (project as any).actionPlansData || {};
      const areaTasks = currentPlans[input.area] || [];
      const currentTask = areaTasks.find((t: any) => t.id === input.taskId);
      const updatedTasks = areaTasks.map((task: any) =>
        task.id === input.taskId ? { ...task, ...input.updates } : task
      );
      currentPlans[input.area] = updatedTasks;
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ actionPlansData: currentPlans as any } as any)
        .where(eq(projects.id, input.projectId));

      if (currentTask) {
        const histBase = {
          projectId: input.projectId,
          taskId: input.taskId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Usuário",
        };
        const fieldMap: Array<{ key: string; eventType: any; label: string }> = [
          { key: "status",      eventType: "status",      label: "status" },
          { key: "responsible", eventType: "responsavel", label: "responsável" },
          { key: "endDate",     eventType: "prazo",        label: "prazo" },
          { key: "progress",    eventType: "progresso",    label: "progresso" },
          { key: "titulo",      eventType: "titulo",       label: "título" },
        ];
        const ups = input.updates as Record<string, any>;
        const promises: Promise<any>[] = [];
        for (const { key, eventType, label } of fieldMap) {
          if (ups[key] !== undefined && ups[key] !== currentTask[key]) {
            promises.push(db.insertTaskHistory({
              ...histBase,
              eventType,
              field: label,
              oldValue: currentTask[key] != null ? String(currentTask[key]) : null,
              newValue: ups[key] != null ? String(ups[key]) : null,
            }));
          }
        }
        if (ups.notifications !== undefined) {
          promises.push(db.insertTaskHistory({
            ...histBase,
            eventType: "notificacao",
            field: "notificações",
            oldValue: currentTask.notifications ? JSON.stringify(currentTask.notifications) : null,
            newValue: JSON.stringify({ ...currentTask.notifications, ...ups.notifications }),
          }));
        }
        Promise.allSettled(promises).catch(() => {});
      }
      return { success: true };
    }),

  // RF-HIST: Consultar histórico de alterações de uma tarefa
  getTaskHistory: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      taskId: z.string(),
    }))
    .query(async ({ input }) => {
      return db.getTaskHistory(input.taskId, input.projectId);
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 5: Auto-save — salva rascunho do plano sem alterar status/currentStep
  // Chamado automaticamente após geração pela IA para garantir persistência
  // ─────────────────────────────────────────────────────────────────────────
  saveDraftActionPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      plans: z.record(z.string(), z.array(z.any())),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      // Apenas persiste actionPlansData — não altera status nem currentStep
      await database
        .update(projects)
        .set({ actionPlansData: input.plans as any } as any)
        .where(eq(projects.id, input.projectId));
      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 5: Aprovar plano de ação + gerar decisão (V63)
  // ─────────────────────────────────────────────────────────────────────────
  approveActionPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      plans: z.record(z.string(), z.array(z.any())),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Salvar plano aprovado
      await database
        .update(projects)
        .set({ currentStep: 5, status: "aprovado", actionPlansData: input.plans as any } as any)
        .where(eq(projects.id, input.projectId));

      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // V63: Gerar Motor de Decisão Explícito
  // Consolida briefing + matrizes + scoring → veredito final
  // ─────────────────────────────────────────────────────────────────────────
  generateDecision: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const briefingContent = (project as any).briefingContent as string | null;
      const riskMatricesData = (project as any).riskMatricesData as Record<string, any[]> | null;
      const scoringData = (project as any).scoringData as any | null;
      const confirmedCnaes = ((project as any).confirmedCnaes as any[]) || [];

      if (!briefingContent || !riskMatricesData) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Briefing e matrizes de risco devem estar gerados antes da decisão",
        });
      }

      // Resumo dos riscos críticos
      const allRisks = Object.values(riskMatricesData).flat();
      const riscoCriticos = allRisks.filter((r: any) => r.severidade === "Crítica");
      const riscoAltos = allRisks.filter((r: any) => r.severidade === "Alta");

      const riscosSummary = [
        ...riscoCriticos.slice(0, 3).map((r: any) => `[CRÍTICO] ${r.evento}`),
        ...riscoAltos.slice(0, 2).map((r: any) => `[ALTO] ${r.evento}`),
      ].join("\n");

      // V65: RAG híbrido — busca artigos para decisão final (com re-ranking LLM para máxima precisão)
      const cnaeCodesDecisao = confirmedCnaes.map((c: any) => c.code);
      const ragCtxDecisao = await retrieveArticles(cnaeCodesDecisao, `${project.name} ${riscosSummary}`, 5);
      const regulatoryContext = ragCtxDecisao.contextText;

      const result = await generateWithRetry(
        [
          {
            role: "system",
            content: `Você é um Sócio Sênior de Tributação com 20 anos de experiência em Reforma Tributária brasileira.
Sua função é emitir o VEREDITO FINAL do diagnóstico: uma decisão clara, executável e fundamentada.

RESPONSABILIDADES:
1. Consolidar todos os dados do diagnóstico em UMA decisão principal
2. Definir prazo realista baseado na urgência dos riscos
3. Quantificar o risco de inação de forma concreta
4. Gerar o "momento wow" — um insight que o cliente não esperava
5. Fundamentar a decisão em artigos reais (use apenas os do contexto)

${regulatoryContext}

${OUTPUT_CONTRACT}`,
          },
          {
            role: "user",
            content: `PROJETO: ${project.name}
SCORE GLOBAL: ${scoringData?.score_global ?? "N/A"}/100 (${scoringData?.nivel ?? "N/A"})
IMPACTO ESTIMADO: ${scoringData?.impacto_estimado ?? "N/A"}

PRINCIPAIS RISCOS:
${riscosSummary || "Nenhum risco crítico identificado"}

BRIEFING (resumo):
${briefingContent.substring(0, 800)}...

Gere o veredito final em JSON:
{
  "decisao_recomendada": {
    "acao_principal": "Ação clara e específica que deve ser tomada imediatamente",
    "prazo_dias": 60,
    "risco_se_nao_fazer": "Consequência concreta e quantificada de não agir",
    "prioridade": "critica",
    "proximos_passos": ["Passo 1 específico", "Passo 2 específico", "Passo 3 específico"],
    "momento_wow": "Insight inesperado que surpreende o cliente — ex: oportunidade de redução de carga ou risco oculto",
    "fundamentacao_legal": "Art. X LC 214/2025 — base legal da decisão"
  }
}`,
          },
        ],
        DecisaoResponseSchema,
        { temperature: 0.35, context: "generateDecision" } // Temperatura ligeiramente maior para insight criativo
      );

      // Salvar decisão no banco
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ decisaoData: result.decisao_recomendada as any } as any)
        .where(eq(projects.id, input.projectId));

      return { decisao: result.decisao_recomendada };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // PÁGINA DE DETALHES: Resumo completo do projeto
  // ─────────────────────────────────────────────────────────────────────────
  getProjectSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const answers = await database
        .select()
        .from(questionnaireAnswersV3)
        .where(eq(questionnaireAnswersV3.projectId, input.projectId));

      const actionPlansData = (project as any).actionPlansData as Record<string, any[]> | null;
      let totalTasks = 0;
      let completedTasks = 0;
      let tasksByArea: { area: string; count: number; completed: number }[] = [];
      if (actionPlansData) {
        for (const [area, tasks] of Object.entries(actionPlansData)) {
          const activeTasks = (tasks as any[]).filter(t => !t.deleted);
          const done = activeTasks.filter(t => t.status === "concluido").length;
          totalTasks += activeTasks.length;
          completedTasks += done;
          if (activeTasks.length > 0) tasksByArea.push({ area, count: activeTasks.length, completed: done });
        }
      }

      const riskMatricesData = (project as any).riskMatricesData as Record<string, any[]> | null;
      let totalRisks = 0;
      if (riskMatricesData) {
        for (const risks of Object.values(riskMatricesData)) {
          totalRisks += (risks as any[]).length;
        }
      }

      const confirmedCnaes = ((project as any).confirmedCnaes as any[]) || [];

      return {
        id: project.id,
        name: project.name,
        description: (project as any).description,
        status: project.status,
        currentStep: (project as any).currentStep ?? 1,
        clientId: project.clientId,
        planPeriodMonths: project.planPeriodMonths,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        confirmedCnaes,
        totalAnswers: answers.length,
        totalTasks,
        completedTasks,
        totalRisks,
        tasksByArea,
        hasBriefing: !!(project as any).briefingContent,
        hasRiskMatrices: !!riskMatricesData && Object.keys(riskMatricesData).length > 0,
        hasActionPlan: !!actionPlansData && Object.keys(actionPlansData).length > 0,
        scoringData: (project as any).scoringData ?? null,   // V61
        decisaoData: (project as any).decisaoData ?? null,   // V63
        // V64: inconsistencias do briefing estruturado
        inconsistencias: (() => {
          const bs = (project as any).briefingStructured;
          if (!bs) return [];
          try {
            const parsed = typeof bs === "string" ? JSON.parse(bs) : bs;
            return Array.isArray(parsed?.inconsistencias) ? parsed.inconsistencias : [];
          } catch { return []; }
        })(),
      };
    }),

  // V64: Buscar inconsistencias do briefing de um projeto
  getBriefingInconsistencias: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // Verificar acesso: dono, criador ou membro da equipe Solaris/advogado
      const userId = ctx.user.id;
      const isOwner = project.clientId === userId || (project as any).createdById === userId;
      const isTeam = ctx.user.role === "equipe_solaris" || ctx.user.role === "advogado_senior" || ctx.user.role === "advogado_junior";
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });

      const bs = (project as any).briefingStructured;
      if (!bs) return { inconsistencias: [], totalCount: 0, hasAlerts: false };

      try {
        const parsed = typeof bs === "string" ? JSON.parse(bs) : bs;
        const inconsistencias = Array.isArray(parsed?.inconsistencias) ? parsed.inconsistencias : [];
        return {
          inconsistencias,
          totalCount: inconsistencias.length,
          hasAlerts: inconsistencias.length > 0,
          // Contagem por impacto
          countByImpact: {
            alto: inconsistencias.filter((i: any) => i.impacto === "alto").length,
            medio: inconsistencias.filter((i: any) => i.impacto === "medio").length,
            baixo: inconsistencias.filter((i: any) => i.impacto === "baixo").length,
          },
        };
      } catch {
        return { inconsistencias: [], totalCount: 0, hasAlerts: false };
      }
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // MODO REVISÃO: Validar acesso ao projeto para edição de respostas
  // Usado quando o usuário retorna do Briefing para corrigir inconsistências.
  // As respostas individuais são atualizadas via saveAnswer (já existente).
  // O status/currentStep do projeto NÃO é alterado.
  // ─────────────────────────────────────────────────────────────────────────
  checkRevisionAccess: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = project.clientId === userId || (project as any).createdById === userId;
      const isTeam = ctx.user.role === "equipe_solaris" || ctx.user.role === "advogado_senior" || ctx.user.role === "advogado_junior";
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });
      return {
        canEdit: true,
        projectId: input.projectId,
        status: (project as any).status,
        currentStep: (project as any).currentStep,
      };
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Converter BriefingStructured → Markdown (compatibilidade com UI)
// ─────────────────────────────────────────────────────────────────────────────

function buildBriefingMarkdown(structured: any): string {
  const nivelLabel: Record<string, string> = {
    baixo: "🟢 Baixo",
    medio: "🟡 Médio",
    alto: "🟠 Alto",
    critico: "🔴 Crítico",
  };

  const lines: string[] = [
    `# Briefing de Compliance — Reforma Tributária`,
    ``,
    `## Nível de Risco Geral: ${nivelLabel[structured.nivel_risco_geral] ?? structured.nivel_risco_geral}`,
    ``,
    `## 1. Resumo Executivo`,
    ``,
    structured.resumo_executivo,
    ``,
    `## 2. Principais Gaps de Compliance`,
    ``,
  ];

  for (const gap of (structured.principais_gaps ?? [])) {
    lines.push(`### ${gap.gap}`);
    lines.push(`- **Causa Raiz:** ${gap.causa_raiz}`);
    lines.push(`- **Base Legal:** ${gap.evidencia_regulatoria}`);
    lines.push(`- **Urgência:** ${gap.urgencia}`);
    lines.push(``);
  }

  lines.push(`## 3. Oportunidades`);
  lines.push(``);
  for (const op of (structured.oportunidades ?? [])) {
    lines.push(`- ${op}`);
  }
  lines.push(``);

  lines.push(`## 4. Recomendações Prioritárias`);
  lines.push(``);
  (structured.recomendacoes_prioritarias ?? []).forEach((rec: string, i: number) => {
    lines.push(`${i + 1}. ${rec}`);
  });
  lines.push(``);

  // V61: Alertas de inconsistência (condicional)
  if (structured.inconsistencias && structured.inconsistencias.length > 0) {
    lines.push(`## 5. Alertas de Inconsistência`);
    lines.push(``);
    lines.push(`> ⚠️ As inconsistências abaixo foram detectadas nas respostas do questionário e requerem verificação.`);
    lines.push(``);
    for (const inc of structured.inconsistencias) {
      lines.push(`### ${inc.contradicao_detectada}`);
      lines.push(`- **Resposta declarada:** ${inc.resposta_declarada}`);
      lines.push(`- **Impacto:** ${inc.impacto}`);
      lines.push(``);
    }
  }

  // V61: Confidence score / Limites do diagnóstico
  const cs = structured.confidence_score;
  if (cs) {
    lines.push(`## ${structured.inconsistencias?.length > 0 ? "6" : "5"}. Limites do Diagnóstico Automatizado`);
    lines.push(``);
    lines.push(`> **Nível de Confiança:** ${cs.nivel_confianca}% — ${cs.recomendacao}`);
    lines.push(``);
    if (cs.limitacoes?.length > 0) {
      lines.push(`**Limitações identificadas:**`);
      for (const lim of cs.limitacoes) {
        lines.push(`- ${lim}`);
      }
    }
  }

  return lines.join("\n");
}
