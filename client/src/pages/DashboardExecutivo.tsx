import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Loader2, TrendingUp, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function DashboardExecutivo() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const { data: projects, isLoading: loadingProjects } = trpc.projects.list.useQuery();
  const { data: globalMetrics, isLoading: loadingGlobal } = trpc.analytics.getGlobalMetrics.useQuery();
  const { data: projectMetrics, isLoading: loadingProject } = trpc.analytics.getProjectMetrics.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  if (loadingProjects || loadingGlobal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const metrics = selectedProjectId ? projectMetrics : globalMetrics;
  const isProjectView = !!selectedProjectId;

  // Dados para gráfico de tarefas por status
  const tasksByStatusData = {
    labels: Object.keys(metrics?.tasks.byStatus || {}),
    datasets: [
      {
        label: 'Tarefas',
        data: Object.values(metrics?.tasks.byStatus || {}),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
      },
    ],
  };

  // Dados para gráfico de tarefas por área
  const tasksByAreaData = {
    labels: Object.keys(metrics?.tasks.byArea || {}),
    datasets: [
      {
        label: 'Tarefas por Área',
        data: Object.values(metrics?.tasks.byArea || {}),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Dashboard Executivo</h1>
        <p className="text-gray-600">Métricas consolidadas de compliance tributário</p>
      </div>

      {/* Seletor de Projeto */}
      <Card className="p-4 mb-6">
        <label className="block text-sm font-medium mb-2">Visualização:</label>
        <div className="flex gap-2">
          <Button
            variant={!selectedProjectId ? "default" : "outline"}
            onClick={() => setSelectedProjectId(null)}
          >
            Visão Global
          </Button>
          <select
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
            className="flex-1 p-2 border rounded"
          >
            <option value="">Selecione um projeto específico</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loadingProject && selectedProjectId ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {!isProjectView && (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Projetos</p>
                    <p className="text-3xl font-bold">{globalMetrics?.projects.total || 0}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </Card>
            )}

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Questionários Corporativos</p>
                  <p className="text-3xl font-bold">
                    {isProjectView
                      ? (projectMetrics?.assessments.corporate.completed ? "1" : "0")
                      : globalMetrics?.assessments.corporate || 0}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Questionários por Ramo</p>
                  <p className="text-3xl font-bold">
                    {isProjectView
                      ? `${projectMetrics?.assessments.branches.completed || 0}/${projectMetrics?.assessments.branches.total || 0}`
                      : globalMetrics?.assessments.branches || 0}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Tarefas</p>
                  <p className="text-3xl font-bold">{metrics?.tasks.total || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Tarefas por Status</h2>
              <div className="h-64">
                <Doughnut
                  data={tasksByStatusData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Tarefas por Área Responsável</h2>
              <div className="h-64">
                <Bar
                  data={tasksByAreaData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                        },
                      },
                    },
                  }}
                />
              </div>
            </Card>
          </div>

          {/* Tarefas Críticas e Atrasadas (apenas em visão de projeto) */}
          {isProjectView && projectMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tarefas Críticas */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Prazos Críticos (7 dias)
                </h2>
                {projectMetrics.tasks.critical.length === 0 ? (
                  <p className="text-gray-600">Nenhuma tarefa com prazo crítico</p>
                ) : (
                  <div className="space-y-2">
                    {projectMetrics.tasks.critical.map((task) => (
                      <div key={task.id} className="p-3 bg-orange-50 rounded border border-orange-200">
                        <p className="font-medium">{task.title}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span>Prazo: {new Date(task.deadline).toLocaleDateString()}</span>
                          <span>Área: {task.responsibleArea}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Tarefas Atrasadas */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Tarefas Atrasadas
                </h2>
                {projectMetrics.tasks.delayed.length === 0 ? (
                  <p className="text-gray-600">Nenhuma tarefa atrasada</p>
                ) : (
                  <div className="space-y-2">
                    {projectMetrics.tasks.delayed.map((task) => (
                      <div key={task.id} className="p-3 bg-red-50 rounded border border-red-200">
                        <p className="font-medium">{task.title}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span>Prazo: {new Date(task.deadline).toLocaleDateString()}</span>
                          <span>Área: {task.responsibleArea}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
