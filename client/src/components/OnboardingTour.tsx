/**
 * V69 — Onboarding Guiado para Advogados
 *
 * Tour interativo step-by-step com:
 * - Overlay escuro com spotlight no elemento alvo
 * - Tooltip posicionado dinamicamente
 * - Barra de progresso (X/6 etapas)
 * - Botões: Próximo / Pular / Encerrar Tour
 * - Persistência via tRPC (onboarding.markStep / skip)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, ChevronRight, SkipForward, BookOpen } from "lucide-react";
import { useLocation } from "wouter";

// ─── Definição dos passos do tour ────────────────────────────────────────────

export interface TourStep {
  id: number;
  title: string;
  description: string;
  targetSelector: string | null; // CSS selector do elemento a destacar (null = centro da tela)
  route: string;                 // Rota onde este passo deve ser exibido
  position: "top" | "bottom" | "left" | "right" | "center";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 0,
    title: "Bem-vindo ao IA SOLARIS",
    description:
      "Esta é a sua central de compliance tributário. Aqui você acompanha todos os projetos de assessment, matrizes de riscos e planos de ação para a Reforma Tributária. Vamos fazer um tour rápido para você se familiarizar com a plataforma.",
    targetSelector: null,
    route: "/",
    position: "center",
  },
  {
    id: 1,
    title: "Painel de Projetos",
    description:
      "O painel exibe o resumo de todos os projetos: total, em andamento, em avaliação e aprovados. Clique em '+ Novo Projeto' para iniciar um assessment de compliance para um cliente.",
    targetSelector: "[data-tour='novo-projeto']",
    route: "/",
    position: "bottom",
  },
  {
    id: 2,
    title: "Extração de CNAEs por IA",
    description:
      "Ao criar um projeto, a IA extrai automaticamente os CNAEs relevantes a partir da descrição da atividade empresarial. Você pode refinar os CNAEs antes de prosseguir para o questionário.",
    targetSelector: "[data-tour='cnae-section']",
    route: "/",
    position: "center",
  },
  {
    id: 3,
    title: "Questionário Adaptativo",
    description:
      "O questionário é gerado pela IA com base nos CNAEs do cliente. Cada resposta alimenta o briefing de compliance. O progresso é salvo automaticamente — você pode retomar a qualquer momento.",
    targetSelector: "[data-tour='questionnaire-progress']",
    route: "/",
    position: "center",
  },
  {
    id: 4,
    title: "Briefing e Matrizes de Riscos",
    description:
      "Após o questionário, a IA gera um briefing executivo e 4 matrizes de riscos (Probabilidade × Impacto, Urgência, Financeiro e Operacional). Alertas de inconsistência são destacados automaticamente.",
    targetSelector: "[data-tour='briefing-section']",
    route: "/",
    position: "center",
  },
  {
    id: 5,
    title: "Plano de Ação e Decisão",
    description:
      "O plano de ação lista as tarefas priorizadas por risco. A IA gera uma 'Decisão Recomendada' com ação principal, prazo e risco se não executado. Após aprovação, o projeto fica disponível para execução pela equipe.",
    targetSelector: "[data-tour='action-plan']",
    route: "/",
    position: "center",
  },
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TooltipPosition {
  top: number;
  left: number;
  arrowSide: "top" | "bottom" | "left" | "right" | "none";
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface OnboardingTourProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [, navigate] = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({ top: 0, left: 0, arrowSide: "none" });
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const markStep = trpc.onboarding.markStep.useMutation();
  const skipMutation = trpc.onboarding.skip.useMutation();

  const currentStep = TOUR_STEPS[currentStepIndex];
  const totalSteps = TOUR_STEPS.length;
  const progressPercent = ((currentStepIndex) / (totalSteps - 1)) * 100;

  // Calcular posição do tooltip relativo ao elemento alvo
  const calculatePosition = useCallback(() => {
    if (!currentStep.targetSelector) {
      // Centralizado na tela
      setSpotlightRect(null);
      setTooltipPos({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 200,
        arrowSide: "none",
      });
      return;
    }

    const target = document.querySelector(currentStep.targetSelector);
    if (!target) {
      setSpotlightRect(null);
      setTooltipPos({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 200,
        arrowSide: "none",
      });
      return;
    }

    const rect = target.getBoundingClientRect();
    const padding = 12;

    setSpotlightRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    const tooltipWidth = 400;
    const tooltipHeight = 200;
    let top = 0;
    let left = 0;
    let arrowSide: TooltipPosition["arrowSide"] = "none";

    switch (currentStep.position) {
      case "bottom":
        top = rect.bottom + padding + 8;
        left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16));
        arrowSide = "top";
        break;
      case "top":
        top = rect.top - tooltipHeight - padding - 8;
        left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16));
        arrowSide = "bottom";
        break;
      case "right":
        top = Math.max(16, rect.top + rect.height / 2 - tooltipHeight / 2);
        left = rect.right + padding + 8;
        arrowSide = "left";
        break;
      case "left":
        top = Math.max(16, rect.top + rect.height / 2 - tooltipHeight / 2);
        left = rect.left - tooltipWidth - padding - 8;
        arrowSide = "right";
        break;
      default:
        top = window.innerHeight / 2 - tooltipHeight / 2;
        left = window.innerWidth / 2 - tooltipWidth / 2;
        arrowSide = "none";
    }

    // Garantir que o tooltip não saia da tela
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    setTooltipPos({ top, left, arrowSide });
  }, [currentStep]);

  useEffect(() => {
    // Pequeno delay para garantir que o DOM está renderizado
    const timer = setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [calculatePosition, currentStepIndex]);

  useEffect(() => {
    window.addEventListener("resize", calculatePosition);
    return () => window.removeEventListener("resize", calculatePosition);
  }, [calculatePosition]);

  const handleNext = async () => {
    try {
      await markStep.mutateAsync({ step: currentStepIndex });
    } catch {
      // Continua mesmo se falhar
    }

    if (currentStepIndex < totalSteps - 1) {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
      }, 200);
    } else {
      // Tour concluído
      setIsVisible(false);
      onComplete?.();
    }
  };

  const handleSkip = async () => {
    try {
      await skipMutation.mutateAsync();
    } catch {
      // Continua mesmo se falhar
    }
    setIsVisible(false);
    onSkip?.();
  };

  if (!isVisible && currentStepIndex === 0) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-modal="true"
      role="dialog"
      aria-label={`Tour de onboarding — passo ${currentStepIndex + 1} de ${totalSteps}`}
    >
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

      {/* Spotlight (recorte no overlay para destacar o elemento) */}
      {spotlightRect && (
        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-0 transition-all duration-300"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            background: "transparent",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-card border border-border rounded-xl shadow-2xl w-[400px] transition-all duration-200"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <Badge variant="outline" className="text-xs mb-1">
                Passo {currentStepIndex + 1} de {totalSteps}
              </Badge>
              <h3 className="font-semibold text-sm leading-tight text-foreground">
                {currentStep.title}
              </h3>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
            title="Fechar tour"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Barra de progresso */}
        <div className="px-4 pb-2">
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Descrição */}
        <div className="px-4 pb-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between px-4 pb-4 pt-0 border-t border-border/50 mt-0 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground text-xs"
            onClick={handleSkip}
          >
            <SkipForward className="h-3 w-3 mr-1" />
            Pular tour
          </Button>

          <Button
            size="sm"
            onClick={handleNext}
            disabled={markStep.isPending}
            className="gap-1"
          >
            {currentStepIndex < totalSteps - 1 ? (
              <>
                Próximo
                <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              "Concluir Tour"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Hook para controle do tour ───────────────────────────────────────────────

export function useOnboardingTour() {
  const { data: status, isLoading, refetch } = trpc.onboarding.getStatus.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const resetMutation = trpc.onboarding.reset.useMutation({
    onSuccess: () => refetch(),
  });

  const shouldShowTour =
    !isLoading &&
    status !== undefined &&
    !status.skipped &&
    !status.completed &&
    status.isNew === true;

  const canResumeTour =
    !isLoading &&
    status !== undefined &&
    !status.skipped &&
    !status.completed &&
    status.isNew === false &&
    status.completedSteps.length > 0;

  return {
    status,
    isLoading,
    shouldShowTour,
    canResumeTour,
    refetch,
    resetTour: () => resetMutation.mutate(),
  };
}
