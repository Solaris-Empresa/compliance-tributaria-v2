/**
 * RiskDashboardV4.tsx — Sprint Z-07 PR #C → Sprint Z-12 UX Spec
 *
 * Dashboard do Sistema de Riscos v4 (engine determinístico).
 * Consome: trpc.risksV4.generateRisks · listRisks · deleteRisk · restoreRisk · approveRisk
 *
 * Z-12: Tabs (Riscos/Oportunidades/Histórico), breadcrumb 4 nós, evidence panel,
 *       modais approve/delete, filtros severidade+categoria, skeleton, toasts.
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Plus,
  Download,
} from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EvidenceItem {
  fonte?: string;
  prioridade?: string;
  pergunta?: string;
  resposta?: string;
  confianca?: number;
  [key: string]: unknown;
}

interface RiskData {
  id: string;
  project_id: number;
  rule_id: string;
  type: "risk" | "opportunity";
  categoria: string;
  titulo: string;
  descricao?: string | null;
  artigo: string;
  severidade: string;
  urgencia: string;
  status: string;
  source_priority: string;
  evidence: EvidenceItem[] | string;
  breadcrumb: [string, string, string, string] | string;
  confidence: number;
  approved_at?: string | null;
  approved_by?: number | null;
  deleted_reason?: string | null;
  actionPlans?: { id: string; titulo: string; status: string; responsavel?: string }[];
  rag_validated?: number;
  rag_artigo_exato?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEVERIDADE_CONFIG: Record<string, { label: string; color: string; borderColor: string; icon: React.ReactNode }> = {
  alta: {
    label: "Alta",
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
    borderColor: "border-l-red-500",
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
  },
  media: {
    label: "Média",
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    borderColor: "border-l-amber-500",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  oportunidade: {
    label: "Oportunidade",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    borderColor: "border-l-teal-500",
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

const CATEGORIA_ARTIGOS: Record<string, string> = {
  imposto_seletivo: "Art. 393 LC 214/2025",
  confissao_automatica: "Art. 45 LC 214/2025",
  split_payment: "Art. 29 LC 214/2025",
  inscricao_cadastral: "Art. 21 LC 214/2025",
  regime_diferenciado: "Art. 258 LC 214/2025",
  transicao_iss_ibs: "Arts. 6-12 LC 214/2025",
  obrigacao_acessoria: "Art. 88 LC 214/2025",
  aliquota_zero: "Art. 125 LC 214/2025",
  aliquota_reduzida: "Art. 120 LC 214/2025",
  credito_presumido: "Art. 185 LC 214/2025",
};

const SOURCE_LABELS: Record<string, string> = {
  cnae: "CNAE",
  ncm: "NCM",
  nbs: "NBS",
  solaris: "Solaris",
  iagen: "IA Gen",
};

function parseEvidence(raw: EvidenceItem[] | string): EvidenceItem[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw as string) as EvidenceItem[]; } catch { return []; }
}

function parseBreadcrumb(raw: [string, string, string, string] | string): [string, string, string, string] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw as string) as [string, string, string, string]; } catch { return ["", "", "", ""]; }
}

// ─── Sub-componente: Breadcrumb4 ─────────────────────────────────────────────

function Breadcrumb4({ breadcrumb }: { breadcrumb: [string, string, string, string] }) {
  const [fonte, categoria, artigo, ruleId] = breadcrumb;
  const chips: { label: string; value: string; color: string; tooltip: string }[] = [
    { label: SOURCE_LABELS[fonte] ?? fonte, value: fonte, color: "bg-blue-100 text-blue-700", tooltip: `Fonte: ${fonte}` },
    { label: CATEGORIA_LABELS[categoria] ?? categoria, value: categoria, color: "bg-purple-100 text-purple-700", tooltip: `Categoria: ${CATEGORIA_LABELS[categoria] ?? categoria}` },
    { label: `Art. ${artigo}`, value: artigo, color: "bg-green-100 text-green-700", tooltip: `Artigo: ${artigo}` },
    { label: ruleId, value: ruleId, color: "bg-gray-100 text-gray-600", tooltip: `Rule ID: ${ruleId}` },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {chips.map((chip, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground text-[10px]">›</span>}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${chip.color}`}>
                {chip.label}
              </span>
            </TooltipTrigger>
            <TooltipContent>{chip.tooltip}</TooltipContent>
          </Tooltip>
        </span>
      ))}
    </div>
  );
}

// ─── Sub-componente: EvidencePanel ───────────────────────────────────────────

function EvidencePanel({ evidence }: { evidence: EvidenceItem[] }) {
  const [expanded, setExpanded] = useState(evidence.length <= 2);

  if (evidence.length === 0) return null;

  const visible = expanded ? evidence : evidence.slice(0, 2);

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Evidências ({evidence.length})
      </p>
      {visible.map((ev, i) => (
        <div key={i} className="rounded bg-muted/40 px-2.5 py-2 text-xs space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            {ev.fonte && <Badge variant="outline" className="text-[10px]">{ev.fonte}</Badge>}
            {ev.prioridade && <Badge variant="secondary" className="text-[10px]">{ev.prioridade}</Badge>}
            {ev.confianca != null && (
              <span className="text-muted-foreground text-[10px]">
                Confiança: {(Number(ev.confianca) * 100).toFixed(0)}%
              </span>
            )}
          </div>
          {ev.pergunta && <p className="text-muted-foreground"><span className="font-medium text-foreground">P:</span> {ev.pergunta}</p>}
          {ev.resposta && <p className="text-muted-foreground"><span className="font-medium text-foreground">R:</span> {ev.resposta}</p>}
        </div>
      ))}
      {evidence.length > 2 && (
        <Button variant="ghost" size="sm" className="h-6 text-xs w-full" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Recolher" : `Ver mais ${evidence.length - 2} evidências`}
          {expanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
        </Button>
      )}
    </div>
  );
}

// ─── Sub-componente: RiskCard ────────────────────────────────────────────────

interface RiskCardProps {
  risk: RiskData;
  canApprove: boolean;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onApprove: (id: string) => void;
  onNewPlan?: (risk: RiskData) => void;
  showRestore?: boolean;
}

function RiskCard({ risk, canApprove, onDelete, onRestore, onApprove, onNewPlan, showRestore }: RiskCardProps) {
  const [expanded, setExpanded] = useState(false);

  const sev = SEVERIDADE_CONFIG[risk.severidade] ?? SEVERIDADE_CONFIG.media;
  const isDeleted = risk.status === "deleted";
  const isApproved = !!risk.approved_at;
  const borderColor = isApproved ? "border-l-green-500" : sev.borderColor;
  const evidence = parseEvidence(risk.evidence);
  const breadcrumb = parseBreadcrumb(risk.breadcrumb);

  return (
    <div
      data-testid={risk.type === "opportunity" ? "opportunity-card" : "risk-card"}
      className={`rounded-lg border border-l-4 p-4 transition-colors ${borderColor} ${
        isDeleted
          ? "opacity-50 border-dashed border-r-muted-foreground/30 border-t-muted-foreground/30 border-b-muted-foreground/30 bg-muted/20"
          : "border-r-border border-t-border border-b-border bg-card"
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
            {!isApproved && !isDeleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                Aguardando aprovação
              </span>
            )}
            {isApproved && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="h-3 w-3" />
                Aprovado
              </span>
            )}
            <Badge variant="secondary" className="text-xs">
              {URGENCIA_LABELS[risk.urgencia] ?? risk.urgencia}
            </Badge>
            {risk.type !== "opportunity" && (
              risk.rag_validated === 1 ? (
                <span
                  data-testid="rag-badge-validated"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                  title={risk.rag_artigo_exato ?? ""}
                >
                  RAG ✓
                </span>
              ) : (
                <span
                  data-testid="rag-badge-pending"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200"
                >
                  Não validado
                </span>
              )
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground line-clamp-2" data-testid="risk-title">{risk.titulo}</p>
          {/* Breadcrumb 4 nós */}
          <div className="mt-1" data-testid="risk-legal-basis">
            <Breadcrumb4 breadcrumb={breadcrumb} />
          </div>
          {/* Plans preview inline — #601 */}
          {risk.type !== "opportunity" && (risk.actionPlans?.length ?? 0) > 0 && (
            <div data-testid="plans-preview" className="mt-2 space-y-0.5">
              {risk.actionPlans!.map((p, i) => (
                <div data-testid="plan-preview-row" key={p.id ?? i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${p.status === "aprovado" ? "bg-green-500" : p.status === "em_andamento" ? "bg-blue-500" : "bg-amber-400"}`} />
                  <span className="line-clamp-1">{p.titulo}</span>
                </div>
              ))}
            </div>
          )}
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
                  data-testid="approve-risk-button"
                  onClick={() => onApprove(risk.id)}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
              )}
              {onNewPlan && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  title="Criar plano de ação"
                  data-testid="create-action-plan-button"
                  onClick={() => onNewPlan(risk)}
                >
                  <Plus className="h-3.5 w-3.5" />
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
                data-testid="delete-risk-button"
                onClick={() => onDelete(risk.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {showRestore && isDeleted && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Restaurar risco"
              data-testid="restore-risk-button"
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

      {/* Expanded: Evidence + Action Plans */}
      {expanded && (
        <>
          <EvidencePanel evidence={evidence} />
          {(risk.actionPlans?.length ?? 0) > 0 && (
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
        </>
      )}
    </div>
  );
}

// ─── Sub-componente: NewPlanModal ────────────────────────────────────────────

const PRAZO_OPTIONS = [
  { value: "30_dias", label: "30 dias" },
  { value: "60_dias", label: "60 dias" },
  { value: "90_dias", label: "90 dias" },
] as const;

function NewPlanModal({
  risk,
  projectId,
  onClose,
  onSuccess,
}: {
  risk: RiskData;
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [prazo, setPrazo] = useState<string>("");
  const [descricao, setDescricao] = useState("");

  const breadcrumb = parseBreadcrumb(risk.breadcrumb);
  const isValid = titulo.length >= 5 && responsavel.length > 0 && prazo.length > 0;

  const createPlan = trpc.risksV4.upsertActionPlan.useMutation({
    onSuccess: () => {
      toast.success("Plano criado", {
        description: "Ver plano na página de ações.",
        action: {
          label: "Ver plano",
          onClick: () => {
            window.location.href = `/projetos/${projectId}/planos-v4?riskId=${risk.id}`;
          },
        },
        duration: 5000,
      });
      onSuccess();
      onClose();
    },
    onError: (err) =>
      toast.error("Erro ao criar plano", { description: err.message, duration: 6000 }),
  });

  const handleSubmit = () => {
    if (!isValid) return;
    createPlan.mutate({
      projectId,
      riskId: risk.id,
      titulo,
      responsavel,
      prazo: prazo as "30_dias" | "60_dias" | "90_dias",
      descricao: descricao || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="action-plan-modal">
        <DialogHeader>
          <DialogTitle>Novo plano de ação</DialogTitle>
          <DialogDescription>
            Vinculado: {risk.rule_id} · {risk.titulo.slice(0, 50)}{risk.titulo.length > 50 ? "…" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-3">
          <Breadcrumb4 breadcrumb={breadcrumb} />
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="plan-titulo">Título *</Label>
            <Input
              id="plan-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título do plano (min 5 caracteres)"
              maxLength={500}
            />
            {titulo.length > 0 && titulo.length < 5 && (
              <p className="text-xs text-destructive mt-1">Título muito curto</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="plan-responsavel">Responsável *</Label>
              <Input
                id="plan-responsavel"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
            <div>
              <Label htmlFor="plan-prazo">Prazo *</Label>
              <Select value={prazo} onValueChange={setPrazo}>
                <SelectTrigger id="plan-prazo">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PRAZO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="plan-descricao">Descrição (opcional)</Label>
            <Textarea
              id="plan-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição do plano de ação"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || createPlan.isPending}>
            {createPlan.isPending ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Criando...</>
            ) : (
              "Criar plano"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

interface RiskDashboardV4Props {
  projectId: number;
}

export function RiskDashboardV4({ projectId }: RiskDashboardV4Props) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const canApprove =
    user?.role === "equipe_solaris" || user?.role === "advogado_senior";

  // ── State ─────────────────────────────────────────────────────────────────
  const [filterSeveridade, setFilterSeveridade] = useState<string>("todos");
  const [filterCategoria, setFilterCategoria] = useState<string>("todos");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [approveTarget, setApproveTarget] = useState<RiskData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RiskData | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [newPlanTarget, setNewPlanTarget] = useState<RiskData | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading, error } = trpc.risksV4.listRisks.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // ── Audit log query ───────────────────────────────────────────────────────
  const auditLogQuery = trpc.risksV4.getProjectAuditLog.useQuery(
    { projectId, limit: 50 },
    { enabled: !!projectId }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const deleteMutation = trpc.risksV4.deleteRisk.useMutation({
    onSuccess: (_data, variables) => {
      utils.risksV4.listRisks.invalidate({ projectId });
      toast("Risco excluído", {
        description: "O risco foi movido para o histórico.",
        action: {
          label: "Desfazer",
          onClick: () => restoreMutation.mutate({ riskId: variables.riskId }),
        },
        duration: 5000,
      });
    },
    onError: (err) => toast.error("Erro ao excluir risco", { description: err.message, duration: 6000 }),
  });

  const restoreMutation = trpc.risksV4.restoreRisk.useMutation({
    onSuccess: () => {
      utils.risksV4.listRisks.invalidate({ projectId });
      toast.success("Risco restaurado", { duration: 3000 });
    },
    onError: (err) => toast.error("Erro ao restaurar risco", { description: err.message, duration: 6000 }),
  });

  const approveMutation = trpc.risksV4.approveRisk.useMutation({
    onSuccess: () => {
      utils.risksV4.listRisks.invalidate({ projectId });
      toast.success("Risco aprovado com sucesso", { duration: 3000 });
    },
    onError: (err) => toast.error("Erro ao aprovar risco", { description: err.message, duration: 6000 }),
  });

  const bulkGenerateActionPlansMutation = trpc.risksV4.bulkGenerateActionPlans.useMutation({
    onSuccess: (data) => {
      utils.risksV4.listRisks.invalidate({ projectId });
      const msg = data.generated > 0
        ? `${data.generated} plano(s) e ${(data as any).tasksGenerated ?? 0} tarefa(s) gerados`
        : "Planos já existiam — navegando para planos";
      toast.success(msg, { duration: 4000 });
      // Sprint Z-17 #668: redirect imediato (sem setTimeout)
      window.location.href = `/projetos/${projectId}/planos-v4`;
    },
    onError: () => toast.error("Erro ao gerar planos de ação", { description: "Verifique os riscos aprovados", duration: 6000 }),
  });

  const bulkApproveMutation = trpc.risksV4.bulkApprove.useMutation({
    onSuccess: (data) => {
      utils.risksV4.listRisks.invalidate({ projectId });
      toast.success(`${data.approved} riscos aprovados com sucesso`, { duration: 3000 });
      setShowBulkConfirm(false);
      // Sprint Z-17 #668: NÃO chama bulkGenerateActionPlans aqui
      // Advogado decide quando gerar planos via botão "Ver Planos de Ação"
    },
    onError: () => toast.error("Erro ao aprovar riscos", { description: "Tentar novamente", duration: 6000 }),
  });

  const generateMutation = trpc.risksV4.generateRisks.useMutation({
    onSuccess: () => utils.risksV4.listRisks.invalidate({ projectId }),
  });

  // Sprint Z-10 PR #B — Pipeline 3 passos
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
        // B-Z13-004: risk_category_code → categoria para o GapToRuleMapper (Caso A)
        categoria: g.risk_category_code ?? undefined,
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

  // ── Auto-generate on first load (B-01: trigger pos-briefing) ────────────
  const hasAutoTriggered = useRef(false);

  // ── Derived data ──────────────────────────────────────────────────────────
  const allRisks = (data?.risks ?? []) as unknown as RiskData[];

  const activeRisks = allRisks.filter((r) => r.status === "active" && r.type === "risk");
  const opportunities = allRisks.filter((r) => r.status === "active" && r.type === "opportunity");
  const deleted = allRisks.filter((r) => r.status === "deleted");

  // ── Export CSV (#783) ─────────────────────────────────────────────────────
  // Gera CSV com BOM UTF-8 (Excel detecta acentos) — mesmo padrão usado em
  // ProjectHistoryTimeline (#777). Ordem respeita a lista visível na UI.
  const handleExportRisksCsv = () => {
    if (!allRisks || allRisks.length === 0) return;
    const toCell = (v: unknown): string => {
      if (v === null || v === undefined) return "";
      if (typeof v === "object") {
        try { return JSON.stringify(v); } catch { return String(v); }
      }
      return String(v);
    };
    const formatBreadcrumb = (b: RiskData["breadcrumb"]): string => {
      if (Array.isArray(b)) return b.join(" > ");
      return typeof b === "string" ? b : "";
    };
    const formatEvidence = (e: RiskData["evidence"]): string => {
      if (Array.isArray(e)) {
        return e.map((x: any) => `${x?.artigo ?? ""}: ${x?.trecho ?? ""}`).join(" | ");
      }
      return typeof e === "string" ? e : "";
    };
    const header = [
      "id", "tipo", "categoria", "titulo", "descricao",
      "artigo", "severidade", "urgencia", "status",
      "source_priority", "breadcrumb",
      "rag_validated", "rag_artigo_exato",
      "evidence", "approved_at",
    ];
    const rows = allRisks.map((r) => [
      r.id,
      r.type,
      r.categoria,
      r.titulo,
      r.descricao ?? "",
      r.artigo,
      r.severidade,
      r.urgencia,
      r.status,
      r.source_priority,
      formatBreadcrumb(r.breadcrumb),
      r.rag_validated ? "sim" : "nao",
      r.rag_artigo_exato ?? "",
      formatEvidence(r.evidence),
      r.approved_at ?? "",
    ].map(toCell));

    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const bom = "\uFEFF"; // UTF-8 BOM para Excel
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riscos-projeto-${projectId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${allRisks.length} ${allRisks.length === 1 ? "risco exportado" : "riscos exportados"} para CSV.`);
  };

  // B-01: Auto-generate risks when arriving from briefing with empty dashboard
  // Fix: usar activeRisks.length (não allRisks.length) para ignorar riscos deletados
  // e disparar corretamente quando não há riscos ativos, mesmo que existam registros
  // deletados de gerações anteriores.
  useEffect(() => {
    if (
      !isLoading &&
      !hasAutoTriggered.current &&
      activeRisks.length === 0 &&
      !isGenerating
    ) {
      hasAutoTriggered.current = true;
      analyzeGapsMutation.mutate({ project_id: projectId, dry_run: false });
    }
  }, [isLoading, activeRisks.length, isGenerating]);

  // Category distribution for filter chips
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of activeRisks) {
      counts[r.categoria] = (counts[r.categoria] ?? 0) + 1;
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [activeRisks]);

  const visibleCategories = showAllCategories ? categoryDistribution : categoryDistribution.slice(0, 5);

  // Filtered risks for the Riscos tab
  const filteredRisks = useMemo(() => {
    return activeRisks
      .filter((r) => filterSeveridade === "todos" || r.severidade === filterSeveridade)
      .filter((r) => filterCategoria === "todos" || r.categoria === filterCategoria);
  }, [activeRisks, filterSeveridade, filterCategoria]);

  // KPI summary
  const byCategory = activeRisks.reduce<Record<string, number>>((acc, r) => {
    acc[r.severidade] = (acc[r.severidade] ?? 0) + 1;
    return acc;
  }, {});

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleApproveConfirm() {
    if (!approveTarget) return;
    approveMutation.mutate({ riskId: approveTarget.id });
    setApproveTarget(null);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget || deleteReason.length < 10) return;
    deleteMutation.mutate({ riskId: deleteTarget.id, reason: deleteReason });
    setDeleteTarget(null);
    setDeleteReason("");
  }

  // ── Render: Loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[120px] rounded-lg" />
        <Skeleton className="h-[120px] rounded-lg" />
        <Skeleton className="h-[120px] rounded-lg" />
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

  // ── Render: Main ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" data-testid="risk-dashboard-page">
      {/* ── SummaryBar (3 cards sticky) ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pb-3 -mx-1 px-1 pt-1" data-testid="summary-bar">
        <div className="grid grid-cols-3 gap-3">
          {([
            { key: "alta", count: activeRisks.filter((r) => r.severidade === "alta").length, label: "Alta", color: "bg-red-100 text-red-700", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
            { key: "media", count: activeRisks.filter((r) => r.severidade === "media").length, label: "Média", color: "bg-amber-100 text-amber-700", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
            { key: "opps", count: opportunities.length, label: "Oportunidades", color: "bg-emerald-100 text-emerald-700", icon: <TrendingUp className="h-3.5 w-3.5" /> },
          ] as const).map((item) => (
            <Card key={item.key} className="border-border" data-testid={`summary-count-${item.key === "opps" ? "oportunidade" : item.key}`}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-full ${item.color}`}>{item.icon}</span>
                  <div>
                    <p className="text-xl font-bold text-foreground">{item.count}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Banner condicional — N aguardando */}
        {activeRisks.filter((r) => !r.approved_at).length > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-3 py-2">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              {activeRisks.filter((r) => !r.approved_at).length} itens aguardando sua análise
            </p>
            <Button size="sm" variant="outline" className="text-xs h-7" data-testid="bulk-approve-button" onClick={() => setShowBulkConfirm(true)}>
              Aprovar matriz de riscos
            </Button>
          </div>
        )}

        {/* Sprint Z-17 #668: Botão "Ver Planos de Ação" condicional + #783 Exportar Riscos */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {activeRisks.some((r) => r.approved_at) ? (
            <Button
              data-testid="btn-ver-planos"
              size="sm"
              onClick={() => bulkGenerateActionPlansMutation.mutate({ projectId })}
              disabled={bulkGenerateActionPlansMutation.isPending}
            >
              {bulkGenerateActionPlansMutation.isPending
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Gerando planos e tarefas...</>
                : "Ver Planos de Ação"}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" disabled data-testid="btn-ver-planos">
                    Ver Planos de Ação
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Aprove pelo menos um risco</TooltipContent>
            </Tooltip>
          )}
          {/* #783: Exportar Riscos (CSV) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportRisksCsv}
            disabled={allRisks.length === 0}
            data-testid="btn-export-riscos-csv"
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar Riscos
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="riscos">
        <TabsList>
          <TabsTrigger value="riscos">Riscos ({activeRisks.length})</TabsTrigger>
          <TabsTrigger value="oportunidades">Oportunidades ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="historico" data-testid="history-tab">Histórico ({deleted.length})</TabsTrigger>
        </TabsList>

        {/* ── Tab: Riscos ── */}
        <TabsContent value="riscos">
          {/* Filtros */}
          <div className="space-y-2 mb-4 mt-2">
            {/* Severidade */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Severidade:</span>
              {["todos", "alta", "media"].map((sev) => (
                <button
                  key={sev}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filterSeveridade === sev
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/50"
                  }`}
                  onClick={() => setFilterSeveridade(sev)}
                >
                  {sev === "todos" ? "Todos" : SEVERIDADE_CONFIG[sev]?.label ?? sev}
                </button>
              ))}
            </div>
            {/* Categoria */}
            {categoryDistribution.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">Categoria:</span>
                <button
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filterCategoria === "todos"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/50"
                  }`}
                  onClick={() => setFilterCategoria("todos")}
                >
                  Todos
                </button>
                {visibleCategories.map(([cat, count]) => (
                  <button
                    key={cat}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      filterCategoria === cat
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-background text-muted-foreground border-border hover:border-purple-400"
                    }`}
                    onClick={() => setFilterCategoria(cat)}
                  >
                    {CATEGORIA_LABELS[cat] ?? cat} ({count})
                  </button>
                ))}
                {categoryDistribution.length > 5 && (
                  <button
                    className="px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground border border-dashed border-border hover:border-foreground/50"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                  >
                    {showAllCategories ? "−menos" : `+${categoryDistribution.length - 5} mais`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Risk list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                Riscos Ativos
                <Badge variant="secondary" className="ml-auto text-xs">
                  {filteredRisks.length} de {activeRisks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {activeRisks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="rounded-full bg-muted p-4">
                    <ShieldAlert className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhum risco ativo. Gere os riscos v4 a partir do diagnóstico.
                  </p>
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
              ) : filteredRisks.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhum risco corresponde aos filtros selecionados.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => { setFilterSeveridade("todos"); setFilterCategoria("todos"); }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                (() => {
                  const SEVERITY_ORDER = ["alta", "media", "oportunidade"];
                  const grouped = filteredRisks.reduce<Record<string, typeof filteredRisks>>((acc, r) => {
                    const key = r.categoria;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(r);
                    return acc;
                  }, {});
                  const sortedCats = Object.keys(grouped).sort((a, b) => {
                    const sevA = grouped[a][0]?.severidade ?? "media";
                    const sevB = grouped[b][0]?.severidade ?? "media";
                    return SEVERITY_ORDER.indexOf(sevA) - SEVERITY_ORDER.indexOf(sevB);
                  });
                  return sortedCats.map((cat) => (
                    <div key={`group-${cat}`}>
                      <div data-testid="cat-divider" className="flex items-center gap-2 py-2 px-1 text-xs text-muted-foreground border-b border-border mb-2">
                        <span data-testid="cat-divider-label" className="font-semibold text-foreground">
                          {CATEGORIA_LABELS[cat] ?? cat}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{CATEGORIA_ARTIGOS[cat] ?? ""}</span>
                        <span className="text-muted-foreground">·</span>
                        <span data-testid="cat-divider-count">
                          {grouped[cat].length} risco{grouped[cat].length > 1 ? "s" : ""}
                        </span>
                      </div>
                      {grouped[cat].map((risk) => (
                        <RiskCard
                          key={risk.id}
                          risk={risk}
                          canApprove={canApprove}
                          onDelete={(id) => setDeleteTarget(allRisks.find((r) => r.id === id) ?? null)}
                          onRestore={(id) => restoreMutation.mutate({ riskId: id })}
                          onApprove={(id) => setApproveTarget(allRisks.find((r) => r.id === id) ?? null)}
                          onNewPlan={(r) => setNewPlanTarget(r)}
                        />
                      ))}
                    </div>
                  ));
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Oportunidades ── */}
        <TabsContent value="oportunidades">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-500" />
                Oportunidades
                <Badge variant="secondary" className="ml-auto text-xs">
                  {opportunities.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {opportunities.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="rounded-full bg-muted p-4">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhuma oportunidade identificada.
                  </p>
                </div>
              ) : (
                opportunities.map((risk) => (
                  <RiskCard
                    key={risk.id}
                    risk={risk}
                    canApprove={canApprove}
                    onDelete={(id) => setDeleteTarget(allRisks.find((r) => r.id === id) ?? null)}
                    onRestore={(id) => restoreMutation.mutate({ riskId: id })}
                    onApprove={(id) => setApproveTarget(allRisks.find((r) => r.id === id) ?? null)}
                    onNewPlan={(r) => setNewPlanTarget(r)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Histórico ── */}
        <TabsContent value="historico" className="space-y-4">
          {/* Riscos excluídos */}
          <Card className="border-dashed border-muted-foreground/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5" />
                Riscos Excluídos ({deleted.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {deleted.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="rounded-full bg-muted p-4">
                    <RotateCcw className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhum risco excluído.
                  </p>
                </div>
              ) : (
                deleted.map((risk) => (
                  <RiskCard
                    key={risk.id}
                    risk={risk}
                    canApprove={false}
                    onDelete={() => {}}
                    onRestore={(id) => restoreMutation.mutate({ riskId: id })}
                    onApprove={() => {}}
                    showRestore
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Audit log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5" />
                Registro de Auditoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              ) : (auditLogQuery.data?.entries ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum registro de auditoria.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {(auditLogQuery.data?.entries ?? []).map((entry: any, i: number) => (
                    <div key={entry.id ?? i} className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {entry.action}
                      </Badge>
                      <span className="text-muted-foreground">{entry.entity ?? entry.entity_type}</span>
                      <span className="text-foreground font-medium ml-auto shrink-0">
                        {entry.user_name ?? "sistema"}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {entry.created_at ? new Date(entry.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modal: Aprovar em lote ── */}
      <AlertDialog open={showBulkConfirm} onOpenChange={(open) => { if (!open) setShowBulkConfirm(false); }}>
        <AlertDialogContent data-testid="bulk-approve-confirm-modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar matriz de riscos</AlertDialogTitle>
            <AlertDialogDescription>
              Você está aprovando {activeRisks.filter((r) => !r.approved_at).length} riscos de uma vez.
              Esta ação será registrada com data e hora no histórico de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkApproveMutation.mutate({ projectId })}
              disabled={bulkApproveMutation.isPending}
            >
              {bulkApproveMutation.isPending ? "Aprovando..." : "Confirmar aprovação em lote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal: Novo plano de ação ── */}
      {newPlanTarget && (
        <NewPlanModal
          risk={newPlanTarget}
          projectId={projectId}
          onClose={() => setNewPlanTarget(null)}
          onSuccess={() => utils.risksV4.listRisks.invalidate({ projectId })}
        />
      )}

      {/* ── Modal: Aprovar risco ── */}
      <AlertDialog open={!!approveTarget} onOpenChange={(open) => { if (!open) setApproveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar risco</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma a aprovação do risco abaixo? Esta ação registra seu nome e data no histórico de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {approveTarget && (
            <div className="rounded border border-border bg-muted/40 p-3 my-2">
              <p className="text-sm font-medium">{approveTarget.titulo}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {CATEGORIA_LABELS[approveTarget.categoria] ?? approveTarget.categoria} · Art. {approveTarget.artigo}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApproveConfirm}
            >
              Confirmar aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal: Excluir risco ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir risco</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da exclusão. O risco será movido para o histórico e poderá ser restaurado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="rounded border border-border bg-muted/40 p-3 my-2">
              <p className="text-sm font-medium">{deleteTarget.titulo}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {CATEGORIA_LABELS[deleteTarget.categoria] ?? deleteTarget.categoria} · Art. {deleteTarget.artigo}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <textarea
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Motivo da exclusão (mínimo 10 caracteres)"
              rows={3}
              maxLength={200}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {deleteReason.length < 10
                  ? `Mínimo 10 caracteres (faltam ${10 - deleteReason.length})`
                  : ""}
              </span>
              <span>{deleteReason.length}/200</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={deleteReason.length < 10}
              onClick={handleDeleteConfirm}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default RiskDashboardV4;
