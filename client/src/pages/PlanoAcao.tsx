import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Target } from "lucide-react";
import { Streamdown } from "streamdown";

export default function PlanoAcao() {
  const [, params] = useRoute("/projetos/:id/plano");
  const [, setLocation] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : 0;

  const { data: actionPlan, isLoading } = trpc.actionPlan.get.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const generatePlanMutation = trpc.actionPlan.generate.useMutation({
    onSuccess: () => {
      toast.success("Plano de ação gerado com sucesso!");
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar plano: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const approvePlanMutation = trpc.actionPlan.approve.useMutation({
    onSuccess: () => {
      toast.success("Plano de ação aprovado! Projeto em execução.");
      setLocation(`/projetos/${projectId}/kanban`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao aprovar plano: ${error.message}`);
    },
  });

  useEffect(() => {
    // Generate action plan if it doesn't exist yet
    if (!isLoading && !actionPlan && projectId > 0 && !isGenerating) {
      setIsGenerating(true);
      generatePlanMutation.mutate({ projectId });
    }
  }, [isLoading, actionPlan, projectId]);

  const handleApprove = () => {
    if (!actionPlan) return;
    approvePlanMutation.mutate({ projectId });
  };

  if (isLoading || isGenerating) {
    return (
      <ComplianceLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isGenerating ? "Gerando plano de ação..." : "Carregando plano..."}
            </h3>
            <p className="text-muted-foreground">
              {isGenerating
                ? "Nossa IA está criando um plano detalhado com base no briefing e templates disponíveis"
                : "Aguarde um momento"}
            </p>
          </div>
        </div>
      </ComplianceLayout>
    );
  }

  if (!actionPlan) {
    return (
      <ComplianceLayout>
        <div className="p-8">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Plano de ação não encontrado. Complete o briefing primeiro.
              </p>
              <Button asChild>
                <Link href={`/projetos/${projectId}/briefing`}>
                  <a>Ir para Briefing</a>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </ComplianceLayout>
    );
  }

  const isApproved = actionPlan.approvedAt !== null;

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href={`/projetos/${projectId}`}>
            <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar para Projeto
            </a>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Plano de Ação</h1>
              <p className="text-muted-foreground">
                Plano detalhado para adequação à reforma tributária
              </p>
            </div>
            {isApproved && (
              <Badge variant="default" className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Aprovado
              </Badge>
            )}
          </div>

          {actionPlan.templateId && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-800">
                  <strong>Template utilizado:</strong> Este plano foi baseado em um template
                  existente e adaptado para o contexto específico da sua empresa.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Content */}
        <div className="max-w-4xl space-y-6">
          {/* Action Plan Content */}
          <Card>
            <CardHeader>
              <CardTitle>Plano Detalhado</CardTitle>
              <CardDescription>
                Gerado em {new Date(actionPlan.generatedAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <Streamdown>{actionPlan.planData}</Streamdown>
              </div>
            </CardContent>
          </Card>

          {/* Approval Section */}
          {!isApproved ? (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Aprovar Plano de Ação</h3>
                    <p className="text-sm text-muted-foreground">
                      Ao aprovar, o projeto avançará para a fase de execução e as tarefas serão
                      criadas automaticamente
                    </p>
                  </div>
                  <Button
                    onClick={handleApprove}
                    disabled={approvePlanMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {approvePlanMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Aprovando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Aprovar Plano
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1 text-green-800">Plano Aprovado</h3>
                    <p className="text-sm text-green-700">
                      Aprovado em {new Date(actionPlan.approvedAt!).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/projetos/${projectId}/kanban`}>
                      <a className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Ir para Kanban
                      </a>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ComplianceLayout>
  );
}
