/**
 * Router do Novo Fluxo v3.0 — 5 Etapas de Compliance Tributário
 *
 * V60: Schemas Zod enriquecidos + generateWithRetry + temperatura 0.2 + system prompts com papéis
 * V61: Scoring financeiro + confidence score + campo inconsistencias preparado
 * V62: Pré-RAG inteligente — injeção de contexto regulatório CNAE→artigos
 * V63: Motor de decisão explícito (decisao_recomendada + momento_wow)
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { createTrace } from "./tracer";
import { projects, questionnaireAnswersV3, questionnaireProgressV3, questionnaireQuestionsCache } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Importações dos novos módulos V60-V63
import {
  CnaesResponseSchema,
  QuestionsResponseSchema,
  BriefingStructuredSchema,
  RisksResponseSchema,
  TasksResponseSchema,
  DecisaoResponseSchema,
  validateRagOutput,
  calcularFundamentacao,
  calcularMatrizMetadata,
} from "./ai-schemas";
import { generateWithRetry, calculateGlobalScore, OUTPUT_CONTRACT } from "./ai-helpers";
import mysql from "mysql2/promise";
import { SOLARIS_GAPS_MAP, type SolarisGapDefinition } from "./config/solaris-gaps-map";
import { analyzeSolarisAnswers } from "./lib/solaris-gap-analyzer";
import { analyzeIagenAnswers } from "./lib/iagen-gap-analyzer";
import { listActiveCategories, type RiskCategory } from "./lib/db-queries-risk-categories";

const ONDA2_PROMPT_VERSION = "Z11-v1";
import { analyzeEngineGaps } from "./lib/engine-gap-analyzer";
// fix(z22) Wave A.2+B EX-2: persistCpieScoreForProject removido (scoringEngine.ts deletado · ADR-0029 D-3).
import { deriveRisksFromGaps, persistRisks } from "./routers/riskEngine";
import { injectOnda1IntoQuestions } from "./routers/onda1Injector";
// V65: RAG híbrido (LIKE + re-ranking LLM) substitui o pré-RAG estático
import { retrieveArticles, retrieveArticlesFast } from "./rag-retriever";
// v2.1 T3: Adaptador de consolidação do diagnóstico em 3 camadas
import { consolidateDiagnosticLayers, isDiagnosticComplete, getNextDiagnosticLayer, getDiagnosticProgress, resolveProjectAnswers, buildProductServiceLayers } from "./diagnostic-consolidator";
// ADR-005 F-02A: Adaptador centralizado de leitura de diagnóstico (leitura via getDiagnosticSource)
import { getDiagnosticSource, assertFlowVersion } from "./diagnostic-source";
// M3 Fase 1: Completude diagnóstica expandida (DEC-M3-01 + DEC-M3-02)
import { computeCompleteness, inferCompanyType } from "./lib/completeness";
// Z-01: Q.Produtos (NCM) + Q.Serviços (NBS) rastreados — DEC-M3-05 v3 · ADR-0009
import { generateProductQuestions } from "./lib/product-questions";
import { generateServiceQuestions } from "./lib/service-questions";
import type { QuestionResult, TrackedQuestion } from "./lib/tracked-question";

const CnaeSchema = z.object({
  code: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(100),
  justification: z.string().optional(),
});

// ─── G17: analyzeSolarisAnswers — extraída para server/lib/solaris-gap-analyzer.ts ──
// Importada acima (linha 33). Fire-and-forget em completeOnda1 (linha ~2332).

// ─── Z-11: Helper functions para Onda 2 inteligente ─────────────────────────

interface ProjectProfile {
  companyProfile: any;
  operationProfile: any;
  taxComplexity: any;
  financialProfile: any;
  governanceProfile: any;
}

function calcularLimitePerguntas(
  companyProfile: any,
  operationProfile: any,
  taxComplexity: any,
  financialProfile: any,
  governanceProfile: any,
): number {
  let limite = 3;
  if (taxComplexity?.hasInternationalOps) limite += 2;
  if (
    financialProfile?.paymentMethods?.includes("marketplace") ||
    financialProfile?.paymentMethods?.includes("cartao") ||
    financialProfile?.paymentMethods?.includes("cartão")
  )
    limite += 2;
  if (taxComplexity?.usesTaxIncentives) limite += 2;
  if (financialProfile?.hasIntermediaries) limite += 1;
  if (governanceProfile?.hasTaxIssues) limite += 1;
  if (
    operationProfile?.operationType === "industria" ||
    operationProfile?.operationType === "agronegocio"
  )
    limite += 1;
  return Math.min(limite, 12);
}

function filtrarCategoriasPorPerfil(
  categorias: RiskCategory[],
  profile: ProjectProfile,
): RiskCategory[] {
  const fin = profile.financialProfile;
  const tax = profile.taxComplexity;
  const op = profile.operationProfile;

  return categorias.filter((cat) => {
    switch (cat.codigo) {
      case "split_payment":
        return (
          fin?.paymentMethods?.some((m: string) =>
            ["cartao", "marketplace", "cartão", "pix"].includes(m),
          ) || !!fin?.hasIntermediaries
        );
      case "imposto_seletivo":
        return ["industria", "comercio"].includes(op?.operationType ?? "");
      case "transicao_iss_ibs":
        return ["servicos", "misto"].includes(op?.operationType ?? "");
      case "regime_diferenciado":
        return !!tax?.usesTaxIncentives;
      default:
        return true;
    }
  });
}

export const fluxoV3Router = router({

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Criar projeto
  // ─────────────────────────────────────────────────────────────────────────
  createProject: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Nome é obrigatório"),
      description: z.string().min(50, "Descrição deve ter pelo menos 50 caracteres"),
      clientId: z.number({ message: "Cliente é obrigatório" }),
      faturamentoAnual: z.number().optional(), // V61: para tradução financeira do risco
      // v2.1: Company Profile Layer — OBRIGATÓRIO (fix/v2.1-company-profile-required)
      companyProfile: z.object({
        cnpj: z.string().min(14, "CNPJ é obrigatório"),
        companyType: z.enum(["ltda", "sa", "mei", "eireli", "scp", "cooperativa", "outro", "slu", "outros"]),
        companySize: z.enum(["mei", "micro", "pequena", "media", "grande"]),
        taxRegime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real"]),
        foundingYear: z.number().optional(),
        stateUF: z.string().optional(),
        employeeCount: z.string().optional(),
        annualRevenueRange: z.enum(["ate_360k", "360k_4_8m", "4_8m_78m", "acima_78m", "0-360000", "360000-4800000", "4800000-78000000", "78000000+"]).optional(),
        // ISSUE-001: QC-02 — Estrutura Societária (Prefill Contract Fase 1 Final)
        isEconomicGroup: z.boolean().optional().nullable(),
        taxCentralization: z.enum(["centralized", "decentralized", "partial"]).optional().nullable(),
      }),
      operationProfile: z.object({
        operationType: z.enum(["produto", "servico", "misto", "industria", "comercio", "servicos", "agronegocio", "financeiro"]),
        clientType: z.array(z.string()).min(1, "Selecione pelo menos 1 tipo de cliente"),
        multiState: z.boolean(),
        geographicScope: z.string().optional(),
        // Bloco E (CNT-01c): NCM/NBS persistidos no operationProfile — sem colunas soltas
        principaisProdutos: z.array(z.object({
          ncm_code: z.string(),
          descricao: z.string(),
          percentualFaturamento: z.number().optional(),
        })).optional().default([]),
        principaisServicos: z.array(z.object({
          nbs_code: z.string(),
          descricao: z.string(),
          percentualFaturamento: z.number().optional(),
        })).optional().default([]),
      }),
      taxComplexity: z.object({
        hasInternationalOps: z.boolean().optional(),
        usesTaxIncentives: z.boolean().optional(),
        usesMarketplace: z.boolean().optional(),
        hasMultipleEstablishments: z.boolean().optional(),
        hasImportExport: z.boolean().optional(),
        hasSpecialRegimes: z.boolean().optional(),
      }).optional(),
      financialProfile: z.object({
        paymentMethods: z.array(z.string()).optional(),
        paymentMethodsOther: z.string().optional(),
        hasIntermediaries: z.boolean().optional(),
      }).optional(),
      governanceProfile: z.object({
        hasTaxTeam: z.boolean().optional(),
        hasAudit: z.boolean().optional(),
        hasTaxIssues: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const projectId = await db.createProject({
        name: input.name,
        description: input.description,
        clientId: input.clientId,
        status: "rascunho",
        createdById: ctx.user.id,
        createdByRole: ctx.user.role as any,
        notificationFrequency: "semanal",
        currentStep: 1,
        faturamentoAnual: input.faturamentoAnual,
        // v2.1: Company Profile Layer
        companyProfile: input.companyProfile ?? null,
        operationProfile: input.operationProfile ?? null,
        taxComplexity: input.taxComplexity ?? null,
        financialProfile: input.financialProfile ?? null,
        governanceProfile: input.governanceProfile ?? null,
      } as any);
      return { projectId };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Extrair CNAEs via IA (V60: retry + temperatura 0.2)
  // ─────────────────────────────────────────────────────────────────────────
  extractCnaes: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      description: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // ── TRACE: inicializa rastreamento detalhado por requisição ─────────────────────────
      const trace = createTrace("extractCnaes", {
        projectId: input.projectId,
        userId: ctx.user?.id,
        descLen: input.description.length,
        descPreview: input.description.substring(0, 80).replace(/\n/g, " "),
      });

      const project = await db.getProjectById(input.projectId);
      if (!project) {
        trace.error("Projeto não encontrado", { projectId: input.projectId });
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      }
      trace.step("project_loaded", { projectName: (project as any).name });

      // Embeddings semânticos: busca por similaridade de cosseno (OpenAI text-embedding-3-small)
      const { buildSemanticCnaeContext } = await import("./cnae-embeddings");
      // v2.1: Enriquecer busca semântica com dados do Company Profile (se disponível)
      const projectAny = project as any;
      const companyContext = (projectAny.companyProfile || projectAny.operationProfile) ? {
        taxRegime: projectAny.companyProfile?.taxRegime,
        operationType: projectAny.operationProfile?.operationType,
        clientType: projectAny.operationProfile?.clientType,
        annualRevenueRange: projectAny.companyProfile?.annualRevenueRange,
      } : undefined;

      trace.step("embedding_context_start", { hasCompanyProfile: !!companyContext });
      let ragContext: string;
      try {
        ragContext = await buildSemanticCnaeContext(input.description, 20, companyContext);
        trace.step("embedding_context_done", {
          ragContextLen: ragContext.length,
          ragContextLines: ragContext.split("\n").length,
        });
      } catch (embCtxErr) {
        const embCtxMsg = embCtxErr instanceof Error ? embCtxErr.message : String(embCtxErr);
        trace.error(`buildSemanticCnaeContext falhou: ${embCtxMsg}`);
        // Se o contexto RAG falhar completamente, usa string vazia (LLM terá menos contexto)
        ragContext = "";
        trace.step("embedding_context_failed_using_empty", { error: embCtxMsg });
      }

      let result: z.infer<typeof CnaesResponseSchema>;
      try {
        trace.step("llm_call_start", { model: "gpt-4.1", temperature: 0.1, timeoutMs: 25000 });
        result = await generateWithRetry(
          [
            {
              role: "system",
              content: `Você é um Classificador Tributário Especialista em CNAE 2.3 e Reforma Tributária brasileira (LC 214/2025, IBS, CBS, IS).
Sua função é identificar com ALTA PRECISÃO TODOS os CNAEs que descrevem as atividades do negócio.

REGRAS CRÍTICAS:
1. SOMENTE use códigos da lista CNAE OFICIAL fornecida. NUNCA invente códigos.
2. PASSO 1 — Decomponha a descrição em atividades distintas: leia cada cláusula separada por vírgula, ponto-e-vírgula, "e", "além de", "também" como uma atividade separada.
3. PASSO 2 — Para CADA atividade identificada, selecione o CNAE mais específico da lista.
4. Prefira CNAEs de 7 dígitos (ex: 6201-5/01) a grupos genéricos.
5. Se a empresa fabrica E vende, inclua CNAEs de fabricação E comércio.
6. Não escolha CNAEs genéricos como "outros" se houver um específico na lista.
7. Mínimo de 2 CNAEs, máximo de 6. Nunca retorne lista vazia.
Responda APENAS com JSON válido no formato especificado.`,
            },
            {
              role: "user",
              content: `DESCRIÇÃO DO NEGÓCIO:
${input.description}

INSTRUÇÃO:
1. Liste cada atividade mencionada na descrição acima (ex: "atacado de cereais", "transporte rodoviário", "insumos agrícolas").
2. Para cada atividade, selecione o CNAE mais adequado da lista oficial abaixo.
3. Inclua um CNAE para CADA atividade identificada.

LISTA CNAE OFICIAL IBGE — candidatos selecionados por similaridade semântica (use APENAS códigos desta lista):
${ragContext}

Para cada CNAE forneça: código (EXATAMENTE como na lista), descrição oficial, confidence (0-100) e justificativa breve.
Considere especialmente os CNAEs mais impactados pela Reforma Tributária (IBS, CBS, IS).

Responda em JSON:
{"cnaes": [{"code": "XXXX-X/XX", "description": "...", "confidence": 95, "justification": "..."}]}`,
            },
          ],
          CnaesResponseSchema,
          {
            temperature: 0.1,
            context: "extractCnaes",
            timeoutMs: 25_000,
            maxRetries: 1,
          }
        );
        trace.step("llm_call_done", { cnaesCount: result.cnaes.length });
      } catch (aiError) {
        const errMsg = aiError instanceof Error ? aiError.message : String(aiError);
        const isTimeout = errMsg.toLowerCase().includes("timed out") ||
          errMsg.toLowerCase().includes("timeout") ||
          errMsg.toLowerCase().includes("abort");
        const descPreview = input.description.substring(0, 120).replace(/\n/g, " ");

        // Trace detalhado do erro LLM
        trace.step(isTimeout ? "llm_timeout" : "llm_error", {
          error: errMsg,
          isTimeout,
          ragContextEmpty: ragContext.length === 0,
        });
        trace.error(
          `[${isTimeout ? "TIMEOUT" : "ERROR"}] ${errMsg}`,
          { descPreview, ragContextLen: ragContext.length }
        );

        // Log legado mantido para compatibilidade com grep existente
        console.error(
          `[extractCnaes][${isTimeout ? "TIMEOUT" : "ERROR"}] projectId=${input.projectId} | requestId=${trace.requestId} | descPreview="${descPreview}" | ragContextLen=${ragContext.length} | erro=${errMsg}`
        );

        // Notificar owner em produção
        try {
          const { notifyOwner } = await import("./_core/notification");
          await notifyOwner({
            title: isTimeout
              ? "⏱️ extractCnaes — Timeout (>25s) — fallback ativado"
              : "⚠️ extractCnaes falhou — fallback ativado",
            content: `Projeto #${input.projectId} | requestId=${trace.requestId}\nDescrição: "${descPreview}"\nRAG context len: ${ragContext.length}\nErro: ${errMsg}`,
          });
        } catch { /* notificação é best-effort */ }

        // Fallback: usar os top-5 candidatos por similaridade semântica
        trace.step("fallback_start");
        const { findSimilarCnaes, getFallbackCandidates } = await import("./cnae-embeddings");
        let candidates;
        try {
          candidates = await findSimilarCnaes(input.description, 5);
          trace.step("fallback_embedding_done", { candidatesCount: candidates.length });
        } catch (embeddingError) {
          const embErrMsg = embeddingError instanceof Error ? embeddingError.message : String(embeddingError);
          trace.step("fallback_embedding_error", { error: embErrMsg });
          console.error(
            `[extractCnaes][FALLBACK_ERROR] projectId=${input.projectId} | requestId=${trace.requestId} | embedding também falhou: ${embErrMsg}`
          );
          candidates = getFallbackCandidates(5);
          trace.step("fallback_hardcoded", { candidatesCount: candidates.length });
        }
        if (candidates.length === 0) {
          trace.error("FATAL: nenhum candidato disponível");
          console.error(
            `[extractCnaes][FATAL] projectId=${input.projectId} | requestId=${trace.requestId} | nenhum candidato disponível — re-lançando erro original`
          );
          throw aiError;
        }
        console.warn(
          `[extractCnaes][FALLBACK_OK] projectId=${input.projectId} | requestId=${trace.requestId} | usando ${candidates.length} candidatos semânticos`
        );
        result = {
          cnaes: candidates.map((c, i) => ({
            code: c.code,
            description: c.description,
            confidence: Math.max(40, 70 - i * 8),
            justification: "Sugerido com base na similaridade semântica da descrição do negócio.",
          })),
        };
      }

      // Serialização explícita
      const safeCnaes = result.cnaes.map((c) => ({
        code: String(c.code ?? ""),
        description: String(c.description ?? ""),
        confidence: Number(c.confidence ?? 0),
        ...(c.justification ? { justification: String(c.justification) } : {}),
      }));

      trace.finish("ok", {
        cnaesReturned: safeCnaes.length,
        isFallback: safeCnaes[0]?.justification?.includes("similaridade semântica") ?? false,
      });

      return { cnaes: safeCnaes, requestId: trace.requestId };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Refinar CNAEs via feedback (V60: retry + temperatura 0.2)
  // ─────────────────────────────────────────────────────────────────────────
  refineCnaes: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      description: z.string().min(1),
      feedback: z.string().min(5, "Descreva o que precisa ser ajustado"),
      currentCnaes: z.array(CnaeSchema),
      iteration: z.number().default(1),
    }))
    .mutation(async ({ input }) => {
      const trace = createTrace("refineCnaes");
      trace.step("start", { projectId: input.projectId, iteration: input.iteration, feedbackLen: input.feedback.length, currentCnaesCount: input.currentCnaes.length });

      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      trace.step("project_loaded", { projectName: project.name });

      const currentList = input.currentCnaes.map(c =>
        `- ${c.code}: ${c.description} (confiança: ${c.confidence}%)`
      ).join("\n");

      // Embeddings semânticos: busca por similaridade de cosseno (OpenAI text-embedding-3-small)
      trace.step("embedding_context_start", { query: `${input.description.substring(0, 60)} ${input.feedback.substring(0, 40)}` });
      const { buildSemanticCnaeContext } = await import("./cnae-embeddings");
      const ragContext = await buildSemanticCnaeContext(`${input.description} ${input.feedback}`);
      trace.step("embedding_context_done", { contextLen: ragContext.length });

      let result: z.infer<typeof CnaesResponseSchema>;
      try {
        trace.step("llm_call_start", { temperature: 0.1, iteration: input.iteration });
       result = await generateWithRetry(
        [
          {
            role: "system",
            content: `Você é um Classificador Tributário Especialista em CNAE e Reforma Tributária brasileira.
Revise a lista de CNAEs com base no feedback do usuário.
MANTENHA os corretos, AJUSTE os que precisam de correção, ADICIONE os que estão faltando.
Se o feedback mencionar uma atividade não coberta (ex: transporte, insumos agrícolas), ADICIONE o CNAE correspondente.
USE APENAS códigos da lista CNAE OFICIAL fornecida. NUNCA invente códigos.
Mínimo 2, máximo 6 CNAEs. Nunca retorne lista vazia.
Responda APENAS com JSON válido.`,
          },
          {
            role: "user",
            content: `CNAEs sugeridos (iteração ${input.iteration}):
${currentList}

Feedback do usuário: "${input.feedback}"

Descrição original: ${input.description}

ATENÇÃO: Se a descrição ou feedback mencionar múltiplas atividades (ex: comércio atacadista + transporte + insumos agrícolas), inclua um CNAE para CADA atividade.

---
LISTA CNAE OFICIAL IBGE (use APENAS códigos desta lista):
${ragContext}
---

Retorne entre 2 e 6 CNAEs revisados com base no feedback.
{"cnaes": [{"code": "XXXX-X/XX", "description": "...", "confidence": 95, "justification": "..."}]}`,
          },
        ],
        CnaesResponseSchema,
        { temperature: 0.1, context: "refineCnaes" }
      );
        trace.step("llm_call_done", { cnaesReturned: result.cnaes.length });
      } catch (refineError) {
        // ── Trace + Monitoramento: log estruturado do erro LLM no refineCnaes ───
        const errMsg = refineError instanceof Error ? refineError.message : String(refineError);
        const descPreview = input.description.substring(0, 80).replace(/\n/g, " ");
        trace.step("llm_call_error", { error: errMsg });
        trace.finish("error");
        console.error(
          `[refineCnaes][ERROR] projectId=${input.projectId} | iter=${input.iteration} | descPreview="${descPreview}" | erro=${errMsg}`
        );
        try {
          const { notifyOwner } = await import("./_core/notification");
          await notifyOwner({
            title: "⚠️ refineCnaes falhou",
            content: `Projeto #${input.projectId} | Iteração ${input.iteration}\nFeedback: "${input.feedback.substring(0, 100)}"\nErro: ${errMsg}`,
          });
        } catch { /* best-effort */ }
        // ─────────────────────────────────────────────────────────────────────────
        throw refineError;
      }

      // Serialização explícita: garante objetos planos para evitar [Max Depth] no Superjson/tRPC
      trace.step("serialize_start");
      const safeRefinedCnaes = result.cnaes.map((c) => ({
        code: String(c.code ?? ""),
        description: String(c.description ?? ""),
        confidence: Number(c.confidence ?? 0),
        ...(c.justification ? { justification: String(c.justification) } : {}),
      }));
      trace.step("serialize_done", { safeCount: safeRefinedCnaes.length });
      trace.finish("ok");
      return { cnaes: safeRefinedCnaes, iteration: input.iteration + 1 };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Confirmar CNAEs e avançar para Etapa 2
  // ─────────────────────────────────────────────────────────────────────────
  confirmCnaes: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaes: z.array(CnaeSchema).min(1, "Selecione pelo menos 1 CNAE"),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      // BUG-E2E-01: transição atômica rascunho → consistencia_pendente → cnaes_confirmados
      // Mesma lógica do approveBriefing (BUG-UAT-09): se o projeto ainda está em rascunho,
      // valida as duas transições em sequência antes de persistir o status final.
      const { assertValidTransition } = await import('./flowStateMachine');
      if (project.status === 'rascunho') {
        assertValidTransition(project.status, 'consistencia_pendente');
        assertValidTransition('consistencia_pendente', 'cnaes_confirmados');
      } else {
        assertValidTransition(project.status, 'cnaes_confirmados');
      }
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({
          confirmedCnaes: input.cnaes as any,
          currentStep: 4,
          currentStepName: "confirmacao_cnaes",
          status: "cnaes_confirmados",
          stepUpdatedAt: new Date(),
        } as any)
        .where(eq(projects.id, input.projectId));
      return { success: true, nextStep: 4, stepName: "confirmacao_cnaes" };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Criar cliente on the fly
  // ─────────────────────────────────────────────────────────────────────────
  createClientOnTheFly: protectedProcedure
    .input(z.object({
      companyName: z.string().min(1, "Razão Social é obrigatória"),
      cnpj: z.string().optional(),
      email: z.string().email("E-mail inválido").optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas a equipe SOLARIS pode criar clientes" });
      }

      const rawCnpjDigits = (input.cnpj || "").replace(/\D/g, "");
      const formattedCnpj = rawCnpjDigits.length === 14
        ? rawCnpjDigits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
        : rawCnpjDigits.length > 0
          ? rawCnpjDigits.slice(0, 18)
          : undefined;

      const userId = await db.createUser({
        name: input.companyName,
        email: input.email || `cliente-${Date.now()}@solaris.temp`,
        companyName: input.companyName,
        cnpj: formattedCnpj,
        phone: (input.phone || "").slice(0, 20) || undefined,
        role: "cliente",
        openId: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      return { userId, companyName: input.companyName };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Buscar dados do projeto
  // ─────────────────────────────────────────────────────────────────────────
  getProjectStep1: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      // ADR-005 F-02A: leitura via adaptador centralizado
      const diagSource = await getDiagnosticSource(input.projectId);
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      // Buscar dados do cliente para exibir no formulário
      const client = project.clientId ? await db.getUserById(project.clientId) : null;
      return {
        id: project.id,
        name: project.name,
        description: (project as any).description,
        clientId: project.clientId,
        clientName: client?.companyName || client?.name || null,
        clientCnpj: (client as any)?.cnpj || null,
        confirmedCnaes: (project as any).confirmedCnaes,
        currentStep: (project as any).currentStep ?? 1,
        status: project.status,
        // ADR-005: leitura via adaptador (não leitura direta do banco)
        questionnaireAnswers: diagSource.questionnaireAnswersV3 ?? null,
        briefingContent: diagSource.briefingContentV3 ?? null,
        riskMatricesData: diagSource.riskMatricesDataV3 ?? null,
        actionPlansData: diagSource.actionPlansDataV3 ?? null,
        scoringData: (project as any).scoringData ?? null,      // V61
        decisaoData: (project as any).decisaoData ?? null,      // V63
        faturamentoAnual: (project as any).faturamentoAnual ?? null, // V61
        // ── 3 camadas de diagnóstico (v2.2) ────────────────────────────────────
        corporateAnswers: diagSource.corporateAnswers ?? null,
        operationalAnswers: diagSource.operationalAnswers ?? null,
        cnaeAnswers: diagSource.cnaeAnswers ?? null,
        // M2 Componente D: operationProfile exposto para edição NCM/NBS (TO-BE v3 2026-04-06)
        operationProfile: (project as any).operationProfile ?? null,
        // M3 Fase 1: Completude diagnóstica expandida (DEC-M3-01 + DEC-M3-02)
        // Campo calculado em runtime — NÃO persistido no banco (M3 Fase 2)
        diagnosticCompleteness: computeCompleteness({
          solarisAnswersCount: await db.countOnda1Answers(input.projectId),
          iagenAnswersCount: await db.countOnda2Answers(input.projectId),
          diagnosticStatus: (project as any).diagnosticStatus ?? null,
          operationProfile: (project as any).operationProfile ?? null,
          ncmCodesCount: ((project as any).operationProfile as any)?.principaisProdutos?.length ?? 0,
          nbsCodesCount: ((project as any).operationProfile as any)?.principaisServicos?.length ?? 0,
        }),
      };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Gerar perguntas do questionário (V60: retry + temperatura 0.2 + metadata)
  // ─────────────────────────────────────────────────────────────────────────
  generateQuestions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaeCode: z.string(),
      cnaeDescription: z.string(),
      level: z.enum(["nivel1", "nivel2"]),
      roundIndex: z.number().optional().default(0), // 0=primeiro aprofundamento, 1=segundo, etc.
      previousAnswers: z.array(z.object({
        question: z.string(),
        answer: z.string(),
      })).optional(),
      contextNote: z.string().optional(), // Campo livre de contexto adicional do usuário
    }))
    .mutation(async ({ input }) => {
      console.log(`[generateQuestions] START projectId=${input.projectId} cnae=${input.cnaeCode} level=${input.level} round=${input.roundIndex}`);
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const projectDescription = (project as any).description || "";
      const roundLabel = (input.roundIndex ?? 0) > 0 ? ` (Round ${(input.roundIndex ?? 0) + 1})` : "";
      const contextNoteSection = input.contextNote?.trim()
        ? `\nCONTEXTO ADICIONAL FORNECIDO PELO USUÁRIO:\n${input.contextNote.trim()}\n`
        : "";
      const nivel2Context = input.level === "nivel2" && input.previousAnswers?.length
        ? `\nRESPOSTAS ANTERIORES:\n${input.previousAnswers.map(a => `P: ${a.question}\nR: ${a.answer}`).join("\n\n")}\n${contextNoteSection}\nGere perguntas de APROFUNDAMENTO${roundLabel} baseadas nessas respostas e no contexto adicional.`
        : contextNoteSection ? `\n${contextNoteSection}\nGere perguntas considerando este contexto adicional.` : "";

      // V65: RAG híbrido — busca artigos relevantes para o CNAE (versão rápida sem re-ranking para perguntas)
      let ragCtx;
      try {
        ragCtx = await retrieveArticlesFast(
          [input.cnaeCode],
          `${input.cnaeCode} ${input.cnaeDescription} ${projectDescription}`,
          5
        );
      } catch (ragErr) {
        console.error(`[generateQuestions] RAG error (non-fatal):`, ragErr);
        ragCtx = { articles: [], contextText: "", totalCandidates: 0 };
      }
      const regulatoryContext = ragCtx?.contextText ?? "";
      console.log(`[generateQuestions] RAG ok, articles=${ragCtx?.articles?.length ?? 0}`);

      let result;
      try {
        result = await generateWithRetry(
        [
          {
            role: "system",
            content: `Você é um Auditor de Diagnóstico Tributário especializado na Reforma Tributária brasileira (LC 214/2025, IBS, CBS, IS).
Sua função é gerar perguntas de diagnóstico precisas e acionáveis para identificar gaps de compliance.

REGRAS OBRIGATÓRIAS:
1. Cada pergunta deve ter objetivo_diagnostico claro (o que ela diagnostica)
2. Cada pergunta deve ter impacto_reforma específico (como a resposta impacta o compliance)
3. Cada pergunta deve ter peso_risco definido (baixo/medio/alto/critico)
4. Perguntas de nível 1: diagnóstico essencial (máximo 10 perguntas)
5. Perguntas de nível 2: aprofundamento baseado nas respostas anteriores (máximo 10 perguntas)
6. Nunca seja genérico — cada pergunta deve ser específica para o CNAE informado
7. Cada pergunta deve ter rastreabilidade de origem (G15):
   - "fonte": "regulatorio" se baseada em legislação (LC 214, EC 132, LC 227, LC 224, LC 116, LC 87),
              "solaris" se baseada em orientação jurídica SOLARIS interna,
              "ia_gen" se inferida sem base documental explícita no contexto RAG
   - "requirement_id": identificador do requisito (ex: "RF-045") ou "" se não aplicável
   - "source_reference": referência normativa (ex: "LC 214/2025 Art. 9°") ou "" se ia_gen
   Se não houver base documental no contexto RAG, usar fonte: "ia_gen" e campos vazios.

${regulatoryContext}

${OUTPUT_CONTRACT}`,
          },
          {
            role: "user",
            content: `CNAE: ${input.cnaeCode} — ${input.cnaeDescription}
DESCRIÇÃO DA EMPRESA: ${projectDescription}
NÍVEL: ${input.level === "nivel1" ? "1 (perguntas essenciais)" : `2 (aprofundamento${roundLabel})`}
${nivel2Context}

Gere as perguntas no formato:
{"questions": [{"id": "q1", "text": "...", "objetivo_diagnostico": "...", "impacto_reforma": "...", "type": "sim_nao", "peso_risco": "alto", "required": true, "options": [], "scale_labels": {"min": "Nunca", "max": "Sempre"}, "placeholder": "...", "fonte": "regulatorio", "requirement_id": "RF-045", "source_reference": "LC 214/2025 Art. 9°"}]}`,
          },
        ],
          QuestionsResponseSchema,
          { temperature: 0.2, context: "generateQuestions" }
        );
      } catch (llmErr) {
        console.error(`[generateQuestions] LLM error for cnae=${input.cnaeCode}:`, llmErr);
        throw llmErr;
      }
      console.log(`[generateQuestions] OK questions=${result.questions.length}`);

      // K-2: Injetar perguntas Onda 1 (SOLARIS) antes das regulatórias (Onda 3)
      const questionsWithOnda1 = await injectOnda1IntoQuestions(
        input.cnaeCode,
        result.questions as any
      );
      console.log(`[generateQuestions] Onda1 injected: onda1=${questionsWithOnda1.filter(q => q.fonte === 'solaris').length} regulatorio=${questionsWithOnda1.filter(q => q.fonte !== 'solaris').length} total=${questionsWithOnda1.length}`);

      return { questions: questionsWithOnda1 };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Salvar resposta individual
  // ─────────────────────────────────────────────────────────────────────────
  saveAnswer: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaeCode: z.string(),
      cnaeDescription: z.string().optional(),
      level: z.enum(["nivel1", "nivel2"]),
      roundIndex: z.number().optional().default(0),
      questionIndex: z.number(),
      questionText: z.string(),
      questionType: z.string().optional(),
      answerValue: z.string(),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const roundIdx = input.roundIndex ?? 0;
      const existing = await database
        .select()
        .from(questionnaireAnswersV3)
        .where(
          and(
            eq(questionnaireAnswersV3.projectId, input.projectId),
            eq(questionnaireAnswersV3.cnaeCode, input.cnaeCode),
            eq(questionnaireAnswersV3.level, input.level),
            eq(questionnaireAnswersV3.roundIndex, roundIdx),
            eq(questionnaireAnswersV3.questionIndex, input.questionIndex)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await database
          .update(questionnaireAnswersV3)
          .set({ answerValue: input.answerValue })
          .where(eq(questionnaireAnswersV3.id, existing[0].id));
      } else {
        await database.insert(questionnaireAnswersV3).values({
          projectId: input.projectId,
          cnaeCode: input.cnaeCode,
          cnaeDescription: input.cnaeDescription,
          level: input.level,
          roundIndex: roundIdx,
          questionIndex: input.questionIndex,
          questionText: input.questionText,
          questionType: input.questionType,
          answerValue: input.answerValue,
        });
      }
      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Recuperar progresso salvo
  // ─────────────────────────────────────────────────────────────────────────
  getProgress: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [progress] = await database
        .select()
        .from(questionnaireProgressV3)
        .where(eq(questionnaireProgressV3.projectId, input.projectId))
        .limit(1);

      const answers = await database
        .select()
        .from(questionnaireAnswersV3)
        .where(eq(questionnaireAnswersV3.projectId, input.projectId));

      return { progress: progress || null, answers };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Validar nota de contexto adicional (Feature 2: campo livre)
  // ─────────────────────────────────────────────────────────────────────────
  validateContextNote: protectedProcedure
    .input(z.object({
      cnaeCode: z.string(),
      cnaeDescription: z.string(),
      contextNote: z.string(),
    }))
    .mutation(async ({ input }) => {
      const text = input.contextNote.trim();
      if (!text || text.length < 10) {
        return { relevant: false, reason: "Texto muito curto para avaliar." };
      }
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Você é um especialista em compliance tributário. Avalie se o texto fornecido tem relevância para o CNAE informado. Responda APENAS com JSON válido.",
            },
            {
              role: "user",
              content: `CNAE: ${input.cnaeCode} — ${input.cnaeDescription}\n\nTexto do usuário:\n"${text}"\n\nEste texto descreve desafios, cenários, exceções ou pontos de atenção relevantes para este CNAE específico? Retorne: {"relevant": true/false, "reason": "explicação breve em português"}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "context_validation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  relevant: { type: "boolean" },
                  reason: { type: "string" },
                },
                required: ["relevant", "reason"],
                additionalProperties: false,
              },
            },
          } as any,
        });
        const content = response.choices?.[0]?.message?.content;
        if (!content) return { relevant: true, reason: "Não foi possível validar, prosseguindo." };
        const parsed = typeof content === "string" ? JSON.parse(content) : content;
        return { relevant: parsed.relevant as boolean, reason: parsed.reason as string };
      } catch (err) {
        console.error("[validateContextNote] erro:", err);
        // Em caso de erro, deixar passar (não bloquear o usuário)
        return { relevant: true, reason: "Validação indisponível, prosseguindo." };
      }
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Cache de perguntas geradas (persistência cross-device)
  // ─────────────────────────────────────────────────────────────────────────
  saveQuestionsCache: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaeCode: z.string(),
      level: z.enum(["nivel1", "nivel2"]),
      roundIndex: z.number().default(0),
      questionsJson: z.string(),
      contextNote: z.string().optional(), // Contexto adicional usado na geração deste round
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const existing = await database
        .select({ id: questionnaireQuestionsCache.id })
        .from(questionnaireQuestionsCache)
        .where(
          and(
            eq(questionnaireQuestionsCache.projectId, input.projectId),
            eq(questionnaireQuestionsCache.cnaeCode, input.cnaeCode),
            eq(questionnaireQuestionsCache.level, input.level),
            eq(questionnaireQuestionsCache.roundIndex, input.roundIndex)
          )
        )
        .limit(1);
      if (existing.length > 0) {
        await database
          .update(questionnaireQuestionsCache)
          .set({ questionsJson: input.questionsJson, contextNote: input.contextNote ?? null })
          .where(eq(questionnaireQuestionsCache.id, existing[0].id));
      } else {
        await database.insert(questionnaireQuestionsCache).values({
          projectId: input.projectId,
          cnaeCode: input.cnaeCode,
          level: input.level,
          roundIndex: input.roundIndex,
          questionsJson: input.questionsJson,
          contextNote: input.contextNote ?? null,
        });
      }
      return { ok: true };
    }),

  getRoundsSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return { summary: [] };
      // Buscar todas as respostas do projeto
      const answers = await database
        .select({
          cnaeCode: questionnaireAnswersV3.cnaeCode,
          cnaeDescription: questionnaireAnswersV3.cnaeDescription,
          level: questionnaireAnswersV3.level,
          roundIndex: questionnaireAnswersV3.roundIndex,
        })
        .from(questionnaireAnswersV3)
        .where(eq(questionnaireAnswersV3.projectId, input.projectId));

      // Agregar por CNAE: contar rounds de aprofundamento (nivel2)
      const byCnae: Record<string, {
        cnaeCode: string;
        cnaeDescription: string;
        nivel1Done: boolean;
        roundsCompleted: number; // quantos rounds de nivel2 foram feitos
        maxRoundIndex: number;   // índice do round mais alto (0-based)
      }> = {};

      for (const a of answers) {
        if (!byCnae[a.cnaeCode]) {
          byCnae[a.cnaeCode] = {
            cnaeCode: a.cnaeCode,
            cnaeDescription: a.cnaeDescription || a.cnaeCode,
            nivel1Done: false,
            roundsCompleted: 0,
            maxRoundIndex: -1,
          };
        }
        if (a.level === "nivel1") {
          byCnae[a.cnaeCode].nivel1Done = true;
        }
        if (a.level === "nivel2") {
          const ri = a.roundIndex ?? 0;
          if (ri > byCnae[a.cnaeCode].maxRoundIndex) {
            byCnae[a.cnaeCode].maxRoundIndex = ri;
            byCnae[a.cnaeCode].roundsCompleted = ri + 1; // roundIndex 0 = 1 round, 1 = 2 rounds, etc.
          }
        }
      }

       // Buscar contextNotes por CNAE/round da tabela de cache de perguntas
      const cacheRows = await database
        .select({
          cnaeCode: questionnaireQuestionsCache.cnaeCode,
          roundIndex: questionnaireQuestionsCache.roundIndex,
          contextNote: questionnaireQuestionsCache.contextNote,
        })
        .from(questionnaireQuestionsCache)
        .where(
          and(
            eq(questionnaireQuestionsCache.projectId, input.projectId),
            eq(questionnaireQuestionsCache.level, "nivel2")
          )
        );
      // Montar mapa cnaeCode -> roundIndex -> contextNote
      const contextMap: Record<string, Record<number, string | null>> = {};
      for (const row of cacheRows) {
        if (!contextMap[row.cnaeCode]) contextMap[row.cnaeCode] = {};
        contextMap[row.cnaeCode][row.roundIndex] = row.contextNote ?? null;
      }
      const summary = Object.values(byCnae)
        .filter(c => c.nivel1Done)
        .sort((a, b) => b.roundsCompleted - a.roundsCompleted)
        .map(c => ({
          ...c,
          roundContextNotes: contextMap[c.cnaeCode] ?? {}, // { roundIndex: contextNote | null }
        }));
      return { summary };
    }),

  getQuestionsCache: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaeCode: z.string(),
      level: z.enum(["nivel1", "nivel2"]),
      roundIndex: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) return { questionsJson: null };
      const rows = await database
        .select()
        .from(questionnaireQuestionsCache)
        .where(
          and(
            eq(questionnaireQuestionsCache.projectId, input.projectId),
            eq(questionnaireQuestionsCache.cnaeCode, input.cnaeCode),
            eq(questionnaireQuestionsCache.level, input.level),
            eq(questionnaireQuestionsCache.roundIndex, input.roundIndex)
          )
        )
        .limit(1);
      if (rows.length === 0) return { questionsJson: null, contextNote: null };
      return { questionsJson: rows[0].questionsJson, contextNote: rows[0].contextNote ?? null };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Salvar progresso e avançar para Etapa 3
  // ─────────────────────────────────────────────────────────────────────────
  saveQuestionnaireProgress: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      allAnswers: z.array(z.object({
        cnaeCode: z.string(),
        cnaeDescription: z.string(),
        level: z.string(),
        questions: z.array(z.object({
          question: z.string(),
          answer: z.string(),
        })),
      })),
      completed: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const updateData: any = {
        questionnaireAnswers: input.allAnswers as any,
      };
      if (input.completed) {
        updateData.currentStep = 3;
        // v2.1: assessment_fase2 → diagnostico_cnae (CNAE é a 3ª camada do diagnóstico)
        updateData.status = "diagnostico_cnae";
      }
      await database
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, input.projectId));
      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 3: Gerar Briefing de Compliance
  // V60: sistema prompt com papel + temperatura 0.2 + contrato de saída
  // V61: confidence score + inconsistencias
  // V62: injeção de contexto regulatório CNAE→artigos
  // ─────────────────────────────────────────────────────────────────────────
  generateBriefing: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      allAnswers: z.array(z.object({
        cnaeCode: z.string(),
        cnaeDescription: z.string(),
        level: z.string(),
        questions: z.array(z.object({
          question: z.string(),
          answer: z.string(),
        })),
      })),
      correction: z.string().optional(),
      complement: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const answersText = input.allAnswers.map(cnae =>
        `## CNAE: ${cnae.cnaeCode} — ${cnae.cnaeDescription} (${cnae.level})\n` +
        cnae.questions.map(q => `**P:** ${q.question}\n**R:** ${q.answer}`).join("\n\n")
      ).join("\n\n---\n\n");

      const correctionContext = input.correction ? `\n\nCORREÇÃO SOLICITADA:\n${input.correction}` : "";
      const complementContext = input.complement ? `\n\nINFORMAÇÕES ADICIONAIS:\n${input.complement}` : "";

      // V65: RAG híbrido — busca artigos relevantes para o briefing (com re-ranking LLM)
      const confirmedCnaes = ((project as any).confirmedCnaes as any[]) || [];
      const cnaeCodesForRag = confirmedCnaes.length > 0
        ? confirmedCnaes.map((c: any) => c.code)
        : input.allAnswers.map(a => a.cnaeCode);
      const briefingQueryCtx = `${(project as any).description || ""} ${answersText.substring(0, 500)}`;
      const ragCtxBriefing = await retrieveArticles(cnaeCodesForRag, briefingQueryCtx, 7);
      const regulatoryContext = ragCtxBriefing.contextText;

      // G8: Montar bloco de perfil da empresa para personalização do briefing
      const projectAnyBriefing = project as any;
      const cp = projectAnyBriefing.companyProfile as Record<string, string> | null | undefined;
      const primaryCnae = confirmedCnaes[0]
        ? `${confirmedCnaes[0].code} — ${(confirmedCnaes[0] as any).description || confirmedCnaes[0].code}`
        : (input.allAnswers[0]?.cnaeCode ?? "não informado");

      // fix(briefing 2026-04-20): inclui NCMs e NBS do operationProfile no perfil da empresa,
      // para que o LLM considere alíquota zero/Imposto Seletivo/regime diferenciado por produto/serviço.
      // fix-of-fix(briefing 2026-04-20 pós-#768): operationProfile pode chegar como string em alguns
      // fluxos (B-Z13.5-001). Aplica parse defensivo antes de ler principaisProdutos/principaisServicos.
      const opProfileRaw = projectAnyBriefing.operationProfile;
      const opProfile: {
        principaisProdutos?: Array<{ ncm_code?: string; descricao?: string }>;
        principaisServicos?: Array<{ nbs_code?: string; descricao?: string }>;
      } = (() => {
        if (!opProfileRaw) return {};
        if (typeof opProfileRaw === "string") {
          try {
            const parsed = JSON.parse(opProfileRaw);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
          } catch { return {}; }
        }
        if (typeof opProfileRaw === "object" && !Array.isArray(opProfileRaw)) {
          return opProfileRaw as any;
        }
        return {};
      })();
      const produtosList = (opProfile?.principaisProdutos ?? [])
        .filter((p) => p?.ncm_code)
        .map((p) => `  - NCM ${p.ncm_code}${p.descricao ? ` — ${p.descricao}` : ""}`)
        .join("\n");
      const servicosList = (opProfile?.principaisServicos ?? [])
        .filter((s) => s?.nbs_code)
        .map((s) => `  - NBS ${s.nbs_code}${s.descricao ? ` — ${s.descricao}` : ""}`)
        .join("\n");
      const produtosBlock = produtosList ? `\n- Principais Produtos (NCM):\n${produtosList}` : "";
      const servicosBlock = servicosList ? `\n- Principais Serviços (NBS):\n${servicosList}` : "";

      const companyProfileBlock = cp
        ? `## Perfil da Empresa\n- Razão Social: ${project.name}\n- CNAE Principal: ${primaryCnae}\n- Porte: ${cp.companySize ?? "não informado"}\n- Regime Tributário: ${cp.taxRegime ?? "não informado"}\n- Faturamento Anual: ${cp.annualRevenueRange ?? "não informado"}${produtosBlock}${servicosBlock}`
        : `## Perfil da Empresa\n- Razão Social: ${project.name}\n- CNAE Principal: ${primaryCnae}\n- Porte: não informado\n- Regime Tributário: não informado${produtosBlock}${servicosBlock}`;

      // V60: Geração com retry + temperatura 0.2 + schema estruturado
      // fix(UX3 UAT 2026-04-20): contador de retries para propagar ao frontend
      let llmRetries = 0;
      const structured = await generateWithRetry(
        [
          {
            role: "system",
            content: `Você é um Consultor Sênior de Compliance Tributário com 15 anos de experiência na Reforma Tributária brasileira.
Sua função é gerar um Briefing de Compliance preciso, baseado em evidências regulatórias reais.

RESPONSABILIDADES:
1. Identificar gaps de compliance com base nas respostas do questionário
2. Citar APENAS artigos dos documentos regulatórios fornecidos no contexto
3. Calcular nível de risco geral (baixo/medio/alto/critico)
4. Identificar inconsistências nas respostas quando existirem
5. Gerar confidence score honesto com limitações declaradas

REGRA DE DETERMINISMO (fix N1b UAT 2026-04-20):
- Use APENAS critérios objetivos. Mesma entrada → mesma saída.
- Dois gaps com mesma base legal devem sempre aparecer na mesma ordem (alfabética por artigo).
- Nível de risco é função determinística: "alto" se >=2 gaps com urgência=imediata; "medio" se 1 gap imediata; "baixo" apenas se 0 gap imediata.

REGRA CRÍTICA — INCONSISTÊNCIAS vs LIMITAÇÕES (fix N2 UAT 2026-04-20):
- "inconsistencias" = APENAS contradições diretas entre duas respostas (ex: "Sim" em P1 + "Não" em P2 para temas correlatos).
- "inconsistencias" NUNCA deve incluir: "falta de informação", "ausência de resposta", "impossibilidade de aferir", "não informado", "sem dados detalhados" — TUDO ISSO vai em "confidence_score.limitacoes".
- Se a única "contradição" detectada é que o usuário não respondeu, NÃO liste como inconsistência. Liste como limitação.
- Array "inconsistencias" pode ser vazio [] — e isso é saudável.

${regulatoryContext}

${OUTPUT_CONTRACT}`,
          },
          {
            role: "user",
            content: `${companyProfileBlock}\n\nPROJETO: ${project.name}\nDESCRIÇÃO: ${(project as any).description || ""}\n\nRESPOSTAS DO QUESTIONÁRIO:\n${answersText}\n${correctionContext}\n${complementContext}

Gere o Briefing estruturado em JSON:
{
  "nivel_risco_geral": "alto",
  "resumo_executivo": "...",
  "principais_gaps": [{"gap": "...", "causa_raiz": "...", "evidencia_regulatoria": "Art. X LC 214/2025", "urgencia": "imediata"}],
  "oportunidades": ["..."],
  "recomendacoes_prioritarias": ["..."],
  "inconsistencias": [{"pergunta_origem": "...", "resposta_declarada": "...", "contradicao_detectada": "...", "impacto": "alto"}],
  "confidence_score": {"nivel_confianca": 85, "limitacoes": ["..."], "recomendacao": "Revisão por advogado tributarista recomendada"}
}`,
          },
        ],
        BriefingStructuredSchema,
        // fix(T1 UAT 2026-04-20): temperatura 0 para máximo determinismo. Variabilidade
        // observada com T=0.2 (2→1→2 inconsistências em gerações consecutivas) era
        // inaceitável no contexto jurídico. Com T=0, mesma entrada → (quase) mesma saída.
        // fix(UX3): onRetry registra tentativas para propagar ao frontend.
        {
          temperature: 0,
          context: "generateBriefing",
          onRetry: (attempt: number, err: string) => {
            llmRetries = attempt;
            console.warn(`[generateBriefing] retry ${attempt}: ${err.substring(0, 200)}`);
          },
        }
      );

      // fix(Fix extra UAT 2026-04-20): reclassifica impacto das inconsistências via heurística
      // determinística server-side, tirando a decisão do LLM. Garante consistência:
      // mesma contradição → mesmo impacto (sempre).
      if (Array.isArray(structured.inconsistencias)) {
        structured.inconsistencias = structured.inconsistencias.map((inc: any) => ({
          ...inc,
          impacto: classifyInconsistenciaImpacto(inc),
        }));
      }

      // Converter estruturado para Markdown (compatibilidade com UI existente)
      const briefingMarkdown = buildBriefingMarkdown(structured);

      // Salvar briefing no banco (markdown + estruturado)
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({
          briefingContentV3: briefingMarkdown as any,
          briefingContent: briefingMarkdown as any,
          briefingStructured: JSON.stringify(structured) as any,
          currentStep: 3,
        } as any)
        .where(eq(projects.id, input.projectId));

      return { briefing: briefingMarkdown, structured, llmRetries };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 3: Aprovar Briefing
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * fix(B2 UAT 2026-04-20): permite marcar uma inconsistência do briefing como resolvida
   * sem regenerar o briefing via LLM. Atualiza apenas o campo JSON briefingStructured.
   *
   * Motivação: quando o usuário edita manualmente o markdown corrigindo a inconsistência,
   * a query `getBriefingInconsistencias` continuava mostrando a inconsistência antiga
   * porque lê de briefingStructured (que o approveBriefing não tocava).
   *
   * Zero mudança de schema — apenas UPDATE em coluna JSON existente.
   */
  dismissInconsistencia: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      perguntaOrigem: z.string(),  // chave para identificar qual inconsistência remover
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const userId = ctx.user.id;
      const isOwner = (project as any).clientId === userId || (project as any).createdById === userId;
      const isTeam = ["equipe_solaris", "advogado_senior", "advogado_junior"].includes(ctx.user.role);
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });

      const bs = (project as any).briefingStructured;
      if (!bs) {
        return { success: false, reason: "Briefing estruturado não existe para este projeto." };
      }

      let parsed: any;
      try {
        parsed = typeof bs === "string" ? JSON.parse(bs) : bs;
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "briefingStructured JSON inválido" });
      }

      const before: any[] = Array.isArray(parsed?.inconsistencias) ? parsed.inconsistencias : [];
      const after = before.filter((i: any) => i?.pergunta_origem !== input.perguntaOrigem);

      if (after.length === before.length) {
        return { success: false, reason: "Inconsistência não encontrada (já resolvida ou removida?)." };
      }

      const updatedStructured = { ...parsed, inconsistencias: after };

      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await database
        .update(projects)
        .set({ briefingStructured: JSON.stringify(updatedStructured) as any } as any)
        .where(eq(projects.id, input.projectId));

      // Audit trail (best-effort)
      try {
        const { logAudit } = await import('./routers-audit');
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? ctx.user.email ?? "unknown",
          projectId: input.projectId,
          entityType: "project",
          entityId: input.projectId,
          action: "update",
          metadata: {
            event: "inconsistencia_dismissed",
            pergunta_origem: input.perguntaOrigem,
            motivo: input.motivo ?? null,
            inconsistencias_antes: before.length,
            inconsistencias_depois: after.length,
          },
        });
      } catch (auditErr) {
        console.error("[dismissInconsistencia] audit log falhou:", auditErr);
      }

      return {
        success: true,
        inconsistenciasRestantes: after.length,
      };
    }),

  approveBriefing: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      briefingContent: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      // BUG-UAT-09: fluxo correto é diagnostico_cnae → briefing → matriz_riscos
      // approveBriefing aceita tanto 'diagnostico_cnae' (primeira aprovação) quanto 'briefing' (re-aprovação)
      const { assertValidTransition } = await import('./flowStateMachine');
      // BUG-UAT-09 fix (DEC-produto): transição atômica diagnostico_cnae → briefing → matriz_riscos
      // Dois asserts garantem integridade da state machine; um único db.update = UX limpa (1 clique)
      // 'briefing' como status intermediário permanece válido para retrocesso (matriz_riscos → briefing)
      assertValidTransition(project.status, 'briefing');       // valida diagnostico_cnae → briefing
      assertValidTransition('briefing', 'matriz_riscos');      // valida briefing → matriz_riscos
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const previousStatus = project.status;
      await database
        .update(projects)
        .set({ currentStep: 4, status: "matriz_riscos", briefingContentV3: input.briefingContent as any, briefingContent: input.briefingContent as any } as any)
        .where(eq(projects.id, input.projectId));

      // fix(G2 UAT 2026-04-20): audit trail da aprovação do briefing.
      // Usa tabela auditLog (camelCase) com entityType='project' + metadata indicando
      // event=briefing_approved. Não altera schema — tabela já aceita 'project' no enum.
      try {
        const { logAudit } = await import('./routers-audit');
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? ctx.user.email ?? "unknown",
          projectId: input.projectId,
          entityType: "project",
          entityId: input.projectId,
          action: "status_change",
          changes: {
            status: { old: previousStatus, new: "matriz_riscos" },
            currentStep: { old: (project as any).currentStep ?? null, new: 4 },
          },
          metadata: {
            event: "briefing_approved",
            briefingLength: input.briefingContent.length,
            editedBeforeApproval: input.briefingContent !== ((project as any).briefingContentV3 ?? ""),
          },
        });
      } catch (auditErr) {
        // Audit é best-effort — nunca bloqueia a aprovação.
        console.error("[approveBriefing] audit log falhou:", auditErr);
      }

      return { success: true, nextStep: 4 };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 4: Gerar Matrizes de Riscos
  // V60: papel definido + temperatura 0.2 + retry
  // V61: severidade_score numérico + scoring global calculado no servidor
  // V62: injeção de contexto regulatório
  // ─────────────────────────────────────────────────────────────────────────
  generateRiskMatrices: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      briefingContent: z.string(),
      area: z.enum(["contabilidade", "negocio", "ti", "juridico"]).optional(),
      adjustment: z.string().optional(),
    }))
    .mutation(async ({ input: _input }) => {
      // ── Sprint Z-12 · Hot Swap Final (ADR-0022 · feat/z12-hot-swap-final) ──────────────
      // Endpoint legado desativado. O frontend usa useNewRiskEngine=true → /risk-dashboard-v4
      // que chama risksV4.generateRisks (computeRiskMatrix determinístico, sem LLM).
      // Rollback: git revert <commit-hash>
      void _input; // supress TS unused-variable
      throw new TRPCError({
        code: "METHOD_NOT_SUPPORTED",
        message:
          "[Z-12] Endpoint legado desativado. Use risksV4.generateRisks — engine determinístico ativo em /risk-dashboard-v4.",
      });
      /* ── LEGADO PRESERVADO PARA ROLLBACK ─────────────────────────────────────────────
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const areas = input.area ? [input.area] : ["contabilidade", "negocio", "ti", "juridico"];
      const matrices: Record<string, any[]> = {};
      const areaNames: Record<string, string> = {
        contabilidade: "Contabilidade e Fiscal",
        negocio: "Áreas de Negócio e Operações",
        ti: "Tecnologia da Informação e Sistemas",
        juridico: "Advocacia Tributária e Jurídico",
      };

      // G7: RAG separado por área — queries específicas para cada domínio de risco
      const confirmedCnaes = ((project as any).confirmedCnaes as any[]) || [];
      const cnaeCodesMatrix = confirmedCnaes.map((c: any) => c.code);
      const areaRagQueries: Record<string, string> = {
        contabilidade: "apuração CBS IBS crédito fiscal escrituração contábil regime de competência não cumulatividade",
        negocio: "operações comerciais cadeia produtiva marketplace distribuição fornecedores clientes contratos",
        ti: "sistemas ERP nota fiscal eletrônica integração tecnologia automação SPED obrigações acessórias",
        juridico: "responsabilidade tributária sanção penalidade confissão de dívida prazo decadencial auto de infração",
      };

      // V70.3 + G7: Paralelizar as 4 áreas com Promise.all + RAG específico por área
      const matrixResults = await Promise.all(areas.map(async (area) => {
        const areaQuery = `${input.briefingContent?.substring(0, 300) ?? ""} ${areaRagQueries[area] ?? ""}`;
        const ragCtxArea = await retrieveArticlesFast(cnaeCodesMatrix, areaQuery, 7);
        const regulatoryContext = ragCtxArea.contextText;
        const adjustmentContext = input.adjustment ? `\n\nAJUSTE SOLICITADO: ${input.adjustment}` : "";

        const result = await generateWithRetry(
          [
            {
              role: "system",
              content: `Você é um Auditor de Riscos Regulatórios especializado na Reforma Tributária brasileira (LC 214/2025).
Sua função é identificar e quantificar riscos de compliance para a área de ${areaNames[area]}.

REGRAS OBRIGATÓRIAS:
1. Cada risco deve ter causa_raiz identificada
2. Cada risco deve ter evidencia_regulatoria (artigo específico do contexto fornecido)
3. Cada risco deve ter fonte_risco no formato "LC 214/2025, Art. X" ou "EC 132/2023, Art. Y" (use os artigos do contexto)
4. Cada risco deve ter fonte_risco_tipo: use "regulatorio" se o risco deriva de artigo legislativo citado no contexto RAG, "solaris" se deriva de orientação jurídica SOLARIS, "ia_gen" se é inferência geral do modelo
5. severidade_score deve ser numérico: Baixa=1-3, Média=4-6, Alta=7-8, Crítica=9
6. Gere entre 5 e 10 riscos específicos para a área
7. Nunca invente artigos — use apenas os fornecidos no contexto

${regulatoryContext}

${OUTPUT_CONTRACT}`,
            },
            {
              role: "user",
              content: `BRIEFING DO PROJETO:
${input.briefingContent}

ÁREA: ${areaNames[area]}
${adjustmentContext}

Formato:
{"risks": [{"id": "r1", "evento": "...", "causa_raiz": "...", "evidencia_regulatoria": "Art. X LC 214/2025", "fonte_risco": "LC 214/2025, Art. X", "fonte_risco_tipo": "regulatorio", "probabilidade": "Alta", "impacto": "Alto", "severidade": "Crítica", "severidade_score": 9, "plano_acao": "..."}]}`,
            },
          ],
          RisksResponseSchema,
          { temperature: 0.2, context: `generateRiskMatrices:${area}` }
        );

        // G9: safeParse adicional para capturar falhas estruturais sem propagar exceção
        const validation = validateRagOutput(RisksResponseSchema, result, `generateRiskMatrices:${area}:safeParse`);
        const finalRisks = validation.success ? validation.data.risks : result.risks;
        // G10 + DEC-004: log de auditoria de fonte_risco
        const fontes = finalRisks.map((r: any) => r.fonte_risco ?? "fonte não identificada");
        console.log(
          `[AUDIT-FONTE-RISCO] projectId=${input.projectId} area=${area} ts=${new Date().toISOString()} fontes=${JSON.stringify(fontes)}`
        );
        // G11: calcular fundamentacao deterministicamente por item de risco
        // Guard defensivo: ragCtxArea pode ser array (mock) ou objeto { articles, contextText }
        const _riskArticles: any[] = Array.isArray(ragCtxArea)
          ? ragCtxArea
          : (ragCtxArea as any).articles ?? [];
        const risksComFundamentacao = finalRisks.map((risco: any) => ({
          ...risco,
          fundamentacao: calcularFundamentacao(
            _riskArticles,
            risco.fonte_risco ?? "fonte não identificada"
          ),
        }));
        return { area, risks: risksComFundamentacao };
      }));

      // Montar o objeto matrices a partir dos resultados paralelos
      for (const { area, risks } of matrixResults) {
        matrices[area] = risks;
      }

      // V61: Calcular scoring global no servidor (determinístico)
      const allRisks = Object.values(matrices).flat();
      const faturamentoAnual = (project as any).faturamentoAnual as number | undefined;
      const scoringData = calculateGlobalScore(allRisks, faturamentoAnual);

      // G11: calcular matriz_metadata agregando fundamentacoes de todos os itens
      const todasFundamentacoes = allRisks
        .map((r: any) => r.fundamentacao)
        .filter(Boolean);
      const matrizMetadata = calcularMatrizMetadata(todasFundamentacoes);
      console.log(
        `[AUDIT-MATRIZ-METADATA] projectId=${input.projectId} ts=${new Date().toISOString()} metadata=${JSON.stringify(matrizMetadata)}`
      );

      // Salvar scoring no banco
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ scoringData: scoringData as any } as any)
        .where(eq(projects.id, input.projectId));

      return { matrices, scoringData, matriz_metadata: matrizMetadata };
      ── FIM DO BLOCO LEGADO ── */
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 4: Aprovar todas as matrizes
  // ─────────────────────────────────────────────────────────────────────────
  approveMatrices: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      matrices: z.record(z.string(), z.array(z.any())),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      // BUG-UAT-08: assertValidTransition universal
      const { assertValidTransition } = await import('./flowStateMachine');
      assertValidTransition(project.status, 'plano_acao');
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ currentStep: 5, status: "plano_acao", riskMatricesDataV3: input.matrices as any, riskMatricesData: input.matrices as any } as any)
        .where(eq(projects.id, input.projectId));
      return { success: true, nextStep: 5 };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 5: Gerar Plano de Ação
  // V60: papel definido + temperatura 0.2 + retry
  // V62: injeção de contexto regulatório
  // ─────────────────────────────────────────────────────────────────────────
  generateActionPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      matrices: z.record(z.string(), z.array(z.any())),
      area: z.enum(["contabilidade", "negocio", "ti", "juridico"]).optional(),
      adjustment: z.string().optional(),
      // V70.2: Briefing context para enriquecer o plano de ação
      briefingContent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const areas = input.area ? [input.area] : ["contabilidade", "negocio", "ti", "juridico"];
      const plans: Record<string, any[]> = {};
      const areaNames: Record<string, string> = {
        contabilidade: "Contabilidade e Fiscal",
        negocio: "Áreas de Negócio e Operações",
        ti: "Tecnologia da Informação e Sistemas",
        juridico: "Advocacia Tributária e Jurídico",
      };

      // V70.2: Buscar respostas do questionário do banco para enriquecer o prompt
      const database = await db.getDb();
      let questionnaireContext = "";
      if (database) {
        const answers = await database
          .select()
          .from(questionnaireAnswersV3)
          .where(eq(questionnaireAnswersV3.projectId, input.projectId));
        if (answers.length > 0) {
          // Agrupar por CNAE e formatar como texto legível
          const byCnae: Record<string, typeof answers> = {};
          for (const a of answers) {
            if (!byCnae[a.cnaeCode]) byCnae[a.cnaeCode] = [];
            byCnae[a.cnaeCode].push(a);
          }
          questionnaireContext = Object.entries(byCnae).map(([cnae, ans]) =>
            `CNAE ${cnae}:\n` + (ans as any[]).map((a: any) => `  P: ${a.questionText}\n  R: ${a.answer}`).join("\n")
          ).join("\n\n");
        }
      }

      // V70.2: CNAEs confirmados com descrições
      const confirmedCnaes = ((project as any).confirmedCnaes as any[]) || [];
      const cnaeCodesAction = confirmedCnaes.map((c: any) => c.code);
      const cnaeDescriptions = confirmedCnaes.map((c: any) => `${c.code} — ${c.description || c.code}`).join(", ");

      // V70.3: Paralelizar as 4 áreas com Promise.all (reduz ~3min sequencial para ~45s paralelo)
      const areaResults = await Promise.all(areas.map(async (area) => {
        const areaRisks = input.matrices[area] || [];
        if (areaRisks.length === 0) {
          return { area, tasks: [] as any[] };
        }
        const adjustmentContext = input.adjustment ? `\n\nAJUSTE SOLICITADO: ${input.adjustment}` : "";

        // V70.2: RAG específico por área (query inclui nome da área + top riscos)
        const areaQuery = `${areaNames[area]} ${cnaeDescriptions} ${areaRisks.slice(0, 3).map((r: any) => r.evento || "").join(" ")}`;
        const ragCtxArea = await retrieveArticlesFast(cnaeCodesAction, areaQuery, 10);
        const regulatoryContext = ragCtxArea.contextText;

        // V70.2: Briefing context (resumo dos gaps identificados)
        const briefingCtx = input.briefingContent
          ? `\n\nBRIEFING DO PROJETO (gaps identificados):\n${input.briefingContent.substring(0, 1500)}`
          : "";

        const result = await generateWithRetry(
          [
            {
              role: "system",
              content: `Você é um Gestor Sênior de Compliance Tributário especializado na Reforma Tributária brasileira (LC 214/2025, LC 224/2025, LC 227/2025).

Sua missão é criar um Plano de Ação CONCRETO, ESPECÍFICO e EXECUTÁVEL para a área de ${areaNames[area]}.

CONTEXTO DO PROJETO:
- Empresa: ${project.name}
- CNAEs analisados: ${cnaeDescriptions}
- Faturamento anual: ${(project as any).faturamentoAnual ? `R$ ${((project as any).faturamentoAnual / 1000000).toFixed(1)}M` : "não informado"}

RESPOSTAS DO QUESTIONÁRIO (o que o cliente declarou):
${questionnaireContext || "Não disponível"}
${briefingCtx}

LEGISLAÇÃO APLICÁVEL (use APENAS estes artigos como evidência):
${regulatoryContext}

REGRAS CRÍTICAS — NUNCA VIOLE:
1. PROIBIDO gerar tarefas genéricas como "Revisar processos" ou "Avaliar impactos" sem especificar O QUE revisar e QUAL impacto
2. OBRIGATÓRIO: cada tarefa deve citar a RESPOSTA ESPECÍFICA do questionário que originou o gap (campo objetivo_diagnostico)
3. OBRIGATÓRIO: cada tarefa deve citar o ARTIGO ESPECÍFICO da legislação fornecida (campo evidencia_regulatoria)
4. OBRIGATÓRIO: o campo descricao deve ter NO MÍNIMO 3 ações concretas numeradas (ex: "1. Mapear... 2. Contratar... 3. Implementar...")
5. OBRIGATÓRIO: responsavel_sugerido deve ser um cargo específico (ex: "Controller Fiscal", "Gerente de TI", "Advogado Tributário")
6. OBRIGATÓRIO: prazo_sugerido deve refletir a severidade do risco (riscos críticos = 30 dias, altos = 60 dias, médios = 90 dias)
7. Gere entre 4 e 10 tarefas por área, priorizando por severidade
8. campo cnae_origem: informe o CNAE específico que originou a tarefa
9. campo gap_especifico: descreva o gap de compliance em uma frase objetiva
10. campo acao_concreta: descreva a ação imediata (primeira coisa a fazer)
${OUTPUT_CONTRACT}`,
            },
            {
              role: "user",
              content: `ÁREA: ${areaNames[area]}

RISCOS IDENTIFICADOS NA MATRIZ (ordenados por severidade):
${JSON.stringify(areaRisks.sort((a: any, b: any) => (b.severidade_score || 0) - (a.severidade_score || 0)), null, 2)}
${adjustmentContext}

Gere o plano de ação em JSON:
{"tasks": [
  {
    "id": "t1",
    "titulo": "[Verbo de ação] + [objeto específico] + [contexto CNAE]",
    "descricao": "1. [Ação concreta 1]\\n2. [Ação concreta 2]\\n3. [Ação concreta 3]",
    "area": "${area}",
    "prazo_sugerido": "30 dias",
    "prioridade": "Alta",
    "responsavel_sugerido": "[Cargo específico]",
    "objetivo_diagnostico": "Gap identificado: [resposta do questionário que revelou o problema]",
    "evidencia_regulatoria": "Art. X, \u00a7 Y da LC 214/2025",
    "cnae_origem": "${cnaeCodesAction[0] || ""}",
    "gap_especifico": "[Descrição objetiva do gap de compliance]",
    "acao_concreta": "[Primeira ação imediata a executar]"
  }
]}`,
            },
          ],
          TasksResponseSchema,
          { temperature: 0.15, context: `generateActionPlan:${area}` }
        );

        // B2 — G12: log de auditoria de fonte_acao por área
        // Guard defensivo: ragCtxArea pode ser array (mock) ou objeto { articles, contextText }
        const _articles: any[] = Array.isArray(ragCtxArea)
          ? ragCtxArea
          : (ragCtxArea as any).articles ?? [];
        const _firstArticle = _articles[0];
        const fonteAcaoBase = _firstArticle
          ? {
              lei: _firstArticle.lei ?? "não identificado",
              artigo: _firstArticle.artigo ?? "não identificado",
              anchor_id: _firstArticle.anchorId ?? "",
              tipo_obrigacao: "recomendacao",
              descricao: `Chunk RAG: ${_firstArticle.anchorId ?? "sem anchor"}`,
            }
          : undefined;
        console.log(`[AUDIT-FONTE-ACAO] area=${area} chunks=${_articles.length} anchor_id=${fonteAcaoBase?.anchor_id ?? "none"}`);
        return {
          area,
          tasks: result.tasks.map((t: any) => ({
            ...t,
            status: "nao_iniciado",
            progress: 0,
            startDate: null,
            endDate: null,
            responsible: null,
            comments: [],
            notifications: { beforeDays: 7, onStatusChange: true, onProgressUpdate: false, onComment: false },
            // B2 — G12: rastreabilidade normativa da ação
            fonte_acao: t.fonte_acao ?? fonteAcaoBase,
          })),
        };
      }));

      // Montar o objeto plans a partir dos resultados paralelos
      for (const { area, tasks } of areaResults) {
        plans[area] = tasks;
      }

      return { plans };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 5: Atualizar tarefa do plano de ação
  // ─────────────────────────────────────────────────────────────────────────
  updateTask: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      area: z.enum(["contabilidade", "negocio", "ti", "juridico"]),
      taskId: z.string(),
      updates: z.object({
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        status: z.enum(["nao_iniciado", "em_andamento", "parado", "concluido"]).optional(),
        progress: z.number().min(0).max(100).optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        responsible: z.string().nullable().optional(),
        notifications: z.object({
          beforeDays: z.number().optional(),
          onStatusChange: z.boolean().optional(),
          onProgressUpdate: z.boolean().optional(),
          onComment: z.boolean().optional(),
        }).optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // ADR-005 F-02A: leitura via adaptador centralizado
      const diagSource = await getDiagnosticSource(input.projectId);
      assertFlowVersion(diagSource, "v3", "fluxoV3.updateTask");
      const currentPlans = (diagSource.actionPlansDataV3 as Record<string, any[]>) || {};
      const areaTasks = currentPlans[input.area] || [];
      const currentTask = areaTasks.find((t: any) => t.id === input.taskId);
      const updatedTasks = areaTasks.map((task: any) =>
        task.id === input.taskId ? { ...task, ...input.updates } : task
      );
      currentPlans[input.area] = updatedTasks;
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ actionPlansData: currentPlans as any } as any)
        .where(eq(projects.id, input.projectId));

      if (currentTask) {
        const histBase = {
          projectId: input.projectId,
          taskId: input.taskId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Usuário",
        };
        const fieldMap: Array<{ key: string; eventType: any; label: string }> = [
          { key: "status",      eventType: "status",      label: "status" },
          { key: "responsible", eventType: "responsavel", label: "responsável" },
          { key: "endDate",     eventType: "prazo",        label: "prazo" },
          { key: "progress",    eventType: "progresso",    label: "progresso" },
          { key: "titulo",      eventType: "titulo",       label: "título" },
        ];
        const ups = input.updates as Record<string, any>;
        const promises: Promise<any>[] = [];
        for (const { key, eventType, label } of fieldMap) {
          if (ups[key] !== undefined && ups[key] !== currentTask[key]) {
            promises.push(db.insertTaskHistory({
              ...histBase,
              eventType,
              field: label,
              oldValue: currentTask[key] != null ? String(currentTask[key]) : null,
              newValue: ups[key] != null ? String(ups[key]) : null,
            }));
          }
        }
        if (ups.notifications !== undefined) {
          promises.push(db.insertTaskHistory({
            ...histBase,
            eventType: "notificacao",
            field: "notificações",
            oldValue: currentTask.notifications ? JSON.stringify(currentTask.notifications) : null,
            newValue: JSON.stringify({ ...currentTask.notifications, ...ups.notifications }),
          }));
        }
        Promise.allSettled(promises).catch(() => {});
      }
      return { success: true };
    }),

  // RF-HIST: Consultar histórico de alterações de uma tarefa
  getTaskHistory: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      taskId: z.string(),
    }))
    .query(async ({ input }) => {
      return db.getTaskHistory(input.taskId, input.projectId);
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 5: Auto-save — salva rascunho do plano sem alterar status/currentStep
  // Chamado automaticamente após geração pela IA para garantir persistência
  // ─────────────────────────────────────────────────────────────────────────
  saveDraftActionPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      plans: z.record(z.string(), z.array(z.any())),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      // Apenas persiste actionPlansData — não altera status nem currentStep
      await database
        .update(projects)
        .set({ actionPlansDataV3: input.plans as any, actionPlansData: input.plans as any } as any)
        .where(eq(projects.id, input.projectId));
      return { success: true };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // ETAPA 5: Aprovar plano de ação + gerar decisão (V63)
  // ─────────────────────────────────────────────────────────────────────────
  approveActionPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      plans: z.record(z.string(), z.array(z.any())),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      // BUG-UAT-08: assertValidTransition universal
      const { assertValidTransition } = await import('./flowStateMachine');
      assertValidTransition(project.status, 'aprovado');
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Salvar plano aprovado
      await database
        .update(projects)
        .set({ currentStep: 5, status: "aprovado", actionPlansDataV3: input.plans as any, actionPlansData: input.plans as any } as any)
        .where(eq(projects.id, input.projectId));

      // fix(z22) Wave A.2+B EX-2: chamada fire-and-forget persistCpieScoreForProject removida.
      // Original declarava "pipeline não afetado" — CPIE v3 (Compliance Dashboard on-demand)
      // substitui snapshot persistido do CPIE-B. Step 7 ConsolidacaoV4 preserva scoringData.

      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // V63: Gerar Motor de Decisão Explícito
  // Consolida briefing + matrizes + scoring → veredito final
  // ─────────────────────────────────────────────────────────────────────────
  generateDecision: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // ADR-005 F-02A: leitura via adaptador centralizado
      const diagSource = await getDiagnosticSource(input.projectId);
      assertFlowVersion(diagSource, "v3", "fluxoV3.generateDecision");
      const briefingContent = diagSource.briefingContentV3;
      const riskMatricesData = diagSource.riskMatricesDataV3 as Record<string, any[]> | null;
      const scoringData = (project as any).scoringData as any | null;
      const confirmedCnaes = ((project as any).confirmedCnaes as any[]) || [];

      if (!briefingContent || !riskMatricesData) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Briefing e matrizes de risco devem estar gerados antes da decisão",
        });
      }

      // Resumo dos riscos críticos
      const allRisks = Object.values(riskMatricesData).flat();
      const riscoCriticos = allRisks.filter((r: any) => r.severidade === "Crítica");
      const riscoAltos = allRisks.filter((r: any) => r.severidade === "Alta");

      const riscosSummary = [
        ...riscoCriticos.slice(0, 3).map((r: any) => `[CRÍTICO] ${r.evento}`),
        ...riscoAltos.slice(0, 2).map((r: any) => `[ALTO] ${r.evento}`),
      ].join("\n");

      // V65: RAG híbrido — busca artigos para decisão final (com re-ranking LLM para máxima precisão)
      const cnaeCodesDecisao = confirmedCnaes.map((c: any) => c.code);
      const ragCtxDecisao = await retrieveArticles(cnaeCodesDecisao, `${project.name} ${riscosSummary}`, 5);
      const regulatoryContext = ragCtxDecisao.contextText;

      const result = await generateWithRetry(
        [
          {
            role: "system",
            content: `Você é um Sócio Sênior de Tributação com 20 anos de experiência em Reforma Tributária brasileira.
Sua função é emitir o VEREDITO FINAL do diagnóstico: uma decisão clara, executável e fundamentada.

RESPONSABILIDADES:
1. Consolidar todos os dados do diagnóstico em UMA decisão principal
2. Definir prazo realista baseado na urgência dos riscos
3. Quantificar o risco de inação de forma concreta
4. Gerar o "momento wow" — um insight que o cliente não esperava
5. Fundamentar a decisão em artigos reais (use apenas os do contexto)

${regulatoryContext}

${OUTPUT_CONTRACT}`,
          },
          {
            role: "user",
            content: `PROJETO: ${project.name}
SCORE GLOBAL: ${scoringData?.score_global ?? "N/A"}/100 (${scoringData?.nivel ?? "N/A"})
IMPACTO ESTIMADO: ${scoringData?.impacto_estimado ?? "N/A"}

PRINCIPAIS RISCOS:
${riscosSummary || "Nenhum risco crítico identificado"}

BRIEFING (resumo):
${briefingContent.substring(0, 800)}...

Gere o veredito final em JSON:
{
  "decisao_recomendada": {
    "acao_principal": "Ação clara e específica que deve ser tomada imediatamente",
    "prazo_dias": 60,
    "risco_se_nao_fazer": "Consequência concreta e quantificada de não agir",
    "prioridade": "critica",
    "proximos_passos": ["Passo 1 específico", "Passo 2 específico", "Passo 3 específico"],
    "momento_wow": "Insight inesperado que surpreende o cliente — ex: oportunidade de redução de carga ou risco oculto",
    "fundamentacao_legal": "Art. X LC 214/2025 — base legal da decisão"
  }
}`,
          },
        ],
        DecisaoResponseSchema,
        { temperature: 0.35, context: "generateDecision" } // Temperatura ligeiramente maior para insight criativo
      );

      // Salvar decisão no banco
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ decisaoData: result.decisao_recomendada as any } as any)
        .where(eq(projects.id, input.projectId));

      return { decisao: result.decisao_recomendada };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // PÁGINA DE DETALHES: Resumo completo do projeto
  // ─────────────────────────────────────────────────────────────────────────
  getProjectSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // ADR-005 F-02A: leitura via adaptador centralizado
      const diagSource = await getDiagnosticSource(input.projectId);

      const answers = diagSource.questionnaireAnswersV3 ?? [];

      const actionPlansData = diagSource.actionPlansDataV3 as Record<string, any[]> | null;
      let totalTasks = 0;
      let completedTasks = 0;
      let tasksByArea: { area: string; count: number; completed: number }[] = [];
      if (actionPlansData) {
        for (const [area, tasks] of Object.entries(actionPlansData)) {
          const activeTasks = (tasks as any[]).filter(t => !t.deleted);
          const done = activeTasks.filter(t => t.status === "concluido").length;
          totalTasks += activeTasks.length;
          completedTasks += done;
          if (activeTasks.length > 0) tasksByArea.push({ area, count: activeTasks.length, completed: done });
        }
      }

      const riskMatricesData = diagSource.riskMatricesDataV3 as Record<string, any[]> | null;
      let totalRisks = 0;
      if (riskMatricesData) {
        for (const risks of Object.values(riskMatricesData)) {
          totalRisks += (risks as any[]).length;
        }
      }

      const confirmedCnaes = ((project as any).confirmedCnaes as any[]) || [];

      return {
        id: project.id,
        name: project.name,
        description: (project as any).description,
        status: project.status,
        currentStep: (project as any).currentStep ?? 1,
        clientId: project.clientId,
        planPeriodMonths: project.planPeriodMonths,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        confirmedCnaes,
        totalAnswers: answers.length,
        totalTasks,
        completedTasks,
        totalRisks,
        tasksByArea,
        hasBriefing: !!diagSource.briefingContentV3,
        hasRiskMatrices: !!riskMatricesData && Object.keys(riskMatricesData).length > 0,
        hasActionPlan: !!actionPlansData && Object.keys(actionPlansData).length > 0,
        scoringData: (project as any).scoringData ?? null,   // V61
        decisaoData: (project as any).decisaoData ?? null,   // V63
        // V64: inconsistencias do briefing estruturado
        inconsistencias: (() => {
          const bs = (project as any).briefingStructured;
          if (!bs) return [];
          try {
            const parsed = typeof bs === "string" ? JSON.parse(bs) : bs;
            return Array.isArray(parsed?.inconsistencias) ? parsed.inconsistencias : [];
          } catch { return []; }
        })(),
      };
    }),

  // V64: Buscar inconsistencias do briefing de um projeto
  getBriefingInconsistencias: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // Verificar acesso: dono, criador ou membro da equipe Solaris/advogado
      const userId = ctx.user.id;
      const isOwner = project.clientId === userId || (project as any).createdById === userId;
      const isTeam = ctx.user.role === "equipe_solaris" || ctx.user.role === "advogado_senior" || ctx.user.role === "advogado_junior";
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });

      const bs = (project as any).briefingStructured;
      if (!bs) return { inconsistencias: [], totalCount: 0, hasAlerts: false, confidenceScore: null };

      try {
        const parsed = typeof bs === "string" ? JSON.parse(bs) : bs;
        const inconsistencias = Array.isArray(parsed?.inconsistencias) ? parsed.inconsistencias : [];
        // fix(UX1 UAT 2026-04-20): expor confidence_score para barra visual
        const confidenceScore = parsed?.confidence_score ?? null;
        return {
          inconsistencias,
          totalCount: inconsistencias.length,
          hasAlerts: inconsistencias.length > 0,
          // Contagem por impacto
          countByImpact: {
            alto: inconsistencias.filter((i: any) => i.impacto === "alto").length,
            medio: inconsistencias.filter((i: any) => i.impacto === "medio").length,
            baixo: inconsistencias.filter((i: any) => i.impacto === "baixo").length,
          },
          confidenceScore,
        };
      } catch {
        return { inconsistencias: [], totalCount: 0, hasAlerts: false, confidenceScore: null };
      }
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // MODO REVISÃO: Validar acesso ao projeto para edição de respostas
  // Usado quando o usuário retorna do Briefing para corrigir inconsistências.
  // As respostas individuais são atualizadas via saveAnswer (já existente).
  // O status/currentStep do projeto NÃO é alterado.
  // ─────────────────────────────────────────────────────────────────────────
  checkRevisionAccess: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = project.clientId === userId || (project as any).createdById === userId;
      const isTeam = ctx.user.role === "equipe_solaris" || ctx.user.role === "advogado_senior" || ctx.user.role === "advogado_junior";
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });
      return {
        canEdit: true,
        projectId: input.projectId,
        status: (project as any).status,
        currentStep: (project as any).currentStep,
      };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // v2.1 T3: Consolidar diagnóstico das 3 camadas em payload para briefing
  // ───────────────────────────────────────────────────────────────────────────
  getAggregatedDiagnostic: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = (project as any).clientId === userId || (project as any).createdById === userId;
      const isTeam = ["equipe_solaris", "advogado_senior", "advogado_junior"].includes(ctx.user.role);
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });

      const p = project as any;
      const diagnosticStatus = p.diagnosticStatus ?? {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };

      // Buscar respostas do questionário CNAE (camada 3)
      const database = await db.getDb();
      let cnaeAnswers: any[] = [];
      if (database) {
        const rawAnswers = await database
          .select()
          .from(questionnaireAnswersV3)
          .where(eq(questionnaireAnswersV3.projectId, input.projectId));

        // Agrupar por CNAE
        const byCnae: Record<string, { cnaeCode: string; cnaeDescription: string; level: string; questions: { question: string; answer: string }[] }> = {};
        for (const a of rawAnswers) {
          const key = `${a.cnaeCode}-${a.level}`;
          if (!byCnae[key]) {
            byCnae[key] = {
              cnaeCode: a.cnaeCode,
              cnaeDescription: a.cnaeDescription ?? a.cnaeCode,
              level: a.level,
              questions: [],
            };
          }
          byCnae[key].questions.push({
            question: a.questionText,
            answer: a.answerValue,
          });
        }
        cnaeAnswers = Object.values(byCnae);
      }

      // Consolidar as 3 camadas base
      const baseLayers = consolidateDiagnosticLayers({
        companyProfile: p.companyProfile,
        operationProfile: p.operationProfile,
        taxComplexity: p.taxComplexity,
        financialProfile: p.financialProfile,
        governanceProfile: p.governanceProfile,
        cnaeAnswers,
      });

      // ADR-0011: Camadas 4+5 — Q.Produtos (NCM) e Q.Serviços (NBS) com fallback V1/V2
      const { productAnswers: resolvedProduct, serviceAnswers: resolvedService } = resolveProjectAnswers(p);
      const productServiceLayers = buildProductServiceLayers(resolvedProduct, resolvedService);
      const aggregatedDiagnosticAnswers = [...baseLayers, ...productServiceLayers];

      const progress = getDiagnosticProgress(diagnosticStatus);
      const nextLayer = getNextDiagnosticLayer(diagnosticStatus);
      const isComplete = isDiagnosticComplete(diagnosticStatus);

      return {
        projectId: input.projectId,
        diagnosticStatus,
        aggregatedDiagnosticAnswers,
        progress,
        nextLayer,
        isComplete,
        // Metadados para o frontend
        meta: {
          totalLayers: 3 + productServiceLayers.length,
          completedLayers: Object.values(diagnosticStatus).filter(s => s === "completed").length,
          corporateAnswersCount: aggregatedDiagnosticAnswers.find(l => l.cnaeCode === "CORPORATIVO")?.questions.length ?? 0,
          operationalAnswersCount: aggregatedDiagnosticAnswers.find(l => l.cnaeCode === "OPERACIONAL")?.questions.length ?? 0,
          cnaeLayersCount: cnaeAnswers.length,
          productLayerCount: productServiceLayers.filter(l => l.level === "q_produto").length,
          serviceLayerCount: productServiceLayers.filter(l => l.level === "q_servico").length,
        },
      };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // v2.1 T3: Completar camada do diagnóstico e avançar status do projeto
  // ───────────────────────────────────────────────────────────────────────────
  completeDiagnosticLayer: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      layer: z.enum(["corporate", "operational", "cnae"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = (project as any).clientId === userId || (project as any).createdById === userId;
      const isTeam = ["equipe_solaris", "advogado_senior", "advogado_junior"].includes(ctx.user.role);
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });

      const current = (project as any).diagnosticStatus ?? {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };

      // Validar gates de progressão
      if (input.layer === "operational" && current.corporate !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O Diagnóstico Corporativo deve ser concluído antes do Operacional.",
        });
      }
      if (input.layer === "cnae" && current.operational !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O Diagnóstico Operacional deve ser concluído antes do CNAE.",
        });
      }

      const updated = { ...current, [input.layer]: "completed" };

      // Mapear camada para status do projeto
      const layerToStatus: Record<string, string> = {
        corporate: "diagnostico_corporativo",
        operational: "diagnostico_operacional",
        cnae: "diagnostico_cnae",
      };

      // BL-01 (Sprint Y): assertValidTransition — mesmo padrão de completeOnda1/Onda2
      const { assertValidTransition } = await import('./flowStateMachine');
      assertValidTransition(project.status, layerToStatus[input.layer]);

      await db.updateProject(input.projectId, {
        diagnosticStatus: updated,
        status: layerToStatus[input.layer],
      } as any);

      const isComplete = isDiagnosticComplete(updated as any);
      const nextLayer = getNextDiagnosticLayer(updated as any);
      const progress = getDiagnosticProgress(updated as any);

      return {
        projectId: input.projectId,
        diagnosticStatus: updated,
        completedLayer: input.layer,
        isComplete,
        nextLayer,
        progress,
        // Se todas as camadas estão completas, o briefing pode ser gerado
        readyForBriefing: isComplete,
      };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // v2.1 T3: Gerar Briefing a partir do diagnóstico consolidado (3 camadas)
  // Wrapper que agrega as 3 camadas e chama o generateBriefing existente
  // ───────────────────────────────────────────────────────────────────────────
  generateBriefingFromDiagnostic: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      correction: z.string().optional(),
      complement: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = (project as any).clientId === userId || (project as any).createdById === userId;
      const isTeam = ["equipe_solaris", "advogado_senior", "advogado_junior"].includes(ctx.user.role);
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });

      const p = project as any;
      const diagnosticStatus = p.diagnosticStatus ?? {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };

      // GATE: só gera briefing se todas as 3 camadas estiverem completas
      if (!isDiagnosticComplete(diagnosticStatus)) {
        const nextLayer = getNextDiagnosticLayer(diagnosticStatus);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Diagnóstico incompleto. Próxima camada pendente: ${nextLayer}. Conclua todas as 3 camadas antes de gerar o briefing.`,
        });
      }
      // BUG-MANUAL-01: verificar Onda 1 SOLARIS antes de gerar briefing V3
      // diagnosticStatus cobre apenas QC/QO/CNAE — não inclui solarisAnswers
      const solarisCount = await db.countOnda1Answers(input.projectId);
      const statusesThatImplySolarisDone = ['onda1_solaris','onda2_iagen','diagnostico_corporativo','diagnostico_operacional','diagnostico_cnae','q_produto','q_servico','briefing','matriz_riscos','aprovado'];
      if (solarisCount === 0 && !statusesThatImplySolarisDone.includes(p.status ?? '')) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O Questionário SOLARIS (Onda 1) deve ser concluído antes de gerar o Briefing V3. Acesse /projetos/:id/questionario-solaris para iniciar.",
        });
      }

      // Buscar respostas do questionário CNAE (camada 3)
      const database = await db.getDb();
      let cnaeAnswers: any[] = [];
      if (database) {
        const rawAnswers = await database
          .select()
          .from(questionnaireAnswersV3)
          .where(eq(questionnaireAnswersV3.projectId, input.projectId));

        const byCnae: Record<string, any> = {};
        for (const a of rawAnswers) {
          const key = `${a.cnaeCode}-${a.level}`;
          if (!byCnae[key]) {
            byCnae[key] = {
              cnaeCode: a.cnaeCode,
              cnaeDescription: a.cnaeDescription ?? a.cnaeCode,
              level: a.level,
              questions: [],
            };
          }
          byCnae[key].questions.push({ question: a.questionText, answer: a.answerValue });
        }
        cnaeAnswers = Object.values(byCnae);
      }

      // Consolidar as 3 camadas base
      const baseLayers = consolidateDiagnosticLayers({
        companyProfile: p.companyProfile,
        operationProfile: p.operationProfile,
        taxComplexity: p.taxComplexity,
        financialProfile: p.financialProfile,
        governanceProfile: p.governanceProfile,
        cnaeAnswers,
      });

      // ADR-0011: Camadas 4+5 — Q.Produtos (NCM) e Q.Serviços (NBS) com fallback V1/V2
      const { productAnswers: briefingProduct, serviceAnswers: briefingService } = resolveProjectAnswers(p);
      const productServiceLayers = buildProductServiceLayers(briefingProduct, briefingService);
      const aggregatedDiagnosticAnswers = [...baseLayers, ...productServiceLayers];

      // ADR-0018: Camadas 6+7+8 — Fontes ausentes: QCNAE especializado, SOLARIS (Onda 1), IA Gen (Onda 2)
      // Fonte A: QCNAE especializado (IS, alíquota zero, ST, regime especial, prioridade)
      const specializedCnaeAnswers = p.cnaeAnswers
        ? (typeof p.cnaeAnswers === 'string'
            ? (() => { try { return JSON.parse(p.cnaeAnswers as string); } catch { return null; } })()
            : p.cnaeAnswers)
        : null;

      // Fonte B: Respostas SOLARIS (Onda 1)
      const solarisAnswersForBriefing = await db.getOnda1Answers(input.projectId);

      // Fonte C: Respostas IA Gen (Onda 2)
      const iagenAnswersForBriefing = await db.getOnda2Answers(input.projectId);

      // Montar bloco de texto adicional para o userPrompt
      const additionalContext: string[] = [];

      // fix(briefing 2026-04-20): inclui NCMs e NBS do operationProfile, para que o LLM
      // considere alíquota zero, Imposto Seletivo e regime diferenciado por produto/serviço.
      // fix-of-fix(briefing 2026-04-20 pós-#768): operationProfile pode chegar como string (B-Z13.5-001).
      const opProfileRawFB = p.operationProfile;
      const opProfileForBriefing: {
        principaisProdutos?: Array<{ ncm_code?: string; descricao?: string }>;
        principaisServicos?: Array<{ nbs_code?: string; descricao?: string }>;
      } = (() => {
        if (!opProfileRawFB) return {};
        if (typeof opProfileRawFB === "string") {
          try {
            const parsed = JSON.parse(opProfileRawFB);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
          } catch { return {}; }
        }
        if (typeof opProfileRawFB === "object" && !Array.isArray(opProfileRawFB)) {
          return opProfileRawFB as any;
        }
        return {};
      })();
      const ncmItens = (opProfileForBriefing?.principaisProdutos ?? []).filter((p) => p?.ncm_code);
      const nbsItens = (opProfileForBriefing?.principaisServicos ?? []).filter((s) => s?.nbs_code);
      if (ncmItens.length > 0 || nbsItens.length > 0) {
        additionalContext.push('<perfil_produtos_servicos>');
        if (ncmItens.length > 0) {
          additionalContext.push('Principais Produtos (NCM):');
          ncmItens.forEach((p) => {
            additionalContext.push(`- NCM ${p.ncm_code}${p.descricao ? ` — ${p.descricao}` : ''}`);
          });
        }
        if (nbsItens.length > 0) {
          additionalContext.push('Principais Serviços (NBS):');
          nbsItens.forEach((s) => {
            additionalContext.push(`- NBS ${s.nbs_code}${s.descricao ? ` — ${s.descricao}` : ''}`);
          });
        }
        additionalContext.push('</perfil_produtos_servicos>');
      }

      if (specializedCnaeAnswers) {
        additionalContext.push('<qcnae_especializado>');
        additionalContext.push(JSON.stringify(specializedCnaeAnswers, null, 2));
        additionalContext.push('</qcnae_especializado>');
      }

      if (solarisAnswersForBriefing.length > 0) {
        additionalContext.push('<respostas_solaris>');
        solarisAnswersForBriefing
          .filter((a: any) => a.resposta)
          .forEach((a: any) => {
            additionalContext.push(`${a.codigo}: ${a.resposta}`);
          });
        additionalContext.push('</respostas_solaris>');
      }

      if (iagenAnswersForBriefing.length > 0) {
        additionalContext.push('<respostas_iagen>');
        iagenAnswersForBriefing
          .filter((a: any) => a.answer)
          .forEach((a: any) => {
            additionalContext.push(`Q: ${a.question || a.questionId}\nR: ${a.answer}`);
          });
        additionalContext.push('</respostas_iagen>');
      }

      const additionalContextText = additionalContext.length > 0
        ? `DADOS ADICIONAIS DO CLIENTE:\n${additionalContext.join('\n')}\n\n`
        : '';

      // Usar o generateBriefing existente com o payload consolidado
      // (sem alterar a lógica interna do generateBriefing)
      const answersText = aggregatedDiagnosticAnswers.map(layer =>
        `## ${layer.cnaeCode} — ${layer.cnaeDescription} (${layer.level})\n` +
        layer.questions.map(q => `**P:** ${q.question}\n**R:** ${q.answer}`).join("\n\n")
      ).join("\n\n---\n\n");

      const correctionContext = input.correction ? `\n\nCORREÇÃO SOLICITADA:\n${input.correction}` : "";
      const complementContext = input.complement ? `\n\nINFORMAÇÕES ADICIONAIS:\n${input.complement}` : "";

      // RAG para o briefing
      const confirmedCnaes = (p.confirmedCnaes as any[]) || [];
      const cnaeCodesForRag = confirmedCnaes.length > 0
        ? confirmedCnaes.map((c: any) => c.code)
        : cnaeAnswers.map((a: any) => a.cnaeCode).filter((c: string) => c !== "CORPORATIVO" && c !== "OPERACIONAL");
      const briefingQueryCtx = `${p.description || ""} ${answersText.substring(0, 500)}`;
      const ragCtxBriefing = await retrieveArticles(cnaeCodesForRag, briefingQueryCtx, 7);
      const regulatoryContext = ragCtxBriefing.contextText;

      const { BriefingStructuredSchema } = await import("./ai-schemas");
      const { generateWithRetry: genRetry, OUTPUT_CONTRACT: OC } = await import("./ai-helpers");

      const structured = await genRetry(
        [
          {
            role: "system",
            content: `Você é um Consultor Sênior de Compliance Tributário com 15 anos de experiência na Reforma Tributária brasileira.

RESPONSABILIDADES:
1. Identificar gaps de compliance com base nas respostas do questionário
2. Citar APENAS artigos dos documentos regulatórios fornecidos no contexto
3. Calcular nível de risco geral (baixo/medio/alto/critico)
4. Identificar inconsistências nas respostas quando existirem
5. Gerar confidence score honesto com limitações declaradas

REGRA OBRIGATÓRIA — IMPOSTO SELETIVO (BUG-MANUAL-03 fix):
- Quando identificar risco de Imposto Seletivo (IS), citar EXCLUSIVAMENTE Art. 2 da LC 214/2025.
- O Art. 57 da LC 214/2025 trata de bens de uso/consumo pessoal — NÃO está relacionado ao IS.
- NUNCA associar Art. 57 a riscos de IS. Se o contexto RAG trouxer Art. 57 em busca sobre IS, ignorar essa associação.

REGRA OBRIGATÓRIA — QCNAE ESPECIALIZADO (ADR-0018):
- Se os dados do cliente (tag <qcnae_especializado>) confirmam sujeição ao IS → incluir gap sobre IS e citar Art. 2 LC 214/2025.
- Se os dados do cliente confirmam alíquota zero → incluir gap sobre alíquota zero e citar Art. 14 LC 214/2025.
- Se os dados do cliente confirmam ST (substituição tributária) → incluir gap sobre transição ST e citar Art. 28 LC 214/2025.
- Priorizar dados estruturados do cliente sobre inferências do LLM.

REGRA OBRIGATÓRIA — IBS INTERESTADUAL (B-Z11-003/004 fix):
- Risco de IBS em operações interestaduais: causa_raiz = "Falta de adaptação ao modelo de partilha IBS entre estados de origem e destino" — citar Art. 15 LC 214/2025 (não Art. 57).
- Art. 15 LC 214/2025 regula a partilha do IBS entre estados/municípios nas operações interestaduais.
- NUNCA inverter causas raiz: se o gap é de operação interestadual, a causa é a partilha IBS (Art. 15), não o regime de bens pessoais (Art. 57).
- Se o gap é de crédito IBS/CBS, a causa_raiz deve ser sobre apuração de créditos, não sobre obrigações acessórias.

REGRA DE DETERMINISMO (fix N1b UAT 2026-04-20):
- Use APENAS critérios objetivos. Mesma entrada → mesma saída.
- Gaps ordenados alfabeticamente por artigo da base legal.
- Nível de risco é função determinística: "alto" se >=2 gaps com urgência=imediata; "medio" se 1 gap imediata; "baixo" apenas se 0 gap imediata.

REGRA CRÍTICA — INCONSISTÊNCIAS vs LIMITAÇÕES (fix N2 UAT 2026-04-20):
- "inconsistencias" = APENAS contradições diretas entre duas respostas (ex: "Sim" em P1 + "Não" em P2 para temas correlatos).
- "inconsistencias" NUNCA deve incluir: "falta de informação", "ausência de resposta", "impossibilidade de aferir", "não informado", "sem dados detalhados" — TUDO ISSO vai em "confidence_score.limitacoes".
- Se a única "contradição" detectada é que o usuário não respondeu, NÃO liste como inconsistência. Liste como limitação.
- Array "inconsistencias" pode ser vazio [] — e isso é saudável.

${regulatoryContext}

${OC}`,
          },
          {
            role: "user",
            content: `PROJETO: ${project.name}
DESCRIÇÃO: ${p.description || ""}
${additionalContextText}DIAGNÓSTICO CONSOLIDADO (3 CAMADAS):
${answersText}
${correctionContext}
${complementContext}

Gere o Briefing estruturado em JSON:
{
  "nivel_risco_geral": "alto",
  "resumo_executivo": "...",
  "principais_gaps": [{"gap": "...", "causa_raiz": "...", "evidencia_regulatoria": "Art. X LC 214/2025", "urgencia": "imediata"}],
  "oportunidades": ["..."],
  "recomendacoes_prioritarias": ["..."],
  "inconsistencias": [{"pergunta_origem": "...", "resposta_declarada": "...", "contradicao_detectada": "...", "impacto": "alto"}],
  "confidence_score": {"nivel_confianca": 85, "limitacoes": ["..."], "recomendacao": "Revisão por advogado tributária recomendada"}
}`,
          },
        ],
        BriefingStructuredSchema,
        // fix(T1 UAT 2026-04-20): alinhado com generateBriefing — temperatura 0.
        { temperature: 0, context: "generateBriefingFromDiagnostic" }
      );

      // fix(Fix extra UAT 2026-04-20): reclassifica impacto determinístico server-side
      if (Array.isArray(structured.inconsistencias)) {
        structured.inconsistencias = structured.inconsistencias.map((inc: any) => ({
          ...inc,
          impacto: classifyInconsistenciaImpacto(inc),
        }));
      }

      const { buildBriefingMarkdown } = await import("./routers-fluxo-v3").then(m => ({
        buildBriefingMarkdown: (m as any).buildBriefingMarkdown,
      })).catch(() => ({ buildBriefingMarkdown: null }));

      // Converter para markdown (fallback se não conseguir importar)
      let briefingMarkdown: string;
      if (buildBriefingMarkdown) {
        briefingMarkdown = buildBriefingMarkdown(structured);
      } else {
        briefingMarkdown = `# Briefing de Compliance\n\n**Nível de Risco:** ${structured.nivel_risco_geral}\n\n## Resumo Executivo\n${structured.resumo_executivo}`;
      }

      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({
          briefingContentV3: briefingMarkdown as any,
          briefingContent: briefingMarkdown as any,
          briefingStructured: JSON.stringify(structured) as any,
          currentStep: 3,
          status: "matriz_riscos",
        } as any)
        .where(eq(projects.id, input.projectId));

      return {
        briefing: briefingMarkdown,
        structured,
        aggregatedPayloadSummary: {
          totalLayers: aggregatedDiagnosticAnswers.length,
          corporateQuestions: aggregatedDiagnosticAnswers.find(l => l.cnaeCode === "CORPORATIVO")?.questions.length ?? 0,
          operationalQuestions: aggregatedDiagnosticAnswers.find(l => l.cnaeCode === "OPERACIONAL")?.questions.length ?? 0,
          cnaeQuestions: cnaeAnswers.reduce((acc: number, l: any) => acc + (l.questions?.length ?? 0), 0),
        },
      };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // v2.1 — T1: Diagnostic Status (3 camadas: corporate, operational, cnae)
  // ───────────────────────────────────────────────────────────────────────────
  getDiagnosticStatus: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = (project as any).clientId === userId || (project as any).createdById === userId;
      const isTeam = ["equipe_solaris", "advogado_senior", "advogado_junior"].includes(ctx.user.role);
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });
      // Retorna diagnosticStatus ou default (tudo not_started)
      const diagnosticStatus = (project as any).diagnosticStatus ?? {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };
      const ds = diagnosticStatus as { corporate: string; operational: string; cnae: string };
      const completedCount = [ds.corporate, ds.operational, ds.cnae].filter(s => s === "completed").length;
      const progress = Math.round((completedCount / 3) * 100);
      const isComplete = completedCount === 3;
      return {
        projectId: input.projectId,
        diagnosticStatus: ds as {
          corporate: "not_started" | "in_progress" | "completed";
          operational: "not_started" | "in_progress" | "completed";
          cnae: "not_started" | "in_progress" | "completed";
        },
        progress,
        isComplete,
      };
    }),

  updateDiagnosticStatus: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      layer: z.enum(["corporate", "operational", "cnae"]),
      status: z.enum(["not_started", "in_progress", "completed"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const userId = ctx.user.id;
      const isOwner = (project as any).clientId === userId || (project as any).createdById === userId;
      const isTeam = ["equipe_solaris", "advogado_senior", "advogado_junior"].includes(ctx.user.role);
      if (!isOwner && !isTeam) throw new TRPCError({ code: "FORBIDDEN" });
      // Merge com estado atual
      const current = (project as any).diagnosticStatus ?? {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };
      const updated = { ...current, [input.layer]: input.status };
      // Validar regra de progressao: operational só pode avançar se corporate estiver completed
      if (input.layer === "operational" && input.status !== "not_started" && updated.corporate !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O Diagnóstico Corporativo deve ser concluído antes de iniciar o Operacional.",
        });
      }
      // Validar regra de progressao: cnae só pode avançar se operational estiver completed
      if (input.layer === "cnae" && input.status !== "not_started" && updated.operational !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O Diagnóstico Operacional deve ser concluído antes de iniciar o CNAE.",
        });
      }
      await db.updateProject(input.projectId, { diagnosticStatus: updated } as any);
      return {
        projectId: input.projectId,
        diagnosticStatus: updated as {
          corporate: "not_started" | "in_progress" | "completed";
          operational: "not_started" | "in_progress" | "completed";
          cnae: "not_started" | "in_progress" | "completed";
        },
        updatedLayer: input.layer,
        updatedStatus: input.status,
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // K-4-B: Onda 1 SOLARIS — getOnda1Questions + completeOnda1
  // Seções 7, 8 e 10 do contrato FLUXO-3-ONDAS-AS-IS-TO-BE.md v1.1
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Busca as perguntas SOLARIS ativas para exibição no QuestionarioSolaris.tsx.
   * Retorna as 12 perguntas SOL-001..SOL-012 com campo codigo populado.
   */
  getOnda1Questions: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });

      // Verificar acesso ao projeto
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }

      const questions = await db.getOnda1Questions();
      const existingAnswers = await db.getOnda1Answers(input.projectId);

      // Mapear respostas existentes por questionId
      const answersMap = new Map(existingAnswers.map(a => [a.questionId, a.resposta]));

      return {
        questions: questions.map(q => ({
          id: q.id,
          codigo: q.codigo ?? `SOL-${String(q.id).padStart(3, '0')}`,
          texto: q.texto,
          categoria: q.categoria,
          cnaeGroups: q.cnaeGroups,
          obrigatorio: q.obrigatorio,
          existingAnswer: answersMap.get(q.id) ?? null,
        })),
        projectStatus: project.status,
        totalAnswered: existingAnswers.length,
      };
    }),

  /**
   * Salva as respostas da Onda 1 e avança o status do projeto para onda1_solaris.
   * Enforcement: assertValidTransition garante que a transição é válida.
   * Seção 8 do contrato: backend é a fonte de verdade.
   */
  completeOnda1: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      // ADR-0016 Opção B: sem perguntas obrigatórias — array pode ser vazio, respostas podem ser string vazia
      answers: z.array(z.object({
        questionId: z.number().int().positive(),
        codigo: z.string().min(1).max(10),
        resposta: z.string(), // ADR-0016 MASP: removido .min(1) — resposta vazia permitida
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });

      // Verificar acesso ao projeto
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }

      // Enforcement: validar transição de status (Seção 8 + Seção 10)
      const { assertValidTransition } = await import('./flowStateMachine');
      try {
        assertValidTransition(project.status, 'onda1_solaris'); // BUG-UAT-07 fix: BUG-UAT-04 havia pulado onda1_solaris incorretamente
      } catch (err: any) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Transição inválida: ${err.message}. Etapa indisponível. Conclua a etapa anterior.`,
        });
      }
      // Salvar respostas (upsert idempotente)
      await db.saveOnda1Answers(input.projectId, input.answers);
      // Avançar status do projeto para onda1_solaris (BUG-UAT-07 fix: restaura semântica correta)
      await db.updateProject(input.projectId, { status: 'onda1_solaris' as any });

      // G17 — Fire-and-forget: gerar gaps SOLARIS sem bloquear resposta ao frontend
      void analyzeSolarisAnswers(input.projectId).catch((err) => {
        console.error('[G17] analyzeSolarisAnswers falhou — pipeline V1 não afetado:', err);
      });

      // G17-B — Trigger síncrono: derivar riscos a partir dos gaps SOLARIS
      // Executado APÓS analyzeSolarisAnswers (fire-and-forget) para garantir que
      // os gaps já estejam gravados antes de chamar o riskEngine.
      // Erro no riskEngine NÃO bloqueia o fluxo — logar e continuar.
      try {
        // Buscar porte/regime do projeto para o score correto
        const pool = mysql.createPool(process.env.DATABASE_URL ?? '');
        const [projRows] = await pool.query<import('mysql2').RowDataPacket[]>(
          'SELECT porte, regime FROM projects WHERE id = ?',
          [input.projectId]
        );
        await pool.end();
        const projData = (projRows as import('mysql2').RowDataPacket[])[0];
        const gaps = await deriveRisksFromGaps(
          input.projectId,
          projData?.porte ?? null,
          projData?.regime ?? null
        );
        if (gaps.length > 0) {
          await persistRisks(input.projectId, gaps);
        }
        console.log(JSON.stringify({
          event: 'g17b_risks_derived',
          projectId: input.projectId,
          risksCount: gaps.length,
        }));
      } catch (err) {
        // NÃO bloquear o fluxo — logar e continuar
        console.log(JSON.stringify({
          event: 'g17b_risk_engine_error',
          projectId: input.projectId,
          error: String(err),
        }));
      }

      return {
        success: true,
        projectId: input.projectId,
        newStatus: 'onda1_solaris', // BUG-UAT-07 fix
        answersCount: input.answers.length,
      };
    }),
  // K-4-B-2: saveSolarisAnswer — auto-save individual (BUG-SOLARIS-SAVE)
  /**
   * Salva uma única resposta SOLARIS (auto-save com debounce no frontend).
   * Usa o mesmo upsert idempotente de saveOnda1Answers — sem efeito colateral
   * de status (não avança o projeto — isso é responsabilidade do completeOnda1).
   */
  saveSolarisAnswer: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      questionId: z.number().int().positive(),
      codigo: z.string().min(1).max(10),
      answer: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }
      await db.saveOnda1Answers(input.projectId, [{
        questionId: input.questionId,
        codigo: input.codigo,
        resposta: input.answer,
      }]);
      return { saved: true };
    }),
  // ─── K-4-C: Onda 2 IA Generativa ──────────────────────────────────────────

  /**
   * Gera 5–10 perguntas combinatórias via LLM com base no perfil da empresa.
   * Timeout 30s com fallback obrigatório (5 perguntas hardcoded).
   * Seção 9 do contrato FLUXO-3-ONDAS v1.1.
   */
  generateOnda2Questions: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }

      // ── Z-11: Ler todos os 5 JSONs do projeto ──────────────────────────
      const companyProfile = project.companyProfile as any;
      const opProfile = project.operationProfile as any;
      const taxComplexity = project.taxComplexity as any;
      const financialProfile = project.financialProfile as any;
      const governanceProfile = project.governanceProfile as any;
      const regime = companyProfile?.taxRegime ?? 'lucro_presumido';
      const porte = companyProfile?.companySize ?? 'media';
      const cnaes: string[] = Array.isArray(project.confirmedCnaes) ? project.confirmedCnaes : [];

      // ── Z-11: Categorias ativas do banco ──────────────────────────────
      let activeCategories: RiskCategory[] = [];
      try {
        activeCategories = await listActiveCategories();
      } catch {
        console.warn('[Z11-ONDA2] listActiveCategories falhou — usando todas');
      }
      const relevantCats = filtrarCategoriasPorPerfil(activeCategories, {
        companyProfile, operationProfile: opProfile, taxComplexity, financialProfile, governanceProfile,
      });
      const limitePerguntas = calcularLimitePerguntas(
        companyProfile, opProfile, taxComplexity, financialProfile, governanceProfile,
      );
      const categoryList = relevantCats.length > 0
        ? relevantCats.map((c) => `${c.codigo}: ${c.nome} (${c.artigo_base})`).join('\n')
        : 'Usar categorias gerais da LC 214/2025';
      const activeCodigos = new Set(activeCategories.map((c) => c.codigo));

      // Fallback hardcoded (Seção 9 — perguntas genéricas sem risk_category_code)
      const FALLBACK_QUESTIONS = [
        { id: 'ia-gen-001', texto: 'A empresa possui operações com substituição tributária no contexto da Reforma Tributária?', objetivo_diagnostico: 'Identificar impacto da ST no novo regime', combinacao_gatilho: 'Qualquer regime', fonte: 'ia_gen' as const, confidence_score: 0.5 },
        { id: 'ia-gen-002', texto: 'Qual o percentual estimado de receita sujeita ao IBS/CBS após a transição?', objetivo_diagnostico: 'Dimensionar exposição ao novo tributo', combinacao_gatilho: 'Qualquer regime', fonte: 'ia_gen' as const, confidence_score: 0.5 },
        { id: 'ia-gen-003', texto: 'A empresa tem créditos acumulados de PIS/COFINS que precisam ser aproveitados antes da transição?', objetivo_diagnostico: 'Gestão de créditos no período de transição', combinacao_gatilho: 'Lucro Real ou Presumido', fonte: 'ia_gen' as const, confidence_score: 0.5 },
        { id: 'ia-gen-004', texto: 'Existem contratos de longo prazo que precisam de cláusulas de reequilíbrio tributário?', objetivo_diagnostico: 'Risco contratual na transição', combinacao_gatilho: 'Qualquer porte', fonte: 'ia_gen' as const, confidence_score: 0.5 },
        { id: 'ia-gen-005', texto: 'A empresa possui benefícios fiscais estaduais que podem ser impactados pela unificação do ICMS no IBS?', objetivo_diagnostico: 'Impacto de benefícios fiscais', combinacao_gatilho: 'Operação interestadual', fonte: 'ia_gen' as const, confidence_score: 0.5 },
      ];

      try {
        // ── Z-11: Prompt enriquecido com 5 JSONs + categorias do banco ──
        const profileFields: string[] = [];
        profileFields.push(`Regime tributário: ${regime}`);
        profileFields.push(`Porte: ${porte}`);
        profileFields.push(`CNAEs: ${cnaes.join(', ') || 'não informado'}`);
        if (opProfile?.operationType) profileFields.push(`Tipo operação: ${opProfile.operationType}`);
        if (opProfile?.clientType) profileFields.push(`Tipo cliente: ${Array.isArray(opProfile.clientType) ? opProfile.clientType.join(', ') : opProfile.clientType}`);
        if (opProfile?.multiState !== undefined) profileFields.push(`Multiestadual: ${opProfile.multiState ? 'Sim' : 'Não'}`);
        if (taxComplexity?.hasInternationalOps !== undefined) profileFields.push(`Operações internacionais: ${taxComplexity.hasInternationalOps ? 'Sim' : 'Não'}`);
        if (taxComplexity?.usesTaxIncentives !== undefined) profileFields.push(`Usa incentivos fiscais: ${taxComplexity.usesTaxIncentives ? 'Sim' : 'Não'}`);
        if (taxComplexity?.usesMarketplace !== undefined) profileFields.push(`Opera marketplace: ${taxComplexity.usesMarketplace ? 'Sim' : 'Não'}`);
        if (financialProfile?.paymentMethods) profileFields.push(`Meios pagamento: ${Array.isArray(financialProfile.paymentMethods) ? financialProfile.paymentMethods.join(', ') : financialProfile.paymentMethods}`);
        if (financialProfile?.hasIntermediaries !== undefined) profileFields.push(`Intermediários financeiros: ${financialProfile.hasIntermediaries ? 'Sim' : 'Não'}`);
        if (governanceProfile?.hasTaxTeam !== undefined) profileFields.push(`Equipe tributária interna: ${governanceProfile.hasTaxTeam ? 'Sim' : 'Não'}`);
        if (governanceProfile?.hasTaxIssues !== undefined) profileFields.push(`Passivo tributário: ${governanceProfile.hasTaxIssues ? 'Sim' : 'Não'}`);
        if (governanceProfile?.hasAudit !== undefined) profileFields.push(`Auditoria fiscal: ${governanceProfile.hasAudit ? 'Sim' : 'Não'}`);

        const prompt = `Você é um gerador de perguntas diagnósticas tributárias para a Reforma Tributária brasileira (LC 214/2025).

PERFIL DA EMPRESA:
${profileFields.map(f => `- ${f}`).join('\n')}

CATEGORIAS DE RISCO ATIVAS (use APENAS estas para risk_category_code):
${categoryList}

REGRAS INVIOLÁVEIS:
1. Cada pergunta DEVE ter risk_category_code de uma categoria ativa acima
2. Cada pergunta DEVE referenciar campos específicos do perfil da empresa
3. used_profile_fields DEVE ter >= 2 campos do perfil usados
4. PROIBIDO: perguntas genéricas que se aplicam a qualquer empresa
5. PROIBIDO: perguntas sem menção ao contexto operacional concreto

EXEMPLO BOM:
  risk_category_code: "split_payment"
  texto: "Sua empresa mapeia a incidência do split payment sobre recebíveis antecipados considerando operações multiestaduais e marketplace?"
  used_profile_fields: ["paymentMethods", "multiState", "usesMarketplace"]

EXEMPLO RUIM (PROIBIDO):
  texto: "A empresa possui operações com substituição tributária?"
  (não menciona nenhum campo específico do perfil)

Gere exatamente ${limitePerguntas} perguntas.
confidence_score entre 0.7 e 1.0 para perguntas de alta qualidade.`;

        const llmPromise = invokeLLM({
          messages: [
            { role: 'system', content: 'Você é um especialista em compliance tributário da Reforma Tributária brasileira. Responda sempre em JSON válido.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1, // Z-11: determinístico
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'onda2_questions',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  perguntas: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        texto: { type: 'string' },
                        objetivo_diagnostico: { type: 'string' },
                        combinacao_gatilho: { type: 'string' },
                        fonte: { type: 'string' },
                        confidence_score: { type: 'number' },
                        risk_category_code: { type: 'string' },
                        used_profile_fields: { type: 'array', items: { type: 'string' } },
                      },
                      required: ['id', 'texto', 'objetivo_diagnostico', 'combinacao_gatilho', 'fonte', 'confidence_score', 'risk_category_code', 'used_profile_fields'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['perguntas'],
                additionalProperties: false,
              },
            },
          },
        });

        // Timeout 30s (Seção 9)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM timeout 30s')), 30_000)
        );

        const response = await Promise.race([llmPromise, timeoutPromise]);
        const content = (response as any).choices?.[0]?.message?.content;
        if (!content) throw new Error('LLM retornou resposta vazia');

        const parsed = JSON.parse(content);
        const perguntas = parsed.perguntas;
        if (!Array.isArray(perguntas) || perguntas.length < 3) throw new Error('LLM retornou menos de 3 perguntas');

        // Z-11: Validação pós-LLM
        const perguntasValidas = perguntas
          .filter((p: any) => {
            if (activeCodigos.size > 0 && !activeCodigos.has(p.risk_category_code)) return false;
            if ((p.used_profile_fields?.length ?? 0) < 2) return false;
            return true;
          })
          .slice(0, limitePerguntas)
          .map((p: any, i: number) => ({
            id: p.id ?? `ia-gen-${String(i + 1).padStart(3, '0')}`,
            texto: p.texto,
            objetivo_diagnostico: p.objetivo_diagnostico,
            combinacao_gatilho: p.combinacao_gatilho,
            fonte: 'ia_gen' as const,
            confidence_score: Number(p.confidence_score ?? 0.5),
            risk_category_code: p.risk_category_code as string,
            used_profile_fields: p.used_profile_fields as string[],
          }));

        // Fallback se menos de 3 válidas
        if (perguntasValidas.length < 3) {
          console.warn(`[Z11-ONDA2] Apenas ${perguntasValidas.length} perguntas válidas — ativando fallback`);
          return { questions: FALLBACK_QUESTIONS, source: 'fallback' as const };
        }

        return { questions: perguntasValidas, source: 'llm' as const };
      } catch (err: any) {
        // Fallback obrigatório (Seção 9 — logar, não silenciar)
        console.error('[K-4-C] generateOnda2Questions fallback ativado:', err?.message ?? err);
        return { questions: FALLBACK_QUESTIONS, source: 'fallback' as const };
      }
    }),

  /**
   * Salva as respostas da Onda 2 e avança o status para onda2_iagen.
   * Enforcement: assertValidTransition (Seção 8 + Seção 10).
   */
  completeOnda2: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      // ADR-0016 Opção B: sem perguntas obrigatórias — array pode ser vazio, respostas podem ser string vazia
      answers: z.array(z.object({
        questionText: z.string(), // ADR-0016 MASP: removido .min(1) — consistência com resposta
        resposta: z.string(), // ADR-0016 MASP: removido .min(1) — resposta vazia permitida
        confidenceScore: z.number().min(0).max(1),
        // Z-11: campos opcionais — compatíveis com frontend legado
        risk_category_code: z.string().optional().nullable(),
        used_profile_fields: z.array(z.string()).optional(),
      })),
      // Bloco D (Opção A): NCM/NBS como parâmetro temporário até Bloco E (schema de projetos)
      // DECISÃO ARQUITETURAL: não persistidos no schema de projetos neste PR
      ncmCodes: z.array(z.string()).optional().default([]),
      nbsCodes: z.array(z.string()).optional().default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }
      const { assertValidTransition } = await import('./flowStateMachine');
      try {
        assertValidTransition(project.status, 'onda2_iagen'); // BUG-UAT-07 fix: BUG-UAT-05 havia pulado onda2_iagen incorretamente
      } catch (err: any) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Transição inválida: ${err.message}. Conclua a Onda 2 antes de avançar.`,
        });
      }
      await db.saveOnda2Answers(input.projectId, input.answers.map((a) => ({
        questionText: a.questionText,
        resposta: a.resposta,
        confidenceScore: a.confidenceScore,
        risk_category_code: a.risk_category_code ?? null,
        used_profile_fields: a.used_profile_fields,
        prompt_version: a.risk_category_code ? ONDA2_PROMPT_VERSION : undefined,
      })));
      await db.updateProject(input.projectId, { status: 'onda2_iagen' as any }); // BUG-UAT-07 fix: restaura semântica onda2_iagen
      // Lote A (AUDIT-C-002): fire-and-forget — gera gaps a partir das respostas iagen
      void analyzeIagenAnswers(input.projectId).catch((err) => {
        console.error('[IAGEN-GAP] analyzeIagenAnswers falhou — pipeline não afetado:', err);
      });
      // Lote B (Bloco E / CNT-01c): fire-and-forget — Decision Kernel engine (source='engine')
      // Bloco E: NCM/NBS lidos do operationProfile persistido (principaisProdutos/principaisServicos)
      // Fallback: ncmCodes/nbsCodes como parâmetro (compatibilidade com clientes legados)
      const opProfile = project.operationProfile as {
        principaisProdutos?: Array<{ ncm_code: string; descricao: string }>;
        principaisServicos?: Array<{ nbs_code: string; descricao: string }>;
      } | null;
      const ncmFromProfile = extractNcmNbsFromProfile(opProfile);
      const finalNcmCodes = ncmFromProfile.ncmCodes.length > 0 ? ncmFromProfile.ncmCodes : input.ncmCodes;
      const finalNbsCodes = ncmFromProfile.nbsCodes.length > 0 ? ncmFromProfile.nbsCodes : input.nbsCodes;
      if (finalNcmCodes.length > 0 || finalNbsCodes.length > 0) {
        void analyzeEngineGaps(input.projectId, finalNcmCodes, finalNbsCodes).catch((err) => {
          console.error('[ENGINE-GAP] analyzeEngineGaps falhou — pipeline não afetado:', err);
        });
      }
      return {
        success: true,
        projectId: input.projectId,
        newStatus: 'onda2_iagen', // BUG-UAT-07 fix
        answersCount: input.answers.length,
      };
    }),
  // ───────────────────────────────────────────────────────────────────────────
  // M2 COMPONENTE D: Editar NCM/NBS do operationProfile (TO-BE v3 2026-04-06)
  // CODEOWNERS: exige aprovação do P.O. (Uires Tapajos)
  // ─────────────────────────────────────────────────────────────────────────
  updateOperationProfile: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      principaisProdutos: z.array(z.object({
        ncm_code: z.string(),
        descricao: z.string(),
        percentualFaturamento: z.number().optional(),
      })).optional(),
      principaisServicos: z.array(z.object({
        nbs_code: z.string(),
        descricao: z.string(),
        percentualFaturamento: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const { projectId, principaisProdutos, principaisServicos } = input;

      // 1. Buscar projeto atual
      const projeto = await db.getProjectById(projectId);
      if (!projeto) throw new TRPCError({ code: 'NOT_FOUND' });

      // 2. Parse seguro do operationProfile
      let perfilAtual: Record<string, unknown> = {};
      const raw = (projeto as any).operationProfile;
      if (raw !== null && raw !== undefined) {
        if (typeof raw === 'string') {
          try { perfilAtual = JSON.parse(raw); } catch { perfilAtual = {}; }
        } else if (typeof raw === 'object') {
          perfilAtual = raw as Record<string, unknown>;
        }
      }

      // 3. Merge seguro — undefined NÃO sobrescreve
      const merged = { ...perfilAtual };
      if (principaisProdutos !== undefined) {
        merged.principaisProdutos = principaisProdutos;
      }
      if (principaisServicos !== undefined) {
        merged.principaisServicos = principaisServicos;
      }

      // 4. Persistir
      await db.updateProject(projectId, { operationProfile: merged } as any);

      // 5. Fire-and-forget engine APENAS se change material
      const produtosAntes = (perfilAtual.principaisProdutos as any[]) ?? [];
      const produtosDepois = (merged.principaisProdutos as any[]) ?? [];
      const servicosAntes  = (perfilAtual.principaisServicos as any[]) ?? [];
      const servicosDepois = (merged.principaisServicos as any[]) ?? [];

      const houveChangeMaterial =
        JSON.stringify(produtosAntes) !== JSON.stringify(produtosDepois) ||
        JSON.stringify(servicosAntes) !== JSON.stringify(servicosDepois);

      if (houveChangeMaterial) {
        // Reutilizar extractNcmNbsFromProfile (já existe no arquivo) — não duplicar lógica
        const { ncmCodes, nbsCodes } = extractNcmNbsFromProfile(merged);
        if (ncmCodes.length > 0 || nbsCodes.length > 0) {
          // analyzeEngineGaps requer 3 parâmetros obrigatórios — NUNCA chamar com apenas projectId
          void analyzeEngineGaps(projectId, ncmCodes, nbsCodes)
            .catch(err =>
              console.error('[ENGINE-GAP] falhou após updateOperationProfile:', err)
            );
        }
      }

      return { success: true, projectId };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // Z-01: Q.Produtos (NCM) — DEC-M3-05 v3 · ADR-0009
  // Gera perguntas diagnósticas rastreadas para empresas de produto (NCM)
  // corporateAnswers grava TrackedQuestion[] (DEC-M3-06 — ciclo completo em Z-02)
  // ───────────────────────────────────────────────────────────────────────────
  getProductQuestions: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }

      const op = (project as any).operationProfile ?? {};
      const ncmCodes: string[] = (op.principaisProdutos ?? []).map((p: any) => p.ncm_code).filter(Boolean);
      const cnaeCodes: string[] = Array.isArray((project as any).cnaes) ? (project as any).cnaes : [];
      const companyProfile = { operationType: op.operationType };

      const result: QuestionResult = await generateProductQuestions(ncmCodes, cnaeCodes, companyProfile);

      // Z-02: grava em productAnswers (corrige BUG-MANUAL-02 — era corporateAnswers)
      // DIV-Z02-001 aplicada: assinatura real (ncmCodes, cnaeCodes, companyProfile)
      if ('nao_aplicavel' in result) {
        await db.updateProject(input.projectId, { status: 'q_produto' } as any);
        return { nao_aplicavel: true as const, perguntas: [] as TrackedQuestion[], alerta: null };
      }
      if ('perguntas' in result) {
        await db.updateProject(input.projectId, {
          productAnswers: JSON.stringify(result.perguntas),
          status: 'q_produto',
        } as any);
        return { nao_aplicavel: false as const, perguntas: result.perguntas, alerta: result.alerta };
      }
      // result é TrackedQuestion[]
      await db.updateProject(input.projectId, {
        productAnswers: JSON.stringify(result),
        status: 'q_produto',
      } as any);
      return { nao_aplicavel: false as const, perguntas: result as TrackedQuestion[], alerta: null };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // Z-02: Q.Serviços (NBS) — DEC-M3-05 v3 · ADR-0010
  // Gera perguntas diagnósticas rastreadas para empresas de serviço (NBS)
  // serviceAnswers grava TrackedQuestion[] (corrige BUG-MANUAL-02 — era operationalAnswers)
  // ───────────────────────────────────────────────────────────────────────────
  getServiceQuestions: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }

      const op = (project as any).operationProfile ?? {};
      const nbsCodes: string[] = (op.principaisServicos ?? []).map((s: any) => s.nbs_code).filter(Boolean);
      const cnaeCodes: string[] = Array.isArray((project as any).cnaes) ? (project as any).cnaes : [];
      const companyProfile = { operationType: op.operationType };

      const result: QuestionResult = await generateServiceQuestions(nbsCodes, cnaeCodes, companyProfile);

      // Z-02: grava em serviceAnswers (corrige BUG-MANUAL-02 — era operationalAnswers)
      if ('nao_aplicavel' in result) {
        await db.updateProject(input.projectId, { status: 'q_servico' } as any);
        return { nao_aplicavel: true as const, perguntas: [] as TrackedQuestion[], alerta: null };
      }
      if ('perguntas' in result) {
        await db.updateProject(input.projectId, {
          serviceAnswers: JSON.stringify(result.perguntas),
          status: 'q_servico',
        } as any);
        return { nao_aplicavel: false as const, perguntas: result.perguntas, alerta: result.alerta };
      }
      // result é TrackedQuestion[]
      await db.updateProject(input.projectId, {
        serviceAnswers: JSON.stringify(result),
        status: 'q_servico',
      } as any);
      return { nao_aplicavel: false as const, perguntas: result as TrackedQuestion[], alerta: null };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // Z-02: completeProductQuestionnaire — DEC-M3-05 v3 · ADR-0010
  // Persiste respostas do usuário em productAnswers e avança o status
  // ───────────────────────────────────────────────────────────────────────────
  completeProductQuestionnaire: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      respostas: z.array(z.object({
        pergunta_id: z.string(),
        // fix(briefing 2026-04-20): texto da pergunta + NCM agora persistidos para alimentar buildProductServiceLayers/briefing LLM.
        pergunta_texto: z.string().optional(),
        ncm_code: z.string().optional(),
        resposta: z.union([z.string(), z.boolean(), z.number()]),
        fonte_ref: z.string().min(1, 'fonte_ref obrigatório — Contrato DEC-M3-05 Parte 1'),
        lei_ref:   z.string().min(1, 'lei_ref obrigatório — Contrato DEC-M3-05 Parte 1'),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }
      // Invariante: fonte_ref e lei_ref não podem ser vazios (Contrato DEC-M3-05 Parte 1)
      for (const r of input.respostas) {
        if (!r.fonte_ref || !r.lei_ref) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'fonte_ref e lei_ref são obrigatórios em todas as respostas' });
        }
      }
      // Determinar próximo status (DIV-Z02-003: usar português)
      const op = (project as any).operationProfile ?? {};
      const operationType: string = op.operationType ?? 'misto';
      const { getNextStateAfterProductQ } = await import('./flowStateMachine');
      const nextStatus = getNextStateAfterProductQ(operationType);
      await db.updateProject(input.projectId, {
        productAnswers: JSON.stringify(input.respostas),
        status: nextStatus,
      } as any);
      return { ok: true, nextStatus };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // Z-02: completeServiceQuestionnaire — DEC-M3-05 v3 · ADR-0010
  // Persiste respostas do usuário em serviceAnswers e avança o status
  // ───────────────────────────────────────────────────────────────────────────
  completeServiceQuestionnaire: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      respostas: z.array(z.object({
        pergunta_id: z.string(),
        // fix(briefing 2026-04-20): texto da pergunta + NBS agora persistidos para alimentar buildProductServiceLayers/briefing LLM.
        pergunta_texto: z.string().optional(),
        nbs_code: z.string().optional(),
        resposta: z.union([z.string(), z.boolean(), z.number()]),
        fonte_ref: z.string().min(1, 'fonte_ref obrigatório — Contrato DEC-M3-05 Parte 1'),
        lei_ref:   z.string().min(1, 'lei_ref obrigatório — Contrato DEC-M3-05 Parte 1'),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }
      // Invariante: fonte_ref e lei_ref não podem ser vazios (Contrato DEC-M3-05 Parte 1)
      for (const r of input.respostas) {
        if (!r.fonte_ref || !r.lei_ref) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'fonte_ref e lei_ref são obrigatórios em todas as respostas' });
        }
      }
      // Sempre avança para diagnostico_cnae (DIV-Z02-003 não se aplica aqui)
      const { getNextStateAfterServiceQ } = await import('./flowStateMachine');
      const nextStatus = getNextStateAfterServiceQ();
      await db.updateProject(input.projectId, {
        serviceAnswers: JSON.stringify(input.respostas),
        status: nextStatus,
      } as any);
      return { ok: true, nextStatus };
    }),

  // ─── ADR-0016 Etapa 3: Procedures de Skip de Questionário ────────────────
  // DIV-Z02-ADR16-001: ConfidenceLevel usa 'nenhuma' em vez de 'muito_baixa'
  // (decisão mais precisa semanticamente — aprovada pelo P.O. em 2026-04-07)

  /**
   * Pula uma pergunta individual do questionário SOLARIS (Onda 1).
   * NÃO altera solaris_answers nem o status do projeto.
   * Adiciona questionId ao array solarisSkippedIds (JSON) se não presente.
   */
  skipSolarisQuestion: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      questionId: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }
      const currentSkipped: string[] = (() => {
        try {
          const raw = (project as any).solarisSkippedIds;
          const parsed = JSON.parse(raw ?? '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      })();
      if (!currentSkipped.includes(input.questionId)) {
        currentSkipped.push(input.questionId);
      }
      await db.updateProject(input.projectId, {
        solarisSkippedIds: JSON.stringify(currentSkipped),
      } as any);
      return { ok: true, skippedIds: currentSkipped };
    }),

  /**
   * Pula uma pergunta individual do questionário IA Gen (Onda 2).
   * NÃO altera iagen_answers nem o status do projeto.
   * Adiciona questionId ao array iagenSkippedIds (JSON) se não presente.
   */
  skipIagenQuestion: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      questionId: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }
      const currentSkipped: string[] = (() => {
        try {
          const raw = (project as any).iagenSkippedIds;
          const parsed = JSON.parse(raw ?? '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      })();
      if (!currentSkipped.includes(input.questionId)) {
        currentSkipped.push(input.questionId);
      }
      await db.updateProject(input.projectId, {
        iagenSkippedIds: JSON.stringify(currentSkipped),
      } as any);
      return { ok: true, skippedIds: currentSkipped };
    }),

  /**
   * Pula o questionário inteiro (SOLARIS ou IA Gen).
   * Seta solarisSkippedAll=true ou iagenSkippedAll=true.
   * Avança o status do projeto para o próximo step via assertValidTransition.
   * Retorna { success, nextState, confidenceWarning }.
   */
  skipQuestionnaire: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      questionnaire: z.enum(['solaris', 'iagen']),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });
      const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
      if (!hasAccess && ctx.user.role !== 'equipe_solaris' && ctx.user.role !== 'advogado_senior') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem acesso a este projeto' });
      }
      // Determinar próximo status com base no questionário pulado
      const nextStateMap: Record<'solaris' | 'iagen', string> = {
        solaris: 'onda1_solaris',  // pular SOLARIS → avança para onda1_solaris (marcado como completo)
        iagen:   'onda2_iagen',   // pular IA Gen → avança para onda2_iagen (marcado como completo)
      };
      const nextState = nextStateMap[input.questionnaire];
      // Validar transição antes de persistir
      const { assertValidTransition } = await import('./flowStateMachine');
      try {
        assertValidTransition(project.status, nextState);
      } catch (err: any) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Transição inválida ao pular ${input.questionnaire}: ${err.message}`,
        });
      }
      // Persistir skip + avançar status
      const updateData: Record<string, unknown> = { status: nextState };
      if (input.questionnaire === 'solaris') {
        updateData.solarisSkippedAll = true;
      } else {
        updateData.iagenSkippedAll = true;
      }
      await db.updateProject(input.projectId, updateData as any);
      const confidenceWarning = `Questionário ${input.questionnaire === 'solaris' ? 'SOLARIS (Onda 1)' : 'IA Gen (Onda 2)'} foi pulado — diagnóstico com confiança reduzida. Recomenda-se revisão manual antes da aprovação do briefing.`;
      return { success: true, nextState, confidenceWarning };
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Converter BriefingStructured → Markdown (compatibilidade com UI)
// ────────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────────
// HELPER: Bloco E (CNT-01c) — Extrair NCM/NBS do operationProfile
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Extrai códigos NCM e NBS do operationProfile persistido no banco.
 * Usado em completeOnda2 para alimentar o Decision Kernel engine.
 * Projetos legados (sem principaisProdutos/principaisServicos) retornam arrays vazios.
 */
export function extractNcmNbsFromProfile(operationProfile: unknown): { ncmCodes: string[]; nbsCodes: string[] } {
  const profile = operationProfile as {
    principaisProdutos?: Array<{ ncm_code: string; descricao: string }>;
    principaisServicos?: Array<{ nbs_code: string; descricao: string }>;
  } | null;
  return {
    ncmCodes: profile?.principaisProdutos?.map((p) => p.ncm_code) ?? [],
    nbsCodes: profile?.principaisServicos?.map((s) => s.nbs_code) ?? [],
  };
}

/**
 * fix(Fix extra UAT 2026-04-20): reclassifica o impacto de uma inconsistência usando
 * heurística determinística. Tira a decisão do LLM — mesma contradição sempre recebe
 * o mesmo impacto.
 *
 * Regras:
 *   - ALTO: base de cálculo, IBS/CBS direto, fato gerador, local da operação, crédito indevido,
 *           alíquota, NF-e, código de serviço (fiscal direto)
 *   - MÉDIO: obrigação acessória, cadastro, declaração, EFD, Sped, sistema
 *   - BAIXO: treinamento, documentação interna, processo, governança
 *   - Default: MÉDIO (conservador)
 */
function classifyInconsistenciaImpacto(inc: any): "alto" | "medio" | "baixo" {
  const texto = [
    inc?.pergunta_origem ?? "",
    inc?.resposta_declarada ?? "",
    inc?.contradicao_detectada ?? "",
  ].join(" ").toLowerCase();

  const ALTO_KEYWORDS = [
    "base de cálculo", "base de calculo", "ibs", "cbs", "imposto seletivo",
    "fato gerador", "local da operação", "local da operacao",
    "crédito", "credito", "alíquota", "aliquota",
    "nf-e", "nfe", "nota fiscal",
    "código de serviço", "codigo de servico", "código ncm", "codigo ncm",
    "partilha", "interestadual",
  ];
  const MEDIO_KEYWORDS = [
    "obrigação acessória", "obrigacao acessoria", "sped", "efd",
    "cadastro", "declaração", "declaracao", "escrituração", "escrituracao",
    "erp", "sistema", "integração", "integracao",
  ];
  const BAIXO_KEYWORDS = [
    "treinamento", "capacitação", "capacitacao",
    "documentação interna", "documentacao interna",
    "governança", "governanca", "processo interno",
  ];

  if (ALTO_KEYWORDS.some((kw) => texto.includes(kw))) return "alto";
  if (MEDIO_KEYWORDS.some((kw) => texto.includes(kw))) return "medio";
  if (BAIXO_KEYWORDS.some((kw) => texto.includes(kw))) return "baixo";

  // Default: manter o que LLM retornou se válido, senão médio (conservador)
  const llmImpacto = String(inc?.impacto ?? "").toLowerCase();
  if (llmImpacto === "alto" || llmImpacto === "medio" || llmImpacto === "baixo") {
    return llmImpacto as "alto" | "medio" | "baixo";
  }
  return "medio";
}

function buildBriefingMarkdown(structured: any): string {
  const nivelLabel: Record<string, string> = {
    baixo: "🟢 Baixo",
    medio: "🟡 Médio",
    alto: "🟠 Alto",
    critico: "🔴 Crítico",
  };

  const lines: string[] = [
    `# Briefing de Compliance — Reforma Tributária`,
    ``,
    `## Nível de Risco Geral: ${nivelLabel[structured.nivel_risco_geral] ?? structured.nivel_risco_geral}`,
    ``,
    `## 1. Resumo Executivo`,
    ``,
    structured.resumo_executivo,
    ``,
    `## 2. Principais Gaps de Compliance`,
    ``,
  ];

  for (const gap of (structured.principais_gaps ?? [])) {
    lines.push(`### ${gap.gap}`);
    lines.push(`- **Causa Raiz:** ${gap.causa_raiz}`);
    lines.push(`- **Base Legal:** ${gap.evidencia_regulatoria}`);
    lines.push(`- **Urgência:** ${gap.urgencia}`);
    lines.push(``);
  }

  lines.push(`## 3. Oportunidades`);
  lines.push(``);
  for (const op of (structured.oportunidades ?? [])) {
    lines.push(`- ${op}`);
  }
  lines.push(``);

  lines.push(`## 4. Recomendações Prioritárias`);
  lines.push(``);
  (structured.recomendacoes_prioritarias ?? []).forEach((rec: string, i: number) => {
    lines.push(`${i + 1}. ${rec}`);
  });
  lines.push(``);

  // V61: Alertas de inconsistência (condicional)
  if (structured.inconsistencias && structured.inconsistencias.length > 0) {
    lines.push(`## 5. Alertas de Inconsistência`);
    lines.push(``);
    lines.push(`> ⚠️ As inconsistências abaixo foram detectadas nas respostas do questionário e requerem verificação.`);
    lines.push(``);
    for (const inc of structured.inconsistencias) {
      lines.push(`### ${inc.contradicao_detectada}`);
      lines.push(`- **Resposta declarada:** ${inc.resposta_declarada}`);
      lines.push(`- **Impacto:** ${inc.impacto}`);
      lines.push(``);
    }
  }

  // V61: Confidence score / Limites do diagnóstico
  const cs = structured.confidence_score;
  if (cs) {
    lines.push(`## ${structured.inconsistencias?.length > 0 ? "6" : "5"}. Limites do Diagnóstico Automatizado`);
    lines.push(``);
    lines.push(`> **Nível de Confiança:** ${cs.nivel_confianca}% — ${cs.recomendacao}`);
    lines.push(``);
    if (cs.limitacoes?.length > 0) {
      lines.push(`**Limitações identificadas:**`);
      for (const lim of cs.limitacoes) {
        lines.push(`- ${lim}`);
      }
    }
  }

  return lines.join("\n");
}
