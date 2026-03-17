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
import {
  ArrowLeft, ArrowRight, ChevronRight, Loader2, Sparkles,
  CheckCircle2, RefreshCw, MessageSquare, ThumbsUp, Edit3, Info
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

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
      setGenerationCount(1);
    }
    setShowResumeBanner(false);
  };

  const handleDiscardDraft = () => {
    clearTempData(projectId, 'etapa3');
    setShowResumeBanner(false);
  };

  // Auto-save do briefing no localStorage
  useAutoSave(projectId, 'etapa3', { briefing }, 1000);

  const { data: project, isLoading: loadingProject } = trpc.fluxoV3.getProjectStep1.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const generateBriefing = trpc.fluxoV3.generateBriefing.useMutation();
  const approveBriefing = trpc.fluxoV3.approveBriefing.useMutation();

  // Gerar briefing inicial ao carregar
  useEffect(() => {
    if (project && !briefing && generationCount === 0) {
      handleGenerate();
    }
  }, [project]);

  const handleGenerate = async (correction?: string, moreInfo?: string) => {
    if (!project) return;
    setIsGenerating(true);
    setFeedbackMode("none");
    setFeedbackText("");
    try {
      const allAnswers = (project as any).questionnaireAnswers || [];
      const result = await generateBriefing.mutateAsync({
        projectId,
        allAnswers,
        correction,
        additionalInfo: moreInfo,
      });
      setBriefing(result.briefing);
      setGenerationCount(prev => prev + 1);
      if (generationCount > 0) toast.success("Briefing atualizado com suas correções!");
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

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) return toast.error("Descreva a correção ou informação adicional.");
    if (feedbackMode === "correction") handleGenerate(feedbackText);
    else handleGenerate(undefined, feedbackText);
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/projetos/${projectId}/questionario-v3`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{project?.name || "Briefing"}</h1>
            <p className="text-sm text-muted-foreground">Etapa 3 de 5 — Briefing de Compliance</p>
          </div>
          {generationCount > 1 && (
            <Badge variant="secondary" className="shrink-0">
              Versão {generationCount}
            </Badge>
          )}
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["Projeto", "Questionário", "Briefing", "Riscos", "Plano"].map((step, i) => (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                i < 2 ? "bg-emerald-100 text-emerald-700" :
                i === 2 ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i < 2 ? "bg-emerald-500/20" : i === 2 ? "bg-white/20" : "bg-muted-foreground/20"
                }`}>{i < 2 ? "✓" : i + 1}</span>
                {step}
              </div>
              {i < 4 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

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
        ) : briefing ? (
          <>
            {/* Briefing gerado */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Briefing de Compliance — Reforma Tributária
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => handleGenerate()} className="text-xs gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
                  <ReactMarkdown>{briefing}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Painel de Feedback */}
            {feedbackMode === "none" ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Revise o Briefing</p>
                    <p className="text-xs text-amber-700 mt-0.5">Leia com atenção. Se estiver correto e completo, aprove para avançar. Se precisar de ajustes, use as opções abaixo.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button size="lg" onClick={handleApprove} disabled={isApproving} className="col-span-1 sm:col-span-1">
                    {isApproving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
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
            )}
          </>
        ) : null}
      </div>
    </ComplianceLayout>
  );
}
