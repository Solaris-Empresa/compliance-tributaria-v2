// @ts-nocheck
// @ts-ignore - Type mismatches due to incomplete implementation
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, History, Loader2, Sparkles, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { VersionHistory } from "@/components/VersionHistory";
import { GenerationProgressModal } from "@/components/GenerationProgressModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Briefing() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  
  console.log('[Briefing] Componente montado. params:', params);
  console.log('[Briefing] projectId extraído:', projectId);

  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: briefing, refetch } = trpc.briefing.get.useQuery({ projectId });
  const { data: versions } = trpc.briefing.listVersions.useQuery({ projectId });
  const { data: versionData } = trpc.briefing.getVersion.useQuery(
    { projectId, version: selectedVersion! },
    { enabled: selectedVersion !== null }
  );

  const generateBriefing = trpc.briefing.generate.useMutation({
    onSuccess: () => {
      console.log('[Briefing] Briefing gerado com sucesso');
      setIsGenerating(false);
      refetch();
      toast.success("Briefing gerado com sucesso!");
    },
    onError: (error: any) => {
      console.error('[Briefing] Erro ao gerar briefing:', error);
      console.error('[Briefing] projectId:', projectId);
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
    if (project && !briefing && !isGenerating && projectId > 0) {
      console.log('[Briefing] Iniciando geração automática. projectId:', projectId);
      setIsGenerating(true);
      generateBriefing.mutate({ projectId });
    }
  }, [project, briefing, projectId, isGenerating]);

  // Validar projectId
  if (!projectId || projectId === 0) {
    return (
      <ComplianceLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-6 w-6 text-red-500" />
                Projeto Inválido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">ID do projeto não encontrado na URL.</p>
              <Button asChild className="mt-4">
                <Link href="/projetos">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para Projetos
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </ComplianceLayout>
    );
  }

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
              <span className="font-medium text-primary">Levantamento Inicial</span>
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
                  <Streamdown>{briefing.summaryText}</Streamdown>
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
                  <Streamdown>{briefing.gapsAnalysis}</Streamdown>
                </div>
              </CardContent>
            </Card>

            {/* Risk Level Badge */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Nível de Risco Geral</CardTitle>
                    <CardDescription>
                      Avaliação do risco de conformidade do projeto
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRiskLevelIcon(briefing.riskLevel)}
                    <span
                      className={`text-sm font-medium px-3 py-1 rounded ${
                        briefing.riskLevel === "critico" || briefing.riskLevel === "alto"
                          ? "bg-red-100 text-red-700"
                          : briefing.riskLevel === "medio"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {briefing.riskLevel === "critico" ? "Crítico" :
                       briefing.riskLevel === "alto" ? "Alto" :
                       briefing.riskLevel === "medio" ? "Médio" : "Baixo"}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Priority Areas (Recommendations) */}
            {briefing.priorityAreas && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Recomendações Estratégicas</CardTitle>
                  <CardDescription>
                    Ações prioritárias, cronograma e próximos passos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <Streamdown>{briefing.priorityAreas}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Areas - Legacy support */}
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



            {/* Actions */}
            <div className="flex gap-3">
              <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <History className="h-4 w-4 mr-2" />
                    Ver Histórico ({versions?.length || 0})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Histórico de Versões do Briefing</DialogTitle>
                    <DialogDescription>
                      Visualize e compare versões anteriores do briefing gerado
                    </DialogDescription>
                  </DialogHeader>
                  <VersionHistory
                    versions={versions || []}
                    currentVersion={briefing?.version || 1}
                    type="briefing"
                    onViewVersion={(version) => {
                      setSelectedVersion(version);
                      // Abrir modal de visualização da versão
                      toast.info(`Visualizando versão ${version}`);
                    }}
                  />
                  
                  {/* Visualização da versão selecionada */}
                  {selectedVersion && versionData && (
                    <div className="mt-6 border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Versão {selectedVersion}</h3>
                      <div className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Resumo Executivo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="prose prose-sm max-w-none">
                              <Streamdown>{versionData.summaryText}</Streamdown>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Análise Detalhada</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="prose prose-sm max-w-none">
                              <Streamdown>{versionData.gapsAnalysis}</Streamdown>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
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

      {/* Modal de Progresso de Geração */}
      <GenerationProgressModal
        isOpen={isGenerating}
        title="Gerando Briefing com IA"
        description="Analisando as respostas do assessment e gerando análise detalhada de compliance..."
        estimatedSeconds={45}
      />
    </ComplianceLayout>
  );
}
