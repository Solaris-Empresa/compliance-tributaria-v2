import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ArrowLeft, Calendar, User, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";

interface Task {
  title: string;
  description: string;
  responsibleArea: string;
  taskType: string;
  priority: string;
  estimatedDays: number;
}

export default function VisualizarPlanoCorporativo() {
  const [, setLocation] = useLocation();
  const [projectId, setProjectId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("projectId");
    if (id) setProjectId(parseInt(id));
  }, []);

  const { data: plan, isLoading, error } = trpc.actionPlans.corporate.get.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  if (!projectId) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>ID do projeto não fornecido</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="container py-8">
        <Button variant="ghost" onClick={() => setLocation("/planos-acao")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Plano não encontrado
            </CardTitle>
            <CardDescription>
              {error?.message || "Nenhum plano corporativo foi gerado para este projeto."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const tasks: Task[] = typeof plan.planContent === 'string'
    ? JSON.parse(plan.planContent)
    : plan.planContent;

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case "ALTA": return "destructive";
      case "MÉDIA": return "default";
      case "BAIXA": return "secondary";
      default: return "outline";
    }
  };

  const getAreaColor = (area: string) => {
    const colors: Record<string, string> = {
      TI: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      CONT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      FISC: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      JUR: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      OPS: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      COM: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
      ADM: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };
    return colors[area] || colors.ADM;
  };

  const getTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "STRATEGIC": return "🎯";
      case "OPERATIONAL": return "⚙️";
      case "COMPLIANCE": return "📋";
      default: return "📌";
    }
  };

  return (
    <div className="container py-8">
      <Button variant="ghost" onClick={() => setLocation("/planos-acao")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Planos de Ação
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Plano de Ação Corporativo</h1>
        <p className="text-muted-foreground">
          Plano estratégico baseado no questionário corporativo
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Total de Tarefas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Prazo Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.max(...tasks.map(t => t.estimatedDays))} dias
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tarefa mais longa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Gerado em
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {plan.generatedAt ? new Date(plan.generatedAt).toLocaleDateString('pt-BR') : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4">Tarefas do Plano</h2>
        {tasks.map((task, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getTypeIcon(task.taskType)}</span>
                    {task.title}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {task.description}
                  </CardDescription>
                </div>
                <Badge variant={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Badge className={getAreaColor(task.responsibleArea)} variant="outline">
                    {task.responsibleArea}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {task.estimatedDays} dias estimados
                  </span>
                </div>
                <Badge variant="secondary">
                  {task.taskType}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tasks.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Nenhuma tarefa encontrada
            </CardTitle>
            <CardDescription>
              O plano foi gerado mas não contém tarefas. Tente regenerar o plano.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
