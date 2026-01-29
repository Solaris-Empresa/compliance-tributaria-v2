// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Plus, 
  GripVertical, 
  Calendar,
  User,
  Clock,
  Trash2,
  Filter,
} from "lucide-react";
import { 
  TASK_STATUS, 
  TASK_PRIORITY, 
  PRIORITY_COLORS,
  TASK_STATUS_COLORS,
} from "@shared/translations";
import { toast } from "sonner";

type TaskStatus = "pendencias" | "a_fazer" | "em_andamento" | "concluido";
type TaskPriority = "baixa" | "media" | "alta" | "critica";

interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: number | null;
  estimatedHours: number | null;
  actualHours: number | null;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  createdBy: number;
}

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "pendencias", label: TASK_STATUS.pendencias },
  { id: "a_fazer", label: TASK_STATUS.a_fazer },
  { id: "em_andamento", label: TASK_STATUS.em_andamento },
  { id: "concluido", label: TASK_STATUS.concluido },
];

export default function QuadroKanban() {
  const params = useParams();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();

  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "media" as TaskPriority,
    status: "a_fazer" as TaskStatus,
    estimatedHours: "",
    dueDate: "",
  });

  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: tasks = [], refetch } = trpc.tasks.list.useQuery({ projectId });
  const { data: users = [] } = trpc.users.listClients.useQuery();

  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Tarefa criada com sucesso");
      refetch();
      setIsCreateDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        priority: "media",
        status: "a_fazer",
        estimatedHours: "",
        dueDate: "",
      });
    },
    onError: (error) => {
      toast.error(`Erro ao criar tarefa: ${error.message}`);
    },
  });

  const updateStatusMutation = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const deleteTaskMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Tarefa excluída");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir tarefa: ${error.message}`);
    },
  });

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: TaskStatus) => {
    if (!draggedTask) return;

    if (draggedTask.status !== status) {
      updateStatusMutation.mutate({
        projectId,
        taskId: draggedTask.id,
        status,
      });
    }

    setDraggedTask(null);
  };

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast.error("Título obrigatório");
      return;
    }

    createTaskMutation.mutate({
      projectId,
      title: newTask.title,
      description: newTask.description || undefined,
      priority: newTask.priority,
      status: newTask.status,
      estimatedHours: newTask.estimatedHours ? Number(newTask.estimatedHours) : undefined,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
    });
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
      deleteTaskMutation.mutate({ projectId, taskId });
    }
  };

  const filteredTasks = tasks.filter(task => 
    filterPriority === "all" || task.priority === filterPriority
  );

  const getTasksByStatus = (status: TaskStatus) => {
    return filteredTasks.filter(task => task.status === status);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/projetos/${projectId}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Projeto
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quadro de Tarefas</h1>
            <p className="text-gray-600 mt-1">{project.name}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro por prioridade */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select
                value={filterPriority}
                onValueChange={(value) => setFilterPriority(value as TaskPriority | "all")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Prioridades</SelectItem>
                  <SelectItem value="baixa">{TASK_PRIORITY.baixa}</SelectItem>
                  <SelectItem value="media">{TASK_PRIORITY.media}</SelectItem>
                  <SelectItem value="alta">{TASK_PRIORITY.alta}</SelectItem>
                  <SelectItem value="critica">{TASK_PRIORITY.critica}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Tarefa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Nova Tarefa</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Digite o título da tarefa"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Descreva a tarefa"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Prioridade</Label>
                      <Select
                        value={newTask.priority}
                        onValueChange={(value) => setNewTask({ ...newTask, priority: value as TaskPriority })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">{TASK_PRIORITY.baixa}</SelectItem>
                          <SelectItem value="media">{TASK_PRIORITY.media}</SelectItem>
                          <SelectItem value="alta">{TASK_PRIORITY.alta}</SelectItem>
                          <SelectItem value="critica">{TASK_PRIORITY.critica}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="status">Status Inicial</Label>
                      <Select
                        value={newTask.status}
                        onValueChange={(value) => setNewTask({ ...newTask, status: value as TaskStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendencias">{TASK_STATUS.pendencias}</SelectItem>
                          <SelectItem value="a_fazer">{TASK_STATUS.a_fazer}</SelectItem>
                          <SelectItem value="em_andamento">{TASK_STATUS.em_andamento}</SelectItem>
                          <SelectItem value="concluido">{TASK_STATUS.concluido}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimatedHours">Horas Estimadas</Label>
                      <Input
                        id="estimatedHours"
                        type="number"
                        value={newTask.estimatedHours}
                        onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                        placeholder="Ex: 8"
                      />
                    </div>

                    <div>
                      <Label htmlFor="dueDate">Data de Vencimento</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateTask}>
                    Criar Tarefa
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {COLUMNS.map(column => {
          const count = getTasksByStatus(column.id).length;
          return (
            <Card key={column.id}>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">{column.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quadro Kanban */}
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(column => (
          <div
            key={column.id}
            className={`rounded-lg border-2 border-dashed p-4 min-h-[600px] ${TASK_STATUS_COLORS[column.id]}`}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <h3 className="font-semibold text-lg mb-4 flex items-center justify-between">
              {column.label}
              <Badge variant="secondary">{getTasksByStatus(column.id).length}</Badge>
            </h3>

            <div className="space-y-3">
              {getTasksByStatus(column.id).map(task => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  className="cursor-move hover:shadow-lg transition-shadow border-l-4"
                  style={{
                    borderLeftColor: 
                      task.priority === "critica" ? "#dc2626" :
                      task.priority === "alta" ? "#ea580c" :
                      task.priority === "media" ? "#2563eb" :
                      "#6b7280"
                  }}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm font-semibold">
                          {task.title}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-2">
                    {task.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <Badge className={PRIORITY_COLORS[task.priority]}>
                        {TASK_PRIORITY[task.priority]}
                      </Badge>
                    </div>

                    {task.dueDate && (
                      <div className={`flex items-center gap-1 text-xs ${
                        isOverdue(task.dueDate) ? "text-red-600 font-semibold" : "text-gray-500"
                      }`}>
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.dueDate)}
                        {isOverdue(task.dueDate) && " (Atrasada)"}
                      </div>
                    )}

                    {task.estimatedHours && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {task.estimatedHours}h estimadas
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {getTasksByStatus(column.id).length === 0 && (
                <div className="text-center text-sm text-gray-400 py-8">
                  Nenhuma tarefa
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
