/**
 * feature-flags.ts — Router tRPC read-only para expor feature flags ao frontend.
 *
 * M2 PR-B: frontend precisa saber se feature m2-perfil-entidade-enabled
 * está ativa para o ctx.user.role + projectId atual, antes de decidir
 * redirect (NovoProjeto) ou gate (QuestionarioSolaris).
 *
 * Procedure isM2Enabled é read-only e idempotente. Não persiste, não muta.
 * Avaliação determinística via isM2PerfilEntidadeEnabled (5 etapas de rollout).
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { isM2PerfilEntidadeEnabled } from "../config/feature-flags";

export const featureFlagsRouter = router({
  /**
   * isM2Enabled — retorna boolean para o ctx atual.
   * Usado por NovoProjeto.tsx (redirect condicional) e QuestionarioSolaris.tsx (gate).
   */
  isM2Enabled: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive().optional() }))
    .query(({ ctx, input }) => {
      return isM2PerfilEntidadeEnabled({
        role: ctx.user?.role,
        projectId: input.projectId,
      });
    }),
});
