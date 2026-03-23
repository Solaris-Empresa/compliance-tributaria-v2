/**
 * FLOW ROUTER — v2.3
 * Procedures tRPC para persistência de estado do fluxo e retomada.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { getDiagnosticSource } from "../diagnostic-source";
import { projects } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  validateTransition,
  getResumePoint,
  createHistoryEntry,
  FLOW_STEPS,
  type FlowStep,
  type ProjectStateSnapshot,
} from "../flowStateMachine";
import {
  executeRetrocessoCleanup,
  retrocessoRequiresCleanup,
  getRetrocessoWarningMessage,
} from "../retrocesso-cleanup";

const flowStepSchema = z.enum([
  "perfil_empresa",
  "consistencia",
  "descoberta_cnaes",
  "confirmacao_cnaes",
  "diagnostico_corporativo",
  "diagnostico_operacional",
  "diagnostico_cnae",
  "briefing",
  "riscos",
  "plano",
  "dashboard",
]);

export const flowRouter = router({
  /**
   * Salva a etapa atual do projeto e atualiza o status correspondente.
   * Chamado automaticamente a cada transição de etapa no frontend.
   */
  saveStep: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        stepName: flowStepSchema,
        force: z.boolean().optional().default(false), // força a transição sem validação de gate
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      // Buscar projeto atual
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      }

      // Verificar se o usuário tem acesso ao projeto
      if (project.clientId !== ctx.user.id && ctx.user.role === "cliente") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }

      // F-02C: Leitura centralizada via adaptador (ADR-005)
      const diagSource = await getDiagnosticSource(project.id);
      const snapshot: ProjectStateSnapshot = {
        id: project.id,
        currentStep: project.currentStep,
        currentStepName: project.currentStepName,
        status: project.status,
        confirmedCnaes: project.confirmedCnaes,
        // V1
        corporateAnswers: diagSource.corporateAnswers,
        operationalAnswers: diagSource.operationalAnswers,
        cnaeAnswers: diagSource.cnaeAnswers,
        briefingContent: diagSource.briefingContentV3 ?? project.briefingContent,
        riskMatricesData: diagSource.riskMatricesDataV3 ?? project.riskMatricesData,
        actionPlansData: diagSource.actionPlansDataV3 ?? project.actionPlansData,
        // V3
        questionnaireAnswersV3: diagSource.questionnaireAnswersV3,
        briefingContentV3: diagSource.briefingContentV3,
        riskMatricesDataV3: diagSource.riskMatricesDataV3,
        actionPlansDataV3: diagSource.actionPlansDataV3,
        // Compartilhado
        flowVersion: diagSource.flowVersion,
        diagnosticStatus: project.diagnosticStatus,
      };

      // Validar transição (a menos que force=true para uso interno)
      if (!input.force) {
        const validation = validateTransition(snapshot, input.stepName as FlowStep);
        if (!validation.allowed) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: validation.reason || "Transição não permitida",
          });
        }
      }

      // F-03: Gate de limpeza ao retroceder (ADR-007)
      // Se targetStep < currentStep, limpar dados das etapas posteriores ao destino
      const targetStepConfig = FLOW_STEPS.find((s) => s.stepName === input.stepName);
      if (targetStepConfig && targetStepConfig.stepNumber < (project.currentStep ?? 1)) {
        await executeRetrocessoCleanup(
          project.id,
          project.currentStep ?? 1,
          targetStepConfig.stepNumber,
          diagSource.flowVersion
        );
      }

      // Determinar novo número de etapa e status
      const stepConfig = FLOW_STEPS.find((s) => s.stepName === input.stepName);
      if (!stepConfig) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Etapa inválida" });
      }

      // Construir novo histórico
      const currentHistory = Array.isArray(project.stepHistory) ? project.stepHistory : [];
      const newEntry = createHistoryEntry(stepConfig.stepNumber, input.stepName as FlowStep, ctx.user.id);
      const updatedHistory = [...currentHistory, newEntry];

      // Atualizar projeto
      await db
        .update(projects)
        .set({
          currentStep: stepConfig.stepNumber,
          currentStepName: input.stepName,
          status: stepConfig.statusOnEnter,
          stepUpdatedAt: new Date(),
          stepHistory: updatedHistory,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.projectId));

      return {
        success: true,
        step: stepConfig.stepNumber,
        stepName: input.stepName,
        status: stepConfig.statusOnEnter,
        timestamp: newEntry.timestamp,
      };
    }),

  /**
   * Retorna o ponto de retomada do projeto — etapa atual + dados necessários.
   * Chamado ao abrir um projeto para saber onde continuar.
   */
  getResumePoint: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      }

      if (project.clientId !== ctx.user.id && ctx.user.role === "cliente") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }

      // F-02C: Leitura centralizada via adaptador (ADR-005)
      const diagSource = await getDiagnosticSource(project.id);
      const snapshot: ProjectStateSnapshot = {
        id: project.id,
        currentStep: project.currentStep,
        currentStepName: project.currentStepName,
        status: project.status,
        confirmedCnaes: project.confirmedCnaes,
        // V1
        corporateAnswers: diagSource.corporateAnswers,
        operationalAnswers: diagSource.operationalAnswers,
        cnaeAnswers: diagSource.cnaeAnswers,
        briefingContent: diagSource.briefingContentV3 ?? project.briefingContent,
        riskMatricesData: diagSource.riskMatricesDataV3 ?? project.riskMatricesData,
        actionPlansData: diagSource.actionPlansDataV3 ?? project.actionPlansData,
        // V3
        questionnaireAnswersV3: diagSource.questionnaireAnswersV3,
        briefingContentV3: diagSource.briefingContentV3,
        riskMatricesDataV3: diagSource.riskMatricesDataV3,
        actionPlansDataV3: diagSource.actionPlansDataV3,
        // Compartilhado
        flowVersion: diagSource.flowVersion,
        diagnosticStatus: project.diagnosticStatus,
      };

      const resumePoint = getResumePoint(snapshot);

      return {
        ...resumePoint,
        projectId: project.id,
        projectName: project.name,
        projectStatus: project.status,
        stepUpdatedAt: project.stepUpdatedAt,
        stepHistory: project.stepHistory || [],
        totalSteps: FLOW_STEPS.length,
      };
    }),

  /**
   * Valida se uma transição de etapa é permitida sem executá-la.
   * Usado pelo frontend para habilitar/desabilitar botões de avanço.
   */
  validateTransition: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        targetStep: flowStepSchema,
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      }

      // F-02C: Leitura centralizada via adaptador (ADR-005)
      const diagSource = await getDiagnosticSource(project.id);
      const snapshot: ProjectStateSnapshot = {
        id: project.id,
        currentStep: project.currentStep,
        currentStepName: project.currentStepName,
        status: project.status,
        confirmedCnaes: project.confirmedCnaes,
        // V1
        corporateAnswers: diagSource.corporateAnswers,
        operationalAnswers: diagSource.operationalAnswers,
        cnaeAnswers: diagSource.cnaeAnswers,
        briefingContent: diagSource.briefingContentV3 ?? project.briefingContent,
        riskMatricesData: diagSource.riskMatricesDataV3 ?? project.riskMatricesData,
        actionPlansData: diagSource.actionPlansDataV3 ?? project.actionPlansData,
        // V3
        questionnaireAnswersV3: diagSource.questionnaireAnswersV3,
        briefingContentV3: diagSource.briefingContentV3,
        riskMatricesDataV3: diagSource.riskMatricesDataV3,
        actionPlansDataV3: diagSource.actionPlansDataV3,
        // Compartilhado
        flowVersion: diagSource.flowVersion,
        diagnosticStatus: project.diagnosticStatus,
      };

      return validateTransition(snapshot, input.targetStep as FlowStep);
    }),

  /**
   * Retorna o histórico completo de transições de etapas do projeto.
   */
  getStepHistory: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      const [project] = await db
        .select({
          id: projects.id,
          stepHistory: projects.stepHistory,
          currentStep: projects.currentStep,
          currentStepName: projects.currentStepName,
          stepUpdatedAt: projects.stepUpdatedAt,
        })
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      }

      return {
        projectId: project.id,
        currentStep: project.currentStep,
        currentStepName: project.currentStepName,
        stepUpdatedAt: project.stepUpdatedAt,
        history: project.stepHistory || [],
      };
    }),

  /**
   * F-03: Verifica se um retrocesso de etapa requer limpeza de dados.
   * Chamado pelo frontend antes de executar o retrocesso para exibir modal de confirmação.
   */
  checkRetrocesso: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        targetStep: flowStepSchema,
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      }

      if (project.clientId !== ctx.user.id && ctx.user.role === "cliente") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }

      const targetStepConfig = FLOW_STEPS.find((s) => s.stepName === input.targetStep);
      if (!targetStepConfig) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Etapa inválida" });
      }

      const diagSource = await getDiagnosticSource(project.id);
      const fromStep = project.currentStep ?? 1;
      const toStep = targetStepConfig.stepNumber;

      const requiresCleanup = retrocessoRequiresCleanup(fromStep, toStep, diagSource.flowVersion);
      const warningMessage = requiresCleanup
        ? getRetrocessoWarningMessage(fromStep, toStep, diagSource.flowVersion)
        : "";

      return {
        requiresCleanup,
        warningMessage,
        fromStep,
        toStep,
        flowVersion: diagSource.flowVersion,
      };
    }),

  /**
   * Lista todas as etapas do fluxo com seus metadados.
   * Usado pelo DiagnosticoStepper para renderizar o progresso.
   */
  getFlowSteps: protectedProcedure.query(() => {
    return FLOW_STEPS.map((s) => ({
      stepNumber: s.stepNumber,
      stepName: s.stepName,
      label: s.label,
      hasGates: (s.gates?.length ?? 0) > 0,
    }));
  }),
});
