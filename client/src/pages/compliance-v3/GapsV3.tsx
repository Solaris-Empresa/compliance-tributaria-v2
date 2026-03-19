import { useParams, Link } from "wouter";
import { ArrowLeft, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CriticalityBadge, ComplianceStatusBadge, PriorityBadge } from "@/components/compliance-v3/shared/Badges";
import { useGapFilters } from "@/hooks/compliance-v3/useGapFilters";
import { DOMAIN_LABELS } from "@/types/compliance-v3";

const GAP_TYPES = [
  "normativo", "processo", "sistema", "cadastro", "contrato", "financeiro", "acessorio"
];

export default function GapsV3() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { filteredGaps, filters, setFilter, clearFilters, isLoading } = useGapFilters(projectId);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projetos/${projectId}/compliance-v3`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">Gaps de Compliance</h1>
            <p className="text-xs text-muted-foreground">{filteredGaps.length} gaps encontrados</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar requisito..."
                    value={filters.search}
                    onChange={e => setFilter("search", e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
              <Select value={filters.domain || "all"} onValueChange={v => setFilter("domain", v === "all" ? "" : v)}>
                <SelectTrigger className="w-48 h-9 text-sm">
                  <SelectValue placeholder="Domínio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os domínios</SelectItem>
                  {Object.entries(DOMAIN_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.gapType || "all"} onValueChange={v => setFilter("gapType", v === "all" ? "" : v)}>
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue placeholder="Tipo de Gap" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {GAP_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                <Filter className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lista de Gaps</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : filteredGaps.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p className="text-sm">Nenhum gap encontrado com os filtros aplicados.</p>
                <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Requisito</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Domínio</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Criticidade</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Tipo</th>
                      <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground">Score</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Prioridade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGaps.map((gap, idx) => (
                      <tr key={gap.id ?? idx} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-xs">{gap.requirementName}</p>
                            <p className="text-xs text-muted-foreground">{gap.requirementCode}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {DOMAIN_LABELS[gap.domain] ?? gap.domain}
                        </td>
                        <td className="px-4 py-3">
                          <CriticalityBadge value={gap.criticality} />
                        </td>
                        <td className="px-4 py-3">
                          <ComplianceStatusBadge value={gap.complianceStatus} />
                        </td>
                        <td className="px-4 py-3 text-xs capitalize text-muted-foreground">
                          {gap.gapType}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-sm">
                          {gap.score}
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge value={gap.actionPriority} />
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
