/**
 * ActionPlanPage.tsx — Sprint Z-07 PR #C → Sprint Z-12 UX Spec
 *
 * Página de gestão de planos de ação e tarefas do Sistema de Riscos v4.
 * Consome: trpc.risksV4.upsertActionPlan · deleteActionPlan · approveActionPlan
 *          trpc.risksV4.upsertTask · deleteTask · getProjectAuditLog
 *
 * Z-12: Sticky traceability banner (5 chips), task lock when plan=rascunho,
 *       global audit log tab.
 */

import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  History,
  Loader2,
  Plus,
  Trash2,
  ThumbsUp,
  CheckSquare,
  Lock,
  Pencil,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_PLAN_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  deleted: "Excluído",
};

const STATUS_TASK_LABELS: Record<string, string> = {
  todo: "A Fazer",
  doing: "Em Andamento",
  done: "Concluída",
  blocked: "Bloqueada",
};

const STATUS_TASK_COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  doing: "bg-blue-100 text-blue-700 border-blue-200",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  blocked: "bg-red-100 text-red-700 border-red-200",
  deleted: "bg-muted text-muted-foreground border-dashed",
};

const CATEGORIA_LABELS: Record<string, string> = {
  imposto_seletivo: "Imposto Seletivo",
  confissao_automatica: "Confissão Automática",
  split_payment: "Split Payment",
  inscricao_cadastral: "Inscrição Cadastral",
  regime_diferenciado: "Regime Diferenciado",
  transicao_iss_ibs: "Transição ISS/IBS",
  obrigacao_acessoria: "Obrigação Acessória",
  aliquota_zero: "Alíquota Zero",
  aliquota_reduzida: "Alíquota Reduzida",
  credito_presumido: "Crédito Presumido",
};

const SOURCE_LABELS: Record<string, string> = {
  cnae: "CNAE",
  ncm: "NCM",
  nbs: "NBS",
  solaris: "Solaris",
  iagen: "IA Gen",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  created: "Criado",
  updated: "Atualizado",
  deleted: "Excluído",
  restored: "Restaurado",
  approved: "Aprovado",
};

const AUDIT_ENTITY_LABELS: Record<string, string> = {
  risk: "Risco",
  action_plan: "Plano de Ação",
  task: "Tarefa",
};

// ─── Sub-componente: TraceabilityBanner ──────────────────────────────────────

interface RiskParent {
  id: string;
  project_id: number;
  titulo: string;
  categoria: string;
  artigo: string;
  rule_id: string;
  source_priority: string;
  breadcrumb: [string, string, string, string] | string;
}

function TraceabilityBanner({ risk, projectId }: { risk: RiskParent; projectId: number }) {
  const bc = Array.isArray(risk.breadcrumb)
    ? risk.breadcrumb
    : (() => { try { return JSON.parse(risk.breadcrumb as string); } catch { return [risk.source_priority, risk.categoria, risk.artigo, risk.rule_id]; } })();

  const chips: { label: string; color: string; tooltip: string }[] = [
    { label: SOURCE_LABELS[bc[0]] ?? bc[0], color: "bg-blue-100 text-blue-700", tooltip: `Fonte: ${bc[0]}` },
    { label: CATEGORIA_LABELS[bc[1]] ?? bc[1], color: "bg-purple-100 text-purple-700", tooltip: `Categoria: ${CATEGORIA_LABELS[bc[1]] ?? bc[1]}` },
    { label: `Art. ${bc[2]}`, color: "bg-green-100 text-green-700", tooltip: `Artigo: ${bc[2]}` },
    { label: bc[3], color: "bg-gray-100 text-gray-600", tooltip: `Rule ID: ${bc[3]}` },
    { label: risk.titulo.length > 40 ? risk.titulo.slice(0, 40) + "…" : risk.titulo, color: "bg-amber-100 text-amber-700", tooltip: risk.titulo },
  ];

  return (
    <div data-testid="traceability-banner" className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-1.5 flex-wrap max-w-4xl mx-auto">
        <span className="text-xs text-muted-foreground mr-1 shrink-0">Rastreabilidade:</span>
        {chips.map((chip, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground text-[10px]">›</span>}
            <Tooltip>
              <TooltipTrigger asChild>
                {i === chips.length - 1 ? (
                  <Link href={`/projetos/${projectId}/risk-dashboard-v4`}>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-80 ${chip.color}`}>
                      {chip.label}
                    </span>
                  </Link>
                ) : (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${chip.color}`}>
                    {chip.label}
                  </span>
                )}
              </TooltipTrigger>
              <TooltipContent>{chip.tooltip}</TooltipContent>
            </Tooltip>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-componente: TaskRow ─────────────────────────────────────────────────

// ─── Sort + Overdue helpers (#616) ──────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(task: { data_fim?: string | Date | null; status: string }): boolean {
  if (task.status === "done" || task.status === "deleted") return false;
  if (!task.data_fim) return false;
  const fim = typeof task.data_fim === "string" ? task.data_fim.slice(0, 10) : task.data_fim.toISOString().slice(0, 10);
  return fim < getToday();
}

function overdueDays(task: { data_fim?: string | Date | null }): number {
  if (!task.data_fim) return 0;
  const fim = typeof task.data_fim === "string" ? task.data_fim.slice(0, 10) : task.data_fim.toISOString().slice(0, 10);
  const diff = new Date(getToday()).getTime() - new Date(fim).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function sortTasks<T extends { data_fim?: string | Date | null; status: string }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    const aDone = a.status === "done";
    const bDone = b.status === "done";
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;
    const aFim = a.data_fim ? (typeof a.data_fim === "string" ? a.data_fim : a.data_fim.toISOString()) : "9999";
    const bFim = b.data_fim ? (typeof b.data_fim === "string" ? b.data_fim : b.data_fim.toISOString()) : "9999";
    return aFim.localeCompare(bFim);
  });
}

interface TaskRowProps {
  task: {
    id: string;
    titulo: string;
    descricao?: string | null;
    responsavel: string;
    status: string;
    ordem: number;
    data_inicio?: string | Date | null;
    data_fim?: string | Date | null;
  };
  locked: boolean;
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: (taskId: string, reason: string) => void;
  onEdit?: (task: TaskRowProps["task"]) => void;
}

function TaskRow({ task, locked, onStatusChange, onDelete, onEdit }: TaskRowProps) {
  const [deleting, setDeleting] = useState(false);
  const [reason, setReason] = useState("");

  const NEXT_STATUS: Record<string, string> = {
    todo: "doing",
    doing: "done",
    done: "todo",
    blocked: "todo",
  };

  const taskOverdue = isOverdue(task);
  const days = overdueDays(task);

  return (
    <div
      data-testid="task-row"
      className={`flex items-center gap-2 rounded border px-3 py-2 ${
        locked ? "opacity-40 cursor-not-allowed border-border bg-background"
          : taskOverdue ? "border-amber-300 bg-amber-50"
          : "border-border bg-background"
      }`}
    >
      {locked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0 w-4 h-4 rounded border border-muted-foreground/40 flex items-center justify-center">
              <Lock className="h-2.5 w-2.5 text-muted-foreground" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Aprovar plano para liberar tarefas</TooltipContent>
        </Tooltip>
      ) : (
        <button
          className={`shrink-0 w-4 h-4 rounded border ${
            task.status === "done"
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-muted-foreground/40"
          } flex items-center justify-center`}
          onClick={() => onStatusChange(task.id, NEXT_STATUS[task.status] ?? "todo")}
          title="Avançar status"
        >
          {task.status === "done" && <CheckSquare className="h-3 w-3" />}
        </button>
      )}

      <span
        className={`flex-1 text-sm ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}
      >
        {task.titulo}
      </span>

      <span className="text-xs text-muted-foreground hidden sm:block">{task.responsavel}</span>

      <span
        className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_TASK_COLORS[task.status] ?? STATUS_TASK_COLORS.todo}`}
      >
        {task.status}
      </span>

      {taskOverdue && (
        <span
          data-testid="task-overdue-indicator"
          className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 font-medium"
        >
          Atrasada {days} {days === 1 ? "dia" : "dias"}
        </span>
      )}

      {!locked && onEdit && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-blue-600 hover:text-blue-700"
          title="Editar tarefa"
          onClick={() => onEdit(task)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}

      {!locked && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive/70 hover:text-destructive"
          onClick={() => setDeleting(true)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}

      {/* Modal excluir tarefa (#615) */}
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent data-testid="task-delete-modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será marcada como excluída
              e o motivo ficará registrado no histórico de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="delete-reason" className="text-sm font-medium">
              Motivo da exclusão (mínimo 10 caracteres)
            </Label>
            <Textarea
              id="delete-reason"
              data-testid="task-delete-reason-textarea"
              className="mt-1.5"
              placeholder="Descreva o motivo da exclusão..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/10 caracteres
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleting(false); setReason(""); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="task-delete-confirm-button"
              disabled={reason.length < 10}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(task.id, reason);
                setDeleting(false);
                setReason("");
              }}
            >
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-componente: ActionPlanCard ──────────────────────────────────────────

interface ActionPlanCardProps {
  plan: {
    id: string;
    project_id: number;
    risk_id: string;
    titulo: string;
    responsavel: string;
    prazo: string;
    status: string;
    approved_at?: string | null;
  };
  canApprove: boolean;
  onApprove: (planId: string) => void;
  onDelete: (planId: string, reason: string) => void;
  onEdit?: (plan: ActionPlanCardProps["plan"]) => void;
}

function ActionPlanCard({ plan, canApprove, onApprove, onDelete, onEdit }: ActionPlanCardProps) {
  const utils = trpc.useUtils();
  const [showTasks, setShowTasks] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  // Sprint Z-17 #655 — Task modal state (create + edit unified)
  const [taskModalMode, setTaskModalMode] = useState<"create" | "edit" | null>(null);
  const [editingForPlanId, setEditingForPlanId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRowProps["task"] | null>(null);
  const [taskForm, setTaskForm] = useState({
    titulo: "",
    descricao: "",
    responsavel: "",
    status: "todo",
    dataInicio: "",
    dataFim: "",
  });

  const openTaskCreate = (planId: string) => {
    const today = new Date().toLocaleDateString("en-CA");
    const in30 = new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-CA");
    setTaskModalMode("create");
    setEditingForPlanId(planId);
    setEditingTask(null);
    setTaskForm({ titulo: "", descricao: "", responsavel: "", status: "todo", dataInicio: today, dataFim: in30 });
  };

  const openTaskEdit = (task: TaskRowProps["task"]) => {
    setTaskModalMode("edit");
    setEditingForPlanId(null);
    setEditingTask(task);
    const fmtDate = (d?: string | Date | null) => {
      if (!d) return "";
      if (typeof d === "string") return d.slice(0, 10);
      return d.toISOString().slice(0, 10);
    };
    setTaskForm({
      titulo: task.titulo,
      descricao: (task.descricao as string) ?? "",
      responsavel: task.responsavel,
      status: task.status,
      dataInicio: fmtDate(task.data_inicio),
      dataFim: fmtDate(task.data_fim),
    });
  };

  const closeTaskModal = () => {
    setTaskModalMode(null);
    setEditingTask(null);
    setEditingForPlanId(null);
    setTaskForm({ titulo: "", descricao: "", responsavel: "", status: "todo", dataInicio: "", dataFim: "" });
  };

  const taskDateError = taskForm.dataInicio && taskForm.dataFim && taskForm.dataFim < taskForm.dataInicio
    ? "Data fim não pode ser anterior à data início"
    : "";

  const tasksQuery = trpc.risksV4.listRisks.useQuery(
    { projectId: plan.project_id },
    { enabled: false }
  );

  const auditQuery = trpc.risksV4.getAuditLog.useQuery(
    { projectId: plan.project_id, entity: "action_plan", entityId: plan.id },
    { enabled: showAudit }
  );

  const deleteTaskMutation = trpc.risksV4.deleteTask.useMutation({
    onSuccess: () => {
      utils.risksV4.listRisks.invalidate({ projectId: plan.project_id });
      utils.risksV4.getProjectAuditLog.invalidate({ projectId: plan.project_id });
      toast.success("Tarefa excluída");
    },
    onError: (err) => toast.error("Erro ao excluir tarefa", { description: err.message }),
  });

  const updateTaskMutation = trpc.risksV4.upsertTask.useMutation({
    onSuccess: () => utils.risksV4.listRisks.invalidate({ projectId: plan.project_id }),
  });

  // Sprint Z-18 #705 — Restore plano deletado
  const restoreActionPlanMutation = trpc.risksV4.restoreActionPlan.useMutation({
    onSuccess: () => {
      utils.risksV4.listRisks.invalidate({ projectId: plan.project_id });
      utils.risksV4.getProjectAuditLog.invalidate({ projectId: plan.project_id });
      toast.success("Plano restaurado");
    },
    onError: (err) => toast.error("Erro ao restaurar plano", { description: err.message }),
  });

  // Sprint Z-16 #614 — Save full task edit
  const saveTaskEditMutation = trpc.risksV4.upsertTask.useMutation({
    onSuccess: () => {
      utils.risksV4.listRisks.invalidate({ projectId: plan.project_id });
      utils.risksV4.getProjectAuditLog.invalidate({ projectId: plan.project_id });
      const wasCreate = taskModalMode === "create";
      closeTaskModal();
      toast.success(wasCreate ? "Tarefa criada" : "Tarefa atualizada");
    },
    onError: (err) => toast.error("Erro ao salvar tarefa", { description: err.message }),
  });

  const isApproved = !!plan.approved_at;
  const isDeleted = plan.status === "deleted";
  const isLocked = plan.status === "rascunho";

  return (
    <div
      data-testid="action-plan-row"
      className={`rounded-lg border p-4 ${
        isDeleted ? "opacity-50 border-dashed border-muted-foreground/30" : "border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {STATUS_PLAN_LABELS[plan.status] ?? plan.status}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {plan.prazo.replace("_", " ")}
            </Badge>
            {isApproved && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Aprovado
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                <Lock className="h-3 w-3" />
                Tarefas bloqueadas
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground">{plan.titulo}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Responsável: {plan.responsavel}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {canApprove && !isApproved && !isDeleted && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
              title="Aprovar plano"
              onClick={() => onApprove(plan.id)}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
          )}
          {onEdit && !isDeleted && plan.status !== "concluido" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="Editar plano"
              onClick={() => onEdit(plan)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Ver auditoria"
            onClick={() => setShowAudit(!showAudit)}
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          {isDeleted && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-blue-600 hover:text-blue-700"
              data-testid="restore-plan-button"
              onClick={() =>
                restoreActionPlanMutation.mutate({
                  projectId: plan.project_id,
                  actionPlanId: plan.id,
                })
              }
              disabled={restoreActionPlanMutation.isPending}
            >
              {restoreActionPlanMutation.isPending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : "↩ Restaurar"}
            </Button>
          )}
          {!isDeleted && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive/70 hover:text-destructive"
              onClick={() => setDeleting(!deleting)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Delete inline */}
      {deleting && (
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 text-xs rounded border border-border bg-background px-2 py-1 focus:outline-none"
            placeholder="Motivo da exclusão"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs"
            disabled={!deleteReason.trim()}
            onClick={() => {
              onDelete(plan.id, deleteReason);
              setDeleting(false);
            }}
          >
            Confirmar
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeleting(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Audit log */}
      {showAudit && (
        <div className="mt-3 border-t border-border pt-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Histórico de auditoria</p>
          {auditQuery.isLoading && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Carregando…
            </div>
          )}
          {auditQuery.data?.entries.map((entry) => (
            <div key={entry.id} className="text-xs text-muted-foreground flex gap-2">
              <span className="font-mono">{new Date(entry.created_at).toLocaleString("pt-BR")}</span>
              <span className="font-medium text-foreground">{entry.action}</span>
              <span>{entry.user_name}</span>
              {entry.reason && <span className="italic">— {entry.reason}</span>}
            </div>
          ))}
          {auditQuery.data?.entries.length === 0 && (
            <p className="text-xs text-muted-foreground">Sem registros de auditoria.</p>
          )}
        </div>
      )}

      {/* Tarefas */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <button
            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setShowTasks(!showTasks)}
          >
            <CheckSquare className="h-3 w-3" />
            Tarefas
            {isLocked && <Lock className="h-2.5 w-2.5 ml-0.5 text-amber-500" />}
          </button>
          {!isDeleted && (
            isLocked ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs gap-1"
                      disabled
                      data-testid="task-create-button"
                    >
                      <Plus className="h-3 w-3" />
                      Nova tarefa
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Aprove o plano para criar tarefas</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs gap-1"
                onClick={() => openTaskCreate(plan.id)}
                data-testid="task-create-button"
              >
                <Plus className="h-3 w-3" />
                Nova tarefa
              </Button>
            )
          )}
        </div>

        {/* Sprint Z-16 #614 — Task list rendering */}
        {showTasks && (plan as any).tasks && (
          <div className="space-y-1.5 mt-2">
            {sortTasks((plan as any).tasks).map((task: any) => (
              <TaskRow
                key={task.id}
                task={task}
                locked={isLocked}
                onStatusChange={(taskId, status) =>
                  updateTaskMutation.mutate({
                    projectId: plan.project_id,
                    actionPlanId: plan.id,
                    taskId,
                    titulo: task.titulo,
                    responsavel: task.responsavel,
                    status: status as "todo" | "doing" | "done" | "blocked",
                  })
                }
                onDelete={(taskId, reason) =>
                  deleteTaskMutation.mutate({
                    projectId: plan.project_id,
                    taskId,
                    reason,
                  })
                }
                onEdit={(t) => openTaskEdit(t)}
              />
            ))}
            {(plan as any).tasks.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">Nenhuma tarefa cadastrada.</p>
            )}
          </div>
        )}
      </div>

      {/* Sprint Z-16 #614 — Task edit modal */}
      <Dialog open={taskModalMode !== null} onOpenChange={(open) => { if (!open) closeTaskModal(); }}>
        <DialogContent className="sm:max-w-md" data-testid="task-edit-modal">
          <DialogHeader>
            <DialogTitle>{taskModalMode === "create" ? "Nova tarefa" : "Editar tarefa"}</DialogTitle>
            <DialogDescription>
              {taskModalMode === "create" ? "Preencha os campos para criar a tarefa" : "Altere os campos e salve"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="task-titulo">Título *</Label>
              <Input
                id="task-titulo"
                data-testid="task-edit-titulo"
                value={taskForm.titulo}
                onChange={(e) => setTaskForm((f) => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="task-descricao">Descrição</Label>
              <Textarea
                id="task-descricao"
                data-testid="task-edit-descricao"
                value={taskForm.descricao}
                onChange={(e) => setTaskForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="task-responsavel">Responsável *</Label>
                <Input
                  id="task-responsavel"
                  data-testid="task-edit-responsavel"
                  value={taskForm.responsavel}
                  onChange={(e) => setTaskForm((f) => ({ ...f, responsavel: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="task-status">Status</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={(v) => setTaskForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger id="task-status" data-testid="task-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_TASK_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="task-data-inicio">Data Início</Label>
                <Input
                  id="task-data-inicio"
                  data-testid="task-edit-data-inicio"
                  type="date"
                  value={taskForm.dataInicio}
                  onChange={(e) => setTaskForm((f) => ({ ...f, dataInicio: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="task-data-fim">Data Fim</Label>
                <Input
                  id="task-data-fim"
                  data-testid="task-edit-data-fim"
                  type="date"
                  value={taskForm.dataFim}
                  onChange={(e) => setTaskForm((f) => ({ ...f, dataFim: e.target.value }))}
                />
              </div>
            </div>
            {taskDateError && (
              <p className="text-xs text-destructive">{taskDateError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTaskModal}>Cancelar</Button>
            <Button
              data-testid="task-submit-button"
              disabled={
                !taskForm.titulo.trim() ||
                taskForm.titulo.trim().length < 3 ||
                !taskForm.responsavel.trim() ||
                !!taskDateError ||
                saveTaskEditMutation.isPending
              }
              onClick={() => {
                if (taskModalMode === "edit" && !editingTask) return;
                if (taskModalMode === "create" && !editingForPlanId) return;
                saveTaskEditMutation.mutate({
                  projectId: plan.project_id,
                  actionPlanId: taskModalMode === "create" ? editingForPlanId! : plan.id,
                  taskId: taskModalMode === "edit" ? editingTask!.id : undefined,
                  titulo: taskForm.titulo,
                  descricao: taskForm.descricao || undefined,
                  responsavel: taskForm.responsavel,
                  status: taskForm.status as "todo" | "doing" | "done" | "blocked",
                  dataInicio: taskForm.dataInicio,
                  dataFim: taskForm.dataFim,
                });
              }}
            >
              {saveTaskEditMutation.isPending
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{taskModalMode === "create" ? "Criando..." : "Salvando..."}</>
                : taskModalMode === "create" ? "Criar tarefa" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ActionPlanPage() {
  const [, params] = useRoute("/projetos/:projectId/planos-v4");
  const projectId = parseInt(params?.projectId ?? "0", 10);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const canApprove =
    user?.role === "equipe_solaris" || user?.role === "advogado_senior";

  // Ler riskId da query string para traceability banner
  const riskIdParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("riskId")
    : null;

  // Carregar todos os riscos com planos de ação
  const { data, isLoading, error } = trpc.risksV4.listRisks.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Global audit log
  const auditLogQuery = trpc.risksV4.getProjectAuditLog.useQuery(
    { projectId, limit: 100 },
    { enabled: !!projectId }
  );

  const approvePlanMutation = trpc.risksV4.approveActionPlan.useMutation({
    onSuccess: () => {
      utils.risksV4.listRisks.invalidate({ projectId });
      utils.risksV4.getProjectAuditLog.invalidate({ projectId });
      toast.success("Plano aprovado com sucesso");
    },
    onError: (err) => toast.error("Erro ao aprovar plano", { description: err.message }),
  });

  const [showNewPlan, setShowNewPlan] = useState(false);
  const [editPlanTarget, setEditPlanTarget] = useState<{ id: string; risk_id: string; titulo: string; responsavel: string; prazo: string; descricao?: string | null; status: string } | null>(null);
  const [npTitulo, setNpTitulo] = useState("");
  const [npResponsavel, setNpResponsavel] = useState("");
  const [npPrazo, setNpPrazo] = useState("");
  const [npDescricao, setNpDescricao] = useState("");

  const isEditMode = !!editPlanTarget;

  const openEditPlan = (plan: typeof editPlanTarget) => {
    if (!plan) return;
    setEditPlanTarget(plan);
    setNpTitulo(plan.titulo);
    setNpResponsavel(plan.responsavel);
    setNpPrazo(plan.prazo);
    setNpDescricao((plan as any).descricao ?? "");
    setShowNewPlan(true);
  };

  const closePlanModal = () => {
    setShowNewPlan(false);
    setEditPlanTarget(null);
    setNpTitulo(""); setNpResponsavel(""); setNpPrazo(""); setNpDescricao("");
  };

  const upsertPlanMutation = trpc.risksV4.upsertActionPlan.useMutation({
    onSuccess: () => {
      utils.risksV4.listRisks.invalidate({ projectId });
      toast.success(isEditMode ? "Plano atualizado" : "Plano criado", { duration: isEditMode ? 3000 : 5000 });
      closePlanModal();
    },
    onError: (err) => toast.error(isEditMode ? "Erro ao salvar plano" : "Erro ao criar plano", { description: err.message }),
  });

  const deletePlanMutation = trpc.risksV4.deleteActionPlan.useMutation({
    onSuccess: () => {
      utils.risksV4.listRisks.invalidate({ projectId });
      utils.risksV4.getProjectAuditLog.invalidate({ projectId });
      toast("Plano excluído", { description: "Movido para o histórico." });
    },
    onError: (err) => toast.error("Erro ao excluir plano", { description: err.message }),
  });

  const allPlans = useMemo(
    () => (data?.risks ?? []).flatMap((r) => (r as any).actionPlans ?? []),
    [data]
  );

  // Find the parent risk for the traceability banner
  const parentRisk = useMemo(() => {
    if (!riskIdParam || !data?.risks) return null;
    return (data.risks as unknown as RiskParent[]).find((r) => r.id === riskIdParam) ?? null;
  }, [riskIdParam, data]);

  const auditEntries = auditLogQuery.data?.entries ?? [];

  if (!projectId) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Projeto não identificado na URL.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Item 10: Sticky traceability banner */}
      {parentRisk && <TraceabilityBanner risk={parentRisk} projectId={projectId} />}

      <div className="container max-w-4xl py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link href={`/projetos/${projectId}`}>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
              Projeto
            </Button>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Planos de Ação v4
          </span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Planos de Ação — v4</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestão de planos e tarefas do Sistema de Riscos v4
            </p>
          </div>
          {riskIdParam && (
            <Button data-testid="new-plan-button" size="sm" onClick={() => setShowNewPlan(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo plano
            </Button>
          )}
        </div>

        {/* Modal: Novo / Editar plano */}
        {showNewPlan && (riskIdParam || editPlanTarget) && (
          <Dialog open onOpenChange={(open) => { if (!open) closePlanModal(); }}>
            <DialogContent className="sm:max-w-md" data-testid="action-plan-modal">
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Editar plano de ação" : "Novo plano de ação"}</DialogTitle>
                <DialogDescription>{isEditMode ? "Altere os campos e salve" : "Vinculado ao risco selecionado"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="ap-titulo">Título *</Label>
                  <Input data-testid="plan-title-input" id="ap-titulo" value={npTitulo} onChange={(e) => setNpTitulo(e.target.value)} placeholder="Min 5 caracteres" maxLength={500} />
                  {npTitulo.length > 0 && npTitulo.length < 5 && <p className="text-xs text-destructive mt-1">Título muito curto</p>}
                  {!isEditMode && parentRisk && (
                    <span data-testid="ai-suggestion-box">
                    <button
                      data-testid="ai-suggestion-accept"
                      type="button"
                      className="mt-1 text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-none p-0"
                      onClick={async () => {
                        try {
                          const suggestion = await utils.risksV4.getActionPlanSuggestion.fetch({
                            ruleId: parentRisk.rule_id,
                            riskTitulo: parentRisk.titulo,
                          });
                          if (suggestion) {
                            setNpTitulo(suggestion.titulo);
                            setNpResponsavel(suggestion.responsavel);
                            setNpPrazo(suggestion.prazo);
                          }
                        } catch { /* fallback: campos ficam como estão */ }
                      }}
                    >
                      Sugestão da IA ↗ — clique para usar
                    </button>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ap-resp">Responsável *</Label>
                    <Input data-testid="plan-responsavel-select" id="ap-resp" value={npResponsavel} onChange={(e) => setNpResponsavel(e.target.value)} placeholder="Nome" />
                  </div>
                  <div>
                    <Label htmlFor="ap-prazo">Prazo *</Label>
                    <Select value={npPrazo} onValueChange={setNpPrazo}>
                      <SelectTrigger data-testid="plan-prazo-select" id="ap-prazo"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30_dias">30 dias</SelectItem>
                        <SelectItem value="60_dias">60 dias</SelectItem>
                        <SelectItem value="90_dias">90 dias</SelectItem>
                        <SelectItem value="180_dias">180 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="ap-desc">Descrição (opcional)</Label>
                  <Textarea data-testid="plan-descricao-textarea" id="ap-desc" value={npDescricao} onChange={(e) => setNpDescricao(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closePlanModal}>Cancelar</Button>
                <Button
                  data-testid="plan-submit-button"
                  disabled={npTitulo.length < 5 || !npResponsavel || !npPrazo || upsertPlanMutation.isPending}
                  onClick={() => upsertPlanMutation.mutate({
                    projectId,
                    riskId: editPlanTarget?.risk_id ?? riskIdParam!,
                    titulo: npTitulo,
                    responsavel: npResponsavel,
                    prazo: npPrazo as "30_dias" | "60_dias" | "90_dias" | "180_dias",
                    descricao: npDescricao || undefined,
                    ...(editPlanTarget ? { planId: editPlanTarget.id } : {}),
                  })}
                >
                  {upsertPlanMutation.isPending
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{isEditMode ? "Salvando..." : "Criando..."}</>
                    : isEditMode ? "Salvar alterações" : "Criar plano"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-[100px] rounded-lg" />
            <Skeleton className="h-[100px] rounded-lg" />
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Erro ao carregar planos: {error.message}</AlertDescription>
          </Alert>
        )}

        {/* Item 12: Tabs — Planos + Histórico global */}
        {!isLoading && !error && (<>
          <Tabs defaultValue="planos">
            <TabsList>
              <TabsTrigger data-testid="plans-tab" value="planos">Planos ({allPlans.length})</TabsTrigger>
              <TabsTrigger data-testid="history-tab" value="historico">Histórico ({auditEntries.length})</TabsTrigger>
            </TabsList>

            {/* Tab: Planos */}
            <TabsContent value="planos">
              {allPlans.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum plano de ação gerado ainda.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Execute o diagnóstico para gerar riscos e planos de ação v4.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-blue-500" />
                      Planos de Ação
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {allPlans.length} planos
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {allPlans.map((plan: any) => (
                      <ActionPlanCard
                        key={plan.id}
                        plan={plan}
                        canApprove={canApprove}
                        onApprove={(planId) =>
                          approvePlanMutation.mutate({ projectId, planId })
                        }
                        onDelete={(planId, reason) =>
                          deletePlanMutation.mutate({ projectId, planId, reason })
                        }
                        onEdit={(p) => openEditPlan(p)}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab: Histórico global (audit log) */}
            <TabsContent value="historico">
              <Card data-testid="audit-log">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Histórico de Auditoria
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {auditEntries.length} eventos
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {auditLogQuery.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                    </div>
                  ) : auditEntries.length === 0 ? (
                    <div className="py-8 text-center">
                      <History className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum evento de auditoria registrado.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Data</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Ação</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Entidade</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Usuário</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditEntries.map((entry) => (
                            <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                                {new Date(entry.created_at).toLocaleString("pt-BR")}
                              </td>
                              <td className="px-3 py-2">
                                <Badge variant="outline" className="text-xs">
                                  {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {AUDIT_ENTITY_LABELS[entry.entity] ?? entry.entity}
                              </td>
                              <td className="px-3 py-2 text-xs">{entry.user_name}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[200px] truncate">
                                {entry.reason ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Botão Ver Consolidação — visível quando todos os planos estão aprovados (#625) */}
          {allPlans.length > 0 &&
            allPlans.every((p: any) => p.status !== "rascunho") && (
              <div className="flex justify-center pt-4">
                <Button
                  data-testid="btn-ver-consolidacao"
                  size="lg"
                  onClick={() =>
                    setLocation(`/projetos/${projectId}/consolidacao-v4`)
                  }
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Ver Consolidação
                </Button>
              </div>
          )}
        </>)}
      </div>
    </div>
  );
}
