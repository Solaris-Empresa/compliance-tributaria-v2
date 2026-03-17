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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, ChevronRight, Loader2, Sparkles,
  CheckCircle2, RefreshCw, ThumbsUp, Edit3, AlertTriangle,
  Building2, Cpu, Scale, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Risk {
  id: string;
  evento: string;
  probabilidade: "Baixa" | "Média" | "Alta";
  impacto: "Baixo" | "Médio" | "Alto";
  severidade: "Baixa" | "Média" | "Alta" | "Crítica";
  plano_acao: string;
}

const AREAS = [
  { key: "contabilidade", label: "Contabilidade", icon: BarChart3, color: "blue" },
  { key: "negocio", label: "Negócio", icon: Building2, color: "violet" },
  { key: "ti", label: "T.I.", icon: Cpu, color: "cyan" },
  { key: "juridico", label: "Advocacia Tributária", icon: Scale, color: "amber" },
] as const;

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

function RiskTable({ risks, onEdit }: { risks: Risk[]; onEdit: (risk: Risk) => void }) {
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
            <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Plano de Ação</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {risks.map((risk, i) => (
            <tr key={risk.id || i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="py-3 px-3 font-medium max-w-xs">{risk.evento}</td>
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
              <td className="py-3 px-3 text-muted-foreground text-xs max-w-sm">{risk.plano_acao}</td>
              <td className="py-3 px-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(risk)}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
              </td>
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
  const [activeTab, setActiveTab] = useState("contabilidade");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState<string | null>(null); // area key
  const [adjustmentText, setAdjustmentText] = useState("");
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [generationCount, setGenerationCount] = useState(0);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number>(0);

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
    }
    setShowResumeBanner(false);
  };

  const handleDiscardDraft = () => {
    clearTempData(projectId, 'etapa4');
    setShowResumeBanner(false);
  };

  // Auto-save das matrizes no localStorage
  useAutoSave(projectId, 'etapa4', { matrices }, 1000);

  const { data: project, isLoading: loadingProject } = trpc.fluxoV3.getProjectStep1.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const generateMatrices = trpc.fluxoV3.generateRiskMatrices.useMutation();
  const approveMatrices = trpc.fluxoV3.approveMatrices.useMutation();

  useEffect(() => {
    if (project && generationCount === 0) {
      handleGenerate();
    }
  }, [project]);

  const handleGenerate = async (area?: string, adjustment?: string) => {
    if (!project) return;
    setIsGenerating(true);
    setAdjustmentMode(null);
    setAdjustmentText("");
    try {
      const briefingContent = (project as any).briefingContent || "";
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

  const allAreasGenerated = AREAS.every(a => matrices[a.key] && matrices[a.key].length > 0);
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/projetos/${projectId}/briefing-v3`)}>
            <ArrowLeft className="h-5 w-5" />
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
            </div>
          )}
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["Projeto", "Questionário", "Briefing", "Riscos", "Plano"].map((step, i) => (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                i < 3 ? "bg-emerald-100 text-emerald-700" :
                i === 3 ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i < 3 ? "bg-emerald-500/20" : i === 3 ? "bg-white/20" : "bg-muted-foreground/20"
                }`}>{i < 3 ? "✓" : i + 1}</span>
                {step}
              </div>
              {i < 4 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

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
                  return (
                    <TabsTrigger key={area.key} value={area.key} className="gap-1.5 relative">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{area.label}</span>
                      {critical > 0 && (
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
                return (
                  <TabsContent key={area.key} value={area.key} className="mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            {area.label}
                            {areaRisks.length > 0 && (
                              <Badge variant="secondary" className="text-xs">{areaRisks.length} riscos</Badge>
                            )}
                          </CardTitle>
                          <div className="flex gap-2">
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
                          <RiskTable risks={areaRisks} onEdit={handleEditRisk} />
                        )}
                      </CardContent>
                    </Card>

                    {/* Painel de ajuste */}
                    {adjustmentMode === area.key && (
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

            {/* Aprovação */}
            {allAreasGenerated && !editingRisk && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Todas as 4 matrizes geradas</p>
                    <p className="text-xs text-emerald-700">{totalRisks} riscos identificados, {criticalRisks} críticos</p>
                  </div>
                </div>
                <Button onClick={handleApprove} disabled={isApproving} className="gap-2">
                  {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                  Aprovar e Gerar Plano de Ação
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ComplianceLayout>
  );
}
