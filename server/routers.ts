import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

// ============================================================================
// HELPERS
// ============================================================================

const projectAccessMiddleware = protectedProcedure.use(async ({ ctx, next, rawInput }) => {
  const projectId = (rawInput as any).projectId;
  if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId is required" });

  const project = await db.getProjectById(projectId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

  // Equipe SOLARIS e Advogado Sênior têm acesso total
  if (ctx.user.role === "equipe_solaris" || ctx.user.role === "advogado_senior") {
    return next({ ctx: { ...ctx, project } });
  }

  // Cliente precisa estar vinculado ao projeto
  const hasAccess = await db.isUserInProject(ctx.user.id, projectId);
  if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

  return next({ ctx: { ...ctx, project } });
});

// ============================================================================
// MAIN ROUTER
// ============================================================================

export const appRouter = router({
  system: systemRouter,
  
  // ==========================================================================
  // USERS / CLIENTS
  // ==========================================================================
  
  users: router({    listClients: protectedProcedure.query(async ({ ctx }) => {
      // Apenas Equipe SOLARIS pode listar clientes
      if (ctx.user.role !== "equipe_solaris" && ctx.user.role !== "advogado_senior") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
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

    update: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        name: z.string().optional(),
        planPeriodMonths: z.number().optional(),
        notificationFrequency: z.enum(["diaria", "semanal", "apenas_atrasos", "marcos_importantes", "personalizada"]).optional(),
        notificationEmail: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const { projectId, ...data } = input;
        await db.updateProject(projectId, data);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // ASSESSMENT PHASE 1
  // ==========================================================================

  assessmentPhase1: router({
    get: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssessmentPhase1(input.projectId);
      }),

    save: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        taxRegime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]),
        businessType: z.string(),
        companySize: z.enum(["mei", "pequena", "media", "grande"]),
        annualRevenue: z.string().optional(),
        employeeCount: z.number().optional(),
        hasAccountingDept: z.boolean().optional(),
        mainActivity: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.saveAssessmentPhase1({
          ...input,
          completedBy: undefined,
          completedByRole: undefined,
          completedAt: undefined,
        });

        return { success: true };
      }),

    complete: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
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
  }),

  // ==========================================================================
  // ASSESSMENT PHASE 2
  // ==========================================================================

  assessmentPhase2: router({
    get: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssessmentPhase2(input.projectId);
      }),

    generateQuestions: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input }) => {
        const phase1 = await db.getAssessmentPhase1(input.projectId);
        if (!phase1) throw new TRPCError({ code: "BAD_REQUEST", message: "Complete Phase 1 first" });

        // Verificar se existe template compatível
        const template = await db.findCompatibleTemplate(
          phase1.taxRegime,
          phase1.businessType,
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
- Tipo de negócio: ${phase1.businessType}
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
      "text": "Pergunta aqui",
      "type": "text|multiple_choice|yes_no",
      "options": ["opção 1", "opção 2"]
    }
  ]
}`;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: "Você é um especialista em compliance tributário. Retorne apenas JSON válido." },
              { role: "user", content: prompt }
            ],
          });

          const content = response.choices[0]?.message?.content || "{}";
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

    saveAnswers: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        answers: z.record(z.any()),
      }))
      .mutation(async ({ input }) => {
        const phase2 = await db.getAssessmentPhase2(input.projectId);
        if (!phase2) throw new TRPCError({ code: "NOT_FOUND", message: "Phase 2 not found" });

        await db.saveAssessmentPhase2({
          ...phase2,
          answers: JSON.stringify(input.answers),
        });

        return { success: true };
      }),

    complete: projectAccessMiddleware
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
    get: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getBriefing(input.projectId);
      }),

    generate: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const phase1 = await db.getAssessmentPhase1(input.projectId);
        const phase2 = await db.getAssessmentPhase2(input.projectId);

        if (!phase1 || !phase2) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Complete assessment first" });
        }

        const prompt = `Você é um consultor sênior de compliance tributário.

Com base nas respostas completas do assessment:

Fase 1:
- Regime: ${phase1.taxRegime}
- Tipo de negócio: ${phase1.businessType}
- Porte: ${phase1.companySize}
- Faturamento: ${phase1.annualRevenue || "N/A"}
- Funcionários: ${phase1.employeeCount || "N/A"}
- Tem contabilidade: ${phase1.hasAccountingDept ? "Sim" : "Não"}
- Atividade: ${phase1.mainActivity || "N/A"}

Fase 2:
${phase2.answers || "{}"}

Gere um briefing executivo com:
1. Resumo Executivo (2-3 parágrafos)
2. Análise de Gaps (identificar lacunas de conformidade)
3. Nível de Risco Geral (baixo, médio, alto, crítico)
4. Áreas Prioritárias para Ação

Use linguagem profissional mas acessível.
Seja específico e cite exemplos das respostas.

Retorne APENAS JSON válido no formato:
{
  "summaryText": "string (markdown)",
  "gapsAnalysis": "string (markdown)",
  "riskLevel": "baixo|medio|alto|critico",
  "priorityAreas": "string (markdown)"
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um consultor de compliance. Retorne apenas JSON válido." },
            { role: "user", content: prompt }
          ],
        });

        const content = response.choices[0]?.message?.content || "{}";
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
  }),

  // ==========================================================================
  // RISK MATRIX
  // ==========================================================================

  riskMatrix: router({
    get: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRiskMatrix(input.projectId);
      }),

    generate: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const briefing = await db.getBriefing(input.projectId);
        if (!briefing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Generate briefing first" });
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

        const content = response.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(content);

        const risks = parsed.risks.map((r: any) => ({
          projectId: input.projectId,
          riskDescription: r.description,
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

    editViaPrompt: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        promptText: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
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

        const content = response.choices[0]?.message?.content || "{}";
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
  }),

  // ==========================================================================
  // ACTION PLAN
  // ==========================================================================

  actionPlan: router({
    get: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getActionPlan(input.projectId);
      }),

    generate: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project?.planPeriodMonths) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Define plan period first" });
        }

        const risks = await db.getRiskMatrix(input.projectId);
        if (risks.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Generate risk matrix first" });
        }

        const prompt = `Você é um gerente de projetos especializado em compliance tributário.

Com base na matriz de riscos:
${JSON.stringify(risks, null, 2)}

Período do plano: ${project.planPeriodMonths} meses

Gere um plano de ação detalhado e executável.

Para cada ação:
- Título claro e objetivo
- Descrição detalhada (o que fazer, como fazer)
- Risco vinculado (usar ID do risco)
- Responsável sugerido (função, não nome)
- Prazo realista (dentro do período total)
- Dependências de outras ações (se houver)
- Indicadores de sucesso
- Estimativa de horas de trabalho

Organize as ações em fases lógicas (Fase 1, Fase 2, Fase 3...).
Cada fase deve ter duração proporcional ao período total.
Priorize ações críticas nas primeiras fases.

Retorne APENAS JSON válido no formato:
{
  "phases": [
    {
      "name": "Fase 1",
      "description": "string",
      "durationMonths": number,
      "actions": [
        {
          "id": "action_1",
          "title": "string",
          "description": "string",
          "riskId": "string",
          "responsible": "string",
          "dueDate": "YYYY-MM-DD",
          "dependencies": ["action_id"],
          "indicators": "string",
          "estimatedHours": number
        }
      ]
    }
  ]
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um gerente de projetos. Retorne apenas JSON válido." },
            { role: "user", content: prompt }
          ],
        });

        const content = response.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(content);

        const planId = await db.saveActionPlan({
          projectId: input.projectId,
          planData: JSON.stringify(parsed),
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

        // Avançar status
        await db.updateProject(input.projectId, { status: "em_avaliacao" });

        return { plan: parsed, planId };
      }),

    approve: projectAccessMiddleware
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

        return { success: true };
      }),

    reject: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        planId: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Apenas advogado sênior pode reprovar
        if (ctx.user.role !== "advogado_senior") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only senior lawyer can reject" });
        }

        await db.updateActionPlanStatus(input.planId, "reprovado", undefined, input.reason);
        await db.updateProject(input.projectId, { status: "plano_acao" });

        return { success: true };
      }),

    editViaPrompt: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        promptText: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
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

        const content = response.choices[0]?.message?.content || "{}";

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
  }),

  // ==========================================================================
  // TASKS
  // ==========================================================================

  tasks: router({
    list: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTasksByProject(input.projectId);
      }),

    create: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        status: z.enum(["pendencias", "a_fazer", "em_andamento", "concluido"]).default("a_fazer"),
        priority: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
        assignedTo: z.number().optional(),
        phaseId: z.number().optional(),
        riskId: z.number().optional(),
        estimatedHours: z.number().optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const taskId = await db.createTask({
          ...input,
          createdBy: ctx.user.id,
          createdAt: new Date(),
        });

        return { taskId };
      }),

    update: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        taskId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["pendencias", "a_fazer", "em_andamento", "concluido"]).optional(),
        priority: z.enum(["baixa", "media", "alta", "critica"]).optional(),
        assignedTo: z.number().optional(),
        phaseId: z.number().optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { taskId, projectId, ...updateData } = input;
        await db.updateTask(taskId, updateData);
        return { success: true };
      }),

    updateStatus: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        taskId: z.number(),
        status: z.enum(["pendencias", "a_fazer", "em_andamento", "concluido"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateTaskStatus(input.taskId, input.status);
        return { success: true };
      }),

    delete: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        taskId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteTask(input.taskId);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // PHASES
  // ==========================================================================

  phases: router({
    list: projectAccessMiddleware
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPhasesByProject(input.projectId);
      }),

    create: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
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

    applyTemplate: projectAccessMiddleware
      .input(z.object({
        projectId: z.number(),
        templateId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
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
  }),
});

export type AppRouter = typeof appRouter;
