import { Link } from "wouter";
import { ArrowRight, AlertTriangle, CheckCircle, Clock, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComplianceKPICards } from "@/components/compliance-v3/dashboard/ComplianceKPICards";
import { ComplianceRadarChart } from "@/components/compliance-v3/dashboard/ComplianceRadarChart";
import { RiskMatrix4x4 } from "@/components/compliance-v3/dashboard/RiskMatrix4x4";
import DemoLayout from "./DemoLayout";
import {
  DEMO,
  DEMO_RADAR,
  DEMO_MATRIX_CELLS,
  DOMAIN_LABELS_DEMO,
  RISK_LEVEL_LABELS,
  PRIORITY_LABELS,
} from "@/lib/demo-engine";

const CRITICALITY_COLORS: Record<string, string> = {
  critica: "text-red-600 bg-red-50 border-red-200",
  alta: "text-orange-600 bg-orange-50 border-orange-200",
  media: "text-yellow-600 bg-yellow-50 border-yellow-200",
  baixa: "text-green-600 bg-green-50 border-green-200",
};

const RISK_COLORS: Record<string, string> = {
  critico: "text-red-600 bg-red-50",
  alto: "text-orange-600 bg-orange-50",
  medio: "text-yellow-600 bg-yellow-50",
  baixo: "text-green-600 bg-green-50",
};

export default function DemoDashboard() {
  const criticalItems = DEMO.requirements
    .filter(r => r.risk.riskLevel === "critico" || r.risk.riskLevel === "alto")
    .sort((a, b) => b.risk.probability * b.risk.impact - a.risk.probability * a.risk.impact);

  const radarForChart: Record<string, number> = {};
  for (const item of DEMO.radar) {
    radarForChart[item.domain] = item.score;
  }

  const criticalDomains = DEMO.radar
    .filter(r => r.score < 40)
    .map(r => r.domain);

  // Build radar with human-readable labels for the chart
  const radarWithLabels: Record<string, number> = {};
  for (const item of DEMO.radar) {
    const label = DOMAIN_LABELS_DEMO[item.domain] ?? item.domain.replace(/_/g, " ");
    radarWithLabels[label] = item.score;
  }

  return (
    <DemoLayout
      title="Dashboard de Compliance"
      subtitle="Visão executiva do status de adequação à Reforma Tributária (LC 214/2023)"
    >
      {/* KPI Cards */}
      <ComplianceKPICards
        complianceScore={DEMO.overallScore}
        criticalRisks={DEMO.criticalRisks}
        immediateActions={DEMO.immediateActions}
        progressPercent={0}
      />

      {/* Radar + Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Radar de Compliance por Domínio</CardTitle>
            <p className="text-xs text-muted-foreground">Score 0–100 por área de adequação</p>
          </CardHeader>
          <CardContent>
            <ComplianceRadarChart
              radar={radarWithLabels}
              criticalDomains={criticalDomains}
              height={300}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Matriz de Risco 4×4</CardTitle>
            <p className="text-xs text-muted-foreground">Probabilidade × Impacto</p>
          </CardHeader>
          <CardContent>
            <RiskMatrix4x4 matrix={DEMO_MATRIX_CELLS} />
          </CardContent>
        </Card>
      </div>

      {/* Domain scores */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Score por Domínio</CardTitle>
            <Link href="/demo/gaps">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                Ver Gaps <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DEMO.radar.map(item => {
              const pct = item.score;
              const color =
                pct >= 80 ? "bg-green-500" :
                pct >= 60 ? "bg-yellow-500" :
                pct >= 40 ? "bg-orange-500" : "bg-red-500";
              return (
                <div key={item.domain} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-48 shrink-0 truncate">
                    {DOMAIN_LABELS_DEMO[item.domain] ?? item.domain}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${color} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-10 text-right ${
                    pct >= 80 ? "text-green-600" :
                    pct >= 60 ? "text-yellow-600" :
                    pct >= 40 ? "text-orange-600" : "text-red-600"
                  }`}>{pct}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Critical items */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Requisitos Críticos e de Alto Risco
            </CardTitle>
            <Link href="/demo/riscos">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                Ver Matriz <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {criticalItems.map(req => (
              <div
                key={req.code}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50"
              >
                <div className="shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    CRITICALITY_COLORS[req.score.effectiveCriticality] ?? "text-slate-600 bg-slate-50 border-slate-200"
                  }`}>
                    {req.score.effectiveCriticality.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{req.name}</p>
                  <p className="text-xs text-slate-500">
                    {DOMAIN_LABELS_DEMO[req.domain] ?? req.domain} · Score: {req.score.finalScore}/100
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    RISK_COLORS[req.risk.riskLevel] ?? "text-slate-600 bg-slate-50"
                  }`}>
                    {RISK_LEVEL_LABELS[req.risk.riskLevel] ?? req.risk.riskLevel}
                  </span>
                  <span className="text-xs text-slate-400">
                    {req.action.estimatedDays}d
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Link href="/demo/gaps">
          <a className="block p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Analisar Gaps</p>
                <p className="text-xs text-slate-500">{DEMO.requirements.filter(r => r.gap.gapLevel !== "atendido").length} gaps identificados</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-500 transition-colors" />
            </div>
          </a>
        </Link>
        <Link href="/demo/acoes">
          <a className="block p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Plano de Ação</p>
                <p className="text-xs text-slate-500">{DEMO.immediateActions} ações imediatas</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-500 transition-colors" />
            </div>
          </a>
        </Link>
        <Link href="/demo/tarefas">
          <a className="block p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Tarefas Atômicas</p>
                <p className="text-xs text-slate-500">{DEMO.requirements.reduce((a, r) => a + r.tasks.length, 0)} tarefas geradas</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-500 transition-colors" />
            </div>
          </a>
        </Link>
      </div>
    </DemoLayout>
  );
}
