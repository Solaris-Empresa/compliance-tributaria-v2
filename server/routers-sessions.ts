/**
 * Router de Sessões — Novo Fluxo v2.0
 * Gerencia sessões temporárias (modo sem login) e modo com histórico
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { sessions, branchSuggestions } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import crypto from "crypto";

// Gera token único de sessão
function generateSessionToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

// Calcula expiração: 24h a partir de agora
function getExpiresAt(): Date {
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  return expires;
}

export const sessionsRouter = router({
  /**
   * Cria uma nova sessão (modo temporário ou histórico)
   * Público — não requer login
   */
  create: publicProcedure
    .input(z.object({
      mode: z.enum(["temporario", "historico"]),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      const token = generateSessionToken();
      const expiresAt = getExpiresAt();

      await database.insert(sessions).values({
        sessionToken: token,
        mode: input.mode,
        currentStep: "briefing",
        expiresAt,
      });

      return { sessionToken: token, mode: input.mode, expiresAt };
    }),

  /**
   * Busca sessão pelo token
   * Verifica se não expirou
   */
  get: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return null;
      const now = new Date();
      const [session] = await database
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.sessionToken, input.sessionToken),
            gt(sessions.expiresAt, now)
          )
        )
        .limit(1);

      if (!session) return null;
      return session;
    }),

  /**
   * Atualiza o passo atual da sessão
   */
  updateStep: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      currentStep: z.enum([
        "modo_uso",
        "briefing",
        "confirmar_ramos",
        "questionario",
        "plano_acao",
        "matriz_riscos",
        "consolidacao",
        "concluido"
      ]),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      await database
        .update(sessions)
        .set({ currentStep: input.currentStep })
        .where(eq(sessions.sessionToken, input.sessionToken));
      return { success: true };
    }),

  /**
   * Salva descrição da empresa e ramos confirmados na sessão
   */
  saveConfirmedBranches: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      companyDescription: z.string(),
      confirmedBranches: z.array(z.object({
        code: z.string(),
        name: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      await database
        .update(sessions)
        .set({
          companyDescription: input.companyDescription,
          confirmedBranches: input.confirmedBranches as any,
          currentStep: "questionario",
        })
        .where(eq(sessions.sessionToken, input.sessionToken));
      return { success: true };
    }),

  /**
   * Expira sessão manualmente (logout do modo temporário)
   */
  expire: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      // MySQL TIMESTAMP não aceita epoch (1970-01-01). Usar 1 segundo no passado.
      const past = new Date(Date.now() - 1000);
      await database
        .update(sessions)
        .set({ expiresAt: past, currentStep: "concluido" })
        .where(eq(sessions.sessionToken, input.sessionToken));
      return { success: true };
    }),

  /**
   * Sugere ramos de atividade com IA baseado na descrição da empresa
   */
  suggestBranches: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      companyDescription: z.string().min(20, "Descreva a empresa com pelo menos 20 caracteres"),
    }))
    .mutation(async ({ input }) => {
      const branches = await suggestBranchesWithAI(
        input.companyDescription,
        input.sessionToken
      );

      // Salvar sugestões na sessão
      const database = await db.getDb();
      if (database) {
        await database
          .update(sessions)
          .set({
            companyDescription: input.companyDescription,
            suggestedBranches: branches as any,
            currentStep: "confirmar_ramos",
          })
          .where(eq(sessions.sessionToken, input.sessionToken));
      }

      return { branches };
    }),
});

/**
 * Procedure de sugestão de ramos por IA
 * Analisa descrição da empresa e sugere ramos de atividade relevantes
 */
export const suggestBranchesWithAI = async (
  companyDescription: string,
  sessionToken?: string,
  projectId?: number
): Promise<Array<{ code: string; name: string; justification: string; confidence: number }>> => {
  const prompt = `Você é um especialista em compliance tributário brasileiro e na Reforma Tributária (IBS, CBS, IS).

Analise a descrição da empresa abaixo e identifique os ramos de atividade econômica relevantes para o compliance tributário da Reforma Tributária.

Descrição da empresa:
"${companyDescription}"

Retorne um JSON com os ramos de atividade identificados. Para cada ramo, forneça:
- code: código curto do ramo (ex: COM, IND, SER, FIN, AGR, SAU, EDU, TEC, CON, IMP)
- name: nome completo do ramo
- justification: justificativa breve de por que este ramo se aplica à empresa
- confidence: nível de confiança de 0 a 1

Ramos possíveis:
- COM: Comércio (varejo, atacado, distribuição)
- IND: Indústria (manufatura, produção, transformação)
- SER: Serviços (prestação de serviços em geral)
- FIN: Financeiro (bancos, seguros, crédito, investimentos)
- AGR: Agronegócio (agricultura, pecuária, agroindústria)
- SAU: Saúde (hospitais, clínicas, farmácias, planos de saúde)
- EDU: Educação (escolas, universidades, cursos)
- TEC: Tecnologia (software, TI, startups, e-commerce)
- CON: Construção (construção civil, incorporação, infraestrutura)
- IMP: Importação/Exportação (comércio exterior)

Retorne APENAS o JSON, sem texto adicional. Formato:
{"branches": [{"code": "...", "name": "...", "justification": "...", "confidence": 0.9}]}`;

  const response = await invokeLLM({
          enableCache: true,
    messages: [
      { role: "system", content: "Você é um especialista em compliance tributário. Responda apenas com JSON válido." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "branch_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            branches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  name: { type: "string" },
                  justification: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["code", "name", "justification", "confidence"],
                additionalProperties: false,
              },
            },
          },
          required: ["branches"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') throw new Error("IA não retornou resposta");

  const parsed = JSON.parse(content);
  const branches = parsed.branches || [];

  // Salvar histórico de sugestão
  const database = await db.getDb();
  if (database) {
    await database.insert(branchSuggestions).values({
      sessionToken: sessionToken || null,
      projectId: projectId || null,
      companyDescription,
      suggestedBranches: branches,
      llmModel: (response as any).model || "default",
      promptTokens: (response as any).usage?.prompt_tokens || null,
      completionTokens: (response as any).usage?.completion_tokens || null,
    });
  }

  return branches;
};
