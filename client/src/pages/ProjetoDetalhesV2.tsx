import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  AlertTriangle,
  ListTodo,
  Play,
  ChevronRight,
  Building2,
  Calendar,
  Clock,
  RefreshCw,
  ExternalLink,
  BarChart3,
  Shield,
  Layers,
  Users,
  Edit3,
  Tag,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { DiagnosticoStepper, type DiagnosticLayerState } from "@/components/DiagnosticoStepper";
// fix(z22) Wave A.2+B: import CpieHistoryPanel removido (componente deletado).
import { PerfilEmpresaIntelligente, PERFIL_VAZIO } from "@/components/PerfilEmpresaIntelligente";

// Sprint Z-08 — flag de feature para o engine determinístico v4 (ADR-0022)
const useNewRiskEngine = true;
const riskRoute = (id: string | number) => useNewRiskEngine
  ? `/projetos/${id}/risk-dashboard-v4`
  : `/projetos/${id}/matrizes-v3`;

// ─── Helpers ────────────────────────────────────────────────────────────────

// Todos os status disponíveis para seleção no dropdown — v2.1 (ENUM limpo)
const ALL_STATUS_OPTIONS = [
  { value: "rascunho",                label: "Rascunho" },
  { value: "diagnostico_corporativo", label: "Diagnóstico Corporativo" },
  { value: "diagnostico_operacional", label: "Diagnóstico Operacional" },
  { value: "diagnostico_cnae",        label: "Diagnóstico CNAE" },
  { value: "matriz_riscos",           label: "Matrizes de Riscos" },
  { value: "plano_acao",              label: "Plano de Ação" },
  { value: "em_avaliacao",            label: "Em Avaliação" },
  { value: "aprovado",                label: "Aprovado" },
  { value: "em_andamento",            label: "Em Andamento" },
  { value: "concluido",               label: "Concluído" },
  { value: "arquivado",               label: "Arquivado" },
] as const;

// Status que clientes podem solicitar (apenas 'em_avaliacao')
const CLIENT_ALLOWED_TARGETS = ["em_avaliacao"] as const;

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  diagnostico_corporativo: "Diag. Corporativo",
  diagnostico_operacional: "Diag. Operacional",
  diagnostico_cnae: "Diag. CNAE",
  matriz_riscos: "Matrizes de Riscos",
  plano_acao: "Plano de Ação",
  em_avaliacao: "Em Avaliação",
  aprovado: "Aprovado",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-700 border-gray-200",
  diagnostico_corporativo: "bg-blue-100 text-blue-700 border-blue-200",
  diagnostico_operacional: "bg-blue-100 text-blue-700 border-blue-200",
  diagnostico_cnae: "bg-indigo-100 text-indigo-700 border-indigo-200",
  matriz_riscos: "bg-orange-100 text-orange-700 border-orange-200",
  plano_acao: "bg-purple-100 text-purple-700 border-purple-200",
  em_avaliacao: "bg-yellow-100 text-yellow-700 border-yellow-200",
  aprovado: "bg-green-100 text-green-700 border-green-200",
  em_andamento: "bg-emerald-100 text-emerald-700 border-emerald-200",
  concluido: "bg-teal-100 text-teal-700 border-teal-200",
  arquivado: "bg-gray-100 text-gray-500 border-gray-200",
};

// Mapeia status para etapa numérica (1-5) — v2.1
function statusToStep(status: string): number {
  const map: Record<string, number> = {
    // v2.1 — novos status
    rascunho:                1,
    consistencia_pendente:   1,
    cnaes_confirmados:       1,
    diagnostico_corporativo: 2,
    diagnostico_operacional: 2,
    diagnostico_cnae:        2,
    briefing:                3,
    riscos:                  4,
    plano:                   5,
    dashboard:               5,
    // legados v2.0
    assessment_fase1:        2,
    assessment_fase2:        2,
    matriz_riscos:           3,
    plano_acao:              4,
    em_avaliacao:            4,
    aprovado:                5,
    em_andamento:            5,
    parado:                  5,
    concluido:               5,
    arquivado:               5,
  };
  return map[status] ?? 1;
}

// ─── Etapas do fluxo ────────────────────────────────────────────────────────

interface FlowStep {
  number: number;
  label: string;
  description: string;
  icon: React.ReactNode;
  route: (id: number) => string;
  completedStatuses: string[];
  activeStatuses: string[];
}

const FLOW_STEPS: FlowStep[] = [
  {
    number: 1,
    label: "Projeto",
    description: "Informações gerais e CNAEs identificados",
    icon: <Building2 className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/formulario`,
    completedStatuses: ["diagnostico_corporativo", "diagnostico_operacional", "diagnostico_cnae", "matriz_riscos", "plano_acao", "em_avaliacao", "aprovado", "em_andamento", "concluido", "arquivado"],
    activeStatuses: ["rascunho"],
  },
  {
    number: 2,
    label: "Diagnóstico",
    description: "3 camadas: Corporativo, Operacional e CNAE",
    icon: <ClipboardList className="w-4 h-4" />,
    // v2.1: rota aponta para o DiagnosticoStepper (hub das 3 camadas)
    route: (id) => `/projetos/${id}/diagnostico-stepper`,
    completedStatuses: ["briefing", "riscos", "plano", "dashboard", "matriz_riscos", "plano_acao", "em_avaliacao", "aprovado", "em_andamento", "parado", "concluido", "arquivado"],
    activeStatuses: ["cnaes_confirmados", "diagnostico_corporativo", "diagnostico_operacional", "diagnostico_cnae"],
  },
  {
    number: 3,
    label: "Briefing",
    description: "Análise de compliance gerada por IA",
    icon: <FileText className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/briefing-v3`,
    completedStatuses: ["matriz_riscos", "plano_acao", "em_avaliacao", "aprovado", "em_andamento", "concluido", "arquivado"],
    activeStatuses: [],
  },
  {
    number: 4,
    label: "Riscos",
    description: "Matrizes de risco tributário",
    icon: <AlertTriangle className="w-4 h-4" />,
    route: (id) => riskRoute(id),
    completedStatuses: ["plano_acao", "em_avaliacao", "aprovado", "em_andamento", "concluido", "arquivado"],
    activeStatuses: ["matriz_riscos"],
  },
  {
    number: 5,
    label: "Plano de Ação",
    description: "Tarefas e responsáveis por área",
    icon: <ListTodo className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/planos-v4`,
    completedStatuses: ["arquivado"],
    activeStatuses: ["plano_acao", "em_avaliacao", "aprovado", "em_andamento", "concluido"],
  },
];

// ─── Componente principal ────────────────────────────────────────────────────

export default function ProjetoDetalhesV2() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const projectId = parseInt(params.id || "0", 10);

  const { data: summary, isLoading, error, refetch } = trpc.fluxoV3.getProjectSummary.useQuery(
    { projectId },
    { enabled: !!projectId && !isNaN(projectId) }
  );

  const { data: projectData } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId && !isNaN(projectId) }
  );
  const clientName = (projectData as any)?.clientName ?? (projectData as any)?.client?.companyName ?? null;

  // v2.1: buscar diagnosticStatus do backend
  const { data: diagnosticData, refetch: refetchDiagnostic } = trpc.diagnostic.getDiagnosticStatus.useQuery(
    { projectId },
    { enabled: !!projectId && !isNaN(projectId) }
  );

  const completeDiagnosticLayer = trpc.diagnostic.completeDiagnosticLayer.useMutation({
    onSuccess: () => {
      toast.success("Camada do diagnóstico atualizada!");
      refetch();
      refetchDiagnostic();
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar diagnóstico"),
  });

  const updateStatus = trpc.projects.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      refetch();
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  if (!projectId || isNaN(projectId)) {
    return (
      <ComplianceLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <p className="text-muted-foreground">ID de projeto inválido.</p>
          <Button variant="outline" onClick={() => setLocation("/projetos")}>
            Voltar para Projetos
          </Button>
        </div>
      </ComplianceLayout>
    );
  }

  if (isLoading) {
    return (
      <ComplianceLayout>
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </ComplianceLayout>
    );
  }

  if (error || !summary) {
    return (
      <ComplianceLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <p className="text-muted-foreground">Projeto não encontrado ou sem permissão de acesso.</p>
          <Button variant="outline" onClick={() => setLocation("/projetos")}>
            Voltar para Projetos
          </Button>
        </div>
      </ComplianceLayout>
    );
  }

  const currentStep = statusToStep(summary.status);
  const progressPct = summary.totalTasks > 0
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
    : 0;

  const isEquipe = user?.role === "equipe_solaris" || user?.role === "advogado_senior";

  // Opções de status disponíveis para o usuário atual
  const statusOptions = isEquipe
    ? ALL_STATUS_OPTIONS
    : ALL_STATUS_OPTIONS.filter(opt =>
        opt.value === summary.status ||
        (CLIENT_ALLOWED_TARGETS as readonly string[]).includes(opt.value)
      );

  // Determinar qual etapa está ativa para o botão principal
  const activeStep = FLOW_STEPS.find(s =>
    s.activeStatuses.includes(summary.status)
  ) ?? FLOW_STEPS.find(s => s.completedStatuses.includes(summary.status) && s.number === currentStep);

  // v2.1: estado do diagnóstico
  const diagnosticStatus: DiagnosticLayerState = (diagnosticData as any)?.diagnosticStatus ?? {
    corporate: "not_started",
    operational: "not_started",
    cnae: "not_started",
  };
  const diagnosticProgress = (diagnosticData as any)?.progress ?? 0;
  const readyForBriefing = (diagnosticData as any)?.isComplete ?? false;

  return (
    <ComplianceLayout>
      <TooltipProvider>
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/projetos")}
                className="mt-0.5 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">{summary.name}</h1>
                  {/* Dropdown de Situação do Projeto */}
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    <Select
                      value={summary.status}
                      onValueChange={(newStatus) => {
                        if (newStatus === summary.status) return;
                        updateStatus.mutate({
                          projectId,
                          status: newStatus as any,
                        });
                      }}
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger
                        className={`h-7 text-xs border font-medium gap-1.5 px-2.5 min-w-[160px] ${
                          STATUS_COLORS[summary.status] ?? "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            <span className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full inline-block ${
                                opt.value === "rascunho" ? "bg-gray-400" :
                                opt.value === "diagnostico_corporativo" || opt.value === "diagnostico_operacional" ? "bg-blue-500" :
                                opt.value === "diagnostico_cnae" ? "bg-indigo-500" :
                                opt.value === "matriz_riscos" ? "bg-orange-500" :
                                opt.value === "plano_acao" ? "bg-purple-500" :
                                opt.value === "em_avaliacao" ? "bg-yellow-500" :
                                opt.value === "aprovado" ? "bg-green-500" :
                                opt.value === "em_andamento" ? "bg-emerald-500" :
                                opt.value === "concluido" ? "bg-teal-500" :
                                "bg-gray-300"
                              }`} />
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {updateStatus.isPending && (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  {clientName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {clientName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Criado em {new Date(summary.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Atualizado {new Date(summary.updatedAt).toLocaleDateString("pt-BR")}
                  </span>

                </div>
              </div>
            </div>
          </div>

          {/* ── Stepper do Fluxo Principal ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Etapas do Projeto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 flex-wrap">
                {FLOW_STEPS.map((step, idx) => {
                  const isCompleted = step.completedStatuses.includes(summary.status);
                  const isActive = step.activeStatuses.includes(summary.status);
                  const isLocked = !isCompleted && !isActive && step.number > currentStep;
                  return (
                    <div key={step.number} className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => !isLocked && setLocation(step.route(projectId))}
                            disabled={isLocked}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all min-w-[60px] ${
                              isLocked
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-muted/50 cursor-pointer"
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                              isCompleted
                                ? "border-green-400 bg-green-500/10 text-green-600"
                                : isActive
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted bg-muted text-muted-foreground"
                            }`}>
                              {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                step.icon
                              )}
                            </div>
                            <span className={`text-xs font-medium text-center leading-tight ${
                              isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                            }`}>
                              {step.label}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{step.label}</p>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                          {isLocked && <p className="text-xs text-orange-500 mt-1">Etapa bloqueada</p>}
                        </TooltipContent>
                      </Tooltip>
                      {idx < FLOW_STEPS.length - 1 && (
                        <div className={`h-0.5 w-6 mx-1 shrink-0 rounded-full ${
                          currentStep > step.number ? "bg-green-400" : "bg-muted"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── DiagnosticoStepper v2.1 ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Diagnóstico Tributário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DiagnosticoStepper
                diagnosticStatus={diagnosticStatus}
                progress={diagnosticProgress}
                readyForBriefing={readyForBriefing}
                isLoading={completeDiagnosticLayer.isPending}
                projectStatus={summary.status}
                onStartOnda1={() => setLocation(`/projetos/${projectId}/questionario-solaris`)}
                onStartOnda2={() => setLocation(`/projetos/${projectId}/questionario-iagen`)}
                onStartLayer={(layer) => {
                  if (layer === "corporate") {
                    // Z-02 ADR-0010: Q.Produtos (NCM) substitui Questionário Corporativo
                    setLocation(`/projetos/${projectId}/questionario-produto`);
                  } else if (layer === "operational") {
                    // Z-02 ADR-0010: Q.Serviços (NBS) substitui Questionário Operacional
                    setLocation(`/projetos/${projectId}/questionario-servico`);
                  } else if (layer === "cnae") {
                    setLocation(`/projetos/${projectId}/questionario-cnae`);
                  }
                }}
                onGenerateBriefing={() => {
                  setLocation(`/projetos/${projectId}/briefing-v3`);
                }}
                onStartMatrizes={() => setLocation(riskRoute(projectId))}
                onStartPlano={() => setLocation(`/projetos/${projectId}/planos-v4`)}
              />
            </CardContent>
          </Card>

          {/* ── Métricas rápidas ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<Layers className="w-5 h-5 text-blue-600" />}
              label="CNAEs Analisados"
              value={summary.confirmedCnaes.length}
              color="blue"
              onClick={() => setLocation(`/projetos/${projectId}/questionario-v3`)}
            />
            <MetricCard
              icon={<Shield className="w-5 h-5 text-orange-600" />}
              label="Riscos Mapeados"
              value={summary.totalRisks}
              color="orange"
              onClick={() => summary.hasRiskMatrices ? setLocation(riskRoute(projectId)) : toast.info("Matrizes ainda não geradas")}
            />
            <MetricCard
              icon={<ListTodo className="w-5 h-5 text-purple-600" />}
              label="Tarefas Criadas"
              value={summary.totalTasks}
              color="purple"
              onClick={() => summary.hasActionPlan ? setLocation(`/projetos/${projectId}/planos-v4`) : toast.info("Plano ainda não gerado")}
            />
            <MetricCard
              icon={<BarChart3 className="w-5 h-5 text-green-600" />}
              label="Tarefas Concluídas"
              value={summary.completedTasks}
              color="green"
              subtitle={summary.totalTasks > 0 ? `${progressPct}% do plano` : undefined}
              onClick={() => summary.hasActionPlan ? setLocation(`/projetos/${projectId}/planos-v4`) : undefined}
            />
          </div>

          {/* ── Progresso do plano de ação ── */}
          {summary.totalTasks > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Progresso do Plano de Ação
                  </CardTitle>
                  <span className="text-sm font-semibold text-primary">{progressPct}%</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progressPct} className="h-2" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {summary.tasksByArea.map((area) => {
                    const pct = area.count > 0 ? Math.round((area.completed / area.count) * 100) : 0;
                    return (
                      <div key={area.area} className="bg-muted/40 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground capitalize">{area.area}</span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">{area.completed}/{area.count} tarefas</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── CNAEs confirmados ── */}
          {summary.confirmedCnaes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  CNAEs Identificados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.confirmedCnaes.map((cnae: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          {cnae.code}
                        </Badge>
                        <span className="text-sm text-foreground">{cnae.description}</span>
                      </div>
                      {cnae.confidence && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {cnae.confidence}% conf.
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Acesso rápido às seções ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-primary" />
                Acesso Rápido às Seções
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Sprint Z-22 — CPIE v3 Dashboard on-demand (#725) · fix(z22): movido para o topo (#733) */}
              <SectionLink
                icon={<BarChart3 className="w-4 h-4" />}
                label="Exposição a Riscos de Compliance"
                description="Score on-demand · 3 indicadores · calculado agora"
                available={true}
                onClick={() => setLocation(`/projetos/${projectId}/compliance-dashboard`)}
                testId="btn-ver-score-projeto"
              />
              <Separator />
              <SectionLink
                icon={<ClipboardList className="w-4 h-4" />}
                label="Diagnóstico Adaptativo"
                description={`${summary.totalAnswers} respostas registradas`}
                available={statusToStep(summary.status) >= 2}
                onClick={() => setLocation(`/projetos/${projectId}/questionario-v3`)}
              />
              <Separator />
              <SectionLink
                icon={<FileText className="w-4 h-4" />}
                label="Briefing de Compliance"
                description={summary.hasBriefing ? "Briefing gerado e disponível" : "Ainda não gerado"}
                available={summary.hasBriefing || statusToStep(summary.status) >= 3}
                onClick={() => setLocation(`/projetos/${projectId}/briefing-v3`)}
              />
              <Separator />
              <SectionLink
                icon={<AlertTriangle className="w-4 h-4" />}
                label="Matrizes de Riscos"
                description={summary.hasRiskMatrices ? `${summary.totalRisks} riscos mapeados` : "Ainda não geradas"}
                available={summary.hasRiskMatrices || statusToStep(summary.status) >= 4}
                onClick={() => setLocation(riskRoute(projectId))}
              />
              <Separator />
              <SectionLink
                icon={<ListTodo className="w-4 h-4" />}
                label="Plano de Ação"
                description={summary.hasActionPlan ? `${summary.totalTasks} tarefas em ${summary.tasksByArea.length} áreas` : "Ainda não gerado"}
                available={summary.hasActionPlan || statusToStep(summary.status) >= 5}
                onClick={() => setLocation(`/projetos/${projectId}/planos-v4`)}
              />
              <Separator />
              <SectionLink
                icon={<ExternalLink className="w-4 h-4" />}
                label="Compliance Engine v3 ✨"
                description="Dashboard de score, gaps, riscos, ações e tarefas atômicas"
                available={true}
                onClick={() => setLocation(`/projetos/${projectId}/compliance-v3`)}
              />
            </CardContent>
          </Card>

          {/* J1: CpieHistoryPanel removido no UAT Z-22 — substituído pelo ComplianceDashboard on-demand */}

          {/* ── M2 Componente D: Edição NCM/NBS ── */}
          <NcmNbsEditCardV2 projectId={projectId} />

          {/* ── Ações administrativas (equipe SOLARIS) ── */}
          {isEquipe && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  Ações Administrativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {summary.status !== "em_andamento" && summary.status !== "concluido" && summary.status !== "arquivado" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus.mutate({ projectId, status: "em_andamento" })}
                      disabled={updateStatus.isPending}
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      Marcar como Em Andamento
                    </Button>
                  )}
                  {summary.status === "em_andamento" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus.mutate({ projectId, status: "concluido" })}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Marcar como Concluído
                    </Button>
                  )}
                  {summary.status !== "arquivado" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => updateStatus.mutate({ projectId, status: "arquivado" })}
                      disabled={updateStatus.isPending}
                    >
                      Arquivar Projeto
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/projetos/${projectId}/planos-v4`)}
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    Editar Plano de Ação
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </TooltipProvider>
    </ComplianceLayout>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  color,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "orange" | "purple" | "green";
  subtitle?: string;
  onClick?: () => void;
}) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-100",
    orange: "bg-orange-50 border-orange-100",
    purple: "bg-purple-50 border-purple-100",
    green: "bg-green-50 border-green-100",
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] ${colorMap[color]} ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {subtitle && <div className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</div>}
    </button>
  );
}

function SectionLink({
  icon,
  label,
  description,
  available,
  onClick,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  available: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      data-testid={testId}
      onClick={available ? onClick : undefined}
      className={`w-full flex items-center justify-between py-2.5 px-1 rounded-lg transition-colors group ${
        available ? "hover:bg-muted/50 cursor-pointer" : "opacity-40 cursor-not-allowed"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}>
          {icon}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {available && (
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      )}
      {!available && (
        <Circle className="w-4 h-4 text-muted-foreground/40" />
      )}
    </button>
  );
}

/**
 * M2 Componente D: Card de edição NCM/NBS em ProjetoDetalhesV2.
 * Busca operationProfile via getProjectStep1 e renderiza PerfilEmpresaIntelligente
 * em mode='edit' com botão explícito "Salvar NCM/NBS".
 */
function NcmNbsEditCardV2({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: step1 } = trpc.fluxoV3.getProjectStep1.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const parseProfile = (raw: unknown) => {
    if (!raw) return { ...PERFIL_VAZIO };
    if (typeof raw === 'string') {
      try { return { ...PERFIL_VAZIO, ...JSON.parse(raw) }; } catch { return { ...PERFIL_VAZIO }; }
    }
    if (typeof raw === 'object') return { ...PERFIL_VAZIO, ...(raw as object) };
    return { ...PERFIL_VAZIO };
  };

  const [perfilLocal, setPerfilLocal] = useState(() =>
    parseProfile((step1 as any)?.operationProfile)
  );

  // Sincronizar quando os dados chegam do servidor
  const [initialized, setInitialized] = useState(false);
  if (step1 && !initialized) {
    setPerfilLocal(parseProfile((step1 as any)?.operationProfile));
    setInitialized(true);
  }

  const handleSave = () => {
    utils.fluxoV3.getProjectStep1.invalidate({ projectId });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
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
