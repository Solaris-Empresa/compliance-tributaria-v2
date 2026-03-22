/**
 * CPIE v2 Router — Conflict Intelligence Gate
 * Issue v6.0.R1 — Fase 3: Integração com Gate
 *
 * Substitui o Consistency Engine no fluxo principal.
 * Implementa as regras de bloqueio obrigatórias:
 *   - hard_block: diagnosticConfidence < 15% → BLOQUEIO SEM OVERRIDE
 *   - soft_block_with_override: conflitos HIGH → override com justificativa ≥ 50 chars + log
 *
 * Compatibilidade:
 *   - Análises v1 permanecem intactas (analysisVersion: "cpie-v1")
 *   - Novas análises usam cpie-v2.0
 *   - O consistencyRouter permanece disponível para retrocompatibilidade
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { consistencyChecks } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  runCpieAnalysisV2,
  type CpieProfileInputV2,
} from "../cpie-v2";
import { notifyUser } from "../_core/websocket";

// ─── Schema de input ──────────────────────────────────────────────────────────

const CpieV2InputSchema = z.object({
  projectId: z.number(),
  cnpj: z.string().optional(),
  companyType: z.string().optional(),
  companySize: z.string().optional(),
  annualRevenueRange: z.string().optional(),
  taxRegime: z.string().optional(),
  operationType: z.string().optional(),
  clientType: z.array(z.string()).optional(),
  multiState: z.boolean().nullable().optional(),
  hasMultipleEstablishments: z.boolean().nullable().optional(),
  hasImportExport: z.boolean().nullable().optional(),
  hasSpecialRegimes: z.boolean().nullable().optional(),
  paymentMethods: z.array(z.string()).optional(),
  hasIntermediaries: z.boolean().nullable().optional(),
  hasTaxTeam: z.boolean().nullable().optional(),
  hasAudit: z.boolean().nullable().optional(),
  hasTaxIssues: z.boolean().nullable().optional(),
  description: z.string().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const cpieV2Router = router({
  /**
   * Análise completa CPIE v2 — Gate obrigatório antes do diagnóstico.
   * Persiste o resultado na tabela consistency_checks com analysisVersion=cpie-v2.0.
   *
   * REGRAS DE BLOQUEIO:
   *   - diagnosticConfidence < 15% → hard_block (sem override)
   *   - conflitos HIGH sem crítico → soft_block_with_override (override com justificativa ≥ 50 chars)
   */
  analyze: protectedProcedure
    .input(CpieV2InputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const checkId = uuidv4();
      const now = Date.now();

      // Criar registro pending
      await db.insert(consistencyChecks).values({
        id: checkId,
        projectId: input.projectId,
        status: "running",
        overallLevel: "none",
        createdAt: now,
        updatedAt: now,
      });

      // Notificar início
      try {
        notifyUser(ctx.user.id, "cpie-v2:analysis:start", { projectId: input.projectId, checkId });
      } catch { /* não bloquear */ }

      try {
        const profileInput: CpieProfileInputV2 = {
          cnpj: input.cnpj,
          companyType: input.companyType,
          companySize: input.companySize,
          annualRevenueRange: input.annualRevenueRange,
          taxRegime: input.taxRegime,
          operationType: input.operationType,
          clientType: input.clientType,
          multiState: input.multiState ?? null,
          hasMultipleEstablishments: input.hasMultipleEstablishments ?? null,
          hasImportExport: input.hasImportExport ?? null,
          hasSpecialRegimes: input.hasSpecialRegimes ?? null,
          paymentMethods: input.paymentMethods,
          hasIntermediaries: input.hasIntermediaries ?? null,
          hasTaxTeam: input.hasTaxTeam ?? null,
          hasAudit: input.hasAudit ?? null,
          hasTaxIssues: input.hasTaxIssues ?? null,
          description: input.description,
        };

        const result = await runCpieAnalysisV2(profileInput);

        // Mapear para o schema da tabela consistency_checks
        const criticalCount = result.conflicts.filter(c => c.severity === "critical").length;
        const highCount = result.conflicts.filter(c => c.severity === "high").length;
        const mediumCount = result.conflicts.filter(c => c.severity === "medium").length;
        const lowCount = result.conflicts.filter(c => c.severity === "low").length;

        // overallLevel baseado no diagnosticConfidence e conflitos
        let overallLevel: "none" | "low" | "medium" | "high" | "critical" = "none";
        if (criticalCount > 0 || result.diagnosticConfidence < 15) overallLevel = "critical";
        else if (highCount > 0 || result.diagnosticConfidence < 40) overallLevel = "high";
        else if (mediumCount > 0 || result.diagnosticConfidence < 60) overallLevel = "medium";
        else if (lowCount > 0 || result.diagnosticConfidence < 80) overallLevel = "low";

        // Serializar findings no formato compatível com a tabela
        const findings = result.conflicts.map(c => ({
          id: c.id,
          type: c.type,
          severity: c.severity,
          title: c.title,
          description: c.description,
          conflictingFields: c.conflictingFields,
          inferredValue: c.inferredValue,
          declaredValue: c.declaredValue,
          consistencyVeto: c.consistencyVeto,
          reconciliationRequired: c.reconciliationRequired,
          source: c.source,
        }));

        // Salvar resultado completo
        await db.update(consistencyChecks)
          .set({
            status: "completed",
            overallLevel,
            findings: JSON.stringify({
              // Compatível com formato antigo + dados v2
              findings,
              // Dados exclusivos do v2
              v2: {
                completenessScore: result.completenessScore,
                consistencyScore: result.consistencyScore,
                diagnosticConfidence: result.diagnosticConfidence,
                deterministicVeto: result.deterministicVeto,
                aiVeto: result.aiVeto,
                canProceed: result.canProceed,
                blockType: result.blockType,
                blockReason: result.blockReason,
                inferredProfile: result.inferredProfile,
                reconciliationQuestions: result.reconciliationQuestions,
                analysisVersion: "cpie-v2.0",
              },
            }),
            deterministicScore: result.consistencyScore,
            aiScore: result.diagnosticConfidence,
            totalIssues: result.conflicts.length,
            criticalCount,
            highCount,
            mediumCount,
            lowCount,
            updatedAt: Date.now(),
          })
          .where(eq(consistencyChecks.id, checkId));

        // Notificar conclusão
        try {
          notifyUser(ctx.user.id, "cpie-v2:analysis:complete", {
            projectId: input.projectId,
            checkId,
            canProceed: result.canProceed,
            diagnosticConfidence: result.diagnosticConfidence,
            blockType: result.blockType,
          });
        } catch { /* não bloquear */ }

        return {
          checkId,
          // Os 3 scores separados (NUNCA misturar)
          completenessScore: result.completenessScore,
          consistencyScore: result.consistencyScore,
          diagnosticConfidence: result.diagnosticConfidence,
          // Vetos aplicados
          deterministicVeto: result.deterministicVeto,
          aiVeto: result.aiVeto,
          // Conflitos detectados
          conflicts: result.conflicts,
          reconciliationQuestions: result.reconciliationQuestions,
          // Perfil inferido pela IA
          inferredProfile: result.inferredProfile,
          // Decisão de bloqueio
          canProceed: result.canProceed,
          blockType: result.blockType,
          blockReason: result.blockReason,
          // Metadados
          overallLevel,
          analysisVersion: "cpie-v2.0",
        };
      } catch (err) {
        await db.update(consistencyChecks)
          .set({ status: "failed", updatedAt: Date.now() })
          .where(eq(consistencyChecks.id, checkId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "CPIE v2 analysis failed" });
      }
    }),

  /**
   * Override de soft_block — permite prosseguir com conflitos HIGH.
   * Requer justificativa ≥ 50 caracteres e registra log completo.
   *
   * REGRA: Não pode ser usado para hard_block (diagnosticConfidence < 15%).
   */
  overrideSoftBlock: protectedProcedure
    .input(z.object({
      checkId: z.string(),
      projectId: z.number(),
      justification: z.string().min(50, "Justificativa deve ter no mínimo 50 caracteres"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Buscar o check
      const rows = await db
        .select()
        .from(consistencyChecks)
        .where(eq(consistencyChecks.id, input.checkId))
        .limit(1);

      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Análise não encontrada" });
      }

      const check = rows[0];
      const findingsData = check.findings ? JSON.parse(check.findings) : {};
      const v2Data = findingsData.v2 || {};

      // Verificar se é hard_block — não pode ser overridden
      if (v2Data.blockType === "hard_block" || v2Data.diagnosticConfidence < 15) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Hard block não pode ser ignorado. Corrija as contradições críticas antes de prosseguir.",
        });
      }

      // Verificar se é realmente um soft_block
      if (v2Data.blockType !== "soft_block_with_override") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esta análise não requer override.",
        });
      }

      // Registrar o override com log completo
      const overrideLog = {
        overriddenAt: Date.now(),
        overriddenBy: ctx.user.id,
        overriddenByName: ctx.user.name || ctx.user.email,
        justification: input.justification,
        checkId: input.checkId,
        projectId: input.projectId,
        diagnosticConfidenceAtOverride: v2Data.diagnosticConfidence,
        conflictsAtOverride: v2Data.canProceed === false ? "soft_block" : "none",
      };

      // Atualizar com override aceito
      await db.update(consistencyChecks)
        .set({
          acceptedRisk: 1,
          acceptedRiskAt: Date.now(),
          acceptedRiskBy: String(ctx.user.id),
          acceptedRiskReason: `[CPIE v2 Override] ${input.justification.slice(0, 450)} | Log: ${JSON.stringify(overrideLog)}`,
          updatedAt: Date.now(),
        })
        .where(eq(consistencyChecks.id, input.checkId));

      // Notificar owner sobre override
      try {
        const { notifyOwner } = await import("../_core/notification");
        await notifyOwner({
          title: `⚠️ CPIE v2 Override — Projeto #${input.projectId}`,
          content: [
            `**Usuário:** ${ctx.user.name || ctx.user.email} (ID: ${ctx.user.id})`,
            `**Projeto:** #${input.projectId}`,
            `**Check ID:** ${input.checkId}`,
            `**Confiança diagnóstica no momento:** ${v2Data.diagnosticConfidence}%`,
            `**Justificativa:** ${input.justification}`,
            `**Data:** ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
            ``,
            `O usuário optou por prosseguir com conflitos de alta severidade no perfil da empresa.`,
          ].join("\n"),
        });
      } catch { /* não bloquear */ }

      return { overridden: true, checkId: input.checkId };
    }),

  /**
   * Busca o último resultado CPIE v2 de um projeto.
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
        .orderBy(desc(consistencyChecks.createdAt))
        .limit(1);

      if (!rows.length) return null;

      const row = rows[0];
      const findingsData = row.findings ? JSON.parse(row.findings) : {};
      const v2Data = findingsData.v2 || null;

      // Retornar apenas se for análise v2
      if (!v2Data || v2Data.analysisVersion !== "cpie-v2.0") {
        return {
          checkId: row.id,
          analysisVersion: "cpie-v1",
          legacyData: true,
          canProceed: row.acceptedRisk === 1 || row.overallLevel === "none" || row.overallLevel === "low",
        };
      }

      return {
        checkId: row.id,
        completenessScore: v2Data.completenessScore,
        consistencyScore: v2Data.consistencyScore,
        diagnosticConfidence: v2Data.diagnosticConfidence,
        deterministicVeto: v2Data.deterministicVeto,
        aiVeto: v2Data.aiVeto,
        canProceed: v2Data.canProceed || row.acceptedRisk === 1,
        blockType: v2Data.blockType,
        blockReason: v2Data.blockReason,
        conflicts: findingsData.findings || [],
        reconciliationQuestions: v2Data.reconciliationQuestions || [],
        inferredProfile: v2Data.inferredProfile,
        overallLevel: row.overallLevel,
        analysisVersion: "cpie-v2.0",
        acceptedRisk: row.acceptedRisk === 1,
        acceptedRiskReason: row.acceptedRiskReason,
      };
    }),

  /**
   * Verifica se um projeto pode prosseguir para o diagnóstico.
   * Gate obrigatório chamado pelo flowRouter antes de avançar de fase.
   */
  canProceedGate: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { canProceed: true, reason: "DB unavailable — gate liberado por fallback" };

      const rows = await db
        .select()
        .from(consistencyChecks)
        .where(eq(consistencyChecks.projectId, input.projectId))
        .orderBy(desc(consistencyChecks.createdAt))
        .limit(1);

      if (!rows.length) {
        return {
          canProceed: false,
          reason: "Nenhuma análise de consistência encontrada. Execute a análise CPIE v2 antes de prosseguir.",
          requiresAnalysis: true,
        };
      }

      const row = rows[0];
      const findingsData = row.findings ? JSON.parse(row.findings) : {};
      const v2Data = findingsData.v2 || null;

      // Análise v1 legada — gate permissivo
      if (!v2Data || v2Data.analysisVersion !== "cpie-v2.0") {
        return {
          canProceed: true,
          reason: "Análise legada (cpie-v1) — gate permissivo. Recomendamos reanalisar com CPIE v2.",
          legacyAnalysis: true,
        };
      }

      // Hard block — não pode prosseguir mesmo com override
      if (v2Data.blockType === "hard_block" && !row.acceptedRisk) {
        return {
          canProceed: false,
          blockType: "hard_block",
          reason: v2Data.blockReason || "Contradição crítica detectada. Corrija o perfil antes de prosseguir.",
          diagnosticConfidence: v2Data.diagnosticConfidence,
          requiresCorrection: true,
        };
      }

      // Soft block sem override
      if (v2Data.blockType === "soft_block_with_override" && !row.acceptedRisk) {
        return {
          canProceed: false,
          blockType: "soft_block_with_override",
          reason: v2Data.blockReason || "Conflitos de alta severidade detectados. Justifique para prosseguir.",
          diagnosticConfidence: v2Data.diagnosticConfidence,
          requiresJustification: true,
        };
      }

      // Pode prosseguir
      return {
        canProceed: true,
        diagnosticConfidence: v2Data.diagnosticConfidence,
        consistencyScore: v2Data.consistencyScore,
        completenessScore: v2Data.completenessScore,
        analysisVersion: "cpie-v2.0",
        acceptedRisk: row.acceptedRisk === 1,
      };
    }),
});
