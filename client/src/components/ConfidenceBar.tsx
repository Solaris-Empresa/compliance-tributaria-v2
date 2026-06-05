/**
 * ConfidenceBar.tsx — fix UX1 UAT 2026-04-20
 *
 * Barra visual de "Nível de Confiança" do briefing — substitui o texto plain
 * "Nível de Confiança: 85%" por barra colorida + limitações + recomendação.
 *
 * Fonte: confidence_score.nivel_confianca (0-100) em projects.briefingStructured.
 * Exposto pelo backend via trpc.fluxoV3.getBriefingInconsistencias.
 */
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfidenceScore {
  nivel_confianca?: number;
  limitacoes?: string[];
  recomendacao?: string;
}

interface Props {
  score: ConfidenceScore | null | undefined;
  className?: string;
}

/**
 * CALC-4 (#1383) — 5 faixas unificadas de completude, thresholds 0/50/70/85/95.
 * Mesmas faixas/labels do DecisionPanel (faixaCompletude) — fonte única.
 *   >=95  → Pleno (verde escuro, ShieldCheck)
 *   85-94 → Confiável (verde, ShieldCheck)
 *   70-84 → Em construção (amarelo, Shield) — orientativo, não punitivo
 *   50-69 → Parcial (laranja, ShieldAlert)
 *   <50   → Insuficiente (vermelho, ShieldAlert)
 */
export function getConfidenceConfig(nivel: number) {
  if (nivel >= 95) {
    return {
      label: "Pleno",
      bgClass: "bg-green-600",
      textClass: "text-green-800 dark:text-green-400",
      bgLight: "bg-green-50 dark:bg-green-950/20",
      borderClass: "border-green-300 dark:border-green-800",
      Icon: ShieldCheck,
    };
  }
  if (nivel >= 85) {
    return {
      label: "Confiável",
      bgClass: "bg-emerald-500",
      textClass: "text-emerald-700 dark:text-emerald-400",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/20",
      borderClass: "border-emerald-200 dark:border-emerald-800",
      Icon: ShieldCheck,
    };
  }
  if (nivel >= 70) {
    return {
      label: "Em construção",
      bgClass: "bg-amber-500",
      textClass: "text-amber-700 dark:text-amber-400",
      bgLight: "bg-amber-50 dark:bg-amber-950/20",
      borderClass: "border-amber-200 dark:border-amber-800",
      Icon: Shield,
    };
  }
  if (nivel >= 50) {
    return {
      label: "Parcial",
      bgClass: "bg-orange-500",
      textClass: "text-orange-700 dark:text-orange-400",
      bgLight: "bg-orange-50 dark:bg-orange-950/20",
      borderClass: "border-orange-200 dark:border-orange-800",
      Icon: ShieldAlert,
    };
  }
  return {
    label: "Insuficiente",
    bgClass: "bg-red-500",
    textClass: "text-red-700 dark:text-red-400",
    bgLight: "bg-red-50 dark:bg-red-950/20",
    borderClass: "border-red-200 dark:border-red-800",
    Icon: ShieldAlert,
  };
}

export function ConfidenceBar({ score, className }: Props) {
  if (!score || typeof score.nivel_confianca !== "number") return null;

  const nivel = Math.max(0, Math.min(100, score.nivel_confianca));
  const cfg = getConfidenceConfig(nivel);
  const Icon = cfg.Icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2",
        cfg.bgLight,
        cfg.borderClass,
        className
      )}
      data-testid="confidence-bar"
    >
      {/* Header: ícone + label + % */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4 shrink-0", cfg.textClass)} />
          <span className={cn("text-sm font-semibold", cfg.textClass)}>
            Completude do Diagnóstico: {cfg.label}
          </span>
        </div>
        <span
          className={cn("text-sm font-mono tabular-nums font-bold", cfg.textClass)}
          data-testid="confidence-percent"
        >
          {nivel}%
        </span>
      </div>

      {/* Barra visual */}
      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", cfg.bgClass)}
          style={{ width: `${nivel}%` }}
          role="progressbar"
          aria-valuenow={nivel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Nível de confiança do diagnóstico: ${nivel}%`}
        />
      </div>

      {/* Recomendação */}
      {score.recomendacao && (
        <p className={cn("text-xs leading-relaxed", cfg.textClass)}>
          {score.recomendacao}
        </p>
      )}

      {/* Limitações */}
      {score.limitacoes && score.limitacoes.length > 0 && (
        <details className="mt-1">
          <summary className={cn("text-xs cursor-pointer hover:underline flex items-center gap-1", cfg.textClass)}>
            <AlertTriangle className="h-3 w-3" />
            Ver {score.limitacoes.length} {score.limitacoes.length === 1 ? "limitação" : "limitações"} do diagnóstico
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground pl-4 list-disc">
            {score.limitacoes.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
