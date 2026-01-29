import { useAuth } from "@/_core/hooks/useAuth";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FolderKanban, CheckCircle2, AlertCircle, Clock, Plus, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: projects, isLoading } = trpc.projects.list.useQuery();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Rascunho", variant: "outline" },
      assessment_phase1: { label: "Assessment Fase 1", variant: "secondary" },
      assessment_phase2: { label: "Assessment Fase 2", variant: "secondary" },
      briefing: { label: "Briefing", variant: "secondary" },
      planning: { label: "Planejamento", variant: "default" },
      execution: { label: "Em Execução", variant: "default" },
      completed: { label: "Concluído", variant: "default" },
      archived: { label: "Arquivado", variant: "outline" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const stats = {
    total: projects?.length || 0,
    inProgress: projects?.filter(p => p.status === "execution").length || 0,
    planning: projects?.filter(p => ["assessment_phase1", "assessment_phase2", "briefing", "planning"].includes(p.status)).length || 0,
    completed: projects?.filter(p => p.status === "completed").length || 0,
  };

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo, {user?.name?.split(" ")[0] || "Usuário"}
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus projetos de adequação à reforma tributária
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Projetos
              </CardTitle>
              <FolderKanban className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Execução
              </CardTitle>
              <Clock className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Planejamento
              </CardTitle>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats.planning}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Concluídos
              </CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Meus Projetos</CardTitle>
                <CardDescription>Projetos de compliance em andamento</CardDescription>
              </div>
              {user?.role === "admin" && (
                <Button asChild>
                  <Link href="/projetos/novo">
                    <a className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Novo Projeto
                    </a>
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando projetos...
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-4">
                {projects.map((project) => (
                  <Link key={project.id} href={`/projetos/${project.id}`}>
                    <a className="block p-4 rounded-lg border hover:bg-accent transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground">{project.name}</h3>
                            {getStatusBadge(project.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Criado em {new Date(project.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </a>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {user?.role === "admin"
                    ? "Comece criando seu primeiro projeto de compliance"
                    : "Você ainda não foi adicionado a nenhum projeto"}
                </p>
                {user?.role === "admin" && (
                  <Button asChild>
                    <Link href="/projetos/novo">
                      <a className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Criar Primeiro Projeto
                      </a>
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ComplianceLayout>
  );
}
