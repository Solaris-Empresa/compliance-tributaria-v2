import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { RiskItem, RiskMatrixCell, RiskSummary } from "@/types/compliance-v3";

export type UseRiskMatrixReturn = {
  summary?: RiskSummary;
  matrix: RiskMatrixCell[];
  risks: RiskItem[];
  selectedLevel?: string;
  setSelectedLevel: (value?: string) => void;
  selectedDimension?: string;
  setSelectedDimension: (value?: string) => void;
  isLoading: boolean;
  refetch: () => void;
};

export function useRiskMatrix(projectId: number): UseRiskMatrixReturn {
  const [selectedLevel, setSelectedLevel] = useState<string | undefined>();
  const [selectedDimension, setSelectedDimension] = useState<string | undefined>();

  const { data, isLoading, refetch } = trpc.complianceV3.getRiskMatrix.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const risks = (data?.risks ?? []) as unknown as RiskItem[];

  const summary: RiskSummary | undefined = data
    ? {
        totalRisks: data.total,
        critico: data.byLevel?.critico?.length ?? 0,
        alto: data.byLevel?.alto?.length ?? 0,
        medio: data.byLevel?.medio?.length ?? 0,
        baixo: data.byLevel?.baixo?.length ?? 0,
      }
    : undefined;

  // Build matrix cells from risks
  const matrixMap = new Map<string, RiskMatrixCell>();
  for (const r of risks) {
    const key = `${r.probability}-${r.impact}`;
    const existing = matrixMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      matrixMap.set(key, { probability: r.probability, impact: r.impact, count: 1 });
    }
  }
  const matrix = Array.from(matrixMap.values());

  return {
    summary,
    matrix,
    risks,
    selectedLevel,
    setSelectedLevel,
    selectedDimension,
    setSelectedDimension,
    isLoading,
    refetch,
  };
}
