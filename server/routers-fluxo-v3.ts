/**
 * Router do Novo Fluxo v3.0 — 5 Etapas de Compliance Tributário
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { projects, questionnaireAnswersV3, questionnaireProgressV3 } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const CnaeSchema = z.object({
  code: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(100),
  justification: z.string().optional(),
});

export const fluxoV3Router = router({

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Criar projeto
  // ─────────────────────────────────────────────────────────────────────────
  createProject: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Nome é obrigatório"),
      description: z.string().min(50, "Descrição deve ter pelo menos 50 caracteres"),
      clientId: z.number({ message: "Cliente é obrigatório" }),
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
      } as any);
      return { projectId };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Extrair CNAEs via IA
  // ─────────────────────────────────────────────────────────────────────────
  extractCnaes: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      description: z.string().min(50),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Você é um especialista em tributação brasileira e classificação CNAE. Responda sempre em JSON válido.",
          },
          {
            role: "user",
            content: `Analise a descrição do negócio abaixo e identifique entre 2 e 6 CNAEs mais relevantes.

DESCRIÇÃO DO NEGÓCIO:
${input.description}

Para cada CNAE forneça: código (ex: 6201-5/01), descrição oficial, confidence (0-100) e justificativa breve.
Considere a Reforma Tributária brasileira (IBS, CBS, IS) ao identificar os CNAEs mais impactados.

Responda em JSON:
{"cnaes": [{"code": "XXXX-X/XX", "description": "...", "confidence": 95, "justification": "..."}]}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "IA não retornou resposta" });
      }

      // Extrair JSON da resposta (pode vir com markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Resposta da IA inválida" });

      const parsed = JSON.parse(jsonMatch[0]);
      return { cnaes: parsed.cnaes || [] };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 1: Refinar CNAEs via feedback do usuário (loop de aprovação PG-05)
  // ─────────────────────────────────────────────────────────────────────────
  refineCnaes: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      description: z.string().min(50),
      feedback: z.string().min(5, "Descreva o que precisa ser ajustado"),
      currentCnaes: z.array(CnaeSchema),
      iteration: z.number().default(1),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });

      const currentList = input.currentCnaes.map(c =>
        `- ${c.code}: ${c.description} (confiança: ${c.confidence}%)`
      ).join("\n");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Você é um especialista em tributação brasileira e classificação CNAE. Responda sempre em JSON válido.",
          },
          {
            role: "user",
            content: `Você já sugeriu os seguintes CNAEs para este negócio (iteração ${input.iteration}):

${currentList}

O usuário fez o seguinte feedback:
"${input.feedback}"

Descrição original do negócio:
${input.description}

Com base no feedback, revise a lista de CNAEs. Mantenha os que estão corretos, ajuste os que precisam de correção e adicione os que estão faltando.
Retorne entre 2 e 6 CNAEs.

Responda em JSON:
{"cnaes": [{"code": "XXXX-X/XX", "description": "...", "confidence": 95, "justification": "..."}]}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "IA não retornou resposta" });
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Resposta da IA inválida" });

      const parsed = JSON.parse(jsonMatch[0]);
      return { cnaes: parsed.cnaes || [], iteration: input.iteration + 1 };
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

      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({
          confirmedCnaes: input.cnaes as any,
          currentStep: 2,
          status: "assessment_fase1",
        } as any)
        .where(eq(projects.id, input.projectId));

      return { success: true, nextStep: 2 };
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

      const userId = await db.createUser({
        name: input.companyName,
        email: input.email || `cliente-${Date.now()}@solaris.temp`,
        companyName: input.companyName,
        cnpj: input.cnpj,
        phone: input.phone,
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
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        id: project.id,
        name: project.name,
        description: (project as any).description,
        clientId: project.clientId,
        confirmedCnaes: (project as any).confirmedCnaes,
        currentStep: (project as any).currentStep ?? 1,
        status: project.status,
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Gerar perguntas do questionário para um CNAE
  // ─────────────────────────────────────────────────────────────────────────
  generateQuestions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaeCode: z.string(),
      cnaeDescription: z.string(),
      level: z.enum(["nivel1", "nivel2"]),
      previousAnswers: z.array(z.object({
        question: z.string(),
        answer: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const projectDescription = (project as any).description || "";
      const nivel2Context = input.level === "nivel2" && input.previousAnswers?.length
        ? `\nRESPOSTAS DO NÍVEL 1:\n${input.previousAnswers.map(a => `P: ${a.question}\nR: ${a.answer}`).join("\n\n")}\n\nGere perguntas de APROFUNDAMENTO baseadas nessas respostas.`
        : "";

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um especialista em compliance tributário brasileiro (Reforma Tributária — LC 214/2025, IBS, CBS, IS).
Gere perguntas de diagnóstico para identificar impactos da Reforma Tributária.
Tipos de campo disponíveis: sim_nao, multipla_escolha, escala_likert, texto_curto, texto_longo, selecao_unica.
Responda APENAS com JSON válido.`,
          },
          {
            role: "user",
            content: `CNAE: ${input.cnaeCode} — ${input.cnaeDescription}
DESCRIÇÃO DA EMPRESA: ${projectDescription}
NÍVEL: ${input.level === "nivel1" ? "1 (perguntas essenciais, máximo 10)" : "2 (aprofundamento, máximo 10)"}
${nivel2Context}

Gere as perguntas no formato:
{"questions": [{"id": "q1", "text": "...", "type": "sim_nao", "required": true, "options": [], "scale_labels": {"min": "Nunca", "max": "Sempre"}, "placeholder": "..."}]}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Resposta da IA inválida" });

      const parsed = JSON.parse(jsonMatch[0]);
      return { questions: parsed.questions || [] };
    }),
  // ───────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Salvar resposta individual (persistência granular)
  // ───────────────────────────────────────────────────────────────────────────
  saveAnswer: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cnaeCode: z.string(),
      cnaeDescription: z.string().optional(),
      level: z.enum(["nivel1", "nivel2"]),
      questionIndex: z.number(),
      questionText: z.string(),
      questionType: z.string().optional(),
      answerValue: z.string(),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const existing = await database
        .select()
        .from(questionnaireAnswersV3)
        .where(
          and(
            eq(questionnaireAnswersV3.projectId, input.projectId),
            eq(questionnaireAnswersV3.cnaeCode, input.cnaeCode),
            eq(questionnaireAnswersV3.level, input.level),
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
          questionIndex: input.questionIndex,
          questionText: input.questionText,
          questionType: input.questionType,
          answerValue: input.answerValue,
        });
      }
      return { success: true };
    }),

  // ───────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Recuperar progresso salvo do questionário
  // ───────────────────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────────────────
  // ETAPA 2: Salvar progresso do questionário e avançar para Etapa 3  // ─────────────────────────────────────────────────────────────────────────
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
        updateData.status = "assessment_fase2";
      }
      await database
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, input.projectId));
      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 3: Gerar Briefing de Compliance
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

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um especialista sênior em compliance tributário brasileiro (Reforma Tributária — LC 214/2025).
Gere um Briefing de Compliance completo e profissional em Markdown com as seções:
1. **Resumo Executivo** (nível de risco: Baixo/Médio/Alto/Crítico)
2. **Análise por CNAE** (impactos específicos da Reforma)
3. **Principais Gaps de Compliance**
4. **Oportunidades**
5. **Recomendações Prioritárias** (top 5 ações imediatas)
Use linguagem técnica mas acessível. Seja específico e objetivo.`,
          },
          {
            role: "user",
            content: `PROJETO: ${project.name}
DESCRIÇÃO: ${(project as any).description || ""}

RESPOSTAS DO QUESTIONÁRIO:
${answersText}
${correctionContext}
${complementContext}

Gere o Briefing de Compliance completo.`,
          },
        ],
      });

      const briefingContent = response.choices[0]?.message?.content;
      if (!briefingContent || typeof briefingContent !== "string") {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Salvar briefing no banco
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ briefingContent: briefingContent as any, currentStep: 3 } as any)
        .where(eq(projects.id, input.projectId));

      return { briefing: briefingContent };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 3: Aprovar Briefing
  // ─────────────────────────────────────────────────────────────────────────
  approveBriefing: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      briefingContent: z.string(),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ currentStep: 4, status: "matriz_riscos", briefingContent: input.briefingContent as any } as any)
        .where(eq(projects.id, input.projectId));
      return { success: true, nextStep: 4 };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 4: Gerar Matrizes de Riscos
  // ─────────────────────────────────────────────────────────────────────────
  generateRiskMatrices: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      briefingContent: z.string(),
      area: z.enum(["contabilidade", "negocio", "ti", "juridico"]).optional(),
      adjustment: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
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

      for (const area of areas) {
        const adjustmentContext = input.adjustment ? `\n\nAJUSTE SOLICITADO: ${input.adjustment}` : "";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Você é um especialista em gestão de riscos tributários (Reforma Tributária — LC 214/2025).
Gere uma Matriz de Riscos para a área de ${areaNames[area]}.
Para cada risco: evento, probabilidade (Baixa/Média/Alta), impacto (Baixo/Médio/Alto), severidade (Baixa/Média/Alta/Crítica), plano_acao.
Gere entre 5 e 10 riscos. Responda APENAS com JSON válido.`,
            },
            {
              role: "user",
              content: `BRIEFING DO PROJETO:
${input.briefingContent}

ÁREA: ${areaNames[area]}
${adjustmentContext}

Formato: {"risks": [{"id": "r1", "evento": "...", "probabilidade": "Alta", "impacto": "Alto", "severidade": "Crítica", "plano_acao": "..."}]}`,
            },
          ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") continue;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;

        const parsed = JSON.parse(jsonMatch[0]);
        matrices[area] = parsed.risks || [];
      }

      return { matrices };
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
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ currentStep: 5, status: "plano_acao", riskMatricesData: input.matrices as any } as any)
        .where(eq(projects.id, input.projectId));
      return { success: true, nextStep: 5 };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // ETAPA 5: Gerar Plano de Ação
  // ─────────────────────────────────────────────────────────────────────────
  generateActionPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      matrices: z.record(z.string(), z.array(z.any())),
      area: z.enum(["contabilidade", "negocio", "ti", "juridico"]).optional(),
      adjustment: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const areas = input.area ? [input.area] : ["contabilidade", "negocio", "ti", "juridico"];
      const plans: Record<string, any[]> = {};
      const areaNames: Record<string, string> = {
        contabilidade: "Contabilidade e Fiscal",
        negocio: "Áreas de Negócio",
        ti: "Tecnologia da Informação",
        juridico: "Advocacia Tributária",
      };

      for (const area of areas) {
        const areaRisks = input.matrices[area] || [];
        const adjustmentContext = input.adjustment ? `\n\nAJUSTE SOLICITADO: ${input.adjustment}` : "";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Você é um especialista em planejamento de compliance tributário.
Gere um Plano de Ação para a área de ${areaNames[area]} baseado nos riscos identificados.
Para cada tarefa: titulo, descricao, area, prazo_sugerido (30/60/90 dias), prioridade (Alta/Média/Baixa), responsavel_sugerido.
Gere entre 3 e 8 tarefas. Responda APENAS com JSON válido.`,
            },
            {
              role: "user",
              content: `ÁREA: ${areaNames[area]}
RISCOS: ${JSON.stringify(areaRisks, null, 2)}
${adjustmentContext}

Formato: {"tasks": [{"id": "t1", "titulo": "...", "descricao": "...", "area": "${area}", "prazo_sugerido": "30 dias", "prioridade": "Alta", "responsavel_sugerido": "..."}]}`,
            },
          ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") continue;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;

        const parsed = JSON.parse(jsonMatch[0]);
        plans[area] = (parsed.tasks || []).map((t: any) => ({
          ...t,
          status: "nao_iniciado",
          progress: 0,
          startDate: null,
          endDate: null,
          responsible: null,
          comments: [],
          notifications: { beforeDays: 7, onStatusChange: true, onProgressUpdate: false, onComment: false },
        }));
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
    .mutation(async ({ input }) => {
      const project = await db.getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const currentPlans = (project as any).actionPlansData || {};;
      const areaTasks = currentPlans[input.area] || [];
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
      return { success: true };
    }),
  // ───────────────────────────────────────────────────────────────────────────
  // ETAPA 5: Aprovar plano de ação
  // ─────────────────────────────────────────────────────────────────────────
  approveActionPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      plans: z.record(z.string(), z.array(z.any())),
    }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(projects)
        .set({ currentStep: 5, status: "aprovado", actionPlansData: input.plans as any } as any)
        .where(eq(projects.id, input.projectId));
      return { success: true };
    }),
});
