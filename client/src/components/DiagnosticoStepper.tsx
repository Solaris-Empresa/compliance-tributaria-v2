/**
 * DiagnosticoStepper.tsx — v3.0 (K-4-B)
 * ─────────────────────────────────────────────────────────────────────────────
 * Exibe o progresso das 8 etapas do diagnóstico tributário (Fluxo A unificado):
 *   1. Onda 1 SOLARIS   → /questionario-solaris
 *   2. Onda 2 IA Gen    → /questionario-iagen        (K-4-C — visual only)
 *   3. Corporativo      → /questionario-corporativo-v2
 *   4. Operacional      → /questionario-operacional
 *   5. CNAE             → /questionario-cnae
 *   6. Briefing         → /briefing-v3
 *   7. Matrizes         → /matrizes-v3
 *   8. Plano            → /plano-v3
 *
 * Regras de bloqueio (espelham VALID_TRANSITIONS no backend):
 *   - Onda 2 só inicia após Onda 1 = completed
 *   - Corporativo só inicia após Onda 2 = completed
 *   - Operacional só inicia após Corporativo = completed
 *   - CNAE só inicia após Operacional = completed
 *   - Briefing só libera após CNAE = completed
 *   - Matrizes só libera após Briefing = completed
 *   - Plano só libera após Matrizes = completed
 *
 * Status possíveis por etapa: not_started | in_progress | completed
 *
 * Compatibilidade retroativa: DiagnosticLayerState (3 campos) ainda é exportado
 * para não quebrar usos existentes em ProjetoDetalhesV2.tsx.
 */

import { CheckCircle2, Circle, Clock, Lock, ChevronRight, Zap, Scale, Brain, Building2, Wrench, Hash, FileText, BarChart3, ClipboardCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type LayerStatus = "not_started" | "in_progress" | "completed";

/** @deprecated Mantido para compatibilidade — use StepId */
export interface DiagnosticLayerState {
  corporate: LayerStatus;
  operational: LayerStatus;
  cnae: LayerStatus;
}

export type StepId =
  | "onda1"
  | "onda2"
  | "corporate"
  | "operational"
  | "cnae"
  | "briefing"
  | "matrizes"
  | "plano";

export type StepState = Record<StepId, LayerStatus>;

interface DiagnosticoStepperProps {
  /** Estado atual das 8 etapas */
  diagnosticStatus: DiagnosticLayerState;
  /** Percentual de progresso geral (0–100) */
  progress: number;
  /** Se true, o briefing pode ser gerado */
  readyForBriefing: boolean;
  /** Callback ao clicar em "Iniciar" ou "Continuar" uma etapa */
  onStartLayer?: (layer: "corporate" | "operational" | "cnae") => void;
  /** Callback ao clicar em "Iniciar" Onda 1 */
  onStartOnda1?: () => void;
  /** Callback ao clicar em "Iniciar" Onda 2 (K-4-C) */
  onStartOnda2?: () => void;
  /** Callback ao clicar em "Gerar Briefing" */
  onGenerateBriefing?: () => void;
  /** Callback ao clicar em "Iniciar" Etapa 7 — Matrizes de Risco (K-4-D) */
  onStartMatrizes?: () => void;
  /** Callback ao clicar em "Iniciar" Etapa 8 — Plano de Ação (K-4-D) */
  onStartPlano?: () => void;
  /** Status do projeto (para derivar estado das ondas) */
  projectStatus?: string;
  /** Se true, desabilita todos os botões (loading state) */
  isLoading?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

// ─── Configuração das 8 etapas ───────────────────────────────────────────────

const STEPS: {
  id: StepId;
  number: number;
  label: string;
  description: string;
  lockedMessage: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: "blue" | "purple" | "slate" | "orange" | "indigo" | "emerald" | "teal" | "green";
  badge?: string;
}[] = [
  {
    id: "onda1",
    number: 1,
    label: "Questionário SOLARIS",
    description: "Análise jurídica especializada pela Equipe SOLARIS",
    lockedMessage: "",
    icon: Scale,
    accentColor: "blue",
    badge: "Equipe técnica SOLARIS",
  },
  {
    id: "onda2",
    number: 2,
    label: "Questionário por IA",
    description: "Perguntas geradas por IA com base no perfil da empresa",
    lockedMessage: "Conclua o Questionário SOLARIS para desbloquear",
    icon: Brain,
    accentColor: "purple",
    badge: "IA Generativa",
  },
  {
    id: "corporate",
    number: 3,
    label: "Questionário Corporativo",
    description: "QC-01 a QC-10 — Estrutura jurídica, regime tributário e porte da empresa",
    lockedMessage: "Conclua o Questionário por IA para desbloquear",
    icon: Building2,
    accentColor: "slate",
  },
  {
    id: "operational",
    number: 4,
    label: "Questionário Operacional",
    description: "QO-01 a QO-10 — Operações, fluxos e exposição tributária por atividade",
    lockedMessage: "Conclua o Questionário Corporativo para desbloquear",
    icon: Wrench,
    accentColor: "orange",
  },
  {
    id: "cnae",
    number: 5,
    label: "Questionário Especializado por CNAE",
    description: "QCNAE-01 a QCNAE-05 — Análise setorial por atividade econômica",
    lockedMessage: "Conclua o Questionário Operacional para desbloquear",
    icon: Hash,
    accentColor: "indigo",
  },
  {
    id: "briefing",
    number: 6,
    label: "Briefing",
    description: "Geração do diagnóstico consolidado com base nas 5 etapas anteriores",
    lockedMessage: "Conclua o Questionário CNAE para desbloquear",
    icon: FileText,
    accentColor: "emerald",
  },
  {
    id: "matrizes",
    number: 7,
    label: "Matrizes de Risco",
    description: "Geração das matrizes de risco tributário por CNAE",
    lockedMessage: "Gere o Briefing para desbloquear",
    icon: BarChart3,
    accentColor: "teal",
  },
  {
    id: "plano",
    number: 8,
    label: "Plano de Ação",
    description: "Plano de adequação à Reforma Tributária",
    lockedMessage: "Gere as Matrizes de Risco para desbloquear",
    icon: ClipboardCheck,
    accentColor: "green",
  },
];

// ─── Mapeamento de status do projeto → StepState ────────────────────────────

export function projectStatusToStepState(
  projectStatus: string,
  legacyState?: DiagnosticLayerState
): StepState {
  const base: StepState = {
    onda1: "not_started",
    onda2: "not_started",
    corporate: "not_started",
    operational: "not_started",
    cnae: "not_started",
    briefing: "not_started",
    matrizes: "not_started",
    plano: "not_started",
  };

  // Mapear status do projeto para estado das etapas
  const statusMap: Record<string, Partial<StepState>> = {
    rascunho: {},
    onda1_solaris: { onda1: "completed" },
    onda2_iagen: { onda1: "completed", onda2: "completed" },
    diagnostico_corporativo: { onda1: "completed", onda2: "completed", corporate: "completed" },
    diagnostico_operacional: { onda1: "completed", onda2: "completed", corporate: "completed", operational: "completed" },
    // Z-02 TO-BE: ADR-0010 — fluxo NCM/NBS substitui QC/QO
    q_produto: { onda1: "completed", onda2: "completed", corporate: "in_progress" },
    q_servico: { onda1: "completed", onda2: "completed", corporate: "completed", operational: "in_progress" },
    diagnostico_cnae: { onda1: "completed", onda2: "completed", corporate: "completed", operational: "completed", cnae: "completed" },
    briefing: { onda1: "completed", onda2: "completed", corporate: "completed", operational: "completed", cnae: "completed", briefing: "completed" },
    matriz_riscos: { onda1: "completed", onda2: "completed", corporate: "completed", operational: "completed", cnae: "completed", briefing: "completed", matrizes: "completed" },
    aprovado: { onda1: "completed", onda2: "completed", corporate: "completed", operational: "completed", cnae: "completed", briefing: "completed", matrizes: "completed", plano: "completed" },
  };

  const mapped = statusMap[projectStatus];
  if (mapped) {
    Object.assign(base, mapped);
  }

  // Compatibilidade retroativa: se legacyState fornecido, sobrescreve corporate/operational/cnae
  if (legacyState) {
    base.corporate = legacyState.corporate;
    base.operational = legacyState.operational;
    base.cnae = legacyState.cnae;
  }

  return base;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCENT_CLASSES = {
  blue:    { border: "border-blue-500/40",    bg: "bg-blue-500/5",    icon: "border-blue-500 bg-blue-500/20 text-blue-500",    text: "text-blue-600 dark:text-blue-400",    badge: "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10" },
  purple:  { border: "border-purple-500/40",  bg: "bg-purple-500/5",  icon: "border-purple-500 bg-purple-500/20 text-purple-500",  text: "text-purple-600 dark:text-purple-400",  badge: "border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10" },
  slate:   { border: "border-slate-500/40",   bg: "bg-slate-500/5",   icon: "border-slate-500 bg-slate-500/20 text-slate-500",   text: "text-slate-600 dark:text-slate-400",   badge: "border-slate-500/40 text-slate-600 dark:text-slate-400 bg-slate-500/10" },
  orange:  { border: "border-orange-500/40",  bg: "bg-orange-500/5",  icon: "border-orange-500 bg-orange-500/20 text-orange-500",  text: "text-orange-600 dark:text-orange-400",  badge: "border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/10" },
  indigo:  { border: "border-indigo-500/40",  bg: "bg-indigo-500/5",  icon: "border-indigo-500 bg-indigo-500/20 text-indigo-500",  text: "text-indigo-600 dark:text-indigo-400",  badge: "border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10" },
  emerald: { border: "border-emerald-500/40", bg: "bg-emerald-500/5", icon: "border-emerald-500 bg-emerald-500/20 text-emerald-500", text: "text-emerald-600 dark:text-emerald-400", badge: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  teal:    { border: "border-teal-500/40",    bg: "bg-teal-500/5",    icon: "border-teal-500 bg-teal-500/20 text-teal-500",    text: "text-teal-600 dark:text-teal-400",    badge: "border-teal-500/40 text-teal-600 dark:text-teal-400 bg-teal-500/10" },
  green:   { border: "border-green-500/40",   bg: "bg-green-500/5",   icon: "border-green-500 bg-green-500/20 text-green-500",   text: "text-green-600 dark:text-green-400",   badge: "border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10" },
};

function isStepLocked(stepId: StepId, stepState: StepState): boolean {
  switch (stepId) {
    case "onda1":      return false;
    case "onda2":      return stepState.onda1 !== "completed";
    case "corporate":  return stepState.onda2 !== "completed";
    case "operational":return stepState.corporate !== "completed";
    case "cnae":       return stepState.operational !== "completed";
    case "briefing":   return stepState.cnae !== "completed";
    case "matrizes":   return stepState.briefing !== "completed";
    case "plano":      return stepState.matrizes !== "completed";
    default:           return true;
  }
}

function getButtonLabel(status: LayerStatus, locked: boolean): string {
  if (locked) return "Bloqueado";
  if (status === "not_started") return "Iniciar";
  if (status === "in_progress") return "Continuar";
  return "Revisitar";
}

// ─── StepCard ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  status,
  locked,
  onStart,
  isLoading,
}: {
  step: (typeof STEPS)[number];
  status: LayerStatus;
  locked: boolean;
  onStart?: () => void;
  isLoading?: boolean;
}) {
  const isCompleted = status === "completed";
  const isInProgress = status === "in_progress";
  const accent = ACCENT_CLASSES[step.accentColor];
  const Icon = step.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-all",
        isCompleted
          ? `${accent.border} ${accent.bg}`
          : isInProgress
          ? `${accent.border} ${accent.bg}`
          : locked
          ? "border-border/40 bg-muted/20 opacity-55"
          : "border-border bg-card"
      )}
    >
      {/* Número + ícone */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2",
          isCompleted || isInProgress
            ? accent.icon
            : locked
            ? "border-border bg-muted text-muted-foreground"
            : "border-border bg-background text-muted-foreground"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : isInProgress ? (
          <Clock className="h-4 w-4" />
        ) : locked ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
            Etapa {step.number}
          </span>
          <span
            className={cn(
              "text-sm font-semibold",
              isCompleted || isInProgress ? accent.text : "text-foreground"
            )}
          >
            {step.label}
          </span>
          {/* Badge especial (Onda 1 = azul SOLARIS, Onda 2 = purple IA) */}
          {step.badge && !locked && (
            <Badge
              variant="outline"
              className={cn("text-[10px] h-4", accent.badge)}
            >
              {step.badge}
            </Badge>
          )}
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
              className={cn("text-[10px] h-4", accent.badge)}
            >
              Em andamento
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">
          {locked ? step.lockedMessage : step.description}
        </p>
      </div>

      {/* Botão */}
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
          {getButtonLabel(status, locked)}
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
  onStartOnda1,
  onStartOnda2,
  onGenerateBriefing,
  onStartMatrizes,
  onStartPlano,
  projectStatus,
  isLoading = false,
  className,
}: DiagnosticoStepperProps) {
  // Derivar stepState a partir do projectStatus (preferência) ou legacyState
  const stepState = projectStatusToStepState(projectStatus ?? "", diagnosticStatus);

  const completedCount = Object.values(stepState).filter(
    (s) => s === "completed"
  ).length;

  // Calcular progresso baseado nas 8 etapas se não fornecido externamente
  const computedProgress = progress > 0 ? progress : Math.round((completedCount / 8) * 100);

  function handleStepStart(stepId: StepId) {
    switch (stepId) {
      case "onda1":
        onStartOnda1?.();
        break;
      case "onda2":
        onStartOnda2?.();
        break;
      case "corporate":
        onStartLayer?.("corporate");
        break;
      case "operational":
        onStartLayer?.("operational");
        break;
      case "cnae":
        onStartLayer?.("cnae");
        break;
      case "briefing":
        onGenerateBriefing?.();
        break;
      case "matrizes":
        onStartMatrizes?.(); // K-4-D
        break;
      case "plano":
        onStartPlano?.(); // K-4-D
        break;
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
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
                computedProgress === 100
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : computedProgress > 0
                  ? "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                  : "border-border text-muted-foreground"
              )}
            >
              {completedCount}/8 etapas
            </Badge>
            {/* BL-05 (Sprint Y): badge Diagnóstico Completo quando todas as 8 etapas estão concluídas */}
            {computedProgress === 100 && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 font-semibold"
              >
                ✓ Diagnóstico Completo
              </Badge>
            )}
          </div>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              computedProgress === 100
                ? "text-emerald-600 dark:text-emerald-400"
                : computedProgress > 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-muted-foreground"
            )}
          >
            {computedProgress}%
          </span>
        </div>
        <Progress
          value={computedProgress}
          className={cn(
            "h-2",
            computedProgress === 100
              ? "[&>div]:bg-emerald-500"
              : "[&>div]:bg-blue-500"
          )}
        />
      </div>

      {/* ── 8 Etapas ── */}
      <div className="space-y-1.5">
        {STEPS.map((step) => {
          const locked = isStepLocked(step.id, stepState);
          const status = stepState[step.id];
          return (
            <StepCard
              key={step.id}
              step={step}
              status={status}
              locked={locked}
              onStart={() => handleStepStart(step.id)}
              isLoading={isLoading}
            />
          );
        })}
      </div>

      {/* ── Mensagem de estado ── */}
      {computedProgress < 100 && (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground text-center">
            {completedCount === 0
              ? "Inicie o Questionário SOLARIS para começar o diagnóstico"
              : completedCount < 5
              ? `${completedCount} de 8 etapas concluídas — continue o diagnóstico`
              : completedCount < 8
              ? "Quase lá! Conclua as etapas restantes para gerar o diagnóstico completo"
              : ""}
          </p>
        </div>
      )}

      {/* ── Botão de Briefing (mantido para compatibilidade) ── */}
      {readyForBriefing && stepState.briefing !== "completed" && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                Diagnóstico Completo — Pronto para Briefing
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                As 5 etapas foram concluídas. Gere o briefing personalizado agora.
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
      )}
    </div>
  );
}

export default DiagnosticoStepper;
