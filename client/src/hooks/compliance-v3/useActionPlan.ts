import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { ActionPlanItem } from "@/types/compliance-v3";

export type UseActionPlanReturn = {
  actions: ActionPlanItem[];
  groupedByPriority: Record<string, ActionPlanItem[]>;
  selectedPriority: string;
  setSelectedPriority: (value: string) => void;
  updateStatus: (actionId: number, status: string) => Promise<void>;
  isLoading: boolean;
};

export function useActionPlan(projectId: number): UseActionPlanReturn {
  const [selectedPriority, setSelectedPriority] = useState("all");
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.complianceV3.getActionPlan.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const updateStatusMutation = trpc.complianceV3.updateActionStatus.useMutation({
    onSuccess: () => {
      utils.complianceV3.getActionPlan.invalidate({ projectId });
    },
  });

  const actions = (data?.actions ?? []) as unknown as ActionPlanItem[];

  const groupedByPriority: Record<string, ActionPlanItem[]> = {
    imediata: actions.filter(a => a.actionPriority === "imediata"),
    curto_prazo: actions.filter(a => a.actionPriority === "curto_prazo"),
    medio_prazo: actions.filter(a => a.actionPriority === "medio_prazo"),
    planejamento: actions.filter(a => a.actionPriority === "planejamento"),
  };

  const updateStatus = async (actionId: number, status: string) => {
    await updateStatusMutation.mutateAsync({
      projectId,
      actionCode: String(actionId),
      status: status as "nao_iniciado" | "em_andamento" | "em_revisao" | "concluido" | "cancelado",
    });
  };

  return {
    actions,
    groupedByPriority,
    selectedPriority,
    setSelectedPriority,
    updateStatus,
    isLoading,
  };
}
