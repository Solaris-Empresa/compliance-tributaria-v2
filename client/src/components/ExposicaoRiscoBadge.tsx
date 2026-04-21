import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  classifyExposicao,
  EXPOSICAO_CONFIG,
  type ExposicaoLevel,
} from "@/lib/exposicao-risco-thresholds";

/**
 * Forma do `projects.scoringData`.
 *
 * Backend (calculateComplianceScore em server/lib/compliance-score-v4.ts) grava
 * apenas `score` (número 0-100). Este componente classifica UX-side via
 * `classifyExposicao` da lib `exposicao-risco-thresholds` — fonte única de verdade
 * para thresholds (issue #802).
 *
 * Compat: registros legados V61 (calculateGlobalScore) ainda podem ter `score_global`.
 * Fallback preservado — issue #800.
 */
type ScoringData = {
  score?: number;          // calculateComplianceScore (ativa)
  score_global?: number;   // calculateGlobalScore (legada — compat)
  [k: string]: unknown;
};

// Ícones por nível (UX) — mapeamento local, não duplicado com a lib
const ICONS: Record<ExposicaoLevel, typeof Shield> = {
  critica: ShieldAlert,
  alta: ShieldAlert,
  moderada: Shield,
  baixa: ShieldCheck,
};

const SEM_ANALISE = {
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
 * Badge compacto exibindo o nível de Exposição ao Risco de Compliance do projeto.
 *
 * 5 estados: Baixa · Moderada · Alta · Crítica · Sem análise.
 *
 * Thresholds (issue #802):
 *   0–30  → Baixa
 *   31–55 → Moderada
 *   56–75 → Alta
 *   76–100 → Crítica
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
  // Prefere `score` (ativa); fallback para `score_global` em registros legados.
  const score =
    typeof data?.score === "number"
      ? data.score
      : typeof data?.score_global === "number"
        ? data.score_global
        : null;

  // Sem score → estado "sem análise"
  if (score === null) {
    const Icon = SEM_ANALISE.icon;
    const sizing =
      size === "sm" ? "px-2 py-0.5 text-xs gap-1" : "px-2.5 py-1 text-sm gap-1.5";
    const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border font-medium",
          sizing,
          SEM_ANALISE.className,
          className
        )}
        data-testid="exposicao-risco-badge"
        title="Exposição ao Risco de Compliance: Sem análise"
      >
        <Icon className={iconSize} />
        <span>{SEM_ANALISE.label}</span>
      </span>
    );
  }

  const level = classifyExposicao(score);
  const cfg = EXPOSICAO_CONFIG[level];
  const Icon = ICONS[level];

  const sizing =
    size === "sm" ? "px-2 py-0.5 text-xs gap-1" : "px-2.5 py-1 text-sm gap-1.5";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizing,
        cfg.className,
        className
      )}
      data-testid="exposicao-risco-badge"
      data-level={level}
      title={`Exposição ao Risco de Compliance: ${cfg.label} (${score}%) — ${cfg.interpretation}. Quanto menor, melhor.`}
    >
      <Icon className={iconSize} />
      <span>{cfg.label}</span>
      {showScore && (
        <span className="font-mono tabular-nums opacity-80">{score}%</span>
      )}
    </span>
  );
}
