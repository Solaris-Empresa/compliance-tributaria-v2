import { useParams, Link } from "wouter";
import { ArrowLeft, CheckCircle2, Clock, Circle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/compliance-v3/shared/Badges";
import { useTasksBoard } from "@/hooks/compliance-v3/useTasksBoard";
import { useState, useEffect } from "react";

const STATUS_ICON: Record<string, React.ReactNode> = {
  nao_iniciado: <Circle className="w-3.5 h-3.5 text-muted-foreground" />,
  em_andamento: <Clock className="w-3.5 h-3.5 text-blue-500" />,
  em_revisao: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
  concluido: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  cancelado: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  bloqueado: <XCircle className="w-3.5 h-3.5 text-orange-400" />,
};

export default function TasksV3() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { tasks, summary, isLoading, updateStatus: updateTaskStatus } = useTasksBoard(projectId);
  const [filterDomain, setFilterDomain] = useState<string | null>(null);

  // Ler query param ?domain= da URL e pré-selecionar filtro
  useEffect(() => {
    const url = new URL(window.location.href);
    const domain = url.searchParams.get("domain");
    if (domain) setFilterDomain(domain);
  }, []);

  // Filtrar tarefas por domínio se selecionado
  const filteredTasks = filterDomain
    ? tasks.filter(t => (t as { domain?: string }).domain === filterDomain)
    : tasks;

  const progressPercent = summary?.progressPercent ?? 0;
  const total = summary?.totalTasks ?? 0;
  const done = summary?.concluido ?? 0;
  const bloqueado = summary?.nao_iniciado ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <Link href={`/projetos/${projectId}/compliance-v3`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">Tarefas Atômicas</h1>
          <p className="text-xs text-muted-foreground">{done}/{total} concluídas</p>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Progress bar */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Progresso Geral</span>
              <span className="text-sm font-bold text-blue-600">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex gap-6 mt-3 flex-wrap">
              {[
                { label: "Não Iniciado", key: "nao_iniciado", color: "text-muted-foreground" },
                { label: "Em Andamento", key: "em_andamento", color: "text-blue-600" },
                { label: "Concluído", key: "concluido", color: "text-green-600" },
                { label: "Bloqueado", key: "bloqueado", color: "text-orange-500" },
              ].map(({ label, key, color }) => (
                <div key={key} className="text-xs">
                  <span className={`font-bold ${color}`}>
                    {summary?.[key as keyof typeof summary] ?? 0}
                  </span>
                  <span className="text-muted-foreground ml-1">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lista de Tarefas ({total})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : tasks.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma tarefa gerada ainda. Inicie um assessment para gerar tarefas.
              </p>
            ) : (
              <div className="divide-y">
                {tasks.map((task, idx) => (
                  <div key={task.taskCode ?? idx} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20">
                    <div className="mt-0.5 shrink-0">
                      {STATUS_ICON[task.status] ?? <Circle className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold">{task.taskName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {task.taskCode} · {task.ownerType}
                            {task.estimatedDays ? ` · ${task.estimatedDays}d` : ""}
                          </p>
                        </div>
                        <StatusBadge value={task.status} className="shrink-0" />
                      </div>
                      {task.status !== "concluido" && task.status !== "cancelado" && (
                        <div className="flex gap-1 mt-2">
                          {task.status === "nao_iniciado" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => updateTaskStatus(task.taskCode, "em_andamento")}
                            >
                              Iniciar
                            </Button>
                          )}
                          {task.status === "em_andamento" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => updateTaskStatus(task.taskCode, "concluido")}
                            >
                              Concluir
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
