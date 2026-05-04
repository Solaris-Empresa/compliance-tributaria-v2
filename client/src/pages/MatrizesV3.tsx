// @ts-nocheck
import { useState, useEffect } from "react";
import { useAutoSave, loadTempData, clearTempData } from "@/hooks/usePersistenceV3";
import { ResumeBanner } from "@/components/ResumeBanner";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import FlowStepper from "@/components/FlowStepper";
import RetrocessoConfirmModal from "@/components/RetrocessoConfirmModal";
import { statusToCompletedStep } from "@/lib/flowStepperUtils";
import {
  ArrowLeft, ChevronRight, Loader2, Sparkles,
  CheckCircle2, RefreshCw, ThumbsUp, Edit3, AlertTriangle, Info,
  Building2, Cpu, Scale, BarChart3, Download, Plus, Trash2,
  Lock, Unlock, FileSpreadsheet, Layers, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import StepComments from "@/components/StepComments";

// ── Componente: Painel de Diagnóstico de Entrada (3 Camadas) ─────────────────────────────────
function DiagnosticoEntradaPanel({ corporateAnswers, operationalAnswers, cnaeAnswers }: { corporateAnswers?: any; operationalAnswers?: any; cnaeAnswers?: any }) {
  const [open, setOpen] = useState(false);
  const parseAnswers = (raw: any): Record<string, string> => { if (!raw) return {}; try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; } };
  const parseCnae = (raw: any): any[] => { if (!raw) return []; try { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(p) ? p : []; } catch { return []; } };
  const corp = parseAnswers(corporateAnswers); const op = parseAnswers(operationalAnswers); const cnae = parseCnae(cnaeAnswers);
  const total = Object.keys(corp).length + Object.keys(op).length + cnae.reduce((a: number, c: any) => a + Object.keys(c.answers || {}).length, 0);
  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-blue-600" />Diagnóstico de Entrada — 3 Camadas<Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">{total} respostas</Badge></CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Dados que alimentaram a geração desta matriz de riscos</p>
      </CardHeader>
      {open && <CardContent className="space-y-4 pt-0">
        {Object.keys(corp).length > 0 && <div><p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Corporativo (QC)</p><div className="space-y-1">{Object.entries(corp).map(([k, v]) => <div key={k} className="text-xs"><span className="font-medium">{k}:</span> <span className="text-muted-foreground">{String(v)}</span></div>)}</div></div>}
        {Object.keys(op).length > 0 && <div><p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Operacional (QO)</p><div className="space-y-1">{Object.entries(op).map(([k, v]) => <div key={k} className="text-xs"><span className="font-medium">{k}:</span> <span className="text-muted-foreground">{String(v)}</span></div>)}</div></div>}
        {cnae.length > 0 && <div><p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">CNAE Especializado (QCNAE)</p><div className="space-y-3">{cnae.map((item: any, i: number) => <div key={i} className="border-l-2 border-purple-300 pl-3"><p className="text-xs font-semibold">{item.cnaeCode} — {item.cnaeName || item.cnaeDescription || ''}</p><div className="space-y-1 mt-1">{Object.entries((item.answers || {}) as Record<string, unknown>).map(([k, v]) => <div key={k} className="text-xs"><span className="font-medium">{k}:</span> <span className="text-muted-foreground">{String(v)}</span></div>)}</div></div>)}</div></div>}
      </CardContent>}
    </Card>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Risk {
  id: string;
  evento: string;
  probabilidade: "Baixa" | "Média" | "Alta";
  impacto: "Baixo" | "Médio" | "Alto";
  severidade: "Baixa" | "Média" | "Alta" | "Crítica";
  plano_acao: string;
  manual?: boolean; // RF-4.03: indica risco adicionado manualmente
  // G11 — fonte_risco: origem do pipeline que gerou o risco (texto livre, ex: "LC 214/2025, Art. X")
  fonte_risco?: string;
  // M3.7 Item 4: enum estruturado da fonte (canônico — solaris/regulatorio/ia_gen)
  fonte_risco_tipo?: 'solaris' | 'regulatorio' | 'ia_gen' | 'cnae' | 'iagen' | 'v1';
}

const AREAS = [
  { key: "contabilidade", label: "Contabilidade e Fiscal", icon: BarChart3, color: "blue" },
  { key: "negocio", label: "Negócio", icon: Building2, color: "violet" },
  { key: "ti", label: "T.I.", icon: Cpu, color: "cyan" },
  { key: "juridico", label: "Advocacia Tributária", icon: Scale, color: "amber" },
] as const;

// G11 — Badge de origem do risco
// M3.7 Item 4: padronização canônica conforme E2E-3-ONDAS-QUESTIONARIOS-v1.md:79
//   solaris → Onda 1 (Equipe Jurídica)
//   regulatorio → Onda 3 (Legislação via RAG)
//   ia_gen → Onda 2 (Perfil da empresa)
// Entradas legadas (cnae, iagen, v1) preservadas para backward-compat com riscos antigos no banco.
const FONTE_BADGE: Record<string, { label: string; className: string }> = {
  solaris:     { label: 'Equipe técnica SOLARIS', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  regulatorio: { label: 'Legislação',             className: 'bg-green-100 text-green-800 border-green-200' },
  ia_gen:      { label: 'IA Generativa',          className: 'bg-orange-100 text-orange-800 border-orange-200' },
  cnae:        { label: 'Análise setorial',       className: 'bg-green-100 text-green-800 border-green-200' },
  iagen:       { label: 'IA Generativa',          className: 'bg-orange-100 text-orange-800 border-orange-200' },
  v1:          { label: 'Diagnóstico V1',         className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const SEVERITY_COLORS: Record<string, string> = {
  Crítica: "bg-red-100 text-red-700 border-red-300",
  Alta: "bg-orange-100 text-orange-700 border-orange-300",
  Média: "bg-amber-100 text-amber-700 border-amber-300",
  Baixa: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

const PROB_COLORS: Record<string, string> = {
  Alta: "text-red-600 font-semibold",
  Média: "text-amber-600 font-semibold",
  Baixa: "text-emerald-600",
};

const IMPACT_COLORS: Record<string, string> = {
  Alto: "text-red-600 font-semibold",
  Médio: "text-amber-600 font-semibold",
  Baixo: "text-emerald-600",
};

function RiskTable({ risks, onEdit, onDelete, locked }: {
  risks: Risk[];
  onEdit: (risk: Risk) => void;
  onDelete: (id: string) => void;
  locked: boolean;
}) {
  if (!risks || risks.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum risco identificado nesta área.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Evento de Risco</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide w-24">Probabilidade</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide w-20">Impacto</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide w-24">Severidade</th>
            <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide w-36">Origem</th>
            <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Plano de Ação</th>
            {!locked && <th className="w-20"></th>}
          </tr>
        </thead>
        <tbody>
          {risks.map((risk, i) => (
            <tr key={risk.id || i} className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors", risk.manual && "bg-blue-50/30")}>
              <td className="py-3 px-3 font-medium max-w-xs">
                {risk.evento}
                {risk.manual && <span className="ml-1.5 text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Manual</span>}
              </td>
              <td className="py-3 px-3 text-center">
                <span className={PROB_COLORS[risk.probabilidade] || ""}>{risk.probabilidade}</span>
              </td>
              <td className="py-3 px-3 text-center">
                <span className={IMPACT_COLORS[risk.impacto] || ""}>{risk.impacto}</span>
              </td>
              <td className="py-3 px-3 text-center">
                <Badge variant="outline" className={cn("text-xs", SEVERITY_COLORS[risk.severidade] || "")}>
                  {risk.severidade}
                </Badge>
              </td>
              <td className="py-3 px-3 text-center">
                {/* G11 — badge de origem do risco */}
                {(() => {
                  // M3.7 Item 4: ler enum estruturado fonte_risco_tipo (não texto livre fonte_risco)
                  const fonte = risk.fonte_risco_tipo ?? 'v1';
                  const b = FONTE_BADGE[fonte] ?? FONTE_BADGE['v1'];
                  return (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${b.className}`}>
                      {b.label}
                    </span>
                  );
                })()}
              </td>
              <td className="py-3 px-3 text-muted-foreground text-xs max-w-sm">{risk.plano_acao}</td>
              {!locked && (
                <td className="py-3 px-2">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(risk)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    {/* RF-4.04: Botão de remoção de risco */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(risk.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MatrizesV3() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = Number(id);

  const [matrices, setMatrices] = useState<Record<string, Risk[]>>({});
  // Issue #59 — gate de retrocesso no botão Voltar
  const [retrocessoModal, setRetrocessoModal] = useState<{ open: boolean; targetUrl: string; toStep: number; toStepLabel: string }>({
    open: false, targetUrl: "", toStep: 0, toStepLabel: ""
  });
  const handleVoltarClick = (targetUrl: string, toStep: number, toStepLabel: string) => {
    setRetrocessoModal({ open: true, targetUrl, toStep, toStepLabel });
  };
  const [activeTab, setActiveTab] = useState("contabilidade");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState<string | null>(null);
  const [adjustmentText, setAdjustmentText] = useState("");
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [generationCount, setGenerationCount] = useState(0);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number>(0);
  const [wasAlreadyApproved, setWasAlreadyApproved] = useState(false);
  // RF-4.03: Modal de adição manual de risco
  const [showAddRisk, setShowAddRisk] = useState<string | null>(null); // area key
  const [newRisk, setNewRisk] = useState<Partial<Risk>>({ probabilidade: "Média", impacto: "Médio", severidade: "Média" });
  // RF-4.05: Controle de bloqueio por área (aprovação individual)
  const [lockedAreas, setLockedAreas] = useState<Set<string>>(new Set());
  // RF-4.07: Aprovação individual por área
  const [approvedAreas, setApprovedAreas] = useState<Set<string>>(new Set());

  // Verificar rascunho local ao montar
  useEffect(() => {
    if (!projectId) return;
    const saved = loadTempData(projectId, 'etapa4');
    if (saved?.data?.matrices && Object.keys(saved.data.matrices).length > 0) {
      setDraftSavedAt(saved.savedAt);
      setShowResumeBanner(true);
    }
  }, [projectId]);

  const handleResumeDraft = () => {
    const saved = loadTempData(projectId, 'etapa4');
    if (saved?.data?.matrices) {
      setMatrices(saved.data.matrices);
      setGenerationCount(1);
      if (saved.data.lockedAreas) setLockedAreas(new Set(saved.data.lockedAreas));
      if (saved.data.approvedAreas) setApprovedAreas(new Set(saved.data.approvedAreas));
    }
    setShowResumeBanner(false);
  };

  const handleDiscardDraft = () => {
    clearTempData(projectId, 'etapa4');
    setShowResumeBanner(false);
  };

  // Auto-save das matrizes no localStorage
  useAutoSave(projectId, 'etapa4', {
    matrices,
    lockedAreas: Array.from(lockedAreas),
    approvedAreas: Array.from(approvedAreas),
  }, 1000);

  const { data: project, isLoading: loadingProject } = trpc.fluxoV3.getProjectStep1.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const utils = trpc.useUtils();
  const generateMatrices = trpc.fluxoV3.generateRiskMatrices.useMutation();
  const approveMatrices = trpc.fluxoV3.approveMatrices.useMutation();

  // Carregar matrizes salvas do banco (se existirem) ou gerar novas
  useEffect(() => {
    if (!project) return;
    // Se já há matrizes no estado (rascunho local), não sobrescrever
    if (Object.keys(matrices).length > 0) return;
    // Prioridade: matrizes salvas no banco (re-edição)
    const savedMatrices = (project as any).riskMatricesDataV3 || (project as any).riskMatricesData;
    if (savedMatrices && Object.keys(savedMatrices).length > 0 && generationCount === 0) {
      setMatrices(savedMatrices);
      setGenerationCount(1);
      setWasAlreadyApproved(true); // Sinaliza que estas matrizes já foram aprovadas
      return;
    }
    // Gerar novas matrizes apenas se não há conteúdo salvo
    if (generationCount === 0) {
      handleGenerate();
    }
  }, [project]);

  const handleGenerate = async (area?: string, adjustment?: string) => {
    if (!project) return;
    // RF-4.05: Não regenerar área bloqueada
    if (area && lockedAreas.has(area)) {
      toast.error("Esta área está bloqueada. Reabra-a para edição antes de regenerar.");
      return;
    }
    setIsGenerating(true);
    setAdjustmentMode(null);
    setAdjustmentText("");
    try {
      const briefingContent = (project as any).briefingContentV3 || (project as any).briefingContent || "";
      const result = await generateMatrices.mutateAsync({
        projectId,
        briefingContent,
        area: area as any,
        adjustment,
      });
      setMatrices(prev => ({ ...prev, ...result.matrices }));
      setGenerationCount(prev => prev + 1);
      if (generationCount > 0) toast.success(area ? `Matriz de ${area} atualizada!` : "Matrizes atualizadas!");
    } catch {
      toast.error("Erro ao gerar as matrizes. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approveMatrices.mutateAsync({ projectId, matrices });
      clearTempData(projectId, 'etapa4');
      // Invalidar o cache do projeto para garantir que o PlanoAcaoV3
      // receba o status atualizado "plano_acao" e dispare a geração automática
      await utils.fluxoV3.getProjectStep1.invalidate({ projectId });
      toast.success("Matrizes aprovadas! Avançando para o Plano de Ação...");
      setLocation(`/projetos/${projectId}/plano-v3`);
    } catch {
      toast.error("Erro ao aprovar as matrizes. Tente novamente.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleEditRisk = (risk: Risk) => {
    setEditingRisk({ ...risk });
  };

  const handleSaveEditedRisk = () => {
    if (!editingRisk) return;
    setMatrices(prev => ({
      ...prev,
      [activeTab]: (prev[activeTab] || []).map(r => r.id === editingRisk.id ? editingRisk : r),
    }));
    setEditingRisk(null);
    toast.success("Risco atualizado!");
  };

  // RF-4.04: Remover risco
  const handleDeleteRisk = (areaKey: string, riskId: string) => {
    setMatrices(prev => ({
      ...prev,
      [areaKey]: (prev[areaKey] || []).filter(r => r.id !== riskId),
    }));
    toast.success("Risco removido.");
  };

  // RF-4.03: Adicionar risco manualmente
  const handleAddManualRisk = (areaKey: string) => {
    if (!newRisk.evento?.trim() || !newRisk.plano_acao?.trim()) {
      toast.error("Preencha o evento e o plano de ação.");
      return;
    }
    const risk: Risk = {
      id: `manual-${Date.now()}`,
      evento: newRisk.evento!,
      probabilidade: newRisk.probabilidade as any || "Média",
      impacto: newRisk.impacto as any || "Médio",
      severidade: newRisk.severidade as any || "Média",
      plano_acao: newRisk.plano_acao!,
      manual: true,
    };
    setMatrices(prev => ({
      ...prev,
      [areaKey]: [...(prev[areaKey] || []), risk],
    }));
    setNewRisk({ probabilidade: "Média", impacto: "Médio", severidade: "Média" });
    setShowAddRisk(null);
    toast.success("Risco adicionado manualmente!");
  };

  // RF-4.07: Aprovar área individualmente (bloqueia edição)
  const handleApproveArea = (areaKey: string) => {
    setLockedAreas(prev => new Set([...prev, areaKey]));
    setApprovedAreas(prev => new Set([...prev, areaKey]));
    toast.success(`Área ${AREAS.find(a => a.key === areaKey)?.label} aprovada!`);
  };

  // RF-4.05: Reabrir área para edição
  const handleReopenArea = (areaKey: string) => {
    setLockedAreas(prev => { const next = new Set(prev); next.delete(areaKey); return next; });
    setApprovedAreas(prev => { const next = new Set(prev); next.delete(areaKey); return next; });
    toast.info(`Área ${AREAS.find(a => a.key === areaKey)?.label} reaberta para edição.`);
  };

  // RF-4.06: Exportar CSV
  const handleExportCSV = () => {
    const headers = ["Área", "Evento de Risco", "Probabilidade", "Impacto", "Severidade", "Plano de Ação"];
    const rows: string[][] = [];
    AREAS.forEach(area => {
      (matrices[area.key] || []).forEach(r => {
        rows.push([area.label, r.evento, r.probabilidade, r.impacto, r.severidade, r.plano_acao]);
      });
    });
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `matrizes-riscos-${projectId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  };

  const handleExportPDF = () => {
    const projectName = (project as any)?.name || "Matrizes de Riscos";
    const dateStr = new Date().toLocaleDateString("pt-BR");
    const sevColor: Record<string, string> = {
      Crítica: "#dc2626", Alta: "#ea580c", Média: "#d97706", Baixa: "#16a34a"
    };
    const areasHtml = AREAS.map(area => {
      const risks = matrices[area.key] || [];
      if (risks.length === 0) return "";
      const rows = risks.map(r => `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:12px">${r.evento}${r.manual ? ' <span style="font-size:10px;color:#2563eb">[Manual]</span>' : ''}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px">${r.probabilidade}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px">${r.impacto}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">
          <span style="background:${sevColor[r.severidade] || '#6b7280'}22;color:${sevColor[r.severidade] || '#6b7280'};border:1px solid ${sevColor[r.severidade] || '#6b7280'}44;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:600">${r.severidade}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#6b7280">${r.plano_acao}</td>
      </tr>`).join("");
      return `<div style="margin-bottom:28px">
        <h2 style="font-size:15px;color:#1e40af;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #bfdbfe">${area.label}</h2>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f8fafc">
            <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Evento de Risco</th>
            <th style="padding:8px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb;width:100px">Probabilidade</th>
            <th style="padding:8px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb;width:80px">Impacto</th>
            <th style="padding:8px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb;width:90px">Severidade</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Plano de Ação</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).join("");

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Matrizes de Riscos — ${projectName}</title>
        <style>
          body{font-family:Arial,sans-serif;margin:40px;color:#111;line-height:1.6;max-width:900px}
          @media print{@page{margin:15mm;size:A4 landscape}body{margin:0;max-width:none}}
        </style></head><body>
        <div style="border-bottom:3px solid #1e40af;padding-bottom:16px;margin-bottom:28px">
          <h1 style="font-size:22px;margin:0 0 4px;color:#1e3a8a">Matrizes de Riscos — ${projectName}</h1>
          <p style="font-size:13px;color:#6b7280;margin:0">Reforma Tributária 2024 · Gerado em ${dateStr} · ${totalRisks} riscos identificados, ${criticalRisks} críticos</p>
        </div>
        ${areasHtml}
        <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:right">IA SOLARIS — Plataforma de Compliance Tributário · Reforma Tributária 2024</div>
        <script>window.onload=function(){window.print();}<\/script>
        </body></html>`);
      win.document.close();
      toast.success("PDF das Matrizes gerado! Use Ctrl+P para salvar.");
    }
  };

  const allAreasGenerated = AREAS.every(a => matrices[a.key] && matrices[a.key].length > 0);
  const allAreasApproved = AREAS.every(a => approvedAreas.has(a.key));
  const totalRisks = Object.values(matrices).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  const criticalRisks = Object.values(matrices).flat().filter(r => r.severidade === "Crítica").length;

  if (loadingProject) {
    return (
      <ComplianceLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ComplianceLayout>
    );
  }

  return (
    <ComplianceLayout>
      <div className="max-w-5xl mx-auto space-y-6 py-2">
        {showResumeBanner && (
          <ResumeBanner
            savedAt={draftSavedAt}
            onResume={handleResumeDraft}
            onDiscard={handleDiscardDraft}
            label="rascunho das matrizes de riscos"
          />
        )}
        {/* Aviso de re-geração: matrizes já aprovadas anteriormente */}
        {wasAlreadyApproved && !showResumeBanner && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">Matrizes de riscos aprovadas anteriormente</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Estas matrizes já foram aprovadas e salvas. Você pode editar riscos individualmente ou regenerar uma nova versão.
                Regenerar irá substituir as matrizes atuais — certifique-se de que deseja criar uma nova versão.
              </p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="gap-2 text-sm shrink-0" onClick={() => handleVoltarClick(`/projetos/${projectId}/briefing-v3`, 3, "Briefing")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Briefing</span>
            <span className="sm:hidden">Voltar</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{project?.name || "Matrizes de Riscos"}</h1>
            <p className="text-sm text-muted-foreground">Etapa 4 de 5 — Matrizes de Riscos</p>
          </div>
          {allAreasGenerated && (
            <div className="flex items-center gap-3 text-sm shrink-0">
              <span className="text-muted-foreground">{totalRisks} riscos</span>
              {criticalRisks > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {criticalRisks} críticos
                </Badge>
              )}
              {approvedAreas.size > 0 && (
                <Badge variant="secondary" className="gap-1 text-emerald-700 bg-emerald-100">
                  <CheckCircle2 className="h-3 w-3" />
                  {approvedAreas.size}/4 aprovadas
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Stepper — clicável para etapas concluídas */}
        <FlowStepper currentStep={4} projectId={projectId} completedUpTo={statusToCompletedStep(project?.status)} />
        {/* Issue #59 — modal de confirmação de retrocesso */}
        <RetrocessoConfirmModal
          open={retrocessoModal.open}
          projectId={projectId}
          fromStep={4}
          toStep={retrocessoModal.toStep}
          toStepLabel={retrocessoModal.toStepLabel}
          onConfirm={() => { setRetrocessoModal(m => ({ ...m, open: false })); setLocation(retrocessoModal.targetUrl); }}
          onCancel={() => setRetrocessoModal(m => ({ ...m, open: false }))}
        />

        {/* ── Diagnóstico de Entrada (3 Camadas) ────────────────────────────────── */}
        {(project?.corporateAnswers || project?.operationalAnswers || project?.cnaeAnswers) && (
          <DiagnosticoEntradaPanel
            corporateAnswers={project?.corporateAnswers}
            operationalAnswers={project?.operationalAnswers}
            cnaeAnswers={project?.cnaeAnswers}
          />
        )}

        {/* Geração em andamento */}
        {isGenerating && Object.keys(matrices).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">Gerando Matrizes de Riscos...</p>
                <p className="text-sm text-muted-foreground">A IA está analisando o briefing e identificando riscos para as 4 áreas.</p>
                <p className="text-xs text-muted-foreground mt-2">Isso pode levar de 20 a 40 segundos.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tabs por área */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                {AREAS.map(area => {
                  const Icon = area.icon;
                  const areaRisks = matrices[area.key] || [];
                  const critical = areaRisks.filter(r => r.severidade === "Crítica").length;
                  const isApproved = approvedAreas.has(area.key);
                  return (
                    <TabsTrigger key={area.key} value={area.key} className="gap-1.5 relative">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{area.label}</span>
                      {isApproved ? (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">✓</span>
                      ) : critical > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                          {critical}
                        </span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {AREAS.map(area => {
                const Icon = area.icon;
                const areaRisks = matrices[area.key] || [];
                const isLocked = lockedAreas.has(area.key);
                const isApproved = approvedAreas.has(area.key);
                return (
                  <TabsContent key={area.key} value={area.key} className="mt-4">
                    <Card className={cn(isApproved && "border-emerald-200 bg-emerald-50/20")}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            {area.label}
                            {areaRisks.length > 0 && (
                              <Badge variant="secondary" className="text-xs">{areaRisks.length} riscos</Badge>
                            )}
                            {/* RF-4.07: Badge de aprovação individual */}
                            {isApproved && (
                              <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300 gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Aprovada
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex gap-1.5">
                            {!isLocked && (
                              <>
                                {/* RF-4.03: Botão de adicionar risco manualmente */}
                                <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => { setShowAddRisk(area.key); setNewRisk({ probabilidade: "Média", impacto: "Médio", severidade: "Média" }); }}>
                                  <Plus className="h-3.5 w-3.5" />
                                  Adicionar
                                </Button>
                                <Button variant="ghost" size="sm" className="text-xs gap-1.5"
                                  onClick={() => setAdjustmentMode(area.key)}
                                  disabled={isGenerating}>
                                  <Edit3 className="h-3.5 w-3.5" />
                                  Ajustar
                                </Button>
                                <Button variant="ghost" size="sm" className="text-xs gap-1.5"
                                  onClick={() => handleGenerate(area.key)}
                                  disabled={isGenerating}>
                                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                  Regenerar
                                </Button>
                                {/* RF-4.07: Aprovar área individualmente */}
                                {areaRisks.length > 0 && (
                                  <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => handleApproveArea(area.key)}>
                                    <Lock className="h-3.5 w-3.5" />
                                    Aprovar Área
                                  </Button>
                                )}
                              </>
                            )}
                            {/* RF-4.05: Reabrir área para edição */}
                            {isLocked && (
                              <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => handleReopenArea(area.key)}>
                                <Unlock className="h-3.5 w-3.5" />
                                Reabrir para Edição
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {isGenerating ? (
                          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Atualizando matriz...</span>
                          </div>
                        ) : (
                          <RiskTable
                            risks={areaRisks}
                            onEdit={handleEditRisk}
                            onDelete={(id) => handleDeleteRisk(area.key, id)}
                            locked={isLocked}
                          />
                        )}
                      </CardContent>
                    </Card>

                    {/* Painel de ajuste */}
                    {adjustmentMode === area.key && !isLocked && (
                      <Card className="mt-3 border-primary/20 bg-primary/3">
                        <CardContent className="p-4 space-y-3">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <Edit3 className="h-4 w-4 text-primary" />
                            Que ajustes deseja na matriz de {area.label}?
                          </p>
                          <Textarea
                            value={adjustmentText}
                            onChange={e => setAdjustmentText(e.target.value)}
                            placeholder="Ex: Adicione riscos relacionados ao Split Payment. O risco de NF-e está subestimado, deve ser Alta probabilidade..."
                            rows={3}
                            className="resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => { setAdjustmentMode(null); setAdjustmentText(""); }}>Cancelar</Button>
                            <Button size="sm" onClick={() => handleGenerate(area.key, adjustmentText)} disabled={!adjustmentText.trim()}>
                              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                              Regenerar com Ajustes
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>

            {/* Modal de edição de risco */}
            {editingRisk && (
              <Card className="border-2 border-primary/30 bg-primary/3">
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm font-semibold">Editar Risco</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Evento de Risco</label>
                      <Textarea value={editingRisk.evento} onChange={e => setEditingRisk(r => r ? { ...r, evento: e.target.value } : r)} rows={2} className="resize-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(["probabilidade", "impacto", "severidade"] as const).map(field => (
                        <div key={field}>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block capitalize">{field}</label>
                          <select
                            className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                            value={editingRisk[field]}
                            onChange={e => setEditingRisk(r => r ? { ...r, [field]: e.target.value } : r)}
                          >
                            {field === "probabilidade" && ["Baixa", "Média", "Alta"].map(v => <option key={v}>{v}</option>)}
                            {field === "impacto" && ["Baixo", "Médio", "Alto"].map(v => <option key={v}>{v}</option>)}
                            {field === "severidade" && ["Baixa", "Média", "Alta", "Crítica"].map(v => <option key={v}>{v}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Plano de Ação</label>
                      <Textarea value={editingRisk.plano_acao} onChange={e => setEditingRisk(r => r ? { ...r, plano_acao: e.target.value } : r)} rows={2} className="resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingRisk(null)}>Cancelar</Button>
                    <Button size="sm" onClick={handleSaveEditedRisk}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Salvar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* RF-4.03: Modal de adição manual de risco */}
            <Dialog open={!!showAddRisk} onOpenChange={() => setShowAddRisk(null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Adicionar Risco Manualmente
                    {showAddRisk && <span className="text-muted-foreground font-normal">— {AREAS.find(a => a.key === showAddRisk)?.label}</span>}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Evento de Risco <span className="text-destructive">*</span></label>
                    <Textarea
                      value={newRisk.evento || ""}
                      onChange={e => setNewRisk(r => ({ ...r, evento: e.target.value }))}
                      placeholder="Descreva o evento de risco identificado..."
                      rows={2}
                      className="resize-none"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Probabilidade</label>
                      <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={newRisk.probabilidade} onChange={e => setNewRisk(r => ({ ...r, probabilidade: e.target.value as any }))}>
                        {["Baixa", "Média", "Alta"].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Impacto</label>
                      <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={newRisk.impacto} onChange={e => setNewRisk(r => ({ ...r, impacto: e.target.value as any }))}>
                        {["Baixo", "Médio", "Alto"].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Severidade</label>
                      <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-background" value={newRisk.severidade} onChange={e => setNewRisk(r => ({ ...r, severidade: e.target.value as any }))}>
                        {["Baixa", "Média", "Alta", "Crítica"].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Plano de Ação <span className="text-destructive">*</span></label>
                    <Textarea
                      value={newRisk.plano_acao || ""}
                      onChange={e => setNewRisk(r => ({ ...r, plano_acao: e.target.value }))}
                      placeholder="Descreva as ações para mitigar este risco..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddRisk(null)}>Cancelar</Button>
                  <Button onClick={() => handleAddManualRisk(showAddRisk!)} disabled={!newRisk.evento?.trim() || !newRisk.plano_acao?.trim()}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Adicionar Risco
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Aprovação global */}
            {allAreasGenerated && !editingRisk && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      {allAreasApproved ? "Todas as 4 áreas aprovadas!" : "Todas as 4 matrizes geradas"}
                    </p>
                    <p className="text-xs text-emerald-700">
                      {totalRisks} riscos identificados, {criticalRisks} críticos
                      {approvedAreas.size > 0 && ` · ${approvedAreas.size}/4 áreas aprovadas`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                  {/* RF-4.06: Exportar CSV */}
                  <Button variant="outline" onClick={handleExportCSV} className="gap-2 border-green-300 text-green-700 hover:bg-green-50">
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                  <Button variant="outline" onClick={handleExportPDF} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
                    <Download className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                  <Button onClick={handleApprove} disabled={isApproving} className="gap-2">
                    {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                    Aprovar e Gerar Plano de Ação
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Anotações colaborativas da equipe */}
        <StepComments
          projectId={projectId}
          step="matrizes"
          title="Anotações da Equipe — Matrizes de Riscos"
        />
      </div>
    </ComplianceLayout>
  );
}
