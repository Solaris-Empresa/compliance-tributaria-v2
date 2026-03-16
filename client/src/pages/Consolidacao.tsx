import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Download,
  Save,
  ArrowRight,
  Clock,
  Target,
  BarChart3,
  FileText,
  Loader2,
  ChevronRight,
  Star,
  Shield,
  Zap,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface KeyFinding {
  title: string;
  description: string;
  severity: "critica" | "alta" | "media" | "baixa";
  branchCode: string;
}

interface Recommendation {
  action: string;
  priority: "critica" | "alta" | "media" | "baixa";
  deadline: string;
  responsible: string;
}

interface TimelinePhase {
  phase: string;
  duration: string;
  actions: string[];
  priority: "critica" | "alta" | "media" | "baixa";
}

interface BranchSummary {
  code: string;
  name: string;
  riskLevel: string;
  topAction: string;
  complianceGap: string;
}

interface ConsolidationData {
  sessionToken: string;
  status: string;
  executiveSummary: string | null;
  keyFindings: KeyFinding[] | null;
  topRecommendations: Recommendation[] | null;
  timeline: TimelinePhase[] | null;
  branchSummaries: BranchSummary[] | null;
  complianceScore: number;
  overallRiskLevel: string;
  totalActions: number;
  criticalActions: number;
  estimatedDays: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const severityColor: Record<string, string> = {
  critica: "bg-red-100 text-red-800 border-red-200",
  alta: "bg-orange-100 text-orange-800 border-orange-200",
  media: "bg-yellow-100 text-yellow-800 border-yellow-200",
  baixa: "bg-green-100 text-green-800 border-green-200",
};

const riskColor: Record<string, string> = {
  critico: "text-red-600",
  alto: "text-orange-600",
  medio: "text-yellow-600",
  baixo: "text-green-600",
};

const scoreColor = (score: number) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
};

const scoreLabel = (score: number) => {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bom";
  if (score >= 40) return "Regular";
  return "Crítico";
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Consolidacao() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const sessionToken = new URLSearchParams(window.location.search).get("session") ?? "";

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Buscar consolidação existente
  const { data: consolidation, refetch } = trpc.sessionConsolidation.get.useQuery(
    { sessionToken },
    { enabled: !!sessionToken }
  );

  // Buscar dados para exportação
  const { data: exportData } = trpc.sessionConsolidation.exportData.useQuery(
    { sessionToken },
    { enabled: !!sessionToken && !!consolidation }
  );

  // Mutations
  const generateMutation = trpc.sessionConsolidation.generate.useMutation({
    onSuccess: () => {
      toast.success("Consolidação gerada com sucesso!");
      refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const saveToHistoryMutation = trpc.sessionConsolidation.saveToHistory.useMutation({
    onSuccess: (data) => {
      toast.success(`Projeto salvo! ID: ${data.projectId}`);
      setShowSaveModal(false);
      navigate(`/projetos/${data.projectId}`);
    },
    onError: (err) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  const handleGenerate = async () => {
    if (!sessionToken) return;
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync({ sessionToken });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportJSON = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-diagnostico-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dados exportados com sucesso!");
  };

  const handleExportCSV = () => {
    if (!exportData?.planItems) return;
    const headers = ["Ação", "Ramo", "Prioridade", "Prazo", "Status", "Custo Estimado"];
    const rows = exportData.planItems.map((item: any) => [
      `"${item.action}"`,
      `"${item.branchName}"`,
      item.priority,
      item.deadline,
      item.status,
      item.estimatedCost,
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plano-acao-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  };

  const handleSaveToHistory = async () => {
    if (!projectName.trim()) {
      toast.error("Informe o nome do projeto");
      return;
    }
    setIsSaving(true);
    try {
      await saveToHistoryMutation.mutateAsync({
        sessionToken,
        projectName: projectName.trim(),
        companyName: exportData?.metadata?.companyDescription ?? "Empresa",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Sem sessão ─────────────────────────────────────────────────────────────
  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 border-white/20 text-white">
          <CardContent className="pt-8 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Sessão não encontrada</h2>
            <p className="text-white/70 mb-6">Inicie um novo diagnóstico para continuar.</p>
            <Button onClick={() => navigate("/modo-uso")} className="bg-blue-600 hover:bg-blue-700">
              Iniciar Diagnóstico
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Sem consolidação ainda ─────────────────────────────────────────────────
  if (!consolidation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full bg-white/10 border-white/20 text-white">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-blue-400" />
            </div>
            <CardTitle className="text-2xl">Gerar Consolidação Final</CardTitle>
            <p className="text-white/70 mt-2">
              A IA irá consolidar todas as análises dos ramos e gerar um relatório executivo completo
              com score de compliance, principais achados e recomendações priorizadas.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <p className="text-sm text-white/60 font-medium">O relatório incluirá:</p>
              <ul className="space-y-1 text-sm text-white/80">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Score de Compliance (0-100)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Sumário Executivo personalizado</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Principais achados por ramo</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Top 5 recomendações prioritárias</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Timeline de implementação</li>
              </ul>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
            >
              {isGenerating ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando Consolidação...</>
              ) : (
                <><Zap className="w-5 h-5 mr-2" /> Gerar Consolidação com IA</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/plano-acao-session?session=${sessionToken}`)}
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Voltar ao Plano de Ação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = consolidation as ConsolidationData;
  const keyFindings = (data.keyFindings ?? []) as KeyFinding[];
  const topRecommendations = (data.topRecommendations ?? []) as Recommendation[];
  const timeline = (data.timeline ?? []) as TimelinePhase[];
  const branchSummaries = (data.branchSummaries ?? []) as BranchSummary[];

  // ─── Consolidação Gerada ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Relatório de Compliance</h1>
              <p className="text-xs text-white/50">Reforma Tributária 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="border-white/20 text-white hover:bg-white/10 text-xs"
            >
              <Download className="w-3 h-3 mr-1" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="border-white/20 text-white hover:bg-white/10 text-xs"
            >
              <Download className="w-3 h-3 mr-1" /> JSON
            </Button>
            {user ? (
              <Button
                size="sm"
                onClick={() => setShowSaveModal(true)}
                className="bg-green-600 hover:bg-green-700 text-xs"
              >
                <Save className="w-3 h-3 mr-1" /> Salvar no Histórico
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate("/modo-uso")}
                className="bg-blue-600 hover:bg-blue-700 text-xs"
              >
                <ArrowRight className="w-3 h-3 mr-1" /> Criar Conta
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Score de Compliance */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Score Principal */}
          <Card className="md:col-span-1 bg-white/10 border-white/20">
            <CardContent className="pt-6 text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={data.complianceScore >= 60 ? "#22c55e" : data.complianceScore >= 40 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="3"
                    strokeDasharray={`${data.complianceScore} ${100 - data.complianceScore}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${scoreColor(data.complianceScore)}`}>
                    {data.complianceScore}
                  </span>
                </div>
              </div>
              <p className={`font-semibold ${scoreColor(data.complianceScore)}`}>
                {scoreLabel(data.complianceScore)}
              </p>
              <p className="text-xs text-white/50 mt-1">Score de Compliance</p>
            </CardContent>
          </Card>

          {/* Métricas */}
          <Card className="bg-white/10 border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-white/70">Ações Críticas</span>
              </div>
              <p className="text-3xl font-bold text-red-400">{data.criticalActions}</p>
              <p className="text-xs text-white/50 mt-1">de {data.totalActions} totais</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-white/70">Risco Geral</span>
              </div>
              <p className={`text-2xl font-bold capitalize ${riskColor[data.overallRiskLevel] ?? "text-white"}`}>
                {data.overallRiskLevel}
              </p>
              <p className="text-xs text-white/50 mt-1">nível identificado</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white/70">Prazo Estimado</span>
              </div>
              <p className="text-3xl font-bold text-blue-400">{data.estimatedDays ?? 90}</p>
              <p className="text-xs text-white/50 mt-1">dias para adequação</p>
            </CardContent>
          </Card>
        </div>

        {/* Sumário Executivo */}
        {data.executiveSummary && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="w-5 h-5 text-blue-400" />
                Sumário Executivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/80 leading-relaxed">{data.executiveSummary}</p>
            </CardContent>
          </Card>
        )}

        {/* Principais Achados */}
        {keyFindings.length > 0 && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Star className="w-5 h-5 text-yellow-400" />
                Principais Achados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {keyFindings.map((finding, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <Badge className={`shrink-0 text-xs border ${severityColor[finding.severity] ?? ""}`}>
                      {finding.severity}
                    </Badge>
                    <div>
                      <p className="font-medium text-white text-sm">{finding.title}</p>
                      <p className="text-white/60 text-xs mt-1">{finding.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Recomendações */}
        {topRecommendations.length > 0 && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Top Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topRecommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-6 h-6 bg-blue-600/40 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-blue-300">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{rec.action}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className={`text-xs border ${severityColor[rec.priority] ?? ""}`}>
                          {rec.priority}
                        </Badge>
                        <span className="text-xs text-white/50 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {rec.deadline}
                        </span>
                        <span className="text-xs text-white/50">{rec.responsible}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-purple-400" />
                Timeline de Implementação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((phase, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                        ${phase.priority === "critica" ? "bg-red-600" : phase.priority === "alta" ? "bg-orange-600" : "bg-blue-600"}`}>
                        {idx + 1}
                      </div>
                      {idx < timeline.length - 1 && <div className="w-0.5 h-full bg-white/10 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white text-sm">{phase.phase}</p>
                        <Badge className="text-xs bg-white/10 text-white/70 border-white/20">
                          {phase.duration}
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {phase.actions.map((action, aIdx) => (
                          <li key={aIdx} className="text-xs text-white/60 flex items-center gap-1">
                            <ChevronRight className="w-3 h-3 text-white/30" /> {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo por Ramo */}
        {branchSummaries.length > 0 && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                Resumo por Ramo de Atividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {branchSummaries.map((branch, idx) => (
                  <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-white text-sm">{branch.name}</p>
                      <Badge className={`text-xs border ${severityColor[branch.riskLevel] ?? "bg-white/10 text-white border-white/20"}`}>
                        {branch.riskLevel}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/60 mb-1">
                      <span className="text-white/40">Prioridade: </span>{branch.topAction}
                    </p>
                    <p className="text-xs text-white/50">{branch.complianceGap}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações Finais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/plano-acao-session?session=${sessionToken}`)}
            className="border-white/20 text-white hover:bg-white/10 h-12"
          >
            Ver Plano de Ação Completo
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/matriz-riscos-session?session=${sessionToken}`)}
            className="border-white/20 text-white hover:bg-white/10 h-12"
          >
            Ver Matriz de Riscos
          </Button>
          {user ? (
            <Button
              onClick={() => setShowSaveModal(true)}
              className="bg-green-600 hover:bg-green-700 h-12"
            >
              <Save className="w-4 h-4 mr-2" /> Salvar no Histórico
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/modo-uso")}
              className="bg-blue-600 hover:bg-blue-700 h-12"
            >
              <ArrowRight className="w-4 h-4 mr-2" /> Criar Conta Gratuita
            </Button>
          )}
        </div>
      </div>

      {/* Modal: Salvar no Histórico */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900 border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-5 h-5 text-green-400" />
                Salvar no Histórico
              </CardTitle>
              <p className="text-sm text-white/60">
                Crie um projeto permanente com todas as análises e plano de ação.
                As tarefas serão adicionadas ao seu Kanban automaticamente.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-1 block">Nome do Projeto</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ex: Diagnóstico Reforma Tributária 2026"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Separator className="bg-white/10" />
              <div className="bg-white/5 rounded-lg p-3 space-y-1 text-xs text-white/60">
                <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" /> {data.totalActions} tarefas criadas no Kanban</p>
                <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" /> Relatório completo salvo</p>
                <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" /> Acesso permanente ao histórico</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveToHistory}
                  disabled={isSaving || !projectName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...</> : "Salvar Projeto"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
