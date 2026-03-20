/**
 * Consistency Router — v2.2
 * Procedures tRPC para o Consistency Engine.
 * Gate obrigatório antes do diagnóstico.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { consistencyChecks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  runConsistencyAnalysis,
  runDeterministicChecks,
  aggregateFindings,
  type ConsistencyInput,
} from "../consistencyEngine";

// ─── Schemas de input ─────────────────────────────────────────────────────────

const CompanyProfileSchema = z.object({
  cnpj: z.string().optional(),
  companyType: z.string().optional(),
  companySize: z.enum(["mei", "micro", "pequena", "media", "grande"]).optional(),
  taxRegime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real"]).optional(),
  annualRevenueRange: z.string().optional(),
});

const OperationProfileSchema = z.object({
  operationType: z.string().optional(),
  clientType: z.array(z.string()).optional(),
  multiState: z.boolean().optional(),
});

const TaxComplexitySchema = z.object({
  hasInternationalOps: z.boolean().optional(),
  usesTaxIncentives: z.boolean().optional(),
  usesMarketplace: z.boolean().optional(),
});

const FinancialProfileSchema = z.object({
  paymentMethods: z.array(z.string()).optional(),
  hasIntermediaries: z.boolean().optional(),
});

const GovernanceProfileSchema = z.object({
  hasTaxTeam: z.boolean().optional(),
  hasAudit: z.boolean().optional(),
  hasTaxIssues: z.boolean().optional(),
});

const ConsistencyInputSchema = z.object({
  projectId: z.number(),
  companyProfile: CompanyProfileSchema.optional(),
  operationProfile: OperationProfileSchema.optional(),
  taxComplexity: TaxComplexitySchema.optional(),
  financialProfile: FinancialProfileSchema.optional(),
  governanceProfile: GovernanceProfileSchema.optional(),
  confirmedCnaes: z.array(z.object({ code: z.string(), description: z.string() })).optional(),
  description: z.string().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const consistencyRouter = router({
  /**
   * Executa análise de consistência completa (determinística + IA).
   * Persiste o resultado na tabela consistency_checks.
   */
  analyze: protectedProcedure
    .input(ConsistencyInputSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const now = Date.now();
      const checkId = uuidv4();

      // Criar registro pending
      await db.insert(consistencyChecks).values({
        id: checkId,
        projectId: input.projectId,
        status: "running",
        overallLevel: "none",
        createdAt: now,
        updatedAt: now,
      });

      try {
        const consistencyInput: ConsistencyInput = {
          companyProfile: input.companyProfile,
          operationProfile: input.operationProfile,
          taxComplexity: input.taxComplexity,
          financialProfile: input.financialProfile,
          governanceProfile: input.governanceProfile,
          confirmedCnaes: input.confirmedCnaes,
          description: input.description,
        };

        const result = await runConsistencyAnalysis(consistencyInput);

        await db.update(consistencyChecks)
          .set({
            status: "completed",
            overallLevel: result.overallLevel,
            findings: JSON.stringify(result.findings),
            deterministicScore: result.deterministicScore,
            aiScore: result.aiScore,
            totalIssues: result.totalIssues,
            criticalCount: result.criticalCount,
            highCount: result.highCount,
            mediumCount: result.mediumCount,
            lowCount: result.lowCount,
            updatedAt: Date.now(),
          })
          .where(eq(consistencyChecks.id, checkId));

        return {
          checkId,
          ...result,
          canProceed: result.canProceed,
        };
      } catch (err) {
        await db.update(consistencyChecks)
          .set({ status: "failed", updatedAt: Date.now() })
          .where(eq(consistencyChecks.id, checkId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Consistency analysis failed" });
      }
    }),

  /**
   * Análise apenas determinística (sem IA) — mais rápida.
   */
  analyzeDeterministic: protectedProcedure
    .input(ConsistencyInputSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const consistencyInput: ConsistencyInput = {
        companyProfile: input.companyProfile,
        operationProfile: input.operationProfile,
        taxComplexity: input.taxComplexity,
        financialProfile: input.financialProfile,
        governanceProfile: input.governanceProfile,
        confirmedCnaes: input.confirmedCnaes,
        description: input.description,
      };

      const deterministicFindings = runDeterministicChecks(consistencyInput);
      const result = aggregateFindings(deterministicFindings, []);

      const checkId = uuidv4();
      const now = Date.now();

      await db.insert(consistencyChecks).values({
        id: checkId,
        projectId: input.projectId,
        status: "completed",
        overallLevel: result.overallLevel,
        findings: JSON.stringify(result.findings),
        deterministicScore: result.deterministicScore,
        aiScore: 0,
        totalIssues: result.totalIssues,
        criticalCount: result.criticalCount,
        highCount: result.highCount,
        mediumCount: result.mediumCount,
        lowCount: result.lowCount,
        createdAt: now,
        updatedAt: now,
      });

      return { checkId, ...result };
    }),

  /**
   * Busca o último resultado de consistência de um projeto.
   */
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await db
        .select()
        .from(consistencyChecks)
        .where(eq(consistencyChecks.projectId, input.projectId))
        .orderBy(consistencyChecks.createdAt)
        .limit(1);

      if (!rows.length) return null;

      const row = rows[0];
      return {
        ...row,
        findings: row.findings ? JSON.parse(row.findings) : [],
        acceptedRisk: row.acceptedRisk === 1,
      };
    }),

  /**
   * Usuário aceita o risco e prossegue mesmo com inconsistências.
   * Registra quem aceitou, quando e por quê.
   */
  acceptRisk: protectedProcedure
    .input(z.object({
      checkId: z.string(),
      reason: z.string().min(10, "Justificativa deve ter ao menos 10 caracteres"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await db
        .select()
        .from(consistencyChecks)
        .where(eq(consistencyChecks.id, input.checkId))
        .limit(1);

      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Análise de consistência não encontrada" });
      }

      await db.update(consistencyChecks)
        .set({
          acceptedRisk: 1,
          acceptedRiskAt: Date.now(),
          acceptedRiskBy: ctx.user.name ?? ctx.user.openId,
          acceptedRiskReason: input.reason,
          updatedAt: Date.now(),
        })
        .where(eq(consistencyChecks.id, input.checkId));

      return { success: true, message: "Risco aceito. Você pode prosseguir com o diagnóstico." };
    }),

  /**
   * Verifica se o projeto pode prosseguir para o diagnóstico.
   * Retorna canProceed: true se não há critical ou se o risco foi aceito.
   */
  canProceed: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await db
        .select()
        .from(consistencyChecks)
        .where(eq(consistencyChecks.projectId, input.projectId))
        .orderBy(consistencyChecks.createdAt)
        .limit(1);

      // Se não há análise, pode prosseguir (análise ainda não foi feita)
      if (!rows.length) return { canProceed: true, reason: "no_analysis", checkId: null };

      const row = rows[0];
      const hasCritical = row.criticalCount > 0;
      const riskAccepted = row.acceptedRisk === 1;

      if (!hasCritical) {
        return { canProceed: true, reason: "no_critical", checkId: row.id };
      }

      if (riskAccepted) {
        return { canProceed: true, reason: "risk_accepted", checkId: row.id };
      }

      return {
        canProceed: false,
        reason: "critical_unresolved",
        checkId: row.id,
        criticalCount: row.criticalCount,
        message: "Existem inconsistências críticas no perfil da empresa. Corrija ou aceite o risco para prosseguir.",
      };
    }),
});
