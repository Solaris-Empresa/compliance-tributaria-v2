import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { taskComments, InsertTaskComment } from "../drizzle/schema";

// ============================================================================
// COMMENTS ROUTER - Sistema de Comentários em Tarefas
// ============================================================================

export const commentsRouter = router({
  // Listar comentários de uma tarefa
  list: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(taskComments)
        .where(eq(taskComments.taskId, input.taskId))
        .orderBy(desc(taskComments.createdAt));
    }),

  // Adicionar comentário
  create: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      comment: z.string().min(1, "Comentário não pode estar vazio"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(taskComments).values({
        taskId: input.taskId,
        userId: ctx.user.id,
        comment: input.comment,
      });

      return { id: Number(result[0].insertId) };
    }),

  // Deletar comentário (apenas autor ou admin)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar comentário para verificar ownership
      const comment = await db
        .select()
        .from(taskComments)
        .where(eq(taskComments.id, input.id))
        .limit(1);

      if (!comment[0]) {
        throw new Error("Comentário não encontrado");
      }

      // Apenas autor ou equipe_solaris pode deletar
      if (comment[0].userId !== ctx.user.id && ctx.user.role !== "equipe_solaris") {
        throw new Error("Sem permissão para deletar este comentário");
      }

      await db.delete(taskComments).where(eq(taskComments.id, input.id));

      return { success: true };
    }),

  // Editar comentário (apenas autor)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      comment: z.string().min(1, "Comentário não pode estar vazio"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar comentário para verificar ownership
      const comment = await db
        .select()
        .from(taskComments)
        .where(eq(taskComments.id, input.id))
        .limit(1);

      if (!comment[0]) {
        throw new Error("Comentário não encontrado");
      }

      // Apenas autor pode editar
      if (comment[0].userId !== ctx.user.id) {
        throw new Error("Sem permissão para editar este comentário");
      }

      await db
        .update(taskComments)
        .set({ comment: input.comment })
        .where(eq(taskComments.id, input.id));

      return { success: true };
    }),
});
