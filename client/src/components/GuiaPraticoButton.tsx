/**
 * GuiaPraticoButton — FEAT-GUIA-PRÁTICO (F-01 · ADR-GP-001)
 *
 * Pill gradiente (indigo) com ícone Sparkles. Abre o GuiaPraticoModal para uma
 * tarefa do plano de ação. Botão puramente visual — sem lógica de geração
 * (essa vive no modal). Aparece só em tarefa NÃO bloqueada (controle no caller).
 */
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuiaPraticoButtonProps {
  onClick: () => void;
  className?: string;
}

export function GuiaPraticoButton({ onClick, className }: GuiaPraticoButtonProps) {
  return (
    <button
      type="button"
      data-testid="guia-pratico-button"
      onClick={onClick}
      title="Gerar guia prático desta tarefa"
      className={cn(
        "inline-flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
        "bg-gradient-to-r from-indigo-500 to-violet-500 text-white",
        "hover:from-indigo-600 hover:to-violet-600 transition-colors shadow-sm",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      Guia Prático
    </button>
  );
}
