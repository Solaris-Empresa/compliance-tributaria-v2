/**
 * RiskDashboardV4.tsx — Sprint Z-07 PR #C
 *
 * Dashboard do Sistema de Riscos v4 (engine determinístico).
 * Consome: trpc.risksV4.generateRisks · listRisks · deleteRisk · restoreRisk · approveRisk
 * Arquivo novo — não altera nenhum arquivo existente (ADR-0022).
 */

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  TrendingUp,
  Trash2,
  RotateCcw,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from "lucide-react";
import { Link } from "wouter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERIDADE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  alta: {
    label: "Alta",
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
  },
  media: {
    label: "Média",
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  oportunidade: {
    label: "Oportunidade",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
};

const URGENCIA_LABELS: Record<string, string> = {
  imediata: "Imediata",
  curto_prazo: "Curto Prazo",
  medio_prazo: "Médio Prazo",
};

const CATEGORIA_LABELS: Record<string, string> = {
  imposto_seletivo: "Imposto Seletivo",
  confissao_automatica: "Confissão Automática",
  split_payment: "Split Payment",
  inscricao_cadastral: "Inscrição Cadastral",
  regime_diferenciado: "Regime Diferenciado",
  transicao_iss_ibs: "Transição ISS/IBS",
  obrigacao_acessoria: "Obrigação Acessória",
  aliquota_zero: "Alíquota Zero",
  aliquota_reduzida: "Alíquota Reduzida",
  credito_presumido: "Crédito Presumido",
};

// ─── Sub-componente: RiskCard ─────────────────────────────────────────────────

interface RiskCardProps {
  risk: {
    id: string;
    project_id: number;
    rule_id: string;
    categoria: string;
    titulo: string;
    artigo: string;
    severidade: string;
    urgencia: string;
    status: string;
    approved_at?: string | null;
    approved_by?: number | null;
    actionPlans?: { id: string; titulo: string; status: string }[];
  };
  canApprove: boolean;
  onDelete: (id: string, reason: string) => void;
  onRestore: (id: string) => void;
  onApprove: (id: string) => void;
}

function RiskCard({ risk, canApprove, onDelete, onRestore, onApprove }: RiskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const sev = SEVERIDADE_CONFIG[risk.severidade] ?? SEVERIDADE_CONFIG.media;
  const isDeleted = risk.status === "deleted";
  const isApproved = !!risk.approved_at;

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isDeleted
          ? "opacity-50 border-dashed border-muted-foreground/30 bg-muted/20"
          : "border-border bg-card"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sev.color}`}
            >
              {sev.icon}
              {sev.label}
            </span>
            <Badge variant="outline" className="text-xs">
              {CATEGORIA_LABELS[risk.categoria] ?? risk.categoria}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {URGENCIA_LABELS[risk.urgencia] ?? risk.urgencia}
            </Badge>
            {isApproved && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Aprovado
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground line-clamp-2">{risk.titulo}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Art. {risk.artigo} · Rule: {risk.rule_id}
          </p>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          {!isDeleted && (
            <>
              {canApprove && !isApproved && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  title="Aprovar risco"
                  onClick={() => onApprove(risk.id)}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
              )}
              {(risk.actionPlans?.length ?? 0) > 0 && (
                <Link href={`/projetos/${risk.project_id}/planos-v4?riskId=${risk.id}`}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Ver planos de ação"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Excluir risco"
                onClick={() => setDeleting(!deleting)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {isDeleted && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Restaurar risco"
              onClick={() => onRestore(risk.id)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Inline delete reason */}
      {deleting && (
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 text-xs rounded border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Motivo da exclusão (obrigatório)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs"
            disabled={!deleteReason.trim()}
            onClick={() => {
              onDelete(risk.id, deleteReason);
              setDeleting(false);
              setDeleteReason("");
            }}
          >
            Confirmar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setDeleting(false)}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Planos de ação expandidos */}
      {expanded && (risk.actionPlans?.length ?? 0) > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            Planos de ação ({risk.actionPlans!.length})
          </p>
          {risk.actionPlans!.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center justify-between rounded bg-muted/40 px-2.5 py-1.5"
            >
              <span className="text-xs text-foreground line-clamp-1">{plan.titulo}</span>
              <Badge variant="outline" className="text-xs ml-2 shrink-0">
                {plan.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface RiskDashboardV4Props {
  projectId: number;
}

export function RiskDashboardV4({ projectId }: RiskDashboardV4Props) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const canApprove =
    user?.role === "equipe_solaris" || user?.role === "advogado_senior";

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data, isLoading, error } = trpc.risksV4.listRisks.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // ── Mutations ──────────────────────────────────────────────────────────────
  const deleteMutation = trpc.risksV4.deleteRisk.useMutation({
    onSuccess: () => utils.risksV4.listRisks.invalidate({ projectId }),
  });

  const restoreMutation = trpc.risksV4.restoreRisk.useMutation({
    onSuccess: () => utils.risksV4.listRisks.invalidate({ projectId }),
  });

  const approveMutation = trpc.risksV4.approveRisk.useMutation({
    onSuccess: () => utils.risksV4.listRisks.invalidate({ projectId }),
  });
  // generateRisks — consumidor obrigatório da procedure (Gate FC) — mantido para compatibilidade
  const generateMutation = trpc.risksV4.generateRisks.useMutation({
    onSuccess: () => utils.risksV4.listRisks.invalidate({ projectId }),
  });

  // Sprint Z-10 PR #B — Pipeline 3 passos: analyzeGaps → mapGapsToRules → generateRisksFromGaps
  const [reviewQueue, setReviewQueue] = useState<Array<{ gapId: string; status: string; ruleCode: string | null; categoria: string | null; reason: string }>>([]);
  const [pipelineStats, setPipelineStats] = useState<{ total: number; mapped: number; ambiguous: number; unmapped: number } | null>(null);

  const mapGapsMutation = trpc.risksV4.mapGapsToRules.useMutation();
  const generateFromGapsMutation = trpc.risksV4.generateRisksFromGaps.useMutation({
    onSuccess: () => utils.risksV4.listRisks.invalidate({ projectId }),
  });
  const analyzeGapsMutation = trpc.gapEngine.analyzeGaps.useMutation({
    onError: (err) => toast.error("Erro ao analisar gaps", { description: err.message }),
    onSuccess: async (result) => {
      const gapInputs = (result.gaps ?? []).map((g: any) => ({
        id: g.requirement_id,
        canonicalId: g.requirement_id,
        gapStatus: (g.compliance_status === "nao_atendido" ? "nao_compliant"
          : g.compliance_status === "parcialmente_atendido" ? "parcial"
          : g.compliance_status === "nao_aplicavel" ? "nao_aplicavel"
          : "compliant") as "nao_compliant" | "parcial" | "nao_aplicavel" | "compliant",
        gapSeverity: (g.criticality === "critica" ? "critica"
          : g.criticality === "alta" ? "alta"
          : g.criticality === "media" ? "media" : "baixa") as "critica" | "alta" | "media" | "baixa",
        gapType: g.gap_type ?? "normativo",
        area: g.domain ?? "",
        descricao: g.gap_description ?? "",
        sourceOrigin: "solaris" as const,
        requirementId: g.requirement_id,
        sourceReference: g.source_reference ?? "",
        domain: g.domain ?? "",
        layer: g.layer ?? "corporativo",
      }));
      if (gapInputs.length === 0) return;
      const mapped = await mapGapsMutation.mutateAsync({ projectId, gaps: gapInputs });
      setReviewQueue(mapped.reviewQueue ?? []);
      setPipelineStats(mapped.stats ?? null);
      if ((mapped.mappedRules ?? []).length > 0) {
        await generateFromGapsMutation.mutateAsync({ projectId, mappedRules: mapped.mappedRules });
      }
    },
  });
  const isGenerating = analyzeGapsMutation.isPending || mapGapsMutation.isPending || generateFromGapsMutation.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando riscos v4…</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Erro ao carregar riscos: {error.message}</AlertDescription>
      </Alert>
    );
  }

  const risks = data?.risks ?? [];
  const active = risks.filter((r) => r.status === "active");
  const deleted = risks.filter((r) => r.status === "deleted");

  const byCategory = active.reduce<Record<string, number>>((acc, r) => {
    acc[r.severidade] = (acc[r.severidade] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* ── Sumário ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["alta", "media", "oportunidade"] as const).map((sev) => {
          const cfg = SEVERIDADE_CONFIG[sev];
          const count = byCategory[sev] ?? 0;
          return (
            <Card key={sev} className="border-border">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-full ${cfg.color}`}>{cfg.icon}</span>
                  <div>
                    <p className="text-xl font-bold text-foreground">{count}</p>
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-full bg-muted text-muted-foreground">
                <Trash2 className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-xl font-bold text-foreground">{deleted.length}</p>
                <p className="text-xs text-muted-foreground">Excluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Lista de riscos ativos ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            Riscos Ativos — v4
            <Badge variant="secondary" className="ml-auto text-xs">
              {active.length} riscos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {active.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted-foreground">
                Nenhum risco ativo. Gere os riscos v4 a partir do diagnóstico.
              </p>
              {/* Pipeline Z-10: analyzeGaps → mapGapsToRules → generateRisksFromGaps */}
              <Button
                size="sm"
                variant="outline"
                disabled={isGenerating}
                onClick={() => analyzeGapsMutation.mutate({ project_id: projectId, dry_run: false })}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    {analyzeGapsMutation.isPending ? "Analisando gaps…"
                      : mapGapsMutation.isPending ? "Mapeando regras…"
                      : "Gerando riscos…"}
                  </>
                ) : (
                  <><ShieldAlert className="h-3.5 w-3.5 mr-1.5" />Gerar Riscos v4</>
                )}
              </Button>
              {/* Review Queue — visível ao advogado quando há itens ambíguos */}
              {reviewQueue.length > 0 && (
                <div className="mt-3 w-full rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-2">
                    Fila de revisão ({reviewQueue.length} itens ambíguos)
                  </p>
                  <div className="space-y-1">
                    {reviewQueue.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[60%]">{item.gapId}</span>
                        <Badge variant="outline" className="text-xs">{item.status}</Badge>
                      </div>
                    ))}
                  </div>
                  {pipelineStats && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Total: {pipelineStats.total} · Mapeados: {pipelineStats.mapped} · Ambíguos: {pipelineStats.ambiguous} · Sem categoria: {pipelineStats.unmapped}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            active.map((risk) => (
              <RiskCard
                key={risk.id}
                risk={risk as any}
                canApprove={canApprove}
                onDelete={(id, reason) => deleteMutation.mutate({ riskId: id, reason })}
                onRestore={(id) => restoreMutation.mutate({ riskId: id })}
                onApprove={(id) => approveMutation.mutate({ riskId: id })}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Riscos excluídos (collapsible) ── */}
      {deleted.length > 0 && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Trash2 className="h-3.5 w-3.5" />
              Riscos Excluídos ({deleted.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {deleted.map((risk) => (
              <RiskCard
                key={risk.id}
                risk={risk as any}
                canApprove={false}
                onDelete={() => {}}
                onRestore={(id) => restoreMutation.mutate({ riskId: id })}
                onApprove={() => {}}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RiskDashboardV4;
