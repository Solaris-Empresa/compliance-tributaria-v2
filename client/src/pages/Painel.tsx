// @ts-nocheck
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Clock, FolderKanban, Plus } from "lucide-react";
import { Link } from "wouter";
import { PROJECT_STATUS, STATUS_COLORS } from "@shared/translations";

export default function Painel() {
  const { data: projects, isLoading } = trpc.projects.list.useQuery();

  const stats = {
    total: projects?.length || 0,
    emAndamento: projects?.filter(p => 
      p.status === "assessment_fase1" || 
      p.status === "assessment_fase2" || 
      p.status === "matriz_riscos" || 
      p.status === "plano_acao"
    ).length || 0,
    emAvaliacao: projects?.filter(p => p.status === "em_avaliacao").length || 0,
    aprovados: projects?.filter(p => p.status === "aprovado" || p.status === "em_andamento").length || 0,
  };

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Painel</h1>
            <p className="text-muted-foreground mt-1">
              Visão geral dos projetos de compliance tributário
            </p>
          </div>
          <Button asChild>
            <Link href="/projetos/novo">
                <Plus className="h-4 w-4" />
                Novo Projeto
              </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Todos os projetos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.emAndamento}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Assessment e planejamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Avaliação</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.emAvaliacao}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando aprovação jurídica
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.aprovados}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Prontos para execução
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Projetos Recentes</CardTitle>
            <CardDescription>
              Últimos projetos criados ou atualizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando projetos...
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-4">
                {projects.slice(0, 5).map((project) => (
                  <Link key={project.id} href={`/projetos/${project.id}`} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex-1">
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            STATUS_COLORS[project.status as keyof typeof STATUS_COLORS] || "text-gray-600 bg-gray-50"
                          }`}
                        >
                          {PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS] || project.status}
                        </span>
                      </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum projeto ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando seu primeiro projeto de compliance
                </p>
                <Button asChild>
                  <Link href="/projetos/novo">Criar Primeiro Projeto</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ComplianceLayout>
  );
}
