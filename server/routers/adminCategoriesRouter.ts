/**
 * routers/adminCategoriesRouter.ts — Sprint Z-09 / ADR-0025
 *
 * Procedures de administração das categorias de risco configuráveis.
 * Acesso restrito a equipe_solaris (protectedProcedure com role check).
 *
 * Procedures:
 *   adminCategories.listSuggestions   → listPendingSuggestions() + SLA badge
 *   adminCategories.approveSuggestion → approveSuggestion() + invalida cache
 *   adminCategories.rejectSuggestion  → rejectSuggestion()
 *   adminCategories.listAllCategories → todas (admin vê inativas também)
 *   adminCategories.upsertCategory    → CRUD manual
 *
 * Resolve: GAP-ARCH-08 (SLA 15 dias) · GAP-ARCH-09 (chunk de origem)
 *
 * Arquivo novo — não altera nenhum arquivo existente (ADR-0022).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import {
  listPendingSuggestions,
  approveSuggestion,
  rejectSuggestion,
  listAllCategories,
  upsertCategory,
} from "../lib/db-queries-risk-categories";
import { getChunkById } from "../lib/rag-category-sensor";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas Zod
// ─────────────────────────────────────────────────────────────────────────────

const SeveridadeSchema = z.enum(["alta", "media", "oportunidade"]);
const UrgenciaSchema   = z.enum(["imediata", "curto_prazo", "medio_prazo"]);
const TipoSchema       = z.enum(["risk", "opportunity"]);
const StatusSchema     = z.enum(["ativo", "sugerido", "pendente_revisao", "inativo", "legado"]);
const OrigemSchema     = z.enum(["lei_federal", "regulamentacao", "rag_sensor", "manual"]);
const EscopoSchema     = z.enum(["nacional", "estadual", "setorial"]);

const UpsertCategorySchema = z.object({
  codigo:          z.string().min(1).max(64),
  nome:            z.string().min(1).max(255),
  severidade:      SeveridadeSchema,
  urgencia:        UrgenciaSchema,
  tipo:            TipoSchema,
  artigo_base:     z.string().min(1).max(255),
  lei_codigo:      z.string().min(1).max(64),
  vigencia_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  vigencia_fim:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status:          StatusSchema.optional(),
  origem:          OrigemSchema,
  escopo:          EscopoSchema.optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Guard: apenas equipe_solaris (role admin)
// ─────────────────────────────────────────────────────────────────────────────

const adminCategoriesProcedure = protectedProcedure.use(({ ctx, next }) => {
  // O projeto usa 'equipe_solaris' como role de administrador
  if (ctx.user.role !== "equipe_solaris") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito à equipe SOLARIS",
    });
  }
  return next({ ctx });
});

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const adminCategoriesRouter = router({
  /**
   * Lista sugestões pendentes de aprovação (status='sugerido').
   * Inclui badge de SLA: sla_vencido = true se > 15 dias sem aprovação.
   * Para cada sugestão com chunk_origem_id, inclui o chunk de origem
   * para o Dr. Rodrigues ler antes de aprovar (GAP-ARCH-09).
   */
  listSuggestions: adminCategoriesProcedure.query(async () => {
    const suggestions = await listPendingSuggestions();

    // Enriquecer com chunk de origem (GAP-ARCH-09)
    const enriched = await Promise.all(
      suggestions.map(async (s) => {
        let chunkOrigem: {
          id: number;
          artigo: string;
          titulo: string;
          conteudo: string;
          lei: string;
        } | null = null;

        if (s.chunk_origem_id) {
          const chunk = await getChunkById(s.chunk_origem_id);
          if (chunk) {
            chunkOrigem = {
              id: chunk.id,
              artigo: chunk.artigo,
              titulo: chunk.titulo,
              conteudo: chunk.conteudo.substring(0, 1000), // Limitar para UI
              lei: chunk.lei,
            };
          }
        }

        return { ...s, chunkOrigem };
      })
    );

    return enriched;
  }),

  /**
   * Aprova uma sugestão: status → 'ativo'.
   * Permite ajustar severidade, urgência e vigência_fim antes de aprovar.
   * Invalida o cache do engine (próxima geração usará a nova categoria).
   */
  approveSuggestion: adminCategoriesProcedure
    .input(
      z.object({
        id:          z.number().int().positive(),
        aprovadoPor: z.string().min(1).max(100),
        severidade:  SeveridadeSchema.optional(),
        urgencia:    UrgenciaSchema.optional(),
        vigencia_fim: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      await approveSuggestion(input.id, input.aprovadoPor, {
        severidade:  input.severidade,
        urgencia:    input.urgencia,
        vigencia_fim: input.vigencia_fim,
      });

      // Nota: o cache do engine (TTL 1h) será invalidado na próxima chamada
      // após a aprovação. O PR #B (engine lendo do banco) implementa o cache.
      return { ok: true };
    }),

  /**
   * Rejeita uma sugestão: status → 'inativo'.
   */
  rejectSuggestion: adminCategoriesProcedure
    .input(
      z.object({
        id:     z.number().int().positive(),
        motivo: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ input }) => {
      await rejectSuggestion(input.id, input.motivo);
      return { ok: true };
    }),

  /**
   * Lista todas as categorias (admin vê inativas e legadas também).
   */
  listAllCategories: adminCategoriesProcedure.query(async () => {
    return listAllCategories();
  }),

  /**
   * Upsert manual de uma categoria (CRUD).
   * Permite criar ou atualizar qualquer categoria via painel admin.
   */
  upsertCategory: adminCategoriesProcedure
    .input(UpsertCategorySchema)
    .mutation(async ({ input }) => {
      const result = await upsertCategory({
        ...input,
        vigencia_fim: input.vigencia_fim ?? null,
        status: input.status ?? "ativo",
        escopo: input.escopo ?? "nacional",
      });
      return result;
    }),
});

// Re-export para uso no routers.ts
export type AdminCategoriesRouter = typeof adminCategoriesRouter;
