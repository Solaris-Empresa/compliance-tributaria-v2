import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { corporateActionPlans, branchActionPlans, corporateAssessments, branchAssessments, activityBranches } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

export const actionPlansRouter = router({
  corporate: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        const [plan] = await database
          .select()
          .from(corporateActionPlans)
          .where(eq(corporateActionPlans.projectId, input.projectId))
          .limit(1);

        if (!plan) return null;

        const tasks = typeof plan.planContent === 'string' 
          ? JSON.parse(plan.planContent) 
          : plan.planContent;

        return { ...plan, tasks };
      }),

    generate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        const [assessment] = await database
          .select()
          .from(corporateAssessments)
          .where(eq(corporateAssessments.projectId, input.projectId))
          .limit(1);

        if (!assessment) {
          throw new Error("Questionário corporativo não encontrado.");
        }

        const answers = typeof assessment.answers === 'string'
          ? JSON.parse(assessment.answers)
          : assessment.answers;

        const prompt = `Gere um plano de ação com 8-15 tarefas baseado nestas respostas: ${JSON.stringify(answers)}. Retorne JSON: {"tasks":[{"title":"...","description":"...","responsibleArea":"TI|CONT|FISC|JUR|OPS|COM|ADM","taskType":"STRATEGIC|OPERATIONAL|COMPLIANCE","priority":"ALTA|MÉDIA|BAIXA","estimatedDays":30}]}`;

        const response = await invokeLLM({
          enableCache: true,
          messages: [
            { role: "system", content: "Retorne apenas JSON válido." },
            { role: "user", content: prompt },
          ],
        });

        const content = response.choices[0].message.content;
        // Remover markdown code blocks se existirem (```json ... ```)
        const cleanContent = typeof content === 'string' 
          ? content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
          : '{"tasks":[]}';
        const planData = JSON.parse(cleanContent);

        const [existingPlan] = await database
          .select()
          .from(corporateActionPlans)
          .where(eq(corporateActionPlans.projectId, input.projectId))
          .limit(1);

        if (existingPlan) {
          await database
            .update(corporateActionPlans)
            .set({
              planContent: JSON.stringify(planData.tasks),
              generationPrompt: prompt,
              generatedAt: new Date(),
              generatedBy: ctx.user.id,
            })
            .where(eq(corporateActionPlans.id, existingPlan.id));

          return { success: true, planId: existingPlan.id };
        } else {
          const result = await database
            .insert(corporateActionPlans)
            .values({
              projectId: input.projectId,
              corporateAssessmentId: assessment.id,
              planContent: JSON.stringify(planData.tasks),
              generationPrompt: prompt,
              generatedAt: new Date(),
              generatedBy: ctx.user.id,
            });

          return { success: true, planId: result[0].insertId };
        }
      }),
  }),

  branch: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        const plans = await database
          .select({
            id: branchActionPlans.id,
            projectId: branchActionPlans.projectId,
            branchId: branchActionPlans.branchId,
            branchName: activityBranches.name,
            branchCode: activityBranches.code,
            planContent: branchActionPlans.planContent,
            generatedAt: branchActionPlans.generatedAt,
            version: branchActionPlans.version,
          })
          .from(branchActionPlans)
          .leftJoin(activityBranches, eq(branchActionPlans.branchId, activityBranches.id))
          .where(eq(branchActionPlans.projectId, input.projectId));

        return plans.map((plan: any) => ({
          ...plan,
          tasks: typeof plan.planContent === 'string' 
            ? JSON.parse(plan.planContent) 
            : plan.planContent,
        }));
      }),

    get: protectedProcedure
      .input(z.object({ projectId: z.number(), branchId: z.number() }))
      .query(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        const [plan] = await database
          .select()
          .from(branchActionPlans)
          .where(
            and(
              eq(branchActionPlans.projectId, input.projectId),
              eq(branchActionPlans.branchId, input.branchId)
            )
          )
          .limit(1);

        if (!plan) return null;

        const tasks = typeof plan.planContent === 'string' 
          ? JSON.parse(plan.planContent) 
          : plan.planContent;

        return { ...plan, tasks };
      }),

    generate: protectedProcedure
      .input(z.object({ projectId: z.number(), branchId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        const [assessment] = await database
          .select()
          .from(branchAssessments)
          .where(
            and(
              eq(branchAssessments.projectId, input.projectId),
              eq(branchAssessments.branchId, input.branchId)
            )
          )
          .limit(1);

        if (!assessment) {
          throw new Error("Questionário do ramo não encontrado.");
        }

        const [branch] = await database
          .select()
          .from(activityBranches)
          .where(eq(activityBranches.id, input.branchId))
          .limit(1);

        const answers = typeof assessment.answers === 'string'
          ? JSON.parse(assessment.answers)
          : assessment.answers;

        const prompt = `Gere plano de ação para o ramo ${branch?.name || 'desconhecido'} com 5-10 tarefas baseado nestas respostas: ${JSON.stringify(answers)}. Retorne JSON: {"tasks":[{"title":"...","description":"...","responsibleArea":"TI|CONT|FISC|JUR|OPS|COM|ADM","taskType":"STRATEGIC|OPERATIONAL|COMPLIANCE","priority":"ALTA|MÉDIA|BAIXA","estimatedDays":30}]}`;

        const response = await invokeLLM({
          enableCache: true,
          messages: [
            { role: "system", content: "Retorne apenas JSON válido." },
            { role: "user", content: prompt },
          ],
        });

        const content = response.choices[0].message.content;
        // Remover markdown code blocks se existirem (```json ... ```)
        const cleanContent = typeof content === 'string' 
          ? content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
          : '{"tasks":[]}';
        const planData = JSON.parse(cleanContent);

        const [existingPlan] = await database
          .select()
          .from(branchActionPlans)
          .where(
            and(
              eq(branchActionPlans.projectId, input.projectId),
              eq(branchActionPlans.branchId, input.branchId)
            )
          )
          .limit(1);

        if (existingPlan) {
          await database
            .update(branchActionPlans)
            .set({
              planContent: JSON.stringify(planData.tasks),
              generationPrompt: prompt,
              generatedAt: new Date(),
              generatedBy: ctx.user.id,
            })
            .where(eq(branchActionPlans.id, existingPlan.id));

          return { success: true, planId: existingPlan.id };
        } else {
          const result = await database
            .insert(branchActionPlans)
            .values({
              projectId: input.projectId,
              branchId: input.branchId,
              branchAssessmentId: assessment.id,
              planContent: JSON.stringify(planData.tasks),
              generationPrompt: prompt,
              generatedAt: new Date(),
              generatedBy: ctx.user.id,
            });

          return { success: true, planId: result[0].insertId };
        }
      }),
  }),
});
