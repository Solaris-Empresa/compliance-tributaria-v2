/**
 * CPIE Router — Company Profile Intelligence Engine
 * Sprint v6.0 — Issue C1
 *
 * 3 procedures tRPC:
 *   - analyze: análise completa (score + perguntas + sugestões + insights)
 *   - getDynamicQuestions: apenas perguntas dinâmicas (mais rápido)
 *   - getSuggestions: apenas sugestões de correção
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { getDb } from "../db";
import { cpieAnalysisHistory } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  runCpieAnalysis,
  generateDynamicQuestions,
  generateSuggestions,
  calcDimensionScores,
  calcOverallScore,
  type CpieProfileInput,
} from "../cpie";

// ─── Schema de input ──────────────────────────────────────────────────────────

const CpieProfileInputSchema = z.object({
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

export const cpieRouter = router({
  /**
   * Análise completa do perfil: score explicável + perguntas dinâmicas + sugestões + insights.
   * Chamado quando o usuário clica em "Analisar com IA" no painel de score.
   */
  analyze: protectedProcedure
    .input(CpieProfileInputSchema)
    .mutation(async ({ input }) => {
      const profileInput: CpieProfileInput = {
        ...input,
        multiState: input.multiState ?? null,
        hasMultipleEstablishments: input.hasMultipleEstablishments ?? null,
        hasImportExport: input.hasImportExport ?? null,
        hasSpecialRegimes: input.hasSpecialRegimes ?? null,
        hasIntermediaries: input.hasIntermediaries ?? null,
        hasTaxTeam: input.hasTaxTeam ?? null,
        hasAudit: input.hasAudit ?? null,
        hasTaxIssues: input.hasTaxIssues ?? null,
      };
      return await runCpieAnalysis(profileInput);
    }),

  /**
   * Apenas perguntas dinâmicas — mais rápido, usado para feedback em tempo real.
   */
  getDynamicQuestions: protectedProcedure
    .input(CpieProfileInputSchema)
    .mutation(async ({ input }) => {
      const profileInput: CpieProfileInput = {
        ...input,
        multiState: input.multiState ?? null,
        hasMultipleEstablishments: input.hasMultipleEstablishments ?? null,
        hasImportExport: input.hasImportExport ?? null,
        hasSpecialRegimes: input.hasSpecialRegimes ?? null,
        hasIntermediaries: input.hasIntermediaries ?? null,
        hasTaxTeam: input.hasTaxTeam ?? null,
        hasAudit: input.hasAudit ?? null,
        hasTaxIssues: input.hasTaxIssues ?? null,
      };
      const questions = await generateDynamicQuestions(profileInput);
      return { questions };
    }),

  /**
   * Apenas sugestões de correção — chamado após preenchimento de campos críticos.
   */
  getSuggestions: protectedProcedure
    .input(CpieProfileInputSchema)
    .mutation(async ({ input }) => {
      const profileInput: CpieProfileInput = {
        ...input,
        multiState: input.multiState ?? null,
        hasMultipleEstablishments: input.hasMultipleEstablishments ?? null,
        hasImportExport: input.hasImportExport ?? null,
        hasSpecialRegimes: input.hasSpecialRegimes ?? null,
        hasIntermediaries: input.hasIntermediaries ?? null,
        hasTaxTeam: input.hasTaxTeam ?? null,
        hasAudit: input.hasAudit ?? null,
        hasTaxIssues: input.hasTaxIssues ?? null,
      };
      const suggestions = await generateSuggestions(profileInput);
      return { suggestions };
    }),

  /**
   * Persiste o resultado da análise CPIE no banco de dados do projeto.
   * Chamado após o projeto ser criado (E2 — persistência de interação IA).
   */
  saveAnalysis: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      overallScore: z.number(),
      confidenceScore: z.number(),
      dimensions: z.array(z.object({
        name: z.string(),
        score: z.number(),
        weight: z.number(),
        explanation: z.string(),
        fieldsEvaluated: z.array(z.string()),
      })),
      dynamicQuestions: z.array(z.object({
        id: z.string(),
        question: z.string(),
        rationale: z.string(),
        field: z.string().optional(),
        priority: z.enum(["high", "medium", "low"]),
        category: z.string(),
      })),
      suggestions: z.array(z.object({
        id: z.string(),
        field: z.string(),
        currentValue: z.string().optional(),
        suggestedValue: z.string().optional(),
        explanation: z.string(),
        confidence: z.number(),
        severity: z.enum(["info", "warning", "critical"]),
      })),
      readinessLevel: z.string(),
    }))
    .mutation(async ({ input }) => {
      await db.updateProject(input.projectId, {
        profileCompleteness: input.overallScore,
        profileConfidence: input.confidenceScore,
        profileLastAnalyzedAt: new Date(),
        profileIntelligenceData: {
          dynamicQuestions: input.dynamicQuestions.map(q => ({
            id: q.id,
            question: q.question,
            field: q.field || "",
            priority: q.priority === "high" ? 3 : q.priority === "medium" ? 2 : 1,
            answered: false,
          })),
          suggestions: input.suggestions.map(s => ({
            field: s.field,
            currentValue: s.currentValue || "",
            suggestedValue: s.suggestedValue || "",
            reason: s.explanation,
            accepted: false,
          })),
          scoreBreakdown: input.dimensions.map(d => ({
            category: d.name,
            score: d.score,
            maxScore: 100,
            issues: [],
          })),
          analysisVersion: "cpie-v1.0",
        } as any,
      });
      return { saved: true };
    }),

  /**
   * Registra a aceitação de risco do Consistency Gate no banco.
   * Chamado quando o usuário prossegue com inconsistências críticas.
   */
  acceptConsistencyRisk: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      reason: z.string().min(10),
      projectName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.updateProject(input.projectId, {
        consistencyStatus: "warning",
        consistencyAcceptedRiskBy: ctx.user.id,
        consistencyAcceptedRiskAt: new Date(),
        consistencyAcceptedRiskReason: input.reason.slice(0, 500),
      });

      // H2: Notificar o owner sobre aceite de risco de consistência
      try {
        const { notifyOwner } = await import("../_core/notification");
        const userName = ctx.user.name || ctx.user.email || `Usuário #${ctx.user.id}`;
        const projectLabel = input.projectName ? `"${input.projectName}"` : `#${input.projectId}`;
        await notifyOwner({
          title: `⚠️ Risco de Consistência Aceito — Projeto ${projectLabel}`,
          content: [
            `**Usuário:** ${userName}`,
            `**Projeto:** ${projectLabel} (ID: ${input.projectId})`,
            `**Justificativa:** ${input.reason}`,
            `**Data:** ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
            ``,
            `O usuário optou por prosseguir com inconsistências no perfil da empresa. Verifique o painel de consistência para detalhes.`,
          ].join("\n"),
        });
      } catch (notifyErr) {
        // Não bloquear o fluxo se a notificação falhar
        console.warn("[cpieRouter] notifyOwner falhou:", notifyErr);
      }

      return { saved: true };
    }),

  /**
   * Busca a análise CPIE salva no banco para um projeto existente.
   * Usado para retomada exata de sessão (H1).
   */
  getProjectAnalysis: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) return null;
      // Verificar acesso
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && (project as any).clientId !== ctx.user.id) return null;

      const p = project as any;
      return {
        profileCompleteness: p.profileCompleteness ?? null,
        profileConfidence: p.profileConfidence ?? null,
        profileLastAnalyzedAt: p.profileLastAnalyzedAt ?? null,
        profileIntelligenceData: p.profileIntelligenceData ?? null,
        consistencyStatus: p.consistencyStatus ?? null,
        consistencyAcceptedRiskReason: p.consistencyAcceptedRiskReason ?? null,
        consistencyAcceptedRiskAt: p.consistencyAcceptedRiskAt ?? null,
      };
    }),

  /**
   * Gera os dados estruturados do relatório CPIE para exportação PDF.
   * Retorna HTML formatado com o relatório completo (H3).
   */
  generateReport: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      projectName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new Error("Projeto não encontrado");

      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && (project as any).clientId !== ctx.user.id) throw new Error("Acesso negado");

      const p = project as any;
      const intel = p.profileIntelligenceData;
      const now = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric"
      });

      // Gerar HTML do relatório
      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório CPIE — ${input.projectName}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 32px; background: #fff; }
    h1 { color: #0f3460; font-size: 22px; border-bottom: 3px solid #0f3460; padding-bottom: 8px; }
    h2 { color: #16213e; font-size: 16px; margin-top: 24px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
    .score-box { display: inline-block; padding: 12px 24px; border-radius: 8px; font-size: 32px; font-weight: bold; margin: 8px 8px 8px 0; }
    .score-green { background: #dcfce7; color: #16a34a; }
    .score-yellow { background: #fef9c3; color: #ca8a04; }
    .score-red { background: #fee2e2; color: #dc2626; }
    .dim-row { display: flex; align-items: center; gap: 12px; margin: 8px 0; }
    .dim-bar { flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .dim-fill { height: 100%; border-radius: 4px; }
    .dim-label { width: 180px; font-size: 13px; }
    .dim-score { width: 40px; text-align: right; font-weight: bold; font-size: 13px; }
    .suggestion { border-left: 4px solid #f59e0b; padding: 8px 12px; margin: 8px 0; background: #fffbeb; border-radius: 0 8px 8px 0; }
    .question { border-left: 4px solid #3b82f6; padding: 8px 12px; margin: 8px 0; background: #eff6ff; border-radius: 0 8px 8px 0; }
    .risk-box { border: 2px solid #f59e0b; background: #fffbeb; padding: 12px; border-radius: 8px; margin-top: 16px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; text-align: center; }
  </style>
</head>
<body>
  <h1>Relatório CPIE — Company Profile Intelligence Engine</h1>
  <div class="meta">
    <strong>Projeto:</strong> ${input.projectName} &nbsp;|
    <strong>Gerado em:</strong> ${now} &nbsp;|
    <strong>Plataforma:</strong> IA SOLARIS — Compliance Tributário
  </div>

  <h2>Score Geral</h2>
  <div>
    <span class="score-box ${(p.profileCompleteness ?? 0) >= 80 ? 'score-green' : (p.profileCompleteness ?? 0) >= 50 ? 'score-yellow' : 'score-red'}">
      ${p.profileCompleteness ?? 0}%
    </span>
    <span style="font-size:13px;color:#666;">Completude do Perfil</span>
    &nbsp;&nbsp;
    <span class="score-box ${(p.profileConfidence ?? 0) >= 80 ? 'score-green' : (p.profileConfidence ?? 0) >= 50 ? 'score-yellow' : 'score-red'}">
      ${p.profileConfidence ?? 0}%
    </span>
    <span style="font-size:13px;color:#666;">Confiança da IA</span>
  </div>

  ${intel?.scoreBreakdown?.length > 0 ? `
  <h2>Score por Dimensão</h2>
  ${intel.scoreBreakdown.map((d: any) => `
    <div class="dim-row">
      <span class="dim-label">${d.category}</span>
      <div class="dim-bar"><div class="dim-fill" style="width:${d.score}%;background:${d.score >= 80 ? '#22c55e' : d.score >= 50 ? '#f59e0b' : '#ef4444'};"></div></div>
      <span class="dim-score">${d.score}%</span>
    </div>
  `).join('')}
  ` : ''}

  ${intel?.suggestions?.length > 0 ? `
  <h2>Sugestões de Correção (${intel.suggestions.length})</h2>
  ${intel.suggestions.map((s: any) => `
    <div class="suggestion">
      <strong>${s.field}</strong>: ${s.reason}
      ${s.suggestedValue ? `<br><em>Sugerido: ${s.suggestedValue}</em>` : ''}
    </div>
  `).join('')}
  ` : ''}

  ${intel?.dynamicQuestions?.length > 0 ? `
  <h2>Perguntas Dinâmicas (${intel.dynamicQuestions.length})</h2>
  ${intel.dynamicQuestions.map((q: any) => `
    <div class="question">${q.question}</div>
  `).join('')}
  ` : ''}

  ${p.consistencyAcceptedRiskReason ? `
  <h2>Risco de Consistência Aceito</h2>
  <div class="risk-box">
    <strong>Justificativa:</strong> ${p.consistencyAcceptedRiskReason}<br>
    ${p.consistencyAcceptedRiskAt ? `<em>Aceito em: ${new Date(p.consistencyAcceptedRiskAt).toLocaleString('pt-BR')}</em>` : ''}
  </div>
  ` : ''}

  <div class="footer">
    Gerado pela plataforma IA SOLARIS — Compliance Tributário | Reforma Tributária (LC 214/2025)
  </div>
</body>
</html>`;

      return { html, projectName: input.projectName, generatedAt: new Date().toISOString() };
    }),

  /**
   * I1: Busca o histórico de análises CPIE de um projeto.
   * Retorna as últimas 10 análises em ordem decrescente de data.
   */
  getAnalysisHistory: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) return [];
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && (project as any).clientId !== ctx.user.id) return [];

      const drizzle = await getDb();
      if (!drizzle) return [];
      const rows = await drizzle
        .select()
        .from(cpieAnalysisHistory)
        .where(eq(cpieAnalysisHistory.projectId, input.projectId))
        .orderBy(desc(cpieAnalysisHistory.createdAt))
        .limit(10);

      return rows.map((r) => ({
        id: r.id,
        overallScore: r.overallScore,
        confidenceScore: r.confidenceScore,
        readinessLevel: r.readinessLevel,
        readinessMessage: r.readinessMessage,
        analysisVersion: r.analysisVersion,
        createdAt: r.createdAt.toISOString(),
        dimensionsJson: r.dimensionsJson,
        suggestionsCount: Array.isArray(r.suggestionsJson) ? (r.suggestionsJson as unknown[]).length : 0,
        questionsCount: Array.isArray(r.dynamicQuestionsJson) ? (r.dynamicQuestionsJson as unknown[]).length : 0,
      }));
    }),

  /**
   * I1: Salva uma entrada no histórico de análises CPIE.
   * Chamado automaticamente após cada análise bem-sucedida.
   */
  saveAnalysisToHistory: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      overallScore: z.number(),
      confidenceScore: z.number(),
      readinessLevel: z.enum(["insufficient", "basic", "good", "excellent"]),
      readinessMessage: z.string(),
      dimensionsJson: z.any().optional(),
      suggestionsJson: z.any().optional(),
      dynamicQuestionsJson: z.any().optional(),
      insightsJson: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new Error("Database not available");
      await drizzle.insert(cpieAnalysisHistory).values({
        projectId: input.projectId,
        analyzedById: ctx.user.id,
        overallScore: input.overallScore,
        confidenceScore: input.confidenceScore,
        readinessLevel: input.readinessLevel,
        readinessMessage: input.readinessMessage,
        dimensionsJson: input.dimensionsJson ?? null,
        suggestionsJson: input.suggestionsJson ?? null,
        dynamicQuestionsJson: input.dynamicQuestionsJson ?? null,
        insightsJson: input.insightsJson ?? null,
        analysisVersion: "cpie-v1.0",
      });
      return { saved: true };
    }),

  /**
   * K1: Análise CPIE em lote — processa projetos sem análise ou com score 0.
   * Retorna um stream de progresso via polling (limite de 20 por vez).
   */
  batchAnalyze: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      onlyZeroScore: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      // Buscar projetos do usuário sem análise CPIE ou com score 0
      const allProjects = await db.getProjectsByUser(ctx.user.id, ctx.user.role);
      const pending = allProjects
        .filter((p: any) => {
          if (input.onlyZeroScore) {
            return !p.profileCompleteness || p.profileCompleteness === 0;
          }
          return !p.profileIntelligenceData;
        })
        .slice(0, input.limit);

      if (pending.length === 0) {
        return { processed: 0, skipped: 0, errors: 0, results: [] };
      }

      const results: Array<{ projectId: number; name: string; score: number; status: "ok" | "error" }> = [];
      let errors = 0;

      for (const project of pending) {
        try {
          const p = project as any;
          // Montar perfil a partir dos dados salvos
          const profileInput: CpieProfileInput = {
            cnpj: p.cnpj ?? undefined,
            companyType: p.companyType ?? undefined,
            companySize: p.companySize ?? undefined,
            annualRevenueRange: p.annualRevenueRange ?? undefined,
            taxRegime: p.taxRegime ?? undefined,
            operationType: p.operationType ?? undefined,
            clientType: Array.isArray(p.clientType) ? p.clientType : [],
            multiState: p.multiState ?? null,
            hasMultipleEstablishments: p.hasMultipleEstablishments ?? null,
            hasImportExport: p.hasImportExport ?? null,
            hasSpecialRegimes: p.hasSpecialRegimes ?? null,
            paymentMethods: Array.isArray(p.paymentMethods) ? p.paymentMethods : [],
            hasIntermediaries: p.hasIntermediaries ?? null,
            hasTaxTeam: p.hasTaxTeam ?? null,
            hasAudit: p.hasAudit ?? null,
            hasTaxIssues: p.hasTaxIssues ?? null,
            description: p.description ?? undefined,
          };

          // Score determinístico (sem IA, rápido)
          const dimensions = calcDimensionScores(profileInput);
          const overallScore = calcOverallScore(dimensions);

          // Salvar no projeto
          const drizzle = await getDb();
          if (drizzle) {
            const { projects } = await import("../../drizzle/schema");
            await drizzle
              .update(projects)
              .set({
                profileCompleteness: overallScore,
                profileLastAnalyzedAt: new Date(),
              })
              .where(eq(projects.id, p.id));
          }

          results.push({ projectId: p.id, name: p.name, score: overallScore, status: "ok" });
        } catch (err) {
          errors++;
          results.push({ projectId: (project as any).id, name: (project as any).name, score: 0, status: "error" });
        }
      }

      return {
        processed: results.filter(r => r.status === "ok").length,
        skipped: allProjects.length - pending.length,
        errors,
        results,
      };
    }),

  /**
   * K3: Gera relatório executivo mensal com dados agregados de consistência e CPIE.
   */
  generateMonthlyReport: protectedProcedure
    .input(z.object({
      month: z.number().min(1).max(12).optional(), // default: mês atual
      year: z.number().min(2024).max(2030).optional(), // default: ano atual
    }))
    .mutation(async ({ input, ctx }) => {
      const now = new Date();
      const month = input.month ?? (now.getMonth() + 1);
      const year = input.year ?? now.getFullYear();
      const monthName = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

      const allProjects = await db.getProjectsByUser(ctx.user.id, ctx.user.role);
      const total = allProjects.length;
      const withScore = allProjects.filter((p: any) => p.profileCompleteness && p.profileCompleteness > 0);
      const avgScore = withScore.length > 0
        ? Math.round(withScore.reduce((sum: number, p: any) => sum + (p.profileCompleteness || 0), 0) / withScore.length)
        : 0;
      const highRisk = allProjects.filter((p: any) => p.consistencyStatus === "warning" || p.consistencyStatus === "blocked");
      const lowScore = allProjects.filter((p: any) => (p.profileCompleteness ?? 0) < 50);
      const excellent = allProjects.filter((p: any) => (p.profileCompleteness ?? 0) >= 80);

      const reportDate = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Executivo Mensal — ${monthName}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 32px; background: #fff; max-width: 900px; }
    h1 { color: #0f3460; font-size: 24px; border-bottom: 3px solid #0f3460; padding-bottom: 10px; }
    h2 { color: #16213e; font-size: 17px; margin-top: 28px; border-left: 4px solid #0f3460; padding-left: 10px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
    .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; }
    .kpi .value { font-size: 32px; font-weight: 700; color: #0f3460; }
    .kpi .label { font-size: 12px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th { background: #0f3460; color: #fff; padding: 8px 12px; text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .badge-ok { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .badge-risk { background: #fef9c3; color: #854d0e; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .badge-low { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>📊 Relatório Executivo de Compliance Tributário</h1>
  <p style="color:#64748b;font-size:14px;">Período: <strong>${monthName}</strong> &nbsp;|&nbsp; Gerado em: ${reportDate} &nbsp;|&nbsp; Plataforma IA SOLARIS</p>

  <h2>Indicadores Gerais</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="value">${total}</div><div class="label">Total de Projetos</div></div>
    <div class="kpi"><div class="value">${avgScore}%</div><div class="label">Score Médio CPIE</div></div>
    <div class="kpi"><div class="value">${highRisk.length}</div><div class="label">Projetos com Risco</div></div>
    <div class="kpi"><div class="value">${excellent.length}</div><div class="label">Score Excelente (≥80%)</div></div>
  </div>

  <h2>Projetos com Risco de Consistência</h2>
  ${highRisk.length === 0 ? '<p style="color:#16a34a;">Nenhum projeto com risco de consistência no período.</p>' : `
  <table>
    <thead><tr><th>Projeto</th><th>Status</th><th>Score CPIE</th><th>Justificativa</th></tr></thead>
    <tbody>
      ${highRisk.map((p: any) => `
        <tr>
          <td>${p.name}</td>
          <td><span class="badge-risk">${p.consistencyStatus === 'warning' ? 'Risco Aceito' : 'Bloqueado'}</span></td>
          <td>${p.profileCompleteness ?? 0}%</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.consistencyAcceptedRiskReason ?? '—'}</td>
        </tr>`).join('')}
    </tbody>
  </table>`}

  <h2>Projetos com Score Baixo (&lt; 50%)</h2>
  ${lowScore.length === 0 ? '<p style="color:#16a34a;">Todos os projetos com score adequado.</p>' : `
  <table>
    <thead><tr><th>Projeto</th><th>Score CPIE</th><th>Status</th></tr></thead>
    <tbody>
      ${lowScore.slice(0, 10).map((p: any) => `
        <tr>
          <td>${p.name}</td>
          <td><span class="badge-low">${p.profileCompleteness ?? 0}%</span></td>
          <td>${p.status ?? 'rascunho'}</td>
        </tr>`).join('')}
      ${lowScore.length > 10 ? `<tr><td colspan="3" style="color:#64748b;font-style:italic;">... e mais ${lowScore.length - 10} projetos</td></tr>` : ''}
    </tbody>
  </table>`}

  <div class="footer">
    Relatório gerado automaticamente pela Plataforma IA SOLARIS &mdash; Compliance Tributário &mdash; Reforma Tributária 2024-2033
  </div>
</body>
</html>`;

      // Notificar owner
      try {
        const { notifyOwner } = await import("../_core/notification");
        await notifyOwner({
          title: `📊 Relatório Executivo Mensal Gerado — ${monthName}`,
          content: [
            `**Período:** ${monthName}`,
            `**Total de projetos:** ${total}`,
            `**Score médio CPIE:** ${avgScore}%`,
            `**Projetos com risco:** ${highRisk.length}`,
            `**Projetos com score baixo:** ${lowScore.length}`,
            `**Gerado por:** ${ctx.user.name || ctx.user.email}`,
          ].join("\n"),
        });
      } catch { /* não bloquear */ }

      return { html, month, year, monthName, stats: { total, avgScore, highRisk: highRisk.length, lowScore: lowScore.length, excellent: excellent.length } };
    }),

  /**
   * Score determinístico por dimensão — sem IA, instantâneo.
   * Usado para atualizar o painel de score em tempo real sem chamar a IA.
   */
  scoreSync: protectedProcedure
    .input(CpieProfileInputSchema)
    .mutation(({ input }) => {
      const profileInput: CpieProfileInput = {
        ...input,
        multiState: input.multiState ?? null,
        hasMultipleEstablishments: input.hasMultipleEstablishments ?? null,
        hasImportExport: input.hasImportExport ?? null,
        hasSpecialRegimes: input.hasSpecialRegimes ?? null,
        hasIntermediaries: input.hasIntermediaries ?? null,
        hasTaxTeam: input.hasTaxTeam ?? null,
        hasAudit: input.hasAudit ?? null,
        hasTaxIssues: input.hasTaxIssues ?? null,
      };
      const dimensions = calcDimensionScores(profileInput);
      const overallScore = calcOverallScore(dimensions);
      return { overallScore, dimensions };
    }),
});
