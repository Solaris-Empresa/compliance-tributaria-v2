// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, ChevronRight, Loader2, Sparkles, CheckCircle2,
  RefreshCw, ThumbsUp, Edit3, Building2, Cpu, Scale, BarChart3,
  Calendar, User, Bell, Filter, Download, ChevronDown, ChevronUp,
  Circle, PlayCircle, PauseCircle, CheckCircle, Sliders
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TaskStatus = "nao_iniciado" | "em_andamento" | "parado" | "concluido";

interface Task {
  id: string;
  titulo: string;
  descricao: string;
  area: string;
  prazo_sugerido: string;
  prioridade: "Alta" | "Média" | "Baixa";
  responsavel_sugerido: string;
  status: TaskStatus;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  responsible: string | null;
  notifications: {
    beforeDays: number;
    onStatusChange: boolean;
    onProgressUpdate: boolean;
    onComment: boolean;
  };
}

const AREAS = [
  { key: "contabilidade", label: "Contabilidade", icon: BarChart3 },
  { key: "negocio", label: "Negócio", icon: Building2 },
  { key: "ti", label: "T.I.", icon: Cpu },
  { key: "juridico", label: "Advocacia Tributária", icon: Scale },
] as const;

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ElementType; color: string }> = {
  nao_iniciado: { label: "Não iniciado", icon: Circle, color: "text-muted-foreground" },
  em_andamento: { label: "Em andamento", icon: PlayCircle, color: "text-blue-600" },
  parado: { label: "Parado", icon: PauseCircle, color: "text-amber-600" },
  concluido: { label: "Concluído", icon: CheckCircle, color: "text-emerald-600" },
};

const PRIORITY_COLORS: Record<string, string> = {
  Alta: "bg-red-100 text-red-700 border-red-300",
  Média: "bg-amber-100 text-amber-700 border-amber-300",
  Baixa: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

// ─── Componente de Tarefa ─────────────────────────────────────────────────────
function TaskCard({ task, onUpdate }: { task: Task; onUpdate: (updates: Partial<Task>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(task.progress);
  const StatusIcon = STATUS_CONFIG[task.status]?.icon || Circle;

  const handleProgressSave = () => {
    onUpdate({ progress: progressValue });
    setEditingProgress(false);
    if (progressValue === 100) onUpdate({ status: "concluido", progress: 100 });
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      task.status === "concluido" ? "opacity-70" : "",
      task.status === "em_andamento" ? "border-blue-200 shadow-sm" : ""
    )}>
      <CardContent className="p-4">
        {/* Linha principal */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => {
              const next: Record<TaskStatus, TaskStatus> = {
                nao_iniciado: "em_andamento", em_andamento: "concluido",
                parado: "em_andamento", concluido: "nao_iniciado"
              };
              onUpdate({ status: next[task.status] });
            }}
            className={cn("mt-0.5 shrink-0 transition-colors", STATUS_CONFIG[task.status]?.color)}
          >
            <StatusIcon className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn("text-sm font-medium leading-snug", task.status === "concluido" && "line-through text-muted-foreground")}>
                {task.titulo}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[task.prioridade])}>
                  {task.prioridade}
                </Badge>
                <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <StatusIcon className={cn("h-3 w-3", STATUS_CONFIG[task.status]?.color)} />
                  <span>{STATUS_CONFIG[task.status]?.label}</span>
                  {task.endDate && (
                    <>
                      <span>·</span>
                      <Calendar className="h-3 w-3" />
                      <span>Prazo: {new Date(task.endDate).toLocaleDateString("pt-BR")}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setEditingProgress(!editingProgress)}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  {task.progress}%
                </button>
              </div>
              <Progress value={task.progress} className={cn("h-1.5",
                task.progress === 100 ? "[&>div]:bg-emerald-500" :
                task.progress > 50 ? "[&>div]:bg-blue-500" : ""
              )} />
            </div>

            {/* Edição de progresso */}
            {editingProgress && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="range" min={0} max={100} step={5}
                  value={progressValue}
                  onChange={e => setProgressValue(Number(e.target.value))}
                  className="flex-1 h-2 accent-primary"
                />
                <span className="text-xs font-bold w-8 text-right">{progressValue}%</span>
                <Button size="sm" className="h-6 text-xs px-2" onClick={handleProgressSave}>OK</Button>
              </div>
            )}
          </div>
        </div>

        {/* Detalhes expandidos */}
        {expanded && (
          <div className="mt-4 space-y-4 pl-8">
            <p className="text-sm text-muted-foreground">{task.descricao}</p>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Responsável */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />Responsável
                </label>
                <Input
                  value={task.responsible || task.responsavel_sugerido || ""}
                  onChange={e => onUpdate({ responsible: e.target.value })}
                  placeholder={task.responsavel_sugerido || "Nome do responsável..."}
                  className="h-8 text-sm"
                />
              </div>
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5" />Status
                </label>
                <select
                  className="w-full border rounded-md px-2 py-1.5 text-sm bg-background h-8"
                  value={task.status}
                  onChange={e => onUpdate({ status: e.target.value as TaskStatus })}
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              {/* Data de início */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />Data de Início
                </label>
                <Input
                  type="date"
                  value={task.startDate || ""}
                  onChange={e => onUpdate({ startDate: e.target.value || null })}
                  className="h-8 text-sm"
                />
              </div>
              {/* Data de fim */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />Data de Conclusão
                </label>
                <Input
                  type="date"
                  value={task.endDate || ""}
                  onChange={e => onUpdate({ endDate: e.target.value || null })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Notificações */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" />Notificações por E-mail
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={task.notifications?.onStatusChange || false}
                    onChange={e => onUpdate({ notifications: { ...task.notifications, onStatusChange: e.target.checked } })}
                    className="accent-primary" />
                  Mudança de status
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={task.notifications?.onProgressUpdate || false}
                    onChange={e => onUpdate({ notifications: { ...task.notifications, onProgressUpdate: e.target.checked } })}
                    className="accent-primary" />
                  Atualização de progresso
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={task.notifications?.onComment || false}
                    onChange={e => onUpdate({ notifications: { ...task.notifications, onComment: e.target.checked } })}
                    className="accent-primary" />
                  Novo comentário
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Alertar</span>
                  <Input
                    type="number" min={1} max={30}
                    value={task.notifications?.beforeDays || 7}
                    onChange={e => onUpdate({ notifications: { ...task.notifications, beforeDays: Number(e.target.value) } })}
                    className="h-6 w-14 text-xs px-1"
                  />
                  <span className="text-muted-foreground">dias antes</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function PlanoAcaoV3() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = Number(id);

  const [plans, setPlans] = useState<Record<string, Task[]>>({});
  const [activeTab, setActiveTab] = useState("contabilidade");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [adjustmentText, setAdjustmentText] = useState("");
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [generationCount, setGenerationCount] = useState(0);

  const { data: project, isLoading: loadingProject } = trpc.fluxoV3.getProjectStep1.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const generatePlan = trpc.fluxoV3.generateActionPlan.useMutation();
  const approvePlan = trpc.fluxoV3.approveActionPlan.useMutation();

  useEffect(() => {
    if (project && generationCount === 0) {
      handleGenerate();
    }
  }, [project]);

  const handleGenerate = async (area?: string, adjustment?: string) => {
    if (!project) return;
    setIsGenerating(true);
    setShowAdjustment(false);
    setAdjustmentText("");
    try {
      const matrices = (project as any).riskMatricesData || {};
      const result = await generatePlan.mutateAsync({
        projectId,
        matrices,
        area: area as any,
        adjustment,
      });
      setPlans(prev => ({ ...prev, ...result.plans }));
      setGenerationCount(prev => prev + 1);
      if (generationCount > 0) toast.success(area ? `Plano de ${area} atualizado!` : "Plano de Ação gerado!");
    } catch {
      toast.error("Erro ao gerar o plano. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateTask = (area: string, taskId: string, updates: Partial<Task>) => {
    setPlans(prev => ({
      ...prev,
      [area]: (prev[area] || []).map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approvePlan.mutateAsync({ projectId, plans });
      toast.success("Plano de Ação aprovado! Projeto concluído.");
      setLocation(`/projetos/${projectId}`);
    } catch {
      toast.error("Erro ao aprovar o plano. Tente novamente.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleExport = (format: "pdf" | "csv") => {
    const area = activeTab;
    const tasks = plans[area] || [];
    if (format === "csv") {
      const headers = ["Título", "Descrição", "Área", "Prioridade", "Status", "Progresso (%)", "Responsável", "Início", "Fim", "Prazo Sugerido"];
      const rows = tasks.map(t => [
        `"${t.titulo}"`, `"${t.descricao}"`, t.area, t.prioridade,
        STATUS_CONFIG[t.status]?.label || t.status,
        t.progress, t.responsible || t.responsavel_sugerido,
        t.startDate || "", t.endDate || "", t.prazo_sugerido
      ]);
      const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `plano-acao-${area}-${new Date().toISOString().split("T")[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("CSV exportado!");
    } else {
      // PDF simples via print
      const content = tasks.map(t =>
        `${t.titulo}\nÁrea: ${t.area} | Prioridade: ${t.prioridade} | Status: ${STATUS_CONFIG[t.status]?.label}\nResponsável: ${t.responsible || t.responsavel_sugerido}\nDescrição: ${t.descricao}\n`
      ).join("\n---\n");
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(`<pre style="font-family:sans-serif;padding:20px;font-size:12px">${project?.name} — Plano de Ação: ${area}\n\n${content}</pre>`);
        win.print();
      }
    }
  };

  const allAreasGenerated = AREAS.every(a => plans[a.key] && plans[a.key].length > 0);
  const currentTasks = plans[activeTab] || [];
  const filteredTasks = currentTasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.prioridade !== filterPriority) return false;
    return true;
  });

  const totalTasks = Object.values(plans).reduce((s, arr) => s + (arr?.length || 0), 0);
  const doneTasks = Object.values(plans).flat().filter(t => t.status === "concluido").length;
  const overallProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  if (loadingProject) {
    return (
      <ComplianceLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ComplianceLayout>
    );
  }

  return (
    <ComplianceLayout>
      <div className="max-w-5xl mx-auto space-y-6 py-2">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/projetos/${projectId}/matrizes-v3`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{project?.name || "Plano de Ação"}</h1>
            <p className="text-sm text-muted-foreground">Etapa 5 de 5 — Plano de Ação</p>
          </div>
          {allAreasGenerated && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">{doneTasks}/{totalTasks} concluídas</span>
              <div className="w-16">
                <Progress value={overallProgress} className="h-2" />
              </div>
              <span className="text-xs font-bold text-primary">{overallProgress}%</span>
            </div>
          )}
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["Projeto", "Questionário", "Briefing", "Riscos", "Plano"].map((step, i) => (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                i < 4 ? "bg-emerald-100 text-emerald-700" :
                i === 4 ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i < 4 ? "bg-emerald-500/20" : i === 4 ? "bg-white/20" : "bg-muted-foreground/20"
                }`}>{i < 4 ? "✓" : i + 1}</span>
                {step}
              </div>
              {i < 4 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

        {/* Geração em andamento */}
        {isGenerating && Object.keys(plans).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">Gerando Plano de Ação...</p>
                <p className="text-sm text-muted-foreground">A IA está criando tarefas personalizadas para as 4 áreas com base nas matrizes de riscos.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <TabsList className="grid grid-cols-4">
                  {AREAS.map(area => {
                    const Icon = area.icon;
                    const tasks = plans[area.key] || [];
                    const done = tasks.filter(t => t.status === "concluido").length;
                    return (
                      <TabsTrigger key={area.key} value={area.key} className="gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{area.label}</span>
                        {tasks.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-0.5">
                            {done}/{tasks.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {/* Filtros e exportação */}
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded-md px-2 py-1 text-xs bg-background h-8"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value as any)}
                  >
                    <option value="all">Todos os status</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <select
                    className="border rounded-md px-2 py-1 text-xs bg-background h-8"
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                  >
                    <option value="all">Todas as prioridades</option>
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleExport("csv")}>
                    <Download className="h-3.5 w-3.5" />CSV
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleExport("pdf")}>
                    <Download className="h-3.5 w-3.5" />PDF
                  </Button>
                </div>
              </div>

              {AREAS.map(area => (
                <TabsContent key={area.key} value={area.key} className="mt-4 space-y-3">
                  {/* Toolbar da área */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {filteredTasks.length} tarefa(s) {filterStatus !== "all" || filterPriority !== "all" ? "(filtradas)" : ""}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7"
                        onClick={() => setShowAdjustment(!showAdjustment)}>
                        <Edit3 className="h-3.5 w-3.5" />Ajustar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7"
                        onClick={() => handleGenerate(area.key)}
                        disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Regenerar
                      </Button>
                    </div>
                  </div>

                  {/* Painel de ajuste */}
                  {showAdjustment && activeTab === area.key && (
                    <Card className="border-primary/20 bg-primary/3">
                      <CardContent className="p-4 space-y-3">
                        <p className="text-sm font-semibold">Que ajustes deseja no plano de {area.label}?</p>
                        <Textarea
                          value={adjustmentText}
                          onChange={e => setAdjustmentText(e.target.value)}
                          placeholder="Ex: Adicione uma tarefa de treinamento da equipe. O prazo da tarefa de ERP deve ser 90 dias..."
                          rows={3} className="resize-none" autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => { setShowAdjustment(false); setAdjustmentText(""); }}>Cancelar</Button>
                          <Button size="sm" onClick={() => handleGenerate(area.key, adjustmentText)} disabled={!adjustmentText.trim()}>
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            Regenerar com Ajustes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Lista de tarefas */}
                  {isGenerating ? (
                    <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Atualizando plano...</span>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      Nenhuma tarefa encontrada com os filtros selecionados.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onUpdate={updates => handleUpdateTask(area.key, task.id, updates)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>

            {/* Aprovação */}
            {allAreasGenerated && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Plano de Ação gerado para todas as 4 áreas</p>
                    <p className="text-xs text-emerald-700">{totalTasks} tarefas criadas · {overallProgress}% concluído</p>
                  </div>
                </div>
                <Button onClick={handleApprove} disabled={isApproving} className="gap-2">
                  {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                  Aprovar Plano de Ação
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ComplianceLayout>
  );
}
