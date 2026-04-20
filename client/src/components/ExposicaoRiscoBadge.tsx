import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Forma do `projects.scoringData` (engine v4 — calculateGlobalScore em server/ai-helpers.ts).
 * Mantido aqui para tipar a leitura sem importar do server (preserva isolamento client/server).
 */
type ScoringData = {
  score_global?: number;
  nivel?: "baixo" | "medio" | "alto" | "critico";
  [k: string]: unknown;
};

const NIVEL_CONFIG = {
  critico: {
    label: "Crítica",
    icon: ShieldAlert,
    className: "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400",
  },
  alto: {
    label: "Alta",
    icon: ShieldAlert,
    className: "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400",
  },
  medio: {
    label: "Média",
    icon: Shield,
    className: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400",
  },
  baixo: {
    label: "Baixa",
    icon: ShieldCheck,
    className: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
} as const;

const SEM_ANALISE_CONFIG = {
  label: "Sem análise",
  icon: ShieldQuestion,
  className: "text-muted-foreground bg-muted/40 border-border",
} as const;

interface ExposicaoRiscoBadgeProps {
  scoringData: unknown;
  size?: "sm" | "md";
  showScore?: boolean;
  className?: string;
}

/**
 * Badge compacto exibindo o nível de Exposição ao Risco de Compliance do projeto,
 * lido de `projects.scoringData` (engine v4 determinístico — ADR-0022).
 *
 * 5 estados: Crítica · Alta · Média · Baixa · Sem análise.
 *
 * Substitui o antigo CpieScoreBadge (deletado na Sprint Z-22 Wave A.2+B · PR #737).
 */
export function ExposicaoRiscoBadge({
  scoringData,
  size = "sm",
  showScore = false,
  className,
}: ExposicaoRiscoBadgeProps) {
  const data = (scoringData ?? null) as ScoringData | null;
  const nivel = data?.nivel;
  const score = typeof data?.score_global === "number" ? data.score_global : null;

  const config = nivel && nivel in NIVEL_CONFIG ? NIVEL_CONFIG[nivel] : SEM_ANALISE_CONFIG;
  const Icon = config.icon;

  const sizing = size === "sm"
    ? "px-2 py-0.5 text-xs gap-1"
    : "px-2.5 py-1 text-sm gap-1.5";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizing,
        config.className,
        className
      )}
      data-testid="exposicao-risco-badge"
      title={
        score !== null
          ? `Exposição ao Risco de Compliance: ${config.label} (${score}%)`
          : `Exposição ao Risco de Compliance: ${config.label}`
      }
    >
      <Icon className={iconSize} />
      <span>{config.label}</span>
      {showScore && score !== null && (
        <span className="font-mono tabular-nums opacity-80">{score}%</span>
      )}
    </span>
  );
}
