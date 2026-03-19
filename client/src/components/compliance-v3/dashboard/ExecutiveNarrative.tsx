import { useState } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  executiveSummary: string;
  topRisksNarrative: string;
  actionPlanNarrative: string;
  isLoading?: boolean;
};

export function ExecutiveNarrative({
  executiveSummary,
  topRisksNarrative,
  actionPlanNarrative,
  isLoading = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-3" />
        <div className="h-3 bg-muted rounded w-full mb-2" />
        <div className="h-3 bg-muted rounded w-5/6" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-blue-50/50">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-sm text-blue-900">Análise Executiva</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">IA</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted-foreground"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3 mr-1" /> Recolher</>
          ) : (
            <><ChevronDown className="w-3 h-3 mr-1" /> Expandir</>
          )}
        </Button>
      </div>

      <div className="p-5">
        <p className="text-sm leading-relaxed text-foreground">{executiveSummary}</p>
      </div>

      {expanded && (
        <div className="border-t divide-y">
          <div className="p-5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Análise dos Principais Riscos
            </h4>
            <p className="text-sm leading-relaxed text-foreground">{topRisksNarrative}</p>
          </div>
          <div className="p-5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Plano de Ação Recomendado
            </h4>
            <p className="text-sm leading-relaxed text-foreground">{actionPlanNarrative}</p>
          </div>
        </div>
      )}
    </div>
  );
}
