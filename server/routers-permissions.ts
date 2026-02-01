import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { projectPermissions, projects, users } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

// ============================================================================
// PERMISSIONS ROUTER - Sistema de Permissões Granulares
// ============================================================================

export const permissionsRouter = router({
  // Listar permissões de um projeto
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      // Verificar se usuário tem acesso ao projeto
      const hasAccess = await checkProjectAccess(ctx.user.id, input.projectId, "view");
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado ao projeto" });
      }

      return await db
        .select()
        .from(projectPermissions)
        .where(eq(projectPermissions.projectId, input.projectId));
    }),

  // Criar permissão
  create: protectedProcedure
    .input(z.object({
      userId: z.number(),
      projectId: z.number(),
      permissionLevel: z.enum(["view", "edit", "approve", "admin"]),
      areas: z.array(z.enum(["TI", "CONT", "FISC", "JUR", "OPS", "COM", "ADM"])).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Apenas admin do projeto pode criar permissões
      const hasAccess = await checkProjectAccess(ctx.user.id, input.projectId, "admin");
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerenciar permissões" });
      }

      const result = await db.insert(projectPermissions).values({
        userId: input.userId,
        projectId: input.projectId,
        permissionLevel: input.permissionLevel,
        areas: input.areas || null,
        createdBy: ctx.user.id,
      });

      return { id: Number(result[0].insertId) };
    }),

  // Atualizar permissão
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      permissionLevel: z.enum(["view", "edit", "approve", "admin"]).optional(),
      areas: z.array(z.enum(["TI", "CONT", "FISC", "JUR", "OPS", "COM", "ADM"])).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar permissão para verificar projeto
      const permission = await db
        .select()
        .from(projectPermissions)
        .where(eq(projectPermissions.id, input.id))
        .limit(1);

      if (!permission[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Permissão não encontrada" });
      }

      // Verificar se usuário é admin do projeto
      const hasAccess = await checkProjectAccess(ctx.user.id, permission[0].projectId, "admin");
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerenciar permissões" });
      }

      const updateData: any = {};
      if (input.permissionLevel) updateData.permissionLevel = input.permissionLevel;
      if (input.areas !== undefined) updateData.areas = input.areas;

      await db.update(projectPermissions).set(updateData).where(eq(projectPermissions.id, input.id));

      return { success: true };
    }),

  // Remover permissão
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar permissão para verificar projeto
      const permission = await db
        .select()
        .from(projectPermissions)
        .where(eq(projectPermissions.id, input.id))
        .limit(1);

      if (!permission[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Permissão não encontrada" });
      }

      // Verificar se usuário é admin do projeto
      const hasAccess = await checkProjectAccess(ctx.user.id, permission[0].projectId, "admin");
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerenciar permissões" });
      }

      await db.delete(projectPermissions).where(eq(projectPermissions.id, input.id));

      return { success: true };
    }),

  // Verificar permissão do usuário em um projeto
  check: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      requiredLevel: z.enum(["view", "edit", "approve", "admin"]),
      area: z.enum(["TI", "CONT", "FISC", "JUR", "OPS", "COM", "ADM"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const hasAccess = await checkProjectAccess(
        ctx.user.id,
        input.projectId,
        input.requiredLevel,
        input.area
      );

      return { hasAccess };
    }),
});

/**
 * Função auxiliar para verificar acesso ao projeto
 */
async function checkProjectAccess(
  userId: number,
  projectId: number,
  requiredLevel: "view" | "edit" | "approve" | "admin",
  area?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // 1. Verificar se é owner do projeto
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (project[0] && project[0].createdById === userId) {
    return true; // Owner tem acesso total
  }

  // 2. Buscar permissões do usuário no projeto
  const permissions = await db
    .select()
    .from(projectPermissions)
    .where(
      and(
        eq(projectPermissions.userId, userId),
        eq(projectPermissions.projectId, projectId)
      )
    );

  if (permissions.length === 0) return false;

  // 3. Verificar nível de permissão
  const levelHierarchy = { view: 1, edit: 2, approve: 3, admin: 4 };
  const requiredLevelValue = levelHierarchy[requiredLevel];

  for (const perm of permissions) {
    const userLevelValue = levelHierarchy[perm.permissionLevel];

    // Se usuário tem nível suficiente
    if (userLevelValue >= requiredLevelValue) {
      // Se não requer área específica, ou se permissão é para todas as áreas
      if (!area || !perm.areas) {
        return true;
      }

      // Verificar se área está incluída
      if (perm.areas && Array.isArray(perm.areas) && perm.areas.includes(area)) {
        return true;
      }
    }
  }

  return false;
}
