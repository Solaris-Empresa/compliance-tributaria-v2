/**
 * routers-session-questionnaire.ts
 * Fase 2 do Novo Fluxo v2.0 — Questionário Adaptativo por Ramo
 *
 * Procedures:
 *  - sessionQuestionnaire.generateQuestions  → IA gera perguntas para um ramo
 *  - sessionQuestionnaire.getQuestions       → busca perguntas já geradas
 *  - sessionQuestionnaire.saveAnswers        → salva respostas do usuário
 *  - sessionQuestionnaire.analyzeAnswers     → IA analisa respostas e gera risco
 *  - sessionQuestionnaire.getProgress        → progresso de todos os ramos da sessão
 *  - sessionQuestionnaire.getBranchStatus    → status de um ramo específico
 */

import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { sessions, sessionBranchAnswers } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { IAGEN_QUESTIONS_COUNT } from "./config/question-limits";

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface GeneratedQuestion {
  id: string;
  question: string;
  type: "single_choice" | "multiple_choice" | "text" | "scale";
  options?: string[];
  required: boolean;
  helpText?: string;
}

interface BranchAnswer {
  questionId: string;
  answer: string | string[] | number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Gera 6-8 perguntas adaptativas para um ramo específico usando IA
 * Considera o contexto da empresa para personalizar as perguntas
 *
 * M3 NOVA-01: parâmetro opcional `archetypeContext` injetado quando a sessão
 * está vinculada a um projeto com archetype confirmado. Backward-compat:
 * se ausente, prompt segue idêntico ao comportamento legado.
 *
 * Nota: sessões frequentemente são pré-projeto (sem `projects.archetype`),
 * por isso o parâmetro é opcional. Os callers atuais ainda não buscam
 * archetype — apenas a assinatura está preparada para extensão futura.
 */
async function generateQuestionsForBranch(
  branchCode: string,
  branchName: string,
  companyDescription: string,
  archetypeContext?: string,
): Promise<GeneratedQuestion[]> {
  const archLine = archetypeContext
    ? `\nPerfil da Entidade (arquétipo M1): ${archetypeContext}`
    : "";
  const prompt = `Você é um especialista em compliance tributário da Reforma Tributária Brasileira (IBS, CBS, IS).

Empresa: ${companyDescription}${archLine}
Ramo de Atividade: ${branchName} (${branchCode})

Gere exatamente ${IAGEN_QUESTIONS_COUNT} perguntas de diagnóstico de compliance tributário para este ramo específico.
As perguntas devem ser práticas, objetivas e relevantes para a Reforma Tributária 2024-2033.

Retorne APENAS um JSON válido com este formato:
{
  "questions": [
    {
      "id": "q1",
      "question": "texto da pergunta",
      "type": "single_choice",
      "options": ["Sim, totalmente", "Parcialmente", "Não", "Não se aplica"],
      "required": true,
      "helpText": "explicação breve opcional"
    }
  ]
}

Tipos permitidos: single_choice (com options), multiple_choice (com options), text (sem options), scale (sem options, escala 1-5).
Foque em: sistemas fiscais, obrigações acessórias, alíquotas por ramo, regimes especiais, prazos de adaptação.`;

  try {
    const response = await invokeLLM({
          enableCache: true,
      messages: [
        {
          role: "system",
          content: "Você é um especialista em compliance tributário. Responda APENAS com JSON válido, sem markdown.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "questionnaire",
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
                    type: { type: "string", enum: ["single_choice", "multiple_choice", "text", "scale"] },
                    options: { type: "array", items: { type: "string" } },
                    required: { type: "boolean" },
                    helpText: { type: "string" },
                  },
                  required: ["id", "question", "type", "required"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      } as any,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM retornou resposta vazia");

    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return parsed.questions as GeneratedQuestion[];
  } catch (err) {
    // Fallback: perguntas padrão se IA falhar
    console.error(`[sessionQuestionnaire] Erro ao gerar perguntas para ${branchCode}:`, err);
    return getDefaultQuestions(branchCode, branchName);
  }
}

/**
 * Perguntas padrão de fallback caso a IA falhe
 */
function getDefaultQuestions(branchCode: string, branchName: string): GeneratedQuestion[] {
  return [
    {
      id: "q1",
      question: `Sua empresa possui sistema ERP atualizado para o ramo de ${branchName}?`,
      type: "single_choice",
      options: ["Sim, totalmente atualizado", "Parcialmente atualizado", "Em processo de atualização", "Não possui"],
      required: true,
    },
    {
      id: "q2",
      question: "Sua equipe fiscal conhece as mudanças da Reforma Tributária (IBS/CBS/IS)?",
      type: "single_choice",
      options: ["Sim, totalmente", "Parcialmente", "Está em treinamento", "Não"],
      required: true,
    },
    {
      id: "q3",
      question: "Qual é o nível de complexidade das suas obrigações acessórias atuais?",
      type: "scale",
      required: true,
      helpText: "1 = muito simples, 5 = muito complexo",
    },
    {
      id: "q4",
      question: "Quais regimes tributários especiais se aplicam ao seu negócio?",
      type: "multiple_choice",
      options: ["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI", "Regime especial setorial", "Nenhum"],
      required: true,
    },
    {
      id: "q5",
      question: "Sua empresa já mapeou os impactos financeiros da transição para o novo sistema?",
      type: "single_choice",
      options: ["Sim, completamente", "Parcialmente", "Em andamento", "Não iniciou"],
      required: true,
    },
    {
      id: "q6",
      question: "Descreva os principais desafios de compliance tributário que sua empresa enfrenta:",
      type: "text",
      required: false,
      helpText: "Opcional — quanto mais detalhes, melhor o plano de ação",
    },
    {
      id: "q7",
      question: "Sua empresa possui consultoria tributária especializada?",
      type: "single_choice",
      options: ["Sim, interna", "Sim, externa", "Ambas", "Não"],
      required: true,
    },
  ];
}

/**
 * Analisa as respostas e gera nível de risco + recomendações
 */
async function analyzeAnswersWithAI(
  branchCode: string,
  branchName: string,
  companyDescription: string,
  questions: GeneratedQuestion[],
  answers: BranchAnswer[]
): Promise<{ analysis: string; riskLevel: "baixo" | "medio" | "alto" | "critico" }> {
  const qaText = questions
    .map((q) => {
      const ans = answers.find((a) => a.questionId === q.id);
      return `P: ${q.question}\nR: ${ans?.answer ?? "Não respondido"}`;
    })
    .join("\n\n");

  const prompt = `Você é um especialista em compliance tributário da Reforma Tributária Brasileira.

Empresa: ${companyDescription}
Ramo: ${branchName} (${branchCode})

Respostas do diagnóstico:
${qaText}

Analise as respostas e retorne um JSON com:
1. "analysis": texto de análise (2-3 parágrafos) com pontos críticos, riscos e recomendações prioritárias
2. "riskLevel": nível de risco geral ("baixo", "medio", "alto", "critico")

Retorne APENAS JSON válido.`;

  try {
    const response = await invokeLLM({
          enableCache: true,
      messages: [
        { role: "system", content: "Especialista em compliance tributário. Responda APENAS com JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              analysis: { type: "string" },
              riskLevel: { type: "string", enum: ["baixo", "medio", "alto", "critico"] },
            },
            required: ["analysis", "riskLevel"],
            additionalProperties: false,
          },
        },
      } as any,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM retornou resposta vazia");
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return { analysis: parsed.analysis, riskLevel: parsed.riskLevel };
  } catch (err) {
    console.error("[sessionQuestionnaire] Erro ao analisar respostas:", err);
    return {
      analysis: `Análise preliminar para o ramo ${branchName}: Com base nas respostas fornecidas, identificamos pontos de atenção que requerem acompanhamento. Recomendamos uma revisão detalhada dos processos fiscais e a implementação de um plano de adequação à Reforma Tributária.`,
      riskLevel: "medio",
    };
  }
}

// ─── Router ────────────────────────────────────────────────────────────────────

export const sessionQuestionnaireRouter = router({
  /**
   * Gera (ou recupera) perguntas para um ramo específico da sessão
   */
  generateQuestions: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        branchCode: z.string(),
        branchName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Verificar sessão válida
      const [session] = await database
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.sessionToken, input.sessionToken),
            // Não verificar expiração aqui — deixar para o frontend gerenciar
          )
        )
        .limit(1);

      if (!session) throw new Error("Sessão não encontrada");

      const companyDescription = session.companyDescription ?? "Empresa brasileira";

      // Verificar se já existem perguntas geradas para este ramo
      const [existing] = await database
        .select()
        .from(sessionBranchAnswers)
        .where(
          and(
            eq(sessionBranchAnswers.sessionToken, input.sessionToken),
            eq(sessionBranchAnswers.branchCode, input.branchCode)
          )
        )
        .limit(1);

      if (existing && existing.generatedQuestions) {
        // Retornar perguntas já geradas
        return {
          id: existing.id,
          branchCode: existing.branchCode,
          branchName: existing.branchName,
          questions: existing.generatedQuestions as GeneratedQuestion[],
          answers: (existing.answers as BranchAnswer[]) ?? [],
          status: existing.status,
          aiAnalysis: existing.aiAnalysis,
          riskLevel: existing.riskLevel,
        };
      }

      // Gerar novas perguntas com IA
      const questions = await generateQuestionsForBranch(
        input.branchCode,
        input.branchName,
        companyDescription
      );

      // Salvar no banco
      const [inserted] = await database
        .insert(sessionBranchAnswers)
        .values({
          sessionToken: input.sessionToken,
          branchCode: input.branchCode,
          branchName: input.branchName,
          generatedQuestions: questions as any,
          answers: [] as any,
          status: "em_andamento",
        })
        .$returningId();

      return {
        id: inserted.id,
        branchCode: input.branchCode,
        branchName: input.branchName,
        questions,
        answers: [] as BranchAnswer[],
        status: "em_andamento" as const,
        aiAnalysis: null,
        riskLevel: null,
      };
    }),

  /**
   * Busca perguntas e respostas de um ramo (sem gerar novas)
   */
  getQuestions: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        branchCode: z.string(),
      })
    )
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [row] = await database
        .select()
        .from(sessionBranchAnswers)
        .where(
          and(
            eq(sessionBranchAnswers.sessionToken, input.sessionToken),
            eq(sessionBranchAnswers.branchCode, input.branchCode)
          )
        )
        .limit(1);

      if (!row) return null;

      return {
        id: row.id,
        branchCode: row.branchCode,
        branchName: row.branchName,
        questions: (row.generatedQuestions as GeneratedQuestion[]) ?? [],
        answers: (row.answers as BranchAnswer[]) ?? [],
        status: row.status,
        aiAnalysis: row.aiAnalysis,
        riskLevel: row.riskLevel,
      };
    }),

  /**
   * Salva as respostas do usuário para um ramo
   */
  saveAnswers: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        branchCode: z.string(),
        answers: z.array(
          z.object({
            questionId: z.string(),
            answer: z.union([z.string(), z.array(z.string()), z.number()]),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      await database
        .update(sessionBranchAnswers)
        .set({
          answers: input.answers as any,
          status: "em_andamento",
        })
        .where(
          and(
            eq(sessionBranchAnswers.sessionToken, input.sessionToken),
            eq(sessionBranchAnswers.branchCode, input.branchCode)
          )
        );

      return { success: true };
    }),

  /**
   * Analisa as respostas e gera nível de risco + recomendações (finaliza o ramo)
   */
  analyzeAnswers: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        branchCode: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Buscar dados do ramo
      const [row] = await database
        .select()
        .from(sessionBranchAnswers)
        .where(
          and(
            eq(sessionBranchAnswers.sessionToken, input.sessionToken),
            eq(sessionBranchAnswers.branchCode, input.branchCode)
          )
        )
        .limit(1);

      if (!row) throw new Error("Ramo não encontrado na sessão");

      // Buscar contexto da sessão
      const [session] = await database
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, input.sessionToken))
        .limit(1);

      const companyDescription = session?.companyDescription ?? "Empresa brasileira";
      const questions = (row.generatedQuestions as GeneratedQuestion[]) ?? [];
      const answers = (row.answers as BranchAnswer[]) ?? [];

      // Analisar com IA
      const { analysis, riskLevel } = await analyzeAnswersWithAI(
        row.branchCode,
        row.branchName,
        companyDescription,
        questions,
        answers
      );

      // Salvar análise e marcar como concluído
      await database
        .update(sessionBranchAnswers)
        .set({
          aiAnalysis: analysis,
          riskLevel,
          status: "concluido",
          completedAt: new Date(),
        })
        .where(
          and(
            eq(sessionBranchAnswers.sessionToken, input.sessionToken),
            eq(sessionBranchAnswers.branchCode, input.branchCode)
          )
        );

      return { analysis, riskLevel, success: true };
    }),

  /**
   * Retorna o progresso de todos os ramos da sessão
   */
  getProgress: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Buscar sessão para obter ramos confirmados
      const [session] = await database
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, input.sessionToken))
        .limit(1);

      if (!session) return { branches: [], totalBranches: 0, completedBranches: 0, progress: 0 };

      const confirmedBranches = (session.confirmedBranches as Array<{ code: string; name: string }>) ?? [];

      // Buscar respostas de cada ramo
      const branchAnswers = await database
        .select()
        .from(sessionBranchAnswers)
        .where(eq(sessionBranchAnswers.sessionToken, input.sessionToken));

      // Mapear progresso por ramo
      const branches = confirmedBranches.map((branch) => {
        const answer = branchAnswers.find((a) => a.branchCode === branch.code);
        return {
          code: branch.code,
          name: branch.name,
          status: answer?.status ?? "pendente",
          riskLevel: answer?.riskLevel ?? null,
          hasQuestions: !!answer?.generatedQuestions,
          answersCount: answer ? (answer.answers as BranchAnswer[] ?? []).length : 0,
        };
      });

      const completedBranches = branches.filter((b) => b.status === "concluido").length;
      const totalBranches = branches.length;
      const progress = totalBranches > 0 ? Math.round((completedBranches / totalBranches) * 100) : 0;

      return { branches, totalBranches, completedBranches, progress };
    }),
});
