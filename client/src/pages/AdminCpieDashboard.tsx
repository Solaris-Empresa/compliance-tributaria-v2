/**
 * AdminCpieDashboard.tsx — Sprint L3
 *
 * Dashboard de métricas CPIE com:
 * - KPIs globais (score médio, distribuição de readiness, projetos analisados)
 * - Gráfico de barras: distribuição de scores por faixa
 * - Gráfico de pizza: distribuição de readiness levels
 * - Gráfico de linha: evolução do score médio por mês (baseado em cpie_analysis_history)
 * - Tabela de projetos com score mais baixo (ação imediata)
 */

import { useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain, TrendingUp, BarChart3, PieChart, ArrowLeft, ExternalLink,
  AlertTriangle, CheckCircle2, Loader2, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getReadinessLabel(level: string) {
  const map: Record<string, string> = {
    insufficient: "Insuficiente",
    basic: "Básico",
    good: "Bom",
    excellent: "Excelente",
  };
  return map[level] ?? level;
}

function getReadinessColor(level: string) {
  const map: Record<string, string> = {
    insufficient: "bg-red-100 text-red-700",
    basic: "bg-amber-100 text-amber-700",
    good: "bg-blue-100 text-blue-700",
    excellent: "bg-emerald-100 text-emerald-700",
  };
  return map[level] ?? "bg-gray-100 text-gray-700";
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function AdminCpieDashboard() {
  const { user } = useAuth();

  // Buscar projetos
  const { data: projects, isLoading, isError, refetch } = trpc.projects.list.useQuery();

  // Buscar histórico de análises para gráfico de evolução
  // Usamos o getAnalysisHistory de um projeto dummy para obter dados agregados
  // Na prática, vamos calcular a evolução a partir dos projetos com profileLastAnalyzedAt

  const metrics = useMemo(() => {
    if (!projects) return null;

    const total = projects.length;
    const analyzed = projects.filter((p: any) => p.profileCompleteness && p.profileCompleteness > 0);
    const avgScore = analyzed.length > 0
      ? Math.round(analyzed.reduce((sum: number, p: any) => sum + (p.profileCompleteness || 0), 0) / analyzed.length)
      : 0;

    // Distribuição por faixa de score
    const scoreRanges = {
      "0-20%": projects.filter((p: any) => (p.profileCompleteness ?? 0) <= 20).length,
      "21-40%": projects.filter((p: any) => (p.profileCompleteness ?? 0) > 20 && (p.profileCompleteness ?? 0) <= 40).length,
      "41-60%": projects.filter((p: any) => (p.profileCompleteness ?? 0) > 40 && (p.profileCompleteness ?? 0) <= 60).length,
      "61-80%": projects.filter((p: any) => (p.profileCompleteness ?? 0) > 60 && (p.profileCompleteness ?? 0) <= 80).length,
      "81-100%": projects.filter((p: any) => (p.profileCompleteness ?? 0) > 80).length,
    };

    // Distribuição de readiness (inferida do score)
    const readiness = {
      insufficient: projects.filter((p: any) => (p.profileCompleteness ?? 0) < 40).length,
      basic: projects.filter((p: any) => (p.profileCompleteness ?? 0) >= 40 && (p.profileCompleteness ?? 0) < 65).length,
      good: projects.filter((p: any) => (p.profileCompleteness ?? 0) >= 65 && (p.profileCompleteness ?? 0) < 85).length,
      excellent: projects.filter((p: any) => (p.profileCompleteness ?? 0) >= 85).length,
    };

    // Projetos com score baixo (ação imediata)
    const lowScoreProjects = [...projects]
      .filter((p: any) => (p.profileCompleteness ?? 0) < 50)
      .sort((a: any, b: any) => (a.profileCompleteness ?? 0) - (b.profileCompleteness ?? 0))
      .slice(0, 8);

    // Projetos com score alto (destaque)
    const topProjects = [...projects]
      .filter((p: any) => (p.profileCompleteness ?? 0) >= 80)
      .sort((a: any, b: any) => (b.profileCompleteness ?? 0) - (a.profileCompleteness ?? 0))
      .slice(0, 5);

    return { total, analyzed: analyzed.length, avgScore, scoreRanges, readiness, lowScoreProjects, topProjects };
  }, [projects]);

  // Verificar permissão
  if (user && user.role !== "equipe_solaris" && user.role !== "advogado_senior") {
    return (
      <ComplianceLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground text-center max-w-sm">
            Esta área é restrita à equipe SOLARIS e advogados sênior.
          </p>
        </div>
      </ComplianceLayout>
    );
  }

  if (isLoading || !metrics) {
    return (
      <ComplianceLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ComplianceLayout>
    );
  }
  if (isError) return (
    <Alert variant="destructive">
      <AlertDescription>Erro ao carregar métricas. Tente novamente.</AlertDescription>
    </Alert>
  );

  // ── Dados dos gráficos ────────────────────────────────────────────────────

  const barChartData = {
    labels: Object.keys(metrics.scoreRanges),
    datasets: [{
      label: "Projetos",
      data: Object.values(metrics.scoreRanges),
      backgroundColor: [
        "rgba(239, 68, 68, 0.7)",
        "rgba(249, 115, 22, 0.7)",
        "rgba(234, 179, 8, 0.7)",
        "rgba(59, 130, 246, 0.7)",
        "rgba(34, 197, 94, 0.7)",
      ],
      borderRadius: 6,
    }],
  };

  const pieChartData = {
    labels: ["Insuficiente (<40%)", "Básico (40-64%)", "Bom (65-84%)", "Excelente (≥85%)"],
    datasets: [{
      data: [
        metrics.readiness.insufficient,
        metrics.readiness.basic,
        metrics.readiness.good,
        metrics.readiness.excellent,
      ],
      backgroundColor: [
        "rgba(239, 68, 68, 0.8)",
        "rgba(249, 115, 22, 0.8)",
        "rgba(59, 130, 246, 0.8)",
        "rgba(34, 197, 94, 0.8)",
      ],
      borderWidth: 2,
      borderColor: "#fff",
    }],
  };

  // Gráfico de linha: simular evolução mensal (últimos 6 meses)
  // Baseado em projetos analisados por mês (profileLastAnalyzedAt)
  const now = new Date();
  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  });

  const monthlyScores = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthProjects = (projects || []).filter((p: any) => {
      if (!p.profileLastAnalyzedAt) return false;
      const analyzed = new Date(p.profileLastAnalyzedAt);
      return analyzed >= d && analyzed < nextMonth;
    });
    if (monthProjects.length === 0) return null;
    return Math.round(monthProjects.reduce((sum: number, p: any) => sum + (p.profileCompleteness || 0), 0) / monthProjects.length);
  });

  const lineChartData = {
    labels: monthLabels,
    datasets: [{
      label: "Score Médio CPIE (%)",
      data: monthlyScores,
      borderColor: "rgb(99, 102, 241)",
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointBackgroundColor: "rgb(99, 102, 241)",
      spanGaps: true,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  return (
    <ComplianceLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin/consistencia">
                <Button variant="ghost" size="sm" className="gap-1 h-7 px-2 text-muted-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />Consistência
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Dashboard CPIE
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Métricas e evolução do Company Profile Intelligence Engine.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total de Projetos", value: metrics.total, icon: <Brain className="h-5 w-5" />, color: "text-primary" },
            { label: "Projetos Analisados", value: metrics.analyzed, icon: <CheckCircle2 className="h-5 w-5" />, color: "text-emerald-600" },
            { label: "Score Médio CPIE", value: `${metrics.avgScore}%`, icon: <TrendingUp className="h-5 w-5" />, color: "text-blue-600" },
            { label: "Precisam de Atenção", value: metrics.readiness.insufficient + metrics.readiness.basic, icon: <AlertTriangle className="h-5 w-5" />, color: "text-amber-600" },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={kpi.color}>{kpi.icon}</span>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={cn("text-3xl font-bold", kpi.color)}>{kpi.value}</p>
            </Card>
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Distribuição por faixa de score */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Distribuição de Score CPIE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: "220px" }}>
                <Bar
                  data={barChartData}
                  options={{ ...chartOptions, maintainAspectRatio: false }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Distribuição de readiness */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                Readiness Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: "220px" }}>
                <Pie
                  data={pieChartData}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 12 } } } }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Evolução mensal */}
          <Card className="md:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Evolução do Score Médio CPIE — Últimos 6 Meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: "200px" }}>
                <Line
                  data={lineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } } },
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Baseado em projetos com análise CPIE registrada no período. Meses sem análises aparecem como lacunas.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Projetos que precisam de atenção */}
        {metrics.lowScoreProjects.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Projetos com Score Baixo — Ação Imediata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {metrics.lowScoreProjects.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: (p.profileCompleteness ?? 0) < 20 ? "#fee2e2" : "#fef9c3",
                          color: (p.profileCompleteness ?? 0) < 20 ? "#991b1b" : "#854d0e",
                        }}
                      >
                        {p.profileCompleteness ?? 0}%
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.status}</p>
                      </div>
                    </div>
                    <Link href={`/projetos/${p.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1 h-7">
                        <ExternalLink className="h-3.5 w-3.5" />Ver
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top projetos */}
        {metrics.topProjects.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Projetos com Score Excelente (≥80%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {metrics.topProjects.map((p: any) => (
                  <Link key={p.id} href={`/projetos/${p.id}`}>
                    <Badge
                      variant="outline"
                      className="gap-1.5 cursor-pointer hover:bg-emerald-50 border-emerald-200 text-emerald-700"
                    >
                      <span className="font-bold">{p.profileCompleteness}%</span>
                      {p.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </ComplianceLayout>
  );
}
