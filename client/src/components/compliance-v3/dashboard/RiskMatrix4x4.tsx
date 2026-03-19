import type { RiskMatrixCell } from "@/types/compliance-v3";

type Props = {
  matrix: RiskMatrixCell[];
  onCellClick?: (cell: RiskMatrixCell) => void;
  selectedCell?: { probability: number; impact: number };
};

const IMPACT_LABELS = ["", "Baixo", "Médio", "Alto", "Crítico"];
const PROB_LABELS = ["", "Raro", "Possível", "Provável", "Quase Certo"];

function getCellColor(probability: number, impact: number): string {
  const score = probability * impact;
  if (score >= 12) return "bg-red-500 text-white";
  if (score >= 8) return "bg-orange-400 text-white";
  if (score >= 4) return "bg-yellow-300 text-gray-800";
  return "bg-green-200 text-gray-800";
}

function getCellLabel(probability: number, impact: number): string {
  const score = probability * impact;
  if (score >= 12) return "Crítico";
  if (score >= 8) return "Alto";
  if (score >= 4) return "Médio";
  return "Baixo";
}

export function RiskMatrix4x4({ matrix, onCellClick, selectedCell }: Props) {
  const getCount = (p: number, i: number) =>
    matrix.find(c => c.probability === p && c.impact === i)?.count ?? 0;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[360px]">
        {/* Header row: Impact labels */}
        <div className="flex items-center mb-1">
          <div className="w-24 shrink-0" />
          <div className="flex-1 grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="text-center text-xs font-semibold text-muted-foreground py-1">
                {IMPACT_LABELS[i]}
              </div>
            ))}
          </div>
        </div>
        {/* Rows: Probability (4 → 1, top to bottom) */}
        {[4, 3, 2, 1].map(p => (
          <div key={p} className="flex items-center mb-1">
            <div className="w-24 shrink-0 text-xs font-semibold text-muted-foreground text-right pr-2">
              {PROB_LABELS[p]}
            </div>
            <div className="flex-1 grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map(i => {
                const count = getCount(p, i);
                const isSelected = selectedCell?.probability === p && selectedCell?.impact === i;
                const cell = matrix.find(c => c.probability === p && c.impact === i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => cell && onCellClick?.(cell)}
                    className={[
                      "rounded-md h-14 flex flex-col items-center justify-center transition-all",
                      getCellColor(p, i),
                      count > 0 ? "cursor-pointer hover:opacity-90 shadow-sm" : "opacity-40 cursor-default",
                      isSelected ? "ring-2 ring-offset-1 ring-blue-500" : "",
                    ].join(" ")}
                  >
                    <span className="text-xs font-medium">{getCellLabel(p, i)}</span>
                    {count > 0 && (
                      <span className="text-lg font-bold leading-none">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {[
            { color: "bg-green-200", label: "Baixo (1–3)" },
            { color: "bg-yellow-300", label: "Médio (4–7)" },
            { color: "bg-orange-400", label: "Alto (8–11)" },
            { color: "bg-red-500", label: "Crítico (12–16)" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={`w-3 h-3 rounded-sm ${color}`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
