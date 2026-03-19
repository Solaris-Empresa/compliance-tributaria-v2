import { useParams, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskLevelBadge, CriticalityBadge } from "@/components/compliance-v3/shared/Badges";
import { RiskMatrix4x4 } from "@/components/compliance-v3/dashboard/RiskMatrix4x4";
import { useRiskMatrix } from "@/hooks/compliance-v3/useRiskMatrix";
import { DOMAIN_LABELS } from "@/types/compliance-v3";
import { useState, useEffect } from "react";

export default function RisksV3() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { risks, matrix: matrixCells, summary, isLoading, selectedLevel, setSelectedLevel } = useRiskMatrix(projectId);
  const [selectedCell, setSelectedCell] = useState<{ probability: number; impact: number } | undefined>();
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterDomain, setFilterDomain] = useState<string>("all");

  // Ler query param ?domain= da URL e pré-selecionar filtro
  const [domainInitialized, setDomainInitialized] = useState(false);
  useEffect(() => {
    if (!domainInitialized) {
      const url = new URL(window.location.href);
      const domain = url.searchParams.get("domain");
      if (domain) setFilterDomain(domain);
      setDomainInitialized(true);
    }
  }, [domainInitialized]);

  const filtered = risks
    .filter(r => filterLevel === "all" || r.riskLevel === filterLevel)
    .filter(r => filterDomain === "all" || r.domain === filterDomain);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <Link href={`/projetos/${projectId}/compliance-v3`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">Matriz de Riscos</h1>
          <p className="text-xs text-muted-foreground">{risks.length} riscos identificados</p>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Summary KPIs */}
        {summary && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Crítico", value: summary.critico, color: "text-red-600 bg-red-50" },
              { label: "Alto", value: summary.alto, color: "text-orange-600 bg-orange-50" },
              { label: "Médio", value: summary.medio, color: "text-yellow-600 bg-yellow-50" },
              { label: "Baixo", value: summary.baixo, color: "text-green-600 bg-green-50" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl p-4 text-center ${color.split(" ")[1]}`}>
                <p className={`text-3xl font-bold ${color.split(" ")[0]}`}>{value}</p>
                <p className="text-xs font-medium mt-0.5 text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Matrix */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Matriz 4×4 (Probabilidade × Impacto)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64" /> : (
                <RiskMatrix4x4
                  matrix={matrixCells}
                  selectedCell={selectedCell}
                  onCellClick={cell => setSelectedCell(
                    selectedCell?.probability === cell.probability && selectedCell?.impact === cell.impact
                      ? undefined : { probability: cell.probability, impact: cell.impact }
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Dimension breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Riscos por Dimensão</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64" /> : (() => {
                const dims = risks.reduce((acc, r) => {
                  const d = r.riskDimension ?? "outros";
                  acc[d] = (acc[d] ?? 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const total = risks.length || 1;
                return (
                  <div className="space-y-3">
                    {Object.entries(dims).sort(([, a], [, b]) => b - a).map(([dim, count]) => (
                      <div key={dim} className="flex items-center gap-3">
                        <div className="w-28 text-xs text-muted-foreground capitalize shrink-0">{dim}</div>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${(count / total) * 100}%` }}
                          />
                        </div>
                        <div className="w-6 text-xs font-bold text-right">{count}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Risk Table */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Lista de Riscos</CardTitle>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Nenhum risco encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Requisito</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Domínio</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nível</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Dimensão</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Score</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Normalizado</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Impacto Fin.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, idx) => (
                      <tr key={r.riskCode ?? idx} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs">{r.requirementName}</p>
                          <p className="text-xs text-muted-foreground">{r.riskCode}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {DOMAIN_LABELS[r.domain] ?? r.domain}
                        </td>
                        <td className="px-4 py-3"><RiskLevelBadge value={r.riskLevel} /></td>
                        <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{r.riskDimension}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">{r.riskScore}</td>
                        <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
                          {r.riskScoreNormalized ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
                          {r.financialImpactPercent != null
                            ? `${(Number(r.financialImpactPercent) * 100).toFixed(0)}%`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
