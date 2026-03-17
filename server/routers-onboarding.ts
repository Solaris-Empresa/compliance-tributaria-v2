/**
 * V69 — Onboarding Guiado para Advogados
 *
 * Procedures tRPC para gerenciar o progresso do tour interativo.
 *
 * Passos do tour (6 etapas):
 *   0 - Painel: visão geral dos projetos
 *   1 - Novo Projeto: criar projeto com extração de CNAEs via IA
 *   2 - Questionário: responder perguntas adaptativas por CNAE
 *   3 - Briefing: revisar e aprovar o briefing de compliance
 *   4 - Matrizes de Riscos: analisar as 4 matrizes geradas
 *   5 - Plano de Ação: aprovar e executar o plano
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { onboardingProgress } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const TOTAL_STEPS = 6;

/** Parseia o campo completedSteps (string JSON) para array de números */
function parseCompletedSteps(raw: string): number[] {
  if (!raw || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((n) => typeof n === "number");
    return [];
  } catch {
    return [];
  }
}

/** Serializa o array de steps para string JSON */
function serializeSteps(steps: number[]): string {
  return JSON.stringify(Array.from(new Set(steps)).sort((a, b) => a - b));
}

export const onboardingRouter = router({
  /**
   * Retorna o status atual do onboarding do usuário autenticado.
   * Se não existir registro, cria um novo (step 0, não pulado).
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) throw new Error("Database not available");
    const userId = ctx.user.id;

    const [existing] = await database
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.userId, userId))
      .limit(1);

    if (!existing) {
      // Primeiro acesso: criar registro inicial
      await database.insert(onboardingProgress).values({
        userId,
        currentStep: 0,
        completedSteps: "",
        skipped: false,
      });
      return {
        currentStep: 0,
        completedSteps: [] as number[],
        skipped: false,
        completed: false,
        totalSteps: TOTAL_STEPS,
        isNew: true,
      };
    }

    const completedSteps = parseCompletedSteps(existing.completedSteps);
    const completed = existing.completedAt !== null;

    return {
      currentStep: existing.currentStep,
      completedSteps,
      skipped: existing.skipped,
      completed,
      totalSteps: TOTAL_STEPS,
      isNew: false,
    };
  }),

  /**
   * Marca um passo como concluído e avança para o próximo.
   * Se for o último passo, marca o tour como concluído.
   */
  markStep: protectedProcedure
    .input(z.object({ step: z.number().min(0).max(TOTAL_STEPS - 1) }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      const userId = ctx.user.id;

      const [existing] = await database
        .select()
        .from(onboardingProgress)
        .where(eq(onboardingProgress.userId, userId))
        .limit(1);

      const currentCompleted = existing
        ? parseCompletedSteps(existing.completedSteps)
        : [];

      const newCompleted = Array.from(new Set([...currentCompleted, input.step]));
      const nextStep = Math.min(input.step + 1, TOTAL_STEPS - 1);
      const isLastStep = input.step === TOTAL_STEPS - 1;
      const completedAt = isLastStep ? new Date() : undefined;

      if (!existing) {
        await database.insert(onboardingProgress).values({
          userId,
          currentStep: nextStep,
          completedSteps: serializeSteps(newCompleted),
          skipped: false,
          completedAt,
        });
      } else {
        await database
          .update(onboardingProgress)
          .set({
            currentStep: nextStep,
            completedSteps: serializeSteps(newCompleted),
            completedAt: completedAt ?? existing.completedAt,
          })
          .where(eq(onboardingProgress.userId, userId));
      }

      return {
        currentStep: nextStep,
        completedSteps: newCompleted,
        completed: isLastStep,
        totalSteps: TOTAL_STEPS,
      };
    }),

  /**
   * Pula o tour completamente.
   */
  skip: protectedProcedure.mutation(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) throw new Error("Database not available");
    const userId = ctx.user.id;

    const [existing] = await database
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.userId, userId))
      .limit(1);

    if (!existing) {
      await database.insert(onboardingProgress).values({
        userId,
        currentStep: 0,
        completedSteps: "",
        skipped: true,
      });
    } else {
      await database
        .update(onboardingProgress)
        .set({ skipped: true })
        .where(eq(onboardingProgress.userId, userId));
    }

    return { skipped: true };
  }),

  /**
   * Reseta o tour para o início (útil para testes e re-onboarding).
   */
  reset: protectedProcedure.mutation(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) throw new Error("Database not available");
    const userId = ctx.user.id;

    const [existing] = await database
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.userId, userId))
      .limit(1);

    if (!existing) {
      await database.insert(onboardingProgress).values({
        userId,
        currentStep: 0,
        completedSteps: "",
        skipped: false,
      });
    } else {
      await database
        .update(onboardingProgress)
        .set({
          currentStep: 0,
          completedSteps: "",
          skipped: false,
          completedAt: null,
        })
        .where(eq(onboardingProgress.userId, userId));
    }

    return { reset: true, currentStep: 0 };
  }),
});
