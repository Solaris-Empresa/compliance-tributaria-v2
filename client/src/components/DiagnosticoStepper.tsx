/**
 * DiagnosticoStepper.tsx — v2.1
 * ─────────────────────────────────────────────────────────────────────────────
 * Exibe o progresso das 3 camadas do diagnóstico tributário:
 *   1. Corporativo  (corporate)
 *   2. Operacional  (operational)
 *   3. CNAE         (cnae)
 *
 * Regras de bloqueio espelham o backend (routers-fluxo-v3.ts):
 *   - operational só inicia após corporate = completed
 *   - cnae só inicia após operational = completed
 *   - briefing só libera após as 3 camadas = completed
 *
 * Status possíveis por camada: not_started | in_progress | completed
 */

import { CheckCircle2, Circle, Clock, Lock, ChevronRight, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type LayerStatus = "not_started" | "in_progress" | "completed";

export interface DiagnosticLayerState {
  corporate: LayerStatus;
  operational: LayerStatus;
  cnae: LayerStatus;
}

interface DiagnosticoStepperProps {
  /** Estado atual das 3 camadas (vem do backend via getDiagnosticStatus) */
  diagnosticStatus: DiagnosticLayerState;
  /** Percentual de progresso geral (0–100) */
  progress: number;
  /** Se true, o briefing pode ser gerado */
  readyForBriefing: boolean;
  /** Callback ao clicar em "Iniciar" ou "Continuar" uma camada */
  onStartLayer?: (layer: "corporate" | "operational" | "cnae") => void;
  /** Callback ao clicar em "Gerar Briefing" */
  onGenerateBriefing?: () => void;
  /** Se true, desabilita todos os botões (loading state) */
  isLoading?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

// ─── Configuração das camadas ────────────────────────────────────────────────

const LAYERS: {
  id: "corporate" | "operational" | "cnae";
  number: number;
  label: string;
  description: string;
  statusLabel: string;
  lockedMessage: string;
}[] = [
  {
    id: "corporate",
    number: 1,
    label: "Diagnóstico Corporativo",
    description: "Estrutura jurídica, regime tributário e porte da empresa",
    statusLabel: "Camada 1",
    lockedMessage: "",
  },
  {
    id: "operational",
    number: 2,
    label: "Diagnóstico Operacional",
    description: "Operações, fluxos e exposição tributária por atividade",
    statusLabel: "Camada 2",
    lockedMessage: "Conclua o Diagnóstico Corporativo para desbloquear",
  },
  {
    id: "cnae",
    number: 3,
    label: "Diagnóstico CNAE",
    description: "Análise adaptativa por código de atividade econômica",
    statusLabel: "Camada 3",
    lockedMessage: "Conclua o Diagnóstico Operacional para desbloquear",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isLayerLocked(
  layerId: "corporate" | "operational" | "cnae",
  status: DiagnosticLayerState
): boolean {
  if (layerId === "corporate") return false;
  if (layerId === "operational") return status.corporate !== "completed";
  if (layerId === "cnae") return status.operational !== "completed";
  return false;
}

function getLayerButtonLabel(
  layerStatus: LayerStatus,
  isLocked: boolean
): string {
  if (isLocked) return "Bloqueado";
  if (layerStatus === "not_started") return "Iniciar";
  if (layerStatus === "in_progress") return "Continuar";
  return "Revisitar";
}

// ─── Componente de camada individual ────────────────────────────────────────

function LayerCard({
  layer,
  status,
  locked,
  onStart,
  isLoading,
}: {
  layer: (typeof LAYERS)[number];
  status: LayerStatus;
  locked: boolean;
  onStart?: () => void;
  isLoading?: boolean;
}) {
  const isCompleted = status === "completed";
  const isInProgress = status === "in_progress";
  const isNotStarted = status === "not_started";

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border p-4 transition-all",
        isCompleted
          ? "border-emerald-500/40 bg-emerald-500/5"
          : isInProgress
          ? "border-blue-500/40 bg-blue-500/5"
          : locked
          ? "border-border/40 bg-muted/20 opacity-60"
          : "border-border bg-card"
      )}
    >
      {/* Ícone de status */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
          isCompleted
            ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
            : isInProgress
            ? "border-blue-500 bg-blue-500/20 text-blue-500"
            : locked
            ? "border-border bg-muted text-muted-foreground"
            : "border-border bg-background text-muted-foreground"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : isInProgress ? (
          <Clock className="h-5 w-5" />
        ) : locked ? (
          <Lock className="h-4 w-4" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </div>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-mono">
            {layer.statusLabel}
          </span>
          <span
            className={cn(
              "text-sm font-semibold",
              isCompleted
                ? "text-emerald-600 dark:text-emerald-400"
                : isInProgress
                ? "text-blue-600 dark:text-blue-400"
                : "text-foreground"
            )}
          >
            {layer.label}
          </span>
          {/* Badge de status */}
          {isCompleted && (
            <Badge
              variant="outline"
              className="text-[10px] h-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            >
              Concluído
            </Badge>
          )}
          {isInProgress && (
            <Badge
              variant="outline"
              className="text-[10px] h-4 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10"
            >
              Em andamento
            </Badge>
          )}
          {isNotStarted && !locked && (
            <Badge
              variant="outline"
              className="text-[10px] h-4 border-border text-muted-foreground"
            >
              Não iniciado
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">
          {locked ? layer.lockedMessage : layer.description}
        </p>
      </div>

      {/* Botão de ação */}
      {!locked && (
        <Button
          size="sm"
          variant={isCompleted ? "outline" : "default"}
          onClick={onStart}
          disabled={isLoading}
          className={cn(
            "shrink-0 text-xs",
            isCompleted && "text-muted-foreground"
          )}
        >
          {getLayerButtonLabel(status, locked)}
          <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function DiagnosticoStepper({
  diagnosticStatus,
  progress,
  readyForBriefing,
  onStartLayer,
  onGenerateBriefing,
  isLoading = false,
  className,
}: DiagnosticoStepperProps) {
  const completedCount = Object.values(diagnosticStatus).filter(
    (s) => s === "completed"
  ).length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Cabeçalho com progresso geral ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Diagnóstico Tributário
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-4",
                progress === 100
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : progress > 0
                  ? "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                  : "border-border text-muted-foreground"
              )}
            >
              {completedCount}/3 camadas
            </Badge>
          </div>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              progress === 100
                ? "text-emerald-600 dark:text-emerald-400"
                : progress > 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-muted-foreground"
            )}
          >
            {progress}%
          </span>
        </div>
        <Progress
          value={progress}
          className={cn(
            "h-2",
            progress === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-500"
          )}
        />
      </div>

      {/* ── Camadas ── */}
      <div className="space-y-2">
        {LAYERS.map((layer) => {
          const locked = isLayerLocked(layer.id, diagnosticStatus);
          const layerStatus = diagnosticStatus[layer.id];
          return (
            <LayerCard
              key={layer.id}
              layer={layer}
              status={layerStatus}
              locked={locked}
              onStart={() => onStartLayer?.(layer.id)}
              isLoading={isLoading}
            />
          );
        })}
      </div>

      {/* ── Botão de Briefing (GATE: só aparece quando 3/3 completas) ── */}
      {readyForBriefing ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                Diagnóstico Completo — Pronto para Briefing
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                As 3 camadas foram concluídas. Gere o briefing personalizado agora.
              </p>
            </div>
            <Button
              onClick={onGenerateBriefing}
              disabled={isLoading}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Gerar Briefing
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground text-center">
            {completedCount === 0
              ? "Inicie o Diagnóstico Corporativo para começar o fluxo"
              : completedCount === 1
              ? "Conclua o Diagnóstico Operacional para avançar"
              : "Conclua o Diagnóstico CNAE para liberar o Briefing"}
          </p>
        </div>
      )}
    </div>
  );
}

export default DiagnosticoStepper;
