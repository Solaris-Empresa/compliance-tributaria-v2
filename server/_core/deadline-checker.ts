import { getDb } from "../db";
import { actions } from "../../drizzle/schema";
import { and, eq, lte, gte, isNull } from "drizzle-orm";
import { notifyProject, notifyUser } from "./websocket";

/**
 * Job para verificar prazos de tarefas e enviar notificações
 * Deve ser executado periodicamente (ex: a cada hora)
 */
export async function checkDeadlinesAndNotify() {
  const db = await getDb();
  if (!db) {
    console.error("[DeadlineChecker] Database not available");
    return;
  }

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    // 1. Buscar tarefas com prazo próximo (próximos 7 dias) e não concluídas
    const upcomingTasks = await db
      .select()
      .from(actions)
      .where(
        and(
          lte(actions.deadline, sevenDaysFromNow),
          gte(actions.deadline, now),
          eq(actions.status, "IN_PROGRESS")
        )
      );

    console.log(`[DeadlineChecker] ${upcomingTasks.length} tarefas com prazo próximo`);

    for (const task of upcomingTasks) {
      const daysUntilDeadline = Math.ceil(
        (task.deadline!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Notificar projeto
      notifyProject(task.projectId, "task:due_soon", {
        taskId: task.id,
        projectId: task.projectId,
        message: `Tarefa "${task.title}" vence em ${daysUntilDeadline} dias`,
        deadline: task.deadline,
        daysRemaining: daysUntilDeadline,
      });

      // Notificar owner
      if (task.ownerId) {
        notifyUser(task.ownerId, "task:due_soon", {
          taskId: task.id,
          projectId: task.projectId,
          message: `Sua tarefa "${task.title}" vence em ${daysUntilDeadline} dias`,
          deadline: task.deadline,
          daysRemaining: daysUntilDeadline,
        });
      }
    }

    // 2. Buscar tarefas atrasadas (deadline passou e não concluídas)
    const overdueTasks = await db
      .select()
      .from(actions)
      .where(
        and(
          lte(actions.deadline, now),
          eq(actions.status, "IN_PROGRESS")
        )
      );

    console.log(`[DeadlineChecker] ${overdueTasks.length} tarefas atrasadas`);

    for (const task of overdueTasks) {
      const daysOverdue = Math.ceil(
        (now.getTime() - task.deadline!.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Atualizar status para OVERDUE
      await db
        .update(actions)
        .set({ status: "OVERDUE" })
        .where(eq(actions.id, task.id));

      // Notificar projeto
      notifyProject(task.projectId, "task:overdue", {
        taskId: task.id,
        projectId: task.projectId,
        message: `Tarefa "${task.title}" está atrasada há ${daysOverdue} dias`,
        deadline: task.deadline,
        daysOverdue,
      });

      // Notificar owner
      if (task.ownerId) {
        notifyUser(task.ownerId, "task:overdue", {
          taskId: task.id,
          projectId: task.projectId,
          message: `Sua tarefa "${task.title}" está atrasada há ${daysOverdue} dias`,
          deadline: task.deadline,
          daysOverdue,
        });
      }
    }

    console.log("[DeadlineChecker] Verificação concluída");
  } catch (error) {
    console.error("[DeadlineChecker] Erro ao verificar prazos:", error);
  }
}

// Executar a cada hora
setInterval(checkDeadlinesAndNotify, 60 * 60 * 1000);

// Executar imediatamente ao iniciar
checkDeadlinesAndNotify();
