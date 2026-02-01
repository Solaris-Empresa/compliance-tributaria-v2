/**
 * Router tRPC para Verificação de Permissões
 * Sprint V19 - Feature 3
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getUserProjectPermissions } from "./permissions";

export const permissionsCheckRouter = router({
  /**
   * Obter permissões do usuário para um projeto
   */
  getProjectPermissions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const permissions = await getUserProjectPermissions(ctx.user.id, input.projectId);
      
      if (!permissions) {
        return {
          hasAccess: false,
          permissions: null,
        };
      }

      return {
        hasAccess: true,
        permissions,
      };
    }),

  /**
   * Verificar permissão específica
   */
  checkPermission: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      permission: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const permissions = await getUserProjectPermissions(ctx.user.id, input.projectId);
      
      if (!permissions) {
        return { allowed: false };
      }

      const allowed = (permissions as any)[input.permission] === true;
      return { allowed };
    }),
});
