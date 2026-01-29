import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { updateUser, listUsers } from "./db";
import {
  createProject,
  getProjectById,
  updateProject,
  listProjectsByUser,
  addProjectParticipant,
  removeProjectParticipant,
  updateParticipantRole,
  listProjectParticipants,
  checkProjectAccess
} from "./db-projects";
import {
  saveAssessmentPhase1,
  getAssessmentPhase1,
  completeAssessmentPhase1,
  saveAssessmentPhase2,
  getAssessmentPhase2,
  completeAssessmentPhase2,
} from "./db-assessment";
import { saveBriefing, getBriefing } from "./db-briefing";
import {
  saveActionPlan,
  getActionPlan,
  approveActionPlan,
  searchTemplate,
  createTemplate,
  incrementTemplateUsage,
  listTemplates
} from "./db-action-plans";
import {
  createTask,
  getTaskById,
  updateTask,
  listTasksByProject,
  addTaskComment,
  getTaskComments,
  createSprint,
  updateSprint,
  listSprintsByProject,
  getActiveSprint,
  createCosoControl,
  updateCosoControl,
  listCosoControlsByProject,
  createMilestone,
  updateMilestone,
  listMilestonesByProject
} from "./db-tasks";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        companyName: z.string().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const success = await updateUser(ctx.user.id, input);
        return { success };
      }),
  }),
  
  users: router({
    list: protectedProcedure
      .input(z.object({
        role: z.enum(["admin", "client", "team_member"]).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        // Only admins can list users
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }
        return await listUsers(input?.role);
      }),
  }),

  projects: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        clientId: z.number().optional(),
        notificationFrequency: z.enum(["daily", "weekly", "on_delay", "milestones", "custom"]).default("weekly"),
        customNotificationDays: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can create projects
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }
        
        const projectId = await createProject({
          name: input.name,
          clientId: input.clientId || ctx.user.id,
          createdById: ctx.user.id,
          status: "draft",
          notificationFrequency: input.notificationFrequency,
          customNotificationDays: input.customNotificationDays,
        });
        
        if (!projectId) {
          throw new Error("Failed to create project");
        }
        
        // Add client as Product Owner if specified
        if (input.clientId) {
          await addProjectParticipant({
            projectId,
            userId: input.clientId,
            role: "product_owner",
          });
        }
        
        return { projectId };
      }),
    
    list: protectedProcedure.query(async ({ ctx }) => {
      return await listProjectsByUser(ctx.user.id, ctx.user.role);
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.id, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        return await getProjectById(input.id);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum([
          "draft",
          "assessment_phase1",
          "assessment_phase2",
          "briefing",
          "planning",
          "execution",
          "completed",
          "archived"
        ]).optional(),
        notificationFrequency: z.enum(["daily", "weekly", "on_delay", "milestones", "custom"]).optional(),
        customNotificationDays: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.id, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        const { id, ...data } = input;
        const success = await updateProject(id, data);
        return { success };
      }),
    
    addParticipant: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        userId: z.number(),
        role: z.enum(["product_owner", "scrum_master", "team_member", "observer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins and POs can add participants
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        const success = await addProjectParticipant(input);
        return { success };
      }),
    
    removeParticipant: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins and POs can remove participants
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        const success = await removeProjectParticipant(input.projectId, input.userId);
        return { success };
      }),
    
    updateParticipantRole: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        userId: z.number(),
        role: z.enum(["product_owner", "scrum_master", "team_member", "observer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins and POs can update roles
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        const success = await updateParticipantRole(input.projectId, input.userId, input.role);
        return { success };
      }),
    
    listParticipants: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        return await listProjectParticipants(input.projectId);
      }),
  }),
  
  assessment: router({
    savePhase1: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        taxRegime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]),
        businessType: z.string().min(1),
        companySize: z.enum(["mei", "micro", "pequena", "media", "grande"]),
        annualRevenue: z.number().optional(),
        employeeCount: z.number().optional(),
        hasInternationalOperations: z.boolean().default(false),
        mainActivity: z.string().optional(),
        stateOperations: z.string().optional(), // JSON string
      }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        const success = await saveAssessmentPhase1({
          ...input,
          annualRevenue: input.annualRevenue?.toString(),
        } as any);
        return { success };
      }),
    
    getPhase1: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        return await getAssessmentPhase1(input.projectId);
      }),
    
    completePhase1: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        const success = await completeAssessmentPhase1(input.projectId, ctx.user.id);
        
        // Update project status
        if (success) {
          await updateProject(input.projectId, { status: "assessment_phase2" });
        }
        
        return { success };
      }),
    
    generatePhase2Questions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        // Get phase 1 data
        const phase1 = await getAssessmentPhase1(input.projectId);
        if (!phase1) {
          throw new Error("Phase 1 not completed");
        }
        
        // Generate questions using LLM
        const prompt = `Você é um especialista em reforma tributária brasileira. Com base no perfil da empresa abaixo, gere 10-15 perguntas específicas e relevantes para identificar os desafios de adequação à reforma tributária.

PERFIL DA EMPRESA:
- Regime Tributário: ${phase1.taxRegime}
- Tipo de Negócio: ${phase1.businessType}
- Porte: ${phase1.companySize}
- Faturamento Anual: ${phase1.annualRevenue || 'Não informado'}
- Número de Funcionários: ${phase1.employeeCount || 'Não informado'}
- Operações Internacionais: ${phase1.hasInternationalOperations ? 'Sim' : 'Não'}
- Atividade Principal: ${phase1.mainActivity || 'Não informado'}
- Estados de Operação: ${phase1.stateOperations || 'Não informado'}

INSTRUÇÕES:
1. Foque em aspectos práticos e operacionais específicos do setor
2. Inclua perguntas sobre sistemas, processos, controles internos
3. Identifique potenciais gaps de compliance
4. Perguntas devem ser objetivas e mensuráveis
5. Categorize as perguntas em: sistemas, processos, controles, documentacao, pessoas

FORMATO DE RESPOSTA (JSON):
{
  "questions": [
    {
      "id": "q1",
      "question": "Texto da pergunta",
      "type": "text|number|select|multiselect|boolean",
      "options": ["opção1", "opção2"],
      "required": true|false,
      "category": "sistemas|processos|controles|documentacao|pessoas"
    }
  ]
}`;
        
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um especialista em reforma tributária brasileira e compliance fiscal." },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "assessment_questions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        question: { type: "string" },
                        type: { type: "string", enum: ["text", "number", "select", "multiselect", "boolean"] },
                        options: { type: "array", items: { type: "string" } },
                        required: { type: "boolean" },
                        category: { type: "string", enum: ["sistemas", "processos", "controles", "documentacao", "pessoas"] }
                      },
                      required: ["id", "question", "type", "required", "category"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["questions"],
                additionalProperties: false
              }
            }
          }
        });
        
        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          throw new Error("Failed to generate questions");
        }
        
        const questionsData = JSON.parse(content);
        
        // Save to database
        const success = await saveAssessmentPhase2({
          projectId: input.projectId,
          generatedQuestions: JSON.stringify(questionsData.questions),
        });
        
        return { success, questions: questionsData.questions };
      }),
    
    savePhase2: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        answers: z.string(), // JSON string
      }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        // Get existing phase 2
        const phase2 = await getAssessmentPhase2(input.projectId);
        if (!phase2) {
          throw new Error("Phase 2 questions not generated");
        }
        
        const success = await saveAssessmentPhase2({
          projectId: input.projectId,
          generatedQuestions: phase2.generatedQuestions,
          answers: input.answers,
        });
        
        return { success };
      }),
    
    getPhase2: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        return await getAssessmentPhase2(input.projectId);
      }),
    
    completePhase2: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        const success = await completeAssessmentPhase2(input.projectId, ctx.user.id);
        
        // Update project status
        if (success) {
          await updateProject(input.projectId, { status: "briefing" });
        }
        
        return { success };
      }),
  }),
  
  briefing: router({
    generate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        // Get assessment data
        const phase1 = await getAssessmentPhase1(input.projectId);
        const phase2 = await getAssessmentPhase2(input.projectId);
        
        if (!phase1 || !phase2 || !phase2.completedAt) {
          throw new Error("Assessment not completed");
        }
        
        // Generate briefing using LLM
        const prompt = `Você é um consultor especializado em reforma tributária brasileira e compliance fiscal. Analise as respostas do assessment abaixo e gere um briefing executivo completo.

RESPOSTAS FASE 1:
- Regime Tributário: ${phase1.taxRegime}
- Tipo de Negócio: ${phase1.businessType}
- Porte: ${phase1.companySize}
- Faturamento Anual: ${phase1.annualRevenue || 'Não informado'}
- Número de Funcionários: ${phase1.employeeCount || 'Não informado'}
- Operações Internacionais: ${phase1.hasInternationalOperations ? 'Sim' : 'Não'}
- Atividade Principal: ${phase1.mainActivity || 'Não informado'}
- Estados de Operação: ${phase1.stateOperations || 'Não informado'}

RESPOSTAS FASE 2:
${phase2.answers || 'Não disponível'}

INSTRUÇÕES:
1. Consolide as informações principais da empresa
2. Identifique gaps críticos de compliance em relação à reforma tributária
3. Classifique o nível de risco geral (low, medium, high, critical)
4. Liste áreas prioritárias de ação
5. Destaque pontos de atenção específicos do setor
6. A análise de gaps deve ser detalhada em markdown com seções: ## Gaps Identificados, ## Riscos, ## Recomendações Iniciais

FORMATO DE RESPOSTA (JSON):
{
  "summary": "Resumo executivo em 2-3 parágrafos",
  "gapsAnalysis": "Análise detalhada em markdown",
  "riskLevel": "low|medium|high|critical",
  "priorityAreas": ["area1", "area2", "area3"]
}`;
        
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um consultor especializado em reforma tributária brasileira e compliance fiscal." },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "briefing_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  gapsAnalysis: { type: "string" },
                  riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  priorityAreas: { type: "array", items: { type: "string" } }
                },
                required: ["summary", "gapsAnalysis", "riskLevel", "priorityAreas"],
                additionalProperties: false
              }
            }
          }
        });
        
        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          throw new Error("Failed to generate briefing");
        }
        
        const briefingData = JSON.parse(content);
        
        // Save to database
        const success = await saveBriefing({
          projectId: input.projectId,
          summaryText: briefingData.summary,
          gapsAnalysis: briefingData.gapsAnalysis,
          riskLevel: briefingData.riskLevel as any,
          priorityAreas: JSON.stringify(briefingData.priorityAreas),
          generatedBy: ctx.user.id,
        });
        
        // Update project status
        if (success) {
          await updateProject(input.projectId, { status: "planning" });
        }
        
        return { success, briefing: briefingData };
      }),
    
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        return await getBriefing(input.projectId);
      }),
  }),
  
  actionPlan: router({
    generate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        // Get required data
        const phase1 = await getAssessmentPhase1(input.projectId);
        const briefing = await getBriefing(input.projectId);
        
        if (!phase1 || !briefing) {
          throw new Error("Assessment and briefing must be completed first");
        }
        
        // Search for compatible template
        const template = await searchTemplate(
          phase1.businessType,
          phase1.taxRegime,
          phase1.companySize
        );
        
        let planData: any;
        let templateId: number | null = null;
        
        if (template) {
          // Adapt existing template
          templateId = template.id;
          await incrementTemplateUsage(template.id);
          
          const adaptPrompt = `Você é um especialista em gestão de projetos de compliance tributária. Adapte o template de plano de ação abaixo para o contexto específico desta empresa.

TEMPLATE BASE:
${template.templateData}

CONTEXTO ESPECÍFICO:
${briefing.summaryText}

GAPS IDENTIFICADOS:
${briefing.gapsAnalysis}

INSTRUÇÕES:
1. Mantenha a estrutura geral do template
2. Ajuste tarefas, prazos e prioridades conforme os gaps identificados
3. Adicione tarefas específicas se necessário
4. Remova tarefas não aplicáveis
5. Ajuste estimativas de horas conforme o porte da empresa

Retorne o plano completo no mesmo formato JSON do template.`;
          
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "Você é um especialista em gestão de projetos de compliance tributária." },
              { role: "user", content: adaptPrompt }
            ]
          });
          
          const content = response.choices[0]?.message?.content;
          if (!content || typeof content !== 'string') {
            throw new Error("Failed to adapt template");
          }
          
          planData = JSON.parse(content);
        } else {
          // Generate new plan from scratch
          const generatePrompt = `Você é um especialista em gestão de projetos de compliance tributária. Crie um plano de ação detalhado para adequação à reforma tributária brasileira.

CONTEXTO:
${briefing.summaryText}

GAPS IDENTIFICADOS:
${briefing.gapsAnalysis}

PERFIL DA EMPRESA:
- Regime Tributário: ${phase1.taxRegime}
- Tipo de Negócio: ${phase1.businessType}
- Porte: ${phase1.companySize}

INSTRUÇÕES:
1. Crie tarefas específicas, mensuráveis e com prazos realistas
2. Organize tarefas em fases lógicas (diagnóstico, planejamento, implementação, validação)
3. Defina dependências entre tarefas
4. Associe tarefas aos componentes do framework COSO
5. Estime horas necessárias para cada tarefa
6. Defina marcos importantes (milestones)
7. Inclua tarefas de treinamento, documentação e validação

FORMATO DE RESPOSTA (JSON):
{
  "phases": [
    {
      "name": "Nome da Fase",
      "duration": "2 semanas",
      "tasks": [...]
    }
  ],
  "tasks": [
    {
      "title": "Título da tarefa",
      "description": "Descrição detalhada",
      "taskType": "compliance|documentation|training|system|review|other",
      "priority": "low|medium|high|critical",
      "estimatedHours": 8,
      "dependsOn": ["task_id1"],
      "cosoFramework": "control_environment|risk_assessment|control_activities|information_communication|monitoring",
      "dueDate": "2026-03-15"
    }
  ],
  "milestones": [
    {
      "name": "Marco importante",
      "description": "Descrição",
      "targetDate": "2026-04-01"
    }
  ],
  "cosoControls": [
    {
      "category": "risk_assessment",
      "controlName": "Nome do controle",
      "description": "Descrição",
      "riskLevel": "high"
    }
  ]
}`;
          
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "Você é um especialista em gestão de projetos de compliance tributária." },
              { role: "user", content: generatePrompt }
            ]
          });
          
          const content = response.choices[0]?.message?.content;
          if (!content || typeof content !== 'string') {
            throw new Error("Failed to generate plan");
          }
          
          planData = JSON.parse(content);
          
          // Create template for future use
          const templateName = `Template - ${phase1.businessType} (${phase1.taxRegime})`;
          await createTemplate({
            name: templateName,
            businessType: phase1.businessType,
            taxRegime: phase1.taxRegime,
            companySize: phase1.companySize,
            templateData: JSON.stringify(planData),
            createdBy: ctx.user.id,
            usageCount: 1,
          });
        }
        
        // Save action plan
        const success = await saveActionPlan({
          projectId: input.projectId,
          templateId,
          planData: JSON.stringify(planData),
          generatedBy: ctx.user.id,
        });
        
        return { success, plan: planData };
      }),
    
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        return await getActionPlan(input.projectId);
      }),
    
    approve: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) {
          throw new Error("Unauthorized");
        }
        
        const success = await approveActionPlan(input.projectId, ctx.user.id);
        
        // Update project status
        if (success) {
          await updateProject(input.projectId, { status: "execution" });
        }
        
        return { success };
      }),
  }),
  
  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can list templates
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }
      return await listTemplates();
    }),
  }),
  
  tasks: router({
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sprintId: z.number().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        taskType: z.enum(["compliance", "documentation", "training", "system", "review", "other"]).default("other"),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        assignedTo: z.number().optional(),
        estimatedHours: z.number().optional(),
        dueDate: z.string().optional(),
        cosoFramework: z.enum(["control_environment", "risk_assessment", "control_activities", "information_communication", "monitoring"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) throw new Error("Unauthorized");
        
        const { estimatedHours, dueDate, ...rest } = input;
        const taskId = await createTask({
          ...rest,
          estimatedHours: estimatedHours?.toString(),
          dueDate: dueDate ? new Date(dueDate) : undefined,
          status: "backlog"
        });
        return { taskId };
      }),
    
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        status: z.string().optional(),
        assignedTo: z.number().optional(),
        sprintId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) throw new Error("Unauthorized");
        
        const { projectId, ...filters } = input;
        return await listTasksByProject(projectId, filters);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number(),
        status: z.enum(["backlog", "todo", "in_progress", "review", "done", "blocked"]).optional(),
        assignedTo: z.number().optional(),
        actualHours: z.number().optional(),
        blockedReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) throw new Error("Unauthorized");
        
        const { id, projectId, actualHours, ...data } = input;
        const success = await updateTask(id, {
          ...data,
          actualHours: actualHours?.toString()
        });
        return { success };
      }),
    
    addComment: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        projectId: z.number(),
        comment: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) throw new Error("Unauthorized");
        
        const success = await addTaskComment({
          taskId: input.taskId,
          userId: ctx.user.id,
          comment: input.comment,
        });
        return { success };
      }),
  }),
  
  sprints: router({
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1),
        goal: z.string().optional(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) throw new Error("Unauthorized");
        
        const sprintId = await createSprint({
          ...input,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          status: "planned"
        });
        return { sprintId };
      }),
    
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) throw new Error("Unauthorized");
        
        return await listSprintsByProject(input.projectId);
      }),
    
    activate: protectedProcedure
      .input(z.object({ id: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) throw new Error("Unauthorized");
        
        const success = await updateSprint(input.id, { status: "active" });
        return { success };
      }),
    
    complete: protectedProcedure
      .input(z.object({ id: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) throw new Error("Unauthorized");
        
        const success = await updateSprint(input.id, { status: "completed" });
        return { success };
      }),
  }),
  
  coso: router({
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        category: z.enum(["control_environment", "risk_assessment", "control_activities", "information_communication", "monitoring"]),
        controlName: z.string().min(1),
        description: z.string().optional(),
        riskLevel: z.enum(["low", "medium", "high", "critical"]),
        responsibleUserId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) throw new Error("Unauthorized");
        
        const controlId = await createCosoControl({ ...input, status: "not_started" });
        return { controlId };
      }),
    
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        category: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) throw new Error("Unauthorized");
        
        return await listCosoControlsByProject(input.projectId, input.category);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number(),
        status: z.enum(["not_started", "in_progress", "implemented", "validated"]).optional(),
        implementationDate: z.string().optional(),
        validationDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const hasAccess = await checkProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        if (!hasAccess) throw new Error("Unauthorized");
        
        const { id, projectId, ...data } = input;
        const success = await updateCosoControl(id, data as any);
        return { success };
      }),
  }),
});






export type AppRouter = typeof appRouter;
