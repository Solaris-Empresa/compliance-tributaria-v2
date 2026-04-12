/**
 * FormularioProjeto — Consulta dos dados do formulário do projeto (Etapa 1)
 *
 * Exibe em modo leitura os dados preenchidos na criação do projeto:
 * nome, cliente, CNPJ, descrição, CNAEs confirmados e faturamento anual.
 * Acessível pelo chip "Projeto" no FlowStepper de qualquer etapa do fluxo V3.
 */
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

import { PerfilEmpresaIntelligente, PERFIL_VAZIO } from "@/components/PerfilEmpresaIntelligente";
import ComplianceLayout from "@/components/ComplianceLayout";
import FlowStepper from "@/components/FlowStepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  FileText,
  Tag,
  DollarSign,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Formata faturamento anual em reais
function formatFaturamento(value: number | null | undefined): string {
  if (!value) return "Não informado";
  if (value >= 1_000_000_000) return `R$ ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

export default function FormularioProjeto() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = Number(params.id);

  const { data: project, isLoading, error } = trpc.fluxoV3.getProjectStep1.useQuery(
    { projectId },
    { enabled: !!projectId && !isNaN(projectId) }
  );

  const confirmedCnaes = (project?.confirmedCnaes as Array<{
    code: string;
    description: string;
    confidence?: number;
  }> | null) ?? [];

  // Determinar a próxima etapa para o botão CTA
  const nextStepRoute = (() => {
    if (!project) return null;
    const step = project.currentStep ?? 1;
    if (step <= 1) return `/projetos/${projectId}/questionario-v3`;
    if (step <= 2) return `/projetos/${projectId}/questionario-v3`;
    if (step <= 3) return `/projetos/${projectId}/briefing-v3`;
    if (step <= 4) return `/projetos/${projectId}/risk-dashboard-v4`;
    return `/projetos/${projectId}/plano-v3`;
  })();

  const nextStepLabel = (() => {
    if (!project) return "Continuar";
    const step = project.currentStep ?? 1;
    if (step <= 2) return "Ir para Questionário";
    if (step <= 3) return "Ir para Briefing";
    if (step <= 4) return "Ir para Matrizes de Riscos";
    return "Ir para Plano de Ação";
  })();

  return (
    <ComplianceLayout>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Header com navegação */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setLocation(`/projetos/${projectId}`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Projeto
          </button>
          {project && (
            <FlowStepper
              currentStep={1}
              projectId={projectId}
              completedUpTo={(Math.max(1, (project.currentStep ?? 1) - 1)) as any}
            />
          )}
        </div>

        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isLoading ? "Carregando..." : project?.name ?? "Projeto"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Etapa 1 de 5 — Formulário do Projeto
          </p>
        </div>

        {/* Estado de carregamento */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Erro */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">
                Não foi possível carregar os dados do projeto. Tente novamente.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Conteúdo */}
        {project && (
          <div className="space-y-4">
            {/* Card: Dados do Projeto */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Dados do Projeto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nome */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Nome do Projeto
                  </p>
                  <p className="text-sm font-semibold">{project.name}</p>
                </div>

                <Separator />

                {/* Descrição */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Descrição do Negócio
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {project.description || (
                      <span className="text-muted-foreground italic">Não informada</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card: Dados do Cliente */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Razão Social
                  </p>
                  <p className="text-sm font-semibold">
                    {project.clientName || (
                      <span className="text-muted-foreground italic">Não informado</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    CNPJ
                  </p>
                  <p className="text-sm font-mono">
                    {project.clientCnpj || (
                      <span className="text-muted-foreground italic font-sans">Não informado</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card: Faturamento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Faturamento Anual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold">
                  {formatFaturamento(project.faturamentoAnual)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Utilizado para calcular o impacto financeiro dos riscos de compliance.
                </p>
              </CardContent>
            </Card>

            {/* Card: CNAEs Confirmados */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  CNAEs Confirmados
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {confirmedCnaes.length} CNAE{confirmedCnaes.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {confirmedCnaes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum CNAE confirmado ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {confirmedCnaes.map((cnae) => (
                      <div
                        key={cnae.code}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-primary">
                              {cnae.code}
                            </span>
                            {cnae.confidence != null && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${
                                  cnae.confidence >= 80
                                    ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                                    : cnae.confidence >= 60
                                    ? "border-amber-300 text-amber-700 bg-amber-50"
                                    : "border-red-300 text-red-700 bg-red-50"
                                }`}
                              >
                                {cnae.confidence}% relevância
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 mt-0.5 leading-snug">
                            {cnae.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card: Edição NCM/NBS — M2 Componente D */}
            <NcmNbsEditCard projectId={projectId} operationProfile={(project as any).operationProfile} />

            {/* CTA — Continuar para a próxima etapa */}
            {nextStepRoute && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setLocation(nextStepRoute)}
                  className="gap-2"
                >
                  {nextStepLabel}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </ComplianceLayout>
  );
}

/**
 * M2 Componente D: Card de edição NCM/NBS no FormularioProjeto.
 * Renderiza PerfilEmpresaIntelligente em mode='edit' com botão explícito.
 */
function NcmNbsEditCard({ projectId, operationProfile }: {
  projectId: number;
  operationProfile: unknown;
}) {
  const utils = trpc.useUtils();

  // Derivar valor inicial do operationProfile persistido
  const parseProfile = (raw: unknown) => {
    if (!raw) return { ...PERFIL_VAZIO };
    if (typeof raw === 'string') {
      try { return { ...PERFIL_VAZIO, ...JSON.parse(raw) }; } catch { return { ...PERFIL_VAZIO }; }
    }
    if (typeof raw === 'object') return { ...PERFIL_VAZIO, ...(raw as object) };
    return { ...PERFIL_VAZIO };
  };

  const [perfilLocal, setPerfilLocal] = useState(() => parseProfile(operationProfile));

  const handleSave = () => {
    // Invalidar query para refletir os dados atualizados
    utils.fluxoV3.getProjectStep1.invalidate({ projectId });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          Produtos e Serviços (NCM/NBS)
          <Badge variant="outline" className="ml-auto text-xs">Editável</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PerfilEmpresaIntelligente
          value={perfilLocal}
          onChange={setPerfilLocal}
          mode="edit"
          projectId={projectId}
          showScorePanel={false}
          onSave={handleSave}
        />
      </CardContent>
    </Card>
  );
}
