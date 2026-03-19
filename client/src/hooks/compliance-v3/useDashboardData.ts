import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { DashboardFilters, DashboardRaw } from "@/types/compliance-v3";

export type UseDashboardDataReturn = {
  data?: DashboardRaw;
  isLoading: boolean;
  error: unknown;
  filters: DashboardFilters;
  setFilters: (next: Partial<DashboardFilters>) => void;
  selectedCell?: { probability: number; impact: number };
  setSelectedCell: (cell?: { probability: number; impact: number }) => void;
  refetch: () => void;
};

export function useDashboardData(projectId: number): UseDashboardDataReturn {
  const [filters, setFiltersState] = useState<DashboardFilters>({});
  const [selectedCell, setSelectedCell] = useState<{ probability: number; impact: number } | undefined>();

  const { data, isLoading, error, refetch } = trpc.complianceV3.getDashboard.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const setFilters = (next: Partial<DashboardFilters>) => {
    setFiltersState(prev => ({ ...prev, ...next }));
  };

  return {
    data: data as DashboardRaw | undefined,
    isLoading,
    error,
    filters,
    setFilters,
    selectedCell,
    setSelectedCell,
    refetch,
  };
}
