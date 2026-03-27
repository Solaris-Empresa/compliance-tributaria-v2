import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, AlertCircle, ListTodo, MessageSquare, Send, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function DashboardTarefas() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<"all" | "corporate" | "branch">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "SUGGESTED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE">("all");
  const [filterArea, setFilterArea] = useState<"all" | "TI" | "CONT" | "FISC" | "JUR" | "OPS" | "COM" | "ADM">("all");
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState<string>("");

  // Buscar projetos
  const { data: projects, isLoading: loadingProjects } = trpc.projects.list.useQuery();

  // Buscar tarefas com filtros
  const { data: tasks, isLoading: loadingTasks, refetch } = trpc.tasksV2.list.useQuery(
    {
      projectId: selectedProject!,
      filters: {
        category: filterCategory !== "all" ? filterCategory : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        responsibleArea: filterArea !== "all" ? filterArea : undefined,
      },
    },
    { enabled: !!selectedProject }
  );

  // Estatísticas
  const stats = {
    total: tasks?.length || 0,
    suggested: tasks?.filter(t => t.status === "SUGGESTED").length || 0,
    inProgress: tasks?.filter(t => t.status === "IN_PROGRESS").length || 0,
    completed: tasks?.filter(t => t.status === "COMPLETED").length || 0,
    overdue: tasks?.filter(t => t.status === "OVERDUE").length || 0,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      SUGGESTED: { variant: "outline", label: "Sugerido" },
      IN_PROGRESS: { variant: "default", label: "Em Execução" },
      COMPLETED: { variant: "secondary", label: "Concluído" },
      OVERDUE: { variant: "destructive", label: "Atrasado" },
    };
    const config = variants[status] || variants.SUGGESTED;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAreaLabel = (area: string) => {
    const labels: Record<string, string> = {
      TI: "TI",
      CONT: "Contabilidade e Fiscal",
      FISC: "Fiscal",
      JUR: "Jurídico",
      OPS: "Operações",
      COM: "Comercial",
      ADM: "Administrativo",
    };
    return labels[area] || area;
  };

  // Componente de Comentários
  const TaskComments = ({ taskId }: { taskId: number }) => {
    const [comment, setComment] = useState("");
    const { data: comments, refetch } = trpc.comments.list.useQuery({ taskId });
    const createMutation = trpc.comments.create.useMutation({
      onSuccess: () => {
        refetch();
        setComment("");
      },
    });
    const deleteMutation = trpc.comments.delete.useMutation({
      onSuccess: () => refetch(),
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (comment.trim()) {
        createMutation.mutate({ taskId, comment });
      }
    };

    return (
      <div className="border-t pt-3 space-y-3">
        <h4 className="text-sm font-semibold">Comentários</h4>
        
        {/* Lista de comentários */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {comments && comments.length > 0 ? (
            comments.map((c: any) => (
              <div key={c.id} className="bg-muted/50 rounded p-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(c.createdAt).toLocaleString("pt-BR")}
                    </p>
                    <p>{c.comment}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate({ id: c.id })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum comentário ainda</p>
          )}
        </div>

        {/* Formulário de novo comentário */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Adicionar comentário..."
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!comment.trim() || createMutation.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Tarefas</h1>
          <p className="text-muted-foreground">
            Gestão completa de tarefas por projeto, ramo e área responsável
          </p>
        </div>
      </div>

      {/* Seleção de Projeto */}
      <Card>
        <CardHeader>
          <CardTitle>Selecione um Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProjects ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={selectedProject?.toString() || ""}
              onValueChange={(value) => setSelectedProject(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha um projeto..." />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedProject && (
        <>
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sugeridas</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.suggested}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Execução</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.overdue}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Origem</label>
                <Select value={filterCategory} onValueChange={(v: any) => setFilterCategory(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="corporate">Corporativo</SelectItem>
                    <SelectItem value="branch">Ramo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="SUGGESTED">Sugerido</SelectItem>
                    <SelectItem value="IN_PROGRESS">Em Execução</SelectItem>
                    <SelectItem value="COMPLETED">Concluído</SelectItem>
                    <SelectItem value="OVERDUE">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Área Responsável</label>
                <Select value={filterArea} onValueChange={(v: any) => setFilterArea(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="TI">TI</SelectItem>
                    <SelectItem value="CONT">Contabilidade e Fiscal</SelectItem>
                    <SelectItem value="FISC">Fiscal</SelectItem>
                    <SelectItem value="JUR">Jurídico</SelectItem>
                    <SelectItem value="OPS">Operações</SelectItem>
                    <SelectItem value="COM">Comercial</SelectItem>
                    <SelectItem value="ADM">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Tarefas */}
          <Card>
            <CardHeader>
              <CardTitle>Tarefas ({tasks?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTasks ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : tasks && tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{task.title}</h3>
                              {getStatusBadge(task.status)}
                              <Badge variant="outline">{task.category === "corporate" ? "Corporativo" : "Ramo"}</Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Área: {getAreaLabel(task.responsibleArea)}</span>
                              <span>Tipo: {task.taskType}</span>
                              <span>Prioridade: {task.priority}</span>
                              {task.deadline && (
                                <span>Prazo: {new Date(task.deadline).toLocaleDateString("pt-BR")}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Comentários
                          </Button>
                        </div>

                        {/* Seção de Comentários */}
                        {expandedTaskId === task.id && (
                          <TaskComments taskId={task.id} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma tarefa encontrada com os filtros selecionados.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
