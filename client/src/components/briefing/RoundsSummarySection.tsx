// RoundsSummarySection.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2) · elemento OBRIGATÓRIO (N1)
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §10. Fonte: getRoundsSummary (CONSUMIDO).
// "Intensidade de Aprofundamento por CNAE" (heatmap). Renderiza SÓ se length > 0. testid: briefing-rounds-summary.
import { BarChart3, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface RoundSummaryItem {
  cnaeCode: string;
  cnaeDescription: string;
  roundsCompleted: number;
}

export function RoundsSummarySection({
  roundsSummary,
}: {
  roundsSummary: RoundSummaryItem[];
}) {
  if (roundsSummary.length === 0) return null;

  const highComplexity = roundsSummary.filter(c => c.roundsCompleted >= 2);
  const maxRounds = Math.max(...roundsSummary.map(c => c.roundsCompleted), 1);

  return (
    <Card
      data-testid="briefing-rounds-summary"
      className="border-primary/20 bg-gradient-to-br from-primary/3 to-transparent"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4 text-primary" />
          Intensidade de Aprofundamento por CNAE
          {highComplexity.length > 0 && (
            <Badge className="ml-1 border border-orange-300 bg-orange-100 text-xs text-orange-700">
              <Flame className="mr-1 h-3 w-3" />
              {highComplexity.length} de alta complexidade
            </Badge>
          )}
        </CardTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">
          CNAEs com mais rounds de aprofundamento indicam áreas de maior
          complexidade tributária e maior atenção do diagnóstico.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {roundsSummary.map(cnae => {
          const isHigh = cnae.roundsCompleted >= 2;
          const barWidth =
            cnae.roundsCompleted === 0
              ? 15
              : Math.max(15, (cnae.roundsCompleted / maxRounds) * 100);
          return (
            <div key={cnae.cnaeCode} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 font-mono text-xs font-bold text-primary">
                    {cnae.cnaeCode}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {cnae.cnaeDescription}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {isHigh && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                      <Flame className="h-2.5 w-2.5" />
                      Alta complexidade
                    </span>
                  )}
                  <span className="text-xs font-semibold">
                    {cnae.roundsCompleted === 0
                      ? "Nível 1 apenas"
                      : cnae.roundsCompleted === 1
                        ? "1 round"
                        : `${cnae.roundsCompleted} rounds`}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    cnae.roundsCompleted === 0
                      ? "bg-muted-foreground/30"
                      : cnae.roundsCompleted === 1
                        ? "bg-blue-400"
                        : cnae.roundsCompleted >= 3
                          ? "bg-orange-500"
                          : "bg-indigo-500"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
