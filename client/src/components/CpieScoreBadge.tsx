/**
 * CpieScoreBadge — Componente reutilizável para exibir o Score CPIE B8
 * Exibe o score 0–100 com cor e label de maturidade.
 */
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CpieScoreBadgeProps {
  projectId: number;
  /** Tamanho do badge: sm (inline em listas), md (padrão), lg (destaque) */
  size?: "sm" | "md" | "lg";
  /** Mostrar breakdown ao passar o mouse */
  showTooltip?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: "text-xs px-1.5 py-0.5 rounded",
  md: "text-sm px-2 py-1 rounded-md",
  lg: "text-base px-3 py-1.5 rounded-lg font-semibold",
};

export function CpieScoreBadge({
  projectId,
  size = "md",
  showTooltip = true,
  className,
}: CpieScoreBadgeProps) {
  const { data, isLoading, error } = trpc.scoringEngine.getScore.useQuery(
    { projectId },
    { enabled: !!projectId, staleTime: 5 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-muted-foreground", SIZE_CLASSES[size], className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Calculando...</span>
      </span>
    );
  }

  if (error || !data || !data.meta.hasData) {
    return (
      <span className={cn("inline-flex items-center gap-1 bg-muted text-muted-foreground", SIZE_CLASSES[size], className)}>
        <span>Sem dados</span>
      </span>
    );
  }

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium text-white",
        SIZE_CLASSES[size],
        className
      )}
      style={{ backgroundColor: data.maturityColor }}
    >
      <TrendingUp className={size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} />
      <span>Score CPIE: {data.cpieScore}</span>
      <span className="opacity-80">({data.maturityLabel})</span>
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="w-64 p-3" side="bottom">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Breakdown do Score CPIE</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Gaps (40%)</span>
                <span className="font-medium">{data.dimensions.gap.score}/100</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: `${data.dimensions.gap.score}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Riscos (35%)</span>
                <span className="font-medium">{data.dimensions.risk.score}/100</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-orange-500"
                  style={{ width: `${data.dimensions.risk.score}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ações (25%)</span>
                <span className="font-medium">{data.dimensions.action.score}/100</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-green-500"
                  style={{ width: `${data.dimensions.action.score}%` }}
                />
              </div>
            </div>
            <div className="border-t pt-1 mt-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{data.meta.totalGaps} gaps · {data.meta.totalRisks} riscos · {data.meta.totalActions} ações</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * CpieScoreCard — Versão expandida para usar no ComplianceDashboardV3
 */
interface CpieScoreCardProps {
  projectId: number;
  className?: string;
}

export function CpieScoreCard({ projectId, className }: CpieScoreCardProps) {
  const { data, isLoading } = trpc.scoringEngine.getScore.useQuery(
    { projectId },
    { enabled: !!projectId, staleTime: 5 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border p-4 flex items-center justify-center", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || !data.meta.hasData) {
    return (
      <div className={cn("rounded-xl border p-4", className)}>
        <p className="text-sm text-muted-foreground text-center">Score CPIE não disponível — execute a análise completa primeiro.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Score CPIE</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span
              className="text-3xl font-bold"
              style={{ color: data.maturityColor }}
            >
              {data.cpieScore}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </div>
        <span
          className="text-sm font-semibold px-3 py-1 rounded-full text-white"
          style={{ backgroundColor: data.maturityColor }}
        >
          {data.maturityLabel}
        </span>
      </div>

      {/* Dimensões */}
      <div className="space-y-2">
        {[
          { label: "Gaps", score: data.dimensions.gap.score, weight: "40%", color: "bg-blue-500", detail: `${data.dimensions.gap.detail.criticalGaps} críticos, ${data.dimensions.gap.detail.highGaps} altos` },
          { label: "Riscos", score: data.dimensions.risk.score, weight: "35%", color: "bg-orange-500", detail: `${data.dimensions.risk.detail.criticalRisks} críticos, ${data.dimensions.risk.detail.highRisks} altos` },
          { label: "Ações", score: data.dimensions.action.score, weight: "25%", color: "bg-green-500", detail: `${data.dimensions.action.detail.completedActions}/${data.dimensions.action.detail.totalActions} concluídas` },
        ].map(dim => (
          <div key={dim.label} className="space-y-0.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">{dim.label} <span className="opacity-60">({dim.weight})</span></span>
              <span className="font-medium text-foreground">{dim.score}/100 <span className="text-muted-foreground">— {dim.detail}</span></span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className={cn("h-1.5 rounded-full transition-all", dim.color)}
                style={{ width: `${dim.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground">
        Calculado em {new Date(data.meta.calculatedAt).toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
