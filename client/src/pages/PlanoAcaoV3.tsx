// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAutoSave, loadTempData, clearTempData } from "@/hooks/usePersistenceV3";
import { ResumeBanner } from "@/components/ResumeBanner";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import FlowStepper from "@/components/FlowStepper";
import RetrocessoConfirmModal from "@/components/RetrocessoConfirmModal";
import { statusToCompletedStep } from "@/lib/flowStepperUtils";
import {
  ArrowLeft, ChevronRight, Loader2, Sparkles, CheckCircle2,
  RefreshCw, ThumbsUp, Edit3, Building2, Cpu, Scale, BarChart3,
  Calendar, User, Bell, Download, ChevronDown, ChevronUp,
  Circle, PlayCircle, PauseCircle, CheckCircle, Sliders, FileText,
  MessageSquare, Plus, Trash2, RotateCcw, LayoutDashboard, Send,
  PartyPopper, Trophy, ClipboardList, AlertTriangle, ShieldCheck,
  Clock, History, TrendingUp, Tag, UserCheck, Settings2, MessageCircle, Layers
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import StepComments from "@/components/StepComments";

// ── Componente: Painel de Diagnóstico de Entrada (3 Camadas) ─────────────────────────────────
function DiagnosticoEntradaPanel({ corporateAnswers, operationalAnswers, cnaeAnswers }: { corporateAnswers?: any; operationalAnswers?: any; cnaeAnswers?: any }) {
  const [open, setOpen] = useState(false);
  const parseAnswers = (raw: any): Record<string, string> => { if (!raw) return {}; try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; } };
  const parseCnae = (raw: any): any[] => { if (!raw) return []; try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; } };
  const corp = parseAnswers(corporateAnswers); const op = parseAnswers(operationalAnswers); const cnae = parseCnae(cnaeAnswers);
  const total = Object.keys(corp).length + Object.keys(op).length + cnae.reduce((a: number, c: any) => a + Object.keys(c.answers || {}).length, 0);
  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-blue-600" />Diagnóstico de Entrada — 3 Camadas<Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">{total} respostas</Badge></CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Dados que alimentaram a geração deste plano de ação</p>
      </CardHeader>
      {open && <CardContent className="space-y-4 pt-0">
        {Object.keys(corp).length > 0 && <div><p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Corporativo (QC)</p><div className="space-y-1">{Object.entries(corp).map(([k, v]) => <div key={k} className="text-xs"><span className="font-medium">{k}:</span> <span className="text-muted-foreground">{String(v)}</span></div>)}</div></div>}
        {Object.keys(op).length > 0 && <div><p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Operacional (QO)</p><div className="space-y-1">{Object.entries(op).map(([k, v]) => <div key={k} className="text-xs"><span className="font-medium">{k}:</span> <span className="text-muted-foreground">{String(v)}</span></div>)}</div></div>}
        {cnae.length > 0 && <div><p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">CNAE Especializado (QCNAE)</p><div className="space-y-3">{cnae.map((item: any, i: number) => <div key={i} className="border-l-2 border-purple-300 pl-3"><p className="text-xs font-semibold">{item.cnaeCode} — {item.cnaeName || item.cnaeDescription || ''}</p><div className="space-y-1 mt-1">{Object.entries((item.answers || {}) as Record<string, unknown>).map(([k, v]) => <div key={k} className="text-xs"><span className="font-medium">{k}:</span> <span className="text-muted-foreground">{String(v)}</span></div>)}</div></div>)}</div></div>}
      </CardContent>}
    </Card>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TaskStatus = "nao_iniciado" | "em_andamento" | "parado" | "concluido";

// RF-5.04: Tipo de comentário com histórico
interface TaskComment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

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
  comments?: TaskComment[]; // RF-5.04
  deleted?: boolean; // RF-5.09: soft delete
  manual?: boolean; // RF-5.08: tarefa adicionada manualmente
}

const AREAS = [
  { key: "contabilidade", label: "Contabilidade e Fiscal", icon: BarChart3 },
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
function TaskCard({ task, onUpdate, onDelete, onRestore, projectMembers = [], projectId }: {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onRestore: () => void;
  projectMembers?: Array<{ id: number; name: string; email: string; memberRole: string }>;
  projectId?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(task.progress);
  // RF-5.04: Estado para comentários
  const [newComment, setNewComment] = useState("");
  // RF-HIST: Estado do drawer de histórico
  const [historyOpen, setHistoryOpen] = useState(false);
  const StatusIcon = STATUS_CONFIG[task.status]?.icon || Circle;

  const handleProgressSave = () => {
    onUpdate({ progress: progressValue });
    setEditingProgress(false);
    if (progressValue === 100) onUpdate({ status: "concluido", progress: 100 });
  };

  // RF-5.04: Adicionar comentário
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: TaskComment = {
      id: `c-${Date.now()}`,
      text: newComment.trim(),
      author: "Você",
      timestamp: Date.now(),
    };
    onUpdate({ comments: [...(task.comments || []), comment] });
    setNewComment("");
  };

  // RF-5.09: Tarefa deletada — exibir como riscada com botão restaurar
  if (task.deleted) {
    return (
      <Card className="opacity-50 border-dashed">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm line-through text-muted-foreground flex-1 truncate">{task.titulo}</p>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 shrink-0" onClick={onRestore}>
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className={cn(
      "transition-all duration-200",
      task.status === "concluido" ? "opacity-70" : "",
      task.status === "em_andamento" ? "border-blue-200 shadow-sm" : "",
      task.manual ? "border-blue-200 bg-blue-50/20" : ""
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
                {task.manual && <span className="ml-1.5 text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Manual</span>}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[task.prioridade])}>
                  {task.prioridade}
                </Badge>
                {/* RF-5.04: Ícone de comentários */}
                {(task.comments?.length || 0) > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {task.comments!.length}
                  </span>
                )}
                {/* RF-5.08: Ícone de sino quando há notificações ativas */}
                {(task.notifications?.onStatusChange || task.notifications?.onProgressUpdate || task.notifications?.onComment) && (
                  <span title="Notificações ativas" className="flex items-center text-amber-500">
                    <Bell className="h-3.5 w-3.5 fill-amber-500" />
                  </span>
                )}
                {/* RF-HIST: Botão de histórico */}
                {projectId && (
                  <button
                    onClick={() => setHistoryOpen(true)}
                    title="Ver histórico de alterações"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                )}
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
                  {task.responsible && (
                    <>
                      <span>·</span>
                      <User className="h-3 w-3" />
                      <span>{task.responsible}</span>
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
              {/* RF-5.07: Responsável — dropdown com membros do cliente ou input livre */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />Responsável
                </label>
                {projectMembers.length > 0 ? (
                  <select
                    className="w-full border rounded-md px-2 py-1.5 text-sm bg-background h-8"
                    value={task.responsible || task.responsavel_sugerido || ""}
                    onChange={e => onUpdate({ responsible: e.target.value })}
                  >
                    <option value="">Selecionar membro...</option>
                    {projectMembers.map(m => (
                      <option key={m.id} value={m.name}>{m.name} ({m.memberRole})</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={task.responsible || task.responsavel_sugerido || ""}
                    onChange={e => onUpdate({ responsible: e.target.value })}
                    placeholder={task.responsavel_sugerido || "Nome do responsável..."}
                    className="h-8 text-sm"
                  />
                )}
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

            {/* RF-5.08: Painel de Notificações por Tarefa */}
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-amber-500" />Notificações por E-mail
                </label>
                {(task.notifications?.onStatusChange || task.notifications?.onProgressUpdate || task.notifications?.onComment) && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">Ativas</span>
                )}
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`notif-status-${task.id}`} className="text-xs text-muted-foreground cursor-pointer">
                    Mudança de status
                  </Label>
                  <Switch
                    id={`notif-status-${task.id}`}
                    checked={task.notifications?.onStatusChange || false}
                    onCheckedChange={checked => onUpdate({ notifications: { ...task.notifications, onStatusChange: checked } })}
                    className="scale-75"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor={`notif-progress-${task.id}`} className="text-xs text-muted-foreground cursor-pointer">
                    Atualização de progresso
                  </Label>
                  <Switch
                    id={`notif-progress-${task.id}`}
                    checked={task.notifications?.onProgressUpdate || false}
                    onCheckedChange={checked => onUpdate({ notifications: { ...task.notifications, onProgressUpdate: checked } })}
                    className="scale-75"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor={`notif-comment-${task.id}`} className="text-xs text-muted-foreground cursor-pointer">
                    Novo comentário
                  </Label>
                  <Switch
                    id={`notif-comment-${task.id}`}
                    checked={task.notifications?.onComment || false}
                    onCheckedChange={checked => onUpdate({ notifications: { ...task.notifications, onComment: checked } })}
                    className="scale-75"
                  />
                </div>
                <Separator className="my-1" />
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">Alertar antes do prazo</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number" min={1} max={30}
                      value={task.notifications?.beforeDays ?? 7}
                      onChange={e => {
                        const val = Math.min(30, Math.max(1, Number(e.target.value) || 1));
                        onUpdate({ notifications: { ...task.notifications, beforeDays: val } });
                      }}
                      className="h-7 w-14 text-xs px-2"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">dias</span>
                  </div>
                </div>
                {((task.notifications?.beforeDays ?? 7) < 1 || (task.notifications?.beforeDays ?? 7) > 30) && (
                  <p className="text-[10px] text-destructive">Valor deve ser entre 1 e 30 dias</p>
                )}
              </div>
            </div>

            {/* RF-5.04: Seção de comentários com histórico */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />Comentários ({task.comments?.length || 0})
              </label>
              {/* Histórico de comentários */}
              {(task.comments || []).length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {task.comments!.map(comment => (
                    <div key={comment.id} className="flex gap-2 p-2.5 rounded-lg bg-muted/50 border">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
                        {comment.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold">{comment.author}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comment.timestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Input de novo comentário */}
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Adicionar comentário..."
                  className="h-8 text-sm flex-1"
                  onKeyDown={e => e.key === "Enter" && handleAddComment()}
                />
                <Button size="sm" className="h-8 px-3" onClick={handleAddComment} disabled={!newComment.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* RF-5.09: Botão de soft delete */}
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover tarefa
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* RF-HIST: Drawer de histórico de alterações */}
    {projectId && (
      <TaskHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        taskId={task.id}
        taskTitle={task.titulo}
        projectId={projectId}
      />
    )}
    </>
  );
}

// ─── Drawer de Histórico (RF-HIST) ───────────────────────────────────────────
const EVENT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  criacao:     { label: "Criado",                 icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
  status:      { label: "Status alterado",         icon: TrendingUp,   color: "text-blue-600",   bg: "bg-blue-100" },
  responsavel: { label: "Responsável alterado",    icon: UserCheck,    color: "text-purple-600", bg: "bg-purple-100" },
  prazo:       { label: "Prazo alterado",           icon: Calendar,     color: "text-orange-600", bg: "bg-orange-100" },
  progresso:   { label: "Progresso atualizado",     icon: TrendingUp,   color: "text-cyan-600",   bg: "bg-cyan-100" },
  titulo:      { label: "Título alterado",          icon: Tag,          color: "text-slate-600",  bg: "bg-slate-100" },
  prioridade:  { label: "Prioridade alterada",      icon: AlertTriangle,color: "text-amber-600",  bg: "bg-amber-100" },
  notificacao: { label: "Notificações alteradas",   icon: Settings2,    color: "text-indigo-600", bg: "bg-indigo-100" },
  comentario:  { label: "Comentário adicionado",   icon: MessageCircle,color: "text-teal-600",   bg: "bg-teal-100" },
};

const STATUS_LABELS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  parado: "Parado",
  concluido: "Concluído",
};

function formatHistoryValue(field: string, value: string | null): string {
  if (!value) return "—";
  if (field === "status") return STATUS_LABELS[value] || value;
  if (field === "progresso") return `${value}%`;
  if (field === "prazo") {
    try { return new Date(value).toLocaleDateString("pt-BR"); } catch { return value; }
  }
  if (field === "notificações") {
    try {
      const n = JSON.parse(value);
      const parts: string[] = [];
      if (n.onStatusChange) parts.push("Status");
      if (n.onProgressUpdate) parts.push("Progresso");
      if (n.onComment) parts.push("Comentários");
      if (n.beforeDays) parts.push(`${n.beforeDays}d antes`);
      return parts.length ? parts.join(", ") : "Desativadas";
    } catch { return value; }
  }
  return value;
}

function TaskHistoryDrawer({
  open, onClose, taskId, taskTitle, projectId
}: {
  open: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  projectId: number;
}) {
  const { data: history, isLoading } = trpc.fluxoV3.getTaskHistory.useQuery(
    { projectId, taskId },
    { enabled: open }
  );

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Alterações
          </SheetTitle>
          <p className="text-sm text-muted-foreground line-clamp-2">{taskTitle}</p>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
            <p className="text-xs text-muted-foreground/70">As próximas mudanças nesta tarefa aparecerão aqui.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Linha vertical da timeline */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-0">
              {history.map((entry: any, idx: number) => {
                const cfg = EVENT_CONFIG[entry.eventType] || EVENT_CONFIG.status;
                const Icon = cfg.icon;
                const isLast = idx === history.length - 1;
                return (
                  <div key={entry.id} className="relative flex gap-4 pb-6">
                    {/* Ícone na timeline */}
                    <div className={cn(
                      "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background",
                      cfg.bg
                    )}>
                      <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                    </div>
                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-medium", cfg.color)}>{cfg.label}</p>
                        <time className="text-[11px] text-muted-foreground shrink-0">
                          {new Date(entry.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "2-digit",
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </time>
                      </div>
                      {entry.userName && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          por <span className="font-medium">{entry.userName}</span>
                        </p>
                      )}
                      {entry.field && (entry.oldValue !== null || entry.newValue !== null) && (
                        <div className="mt-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs space-y-0.5">
                          {entry.oldValue !== null && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">De:</span>
                              <span className="line-through text-muted-foreground">
                                {formatHistoryValue(entry.field, entry.oldValue)}
                              </span>
                            </div>
                          )}
                          {entry.newValue !== null && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Para:</span>
                              <span className="font-medium text-foreground">
                                {formatHistoryValue(entry.field, entry.newValue)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function PlanoAcaoV3() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = Number(id);

  const [plans, setPlans] = useState<Record<string, Task[]>>({});
  const [activeTab, setActiveTab] = useState("contabilidade");
  // Issue #59 — gate de retrocesso no botão Voltar
  const [retrocessoModal, setRetrocessoModal] = useState<{ open: boolean; targetUrl: string; toStep: number; toStepLabel: string }>({
    open: false, targetUrl: "", toStep: 0, toStepLabel: ""
  });
  const handleVoltarClick = (targetUrl: string, toStep: number, toStepLabel: string) => {
    setRetrocessoModal({ open: true, targetUrl, toStep, toStepLabel });
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [adjustmentText, setAdjustmentText] = useState("");
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  // RF-5.10: Filtro por responsável e prazo
  const [filterResponsible, setFilterResponsible] = useState<string>("");
  const [filterDeadline, setFilterDeadline] = useState<string>("");
  const [showDeletedTasks, setShowDeletedTasks] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number>(0);
  // RF-5.08: Modal de adição manual de tarefa
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  // Tela de conclusão do projeto
  const [showConclusion, setShowConclusion] = useState(false);
  const [conclusionData, setConclusionData] = useState<{
    projectName: string;
    cnaes: { code: string; description: string }[];
    totalRisks: number;
    criticalRisks: number;
    highRisks: number;
    totalTasks: number;
    tasksByArea: { area: string; count: number }[];
    allTasks: Task[];
    allRisks: { area: string; descricao: string; severidade: string; probabilidade: string; impacto: string }[];
    scoringData?: any;
    decisaoData?: any;
  } | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({ prioridade: "Média", status: "nao_iniciado" });
  // RF-5.06: Dashboard de progresso
  const [showDashboard, setShowDashboard] = useState(false);
  // Ref para garantir que a geração do plano ocorra apenas uma vez (evita loop)
  const generationTriggeredRef = useRef(false);
  // Bug #5: editMode persistido em sessionStorage para evitar loop de conclusão
  // Bug #8: limpar editMode do sessionStorage quando status é plano_acao (novo ciclo)
  const [editMode, setEditMode] = useState(() => {
    return sessionStorage.getItem(`plano-editmode-${projectId}`) === 'true';
  });

  // Verificar rascunho local ao montar — suprimir banner se há plano salvo no banco
  useEffect(() => {
    if (!projectId) return;
    const saved = loadTempData(projectId, 'etapa5');
    if (saved?.data?.plans && Object.keys(saved.data.plans).length > 0) {
      // Verificar se já há plano no banco antes de mostrar o banner
      // O banner só é relevante se o banco não tem plano (evita confusão)
      setDraftSavedAt(saved.savedAt);
      setShowResumeBanner(true); // será suprimido pelo useEffect do project se hasSavedPlan
    }
  }, [projectId]);

  const handleResumeDraft = () => {
    const saved = loadTempData(projectId, 'etapa5');
    if (saved?.data?.plans) {
      setPlans(saved.data.plans);
      setGenerationCount(1);
    }
    setShowResumeBanner(false);
  };

  const handleDiscardDraft = () => {
    clearTempData(projectId, 'etapa5');
    setShowResumeBanner(false);
  };

  // Auto-save do plano de ação no localStorage
  useAutoSave(projectId, 'etapa5', { plans }, 1000);

  const { data: project, isLoading: loadingProject } = trpc.fluxoV3.getProjectStep1.useQuery(
    { projectId },
    {
      enabled: !!projectId,
      // Sempre buscar dados frescos ao montar a página
      // para garantir que o status "plano_acao" seja recebido corretamente
      // após navegação da tela de Matriz de Riscos
      refetchOnMount: "always",
      staleTime: 0,
    }
  );

  const generatePlan = trpc.fluxoV3.generateActionPlan.useMutation();
  const saveDraftPlan = trpc.fluxoV3.saveDraftActionPlan.useMutation();
  const approvePlan = trpc.fluxoV3.approveActionPlan.useMutation();
  const generateDecision = trpc.fluxoV3.generateDecision.useMutation();

  // RF-5.07: Busca membros do cliente vinculado ao projeto para o dropdown de responsável
  const { data: projectMembers = [] } = trpc.clientMembers.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Carregar plano salvo do banco (se existir) ou gerar novo
  // Bug #8: Refatorado para passar project diretamente e evitar closure stale
  useEffect(() => {
    if (!project) return;
    if (generationTriggeredRef.current) return; // já disparou — não repetir

    const status = project.status;
    const savedPlansCheck = ((project as any).actionPlansDataV3 || (project as any).actionPlansData) as Record<string, any[]> | null | undefined;
    const hasSavedPlan = savedPlansCheck && Object.keys(savedPlansCheck).length > 0;

    // Bug #8: Status "plano_acao" = recém aprovado da matriz — SEMPRE gerar novo plano
    // Limpar sessionStorage de editMode para evitar estado stale de sessões anteriores
    if (status === "plano_acao") {
      sessionStorage.removeItem(`plano-editmode-${projectId}`);
      setEditMode(false);
      // Se já há planos no estado local (rascunho), não sobrescrever
      if (Object.keys(plans).length > 0) return;
      generationTriggeredRef.current = true;
      // Passar project diretamente para evitar closure stale
      void handleGenerateWithProject(project);
      return;
    }

    // Bug #7: projetos aprovados/concluídos/em andamento com plano salvo abrem no modo edição
    const isApproved = status === "aprovado" || status === "concluido" || status === "em_andamento";
    if (isApproved && hasSavedPlan && Object.keys(plans).length === 0 && generationCount === 0) {
      setPlans(savedPlansCheck!);
      setGenerationCount(1);
      generationTriggeredRef.current = true;
      setEditMode(true);
      sessionStorage.setItem(`plano-editmode-${projectId}`, 'true');
      setShowResumeBanner(false);
      clearTempData(projectId, 'etapa5');
      return;
    }

    // Se já há planos no estado (rascunho local), não sobrescrever
    if (Object.keys(plans).length > 0) return;

    // Prioridade: plano salvo no banco (re-edição de outros status)
    if (hasSavedPlan && generationCount === 0) {
      setPlans(savedPlansCheck!);
      setGenerationCount(1);
      generationTriggeredRef.current = true;
      setShowResumeBanner(false);
      clearTempData(projectId, 'etapa5');
      return;
    }
    // Gerar novo plano se não há conteúdo salvo
    if (generationCount === 0) {
      generationTriggeredRef.current = true;
      void handleGenerateWithProject(project);
    }
  }, [project]);

  // Bug #8: versão que recebe project diretamente para evitar closure stale no useEffect
  const handleGenerateWithProject = async (proj: typeof project, area?: string, adjustment?: string) => {
    if (!proj) return;
    setIsGenerating(true);
    setShowAdjustment(false);
    setAdjustmentText("");
    try {
      const matrices = (proj as any).riskMatricesDataV3 || (proj as any).riskMatricesData || {};
      const briefingContent = (proj as any).briefingContentV3 || (proj as any).briefingContent || "";
      const result = await generatePlan.mutateAsync({
        projectId,
        matrices,
        area: area as any,
        adjustment,
        briefingContent,
      });
      const updatedPlans = { ...plans, ...result.plans };
      setPlans(updatedPlans);
      setGenerationCount(prev => prev + 1);
      try {
        await saveDraftPlan.mutateAsync({ projectId, plans: updatedPlans });
        setShowResumeBanner(false);
        clearTempData(projectId, 'etapa5');
      } catch { /* auto-save falhou silenciosamente */ }
    } catch {
      toast.error("Erro ao gerar o plano. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async (area?: string, adjustment?: string) => {
    if (!project) return;
    setIsGenerating(true);
    setShowAdjustment(false);
    setAdjustmentText("");
    try {
      const matrices = (project as any).riskMatricesDataV3 || (project as any).riskMatricesData || {};
      const briefingContent = (project as any).briefingContentV3 || (project as any).briefingContent || "";
      const result = await generatePlan.mutateAsync({
        projectId,
        matrices,
        area: area as any,
        adjustment,
        briefingContent, // V70.2: enriquecer prompt com gaps do briefing
      });
      const updatedPlans = { ...plans, ...result.plans };
      setPlans(updatedPlans);
      setGenerationCount(prev => prev + 1);
      if (generationCount > 0) toast.success(area ? `Plano de ${area} atualizado!` : "Plano de Ação gerado!");
      // Auto-save: persistir no banco imediatamente após geração
      try {
        await saveDraftPlan.mutateAsync({ projectId, plans: updatedPlans });
        // Suprimir banner de rascunho local pois o plano já está no banco
        setShowResumeBanner(false);
        clearTempData(projectId, 'etapa5');
      } catch {
        // Auto-save falhou silenciosamente — o localStorage ainda serve de fallback
      }
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

  // RF-5.09: Soft delete
  const handleDeleteTask = (area: string, taskId: string) => {
    handleUpdateTask(area, taskId, { deleted: true });
    toast.success("Tarefa removida. Você pode restaurá-la clicando em 'Mostrar removidas'.");
  };

  // RF-5.09: Restaurar tarefa
  const handleRestoreTask = (area: string, taskId: string) => {
    handleUpdateTask(area, taskId, { deleted: false });
    toast.success("Tarefa restaurada!");
  };

  // RF-5.08: Adicionar tarefa manualmente
  const handleAddManualTask = (areaKey: string) => {
    if (!newTask.titulo?.trim()) {
      toast.error("Informe o título da tarefa.");
      return;
    }
    const task: Task = {
      id: `manual-${Date.now()}`,
      titulo: newTask.titulo!,
      descricao: newTask.descricao || "",
      area: areaKey,
      prazo_sugerido: newTask.prazo_sugerido || "",
      prioridade: newTask.prioridade as any || "Média",
      responsavel_sugerido: newTask.responsible || "",
      status: "nao_iniciado",
      progress: 0,
      startDate: null,
      endDate: newTask.endDate || null,
      responsible: newTask.responsible || null,
      notifications: { beforeDays: 7, onStatusChange: false, onProgressUpdate: false, onComment: false },
      comments: [],
      manual: true,
    };
    setPlans(prev => ({
      ...prev,
      [areaKey]: [...(prev[areaKey] || []), task],
    }));
    setNewTask({ prioridade: "Média", status: "nao_iniciado" });
    setShowAddTask(null);
    toast.success("Tarefa adicionada manualmente!");
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approvePlan.mutateAsync({ projectId, plans });
      clearTempData(projectId, 'etapa5');
      // Calcular dados de resumo para a tela de conclusão
      const cnaes = (project as any)?.confirmedCnaes || [];
      const matrices = (project as any)?.riskMatricesDataV3 || (project as any)?.riskMatricesData || {};
      const allRisksRaw = Object.entries(matrices).flatMap(([area, risks]) =>
        (risks as any[]).map((r: any) => ({ area, ...r }))
      );
      const totalRisks = allRisksRaw.length;
      const criticalRisks = allRisksRaw.filter((r: any) => r?.severidade === "Crítico" || r?.severidade === "Critico" || r?.severidade === "Crítica").length;
      const highRisks = allRisksRaw.filter((r: any) => r?.severidade === "Alta").length;
      const allTasks = Object.values(plans).flat().filter((t: Task) => !t.deleted);
      const totalTasks = allTasks.length;
      const tasksByArea = Object.entries(plans).map(([area, tasks]) => ({
        area,
        count: (tasks || []).filter((t: Task) => !t.deleted).length,
      })).filter(a => a.count > 0);
      // V61: Scoring do banco
      const scoringData = (project as any)?.scoringData || null;
      // V63: Gerar decisão final
      let decisaoData: any = (project as any)?.decisaoData || null;
      if (!decisaoData) {
        try {
          const decResult = await generateDecision.mutateAsync({ projectId });
          decisaoData = decResult.decisao;
        } catch {
          // Decisão é opcional — não bloqueia a conclusão
        }
      }
      setConclusionData({
        projectName: project?.name || "Projeto",
        cnaes,
        totalRisks,
        criticalRisks,
        highRisks,
        totalTasks,
        tasksByArea,
        allTasks,
        allRisks: allRisksRaw,
        scoringData,
        decisaoData,
      });
      setShowConclusion(true);
    } catch {
      toast.error("Erro ao aprovar o plano. Tente novamente.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleExport = (format: "pdf" | "csv") => {
    const area = activeTab;
    const tasks = (plans[area] || []).filter(t => !t.deleted);
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

  const handleExportAllPDF = () => {
    const projectName = project?.name || "Plano de Ação";
    const dateStr = new Date().toLocaleDateString("pt-BR");
    const totalTasksAll = Object.values(plans).reduce((s, arr) => s + (arr?.filter(t => !t.deleted).length || 0), 0);
    const doneTasksAll = Object.values(plans).flat().filter(t => t.status === "concluido" && !t.deleted).length;
    const progressAll = totalTasksAll > 0 ? Math.round((doneTasksAll / totalTasksAll) * 100) : 0;

    const areasHtml = AREAS.map(areaConfig => {
      const tasks = (plans[areaConfig.key] || []).filter(t => !t.deleted);
      if (tasks.length === 0) return "";
      const rows = tasks.map(t => {
        const prioColor = t.prioridade === "Alta" ? "background:#fee2e2;color:#b91c1c" :
          t.prioridade === "Média" ? "background:#fef3c7;color:#92400e" : "background:#d1fae5;color:#065f46";
        return `<tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:8px 6px;font-size:12px">${t.titulo}${t.manual ? ' <span style="font-size:10px;color:#2563eb">[Manual]</span>' : ''}</td>
          <td style="padding:8px 6px;font-size:11px;color:#6b7280">${t.descricao}</td>
          <td style="padding:8px 6px;font-size:11px;text-align:center"><span style="padding:2px 6px;border-radius:4px;font-size:10px;${prioColor}">${t.prioridade}</span></td>
          <td style="padding:8px 6px;font-size:11px;text-align:center">${STATUS_CONFIG[t.status]?.label || t.status}</td>
          <td style="padding:8px 6px;font-size:11px;text-align:center">${t.progress}%</td>
          <td style="padding:8px 6px;font-size:11px">${t.responsible || t.responsavel_sugerido || "—"}</td>
          <td style="padding:8px 6px;font-size:11px;text-align:center">${t.startDate || "—"}</td>
          <td style="padding:8px 6px;font-size:11px;text-align:center">${t.endDate || t.prazo_sugerido || "—"}</td>
        </tr>`;
      }).join("");
      return `<div style="margin-bottom:32px">
        <h2 style="font-size:15px;color:#1e40af;border-bottom:2px solid #bfdbfe;padding-bottom:6px;margin-bottom:12px">${areaConfig.label} <span style="font-size:12px;color:#6b7280;font-weight:normal">(${tasks.length} tarefa${tasks.length !== 1 ? "s" : ""})</span></h2>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#eff6ff">
            <th style="padding:8px 6px;font-size:11px;text-align:left;border-bottom:2px solid #bfdbfe">Título</th>
            <th style="padding:8px 6px;font-size:11px;text-align:left;border-bottom:2px solid #bfdbfe">Descrição</th>
            <th style="padding:8px 6px;font-size:11px;text-align:center;border-bottom:2px solid #bfdbfe">Prioridade</th>
            <th style="padding:8px 6px;font-size:11px;text-align:center;border-bottom:2px solid #bfdbfe">Status</th>
            <th style="padding:8px 6px;font-size:11px;text-align:center;border-bottom:2px solid #bfdbfe">Progresso</th>
            <th style="padding:8px 6px;font-size:11px;text-align:left;border-bottom:2px solid #bfdbfe">Responsável</th>
            <th style="padding:8px 6px;font-size:11px;text-align:center;border-bottom:2px solid #bfdbfe">Início</th>
            <th style="padding:8px 6px;font-size:11px;text-align:center;border-bottom:2px solid #bfdbfe">Prazo</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).join("");

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Plano de Ação Completo — ${projectName}</title>
        <style>
          body{font-family:Arial,sans-serif;margin:32px;color:#111;line-height:1.4}
          .header{border-bottom:3px solid #1e40af;padding-bottom:16px;margin-bottom:24px}
          .header h1{font-size:22px;margin:0 0 4px;color:#1e3a8a}
          .header p{font-size:13px;color:#6b7280;margin:0}
          .summary{display:flex;gap:24px;margin-bottom:28px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
          .summary-item{text-align:center;min-width:80px}
          .summary-item .value{font-size:24px;font-weight:bold;color:#1e40af}
          .summary-item .label{font-size:11px;color:#6b7280;margin-top:2px}
          .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:right}
          @media print{@page{margin:20mm}body{margin:0}}
        </style>
        </head><body>
        <div class="header">
          <h1>Plano de Ação — ${projectName}</h1>
          <p>Compliance com a Reforma Tributária · Gerado em ${dateStr}</p>
        </div>
        <div class="summary">
          <div class="summary-item"><div class="value">${totalTasksAll}</div><div class="label">Total de Tarefas</div></div>
          <div class="summary-item"><div class="value">${doneTasksAll}</div><div class="label">Concluídas</div></div>
          <div class="summary-item"><div class="value">${totalTasksAll - doneTasksAll}</div><div class="label">Pendentes</div></div>
          <div class="summary-item"><div class="value">${progressAll}%</div><div class="label">Progresso Geral</div></div>
          <div class="summary-item"><div class="value">${AREAS.length}</div><div class="label">Áreas Cobertas</div></div>
        </div>
        ${areasHtml}
        <div class="footer">IA SOLARIS — Plataforma de Compliance Tributário · Reforma Tributária 2024</div>
        <script>window.onload=function(){window.print();}<\/script>
        </body></html>`);
      win.document.close();
      toast.success("PDF completo gerado! Use Ctrl+P para salvar.");
    }
  };

  // Geração do Relatório Final em PDF
  const generateFinalReportPDF = () => {
    if (!conclusionData) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 20;

    // Cabeçalho
    doc.setFillColor(15, 118, 110); // emerald-700
    doc.rect(0, 0, pageW, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Final de Compliance Tributário", margin, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Projeto: ${conclusionData.projectName}`, margin, 20);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, 20, { align: "right" });
    y = 36;

    // Resumo executivo
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Executivo", margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["CNAEs Analisados", String(conclusionData.cnaes.length)],
        ["Total de Riscos Mapeados", String(conclusionData.totalRisks)],
        ["Riscos Críticos", String(conclusionData.criticalRisks)],
        ["Riscos de Alta Severidade", String(conclusionData.highRisks)],
        ["Total de Tarefas Criadas", String(conclusionData.totalTasks)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 118, 110] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // CNAEs analisados
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CNAEs Analisados", margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Código", "Descrição"]],
      body: conclusionData.cnaes.map((c: any) => [c.code || c.cnae || "", c.description || c.descricao || ""]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Riscos por severidade
    if (conclusionData.allRisks.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Matriz de Riscos", margin, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Área", "Descrição do Risco", "Probabilidade", "Impacto", "Severidade"]],
        body: conclusionData.allRisks.map((r: any) => [
          r.area || "",
          r.descricao || r.description || "",
          r.probabilidade || "",
          r.impacto || "",
          r.severidade || "",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [234, 88, 12] },
        margin: { left: margin, right: margin },
        didParseCell: (data: any) => {
          if (data.column.index === 4 && data.section === "body") {
            const sev = data.cell.raw as string;
            if (sev === "Crítico" || sev === "Critico") data.cell.styles.textColor = [185, 28, 28];
            else if (sev === "Alta") data.cell.styles.textColor = [194, 65, 12];
            else if (sev === "Média") data.cell.styles.textColor = [161, 98, 7];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Tarefas por responsável
    if (conclusionData.allTasks.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Plano de Ação — Tarefas por Responsável", margin, y);
      y += 4;
      const sortedTasks = [...conclusionData.allTasks].sort((a, b) =>
        (a.responsible || a.responsavel_sugerido || "").localeCompare(b.responsible || b.responsavel_sugerido || "")
      );
      autoTable(doc, {
        startY: y,
        head: [["Área", "Tarefa", "Responsável", "Prazo", "Prioridade", "Status"]],
        body: sortedTasks.map((t: Task) => [
          t.area || "",
          t.titulo || "",
          t.responsible || t.responsavel_sugerido || "—",
          t.endDate || t.prazo_sugerido || "—",
          t.prioridade || "",
          t.status === "concluido" ? "Concluído" : t.status === "em_andamento" ? "Em andamento" : t.status === "parado" ? "Parado" : "Não iniciado",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [5, 150, 105] },
        margin: { left: margin, right: margin },
        columnStyles: { 1: { cellWidth: 50 } },
      });
    }

    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`IA SOLARIS — Plataforma de Compliance Tributário · Página ${i} de ${pageCount}`, pageW / 2, 290, { align: "center" });
    }

    const filename = `relatorio-final-${conclusionData.projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    toast.success("Relatório Final baixado com sucesso!");
  };

  const allAreasGenerated = AREAS.every(a => plans[a.key] && plans[a.key].length > 0);
  const currentTasks = (plans[activeTab] || []);
  // RF-5.10: Filtro por responsável e prazo
  const filteredTasks = currentTasks.filter(t => {
    if (!showDeletedTasks && t.deleted) return false;
    if (showDeletedTasks && !t.deleted) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.prioridade !== filterPriority) return false;
    if (filterResponsible && !(t.responsible || t.responsavel_sugerido || "").toLowerCase().includes(filterResponsible.toLowerCase())) return false;
    if (filterDeadline && t.endDate && t.endDate > filterDeadline) return false;
    return true;
  });

  const totalTasks = Object.values(plans).reduce((s, arr) => s + (arr?.filter(t => !t.deleted).length || 0), 0);
  const doneTasks = Object.values(plans).flat().filter(t => t.status === "concluido" && !t.deleted).length;
  const overallProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const deletedCount = Object.values(plans).flat().filter(t => t.deleted).length;

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
      {/* ─── Tela de Conclusão do Projeto ─────────────────────────────────── */}
      {showConclusion && conclusionData && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-2xl w-full space-y-6 text-center">
            {/* Animação de parabéns */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center animate-bounce">
                  <Trophy className="h-12 w-12 text-emerald-600" />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center">
                  <PartyPopper className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Projeto Concluído!</h1>
                <p className="text-muted-foreground mt-1">O plano de ação foi aprovado e o projeto está pronto para execução.</p>
              </div>
            </div>

            {/* Resumo do projeto */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{conclusionData.cnaes.length}</div>
                  <div className="text-xs text-blue-600 font-medium mt-1">CNAEs Analisados</div>
                </CardContent>
              </Card>
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-3xl font-bold text-orange-700">{conclusionData.totalRisks}</div>
                  <div className="text-xs text-orange-600 font-medium mt-1">Riscos Mapeados</div>
                  {conclusionData.criticalRisks > 0 && (
                    <div className="text-xs text-red-500 mt-1">{conclusionData.criticalRisks} crítico{conclusionData.criticalRisks > 1 ? 's' : ''}</div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-3xl font-bold text-emerald-700">{conclusionData.totalTasks}</div>
                  <div className="text-xs text-emerald-600 font-medium mt-1">Tarefas Criadas</div>
                </CardContent>
              </Card>
            </div>

            {/* CNAEs analisados */}
            {conclusionData.cnaes.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    CNAEs Analisados
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {conclusionData.cnaes.map((c: any) => (
                      <div key={c.code} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
                        <Badge variant="outline" className="text-xs font-mono shrink-0">{c.code}</Badge>
                        <span className="text-muted-foreground truncate">{c.description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* V61: Scoring Financeiro Global */}
            {conclusionData.scoringData && (
              <Card className={`border-2 ${
                conclusionData.scoringData.nivel === 'critico' ? 'border-red-400 bg-red-50' :
                conclusionData.scoringData.nivel === 'alto' ? 'border-orange-400 bg-orange-50' :
                conclusionData.scoringData.nivel === 'medio' ? 'border-amber-400 bg-amber-50' :
                'border-emerald-400 bg-emerald-50'
              }`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Score de Risco Global
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-bold">{conclusionData.scoringData.score_global}<span className="text-lg text-muted-foreground">/100</span></span>
                    <Badge className={`text-sm px-3 py-1 ${
                      conclusionData.scoringData.nivel === 'critico' ? 'bg-red-600' :
                      conclusionData.scoringData.nivel === 'alto' ? 'bg-orange-500' :
                      conclusionData.scoringData.nivel === 'medio' ? 'bg-amber-500' : 'bg-emerald-600'
                    } text-white capitalize`}>{conclusionData.scoringData.nivel}</Badge>
                  </div>
                  <Progress value={conclusionData.scoringData.score_global} className="h-3" />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded bg-white/60">
                      <div className="text-xs text-muted-foreground">Impacto Estimado</div>
                      <div className="font-semibold">{conclusionData.scoringData.impacto_estimado}</div>
                    </div>
                    <div className="p-2 rounded bg-white/60">
                      <div className="text-xs text-muted-foreground">Custo da Inação</div>
                      <div className="font-semibold">{conclusionData.scoringData.custo_inacao}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* V63: Decisão Recomendada */}
            {conclusionData.decisaoData && (
              <Card className="border-2 border-blue-400 bg-blue-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    Veredito Final — Decisão Recomendada
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3 text-left">
                  <div className="p-3 rounded-lg bg-white/70 border border-blue-200">
                    <div className="text-xs text-muted-foreground mb-1">Ação Principal</div>
                    <div className="font-semibold text-blue-900">{conclusionData.decisaoData.acao_principal}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded bg-white/60">
                      <div className="text-xs text-muted-foreground">Prazo</div>
                      <div className="font-semibold">{conclusionData.decisaoData.prazo_dias} dias</div>
                    </div>
                    <div className="p-2 rounded bg-white/60">
                      <div className="text-xs text-muted-foreground">Prioridade</div>
                      <Badge className={`capitalize ${
                        conclusionData.decisaoData.prioridade === 'critica' ? 'bg-red-600' :
                        conclusionData.decisaoData.prioridade === 'alta' ? 'bg-orange-500' : 'bg-amber-500'
                      } text-white`}>{conclusionData.decisaoData.prioridade}</Badge>
                    </div>
                  </div>
                  <div className="p-2 rounded bg-red-50 border border-red-200 text-sm">
                    <div className="text-xs text-red-600 font-medium mb-1">⚠️ Risco se não agir</div>
                    <div className="text-red-800">{conclusionData.decisaoData.risco_se_nao_fazer}</div>
                  </div>
                  {conclusionData.decisaoData.momento_wow && (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200 text-sm">
                      <div className="text-xs text-amber-700 font-medium mb-1">✨ Insight Estratégico</div>
                      <div className="text-amber-900">{conclusionData.decisaoData.momento_wow}</div>
                    </div>
                  )}
                  {conclusionData.decisaoData.proximos_passos?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Próximos Passos</div>
                      <ol className="space-y-1">
                        {conclusionData.decisaoData.proximos_passos.map((p: string, i: number) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0">{i+1}</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {conclusionData.decisaoData.fundamentacao_legal && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      📋 Base legal: {conclusionData.decisaoData.fundamentacao_legal}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tarefas por área */}
            {conclusionData.tasksByArea.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-emerald-500" />
                    Tarefas por Área
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    {conclusionData.tasksByArea.map(({ area, count }) => (
                      <div key={area} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                        <span className="font-medium capitalize">{area}</span>
                        <Badge variant="secondary">{count} tarefa{count > 1 ? 's' : ''}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botões de ação */}
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button
                size="lg"
                onClick={generateFinalReportPDF}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                <Download className="h-5 w-5" />
                Baixar Relatório Final (PDF)
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  sessionStorage.removeItem(`plano-editmode-${projectId}`);
                  setLocation("/projetos");
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8"
              >
                <LayoutDashboard className="h-5 w-5" />
                Ver Projetos
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  sessionStorage.removeItem(`plano-editmode-${projectId}`);
                  setLocation(`/projetos/${projectId}`);
                }}
                className="gap-2 px-8"
              >
                Ver Projeto
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setShowConclusion(false);
                  setEditMode(true);
                  sessionStorage.setItem(`plano-editmode-${projectId}`, 'true');
                }}
                className="gap-2 px-8 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Edit3 className="h-4 w-4" />
                Editar Plano de Ação
              </Button>
            </div>
          </div>
        </div>
      )}

      {!showConclusion && (
      <div className="max-w-5xl mx-auto space-y-6 py-2">
        {showResumeBanner && (
          <ResumeBanner
            savedAt={draftSavedAt}
            onResume={handleResumeDraft}
            onDiscard={handleDiscardDraft}
            label="rascunho do plano de ação"
          />
        )}
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="gap-2 text-sm shrink-0" onClick={() => handleVoltarClick(`/projetos/${projectId}/matrizes-v3`, 4, "Riscos")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar às Matrizes</span>
            <span className="sm:hidden">Voltar</span>
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
              {/* RF-5.06: Botão de dashboard */}
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setShowDashboard(!showDashboard)}>
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </Button>
            </div>
          )}
        </div>

        {/* Stepper — clicável para etapas concluídas */}
        <FlowStepper currentStep={5} projectId={projectId} completedUpTo={statusToCompletedStep(project?.status)} />
        {/* Issue #59 — modal de confirmação de retrocesso */}
        <RetrocessoConfirmModal
          open={retrocessoModal.open}
          projectId={projectId}
          fromStep={5}
          toStep={retrocessoModal.toStep}
          toStepLabel={retrocessoModal.toStepLabel}
          onConfirm={() => { setRetrocessoModal(m => ({ ...m, open: false })); setLocation(retrocessoModal.targetUrl); }}
          onCancel={() => setRetrocessoModal(m => ({ ...m, open: false }))}
        />

        {/* ── Diagnóstico de Entrada (3 Camadas) ────────────────────────────────── */}
        {(project?.corporateAnswers || project?.operationalAnswers || project?.cnaeAnswers) && (
          <DiagnosticoEntradaPanel
            corporateAnswers={project?.corporateAnswers}
            operationalAnswers={project?.operationalAnswers}
            cnaeAnswers={project?.cnaeAnswers}
          />
        )}

        {/* RF-5.06: Dashboard de progresso por área */}
        {showDashboard && allAreasGenerated && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-primary" />
                Dashboard de Progresso por Área
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {AREAS.map(area => {
                  const Icon = area.icon;
                  const tasks = (plans[area.key] || []).filter(t => !t.deleted);
                  const done = tasks.filter(t => t.status === "concluido").length;
                  const inProgress = tasks.filter(t => t.status === "em_andamento").length;
                  const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
                  return (
                    <div key={area.key} className="space-y-2 p-3 rounded-xl border bg-muted/20">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold">{area.label}</span>
                      </div>
                      <div className="text-2xl font-bold text-primary">{progress}%</div>
                      <Progress value={progress} className="h-1.5" />
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex justify-between">
                          <span>Concluídas</span>
                          <span className="font-medium text-emerald-600">{done}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Em andamento</span>
                          <span className="font-medium text-blue-600">{inProgress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total</span>
                          <span className="font-medium">{tasks.length}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Geração em andamento */}
        {isGenerating && Object.keys(plans).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold">Gerando Plano de Ação...</p>
                <p className="text-sm text-muted-foreground">A IA está criando tarefas para as 4 áreas em paralelo. Isso pode levar até 1 minuto.</p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />Contabilidade e Fiscal</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />Negócio</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />TI</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Scale className="h-3 w-3" />Jurídico</span>
                </div>
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
                    const tasks = (plans[area.key] || []).filter(t => !t.deleted);
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
                <div className="flex items-center gap-2 flex-wrap">
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
                  {/* RF-5.10: Filtro por responsável */}
                  <Input
                    value={filterResponsible}
                    onChange={e => setFilterResponsible(e.target.value)}
                    placeholder="Filtrar por responsável..."
                    className="h-8 text-xs w-40"
                  />
                  {/* RF-5.10: Filtro por prazo */}
                  <Input
                    type="date"
                    value={filterDeadline}
                    onChange={e => setFilterDeadline(e.target.value)}
                    className="h-8 text-xs w-36"
                    title="Mostrar tarefas com prazo até esta data"
                  />
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
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {filteredTasks.length} tarefa(s) {filterStatus !== "all" || filterPriority !== "all" || filterResponsible || filterDeadline ? "(filtradas)" : ""}
                      </p>
                      {/* RF-5.09: Toggle de tarefas removidas */}
                      {deletedCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1 text-muted-foreground"
                          onClick={() => setShowDeletedTasks(!showDeletedTasks)}
                        >
                          <Trash2 className="h-3 w-3" />
                          {showDeletedTasks ? "Ocultar removidas" : `Ver removidas (${deletedCount})`}
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* RF-5.08: Botão de adicionar tarefa manualmente */}
                      {!showDeletedTasks && (
                        <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => { setShowAddTask(area.key); setNewTask({ prioridade: "Média", status: "nao_iniciado" }); }}>
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar
                        </Button>
                      )}
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
                      {showDeletedTasks ? "Nenhuma tarefa removida nesta área." : "Nenhuma tarefa encontrada com os filtros selecionados."}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          projectMembers={projectMembers}
                          projectId={projectId}
                          onUpdate={updates => handleUpdateTask(area.key, task.id, updates)}
                          onDelete={() => handleDeleteTask(area.key, task.id)}
                          onRestore={() => handleRestoreTask(area.key, task.id)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>

            {/* RF-5.08: Modal de adição manual de tarefa */}
            <Dialog open={!!showAddTask} onOpenChange={() => setShowAddTask(null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Adicionar Tarefa Manualmente
                    {showAddTask && <span className="text-muted-foreground font-normal">— {AREAS.find(a => a.key === showAddTask)?.label}</span>}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Título <span className="text-destructive">*</span></label>
                    <Input
                      value={newTask.titulo || ""}
                      onChange={e => setNewTask(r => ({ ...r, titulo: e.target.value }))}
                      placeholder="Título da tarefa..."
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
                    <Textarea
                      value={newTask.descricao || ""}
                      onChange={e => setNewTask(r => ({ ...r, descricao: e.target.value }))}
                      placeholder="Descreva o que precisa ser feito..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioridade</label>
                      <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={newTask.prioridade} onChange={e => setNewTask(r => ({ ...r, prioridade: e.target.value as any }))}>
                        {["Alta", "Média", "Baixa"].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Responsável</label>
                      {/* RF-5.07: dropdown com membros do cliente ou input livre */}
                      {projectMembers.length > 0 ? (
                        <select
                          className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                          value={newTask.responsible || ""}
                          onChange={e => setNewTask(r => ({ ...r, responsible: e.target.value }))}
                        >
                          <option value="">Selecionar membro...</option>
                          {projectMembers.map(m => (
                            <option key={m.id} value={m.name}>{m.name} ({m.memberRole})</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={newTask.responsible || ""}
                          onChange={e => setNewTask(r => ({ ...r, responsible: e.target.value }))}
                          placeholder="Nome do responsável..."
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Data de Conclusão</label>
                      <Input
                        type="date"
                        value={newTask.endDate || ""}
                        onChange={e => setNewTask(r => ({ ...r, endDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo Sugerido</label>
                      <Input
                        value={newTask.prazo_sugerido || ""}
                        onChange={e => setNewTask(r => ({ ...r, prazo_sugerido: e.target.value }))}
                        placeholder="Ex: 30 dias"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddTask(null)}>Cancelar</Button>
                  <Button onClick={() => handleAddManualTask(showAddTask!)} disabled={!newTask.titulo?.trim()}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Adicionar Tarefa
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Exportação e Aprovação */}
            {allAreasGenerated && (
              <div className="space-y-3">
                {/* Botão Exportar PDF Completo */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Exportar Plano de Ação Completo</p>
                      <p className="text-xs text-blue-700">PDF com todas as 4 áreas, sumário executivo e progresso geral</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleExportAllPDF} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100">
                    <Download className="h-4 w-4" />
                    Exportar para PDF
                  </Button>
                </div>
                {/* Aprovação */}
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
              </div>
            )}
           </>
        )}
      </div>
      )}

      {/* Anotações colaborativas da equipe */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <StepComments
          projectId={Number(id)}
          step="plano_acao"
          title="Anotações da Equipe — Plano de Ação"
        />
      </div>
    </ComplianceLayout>
  );
}
