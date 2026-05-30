/**
 * solaris-objetivo.ts — FEAT-SOL-UX-01 PR-B3
 *
 * Rota tRPC que gera o "Objetivo desta pergunta" para o card expandido no
 * QuestionarioSolaris.tsx (UX nova FEAT-SOL-UX-01 PR-C).
 *
 * Protocolo:
 *   - 1 procedure `get({ codigo })` — protectedProcedure (autenticada)
 *   - Lê a pergunta de `solaris_questions` pelo código (SOL-NNN)
 *   - Pede ao LLM um texto curto explicando o objetivo da pergunta no contexto LC 214/2025
 *   - Timeout 5s — se LLM atrasar/falhar, retorna `{ objetivo: null }` silenciosamente
 *     (degradação graciosa — Lição #67: matriz parcial > spinner infinito)
 *   - Sem cache em DB — gerado a cada chamada (despacho FEAT-SOL-UX-01)
 *
 * REGRA-ORQ-30: `temperature: 0.1` (gate INV-07 reprova qualquer valor > 0.1).
 * REGRA-ORQ-32: usa `invokeLLM` do projeto — não hardcode de modelo aqui.
 */
import { z } from "zod";
import { sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { solarisQuestions } from "../../drizzle/schema";

const SYSTEM_PROMPT =
  "Você é um especialista em direito tributário brasileiro, com foco na Reforma Tributária " +
  "(LC 214/2025 — IBS/CBS). Responda em português, de forma clara e objetiva, em no máximo 4 frases. " +
  "Foque em: por que esta informação é relevante para o diagnóstico tributário da empresa e qual risco ela mapeia.";

function buildUserPrompt(args: {
  texto: string;
  artigoRef: string | null;
  categoria: string;
}): string {
  return (
    `Explique o objetivo desta pergunta do questionário tributário, ` +
    `no contexto da LC 214/2025 (Reforma Tributária — IBS/CBS):\n\n` +
    `Pergunta: ${args.texto}\n` +
    `Artigo de referência: ${args.artigoRef ?? "não especificado"}\n` +
    `Categoria: ${args.categoria}\n\n` +
    `Foque em: por que esta informação é relevante para o diagnóstico ` +
    `tributário da empresa e qual risco ela mapeia.`
  );
}

/** Timeout dedicado para a chamada — short-circuit se o LLM demorar (UX). */
const LLM_TIMEOUT_MS = 5000;

export const solarisObjetivoRouter = router({
  /**
   * Gera o "Objetivo desta pergunta" via LLM (sem cache).
   * Sempre retorna { objetivo: string | null } — null em falha (pergunta não encontrada,
   * timeout, LLM 5xx). UI consome sem necessidade de tratar erro.
   */
  get: protectedProcedure
    .input(
      z.object({
        codigo: z
          .string()
          .min(1)
          .max(10)
          .regex(/^SOL-\d{3}$/, "código deve seguir o padrão SOL-NNN"),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { objetivo: null };

        const rows = await db
          .select({
            texto: solarisQuestions.texto,
            artigoRef: solarisQuestions.artigoRef,
            categoria: solarisQuestions.categoria,
          })
          .from(solarisQuestions)
          .where(sql`${solarisQuestions.codigo} = ${input.codigo}`)
          .limit(1);

        const pergunta = rows[0];
        if (!pergunta) return { objetivo: null };

        const response = await invokeLLM({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: buildUserPrompt({
                texto: pergunta.texto,
                artigoRef: pergunta.artigoRef,
                categoria: pergunta.categoria,
              }),
            },
          ],
          maxTokens: 240,
          // REGRA-ORQ-30: ≤ 0.1 em produção. Despacho original pedia 0.3 — ajustado.
          temperature: 0.1,
          // Short-circuit a 5s para não bloquear a UI do card.
          timeoutMs: LLM_TIMEOUT_MS,
        });

        const objetivo =
          response?.choices?.[0]?.message?.content?.toString()?.trim() ?? null;

        return { objetivo: objetivo && objetivo.length > 0 ? objetivo : null };
      } catch {
        // Degradação graciosa — Lição #67. Não relança, não loga sensível.
        return { objetivo: null };
      }
    }),
});
