import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { FEATURE_FLAGS } from "../config/feature-flags";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /**
   * G15 — Expõe feature flags para o frontend.
   * Retorna apenas as flags relevantes para o cliente (sem flags de bloqueio permanente).
   * publicProcedure: qualquer usuário autenticado ou não pode consultar.
   */
  getFeatureFlags: publicProcedure.query(() => ({
    g17SolarisGapEngine: FEATURE_FLAGS['g17-solaris-gap-engine'] ?? false,
    g11FonteRisco: FEATURE_FLAGS['g11-fonte-risco'] ?? false,
    g15FontePerguntas: FEATURE_FLAGS['g15-fonte-perguntas'] ?? false,
  })),
});
