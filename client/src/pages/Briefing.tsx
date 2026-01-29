import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function Briefing() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: briefing, refetch } = trpc.briefing.getByProjectId.useQuery({ projectId });

  const generateBriefing = trpc.briefing.generate.useMutation({
    onSuccess: () => {
      setIsGenerating(false);
      refetch();
      toast.success("Briefing gerado com sucesso!");
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast.error(`Erro ao gerar briefing: ${error.message}`);
    },
  });

  const advanceToRiskMatrix = trpc.projects.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Avançando para Matriz de Riscos...");
      setLocation(`/projetos/${projectId}/matriz-riscos`);
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Gerar briefing automaticamente se não existir
  useEffect(() => {
    if (project && !briefing && !isGenerating) {
      setIsGenerating(true);
      generateBriefing.mutate({ projectId });
    }
  }, [project, briefing, projectId, isGenerating]);

  const handleAdvance = () => {
    advanceToRiskMatrix.mutate({
      id: projectId,
      status: "matriz_riscos",
    });
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case "alta":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "media":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "baixa":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      default:
        return null;
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "alta":
        return "border-red-200 bg-red-50";
      case "media":
        return "border-yellow-200 bg-yellow-50";
      case "baixa":
        return "border-green-200 bg-green-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  if (!project) {
    return (
      <ComplianceLayout>
        <div className="p-8">
          <p>Carregando projeto...</p>
        </div>
      </ComplianceLayout>
    );
  }

  return (
    <ComplianceLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href={`/projetos/${projectId}`}>
                <ArrowLeft className="h-4 w-4" />
                Voltar para Projeto
              </Link>
          </Button>
          <h1 className="text-3xl font-bold">Briefing - Análise de Gaps</h1>
          <p className="text-muted-foreground mt-1">
            {project.name}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Análise detalhada dos gaps de compliance identificados pela IA
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <span>Assessment</span>
              <span>→</span>
              <span className="font-medium text-primary">Briefing</span>
              <span>→</span>
              <span>Matriz de Riscos</span>
              <span>→</span>
              <span>Plano de Ação</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: "33%" }}></div>
          </div>
        </div>

        {/* Generating State */}
        {isGenerating && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-center justify-center">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <p className="text-muted-foreground">
                  Analisando respostas do assessment e gerando briefing com IA...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Briefing Content */}
        {briefing && (
          <>
            {/* Summary Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Resumo Executivo</CardTitle>
                <CardDescription>
                  Visão geral da situação atual de compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <Streamdown>{briefing.executiveSummary}</Streamdown>
                </div>
              </CardContent>
            </Card>

            {/* Gap Analysis */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Análise Detalhada de Gaps</CardTitle>
                <CardDescription>
                  Identificação de lacunas e áreas de melhoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <Streamdown>{briefing.gapAnalysis}</Streamdown>
                </div>
              </CardContent>
            </Card>

            {/* Risk Areas */}
            {briefing.riskAreas && (() => {
              try {
                const riskAreas = JSON.parse(briefing.riskAreas);
                return (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Áreas de Risco Identificadas</CardTitle>
                      <CardDescription>
                        Categorização por nível de prioridade
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {riskAreas.map((area: any, index: number) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-2 ${getRiskLevelColor(area.level)}`}
                        >
                          <div className="flex items-start gap-3">
                            {getRiskLevelIcon(area.level)}
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-1">{area.area}</h4>
                              <p className="text-sm text-muted-foreground">{area.description}</p>
                              {area.recommendations && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Recomendações:
                                  </p>
                                  <p className="text-xs text-muted-foreground">{area.recommendations}</p>
                                </div>
                              )}
                            </div>
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded ${
                                area.level === "alta"
                                  ? "bg-red-100 text-red-700"
                                  : area.level === "media"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {area.level === "alta"
                                ? "Prioridade Alta"
                                : area.level === "media"
                                ? "Prioridade Média"
                                : "Prioridade Baixa"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              } catch (e) {
                return null;
              }
            })()}

            {/* Recommendations */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Recomendações Gerais</CardTitle>
                <CardDescription>
                  Próximos passos sugeridos pela análise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <Streamdown>{briefing.recommendations}</Streamdown>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsGenerating(true);
                  generateBriefing.mutate({ projectId });
                }}
                disabled={generateBriefing.isPending}
              >
                {generateBriefing.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Regenerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Regenerar Briefing
                  </>
                )}
              </Button>
              <Button
                onClick={handleAdvance}
                disabled={advanceToRiskMatrix.isPending}
                className="flex-1"
              >
                {advanceToRiskMatrix.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Avançando...
                  </>
                ) : (
                  <>
                    Avançar para Matriz de Riscos
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Info */}
            <Card className="mt-6 bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong>Próximo passo:</strong> Com base nesta análise, você criará a Matriz de Riscos
                  identificando e categorizando os riscos específicos do seu projeto de compliance.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ComplianceLayout>
  );
}
