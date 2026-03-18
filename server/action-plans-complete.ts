// ============================================================================
// DB HELPERS - ACTION PLANS
// ============================================================================

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { 
  corporateActionPlans,
  InsertCorporateActionPlan,
  branchActionPlans,
  InsertBranchActionPlan,
  actionPlanPrompts,
  InsertActionPlanPrompt,
} from "../drizzle/schema";

// Corporate Action Plans
export async function getCorporateActionPlan(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(corporateActionPlans).where(eq(corporateActionPlans.projectId, projectId)).limit(1);
  return result[0] || null;
}

export async function createCorporateActionPlan(data: InsertCorporateActionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(corporateActionPlans).values(data);
  return Number(result[0].insertId);
}

export async function updateCorporateActionPlan(id: number, data: Partial<InsertCorporateActionPlan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(corporateActionPlans).set(data).where(eq(corporateActionPlans.id, id));
}

// Branch Action Plans
export async function getBranchActionPlans(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(branchActionPlans).where(eq(branchActionPlans.projectId, projectId));
}

export async function getBranchActionPlan(projectId: number, branchId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(branchActionPlans).where(
    and(eq(branchActionPlans.projectId, projectId), eq(branchActionPlans.branchId, branchId))
  ).limit(1);
  return result[0] || null;
}

export async function createBranchActionPlan(data: InsertBranchActionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(branchActionPlans).values(data);
  return Number(result[0].insertId);
}

// Prompts
export async function getActionPlanPrompts(planType?: "corporate" | "branch") {
  const db = await getDb();
  if (!db) return [];
  if (planType) {
    return await db.select().from(actionPlanPrompts).where(
      and(eq(actionPlanPrompts.planType, planType), eq(actionPlanPrompts.active, true))
    );
  }
  return await db.select().from(actionPlanPrompts).where(eq(actionPlanPrompts.active, true));
}

export async function getDefaultPrompt(planType: "corporate" | "branch") {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(actionPlanPrompts).where(
    and(eq(actionPlanPrompts.planType, planType), eq(actionPlanPrompts.isDefault, true), eq(actionPlanPrompts.active, true))
  ).limit(1);
  return result[0] || null;
}

export async function createActionPlanPrompt(data: InsertActionPlanPrompt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(actionPlanPrompts).values(data);
  return Number(result[0].insertId);
}

// ============================================================================
// TRPC ROUTERS - ACTION PLANS
// ============================================================================

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as dbAssessments from "./db-assessments";

const DEFAULT_CORPORATE_PROMPT = `Você é um especialista em compliance tributário brasileiro.

Gere um plano de ação corporativo detalhado para preparação para a Reforma Tributária (Lei Complementar 214/2025).

**Contexto corporativo:**
{{corporateContext}}

**Respostas do questionário:**
{{answers}}

**Gere um plano com 15-25 tarefas organizadas em:**
1. Governança e estrutura organizacional
2. Processos contábeis e fiscais
3. Sistemas e tecnologia
4. Capacitação e treinamento
5. Documentação e controles

**Para cada tarefa, defina:**
- Título claro e objetivo
- Descrição detalhada
- Área responsável (TI, CONT, FISC, JUR, OPS, COM, ADM)
- Tipo (STRATEGIC, OPERATIONAL, COMPLIANCE)
- Prioridade (baixa, media, alta, critica)
- Prazo estimado (em dias a partir de hoje)
- Dependências (IDs de outras tarefas, se houver)

**Formato JSON:**
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "responsibleArea": "TI|CONT|FISC|JUR|OPS|COM|ADM",
      "taskType": "STRATEGIC|OPERATIONAL|COMPLIANCE",
      "priority": "baixa|media|alta|critica",
      "estimatedDays": number,
      "dependsOn": [number] // opcional
    }
  ]
}`;

const DEFAULT_BRANCH_PROMPT = `Você é um especialista em compliance tributário brasileiro.

Gere um plano de ação específico para o ramo "{{branchName}}" ({{branchCode}}) para preparação para a Reforma Tributária.

**Descrição do ramo:** {{branchDescription}}

**Contexto corporativo:**
{{corporateContext}}

**Respostas do questionário do ramo:**
{{branchAnswers}}

**Gere um plano com 10-15 tarefas específicas sobre:**
1. Operações típicas do ramo
2. Tributação específica (IBS, CBS, Imposto Seletivo)
3. Documentação fiscal necessária
4. Processos operacionais afetados
5. Sistemas e controles específicos

**Formato JSON (mesmo do corporativo):**
{
  "tasks": [...]
}`;

export const actionPlansRouter = router({
  // Corporate Action Plan
  corporate: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await getCorporateActionPlan(input.projectId);
      }),

    generate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        customPrompt: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const assessment = await dbAssessments.getCorporateAssessment(input.projectId);
        if (!assessment || !assessment.completedAt) {
          throw new Error("Questionário corporativo não concluído");
        }

        const prompt = input.customPrompt || DEFAULT_CORPORATE_PROMPT;
        const finalPrompt = prompt
          .replace("{{corporateContext}}", `Regime: ${assessment.taxRegime}, Porte: ${assessment.companySize}`)
          .replace("{{answers}}", assessment.answers || "{}");

        const response = await invokeLLM({
          enableCache: true,
          messages: [
            { role: "system", content: "Você é um especialista em compliance. Responda em JSON válido." },
            { role: "user", content: finalPrompt }
          ],
        });

        const content = response.choices[0].message.content;
        const plan = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

        const id = await createCorporateActionPlan({
          projectId: input.projectId,
          corporateAssessmentId: assessment.id,
          planContent: JSON.stringify(plan),
          generationPrompt: finalPrompt,
          generatedBy: ctx.user.id,
          status: "active",
        });

        return { id, plan };
      }),
  }),

  // Branch Action Plans
  branch: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await getBranchActionPlans(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ projectId: z.number(), branchId: z.number() }))
      .query(async ({ input }) => {
        return await getBranchActionPlan(input.projectId, input.branchId);
      }),

    generate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        branchId: z.number(),
        customPrompt: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const assessment = await dbAssessments.getBranchAssessment(input.projectId, input.branchId);
        if (!assessment || !assessment.completedAt) {
          throw new Error("Questionário do ramo não concluído");
        }

        const prompt = input.customPrompt || DEFAULT_BRANCH_PROMPT;
        // Simplificado: usar prompt sem substituições complexas

        const response = await invokeLLM({
          enableCache: true,
          messages: [
            { role: "system", content: "Você é um especialista em compliance. Responda em JSON válido." },
            { role: "user", content: prompt }
          ],
        });

        const content = response.choices[0].message.content;
        const plan = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

        const id = await createBranchActionPlan({
          projectId: input.projectId,
          branchId: input.branchId,
          branchAssessmentId: assessment.id,
          planContent: JSON.stringify(plan),
          generationPrompt: prompt,
          generatedBy: ctx.user.id,
          status: "active",
        });

        return { id, plan };
      }),
  }),

  // Prompts
  prompts: router({
    list: protectedProcedure
      .input(z.object({ planType: z.enum(["corporate", "branch"]).optional() }))
      .query(async ({ input }) => {
        return await getActionPlanPrompts(input.planType);
      }),

    create: protectedProcedure
      .input(z.object({
        planType: z.enum(["corporate", "branch"]),
        name: z.string(),
        description: z.string().optional(),
        promptTemplate: z.string(),
        isDefault: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createActionPlanPrompt({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id };
      }),
  }),
});
