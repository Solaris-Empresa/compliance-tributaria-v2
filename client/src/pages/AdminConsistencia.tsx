/**
 * AdminConsistencia.tsx
 * Sprint v6.0 — Issue F1
 *
 * Painel administrativo de Consistência:
 * - Lista projetos com status de consistência (ok, warning, blocked, pending)
 * - Exibe riscos aceitos com justificativa
 * - Mostra score CPIE por projeto
 * - Permite equipe SOLARIS revisar inconsistências críticas
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ShieldCheck, ShieldAlert, ShieldX, Shield, Search, ExternalLink,
  AlertTriangle, CheckCircle2, Clock, Brain, TrendingUp, RefreshCw,
  ChevronRight, Info, User, Calendar, Download, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CpieReportExport } from "@/components/CpieReportExport";
import { CpieBatchPanel } from "@/components/CpieBatchPanel";
import { CpieSettingsPanel } from "@/components/CpieSettingsPanel";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ConsistencyStatus = "pending" | "analyzing" | "ok" | "warning" | "blocked";

interface ProjectWithConsistency {
  id: number;
  name: string;
  status: string;
  consistencyStatus: ConsistencyStatus | null;
  consistencyAcceptedRiskReason: string | null;
  consistencyAcceptedRiskAt: string | null;
  profileCompleteness: number | null;
  profileConfidence: number | null;
  profileLastAnalyzedAt: string | null;
  profileIntelligenceData: any;
  clientName?: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ConsistencyStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending: { label: "Pendente", icon: <Clock className="h-3.5 w-3.5" />, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-800" },
  analyzing: { label: "Analisando", icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
  ok: { label: "OK", icon: <ShieldCheck className="h-3.5 w-3.5" />, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  warning: { label: "Risco Aceito", icon: <ShieldAlert className="h-3.5 w-3.5" />, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  blocked: { label: "Bloqueado", icon: <ShieldX className="h-3.5 w-3.5" />, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
};

function ConsistencyBadge({ status }: { status: ConsistencyStatus | null }) {
  const cfg = STATUS_CONFIG[status || "pending"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium", cfg.color, cfg.bg)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function ScoreBar({ value, label }: { value: number | null; label: string }) {
  const v = value ?? 0;
  const color = v >= 80 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-red-500";
  const textColor = v >= 80 ? "text-emerald-600" : v >= 50 ? "text-amber-600" : "text-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("text-xs font-bold tabular-nums", textColor)}>{v}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminConsistencia() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ConsistencyStatus | "all">("all");
  const [selectedProject, setSelectedProject] = useState<ProjectWithConsistency | null>(null);
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const generateMonthlyReport = trpc.cpie.generateMonthlyReport.useMutation({
    onSuccess: (data) => {
      setIsGeneratingReport(false);
      // Abrir relatório em nova aba
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(data.html);
        win.document.close();
        setTimeout(() => win.print(), 500);
      }
    },
    onError: () => setIsGeneratingReport(false),
  });

  // Buscar projetos com dados de consistência
  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery();

  // Filtrar e enriquecer projetos
  const enrichedProjects: ProjectWithConsistency[] = (projects || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    consistencyStatus: p.consistencyStatus || "pending",
    consistencyAcceptedRiskReason: p.consistencyAcceptedRiskReason || null,
    consistencyAcceptedRiskAt: p.consistencyAcceptedRiskAt || null,
    profileCompleteness: p.profileCompleteness ?? null,
    profileConfidence: p.profileConfidence ?? null,
    profileLastAnalyzedAt: p.profileLastAnalyzedAt || null,
    profileIntelligenceData: p.profileIntelligenceData || null,
    clientName: p.clientName || p.client?.name,
    createdAt: p.createdAt,
  }));

  const filtered = enrichedProjects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.clientName || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.consistencyStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  // Estatísticas
  const stats = {
    total: enrichedProjects.length,
    ok: enrichedProjects.filter(p => p.consistencyStatus === "ok").length,
    warning: enrichedProjects.filter(p => p.consistencyStatus === "warning").length,
    blocked: enrichedProjects.filter(p => p.consistencyStatus === "blocked").length,
    pending: enrichedProjects.filter(p => !p.consistencyStatus || p.consistencyStatus === "pending").length,
    avgScore: enrichedProjects.length > 0
      ? Math.round(enrichedProjects.reduce((sum, p) => sum + (p.profileCompleteness ?? 0), 0) / enrichedProjects.length)
      : 0,
  };

  // Verificar permissão
  if (user && user.role !== "equipe_solaris" && user.role !== "advogado_senior") {
    return (
      <ComplianceLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <ShieldX className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground text-center max-w-sm">
            Esta área é restrita à equipe SOLARIS e advogados sênior.
          </p>
        </div>
      </ComplianceLayout>
    );
  }

  return (
    <ComplianceLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Painel de Consistência
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitore o status de consistência e o score CPIE de todos os projetos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* K1: Análise em lote */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowBatchPanel(!showBatchPanel)}
            >
              <Brain className="h-4 w-4" />{showBatchPanel ? 'Ocultar Lote' : 'Analisar em Lote'}
            </Button>
            {/* K3: Relatório mensal */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isGeneratingReport || generateMonthlyReport.isPending}
              onClick={() => {
                setIsGeneratingReport(true);
                generateMonthlyReport.mutate({});
              }}
            >
              <TrendingUp className="h-4 w-4" />
              {generateMonthlyReport.isPending ? 'Gerando...' : 'Relatório Mensal'}
            </Button>
            {/* J3: Exportar CSV consolidado */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const riskProjects = enrichedProjects.filter(p => p.consistencyStatus === 'warning' || p.consistencyStatus === 'blocked');
                if (riskProjects.length === 0) { return; }
                const header = ['Nome do Projeto', 'Status Consistência', 'Score CPIE (%)', 'Data Aceite', 'Justificativa'];
                const rows = riskProjects.map(p => [
                  `"${p.name}"`,
                  p.consistencyStatus ?? '',
                  p.profileCompleteness ?? '',
                  p.consistencyAcceptedRiskAt ? new Date(p.consistencyAcceptedRiskAt).toLocaleDateString('pt-BR') : '',
                  `"${String(p.consistencyAcceptedRiskReason ?? '').replace(/"/g, "'")}"`,
                ]);
                const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `consistencia-riscos-${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4" />Exportar CSV
            </Button>
            {/* L1: Configurações CPIE */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            >
              <Settings className="h-4 w-4" />{showSettingsPanel ? 'Ocultar Config.' : 'Configurações'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />Atualizar
            </Button>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total, icon: <Info className="h-4 w-4" />, color: "text-foreground" },
            { label: "OK", value: stats.ok, icon: <ShieldCheck className="h-4 w-4" />, color: "text-emerald-600" },
            { label: "Risco Aceito", value: stats.warning, icon: <ShieldAlert className="h-4 w-4" />, color: "text-amber-600" },
            { label: "Bloqueado", value: stats.blocked, icon: <ShieldX className="h-4 w-4" />, color: "text-red-600" },
            { label: "Pendente", value: stats.pending, icon: <Clock className="h-4 w-4" />, color: "text-gray-600" },
            { label: "Score Médio", value: `${stats.avgScore}%`, icon: <Brain className="h-4 w-4" />, color: "text-primary" },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={stat.color}>{stat.icon}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* K1: Painel de análise em lote (colapsável) */}
        {showBatchPanel && (
          <CpieBatchPanel
            pendingCount={stats.pending}
            onComplete={() => refetch()}
          />
        )}

        {/* L1: Painel de configurações CPIE (colapsável) */}
        {showSettingsPanel && (
          <Card>
            <CardContent className="pt-5">
              <CpieSettingsPanel />
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por projeto ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "ok", "warning", "blocked", "pending"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  filterStatus === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                )}
              >
                {s === "all" ? "Todos" : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de projetos */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum projeto encontrado</p>
            <p className="text-sm mt-1">Ajuste os filtros ou aguarde novos projetos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Info principal */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{project.name}</span>
                      <ConsistencyBadge status={project.consistencyStatus} />
                      {project.consistencyStatus === "warning" && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          <AlertTriangle className="h-3 w-3 mr-1" />Risco aceito
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {project.clientName && (
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{project.clientName}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      {project.profileLastAnalyzedAt && (
                        <span className="flex items-center gap-1 text-primary">
                          <Brain className="h-3 w-3" />
                          Analisado em {new Date(project.profileLastAnalyzedAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score CPIE */}
                  <div className="w-full sm:w-48 space-y-2">
                    <ScoreBar value={project.profileCompleteness} label="Completude" />
                    <ScoreBar value={project.profileConfidence} label="Confiança IA" />
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    {(project.profileIntelligenceData || project.consistencyAcceptedRiskReason) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => setSelectedProject(project)}
                      >
                        <Info className="h-3.5 w-3.5" />Detalhes
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
                      <Link href={`/projetos/${project.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />Projeto
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Justificativa de risco aceito */}
                {project.consistencyStatus === "warning" && project.consistencyAcceptedRiskReason && (
                  <div className="px-4 pb-4">
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5" />Justificativa do risco aceito:
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{project.consistencyAcceptedRiskReason}</p>
                      {project.consistencyAcceptedRiskAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Aceito em {new Date(project.consistencyAcceptedRiskAt).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalhes CPIE */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Detalhes CPIE — {selectedProject?.name}
            </DialogTitle>
            <DialogDescription>
              Score por dimensão, sugestões e perguntas dinâmicas geradas pela IA.
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-4">
              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Score de Completude</p>
                  <p className={cn("text-3xl font-bold tabular-nums",
                    (selectedProject.profileCompleteness ?? 0) >= 80 ? "text-emerald-600" :
                    (selectedProject.profileCompleteness ?? 0) >= 50 ? "text-amber-600" : "text-red-500"
                  )}>{selectedProject.profileCompleteness ?? 0}%</p>
                </div>
                <div className="rounded-xl border p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Confiança da IA</p>
                  <p className={cn("text-3xl font-bold tabular-nums",
                    (selectedProject.profileConfidence ?? 0) >= 80 ? "text-emerald-600" :
                    (selectedProject.profileConfidence ?? 0) >= 50 ? "text-amber-600" : "text-red-500"
                  )}>{selectedProject.profileConfidence ?? 0}%</p>
                </div>
              </div>

              {/* Score por dimensão */}
              {selectedProject.profileIntelligenceData?.scoreBreakdown?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Score por Dimensão</p>
                  <div className="space-y-2">
                    {selectedProject.profileIntelligenceData.scoreBreakdown.map((dim: any) => (
                      <ScoreBar key={dim.category} value={dim.score} label={dim.category} />
                    ))}
                  </div>
                </div>
              )}

              {/* Sugestões */}
              {selectedProject.profileIntelligenceData?.suggestions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Sugestões da IA ({selectedProject.profileIntelligenceData.suggestions.length})
                  </p>
                  <div className="space-y-2">
                    {selectedProject.profileIntelligenceData.suggestions.map((sug: any, i: number) => (
                      <div key={i} className="rounded-xl border bg-muted/20 p-3 space-y-1">
                        <p className="text-xs font-semibold">{sug.field}</p>
                        <p className="text-xs text-muted-foreground">{sug.reason}</p>
                        {sug.suggestedValue && (
                          <p className="text-xs">
                            <span className="text-muted-foreground line-through">{sug.currentValue}</span>
                            <ChevronRight className="inline h-3 w-3 mx-1" />
                            <span className="font-medium">{sug.suggestedValue}</span>
                          </p>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {sug.accepted ? "✓ Aceita" : "Pendente"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Perguntas dinâmicas */}
              {selectedProject.profileIntelligenceData?.dynamicQuestions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Perguntas Dinâmicas ({selectedProject.profileIntelligenceData.dynamicQuestions.length})
                  </p>
                  <div className="space-y-2">
                    {selectedProject.profileIntelligenceData.dynamicQuestions.map((q: any, i: number) => (
                      <div key={i} className="rounded-xl border bg-muted/20 p-3 space-y-1">
                        <p className="text-xs font-medium">{q.question}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {q.answered ? "✓ Respondida" : "Pendente"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Campo: {q.field || "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risco aceito */}
              {selectedProject.consistencyAcceptedRiskReason && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-1">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />Risco aceito com justificativa
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedProject.consistencyAcceptedRiskReason}</p>
                  {selectedProject.consistencyAcceptedRiskAt && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(selectedProject.consistencyAcceptedRiskAt).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              )}
              {/* Botão Exportar PDF */}
              {selectedProject.profileIntelligenceData && (
                <div className="pt-2">
                  <CpieReportExport
                    projectId={selectedProject.id}
                    projectName={selectedProject.name}
                    variant="outline"
                    size="sm"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ComplianceLayout>
  );
}
