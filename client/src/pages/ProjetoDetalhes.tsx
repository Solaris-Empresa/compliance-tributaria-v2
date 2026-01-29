import { useRoute, useLocation, Link } from "wouter";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  Target,
  Users,
  Settings,
  Play,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function ProjetoDetalhes() {
  const [, params] = useRoute("/projetos/:id");
  const [, setLocation] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : 0;

  const { data: project, isLoading } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  );

  const getStatusInfo = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "outline"; icon: any }
    > = {
      draft: { label: "Rascunho", variant: "outline", icon: FileText },
      assessment_phase1: { label: "Assessment Fase 1", variant: "secondary", icon: ClipboardList },
      assessment_phase2: { label: "Assessment Fase 2", variant: "secondary", icon: ClipboardList },
      briefing: { label: "Briefing", variant: "secondary", icon: FileText },
      planning: { label: "Planejamento", variant: "default", icon: Target },
      execution: { label: "Em Execução", variant: "default", icon: Play },
      completed: { label: "Concluído", variant: "default", icon: CheckCircle2 },
      archived: { label: "Arquivado", variant: "outline", icon: FileText },
    };
    return statusMap[status] || statusMap.draft;
  };

  const getNextAction = () => {
    if (!project) return null;

    switch (project.status) {
      case "draft":
        return {
          label: "Iniciar Assessment Fase 1",
          href: `/projetos/${projectId}/assessment/fase1`,
          description: "Responda as perguntas básicas sobre o projeto",
        };
      case "assessment_phase1":
        return {
          label: "Continuar Assessment Fase 1",
          href: `/projetos/${projectId}/assessment/fase1`,
          description: "Complete as perguntas básicas",
        };
      case "assessment_phase2":
        return {
          label: "Continuar Assessment Fase 2",
          href: `/projetos/${projectId}/assessment/fase2`,
          description: "Responda o questionário personalizado",
        };
      case "briefing":
        return {
          label: "Ver Briefing",
          href: `/projetos/${projectId}/briefing`,
          description: "Revise a análise de gaps gerada",
        };
      case "planning":
        return {
          label: "Ver Plano de Ação",
          href: `/projetos/${projectId}/plano`,
          description: "Revise e aprove o plano de ação",
        };
      case "execution":
        return {
          label: "Acessar Kanban",
          href: `/projetos/${projectId}/kanban`,
          description: "Gerencie as tarefas do projeto",
        };
      case "completed":
        return {
          label: "Ver Relatório Final",
          href: `/projetos/${projectId}/relatorio`,
          description: "Acesse o relatório completo do projeto",
        };
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <ComplianceLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando projeto...</p>
          </div>
        </div>
      </ComplianceLayout>
    );
  }

  if (!project) {
    return (
      <ComplianceLayout>
        <div className="p-8">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Projeto não encontrado</p>
              <Button asChild className="mt-4">
                <Link href="/projetos">
                  <a>Voltar para Projetos</a>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </ComplianceLayout>
    );
  }

  const statusInfo = getStatusInfo(project.status);
  const StatusIcon = statusInfo.icon;
  const nextAction = getNextAction();

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/projetos">
            <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar para Projetos
            </a>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{project.name}</h1>
              <p className="text-muted-foreground">
                Criado em {new Date(project.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <Badge variant={statusInfo.variant} className="flex items-center gap-2 px-3 py-1">
              <StatusIcon className="w-4 h-4" />
              {statusInfo.label}
            </Badge>
          </div>

          {/* Next Action Card */}
          {nextAction && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Próxima Ação</h3>
                    <p className="text-sm text-muted-foreground">{nextAction.description}</p>
                  </div>
                  <Button asChild>
                    <Link href={nextAction.href}>
                      <a>{nextAction.label}</a>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="participants">Participantes</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Progress Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progresso do Projeto</CardTitle>
                  <CardDescription>Fases do fluxo de compliance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { phase: "draft", label: "Criação" },
                      { phase: "assessment_phase1", label: "Assessment Fase 1" },
                      { phase: "assessment_phase2", label: "Assessment Fase 2" },
                      { phase: "briefing", label: "Briefing" },
                      { phase: "planning", label: "Plano de Ação" },
                      { phase: "execution", label: "Execução" },
                      { phase: "completed", label: "Concluído" },
                    ].map((item, index) => {
                      const phases = [
                        "draft",
                        "assessment_phase1",
                        "assessment_phase2",
                        "briefing",
                        "planning",
                        "execution",
                        "completed",
                      ];
                      const currentIndex = phases.indexOf(project.status);
                      const isCompleted = index < currentIndex;
                      const isCurrent = index === currentIndex;

                      return (
                        <div key={item.phase} className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                              isCompleted
                                ? "bg-green-500 text-white"
                                : isCurrent
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isCompleted ? "✓" : index + 1}
                          </div>
                          <span
                            className={`text-sm ${
                              isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                  <CardDescription>Navegue pelas seções do projeto</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href={`/projetos/${projectId}/assessment/fase1`}>
                      <a className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        Assessment
                      </a>
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href={`/projetos/${projectId}/briefing`}>
                      <a className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Briefing
                      </a>
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href={`/projetos/${projectId}/plano`}>
                      <a className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Plano de Ação
                      </a>
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href={`/projetos/${projectId}/kanban`}>
                      <a className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Kanban de Tarefas
                      </a>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>Participantes do Projeto</CardTitle>
                <CardDescription>Gerencie os membros da equipe</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Funcionalidade de gestão de participantes será implementada em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Projeto</CardTitle>
                <CardDescription>Ajuste as configurações e notificações</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Funcionalidade de configurações será implementada em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ComplianceLayout>
  );
}
