import { useParams, Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Download, FileText, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ComplianceKPICards } from "@/components/compliance-v3/dashboard/ComplianceKPICards";
import { ComplianceRadarChart } from "@/components/compliance-v3/dashboard/ComplianceRadarChart";
import { RiskMatrix4x4 } from "@/components/compliance-v3/dashboard/RiskMatrix4x4";
import { ExecutiveNarrative } from "@/components/compliance-v3/dashboard/ExecutiveNarrative";
import { DomainScoreBar } from "@/components/compliance-v3/shared/DomainScoreBar";
import { RiskLevelBadge, PriorityBadge } from "@/components/compliance-v3/shared/Badges";
import { useDashboardData } from "@/hooks/compliance-v3/useDashboardData";
import { useExportActions } from "@/hooks/compliance-v3/useExportActions";
import { trpc } from "@/lib/trpc";

const DOMAINS = [
  { value: "governanca_transicao", label: "Governança da Transição" },
  { value: "sistemas_erp_dados", label: "Sistemas ERP e Dados" },
  { value: "obrigacoes_acessorias", label: "Obrigações Acessórias" },
  { value: "gestao_creditos", label: "Gestão de Créditos" },
  { value: "contratos_comerciais", label: "Contratos Comerciais" },
  { value: "precificacao_margem", label: "Precificação e Margem" },
  { value: "cadastro_fiscal", label: "Cadastro Fiscal" },
  { value: "split_payment", label: "Split Payment" },
  { value: "cashflow_financeiro", label: "Cashflow e Financeiro" },
  { value: "rh_folha", label: "RH e Folha" },
  { value: "juridico_regulatorio", label: "Jurídico e Regulatório" },
  { value: "comunicacao_stakeholders", label: "Comunicação e Stakeholders" },
];

export default function ComplianceDashboardV3() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [, setLocation] = useLocation();

  // Filtro por domínio — persistido na URL como query param
  const [selectedDomain, setSelectedDomain] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      return url.searchParams.get("domain") || null;
    }
    return null;
  });

  // Sincronizar selectedDomain com a URL
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedDomain) {
      url.searchParams.set("domain", selectedDomain);
    } else {
      url.searchParams.delete("domain");
    }
    window.history.replaceState({}, "", url.toString());
  }, [selectedDomain]);

  const { data, isLoading, refetch, selectedCell, setSelectedCell } = useDashboardData(projectId);
  const { exportCsv, exportPdf, isExporting } = useExportActions(projectId);

  const { data: executiveData, isLoading: isLoadingExecutive } = trpc.complianceV3.getExecutiveSummary.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const { data: riskData } = trpc.complianceV3.getRiskMatrix.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const overallScore = data?.overallScore ?? 0;
  const summary = data?.summary;
  const radar = data?.radar ?? {};
  const taskSummary = data?.taskSummary;

  // Build matrix cells from risk data
  const matrixCells: Array<{ probability: number; impact: number; count: number }> = [];
  if (riskData?.risks) {
    const cellMap = new Map<string, number>();
    for (const r of riskData.risks as Array<{ probability: number; impact: number }>) {
      const key = `${r.probability}-${r.impact}`;
      cellMap.set(key, (cellMap.get(key) ?? 0) + 1);
    }
    for (const [key, count] of Array.from(cellMap.entries())) {
      const [p, i] = key.split("-").map(Number);
      matrixCells.push({ probability: p, impact: i, count });
    }
  }

  // Critical domains: score < 60
  const criticalDomains = Object.entries(radar)
    .filter(([, score]) => score < 60)
    .map(([domain]) => domain);

  // Score e label do domínio selecionado
  const domainScore = selectedDomain ? (radar as Record<string, number>)[selectedDomain] ?? null : null;
  const domainLabel = selectedDomain ? DOMAINS.find((d) => d.value === selectedDomain)?.label ?? selectedDomain : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projetos/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">Dashboard de Compliance v3</h1>
            <p className="text-xs text-muted-foreground">Reforma Tributária — IBS/CBS/IS</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={isExporting}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={isExporting}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            PDF
          </Button>
          <Link href={`/projetos/${projectId}/compliance-v3/assessment`}>
            <Button size="sm">
              Iniciar Assessment
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Filtro por Domínio */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrar por domínio:</span>
          </div>
          <Select
            value={selectedDomain ?? "all"}
            onValueChange={(v) => setSelectedDomain(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todos os domínios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os domínios</SelectItem>
              {DOMAINS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDomain && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDomain(null)}>
                <X className="w-4 h-4" />
              </Button>
              {domainScore !== null && (
                <Badge variant="outline" className="text-sm">
                  {domainLabel}: {domainScore}/100
                </Badge>
              )}
            </>
          )}
        </div>

        {/* KPIs */}
        <ComplianceKPICards
          complianceScore={overallScore}
          criticalRisks={data?.riskSummary?.critico ?? 0}
          immediateActions={data?.actionSummary?.imediata ?? 0}
          progressPercent={taskSummary?.progressPercent ?? 0}
        />

        {/* Executive Narrative */}
        {executiveData && (
          <ExecutiveNarrative
            executiveSummary={String((executiveData as Record<string, unknown>).executiveSummary ?? "")}
            topRisksNarrative={String((executiveData as Record<string, unknown>).topRisksNarrative ?? "")}
            actionPlanNarrative={String((executiveData as Record<string, unknown>).actionPlanNarrative ?? "")}
            isLoading={isLoadingExecutive}
          />
        )}

        {/* Radar + Domain Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Radar de Compliance por Domínio</CardTitle>
            </CardHeader>
            <CardContent>
              <ComplianceRadarChart
                radar={radar}
                criticalDomains={criticalDomains}
                height={300}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Score por Domínio</CardTitle>
            </CardHeader>
            <CardContent>
              <DomainScoreBar radar={radar} criticalDomains={criticalDomains} />
            </CardContent>
          </Card>
        </div>

        {/* Risk Matrix + Top Risks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Matriz de Risco 4×4</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskMatrix4x4
                matrix={matrixCells}
                selectedCell={selectedCell}
                onCellClick={(cell) => setSelectedCell(
                  selectedCell?.probability === cell.probability && selectedCell?.impact === cell.impact
                    ? undefined
                    : cell
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top Riscos Críticos</CardTitle>
            </CardHeader>
            <CardContent>
              {riskData?.risks && riskData.risks.length > 0 ? (
                <div className="space-y-2">
                  {(riskData.risks as Array<{
                    riskCode: string;
                    requirementName?: string;
                    domain: string;
                    riskLevel: string;
                    riskScore: number;
                    riskDimension?: string;
                  }>)
                    .filter(r => r.riskLevel === "critico" || r.riskLevel === "alto")
                    .slice(0, 8)
                    .map(r => (
                      <div key={r.riskCode} className="flex items-center justify-between py-1.5 border-b last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{r.requirementName ?? r.riskCode}</p>
                          <p className="text-xs text-muted-foreground">{r.domain}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs font-bold tabular-nums">{r.riskScore}</span>
                          <RiskLevelBadge value={r.riskLevel} />
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum risco crítico identificado
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total de Requisitos", value: summary?.totalRequirements ?? 0 },
            { label: "Gaps Identificados", value: summary?.totalGaps ?? 0 },
            { label: "Ações no Plano", value: summary?.totalActions ?? 0 },
            { label: "Tarefas Geradas", value: taskSummary?.total ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/40 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Ver Gaps", href: `/projetos/${projectId}/compliance-v3/gaps`, icon: "🔍" },
            { label: "Ver Riscos", href: `/projetos/${projectId}/compliance-v3/risks`, icon: "⚠️" },
            { label: "Plano de Ação", href: `/projetos/${projectId}/compliance-v3/actions`, icon: "📋" },
            { label: "Tarefas", href: `/projetos/${projectId}/compliance-v3/tasks`, icon: "✅" },
          ].map(({ label, href, icon }) => (
            <Link key={href} href={href}>
              <Button variant="outline" className="w-full h-12 text-sm">
                <span className="mr-2">{icon}</span>
                {label}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
