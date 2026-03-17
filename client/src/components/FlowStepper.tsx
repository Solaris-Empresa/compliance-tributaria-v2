/**
 * FlowStepper — Componente de progresso do fluxo v3
 *
 * Exibe as 5 etapas do fluxo de compliance com navegação clicável
 * para etapas já concluídas. Projetado para advogados e contadores
 * sênior: labels sempre visíveis, estado atual destacado, etapas
 * futuras claramente bloqueadas.
 */
import { useLocation } from "wouter";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type FlowStep = 1 | 2 | 3 | 4 | 5;

interface FlowStepperProps {
  currentStep: FlowStep;
  projectId: number;
  /** Número da última etapa concluída (inclusive). Default: currentStep - 1 */
  completedUpTo?: FlowStep;
  className?: string;
}

const STEPS: { label: string; shortLabel: string; route: (id: number) => string }[] = [
  { label: "Projeto",       shortLabel: "Projeto",     route: (id) => `/projetos/${id}` },
  { label: "Questionário",  shortLabel: "Quest.",      route: (id) => `/projetos/${id}/questionario-v3` },
  { label: "Briefing",      shortLabel: "Briefing",    route: (id) => `/projetos/${id}/briefing-v3` },
  { label: "Riscos",        shortLabel: "Riscos",      route: (id) => `/projetos/${id}/matrizes-v3` },
  { label: "Plano de Ação", shortLabel: "Plano",       route: (id) => `/projetos/${id}/plano-v3` },
];

export default function FlowStepper({
  currentStep,
  projectId,
  completedUpTo,
  className,
}: FlowStepperProps) {
  const [, setLocation] = useLocation();
  const completed = completedUpTo ?? ((currentStep - 1) as FlowStep);

  return (
    <nav
      aria-label="Progresso do fluxo"
      className={cn(
        "flex items-center gap-1 overflow-x-auto pb-1 select-none",
        className
      )}
    >
      {STEPS.map((step, i) => {
        const stepNum = (i + 1) as FlowStep;
        const isDone = stepNum < currentStep || stepNum <= completed;
        const isActive = stepNum === currentStep;
        const isLocked = stepNum > currentStep && stepNum > completed + 1;
        const isClickable = isDone && stepNum !== currentStep;

        return (
          <div key={step.label} className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={isLocked}
              onClick={() => isClickable && setLocation(step.route(projectId))}
              title={
                isLocked
                  ? `${step.label} — ainda não disponível`
                  : isClickable
                  ? `Ir para ${step.label}`
                  : step.label
              }
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all",
                isActive && "bg-primary text-primary-foreground shadow-sm",
                isDone && !isActive &&
                  "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer",
                isLocked && "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              )}
            >
              {/* Indicador de estado */}
              <span
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  isActive && "bg-white/20",
                  isDone && !isActive && "bg-emerald-500/20",
                  isLocked && "bg-muted-foreground/20"
                )}
              >
                {isDone && !isActive ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                ) : (
                  <span>{stepNum}</span>
                )}
              </span>
              {/* Label — sempre visível em desktop, abreviado em mobile */}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.shortLabel}</span>
            </button>
            {i < 4 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
