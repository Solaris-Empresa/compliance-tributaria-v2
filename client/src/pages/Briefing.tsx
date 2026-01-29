import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { Streamdown } from "streamdown";

export default function Briefing() {
  const [, params] = useRoute("/projetos/:id/briefing");
  const [, setLocation] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : 0;

  const { data: briefing, isLoading } = trpc.briefing.get.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const generateBriefingMutation = trpc.briefing.generate.useMutation({
    onSuccess: () => {
      toast.success("Briefing gerado com sucesso!");
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar briefing: ${error.message}`);
      setIsGenerating(false);
    },
  });

  useEffect(() => {
    // Generate briefing if it doesn't exist yet
    if (!isLoading && !briefing && projectId > 0 && !isGenerating) {
      setIsGenerating(true);
      generateBriefingMutation.mutate({ projectId });
    }
  }, [isLoading, briefing, projectId]);

  const handleGenerateActionPlan = () => {
    setLocation(`/projetos/${projectId}/plano`);
  };

  const getRiskBadge = (level: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: any }> = {
      low: { label: "Baixo", variant: "secondary", icon: CheckCircle2 },
      medium: { label: "Médio", variant: "default", icon: AlertCircle },
      high: { label: "Alto", variant: "destructive", icon: AlertTriangle },
      critical: { label: "Crítico", variant: "destructive", icon: AlertTriangle },
    };
    const item = config[level] || config.medium;
    const Icon = item.icon;
    return (
      <Badge variant={item.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {item.label}
      </Badge>
    );
  };

  if (isLoading || isGenerating) {
    return (
      <ComplianceLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isGenerating ? "Gerando briefing..." : "Carregando briefing..."}
            </h3>
            <p className="text-muted-foreground">
              {isGenerating
                ? "Nossa IA está analisando as respostas e identificando gaps de compliance"
                : "Aguarde um momento"}
            </p>
          </div>
        </div>
      </ComplianceLayout>
    );
  }

  if (!briefing) {
    return (
      <ComplianceLayout>
        <div className="p-8">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Briefing não encontrado. Complete o assessment primeiro.
              </p>
              <Button asChild>
                <Link href={`/projetos/${projectId}/assessment/fase1`}>
                  <a>Ir para Assessment</a>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </ComplianceLayout>
    );
  }

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
              <h1 className="text-3xl font-bold text-foreground mb-2">Briefing de Compliance</h1>
              <p className="text-muted-foreground">
                Análise automática de gaps e recomendações para adequação à reforma tributária
              </p>
            </div>
            {briefing.riskLevel && getRiskBadge(briefing.riskLevel)}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo Executivo</CardTitle>
              <CardDescription>
                Gerado em {new Date(briefing.generatedAt).toLocaleDateString("pt-BR", {
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
                <Streamdown>{briefing.summaryText}</Streamdown>
              </div>
            </CardContent>
          </Card>

          {/* Gap Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Análise de Gaps</CardTitle>
              <CardDescription>Lacunas identificadas na conformidade tributária</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <Streamdown>{briefing.gapsAnalysis}</Streamdown>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {briefing.priorityAreas && (
            <Card>
              <CardHeader>
                <CardTitle>Recomendações</CardTitle>
                <CardDescription>Áreas prioritárias para adequação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <Streamdown>{briefing.priorityAreas}</Streamdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Próximo Passo</h3>
                  <p className="text-sm text-muted-foreground">
                    Gerar o plano de ação detalhado com base nesta análise
                  </p>
                </div>
                <Button onClick={handleGenerateActionPlan} className="flex items-center gap-2">
                  Gerar Plano de Ação
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ComplianceLayout>
  );
}
