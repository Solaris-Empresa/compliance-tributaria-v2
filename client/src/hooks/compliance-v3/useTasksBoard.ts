import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { AtomicTaskItem, TaskExecutionSummary } from "@/types/compliance-v3";

export type UseTasksBoardReturn = {
  tasks: AtomicTaskItem[];
  summary?: TaskExecutionSummary;
  viewMode: "table" | "kanban";
  setViewMode: (mode: "table" | "kanban") => void;
  updateProgress: (taskCode: string, value: number) => Promise<void>;
  updateStatus: (taskCode: string, status: string) => Promise<void>;
  isLoading: boolean;
};

export function useTasksBoard(projectId: number): UseTasksBoardReturn {
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const utils = trpc.useUtils();

  const { data: progressData, isLoading } = trpc.complianceV3.getExecutionProgress.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const { data: actionData } = trpc.complianceV3.getActionPlan.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const updateStatusMutation = trpc.complianceV3.updateTaskStatus.useMutation({
    onSuccess: () => {
      utils.complianceV3.getExecutionProgress.invalidate({ projectId });
      utils.complianceV3.getDashboard.invalidate({ projectId });
    },
  });

  // Build tasks from action plan data
  const tasks: AtomicTaskItem[] = [];
  if (actionData?.actions) {
    // Tasks are embedded in actions in the current API — we use progress data for summary
  }

  const summary: TaskExecutionSummary | undefined = progressData
    ? {
        totalTasks: progressData.tasks.total,
        nao_iniciado: progressData.tasks.nao_iniciado,
        em_andamento: progressData.tasks.em_andamento,
        em_revisao: 0,
        concluido: progressData.tasks.concluido,
        cancelado: 0,
        progressPercent: progressData.tasks.progressPercent,
      }
    : undefined;

  const updateProgress = async (taskCode: string, value: number) => {
    await updateStatusMutation.mutateAsync({
      projectId,
      taskCode,
      status: value >= 100 ? "concluido" : "em_andamento",
      progressPercent: value,
    });
  };

  const updateStatus = async (taskCode: string, status: string) => {
    await updateStatusMutation.mutateAsync({
      projectId,
      taskCode,
      status: status as "nao_iniciado" | "em_andamento" | "em_revisao" | "concluido" | "bloqueado",
    });
  };

  return { tasks, summary, viewMode, setViewMode, updateProgress, updateStatus, isLoading };
}
