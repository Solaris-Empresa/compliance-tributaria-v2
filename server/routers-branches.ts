import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as dbBranches from "./db-branches";

export const branchesRouter = router({
  // Listar todos os ramos ativos
  list: publicProcedure
    .query(async () => {
      return await dbBranches.getAllBranches();
    }),

  // Buscar ramo por ID
  getById: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      return await dbBranches.getBranchById(input.id);
    }),

  // Criar novo ramo (apenas equipe Solaris)
  create: protectedProcedure
    .input(z.object({
      code: z.string().max(10),
      name: z.string().max(255),
      description: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validar permissão
      if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
        throw new Error("Apenas equipe Solaris pode criar ramos");
      }

      const id = await dbBranches.createBranch({
        ...input,
        active: true,
      });

      return { id };
    }),

  // Atualizar ramo
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().max(10).optional(),
      name: z.string().max(255).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validar permissão
      if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
        throw new Error("Apenas equipe Solaris pode atualizar ramos");
      }

      const { id, ...data } = input;
      await dbBranches.updateBranch(id, data);

      return { success: true };
    }),

  // Desativar ramo
  deactivate: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validar permissão
      if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
        throw new Error("Apenas equipe Solaris pode desativar ramos");
      }

      await dbBranches.deactivateBranch(input.id);

      return { success: true };
    }),

  // Listar ramos de um projeto
  getProjectBranches: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      return await dbBranches.getProjectBranches(input.projectId);
    }),

  // Adicionar ramo a um projeto
  addToProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      branchId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const id = await dbBranches.addBranchToProject(input);
      return { id };
    }),

  // Remover ramo de um projeto
  removeFromProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      branchId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await dbBranches.removeBranchFromProject(input.projectId, input.branchId);
      return { success: true };
    }),

  // Definir ramos de um projeto (substitui todos)
  setProjectBranches: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      branchIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      await dbBranches.setBranchesForProject(input.projectId, input.branchIds);
      return { success: true };
    }),
});
