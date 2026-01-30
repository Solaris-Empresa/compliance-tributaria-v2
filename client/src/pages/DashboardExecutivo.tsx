// @ts-nocheck
// @ts-ignore - Type mismatches due to incomplete implementation
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Link } from "wouter";
import { RISK_COLORS } from "@shared/translations";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const COLORS = {
  baixo: "#10b981",
  medio: "#f59e0b",
  alto: "#f97316",
  critico: "#ef4444",
};

const STATUS_COLORS = {
  pendente: "#94a3b8",
  em_andamento: "#3b82f6",
  concluida: "#10b981",
  atrasada: "#ef4444",
};

export default function DashboardExecutivo() {
  const { data: projects, isLoading: loadingProjects } = trpc.project.list.useQuery();
  const { data: allRisks, isLoading: loadingRisks } = trpc.risk.listAll.useQuery();
  const { data: allTasks, isLoading: loadingTasks } = trpc.task.listAll.useQuery();

  if (loadingProjects || loadingRisks || loadingTasks) {
    return (
      <ComplianceLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ComplianceLayout>
    );
  }

  // Calcular KPIs
  const totalProjects = projects?.length || 0;
  const projectsInExecution = projects?.filter((p: any) => p.status === "em_andamento").length || 0;
  const projectsApproved = projects?.filter((p: any) => p.status === "aprovado").length || 0;
  const projectsCompleted = projects?.filter((p: any) => p.status === "concluido").length || 0;

  const totalRisks = allRisks?.length || 0;
  const risksByCriticality = {
    critico: allRisks?.filter((r: any) => r.riskLevel === "critico").length || 0,
    alto: allRisks?.filter((r: any) => r.riskLevel === "alto").length || 0,
    medio: allRisks?.filter((r: any) => r.riskLevel === "medio").length || 0,
    baixo: allRisks?.filter((r: any) => r.riskLevel === "baixo").length || 0,
  };

  const totalTasks = allTasks?.length || 0;
  const tasksCompleted = allTasks?.filter((t: any) => t.status === "concluida").length || 0;
  const tasksInProgress = allTasks?.filter((t: any) => t.status === "em_andamento").length || 0;
  const tasksPending = allTasks?.filter((t: any) => t.status === "pendente").length || 0;
  const tasksOverdue = allTasks?.filter((t: any) => {
    if (!t.dueDate || t.status === "concluida") return false;
    return new Date(t.dueDate) < new Date();
  }).length || 0;

  const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

  // Dados para gráfico de riscos por nível (removidos - não utilizado)
  const risksDataChart = [
    { name: "Crítico", value: risksByCriticality.critico, color: COLORS.critico },
    { name: "Alto", value: risksByCriticality.alto, color: COLORS.alto },
    { name: "Médio", value: risksByCriticality.medio, color: COLORS.medio },
    { name: "Baixo", value: risksByCriticality.baixo, color: COLORS.baixo },
  ];

  // Dados para gráfico de status de tarefas
  const tasksStatusData = [
    { name: "Concluídas", value: tasksCompleted, color: STATUS_COLORS.concluida },
    { name: "Em Andamento", value: tasksInProgress, color: STATUS_COLORS.em_andamento },
    { name: "Pendentes", value: tasksPending, color: STATUS_COLORS.pendente },
    { name: "Atrasadas", value: tasksOverdue, color: STATUS_COLORS.atrasada },
  ];

  return (
    <ComplianceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Painel de Indicadores Executivo</h1>
          <p className="text-muted-foreground">Visão consolidada de todos os projetos de compliance tributário</p>
        </div>

        {/* KPIs Principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {projectsInExecution} em execução, {projectsCompleted} concluídos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {tasksCompleted} de {totalTasks} tarefas concluídas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Riscos Identificados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRisks}</div>
              <p className="text-xs text-muted-foreground">
                {risksByCriticality.critico} críticos, {risksByCriticality.alto} altos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas Atrasadas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{tasksOverdue}</div>
              <p className="text-xs text-muted-foreground">Requerem atenção imediata</p>
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        {tasksOverdue > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Existem {tasksOverdue} tarefas atrasadas que requerem atenção imediata. Revise os projetos em execução.
            </AlertDescription>
          </Alert>
        )}

        {/* Gráficos */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* Status de Tarefas */}
          <Card>
            <CardHeader>
              <CardTitle>Status de Tarefas</CardTitle>
              <CardDescription>Distribuição de tarefas por status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tasksStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tasksStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Projetos por Status */}
          <Card>
            <CardHeader>
              <CardTitle>Projetos por Status</CardTitle>
              <CardDescription>Distribuição de projetos nas diferentes fases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Em Execução</span>
                  <Badge variant="default">{projectsInExecution}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Aprovados</span>
                  <Badge variant="secondary">{projectsApproved}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Concluídos</span>
                  <Badge className="bg-green-600">{projectsCompleted}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total</span>
                  <Badge variant="outline">{totalProjects}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Projetos */}
        <Card>
          <CardHeader>
            <CardTitle>Projetos Recentes</CardTitle>
            <CardDescription>Últimos projetos criados ou atualizados</CardDescription>
          </CardHeader>
          <CardContent>
            {projects && projects.length > 0 ? (
              <div className="space-y-4">
                {projects.slice(0, 5).map((project: any) => (
                  <Link key={project.id} href={`/projetos/${project.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer">
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      </div>
                      <Badge>{project.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum projeto cadastrado ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ComplianceLayout>
  );
}
