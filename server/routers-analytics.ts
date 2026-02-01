import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { 
  projects, 
  corporateAssessments, 
  branchAssessments,
  actions,
  projectBranches,
  activityBranches
} from "../drizzle/schema";

export const analyticsRouter = router({
  // Obter métricas consolidadas de um projeto
  getProjectMetrics: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar projeto
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project) throw new Error("Project not found");

      // Questionário Corporativo
      const [corporateAssessment] = await db
        .select()
        .from(corporateAssessments)
        .where(eq(corporateAssessments.projectId, input.projectId))
        .limit(1);

      const corporateProgress = corporateAssessment ? {
        exists: true,
        completed: !!corporateAssessment.completedAt,
        completedAt: corporateAssessment.completedAt,
      } : { exists: false, completed: false, completedAt: null };

      // Questionários por Ramo
      const branchAssessmentsList = await db
        .select({
          id: branchAssessments.id,
          branchId: branchAssessments.branchId,
          branchName: activityBranches.name,
          completedAt: branchAssessments.completedAt,
        })
        .from(branchAssessments)
        .innerJoin(activityBranches, eq(branchAssessments.branchId, activityBranches.id))
        .where(eq(branchAssessments.projectId, input.projectId));

      const branchesTotal = branchAssessmentsList.length;
      const branchesCompleted = branchAssessmentsList.filter(b => b.completedAt).length;

      // Estatísticas de Tarefas
      const taskStats = await db
        .select({
          status: actions.status,
          area: actions.responsibleArea,
          type: actions.taskType,
          priority: actions.priority,
          count: sql<number>`count(*)`.as('count'),
        })
        .from(actions)
        .where(eq(actions.projectId, input.projectId))
        .groupBy(actions.status, actions.responsibleArea, actions.taskType, actions.priority);

      // Agregar estatísticas
      const tasksByStatus = taskStats.reduce((acc, stat) => {
        acc[stat.status] = (acc[stat.status] || 0) + Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      const tasksByArea = taskStats.reduce((acc, stat) => {
        if (stat.area) {
          acc[stat.area] = (acc[stat.area] || 0) + Number(stat.count);
        }
        return acc;
      }, {} as Record<string, number>);

      const tasksByType = taskStats.reduce((acc, stat) => {
        if (stat.type) {
          acc[stat.type] = (acc[stat.type] || 0) + Number(stat.count);
        }
        return acc;
      }, {} as Record<string, number>);

      const tasksByPriority = taskStats.reduce((acc, stat) => {
        if (stat.priority) {
          acc[stat.priority] = (acc[stat.priority] || 0) + Number(stat.count);
        }
        return acc;
      }, {} as Record<string, number>);

      // Tarefas com prazos críticos (próximos 7 dias)
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const criticalTasks = await db
        .select({
          id: actions.id,
          title: actions.title,
          deadline: actions.deadline,
          status: actions.status,
          responsibleArea: actions.responsibleArea,
          priority: actions.priority,
        })
        .from(actions)
        .where(
          and(
            eq(actions.projectId, input.projectId),
            sql`${actions.deadline} IS NOT NULL`,
            sql`${actions.deadline} <= ${nextWeek.toISOString().split('T')[0]}`,
            sql`${actions.status} != 'COMPLETED'`
          )
        )
        .orderBy(actions.deadline);

      // Tarefas atrasadas
      const delayedTasks = await db
        .select({
          id: actions.id,
          title: actions.title,
          deadline: actions.deadline,
          status: actions.status,
          responsibleArea: actions.responsibleArea,
        })
        .from(actions)
        .where(
          and(
            eq(actions.projectId, input.projectId),
            sql`${actions.deadline} IS NOT NULL`,
            sql`${actions.deadline} < ${today.toISOString().split('T')[0]}`,
            sql`${actions.status} != 'COMPLETED'`
          )
        )
        .orderBy(actions.deadline);

      return {
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
        },
        assessments: {
          corporate: corporateProgress,
          branches: {
            total: branchesTotal,
            completed: branchesCompleted,
            progress: branchesTotal > 0 ? (branchesCompleted / branchesTotal) * 100 : 0,
            list: branchAssessmentsList,
          },
        },
        tasks: {
          total: Object.values(tasksByStatus).reduce((sum, count) => sum + count, 0),
          byStatus: tasksByStatus,
          byArea: tasksByArea,
          byType: tasksByType,
          byPriority: tasksByPriority,
          critical: criticalTasks,
          delayed: delayedTasks,
        },
      };
    }),

  // Obter métricas globais de todos os projetos do usuário
  getGlobalMetrics: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar projetos do usuário
      let userProjects;
      if (ctx.user.role === "equipe_solaris" || ctx.user.role === "advogado_senior") {
        userProjects = await db.select().from(projects);
      } else {
        userProjects = await db
          .select()
          .from(projects)
          .where(eq(projects.clientId, ctx.user.id));
      }

      const projectIds = userProjects.map(p => p.id);

      if (projectIds.length === 0) {
        return {
          projects: { total: 0, byStatus: {} },
          assessments: { corporate: 0, branches: 0 },
          tasks: { total: 0, byStatus: {}, byArea: {} },
        };
      }

      // Estatísticas de projetos por status
      const projectsByStatus = userProjects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Contar assessments corporativos completos
      const corporateAssessmentsCount = await db
        .select({ count: sql<number>`count(*)`.as('count') })
        .from(corporateAssessments)
        .where(
          and(
            sql`${corporateAssessments.projectId} IN (${projectIds.join(',')})`,
            sql`${corporateAssessments.completedAt} IS NOT NULL`
          )
        );

      // Contar assessments por ramo completos
      const branchAssessmentsCount = await db
        .select({ count: sql<number>`count(*)`.as('count') })
        .from(branchAssessments)
        .where(
          and(
            sql`${branchAssessments.projectId} IN (${projectIds.join(',')})`,
            sql`${branchAssessments.completedAt} IS NOT NULL`
          )
        );

      // Estatísticas de tarefas
      const taskStats = await db
        .select({
          status: actions.status,
          area: actions.responsibleArea,
          count: sql<number>`count(*)`.as('count'),
        })
        .from(actions)
        .where(sql`${actions.projectId} IN (${projectIds.join(',')})`)
        .groupBy(actions.status, actions.responsibleArea);

      const tasksByStatus = taskStats.reduce((acc, stat) => {
        acc[stat.status] = (acc[stat.status] || 0) + Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      const tasksByArea = taskStats.reduce((acc, stat) => {
        if (stat.area) {
          acc[stat.area] = (acc[stat.area] || 0) + Number(stat.count);
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        projects: {
          total: userProjects.length,
          byStatus: projectsByStatus,
        },
        assessments: {
          corporate: Number(corporateAssessmentsCount[0]?.count || 0),
          branches: Number(branchAssessmentsCount[0]?.count || 0),
        },
        tasks: {
          total: Object.values(tasksByStatus).reduce((sum, count) => sum + count, 0),
          byStatus: tasksByStatus,
          byArea: tasksByArea,
        },
      };
    }),
});
