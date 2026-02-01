import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as dbAssessments from "./db-assessments";
import * as dbBranches from "./db-branches";
import { invokeLLM } from "./_core/llm";

// ============================================================================
// CORPORATE ASSESSMENT ROUTER (Questionário Corporativo)
// ============================================================================

export const corporateAssessmentRouter = router({
  // Buscar questionário corporativo de um projeto
  get: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await dbAssessments.getCorporateAssessment(input.projectId);
    }),

  // Gerar questionário corporativo com IA
  generate: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      taxRegime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]),
      companySize: z.enum(["mei", "pequena", "media", "grande"]),
      annualRevenue: z.string().optional(),
      employeeCount: z.number().optional(),
      hasInternationalOperations: z.boolean().default(false),
      hasAccountingDept: z.boolean().default(false),
      hasTaxDept: z.boolean().default(false),
      hasLegalDept: z.boolean().default(false),
      hasITDept: z.boolean().default(false),
      erpSystem: z.string().optional(),
      hasIntegratedSystems: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      // Gerar perguntas com IA
      const prompt = `Você é um especialista em compliance tributário brasileiro.

Gere um questionário corporativo para avaliar a preparação de uma empresa para a Reforma Tributária (Lei Complementar 214/2025).

**Contexto da empresa:**
- Regime tributário: ${input.taxRegime}
- Porte: ${input.companySize}
- Receita anual: ${input.annualRevenue || "Não informado"}
- Funcionários: ${input.employeeCount || "Não informado"}
- Operações internacionais: ${input.hasInternationalOperations ? "Sim" : "Não"}
- Departamentos: ${[
  input.hasAccountingDept && "Contábil",
  input.hasTaxDept && "Fiscal",
  input.hasLegalDept && "Jurídico",
  input.hasITDept && "TI"
].filter(Boolean).join(", ") || "Nenhum"}
- Sistema ERP: ${input.erpSystem || "Não informado"}
- Sistemas integrados: ${input.hasIntegratedSystems ? "Sim" : "Não"}

**Gere 15-20 perguntas focadas em:**
1. Estrutura organizacional e governança
2. Processos contábeis e fiscais atuais
3. Sistemas e tecnologia
4. Gestão de dados e documentos
5. Conhecimento da equipe sobre a reforma
6. Preparação atual para mudanças

**Formato de saída (JSON):**
{
  "questions": [
    {
      "id": "q1",
      "category": "estrutura|processos|sistemas|dados|conhecimento|preparacao",
      "question": "Texto da pergunta",
      "type": "text|boolean|multiple_choice|scale",
      "options": ["opcao1", "opcao2"] // apenas para multiple_choice
    }
  ]
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um especialista em compliance tributário. Responda sempre em JSON válido." },
          { role: "user", content: prompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "corporate_assessment",
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
                      category: { type: "string" },
                      question: { type: "string" },
                      type: { type: "string" },
                      options: { type: "array", items: { type: "string" } }
                    },
                    required: ["id", "category", "question", "type"],
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

      const content = response.choices[0].message.content;
      const questions = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

      // Salvar no banco
      const id = await dbAssessments.createCorporateAssessment({
        projectId: input.projectId,
        taxRegime: input.taxRegime,
        companySize: input.companySize,
        annualRevenue: input.annualRevenue,
        employeeCount: input.employeeCount,
        hasInternationalOperations: input.hasInternationalOperations,
        hasAccountingDept: input.hasAccountingDept,
        hasTaxDept: input.hasTaxDept,
        hasLegalDept: input.hasLegalDept,
        hasITDept: input.hasITDept,
        erpSystem: input.erpSystem,
        hasIntegratedSystems: input.hasIntegratedSystems,
        generatedQuestions: JSON.stringify(questions),
      });

      return { id, questions };
    }),

  // Salvar respostas do questionário corporativo
  saveAnswers: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      answers: z.any(), // JSON com respostas
    }))
    .mutation(async ({ input, ctx }) => {
      await dbAssessments.completeCorporateAssessment(
        input.projectId,
        input.answers,
        ctx.user.id
      );

      return { success: true };
    }),
});

// ============================================================================
// BRANCH ASSESSMENT ROUTER (Questionários por Ramo)
// ============================================================================

export const branchAssessmentRouter = router({
  // Listar questionários por ramo de um projeto
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await dbAssessments.getBranchAssessments(input.projectId);
    }),

  // Buscar questionário específico de um ramo
  get: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      branchId: z.number(),
    }))
    .query(async ({ input }) => {
      return await dbAssessments.getBranchAssessment(input.projectId, input.branchId);
    }),

  // Gerar questionário para um ramo específico
  generate: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      branchId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Buscar informações do ramo
      const branch = await dbBranches.getBranchById(input.branchId);
      if (!branch) {
        throw new Error("Ramo não encontrado");
      }

      // Buscar questionário corporativo para contexto
      const corporateAssessment = await dbAssessments.getCorporateAssessment(input.projectId);

      // Gerar perguntas com IA
      const prompt = `Você é um especialista em compliance tributário brasileiro.

Gere um questionário específico para o ramo de atividade "${branch.name}" (${branch.code}) para avaliar a preparação para a Reforma Tributária.

**Descrição do ramo:** ${branch.description}

${corporateAssessment ? `**Contexto corporativo:**
- Regime: ${corporateAssessment.taxRegime}
- Porte: ${corporateAssessment.companySize}
- Departamentos: ${[
  corporateAssessment.hasAccountingDept && "Contábil",
  corporateAssessment.hasTaxDept && "Fiscal",
  corporateAssessment.hasLegalDept && "Jurídico",
  corporateAssessment.hasITDept && "TI"
].filter(Boolean).join(", ")}` : ""}

**Gere 10-15 perguntas específicas sobre:**
1. Operações típicas deste ramo
2. Tributação específica (IBS, CBS, Imposto Seletivo)
3. Documentação fiscal necessária
4. Processos operacionais afetados
5. Sistemas e controles específicos

**Formato de saída (JSON):**
{
  "questions": [
    {
      "id": "q1",
      "category": "operacoes|tributacao|documentacao|processos|sistemas",
      "question": "Texto da pergunta",
      "type": "text|boolean|multiple_choice|scale",
      "options": ["opcao1", "opcao2"] // apenas para multiple_choice
    }
  ]
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um especialista em compliance tributário. Responda sempre em JSON válido." },
          { role: "user", content: prompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "branch_assessment",
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
                      category: { type: "string" },
                      question: { type: "string" },
                      type: { type: "string" },
                      options: { type: "array", items: { type: "string" } }
                    },
                    required: ["id", "category", "question", "type"],
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

      const content = response.choices[0].message.content;
      const questions = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

      // Salvar no banco
      const id = await dbAssessments.createBranchAssessment({
        projectId: input.projectId,
        branchId: input.branchId,
        generatedQuestions: JSON.stringify(questions),
      });

      return { id, questions, branch };
    }),

  // Salvar respostas de um questionário por ramo
  saveAnswers: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      answers: z.any(), // JSON com respostas
    }))
    .mutation(async ({ input, ctx }) => {
      await dbAssessments.completeBranchAssessment(
        input.assessmentId,
        input.answers,
        ctx.user.id
      );

      return { success: true };
    }),

  // Gerar questionários para TODOS os ramos de um projeto
  generateAll: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Buscar ramos do projeto
      const projectBranches = await dbBranches.getProjectBranches(input.projectId);

      const generated = [];

      for (const pb of projectBranches) {
        // Verificar se já existe questionário para este ramo
        const existing = await dbAssessments.getBranchAssessment(input.projectId, pb.branchId);
        
        if (!existing) {
          // Gerar novo questionário
          const result: any = await branchAssessmentRouter.createCaller(ctx).generate({
            projectId: input.projectId,
            branchId: pb.branchId,
          });
          
          generated.push(result);
        }
      }

      return { generated: generated.length, total: projectBranches.length };
    }),
});
