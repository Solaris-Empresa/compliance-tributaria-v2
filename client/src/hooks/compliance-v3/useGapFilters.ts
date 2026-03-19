import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import type { GapItem } from "@/types/compliance-v3";

type GapFilters = {
  domain: string;
  gapType: string;
  evidenceStatus: string;
  search: string;
};

export type UseGapFiltersReturn = {
  gaps: GapItem[];
  filteredGaps: GapItem[];
  filters: GapFilters;
  setFilter: (key: keyof GapFilters, value: string) => void;
  clearFilters: () => void;
  isLoading: boolean;
};

export function useGapFilters(projectId: number): UseGapFiltersReturn {
  const [filters, setFiltersState] = useState<GapFilters>({
    domain: "",
    gapType: "",
    evidenceStatus: "",
    search: "",
  });

  const { data, isLoading } = trpc.complianceV3.getTopGaps.useQuery(
    { projectId, limit: 50 },
    { enabled: !!projectId }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gaps = (data?.gaps ?? []) as unknown as GapItem[];

  const filteredGaps = useMemo(() => {
    return gaps.filter(g => {
      if (filters.domain && g.domain !== filters.domain) return false;
      if (filters.gapType && g.gapType !== filters.gapType) return false;
      if (filters.evidenceStatus && g.evidenceStatus !== filters.evidenceStatus) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!g.requirementName?.toLowerCase().includes(q) && !g.requirementCode?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [gaps, filters]);

  const setFilter = (key: keyof GapFilters, value: string) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFiltersState({ domain: "", gapType: "", evidenceStatus: "", search: "" });
  };

  return { gaps, filteredGaps, filters, setFilter, clearFilters, isLoading };
}
