import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskMatrix4x4 } from "@/components/compliance-v3/dashboard/RiskMatrix4x4";
import DemoLayout from "./DemoLayout";
import {
  getScenario,
  getScenarioMatrixCells,
  DOMAIN_LABELS_DEMO,
  RISK_LEVEL_LABELS,
  type ScenarioKey,
} from "@/lib/demo-engine";

function useScenario(): ScenarioKey {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const s = params.get("scenario");
  if (s === "simples" || s === "medio" || s === "complexo") return s;
  return "complexo";
}
import type { RiskMatrixCell } from "@/types/compliance-v3";

const RISK_COLORS: Record<string, string> = {
  critico: "text-red-600 bg-red-50 border-red-200",
  alto: "text-orange-600 bg-orange-50 border-orange-200",
  medio: "text-yellow-600 bg-yellow-50 border-yellow-200",
  baixo: "text-green-600 bg-green-50 border-green-200",
};

const DIMENSION_LABELS: Record<string, string> = {
  regulatorio: "Regulatório",
  operacional: "Operacional",
  financeiro: "Financeiro",
  reputacional: "Reputacional",
};

export default function DemoRiscos() {
  const scenario = useScenario();
  const DEMO = getScenario(scenario);
  const matrixCells = getScenarioMatrixCells(scenario);
  const [selectedCell, setSelectedCell] = useState<{ probability: number; impact: number } | null>(null);

  const sortedRisks = [...DEMO.requirements].sort(
    (a, b) => b.risk.probability * b.risk.impact - a.risk.probability * a.risk.impact
  );

  const filteredRisks = selectedCell
    ? sortedRisks.filter(r => r.risk.probability === selectedCell.probability && r.risk.impact === selectedCell.impact)
    : sortedRisks;

  const riskCounts = {
    critico: DEMO.requirements.filter(r => r.risk.riskLevel === "critico").length,
    alto: DEMO.requirements.filter(r => r.risk.riskLevel === "alto").length,
    medio: DEMO.requirements.filter(r => r.risk.riskLevel === "medio").length,
    baixo: DEMO.requirements.filter(r => r.risk.riskLevel === "baixo").length,
  };

  return (
    <DemoLayout
      title="Matriz de Riscos"
      subtitle="Análise de risco 4×4 (Probabilidade × Impacto) — clique em uma célula para filtrar"
    >
      {/* Risk summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {Object.entries(riskCounts).map(([level, count]) => (
          <div key={level} className={`rounded-xl p-4 border ${RISK_COLORS[level] ?? ""}`}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm font-medium capitalize">{RISK_LEVEL_LABELS[level] ?? level}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matrix */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Matriz 4×4</CardTitle>
            <p className="text-xs text-muted-foreground">
              {selectedCell
                ? `Filtrando: P=${selectedCell.probability} × I=${selectedCell.impact} — clique novamente para limpar`
                : "Clique em uma célula para filtrar os riscos"}
            </p>
          </CardHeader>
          <CardContent>
            <RiskMatrix4x4
              matrix={matrixCells}
              selectedCell={selectedCell ?? undefined}
              onCellClick={(cell: RiskMatrixCell) => {
                if (selectedCell?.probability === cell.probability && selectedCell?.impact === cell.impact) {
                  setSelectedCell(null);
                } else {
                  setSelectedCell({ probability: cell.probability, impact: cell.impact });
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Risk list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Riscos Identificados
              {selectedCell && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({filteredRisks.length} de {DEMO.requirements.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredRisks.map(req => (
                <div
                  key={req.code}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50"
                >
                  {/* Risk score badge */}
                  <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold border ${RISK_COLORS[req.risk.riskLevel] ?? ""}`}>
                    {req.risk.probability * req.risk.impact}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{req.name}</p>
                    <p className="text-xs text-slate-500">
                      {DOMAIN_LABELS_DEMO[req.domain] ?? req.domain}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${RISK_COLORS[req.risk.riskLevel] ?? ""}`}>
                        {RISK_LEVEL_LABELS[req.risk.riskLevel] ?? req.risk.riskLevel}
                      </span>
                      <span className="text-xs text-slate-400">
                        {DIMENSION_LABELS[req.risk.riskDimension] ?? req.risk.riskDimension}
                      </span>
                      <span className="text-xs text-slate-400">
                        P:{req.risk.probability} × I:{req.risk.impact}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-500">Impacto</p>
                    <p className="text-sm font-bold text-red-600">
                      {(req.risk.estimatedFinancialImpact.revenuePercent * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk detail cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedRisks.filter(r => r.risk.riskLevel === "critico").map(req => (
          <Card key={req.code} className="border-red-200 bg-red-50/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{req.code}</span>
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                      CRÍTICO
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{req.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{DOMAIN_LABELS_DEMO[req.domain] ?? req.domain}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-red-600">{req.risk.probability * req.risk.impact}</p>
                  <p className="text-xs text-slate-400">risco score</p>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-lg bg-white border border-red-100">
                <p className="text-xs text-slate-600">{req.risk.estimatedFinancialImpact.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DemoLayout>
  );
}
