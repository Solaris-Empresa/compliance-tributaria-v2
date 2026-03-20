/**
 * DiagnosticoStepper — v2.2
 * Orquestrador do novo fluxo de diagnóstico de compliance.
 *
 * FLUXO OBRIGATÓRIO:
 * 1. Projeto / Perfil da empresa
 * 2. Análise de Consistência (gate obrigatório)
 * 3. Descoberta de CNAEs
 * 4. Confirmação de CNAEs
 * 5. Diagnóstico: Corporativo → Operacional → CNAE
 * 6. Briefing
 * 7. Riscos
 * 8. Plano
 * 9. Dashboard
 *
 * Máquina de estados:
 * perfil → consistencia → cnaes_descoberta → cnaes_confirmacao →
 * diagnostico_corporativo → diagnostico_operacional → diagnostico_cnae →
 * briefing → riscos → plano → dashboard
 */

import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronRight,
  ShieldCheck,
  Building2,
  Search,
  ClipboardList,
  BarChart3,
  FileText,
  AlertTriangle,
  Target,
  LayoutDashboard,
  Loader2,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type DiagnosticoStep =
  | "perfil"
  | "consistencia"
  | "cnaes_descoberta"
  | "cnaes_confirmacao"
  | "diagnostico_corporativo"
  | "diagnostico_operacional"
  | "diagnostico_cnae"
  | "briefing"
  | "riscos"
  | "plano"
  | "dashboard";

type StepStatus = "pending" | "active" | "completed" | "locked" | "warning";

interface StepConfig {
  id: DiagnosticoStep;
  label: string;
  description: string;
  icon: React.ReactNode;
  route?: (projectId: number) => string;
  isGate?: boolean; // bloqueia próximas etapas se não concluído
}

// ─── Configuração das etapas ──────────────────────────────────────────────────

const STEPS: StepConfig[] = [
  {
    id: "perfil",
    label: "Perfil da Empresa",
    description: "Dados básicos e configuração do projeto",
    icon: <Building2 className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/formulario`,
  },
  {
    id: "consistencia",
    label: "Análise de Consistência",
    description: "Verificação de inconsistências no perfil (gate obrigatório)",
    icon: <ShieldCheck className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/consistencia`,
    isGate: true,
  },
  {
    id: "cnaes_descoberta",
    label: "Descoberta de CNAEs",
    description: "Identificação automática das atividades econômicas",
    icon: <Search className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/formulario`,
  },
  {
    id: "cnaes_confirmacao",
    label: "Confirmação de CNAEs",
    description: "Revisão e confirmação das atividades identificadas",
    icon: <CheckCircle2 className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/formulario`,
    isGate: true,
  },
  {
    id: "diagnostico_corporativo",
    label: "Diagnóstico Corporativo",
    description: "Questionário sobre estrutura e governança da empresa",
    icon: <ClipboardList className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/questionario-corporativo-v2`,
  },
  {
    id: "diagnostico_operacional",
    label: "Diagnóstico Operacional",
    description: "Questionário sobre operações e processos",
    icon: <BarChart3 className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/questionario-operacional`,
  },
  {
    id: "diagnostico_cnae",
    label: "Diagnóstico por CNAE",
    description: "Questionário específico para cada atividade econômica",
    icon: <Target className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/questionario-cnae`,
  },
  {
    id: "briefing",
    label: "Briefing",
    description: "Consolidação do diagnóstico em relatório executivo",
    icon: <FileText className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/briefing-v3`,
  },
  {
    id: "riscos",
    label: "Análise de Riscos",
    description: "Mapeamento e priorização dos riscos tributários",
    icon: <AlertTriangle className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/matrizes-v3`,
  },
  {
    id: "plano",
    label: "Plano de Ação",
    description: "Ações priorizadas para adequação tributária",
    icon: <ClipboardList className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/plano-v3`,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Visão consolidada do compliance tributário",
    icon: <LayoutDashboard className="w-4 h-4" />,
    route: (id) => `/projetos/${id}/compliance-v3`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<StepStatus, string> = {
  completed: "bg-green-50 border-green-200 text-green-900",
  active: "bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-200",
  pending: "bg-white border-gray-200 text-gray-700",
  locked: "bg-gray-50 border-gray-100 text-gray-400",
  warning: "bg-orange-50 border-orange-200 text-orange-900",
};

const STATUS_ICON: Record<StepStatus, React.ReactNode> = {
  completed: <CheckCircle2 className="w-5 h-5 text-green-600" />,
  active: <Circle className="w-5 h-5 text-blue-600 fill-blue-600" />,
  pending: <Circle className="w-5 h-5 text-gray-300" />,
  locked: <Lock className="w-5 h-5 text-gray-300" />,
  warning: <AlertTriangle className="w-5 h-5 text-orange-500" />,
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DiagnosticoStepper() {
  const [, params] = useRoute("/projetos/:id/diagnostico-stepper");
  const [, navigate] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : null;

  const [currentStep, setCurrentStep] = useState<DiagnosticoStep>("perfil");
  const [completedSteps, setCompletedSteps] = useState<Set<DiagnosticoStep>>(new Set());
  const [consistencyBlocked, setConsistencyBlocked] = useState(false);

  // Verificar gate de consistência
  const consistencyGateQuery = trpc.consistency.canProceed.useQuery(
    { projectId: projectId! },
    { enabled: projectId !== null }
  );

  useEffect(() => {
    if (consistencyGateQuery.data) {
      const { canProceed, reason } = consistencyGateQuery.data;
      setConsistencyBlocked(!canProceed && reason === "critical_unresolved");
    }
  }, [consistencyGateQuery.data]);

  const getStepStatus = (step: StepConfig): StepStatus => {
    if (completedSteps.has(step.id)) return "completed";
    if (step.id === currentStep) return "active";

    // Verificar se está bloqueado por gate anterior
    const stepIndex = STEPS.findIndex((s) => s.id === step.id);
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

    // Bloquear etapas após consistência se gate não passou
    if (consistencyBlocked) {
      const consistenciaIndex = STEPS.findIndex((s) => s.id === "consistencia");
      if (stepIndex > consistenciaIndex && !completedSteps.has("consistencia")) {
        return "locked";
      }
    }

    // Bloquear etapas futuras não alcançadas
    if (stepIndex > currentIndex && !completedSteps.has(step.id)) {
      return "locked";
    }

    return "pending";
  };

  const handleNavigateToStep = (step: StepConfig) => {
    const status = getStepStatus(step);
    if (status === "locked") return;
    if (!projectId || !step.route) return;
    navigate(step.route(projectId));
  };

  const handleMarkCompleted = (stepId: DiagnosticoStep) => {
    setCompletedSteps((prev) => { const next = new Set(prev); next.add(stepId); return next; });
    const stepIndex = STEPS.findIndex((s) => s.id === stepId);
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].id);
    }
  };

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Projeto não encontrado. Acesse via <code>/projetos/:id/diagnostico-stepper</code>.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = completedSteps.size;
  const totalSteps = STEPS.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Diagnóstico de Compliance Tributário
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Projeto #{projectId} — Fluxo v2.2 (Reforma Tributária)
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-700">{completedCount}/{totalSteps} etapas</div>
            <div className="text-2xl font-bold text-blue-600">{progressPct}%</div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Gate bloqueado */}
        {consistencyBlocked && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Gate bloqueado:</strong> Existem inconsistências críticas no perfil da empresa.
              Conclua a Análise de Consistência antes de prosseguir para o diagnóstico.
              {" "}
              <button
                className="underline font-medium"
                onClick={() => navigate(`/projetos/${projectId}/consistencia`)}
              >
                Ir para Análise de Consistência
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Etapas */}
        <div className="space-y-3">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step);
            const isLocked = status === "locked";

            return (
              <div
                key={step.id}
                className={`rounded-lg border p-4 transition-all ${STATUS_STYLES[status]} ${
                  !isLocked ? "cursor-pointer hover:shadow-sm" : "cursor-not-allowed opacity-60"
                }`}
                onClick={() => !isLocked && handleNavigateToStep(step)}
              >
                <div className="flex items-center gap-4">
                  {/* Número e ícone de status */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-gray-400 w-5 text-right">
                      {index + 1}
                    </span>
                    {STATUS_ICON[status]}
                  </div>

                  {/* Ícone da etapa */}
                  <div className={`shrink-0 ${isLocked ? "opacity-40" : ""}`}>
                    {step.icon}
                  </div>

                  {/* Texto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{step.label}</span>
                      {step.isGate && (
                        <Badge variant="outline" className="text-xs">Gate</Badge>
                      )}
                      {status === "active" && (
                        <Badge className="text-xs bg-blue-600">Em andamento</Badge>
                      )}
                      {status === "completed" && (
                        <Badge variant="outline" className="text-xs text-green-700 border-green-300">Concluído</Badge>
                      )}
                    </div>
                    <p className="text-xs opacity-70 mt-0.5">{step.description}</p>
                  </div>

                  {/* Ação */}
                  {!isLocked && (
                    <div className="shrink-0">
                      {status === "completed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToStep(step);
                          }}
                        >
                          Revisar
                        </Button>
                      ) : status === "active" ? (
                        <Button
                          size="sm"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToStep(step);
                          }}
                        >
                          Continuar
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ação rápida — etapa atual */}
        {currentStep && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-medium text-blue-800">Próxima etapa:</p>
                  <p className="font-bold text-blue-900">
                    {STEPS.find((s) => s.id === currentStep)?.label}
                  </p>
                </div>
                <div className="flex gap-2">
                  {consistencyGateQuery.isLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  )}
                  <Button
                    className="bg-blue-700 hover:bg-blue-800"
                    disabled={consistencyBlocked && currentStep !== "consistencia"}
                    onClick={() => {
                      const step = STEPS.find((s) => s.id === currentStep);
                      if (step) handleNavigateToStep(step);
                    }}
                  >
                    Iniciar etapa
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo de progresso */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Concluídas</div>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Pendentes</div>
              <div className="text-2xl font-bold text-gray-700">{totalSteps - completedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Progresso</div>
              <div className="text-2xl font-bold text-blue-600">{progressPct}%</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
