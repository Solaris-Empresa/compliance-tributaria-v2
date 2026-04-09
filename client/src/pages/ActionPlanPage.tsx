/**
 * ActionPlanPage.tsx — Sprint Z-07 PR #C
 *
 * Página de gestão de planos de ação e tarefas do Sistema de Riscos v4.
 * Consome: trpc.risksV4.upsertActionPlan · deleteActionPlan · approveActionPlan
 *          trpc.risksV4.upsertTask · deleteTask · getAuditLog
 *
 * Arquivo novo — não altera nenhum arquivo existente (ADR-0022).
 */

import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "lucide-react";
import { Link } from "wouter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_PLAN_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  deleted: "Excluído",
};

const STATUS_TASK_COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  doing: "bg-blue-100 text-blue-700 border-blue-200",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  blocked: "bg-red-100 text-red-700 border-red-200",
  deleted: "bg-muted text-muted-foreground border-dashed",
};

// ─── Sub-componente: TaskRow ──────────────────────────────────────────────────

interface TaskRowProps {
  task: {
    id: string;
    titulo: string;
    responsavel: string;
    status: string;
    ordem: number;
  };
  projectId: number;
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: (taskId: string, reason: string) => void;
}

function TaskRow({ task, onStatusChange, onDelete }: TaskRowProps) {
  const [deleting, setDeleting] = useState(false);
  const [reason, setReason] = useState("");

  const NEXT_STATUS: Record<string, string> = {
    todo: "doing",
    doing: "done",
    done: "todo",
    blocked: "todo",
  };

  return (
    <div className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2">
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

      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-destructive/70 hover:text-destructive"
        onClick={() => setDeleting(!deleting)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>

      {deleting && (
        <div className="flex gap-1 ml-1">
          <input
            className="text-xs rounded border border-border bg-background px-1.5 py-0.5 w-28 focus:outline-none"
            placeholder="Motivo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            size="sm"
            variant="destructive"
            className="h-6 text-xs px-2"
            disabled={!reason.trim()}
            onClick={() => {
              onDelete(task.id, reason);
              setDeleting(false);
              setReason("");
            }}
          >
            OK
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente: ActionPlanCard ───────────────────────────────────────────

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
}

function ActionPlanCard({ plan, canApprove, onApprove, onDelete }: ActionPlanCardProps) {
  const utils = trpc.useUtils();
  const [showTasks, setShowTasks] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [newTask, setNewTask] = useState({ titulo: "", responsavel: "" });

  const tasksQuery = trpc.risksV4.listRisks.useQuery(
    { projectId: plan.project_id },
    { enabled: false } // tasks são carregadas via getTasksByActionPlan — placeholder
  );

  const auditQuery = trpc.risksV4.getAuditLog.useQuery(
    { projectId: plan.project_id, entity: "action_plan", entityId: plan.id },
    { enabled: showAudit }
  );

  const upsertTaskMutation = trpc.risksV4.upsertTask.useMutation({
    onSuccess: () => {
      utils.risksV4.listRisks.invalidate({ projectId: plan.project_id });
      setShowAddTask(false);
      setNewTask({ titulo: "", responsavel: "" });
    },
  });

  const deleteTaskMutation = trpc.risksV4.deleteTask.useMutation({
    onSuccess: () => utils.risksV4.listRisks.invalidate({ projectId: plan.project_id }),
  });

  const updateTaskMutation = trpc.risksV4.upsertTask.useMutation({
    onSuccess: () => utils.risksV4.listRisks.invalidate({ projectId: plan.project_id }),
  });

  const isApproved = !!plan.approved_at;
  const isDeleted = plan.status === "deleted";

  return (
    <div
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
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Ver auditoria"
            onClick={() => setShowAudit(!showAudit)}
          >
            <History className="h-3.5 w-3.5" />
          </Button>
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
          </button>
          {!isDeleted && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs gap-1"
              onClick={() => setShowAddTask(!showAddTask)}
            >
              <Plus className="h-3 w-3" />
              Nova tarefa
            </Button>
          )}
        </div>

        {showAddTask && (
          <div className="mb-2 flex gap-2 flex-wrap">
            <input
              className="flex-1 min-w-32 text-xs rounded border border-border bg-background px-2 py-1 focus:outline-none"
              placeholder="Título da tarefa"
              value={newTask.titulo}
              onChange={(e) => setNewTask((t) => ({ ...t, titulo: e.target.value }))}
            />
            <input
              className="w-32 text-xs rounded border border-border bg-background px-2 py-1 focus:outline-none"
              placeholder="Responsável"
              value={newTask.responsavel}
              onChange={(e) => setNewTask((t) => ({ ...t, responsavel: e.target.value }))}
            />
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!newTask.titulo.trim() || !newTask.responsavel.trim()}
              onClick={() =>
                upsertTaskMutation.mutate({
                  projectId: plan.project_id,
                  actionPlanId: plan.id,
                  titulo: newTask.titulo,
                  responsavel: newTask.responsavel,
                })
              }
            >
              {upsertTaskMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Adicionar"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ActionPlanPage() {
  const [, params] = useRoute("/projetos/:projectId/planos-v4");
  const projectId = parseInt(params?.projectId ?? "0", 10);
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const canApprove =
    user?.role === "equipe_solaris" || user?.role === "advogado_senior";

  // Carregar todos os riscos com planos de ação
  const { data, isLoading, error } = trpc.risksV4.listRisks.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const approvePlanMutation = trpc.risksV4.approveActionPlan.useMutation({
    onSuccess: () => utils.risksV4.listRisks.invalidate({ projectId }),
  });

  const deletePlanMutation = trpc.risksV4.deleteActionPlan.useMutation({
    onSuccess: () => utils.risksV4.listRisks.invalidate({ projectId }),
  });

  const allPlans = useMemo(
    () => (data?.risks ?? []).flatMap((r) => (r as any).actionPlans ?? []),
    [data]
  );

  if (!projectId) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Projeto não identificado na URL.</AlertDescription>
      </Alert>
    );
  }

  return (
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
      <div>
        <h1 className="text-xl font-bold text-foreground">Planos de Ação — v4</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestão de planos e tarefas do Sistema de Riscos v4 (Sprint Z-07)
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Carregando planos…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Erro ao carregar planos: {error.message}</AlertDescription>
        </Alert>
      )}

      {/* Planos */}
      {!isLoading && !error && (
        <>
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
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
