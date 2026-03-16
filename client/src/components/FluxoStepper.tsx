/**
 * FluxoStepper.tsx — Stepper visual do Fluxo v2.0
 * Exibe o progresso do usuário nas 6 etapas do diagnóstico
 */
import { CheckCircle2, ChevronRight } from "lucide-react";

export type FluxoStep =
  | "modo-uso"
  | "briefing"
  | "questionario"
  | "plano-acao"
  | "matriz-riscos"
  | "consolidacao";

const STEPS: { id: FluxoStep; label: string; short: string }[] = [
  { id: "modo-uso",      label: "Início",          short: "1" },
  { id: "briefing",      label: "Briefing",         short: "2" },
  { id: "questionario",  label: "Questionário",     short: "3" },
  { id: "plano-acao",    label: "Plano de Ação",    short: "4" },
  { id: "matriz-riscos", label: "Matriz de Riscos", short: "5" },
  { id: "consolidacao",  label: "Consolidação",     short: "6" },
];

interface FluxoStepperProps {
  current: FluxoStep;
  className?: string;
}

export function FluxoStepper({ current, className = "" }: FluxoStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {STEPS.map((step, i) => {
        const isDone    = i < currentIndex;
        const isActive  = i === currentIndex;
        const isPending = i > currentIndex;

        return (
          <div key={step.id} className="flex items-center gap-1">
            {/* Step pill */}
            <div
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                isActive
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/40 font-medium"
                  : isDone
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "text-slate-600 border-slate-800 bg-transparent"
              }`}
            >
              {/* Step number / check */}
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isActive
                    ? "bg-blue-500 text-white"
                    : isDone
                    ? "bg-green-500 text-white"
                    : "bg-slate-800 text-slate-600"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : step.short}
              </span>

              {/* Label — hide on very small screens except active */}
              <span className={isActive ? "inline" : "hidden sm:inline"}>
                {step.label}
              </span>
            </div>

            {/* Separator */}
            {i < STEPS.length - 1 && (
              <ChevronRight
                className={`w-3 h-3 shrink-0 ${
                  i < currentIndex ? "text-green-600" : "text-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
