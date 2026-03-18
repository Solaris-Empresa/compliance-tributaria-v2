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
import { Separator } from "@/components/ui/separator";
import FlowStepper from "@/components/FlowStepper";
import { statusToCompletedStep } from "@/lib/flowStepperUtils";
import {
  ArrowLeft, ChevronRight, Loader2, Sparkles,
  CheckCircle2, RefreshCw, MessageSquare, ThumbsUp, Edit3, Info, Download,
  History, Clock, ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import StepComments from "@/components/StepComments";
// V64: Alertas de inconsistência
import AlertasInconsistencia, { InconsistenciaBadge } from "@/components/AlertasInconsistencia";

// RF-3.06: Tipo para histórico de versões
interface BriefingVersion {
  version: number;
  content: string;
  timestamp: number;
  reason?: string;
}

export default function BriefingV3() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = Number(id);

  const [briefing, setBriefing] = useState<string>("");
  const [feedbackMode, setFeedbackMode] = useState<"none" | "correction" | "more_info">("none");
  const [feedbackText, setFeedbackText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number>(0);
  const [wasAlreadyApproved, setWasAlreadyApproved] = useState(false);
  // RF-3.06: Histórico de versões
  const [versionHistory, setVersionHistory] = useState<BriefingVersion[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<BriefingVersion | null>(null);

  // Verificar rascunho local ao montar
  useEffect(() => {
    if (!projectId) return;
    const saved = loadTempData(projectId, 'etapa3');
    if (saved?.data?.briefing) {
      setDraftSavedAt(saved.savedAt);
      setShowResumeBanner(true);
    }
  }, [projectId]);

  const handleResumeDraft = () => {
    const saved = loadTempData(projectId, 'etapa3');
    if (saved?.data?.briefing) {
      setBriefing(saved.data.briefing);
      setGenerationCount(saved.data.generationCount || 1);
      if (saved.data.versionHistory) setVersionHistory(saved.data.versionHistory);
    }
    setShowResumeBanner(false);
  };

  const handleDiscardDraft = () => {
    clearTempData(projectId, 'etapa3');
    setShowResumeBanner(false);
  };

  // Auto-save do briefing no localStorage (inclui histórico de versões)
  useAutoSave(projectId, 'etapa3', { briefing, generationCount, versionHistory }, 1000);

  const { data: project, isLoading: loadingProject } = trpc.fluxoV3.getProjectStep1.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const generateBriefing = trpc.fluxoV3.generateBriefing.useMutation();
  const approveBriefing = trpc.fluxoV3.approveBriefing.useMutation();
  // Bug #4: Buscar respostas do questionário como fallback (tabela questionnaireAnswersV3)
  const { data: savedProgress } = trpc.fluxoV3.getProgress.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // V64: Buscar inconsistências do briefing estruturado
  const { data: inconsistenciasData, refetch: refetchInconsistencias } = trpc.fluxoV3.getBriefingInconsistencias.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
  const inconsistencias = inconsistenciasData?.inconsistencias ?? [];

  // Carregar briefing salvo do banco (se existir) ou gerar novo
  useEffect(() => {
    if (!project) return;
    // Se já há briefing no estado (rascunho local), não sobrescrever
    if (briefing) return;
    // Prioridade: briefing salvo no banco (re-edição)
    const savedBriefing = (project as any).briefingContent;
    if (savedBriefing && generationCount === 0) {
      setBriefing(savedBriefing);
      setGenerationCount(1);
      setWasAlreadyApproved(true); // Sinaliza que este briefing já foi aprovado
      return;
    }
    // Gerar novo briefing apenas se não há conteúdo salvo
    if (!savedBriefing && generationCount === 0) {
      handleGenerate();
    }
  }, [project]);

  const handleGenerate = async (correction?: string, moreInfo?: string) => {
    if (!project) return;
    // RF-3.06: Salvar versão atual no histórico antes de regenerar
    if (briefing && generationCount > 0) {
      const newVersion: BriefingVersion = {
        version: generationCount,
        content: briefing,
        timestamp: Date.now(),
        reason: correction ? `Correção: ${correction.substring(0, 60)}...` : moreInfo ? `Complemento: ${moreInfo.substring(0, 60)}...` : "Regeneração manual",
      };
      setVersionHistory(prev => [...prev, newVersion]);
    }
    setIsGenerating(true);
    setFeedbackMode("none");
    setFeedbackText("");
    try {
      // Bug #4: Usar questionnaireAnswers do projeto (coluna JSON) ou fallback da tabela questionnaireAnswersV3
      const rawAnswers = (project as any).questionnaireAnswers;
      const answersFromTable = savedProgress?.answers || [];
      // Converter respostas da tabela para o formato esperado pelo generateBriefing
      const answersFromTableFormatted = answersFromTable.length > 0 ? (() => {
        const byCnae: Record<string, any> = {};
        for (const a of answersFromTable) {
          if (!byCnae[a.cnaeCode]) byCnae[a.cnaeCode] = { cnaeCode: a.cnaeCode, cnaeDescription: a.cnaeDescription || a.cnaeCode, level: a.level, questions: [] };
          byCnae[a.cnaeCode].questions.push({ question: a.questionText, answer: a.answerValue });
        }
        return Object.values(byCnae);
      })() : [];
      const allAnswers = rawAnswers || answersFromTableFormatted;
      const result = await generateBriefing.mutateAsync({
        projectId,
        allAnswers,
        correction,
        additionalInfo: moreInfo,
      });
      setBriefing(result.briefing);
      setGenerationCount(prev => prev + 1);
      if (generationCount > 0) toast.success("Briefing atualizado com suas correções!");
      // V64: Atualizar inconsistências após nova geração
      setTimeout(() => refetchInconsistencias(), 500);
    } catch {
      toast.error("Erro ao gerar o briefing. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!briefing) return;
    setIsApproving(true);
    try {
      await approveBriefing.mutateAsync({ projectId, briefingContent: briefing });
      clearTempData(projectId, 'etapa3');
      toast.success("Briefing aprovado! Avançando para Matrizes de Riscos...");
      setLocation(`/projetos/${projectId}/matrizes-v3`);
    } catch {
      toast.error("Erro ao aprovar o briefing. Tente novamente.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleExportPDF = () => {
    const content = viewingVersion ? viewingVersion.content : briefing;
    if (!content) return;
    const projectName = (project as any)?.name || "Briefing de Compliance";
    const dateStr = new Date().toLocaleDateString("pt-BR");
    const versionNum = viewingVersion ? viewingVersion.version : generationCount;
    const htmlContent = content
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .replace(/\n\n/g, "</p><p>")
      .split("\n").map(line => line.startsWith("<") ? line : `<p>${line}</p>`).join("\n");
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Briefing de Compliance — ${projectName}</title>
        <style>
          body{font-family:Arial,sans-serif;margin:40px;color:#111;line-height:1.7;max-width:800px}
          .header{border-bottom:3px solid #1e40af;padding-bottom:16px;margin-bottom:28px}
          .header h1{font-size:22px;margin:0 0 4px;color:#1e3a8a}
          .header p{font-size:13px;color:#6b7280;margin:0}
          .version-badge{display:inline-block;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;border-radius:12px;padding:2px 10px;font-size:11px;margin-left:8px}
          .content h1{font-size:18px;color:#1e3a8a;margin-top:28px;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
          .content h2{font-size:16px;color:#1e40af;margin-top:24px;margin-bottom:6px}
          .content h3{font-size:14px;color:#374151;margin-top:18px;margin-bottom:4px}
          .content p{font-size:13px;color:#374151;margin:8px 0}
          .content ul{margin:8px 0;padding-left:20px}
          .content li{font-size:13px;color:#374151;margin:4px 0}
          .content strong{color:#111}
          .footer{margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:right}
          @media print{@page{margin:20mm}body{margin:0;max-width:none}}
        </style>
        </head><body>
        <div class="header">
          <h1>Briefing de Compliance — ${projectName} <span class="version-badge">Versão ${versionNum}</span></h1>
          <p>Reforma Tributária 2024 · Gerado em ${dateStr}</p>
        </div>
        <div class="content">${htmlContent}</div>
        <div class="footer">IA SOLARIS — Plataforma de Compliance Tributário · Reforma Tributária 2024</div>
        <script>window.onload=function(){window.print();}<\/script>
        </body></html>`);
      win.document.close();
      toast.success("PDF do Briefing gerado! Use Ctrl+P para salvar.");
    }
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) return toast.error("Descreva a correção ou informação adicional.");
    if (feedbackMode === "correction") handleGenerate(feedbackText);
    else handleGenerate(undefined, feedbackText);
  };

  // RF-3.02: Detectar trechos de risco alto no markdown e destacar
  const renderBriefingWithHighlights = (content: string) => {
    return content;
  };

  if (loadingProject) {
    return (
      <ComplianceLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ComplianceLayout>
    );
  }

  const displayContent = viewingVersion ? viewingVersion.content : briefing;

  return (
    <ComplianceLayout>
      <div className="max-w-4xl mx-auto space-y-6 py-2">
        {showResumeBanner && (
          <ResumeBanner
            savedAt={draftSavedAt}
            onResume={handleResumeDraft}
            onDiscard={handleDiscardDraft}
            label="rascunho do briefing"
          />
        )}
        {/* Aviso de re-geração: briefing já aprovado anteriormente */}
        {wasAlreadyApproved && !showResumeBanner && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">Briefing aprovado anteriormente</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Este briefing já foi aprovado e salvo. Você pode visualizá-lo, exportar em PDF ou regenerar uma nova versão.
                Regenerar irá criar uma nova versão — a versão atual ficará salva no histórico.
              </p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="gap-2 text-sm shrink-0" onClick={() => setLocation(`/projetos/${projectId}/questionario-v3`)}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Questionário</span>
            <span className="sm:hidden">Voltar</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{project?.name || "Briefing"}</h1>
            <p className="text-sm text-muted-foreground">Etapa 3 de 5 — Briefing de Compliance</p>
          </div>
          <div className="flex items-center gap-2">
            {/* V64: Badge de inconsistências */}
            {inconsistencias.length > 0 && (
              <InconsistenciaBadge count={inconsistencias.length} />
            )}
            {generationCount > 0 && (
              <Badge variant="secondary" className="shrink-0">
                Versão {viewingVersion ? viewingVersion.version : generationCount}
              </Badge>
            )}
            {/* RF-3.06: Botão de histórico de versões */}
            {versionHistory.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-3.5 w-3.5" />
                Histórico ({versionHistory.length})
                {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Stepper — clicável para etapas concluídas */}
        <FlowStepper currentStep={3} projectId={projectId} completedUpTo={statusToCompletedStep(project?.status)} />

        {/* V64: Alertas de Inconsistência — exibido apenas quando há inconsistências */}
        {inconsistencias.length > 0 && !isGenerating && (
          <AlertasInconsistencia inconsistencias={inconsistencias} />
        )}

        {/* RF-3.06: Painel de Histórico de Versões */}
        {showHistory && versionHistory.length > 0 && (
          <Card className="border-primary/20 bg-primary/3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Histórico de Versões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Versão atual */}
              <button
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all ${
                  !viewingVersion ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}
                onClick={() => setViewingVersion(null)}
              >
                <div className="flex items-center gap-2">
                  <Badge className="text-xs">Atual</Badge>
                  <span className="text-sm font-medium">Versão {generationCount}</span>
                </div>
                <span className="text-xs text-muted-foreground">Versão mais recente</span>
              </button>
              {/* Versões anteriores (ordem decrescente) */}
              {[...versionHistory].reverse().map((v) => (
                <button
                  key={v.version}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all ${
                    viewingVersion?.version === v.version ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                  onClick={() => setViewingVersion(v)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">v{v.version}</Badge>
                    <span className="text-sm font-medium">Versão {v.version}</span>
                    {v.reason && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{v.reason}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(v.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Aviso quando visualizando versão antiga */}
        {viewingVersion && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">Você está visualizando a <strong>Versão {viewingVersion.version}</strong> (versão anterior)</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setViewingVersion(null)} className="text-xs">
              Ver versão atual
            </Button>
          </div>
        )}

        {/* Geração em andamento */}
        {isGenerating ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">{generationCount === 0 ? "Gerando Briefing de Compliance..." : "Atualizando Briefing..."}</p>
                <p className="text-sm text-muted-foreground">A IA está analisando as respostas do questionário e elaborando o diagnóstico tributário.</p>
                <p className="text-xs text-muted-foreground mt-2">Isso pode levar de 15 a 30 segundos.</p>
              </div>
            </CardContent>
          </Card>
        ) : displayContent ? (
          <>
            {/* RF-3.02: Briefing com destaque visual para risco alto */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Briefing de Compliance — Reforma Tributária
                    {viewingVersion && <Badge variant="outline" className="text-xs ml-2">Versão {viewingVersion.version}</Badge>}
                  </CardTitle>
                  {!viewingVersion && (
                    <Button variant="ghost" size="sm" onClick={() => handleGenerate()} className="text-xs gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* RF-3.02: Legenda de destaques */}
                <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-300"></span>
                    Risco Alto / Crítico
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-300"></span>
                    Atenção necessária
                  </span>
                </div>
                {/* RF-3.02: Renderização com destaques de risco */}
                <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground [&_.risk-high]:bg-red-50 [&_.risk-high]:border-l-4 [&_.risk-high]:border-red-400 [&_.risk-high]:pl-3 [&_.risk-high]:py-1 [&_.risk-medium]:bg-amber-50 [&_.risk-medium]:border-l-4 [&_.risk-medium]:border-amber-400 [&_.risk-medium]:pl-3 [&_.risk-medium]:py-1">
                  <Streamdown className="text-sm">{displayContent}</Streamdown>
                </div>
              </CardContent>
            </Card>

            {/* Painel de Feedback — só exibido na versão atual */}
            {!viewingVersion && (feedbackMode === "none" ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Revise o Briefing</p>
                    <p className="text-xs text-amber-700 mt-0.5">Leia com atenção. Se estiver correto e completo, aprove para avançar. Se precisar de ajustes, use as opções abaixo.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Button size="lg" onClick={handleApprove} disabled={isApproving} className="gap-2">
                    {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                    Aprovar Briefing
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => setFeedbackMode("correction")} className="gap-2">
                    <Edit3 className="h-4 w-4" />
                    Corrigir
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => setFeedbackMode("more_info")} className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Mais Informações
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleExportPDF} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
                    <Download className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="border-primary/20 bg-primary/3">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    {feedbackMode === "correction" ? <Edit3 className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-primary" />}
                    <p className="text-sm font-semibold">
                      {feedbackMode === "correction" ? "O que precisa ser corrigido?" : "Que informações adicionais deseja incluir?"}
                    </p>
                  </div>
                  <Textarea
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder={feedbackMode === "correction"
                      ? "Ex: O regime tributário está errado, somos Lucro Real. A descrição da operação de TI está incompleta..."
                      : "Ex: Nossa empresa também atua no mercado internacional. Temos um contrato de distribuição exclusiva que impacta o ICMS..."
                    }
                    rows={4}
                    className="resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setFeedbackMode("none"); setFeedbackText(""); }}>Cancelar</Button>
                    <Button size="sm" onClick={handleFeedbackSubmit} disabled={!feedbackText.trim()}>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Regenerar com Ajustes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Botão de exportar PDF para versões antigas */}
            {viewingVersion && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleExportPDF} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
                  <Download className="h-4 w-4" />
                  Exportar PDF desta versão
                </Button>
              </div>
            )}
          </>
        ) : null}

        {/* Anotações colaborativas da equipe */}
        <StepComments
          projectId={projectId}
          step="briefing"
          title="Anotações da Equipe — Briefing"
        />
      </div>
    </ComplianceLayout>
  );
}