import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { generateTemplatePDF } from "./templatePdf";

// ============================================================================
// HELPERS
// ============================================================================

// Helper function para validar acesso ao projeto dentro de mutations/queries
const validateProjectAccess = async (ctx: any, projectId: number) => {
  const project = await db.getProjectById(projectId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

  // Equipe SOLARIS e Advogado Sênior têm acesso total
  if (ctx.user.role === "equipe_solaris" || ctx.user.role === "advogado_senior") {
    return project;
  }

  // Cliente precisa estar vinculado ao projeto
  const hasAccess = await db.isUserInProject(ctx.user.id, projectId);
  if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

  return project;
};

// ============================================================================
// MAIN ROUTER
// ============================================================================

import { branchesRouter } from "./routers-branches";
import { corporateAssessmentRouter, branchAssessmentRouter } from "./routers-assessments";
import { actionPlansRouter } from "./routers-action-plans";
import { tasksRouter as tasksRouterV2 } from "./routers-tasks";
import { commentsRouter } from "./routers-comments";
import { notificationsRouter as notificationsRouterV2 } from "./routers-notifications";
import { analyticsRouter } from "./routers-analytics";
import { permissionsRouter } from "./routers-permissions";
import { auditRouter } from "./routers-audit";
import { approvalsRouter } from "./routers-approvals";
import { reportsRouter } from "./routers-reports";
import { actionsCrudRouter } from "./routers-actions-crud";
import { questionsCrudRouter } from "./routers-questions-crud";
import { auditLogsRouter } from "./routers-audit-logs";
import { permissionsCheckRouter } from "./routers-permissions-check";
import { sessionsRouter } from "./routers-sessions";
import { fluxoV3Router } from "./routers-fluxo-v3";
import { sessionQuestionnaireRouter } from "./routers-session-questionnaire";
import { sessionActionPlanRouter } from "./routers-session-action-plan";
import { sessionConsolidationRouter } from "./routers-session-consolidation";

export const appRouter = router({
  system: systemRouter,
  branches: branchesRouter,
  corporateAssessment: corporateAssessmentRouter,
  branchAssessment: branchAssessmentRouter,
  actionPlans: actionPlansRouter,
  tasksV2: tasksRouterV2,
  comments: commentsRouter,
  notificationsV2: notificationsRouterV2,
  analytics: analyticsRouter,
  permissions: permissionsRouter,
  audit: auditRouter,
  approvals: approvalsRouter,
  reports: reportsRouter,
  actionsCrud: actionsCrudRouter,
  questionsCrud: questionsCrudRouter,
  auditLogs: auditLogsRouter,
  permissionsCheck: permissionsCheckRouter,
  sessions: sessionsRouter,
  sessionQuestionnaire: sessionQuestionnaireRouter,
  sessionActionPlan: sessionActionPlanRouter,
  sessionConsolidation: sessionConsolidationRouter,
  fluxoV3: fluxoV3Router,
  
  // ==========================================================================
  // AUTH
  // ==========================================================================
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==========================================================================
  // PROJECTS
  // ==========================================================================
  
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getProjectsByUser(ctx.user.id, ctx.user.role);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });

        // Verificar acesso
        if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
          const hasAccess = await db.isUserInProject(ctx.user.id, input.id);
          if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
        }

        return project;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        clientId: z.number(),
        planPeriodMonths: z.number().optional(),
        notificationFrequency: z.enum(["diaria", "semanal", "apenas_atrasos", "marcos_importantes", "personalizada"]).optional(),
        notificationEmail: z.string().email().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const projectId = await db.createProject({
          ...input,
          status: "rascunho",
          createdById: ctx.user.id,
          createdByRole: ctx.user.role as any,
          notificationFrequency: input.notificationFrequency || "semanal",
        });

        return { projectId };
      }),

    update: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().optional(),
        planPeriodMonths: z.number().optional(),
        notificationFrequency: z.enum(["diaria", "semanal", "apenas_atrasos", "marcos_importantes", "personalizada"]).optional(),
        notificationEmail: z.string().email().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { projectId, ...data } = input;
        await validateProjectAccess(ctx, projectId);
        await db.updateProject(projectId, data);
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        status: z.enum([
          "rascunho",
          "assessment_fase1",
          "assessment_fase2",
          "matriz_riscos",
          "plano_acao",
          "em_avaliacao",
          "aprovado",
          "em_andamento",
          "parado",
          "concluido",
          "arquivado"
        ]),
      }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });

        // Regras de transição por papel
        const isEquipe = ctx.user.role === "equipe_solaris" || ctx.user.role === "advogado_senior";
        const currentStatus = project.status;
        const newStatus = input.status;

        // Transições permitidas para clientes (apenas solicitar aprovação)
        const clientAllowedTransitions: Record<string, string[]> = {
          rascunho: ["em_avaliacao"],
          assessment_fase1: ["em_avaliacao"],
          assessment_fase2: ["em_avaliacao"],
          matriz_riscos: ["em_avaliacao"],
          plano_acao: ["em_avaliacao"],
        };

        if (!isEquipe) {
          const allowed = clientAllowedTransitions[currentStatus] ?? [];
          if (!allowed.includes(newStatus)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Transição de '${currentStatus}' para '${newStatus}' não permitida para clientes. Apenas a equipe SOLARIS pode realizar esta mudança.`,
            });
          }
        }

        await db.updateProject(input.projectId, { status: newStatus });

        // Log da transição para auditoria
        console.log(`[updateStatus] Projeto ${input.projectId}: ${currentStatus} → ${newStatus} (por ${ctx.user.role} #${ctx.user.id})`);

        return {
          success: true,
          previousStatus: currentStatus,
          newStatus,
          changedBy: ctx.user.role,
        };
      }),
  }),

  // ==========================================================================
  // ASSESSMENT PHASE 1
  // ==========================================================================

  assessmentPhase1: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssessmentPhase1(input.projectId);
      }),

    save: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        taxRegime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]),
        companySize: z.enum(["mei", "pequena", "media", "grande"]),
        annualRevenue: z.string(),
        businessSector: z.string().optional(),
        mainActivity: z.string().optional(),
        employeeCount: z.number().optional(),
        hasAccountingDept: z.string().optional(),
        currentERPSystem: z.string().optional(),
        mainChallenges: z.string().optional(),
        complianceGoals: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        console.log('[assessmentPhase1.save] Recebido input:', JSON.stringify(input, null, 2));
        console.log('[assessmentPhase1.save] Usuário:', ctx.user.id, ctx.user.name);
        
        // Validar acesso ao projeto
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        
        // Equipe SOLARIS e Advogado Sênior têm acesso total
        if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
          // Cliente precisa estar vinculado ao projeto
          const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
          if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        try {
          // NÃO enviar campos completedAt, completedBy, completedByRole
          // para evitar bug do Drizzle ORM que converte undefined para "default"
          const { projectId, taxRegime, companySize, annualRevenue, businessSector, mainActivity, employeeCount, hasAccountingDept, currentERPSystem, mainChallenges, complianceGoals } = input;
          
          await db.saveAssessmentPhase1({
            projectId,
            taxRegime,
            companySize,
            annualRevenue,
            businessSector,
            mainActivity,
            employeeCount,
            hasAccountingDept,
            currentERPSystem,
            mainChallenges,
            complianceGoals,
          });
          console.log('[assessmentPhase1.save] Salvamento concluído com sucesso');
          return { success: true };
        } catch (error) {
          console.error('[assessmentPhase1.save] Erro ao salvar:', error);
          throw error;
        }
      }),

    complete: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        console.log('[assessmentPhase1.complete] Input recebido:', input);
        console.log('[assessmentPhase1.complete] User context:', ctx.user);
        
        if (!input.projectId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "projectId é obrigatório" });
        }
        
        const phase1 = await db.getAssessmentPhase1(input.projectId);
        if (!phase1) throw new TRPCError({ code: "NOT_FOUND", message: "Phase 1 not found" });

        await db.saveAssessmentPhase1({
          ...phase1,
          completedAt: new Date(),
          completedBy: ctx.user.id,
          completedByRole: ctx.user.role as any,
        });

        // Avançar status do projeto
        await db.updateProject(input.projectId, { status: "assessment_fase2" });

        return { success: true };
      }),

    // Workaround para transição manual (sem validações complexas)
    forceTransitionToPhase2: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input }) => {
        console.log('[forceTransitionToPhase2] Forçando transição para projectId:', input.projectId);
        
        // Apenas atualizar status do projeto
        await db.updateProject(input.projectId, { status: "assessment_fase2" });
        
        return { success: true };
      }),
  }),

  // ==========================================================================
  // ASSESSMENT PHASE 2
  // ==========================================================================

  assessmentPhase2: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        return await db.getAssessmentPhase2(input.projectId);
      }),

    generateQuestions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        const phase1 = await db.getAssessmentPhase1(input.projectId);
        if (!phase1) throw new TRPCError({ code: "BAD_REQUEST", message: "Complete Phase 1 first" });

        // Verificar se existe template compatível
        const template = await db.findCompatibleTemplate(
          phase1.taxRegime,
          phase1.businessSector || null,
          phase1.companySize
        );

        let questions;
        let usedTemplateId = null;

        if (template) {
          // Usar template
          questions = JSON.parse(template.questions);
          usedTemplateId = template.id;
        } else {
          // Gerar via IA
          const prompt = `Você é um especialista em compliance tributário brasileiro.

Com base nas informações da Fase 1 do assessment:
- Regime tributário: ${phase1.taxRegime}
- Tipo de negócio: ${phase1.businessSector}
- Porte da empresa: ${phase1.companySize}
- Faturamento anual: ${phase1.annualRevenue || "Não informado"}
- Número de funcionários: ${phase1.employeeCount || "Não informado"}
- Possui departamento contábil: ${phase1.hasAccountingDept ? "Sim" : "Não"}
- Atividade principal: ${phase1.mainActivity || "Não informado"}

Gere um questionário detalhado (15-25 perguntas) para avaliar a conformidade desta empresa com a reforma tributária brasileira (CBS, IBS, IS).

Foque em:
- Operações específicas do setor
- Fluxo de caixa e gestão financeira
- Processos internos de controle
- Relacionamento com fornecedores e clientes
- Sistemas de gestão utilizados
- Preparação para mudanças tributárias

Retorne APENAS JSON válido no formato:
{
  "questions": [
    {
      "id": "q1",
      "question": "Pergunta aqui",
      "type": "text|number|select|textarea",
      "options": ["opção 1", "opção 2"],
      "required": true
    }
  ]
}

IMPORTANTE: Todas as perguntas devem ter "required": true.`;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: "Você é um especialista em compliance tributário. Retorne apenas JSON válido." },
              { role: "user", content: prompt }
            ],
          });

          const rawContent = response.choices[0]?.message?.content;
          let content = typeof rawContent === 'string' ? rawContent : "{}";
          
          // Remover markdown code blocks se existirem (```json ... ``` ou ``` ... ```)
          content = content.trim();
          if (content.startsWith('```')) {
            // Remover primeira linha (```json ou ```)
            content = content.split('\n').slice(1).join('\n');
            // Remover última linha (```)
            content = content.split('\n').slice(0, -1).join('\n');
            content = content.trim();
          }
          
          const parsed = JSON.parse(content);
          questions = parsed.questions;
        }

        // Salvar
        await db.saveAssessmentPhase2({
          projectId: input.projectId,
          generatedQuestions: JSON.stringify(questions),
          answers: null,
          usedTemplateId,
          generatedAt: new Date(),
          completedAt: undefined,
          completedBy: undefined,
          completedByRole: undefined,
        });

        return { questions, usedTemplate: !!template };
      }),

    save: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        generatedQuestions: z.string().optional(),
        answers: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Validar acesso ao projeto
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        
        if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
          const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
          if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        const phase2 = await db.getAssessmentPhase2(input.projectId);
        if (!phase2) throw new TRPCError({ code: "NOT_FOUND", message: "Phase 2 not found" });

        await db.saveAssessmentPhase2({
          ...phase2,
          generatedQuestions: input.generatedQuestions || phase2.generatedQuestions,
          answers: input.answers || phase2.answers,
        });

        return { success: true };
      }),

    saveAnswers: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        answers: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input, ctx }) => {
        // Validar acesso ao projeto
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        
        if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
          const hasAccess = await db.isUserInProject(ctx.user.id, input.projectId);
          if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        const phase2 = await db.getAssessmentPhase2(input.projectId);
        if (!phase2) throw new TRPCError({ code: "NOT_FOUND", message: "Phase 2 not found" });

        await db.saveAssessmentPhase2({
          ...phase2,
          answers: JSON.stringify(input.answers),
        });

        return { success: true };
      }),

    complete: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const phase2 = await db.getAssessmentPhase2(input.projectId);
        if (!phase2) throw new TRPCError({ code: "NOT_FOUND", message: "Phase 2 not found" });

        await db.saveAssessmentPhase2({
          ...phase2,
          completedAt: new Date(),
          completedBy: ctx.user.id,
          completedByRole: ctx.user.role as any,
        });

        // Avançar status do projeto
        await db.updateProject(input.projectId, { status: "matriz_riscos" });

        return { success: true };
      }),
  }),

  // ==========================================================================
  // BRIEFING
  // ==========================================================================

  briefing: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Validar acesso ao projeto
        await validateProjectAccess(ctx, input.projectId);
        return await db.getBriefing(input.projectId);
      }),

    generate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Validar acesso ao projeto
        await validateProjectAccess(ctx, input.projectId);
        
        const phase1 = await db.getAssessmentPhase1(input.projectId);
        const phase2 = await db.getAssessmentPhase2(input.projectId);

        if (!phase1 || !phase2) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Complete assessment first" });
        }

        // Buscar dados do projeto e cliente
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        
        const client = await db.getUserById(project.clientId);
        
        // Processar respostas da Fase 2
        let answersText = "Nenhuma resposta registrada";
        if (phase2.answers) {
          try {
            const answersObj = typeof phase2.answers === 'string' ? JSON.parse(phase2.answers) : phase2.answers;
            const questions = phase2.generatedQuestions ? 
              (typeof phase2.generatedQuestions === 'string' ? JSON.parse(phase2.generatedQuestions) : phase2.generatedQuestions) : 
              { questions: [] };
            
            answersText = Object.entries(answersObj).map(([questionId, answer], index) => {
              const question = questions.questions?.find((q: any) => q.id === questionId);
              return `**Pergunta ${index + 1}:** ${question?.question || questionId}\n**Resposta:** ${answer}`;
            }).join('\n\n');
          } catch (e) {
            answersText = phase2.answers.toString();
          }
        }

        const prompt = `Você é um consultor tributário especializado em Reforma Tributária brasileira (LC 214/2025, EC 132/2023).

Analise os dados abaixo e gere um Levantamento Inicial completo para adequação à reforma tributária:

## DADOS DO CLIENTE
- Razão Social: ${client?.companyName || "Não informado"}
- CNPJ: ${client?.cnpj || "Não informado"}
- Email: ${client?.email || "Não informado"}
- Telefone: ${client?.phone || "Não informado"}
- Segmento: ${client?.segment || "Não informado"}

## DADOS DO PROJETO
- Nome: ${project.name}
- Regime Tributário Atual: ${project.taxRegime || phase1.taxRegime}
- Tipo de Negócio: ${project.businessType || phase1.businessSector}
- Porte: ${project.companySize || phase1.companySize}
- Período do Plano: ${project.planPeriodMonths || 12} meses

## AVALIAÇÃO FASE 1 (Dados Básicos)
- Regime Tributário: ${phase1.taxRegime}
- Porte da Empresa: ${phase1.companySize}
- Faturamento Anual: R$ ${phase1.annualRevenue || "Não informado"}
- Setor de Atuação: ${phase1.businessSector}
- Atividade Principal: ${phase1.mainActivity || "Não informado"}
- Número de Funcionários: ${phase1.employeeCount || "Não informado"}
- Possui Departamento Contábil: ${phase1.hasAccountingDept || "Não informado"}
- Sistema ERP Atual: ${phase1.currentERPSystem || "Não informado"}
- Principais Desafios: ${phase1.mainChallenges || "Não informado"}
- Objetivos de Compliance: ${phase1.complianceGoals || "Não informado"}

## AVALIAÇÃO FASE 2 (Questionário Detalhado)
${answersText}

## INSTRUÇÕES
Gere um documento de Levantamento Inicial estruturado em formato Markdown com as seguintes seções:

1. **Resumo Executivo** (200-300 palavras): Síntese dos principais achados e recomendações para gestores

2. **Perfil da Empresa**: Descrição detalhada do cliente com atividades, estrutura operacional e regime tributário atual

3. **Análise do Regime Tributário Atual**: Avaliação técnica dos tributos recolhidos, alíquotas efetivas e obrigações acessórias

4. **Impactos da Reforma Tributária**: 
   - Mudanças estruturais (extinção de PIS/COFINS/ISS/ICMS, criação de IBS/CBS)
   - Impactos quantitativos (estimativa de carga tributária no novo modelo)
   - Impactos operacionais (mudanças em sistemas e processos)

5. **Recomendações Estratégicas**: Lista priorizada de ações com:
   - Título da recomendação
   - Descrição e justificativa
   - Prazo sugerido
   - Complexidade (Baixa/Média/Alta)
   - Impacto (Baixo/Médio/Alto)

6. **Cronograma de Ações**: Linha do tempo com marcos importantes (2026-2033)

7. **Riscos e Oportunidades**: Cenários positivos e negativos identificados

8. **Próximos Passos**: Ações imediatas recomendadas

Use linguagem técnica mas acessível para contadores brasileiros.
Cite legislação quando relevante (LC 214/2025, EC 132/2023).
Seja específico e baseie-se nos dados fornecidos.

Retorne APENAS JSON válido no formato:
{
  "summaryText": "string (markdown com resumo executivo)",
  "gapsAnalysis": "string (markdown com análise completa do regime atual e impactos da reforma)",
  "riskLevel": "baixo|medio|alto|critico",
  "priorityAreas": "string (markdown com recomendações, cronograma, riscos e próximos passos)"
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um consultor de compliance. Retorne apenas JSON válido." },
            { role: "user", content: prompt }
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        let content = typeof rawContent === 'string' ? rawContent : "{}";
        
        // Remover markdown code blocks se existirem
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const parsed = JSON.parse(content);

        await db.saveBriefing({
          projectId: input.projectId,
          summaryText: parsed.summaryText,
          gapsAnalysis: parsed.gapsAnalysis,
          riskLevel: parsed.riskLevel,
          priorityAreas: parsed.priorityAreas || null,
          generatedAt: new Date(),
          generatedBy: ctx.user.id,
          version: 1,
        });

        return parsed;
      }),

    listVersions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Validar acesso ao projeto
        await validateProjectAccess(ctx, input.projectId);
        return await db.getBriefingVersions(input.projectId);
      }),

    getVersion: protectedProcedure
      .input(z.object({ 
        projectId: z.number(),
        version: z.number()
      }))
      .query(async ({ input, ctx }) => {
        // Validar acesso ao projeto
        await validateProjectAccess(ctx, input.projectId);
        return await db.getBriefingVersion(input.projectId, input.version);
      }),
  }),

  // ==========================================================================
  // RISK MATRIX
  // ==========================================================================

  riskMatrix: router({
    // Listar TODOS os riscos de TODOS os projetos (visão consolidada)
    listAll: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getAllRisks(ctx.user.id, ctx.user.role);
      }),

    // Listar todos os riscos de um projeto
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Validar acesso ao projeto
        await validateProjectAccess(ctx, input.projectId);
        return await db.getRiskMatrix(input.projectId);
      }),

    // Criar novo risco manualmente (simplificado - apenas título e descrição)
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        title: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Validar acesso ao projeto
        await validateProjectAccess(ctx, input.projectId);
        
        const riskId = await db.createRisk({
          projectId: input.projectId,
          title: input.title,
          description: input.description || "",
          createdBy: ctx.user.id,
        });
        
        return { id: riskId };
      }),

    // Deletar risco
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Buscar risco para validar acesso ao projeto
        const risk = await db.getRiskById(input.id);
        if (!risk) throw new TRPCError({ code: "NOT_FOUND", message: "Risk not found" });
        
        await validateProjectAccess(ctx, risk.projectId);
        await db.deleteRisk(input.id);
        
        return { success: true };
      }),

    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        return await db.getRiskMatrix(input.projectId);
      }),

    generate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        const briefing = await db.getBriefing(input.projectId);
        if (!briefing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Generate briefing first" });
        }

        // Salvar versão atual antes de regenerar (se existir)
        const currentRisks = await db.getRiskMatrix(input.projectId);
        if (currentRisks.length > 0) {
          const latestVersion = await db.getLatestVersionNumber(input.projectId);
          await db.saveRiskMatrixVersion({
            projectId: input.projectId,
            versionNumber: latestVersion + 1,
            snapshotData: JSON.stringify(currentRisks),
            riskCount: currentRisks.length,
            createdBy: ctx.user.id,
            createdByName: ctx.user.name || "Usuário",
            triggerType: latestVersion === 0 ? "auto_generation" : "manual_regeneration",
          });

          // Limpar riscos antigos
          await db.deleteRisksByProject(input.projectId);
        }

        const prompt = `Você é um especialista em gestão de riscos tributários.

Com base no briefing gerado:
- Resumo: ${briefing.summaryText}
- Gaps: ${briefing.gapsAnalysis}
- Risco Geral: ${briefing.riskLevel}

Identifique e classifique os riscos de conformidade com a reforma tributária.

Para cada risco, forneça:
- Descrição clara e específica
- Probabilidade de ocorrência (muito_baixa, baixa, media, alta, muito_alta)
- Impacto potencial (muito_baixo, baixo, medio, alto, muito_alto)
- Estratégia de tratamento (evitar, mitigar, transferir, aceitar)
- Controles sugeridos (ações preventivas)
- Evidências esperadas (documentos/registros)

Priorize riscos com maior impacto e probabilidade.

Retorne APENAS JSON válido no formato:
{
  "risks": [
    {
      "description": "string",
      "probability": "muito_baixa|baixa|media|alta|muito_alta",
      "impact": "muito_baixo|baixo|medio|alto|muito_alto",
      "treatmentStrategy": "string",
      "suggestedControls": "string",
      "expectedEvidence": "string"
    }
  ]
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um especialista em riscos. Retorne apenas JSON válido." },
            { role: "user", content: prompt }
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        let content = typeof rawContent === 'string' ? rawContent : "{}";
        
        // Remover markdown code blocks se existirem
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const parsed = JSON.parse(content);

        const risks = parsed.risks.map((r: any) => ({
          projectId: input.projectId,
          title: r.description.substring(0, 500), // Título: primeiros 500 chars da descrição
          description: r.description, // Descrição completa
          riskDescription: r.description, // Mantido para compatibilidade
          probability: r.probability,
          impact: r.impact,
          treatmentStrategy: r.treatmentStrategy,
          suggestedControls: r.suggestedControls,
          expectedEvidence: r.expectedEvidence,
          version: 1,
          generatedByAI: true,
          createdAt: new Date(),
          createdBy: ctx.user.id,
        }));

        await db.saveRiskMatrix(risks);

        // Avançar status
        await db.updateProject(input.projectId, { status: "plano_acao" });

        return { risks: parsed.risks };
      }),

    editViaPrompt: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        promptText: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        const currentRisks = await db.getRiskMatrix(input.projectId);
        if (currentRisks.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Generate matrix first" });
        }

        const currentVersion = currentRisks[0]?.version || 1;

        const prompt = `Você é um especialista em gestão de riscos tributários.

Matriz de riscos atual (versão ${currentVersion}):
${JSON.stringify(currentRisks, null, 2)}

Instrução do usuário:
"${input.promptText}"

Aplique as alterações solicitadas na matriz de riscos.
Mantenha a estrutura e formato JSON.
Preserve riscos não mencionados na instrução.

Retorne APENAS JSON válido no formato:
{
  "risks": [
    {
      "description": "string",
      "probability": "muito_baixa|baixa|media|alta|muito_alta",
      "impact": "muito_baixo|baixo|medio|alto|muito_alto",
      "treatmentStrategy": "string",
      "suggestedControls": "string",
      "expectedEvidence": "string"
    }
  ]
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um especialista em riscos. Retorne apenas JSON válido." },
            { role: "user", content: prompt }
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        let content = typeof rawContent === 'string' ? rawContent : "{}";
        
        // Remover markdown code blocks se existirem
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const parsed = JSON.parse(content);

        const newRisks = parsed.risks.map((r: any) => ({
          projectId: input.projectId,
          riskDescription: r.description,
          probability: r.probability,
          impact: r.impact,
          treatmentStrategy: r.treatmentStrategy,
          suggestedControls: r.suggestedControls,
          expectedEvidence: r.expectedEvidence,
          version: currentVersion + 1,
          generatedByAI: true,
          createdAt: new Date(),
          createdBy: ctx.user.id,
        }));

        await db.saveRiskMatrix(newRisks);

        // Salvar histórico
        await db.saveRiskPromptHistory({
          projectId: input.projectId,
          promptText: input.promptText,
          previousVersion: currentVersion,
          newVersion: currentVersion + 1,
          createdAt: new Date(),
          createdBy: ctx.user.id,
        });

        return { risks: parsed.risks, version: currentVersion + 1 };
      }),

    // Listar versões da matriz de riscos
    listVersions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        return await db.getRiskMatrixVersions(input.projectId);
      }),

    // Obter versão específica
    getVersion: protectedProcedure
      .input(z.object({ 
        projectId: z.number(),
        versionNumber: z.number()
      }))
      .query(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        const version = await db.getRiskMatrixVersion(input.projectId, input.versionNumber);
        if (!version) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
        }
        return {
          ...version,
          risks: JSON.parse(version.snapshotData)
        };
      }),

    // Comparar duas versões
    compareVersions: protectedProcedure
      .input(z.object({ 
        projectId: z.number(),
        version1: z.number(),
        version2: z.number()
      }))
      .query(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        
        const v1 = await db.getRiskMatrixVersion(input.projectId, input.version1);
        const v2 = await db.getRiskMatrixVersion(input.projectId, input.version2);
        
        if (!v1 || !v2) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
        }
        
        const risks1 = JSON.parse(v1.snapshotData);
        const risks2 = JSON.parse(v2.snapshotData);
        
        // Comparar riscos
        const added = risks2.filter((r2: any) => 
          !risks1.some((r1: any) => r1.riskDescription === r2.riskDescription)
        );
        
        const removed = risks1.filter((r1: any) => 
          !risks2.some((r2: any) => r2.riskDescription === r1.riskDescription)
        );
        
        const modified = risks2.filter((r2: any) => {
          const r1 = risks1.find((r: any) => r.riskDescription === r2.riskDescription);
          if (!r1) return false;
          return JSON.stringify(r1) !== JSON.stringify(r2);
        });
        
        const unchanged = risks2.filter((r2: any) => {
          const r1 = risks1.find((r: any) => r.riskDescription === r2.riskDescription);
          if (!r1) return false;
          return JSON.stringify(r1) === JSON.stringify(r2);
        });
        
        return {
          version1: v1,
          version2: v2,
          comparison: {
            added,
            removed,
            modified,
            unchanged
          }
        };
      }),
  }),

  // ==========================================================================
  // ACTION PLAN
  // ==========================================================================

  actionPlan: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Validar acesso ao projeto
        await validateProjectAccess(ctx, input.projectId);
        return await db.getActionPlan(input.projectId);
      }),

    generate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        console.log('[actionPlan.generate] Iniciando geração para projeto:', input.projectId);
        // Validar acesso ao projeto
        await validateProjectAccess(ctx, input.projectId);
        const project = await db.getProjectById(input.projectId);
        console.log('[actionPlan.generate] Projeto encontrado:', { id: project?.id, planPeriodMonths: project?.planPeriodMonths });
        if (!project?.planPeriodMonths) {
          console.error('[actionPlan.generate] ERRO: planPeriodMonths não definido');
          throw new TRPCError({ code: "BAD_REQUEST", message: "Define plan period first" });
        }

        // Buscar Levantamento Inicial (Briefing)
        const briefing = await db.getBriefing(input.projectId);
        console.log('[actionPlan.generate] Briefing encontrado:', !!briefing);
        if (!briefing) {
          console.error('[actionPlan.generate] ERRO: Briefing não encontrado');
          throw new TRPCError({ code: "BAD_REQUEST", message: "Generate briefing first" });
        }

        // Buscar Matriz de Riscos (opcional)
        const risks = await db.getRiskMatrix(input.projectId);
        console.log('[actionPlan.generate] Riscos encontrados:', risks.length);

        const prompt = `Você é um gerente de projetos especializado em compliance tributário.

Com base no Levantamento Inicial (Briefing) gerado:

## RESUMO EXECUTIVO
${briefing.summaryText}

## ANÁLISE DETALHADA
${briefing.gapsAnalysis}

## RECOMENDAÇÕES ESTRATÉGICAS
${briefing.priorityAreas || "Nenhuma recomendação específica"}

## NÍVEL DE RISCO GERAL
${briefing.riskLevel}

${risks.length > 0 ? `## MATRIZ DE RISCOS IDENTIFICADOS
${risks.map(r => `- ${r.title}: ${r.description || r.riskDescription || 'Sem descrição'}`).join('\n')}` : ''}

## PARÂMETROS DO PROJETO
- Período do plano: ${project.planPeriodMonths} meses
- Data de início: ${new Date().toISOString().split('T')[0]}

## INSTRUÇÕES
Gere um Plano de Ação detalhado e executável que transforme as recomendações estratégicas do briefing em tarefas concretas.

**Estrutura do Plano:**
- Organize em fases lógicas (Fase 1: Diagnóstico, Fase 2: Planejamento, Fase 3: Implementação, Fase 4: Monitoramento)
- Cada fase deve ter duração proporcional ao período total
- Priorize ações críticas nas primeiras fases
- Considere o nível de risco geral para definir urgência

**Para cada ação:**
- **Título:** Claro, objetivo e acionável (ex: "Mapear processos de faturamento")
- **Descrição:** Detalhada (o que fazer, como fazer, entregáveis esperados)
- **Responsável:** Função/área responsável (ex: "Contador", "Gestor Tributário", "Equipe de TI")
- **Prazo:** Data realista no formato YYYY-MM-DD (dentro do período total)
- **Prioridade:** "alta", "media" ou "baixa"
- **Dependências:** IDs de outras ações que devem ser concluídas antes (array vazio se não houver)
- **Indicadores de sucesso:** Métricas mensuráveis para validar conclusão
- **Estimativa de horas:** Número realista de horas de trabalho necessárias

**Diretrizes de Qualidade:**
- Extraia ações diretamente das recomendações do briefing
- Seja específico e prático (evite generalizações)
- Considere a realidade de empresas brasileiras
- Inclua ações de curto, médio e longo prazo
- Garanta que todas as recomendações estratégicas tenham ações correspondentes

Retorne APENAS JSON válido no formato:
{
  "phases": [
    {
      "name": "Fase 1: Diagnóstico e Mapeamento",
      "description": "Descrição da fase",
      "durationMonths": 2,
      "actions": [
        {
          "id": "action_1",
          "title": "Título da ação",
          "description": "Descrição detalhada",
          "responsible": "Função responsável",
          "dueDate": "2026-03-15",
          "priority": "alta",
          "dependencies": [],
          "indicators": "Indicadores de sucesso",
          "estimatedHours": 40
        }
      ]
    }
  ]
}`;

        console.log('[actionPlan.generate] Chamando LLM...');
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um gerente de projetos. Retorne apenas JSON válido." },
            { role: "user", content: prompt }
          ],
        });
        console.log('[actionPlan.generate] LLM respondeu');

        const rawContent = response.choices[0]?.message?.content;
        let content = typeof rawContent === 'string' ? rawContent : "{}";
        
        // Remover markdown code blocks se existirem
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        console.log('[actionPlan.generate] Parseando JSON...');
        const parsed = JSON.parse(content);
        console.log('[actionPlan.generate] JSON parseado com sucesso');

        console.log('[actionPlan.generate] Salvando no banco...');
        const planId = await db.saveActionPlan({
          projectId: input.projectId,
          planData: JSON.stringify(parsed),
          prompt: prompt, // Salvar o prompt usado
          detailedPlan: JSON.stringify(parsed, null, 2), // Salvar plano formatado
          version: 1,
          templateId: null,
          generatedAt: new Date(),
          generatedBy: ctx.user.id,
          generatedByAI: true,
          status: "em_avaliacao",
          approvedAt: undefined,
          approvedBy: undefined,
          rejectionReason: undefined,
        });

        console.log('[actionPlan.generate] Plano salvo com ID:', planId);

        // Avançar status
        await db.updateProject(input.projectId, { status: "em_avaliacao" });
        console.log('[actionPlan.generate] Status do projeto atualizado para em_avaliacao');

        console.log('[actionPlan.generate] Geração concluída com sucesso!');
        return { plan: parsed, planId };
      }),

    approve: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        planId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Apenas advogado sênior pode aprovar
        if (ctx.user.role !== "advogado_senior") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only senior lawyer can approve" });
        }

        await db.updateActionPlanStatus(input.planId, "aprovado", ctx.user.id);
        await db.updateProject(input.projectId, { status: "aprovado" });

        // Buscar plano aprovado
        const actionPlan = await db.getActionPlan(input.projectId);
        if (!actionPlan?.planData) {
          return { success: true, tasksCreated: 0 };
        }

        // Parsear dados do plano
        let planData;
        try {
          planData = typeof actionPlan.planData === 'string' 
            ? JSON.parse(actionPlan.planData) 
            : actionPlan.planData;
        } catch (e) {
          return { success: true, tasksCreated: 0 };
        }

        // Criar tarefas no Kanban a partir das ações do plano
        let tasksCreated = 0;
        if (planData.phases && Array.isArray(planData.phases)) {
          for (const phase of planData.phases) {
            if (phase.actions && Array.isArray(phase.actions)) {
              for (const action of phase.actions) {
                try {
                  await db.createTask({
                    projectId: input.projectId,
                    title: action.title || 'Ação sem título',
                    description: action.description || null,
                    category: 'corporate', // Padrão corporativo
                    responsibleArea: 'ADM', // Padrão administrativo
                    taskType: 'COMPLIANCE', // Padrão compliance
                    status: 'SUGGESTED',
                    priority: action.priority || 'media',
                    ownerId: ctx.user.id, // Owner é quem criou
                    startDate: new Date(), // Começa agora
                    deadline: action.dueDate ? new Date(action.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias padrão
                    estimatedHours: action.estimatedHours || null,
                    createdBy: ctx.user.id,
                  });
                  tasksCreated++;
                } catch (e) {
                  // Continuar mesmo se uma tarefa falhar
                  console.error(`Erro ao criar tarefa: ${action.title}`, e);
                }
              }
            }
          }
        }

        return { success: true, tasksCreated };
      }),

    reject: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        planId: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        // Apenas advogado sênior pode reprovar
        if (ctx.user.role !== "advogado_senior") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only senior lawyer can reject" });
        }

        await db.updateActionPlanStatus(input.planId, "reprovado", undefined, input.reason);
        await db.updateProject(input.projectId, { status: "plano_acao" });

        return { success: true };
      }),

    editViaPrompt: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        promptText: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        const currentPlan = await db.getActionPlan(input.projectId);
        if (!currentPlan) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Generate plan first" });
        }

        const currentVersion = currentPlan.version || 1;

        const prompt = `Você é um gerente de projetos especializado em compliance tributário.

Plano de ação atual (versão ${currentVersion}):
${currentPlan.planData}

Instrução do usuário:
"${input.promptText}"

Aplique as alterações solicitadas no plano de ação.
Mantenha a estrutura e formato JSON.
Preserve ações não mencionadas na instrução.
Ajuste dependências se necessário.

Retorne APENAS JSON válido no formato:
{
  "phases": [...]
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um gerente de projetos. Retorne apenas JSON válido." },
            { role: "user", content: prompt }
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : "{}";

        const newPlanId = await db.saveActionPlan({
          projectId: input.projectId,
          planData: content,
          version: currentVersion + 1,
          templateId: currentPlan.templateId,
          generatedAt: new Date(),
          generatedBy: ctx.user.id,
          generatedByAI: true,
          status: "em_avaliacao",
          approvedAt: undefined,
          approvedBy: undefined,
          rejectionReason: undefined,
        });

        // Salvar histórico
        await db.saveActionPlanPromptHistory({
          projectId: input.projectId,
          promptText: input.promptText,
          previousVersion: currentVersion,
          newVersion: currentVersion + 1,
          createdAt: new Date(),
          createdBy: ctx.user.id,
        });

        return { plan: JSON.parse(content), version: currentVersion + 1, planId: newPlanId };
      }),

    listVersions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Validar acesso ao projeto
        await validateProjectAccess(ctx, input.projectId);
        return await db.getActionPlanVersions(input.projectId);
      }),

    getVersion: protectedProcedure
      .input(z.object({ 
        projectId: z.number(),
        version: z.number()
      }))
      .query(async ({ input, ctx }) => {
        // Validar acesso ao projeto
        await validateProjectAccess(ctx, input.projectId);
        return await db.getActionPlanVersion(input.projectId, input.version);
      }),
  }),

  // ==========================================================================
  // TASKS
  // ==========================================================================

  tasks: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        return await db.getTasksByProject(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        status: z.enum(["SUGGESTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"]).default("SUGGESTED"),
        priority: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
        assignedTo: z.number().optional(),
        phaseId: z.number().optional(),
        riskId: z.number().optional(),
        estimatedHours: z.number().optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        const taskId = await db.createTask({
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          category: 'corporate', // TODO: permitir escolher
          responsibleArea: 'ADM', // TODO: permitir escolher
          taskType: 'COMPLIANCE', // TODO: permitir escolher
          status: input.status,
          priority: input.priority,
          ownerId: input.assignedTo || ctx.user.id,
          startDate: new Date(),
          deadline: input.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          phaseId: input.phaseId,
          riskId: input.riskId,
          estimatedHours: input.estimatedHours,
          createdBy: ctx.user.id,
        });

        return taskId;
      }),

    update: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        taskId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["SUGGESTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"]).optional(),
        priority: z.enum(["baixa", "media", "alta", "critica"]).optional(),
        assignedTo: z.number().optional(),
        phaseId: z.number().optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        const { taskId, projectId, ...updateData } = input;
        await db.updateTask(taskId, updateData);
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        taskId: z.number(),
        status: z.enum(["SUGGESTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        await db.updateTaskStatus(input.taskId, input.status);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        taskId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        await db.deleteTask(input.taskId);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // PHASES
  // ==========================================================================

  phases: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        return await db.getPhasesByProject(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        const phaseId = await db.createPhase({
          ...input,
          status: "planejada",
          createdAt: new Date(),
        });

        return { phaseId };
      }),
  }),

  // ==========================================================================
  // ACTION PLAN TEMPLATES
  // ==========================================================================

  templates: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllActionPlanTemplates();
    }),

    search: protectedProcedure
      .input(z.object({
        taxRegime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]).optional(),
        businessType: z.string().optional(),
        companySize: z.enum(["mei", "pequena", "media", "grande"]).optional(),
      }))
      .query(async ({ input }) => {
        return await db.searchActionPlanTemplates(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await db.getActionPlanTemplateById(input.id);
        if (!template) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
        }
        return template;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        taxRegime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]).optional(),
        businessType: z.string().optional(),
        companySize: z.enum(["mei", "pequena", "media", "grande"]).optional(),
        templateData: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Apenas equipe SOLARIS pode criar templates
        if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const templateId = await db.createActionPlanTemplate({
          ...input,
          createdBy: ctx.user.id,
          createdAt: new Date(),
          usageCount: 0,
        });

        return { templateId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        taxRegime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]).optional(),
        businessType: z.string().optional(),
        companySize: z.enum(["mei", "pequena", "media", "grande"]).optional(),
        templateData: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Apenas equipe SOLARIS pode editar templates
        if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { id, ...updateData } = input;
        await db.updateActionPlanTemplate(id, updateData);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Apenas equipe SOLARIS pode excluir templates
        if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.deleteActionPlanTemplate(input.id);
        return { success: true };
      }),

    applyTemplate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        templateId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await validateProjectAccess(ctx, input.projectId);
        const template = await db.getActionPlanTemplateById(input.templateId);
        if (!template) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
        }

        // Criar novo plano baseado no template
        const planId = await db.saveActionPlan({
          projectId: input.projectId,
          planData: template.templateData,
          version: 1,
          templateId: template.id,
          generatedAt: new Date(),
          generatedBy: ctx.user.id,
          generatedByAI: false,
          status: "em_avaliacao",
          approvedAt: undefined,
          approvedBy: undefined,
          rejectionReason: undefined,
        });

        // Incrementar contador de uso
        await db.incrementTemplateUsage(input.templateId);

        // Atualizar status do projeto
        await db.updateProject(input.projectId, { status: "plano_acao" });

        return { planId, plan: JSON.parse(template.templateData) };
      }),

    exportToPdf: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const template = await db.getActionPlanTemplateById(input.id);
        if (!template) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
        }

        // Gerar PDF do template
        const pdfBuffer = await generateTemplatePDF(template);
        
        // Retornar PDF como base64 para download no frontend
        return {
          filename: `template-${template.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`,
          data: pdfBuffer.toString('base64'),
        };
      }),
  }),

  // ==========================================================================
  // USERS (Admin)
  // ==========================================================================

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Apenas equipe SOLARIS pode listar usuários
      if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return await db.getAllUsers();
    }),

    listClients: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return await db.getUsersByRole("cliente");
    }),

    createClient: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        companyName: z.string().optional(),
        cnpj: z.string().optional(),
        cpf: z.string().optional(),
        segment: z.string().optional(),
        phone: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Apenas Equipe SOLARIS pode criar clientes
        if (ctx.user.role !== "equipe_solaris") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        const userId = await db.createUser({
          ...input,
          role: "cliente",
          openId: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        });

        return { userId };
      }),
  }),

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================
  
  dashboard: router({
    getKPIs: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        
        // Validar acesso
        if (project.clientId !== ctx.user.id && ctx.user.role === "cliente") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getDashboardKPIs(input.projectId);
      }),

    getTaskDistribution: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        
        if (project.clientId !== ctx.user.id && ctx.user.role === "cliente") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getTaskDistribution(input.projectId);
      }),

    getRiskDistribution: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        
        if (project.clientId !== ctx.user.id && ctx.user.role === "cliente") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getRiskDistribution(input.projectId);
      }),

    getOverdueTasks: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        
        if (project.clientId !== ctx.user.id && ctx.user.role === "cliente") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return await db.getOverdueTasks(input.projectId);
      }),
  }),

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================
  
  notifications: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        return await db.getNotificationsByUser(ctx.user.id, input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        recipientId: z.number(),
        type: z.string(),
        title: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Apenas equipe SOLARIS pode criar notificações
        if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const notificationId = await db.createNotification(input);
        return { notificationId };
      }),

     markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.notificationId);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // CLIENT MEMBERS (RF-1.03 / RF-5.17)
  // Gerenciamento de membros da equipe do cliente com papéis Admin/Colaborador/Visualizador
  // ==========================================================================
  clientMembers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getClientMembers(ctx.user.id);
    }),
    // RF-5.07: Busca membros do cliente vinculado a um projeto específico
    // Permite filtrar o dropdown de responsável no Plano de Ação pelos membros do cliente
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
        const members = await db.getClientMembers(project.clientId);
        // Retorna apenas membros ativos, ordenados por nome
        return members
          .filter(m => m.active !== false)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(m => ({ id: m.id, name: m.name, email: m.email, memberRole: m.memberRole }));
      }),
    add: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        email: z.string().email("E-mail inválido"),
        memberRole: z.enum(["admin", "colaborador", "visualizador"]).default("colaborador"),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.addClientMember({
          clientId: ctx.user.id,
          name: input.name,
          email: input.email,
          memberRole: input.memberRole,
          active: true,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        memberRole: z.enum(["admin", "colaborador", "visualizador"]).optional(),
        active: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar que o membro pertence ao cliente
        const members = await db.getClientMembers(ctx.user.id);
        const member = members.find(m => m.id === input.id);
        if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Membro não encontrado" });
        const { id, ...data } = input;
        await db.updateClientMember(id, data);
        return { success: true };
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const members = await db.getClientMembers(ctx.user.id);
        const member = members.find(m => m.id === input.id);
        if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Membro não encontrado" });
        await db.removeClientMember(input.id);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
