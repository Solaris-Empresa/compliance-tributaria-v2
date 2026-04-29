/**
 * ConfirmacaoPerfil.tsx — Página M2 PR-B · Confirmação do Perfil da Entidade
 *
 * Rota: /projetos/:id/perfil-entidade
 * Layout: 2 colunas (formulário progressivo + Painel de Confiança sticky)
 *
 * Estados visuais (8):
 *   S1_inicio     — loading do build
 *   S2_modal_cnaes — (handled by NovoProjeto, not here)
 *   S3_cnaes_confirmados — entry point desta página
 *   S4_painel     — snapshot computado, painel visível
 *   C1_pendente   — status_arquetipo === "pendente"
 *   C2_inconsistente — status_arquetipo === "inconsistente"
 *   C3_bloqueado  — status_arquetipo === "bloqueado" (hard_blocks > 0)
 *   C4_confirmado — imutável (write-once ADR-0031)
 *
 * Decisão P.O.: Score alto NÃO libera fluxo.
 * Apenas status_arquetipo === "confirmado" + zero hard_blocks libera.
 *
 * Ref: feat/m2-pr-b-frontend-perfil · PROMPT-M2-v3-FINAL.json §B1
 */
import React from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { usePerfilEntidade } from "@/hooks/usePerfilEntidade";
import PainelConfianca from "@/components/PainelConfianca";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  RefreshCw,
  Layers,
  Building2,
  Globe,
  Scale,
  Network,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

// ─── Labels para exibição das dimensões ─────────────────────────────────────
const DIMENSION_DISPLAY: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  objeto: { label: "Objeto Econômico", icon: Building2 },
  papel_na_cadeia: { label: "Papel na Cadeia", icon: Network },
  tipo_de_relacao: { label: "Tipo de Relação", icon: Briefcase },
  territorio: { label: "Território", icon: Globe },
  regime: { label: "Regime Tributário", icon: Scale },
};

// ─── Seções contextuais ─────────────────────────────────────────────────────
const CONTEXTUAL_SECTIONS: Record<string, string> = {
  subnatureza_setorial: "Subnatureza Setorial",
  orgao_regulador: "Órgão Regulador",
  regime_especifico: "Regime Específico",
};

export default function ConfirmacaoPerfil() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const projectId = params.id ? parseInt(params.id, 10) : null;

  const perfil = usePerfilEntidade(projectId);

  // Auth guard
  if (authLoading) {
    return (
      <ComplianceLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ComplianceLayout>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!projectId) return;
    if (!perfil.canConfirm) {
      toast.error("Não é possível confirmar: existem bloqueios ou campos faltantes.");
      return;
    }
    try {
      await perfil.confirmPerfil.mutateAsync({ projectId });
      toast.success("Perfil da Entidade confirmado com sucesso! Avançando para o Questionário SOLARIS...");
      // Redirect para próxima etapa (Onda 1 SOLARIS)
      setTimeout(() => {
        setLocation(`/projetos/${projectId}/questionario-solaris`);
      }, 1500);
    } catch (err: any) {
      const msg = err?.message ?? "Erro ao confirmar perfil";
      if (msg.includes("CONFLICT") || msg.includes("409")) {
        toast.error("Perfil já foi confirmado anteriormente (imutável — ADR-0031).");
      } else if (msg.includes("M2_PERFIL_ENTIDADE_DISABLED")) {
        toast.error("Feature M2 desabilitada para este contexto. Contate o administrador.");
      } else {
        toast.error(msg);
      }
    }
  };

  const handleBack = () => {
    if (projectId) {
      setLocation(`/projetos/${projectId}`);
    }
  };

  const handleSkipToSolaris = () => {
    if (projectId) {
      setLocation(`/projetos/${projectId}/questionario-solaris`);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <ComplianceLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Perfil da Entidade
              </h1>
              <p className="text-sm text-muted-foreground">
                Etapa de confirmação — Projeto #{projectId}
              </p>
            </div>
          </div>
          {/* Stepper indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              CNAEs Confirmados
            </Badge>
            <ArrowRight className="h-3 w-3" />
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              Perfil da Entidade
            </Badge>
            <ArrowRight className="h-3 w-3" />
            <Badge variant="outline">Questionário SOLARIS</Badge>
          </div>
        </div>

        {/* Main 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: Formulário / Snapshot Display */}
          <div className="space-y-6">
            {/* Loading state */}
            {perfil.isLoading && (
              <Card>
                <CardContent className="py-12 flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Computando Perfil da Entidade...</p>
                  <p className="text-xs text-muted-foreground/70">Analisando dimensões canônicas a partir dos dados do projeto</p>
                </CardContent>
              </Card>
            )}

            {/* Error state (feature flag disabled) */}
            {perfil.error && (
              <Card className="border-destructive/30">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <ShieldX className="h-10 w-10 text-destructive/70" />
                    <h3 className="font-medium text-destructive">Perfil da Entidade Indisponível</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {perfil.error.includes("M2_PERFIL_ENTIDADE_DISABLED")
                        ? "Esta funcionalidade está em rollout controlado. Contate o administrador para ativação."
                        : perfil.error}
                    </p>
                    <Button variant="outline" size="sm" onClick={handleSkipToSolaris}>
                      Pular para Questionário SOLARIS
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Confirmed (immutable) state */}
            {perfil.isConfirmed && perfil.snapshot && (
              <Card className="border-emerald-200 bg-emerald-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-700">
                    <Lock className="h-5 w-5" />
                    Perfil Confirmado (Imutável)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Este perfil foi confirmado em{" "}
                    <strong>{perfil.confirmedAt ? new Date(perfil.confirmedAt).toLocaleString("pt-BR") : "—"}</strong>{" "}
                    e não pode ser alterado (ADR-0031).
                  </p>
                  <SnapshotDisplay snapshot={perfil.snapshot} />
                  <div className="pt-4">
                    <Button onClick={handleSkipToSolaris}>
                      Continuar para Questionário SOLARIS
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active state: snapshot computed, not yet confirmed */}
            {!perfil.isLoading && !perfil.error && !perfil.isConfirmed && perfil.snapshot && (
              <>
                {/* Status banner */}
                <StatusBanner status={perfil.status} />

                {/* Snapshot display */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Dimensões Identificadas</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => perfil.refetchBuild()}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Recalcular
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SnapshotDisplay snapshot={perfil.snapshot} />
                  </CardContent>
                </Card>

                {/* Confirm button */}
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-sm">Confirmar Perfil da Entidade</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {perfil.canConfirm
                            ? "Todas as condições atendidas. Ao confirmar, o perfil se torna imutável."
                            : "Resolva os bloqueios e campos faltantes antes de confirmar."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleSkipToSolaris}>
                          Pular
                        </Button>
                        <Button
                          size="sm"
                          disabled={!perfil.canConfirm || perfil.confirmPerfil.isPending}
                          onClick={handleConfirm}
                        >
                          {perfil.confirmPerfil.isPending ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-1" />Confirmando...</>
                          ) : (
                            <><ShieldCheck className="h-4 w-4 mr-1" />Confirmar e Avançar</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Right: Painel de Confiança (sticky) */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <PainelConfianca state={perfil} />
            </div>
          </div>
        </div>
      </div>
    </ComplianceLayout>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBanner({ status }: { status: string }) {
  if (status === "pendente") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-amber-800">Perfil Pendente</h4>
          <p className="text-xs text-amber-700 mt-0.5">
            O perfil dimensional foi computado mas ainda não foi confirmado. Revise as dimensões abaixo e confirme para avançar.
          </p>
        </div>
      </div>
    );
  }
  if (status === "inconsistente") {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-orange-800">Perfil Inconsistente</h4>
          <p className="text-xs text-orange-700 mt-0.5">
            Foram detectadas inconsistências nos dados do projeto. Revise os campos do formulário de criação e recalcule.
          </p>
        </div>
      </div>
    );
  }
  if (status === "bloqueado") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
        <ShieldX className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-red-800">Perfil Bloqueado</h4>
          <p className="text-xs text-red-700 mt-0.5">
            Existem bloqueios críticos que impedem a confirmação. Verifique o painel de confiança à direita para detalhes.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

function SnapshotDisplay({ snapshot }: { snapshot: Record<string, unknown> }) {
  // Pre-compute dimension data to avoid TS issues with Object.entries in JSX
  const dimensionKeys = ["objeto", "papel_na_cadeia", "tipo_de_relacao", "territorio", "regime"] as const;
  const contextualKeys = ["subnatureza_setorial", "orgao_regulador", "regime_especifico"] as const;

  function getDisplayVal(val: unknown): string {
    if (Array.isArray(val) && val.length > 0) return (val as string[]).join(", ");
    if (typeof val === "string" && val.length > 0) return val;
    return "—";
  }

  return (
    <div className="space-y-4">
      {/* 5 Dimensões Canônicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {dimensionKeys.map((key) => {
          const config = DIMENSION_DISPLAY[key];
          const Icon = config.icon;
          const displayVal = getDisplayVal(snapshot[key]);
          const filled = displayVal !== "—";
          return (
            <div
              key={key}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                filled ? "border-primary/20 bg-primary/5" : "border-border bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("h-4 w-4", filled ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
              </div>
              <p className={cn(
                "text-sm font-medium",
                filled ? "text-foreground" : "text-muted-foreground/60"
              )}>
                {displayVal}
              </p>
            </div>
          );
        })}
      </div>

      {/* Seções contextuais */}
      <Separator />
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contextuais</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {contextualKeys.map((key) => {
            const label = CONTEXTUAL_SECTIONS[key];
            const val = snapshot[key];
            const items: string[] = Array.isArray(val) ? (val as string[]) : [];
            return (
              <div key={key} className="text-xs">
                <span className="text-muted-foreground">{label}:</span>{" "}
                <span className="font-medium">
                  {items.length > 0 ? items.join(", ") : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metadata */}
      {snapshot.derived_legacy_operation_type != null && (
        <div className="text-xs text-muted-foreground">
          <span>Tipo de operação derivado: </span>
          <Badge variant="outline" className="text-[10px]">
            {String(snapshot.derived_legacy_operation_type)}
          </Badge>
        </div>
      )}
    </div>
  );
}
