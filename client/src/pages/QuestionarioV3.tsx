// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { useAutoSave, loadTempData, clearTempData } from "@/hooks/usePersistenceV3";
import { ResumeBanner } from "@/components/ResumeBanner";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, ArrowRight, ChevronRight, Loader2, Sparkles,
  CheckCircle2, Clock, SkipForward, MessageSquare, BarChart2,
  AlignLeft, List, ToggleLeft, Layers, Play, FileQuestion
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Question {
  id: string;
  text: string;
  type: "sim_nao" | "multipla_escolha" | "escala_likert" | "texto_curto" | "texto_longo" | "selecao_unica";
  required?: boolean;
  options?: string[];
  scale_labels?: { min: string; max: string };
  placeholder?: string;
}

interface CnaeProgress {
  code: string;
  description: string;
  nivel1Done: boolean;
  nivel2Done: boolean;
  skippedNivel2: boolean;
  answers: { question: string; answer: string }[];
  nivel2Answers: { question: string; answer: string }[];
}

// ─── Componentes de Campo ─────────────────────────────────────────────────────
function SimNaoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-3">
      {["Sim", "Não", "Parcialmente"].map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all duration-150",
            value === opt
              ? opt === "Sim" ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : opt === "Não" ? "border-red-400 bg-red-50 text-red-700"
                : "border-amber-400 bg-amber-50 text-amber-700"
              : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
          )}
        >
          {opt === "Sim" ? "✓ Sim" : opt === "Não" ? "✗ Não" : "~ Parcialmente"}
        </button>
      ))}
    </div>
  );
}

function EscalaLikertField({
  value, onChange, labels
}: { value: string; onChange: (v: string) => void; labels?: { min: string; max: string } }) {
  const scale = [1, 2, 3, 4, 5];
  const colors = ["bg-red-100 border-red-300 text-red-700", "bg-orange-100 border-orange-300 text-orange-700", "bg-amber-100 border-amber-300 text-amber-700", "bg-lime-100 border-lime-300 text-lime-700", "bg-emerald-100 border-emerald-300 text-emerald-700"];
  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-between">
        {scale.map((n, i) => (
          <button
            key={n}
            onClick={() => onChange(String(n))}
            className={cn(
              "flex-1 h-14 rounded-xl border-2 text-lg font-bold transition-all duration-150",
              value === String(n) ? colors[i] + " scale-105 shadow-sm" : "border-border hover:border-primary/40 text-muted-foreground"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>{labels?.min || "Discordo totalmente"}</span>
        <span>{labels?.max || "Concordo totalmente"}</span>
      </div>
    </div>
  );
}

// RF-2.02: Chips selecionáveis para múltipla escolha
function MultiplaEscolhaField({
  value, onChange, options, single
}: { value: string; onChange: (v: string) => void; options: string[]; single?: boolean }) {
  const selected = value ? value.split("|") : [];
  const toggle = (opt: string) => {
    if (single) { onChange(opt); return; }
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    onChange(next.join("|"));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-150",
              isSelected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground bg-background"
            )}
          >
            {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
            {opt}
          </button>
        );
      })}
      {!single && selected.length > 0 && (
        <p className="w-full text-xs text-muted-foreground mt-1">{selected.length} selecionado(s)</p>
      )}
    </div>
  );
}

function QuestionField({ question, value, onChange }: { question: Question; value: string; onChange: (v: string) => void }) {
  switch (question.type) {
    case "sim_nao":
      return <SimNaoField value={value} onChange={onChange} />;
    case "escala_likert":
      return <EscalaLikertField value={value} onChange={onChange} labels={question.scale_labels} />;
    case "multipla_escolha":
      return <MultiplaEscolhaField value={value} onChange={onChange} options={question.options || []} />;
    case "selecao_unica":
      return <MultiplaEscolhaField value={value} onChange={onChange} options={question.options || []} single />;
    case "texto_curto":
      return <Input value={value} onChange={e => onChange(e.target.value)} placeholder={question.placeholder || "Sua resposta..."} className="h-10" />;
    case "texto_longo":
    default:
      return <Textarea value={value} onChange={e => onChange(e.target.value)} placeholder={question.placeholder || "Descreva com detalhes..."} rows={4} className="resize-none" />;
  }
}

function QuestionTypeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    sim_nao: <ToggleLeft className="h-3.5 w-3.5" />,
    escala_likert: <BarChart2 className="h-3.5 w-3.5" />,
    multipla_escolha: <List className="h-3.5 w-3.5" />,
    selecao_unica: <List className="h-3.5 w-3.5" />,
    texto_curto: <MessageSquare className="h-3.5 w-3.5" />,
    texto_longo: <AlignLeft className="h-3.5 w-3.5" />,
  };
  const labels: Record<string, string> = {
    sim_nao: "Sim/Não", escala_likert: "Escala 1-5", multipla_escolha: "Múltipla escolha",
    selecao_unica: "Seleção única", texto_curto: "Texto curto", texto_longo: "Texto livre",
  };
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {icons[type] || <MessageSquare className="h-3.5 w-3.5" />}
      {labels[type] || type}
    </span>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function QuestionarioV3() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = Number(id);

  const [cnaes, setCnaes] = useState<{ code: string; description: string }[]>([]);
  const [currentCnaeIdx, setCurrentCnaeIdx] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<"nivel1" | "nivel2">("nivel1");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cnaeProgress, setCnaeProgress] = useState<CnaeProgress[]>([]);
  const [showDeepDivePrompt, setShowDeepDivePrompt] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number>(0);
  // Tela de entrada por CNAE: Set de códigos CNAE que o usuário já iniciou
  // Persistido no localStorage junto com o progresso do questionário
  const [startedCnaes, setStartedCnaes] = useState<Set<string>>(new Set());

  // Verificar rascunho local ao montar
  useEffect(() => {
    if (!projectId) return;
    const saved = loadTempData(projectId, 'etapa2');
    if (saved?.data?.cnaeProgress?.length > 0) {
      setDraftSavedAt(saved.savedAt);
      setShowResumeBanner(true);
    }
  }, [projectId]);

  const handleResumeDraft = () => {
    const saved = loadTempData(projectId, 'etapa2');
    if (saved?.data) {
      if (saved.data.cnaeProgress?.length > 0) setCnaeProgress(saved.data.cnaeProgress);
      if (saved.data.currentCnaeIdx !== undefined) setCurrentCnaeIdx(saved.data.currentCnaeIdx);
      // Restaurar CNAEs já iniciados — o usuário não precisa clicar "Iniciar" novamente
      if (saved.data.startedCnaes?.length > 0) setStartedCnaes(new Set(saved.data.startedCnaes));
    }
    setShowResumeBanner(false);
  };

  const handleDiscardDraft = () => {
    clearTempData(projectId, 'etapa2');
    setShowResumeBanner(false);
  };

  // Buscar projeto e CNAEs
  const { data: project, isLoading: loadingProject } = trpc.fluxoV3.getProjectStep1.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const generateQuestions = trpc.fluxoV3.generateQuestions.useMutation();
  const saveProgress = trpc.fluxoV3.saveQuestionnaireProgress.useMutation();
  const saveAnswer = trpc.fluxoV3.saveAnswer.useMutation();

  // Buscar progresso salvo no banco (para retomada)
  const { data: savedProgress } = trpc.fluxoV3.getProgress.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Inicializar CNAEs do projeto
  useEffect(() => {
    if (project?.confirmedCnaes && Array.isArray(project.confirmedCnaes)) {
      const cnaeList = project.confirmedCnaes as { code: string; description: string }[];
      setCnaes(cnaeList);
      setCnaeProgress(cnaeList.map(c => ({
        code: c.code,
        description: c.description,
        nivel1Done: false,
        nivel2Done: false,
        skippedNivel2: false,
        answers: [],
        nivel2Answers: [],
      })));
    }
  }, [project]);

  // Carregar perguntas do CNAE atual
  const loadQuestions = useCallback(async (cnaeIdx: number, level: "nivel1" | "nivel2", prevAnswers?: { question: string; answer: string }[]) => {
    if (!cnaes[cnaeIdx]) return;
    setIsLoadingQuestions(true);
    setAnswers({});
    setQuestions([]);
    try {
      const result = await generateQuestions.mutateAsync({
        projectId,
        cnaeCode: cnaes[cnaeIdx].code,
        cnaeDescription: cnaes[cnaeIdx].description,
        level,
        previousAnswers: prevAnswers,
      });
      setQuestions(result.questions || []);
    } catch {
      toast.error("Erro ao gerar perguntas. Tente novamente.");
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [cnaes, projectId, generateQuestions]);

  // Carregar perguntas APENAS quando o usuário iniciou o CNAE atual
  // Evita chamadas automáticas à IA sem interação do usuário
  useEffect(() => {
    const currentCode = cnaes[currentCnaeIdx]?.code;
    if (cnaes.length > 0 && currentCnaeIdx < cnaes.length && currentCode && startedCnaes.has(currentCode)) {
      loadQuestions(currentCnaeIdx, currentLevel);
    }
  }, [currentCnaeIdx, currentLevel, cnaes.length, startedCnaes.size]);

  const currentCnae = cnaes[currentCnaeIdx];
  const answeredCount = Object.values(answers).filter(v => v.trim()).length;
  const requiredQuestions = questions.filter(q => q.required !== false);
  const allRequiredAnswered = requiredQuestions.every(q => answers[q.id]?.trim());
  const totalProgress = cnaeProgress.filter(c => c.nivel1Done).length;

  // Auto-save no localStorage a cada 800ms de inatividade
  // Inclui startedCnaes para persistir o estado de "iniciado" por CNAE
  useAutoSave(projectId, 'etapa2', { cnaeProgress, currentCnaeIdx, startedCnaes: [...startedCnaes] }, 800);

  // Handler: usuário clica em "Iniciar diagnóstico" — marca o CNAE como iniciado
  // e dispara a geração de perguntas pela IA
  const handleStartCnae = (cnaeCode: string) => {
    setStartedCnaes(prev => new Set([...prev, cnaeCode]));
    // O useEffect acima detectará a mudança em startedCnaes.size e chamará loadQuestions
  };

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    // Persistir resposta no banco automaticamente (fire-and-forget)
    const question = questions.find(q => q.id === questionId);
    if (question && currentCnae) {
      saveAnswer.mutate({
        projectId,
        cnaeCode: currentCnae.code,
        cnaeDescription: currentCnae.description,
        level: currentLevel,
        questionIndex: questions.indexOf(question),
        questionText: question.text,
        questionType: question.type,
        answerValue: value,
      });
    }
  };

  const handleFinishLevel1 = () => {
    if (!allRequiredAnswered) {
      toast.error("Responda todas as perguntas obrigatórias antes de avançar.");
      return;
    }
    // Salvar respostas do Nível 1
    const level1Answers = questions.map(q => ({ question: q.text, answer: answers[q.id] || "" }));
    setCnaeProgress(prev => prev.map((c, i) =>
      i === currentCnaeIdx ? { ...c, nivel1Done: true, answers: level1Answers } : c
    ));
    setShowDeepDivePrompt(true);
  };

  const handleAcceptDeepDive = () => {
    setShowDeepDivePrompt(false);
    setCurrentLevel("nivel2");
    const level1Answers = cnaeProgress[currentCnaeIdx]?.answers || [];
    loadQuestions(currentCnaeIdx, "nivel2", level1Answers);
  };

  const handleSkipDeepDive = () => {
    setCnaeProgress(prev => prev.map((c, i) =>
      i === currentCnaeIdx ? { ...c, skippedNivel2: true } : c
    ));
    setShowDeepDivePrompt(false);
    advanceToNextCnae();
  };

  const handleFinishLevel2 = () => {
    if (!allRequiredAnswered) {
      toast.error("Responda todas as perguntas obrigatórias antes de avançar.");
      return;
    }
    const level2Answers = questions.map(q => ({ question: q.text, answer: answers[q.id] || "" }));
    setCnaeProgress(prev => prev.map((c, i) =>
      i === currentCnaeIdx ? { ...c, nivel2Done: true, nivel2Answers: level2Answers } : c
    ));
    advanceToNextCnae();
  };

  const advanceToNextCnae = () => {
    if (currentCnaeIdx < cnaes.length - 1) {
      setCurrentCnaeIdx(prev => prev + 1);
      setCurrentLevel("nivel1");
      setAnswers({});
      setQuestions([]);
    } else {
      handleFinishQuestionnaire();
    }
  };

  const handleFinishQuestionnaire = async () => {
    setIsSaving(true);
    try {
      const allAnswers = cnaeProgress.map(c => ({
        cnaeCode: c.code,
        cnaeDescription: c.description,
        level: "nivel1",
        questions: c.answers,
      }));
      // Adicionar respostas do Nível 2 se existirem
      const withNivel2 = cnaeProgress.filter(c => c.nivel2Done).map(c => ({
        cnaeCode: c.code,
        cnaeDescription: c.description,
        level: "nivel2",
        questions: c.nivel2Answers,
      }));
      await saveProgress.mutateAsync({
        projectId,
        allAnswers: [...allAnswers, ...withNivel2],
        completed: true,
      });
      toast.success("Questionário concluído! Gerando briefing...");
      setLocation(`/projetos/${projectId}/briefing-v3`);
    } catch {
      toast.error("Erro ao salvar o questionário. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingProject) {
    return (
      <ComplianceLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Carregando projeto...</p>
          </div>
        </div>
      </ComplianceLayout>
    );
  }

  return (
    <ComplianceLayout>
      <div className="max-w-3xl mx-auto space-y-6 py-2">
        {showResumeBanner && (
          <ResumeBanner
            savedAt={draftSavedAt}
            onResume={handleResumeDraft}
            onDiscard={handleDiscardDraft}
            label="progresso do questionário"
          />
        )}
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/projetos/${projectId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{project?.name || "Questionário"}</h1>
            <p className="text-sm text-muted-foreground">Etapa 2 de 5 — Questionário Adaptativo</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["Projeto", "Questionário", "Briefing", "Riscos", "Plano"].map((step, i) => (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                i < 1 ? "bg-emerald-100 text-emerald-700" :
                i === 1 ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i < 1 ? "bg-emerald-500/20" : i === 1 ? "bg-white/20" : "bg-muted-foreground/20"
                }`}>
                  {i < 1 ? "✓" : i + 1}
                </span>
                {step}
              </div>
              {i < 4 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

        {/* Progresso geral dos CNAEs */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Progresso dos CNAEs</span>
            <span className="text-muted-foreground">{totalProgress} de {cnaes.length} concluídos</span>
          </div>
          <Progress value={cnaes.length > 0 ? (totalProgress / cnaes.length) * 100 : 0} className="h-2" />
          <div className="flex flex-wrap gap-2">
            {cnaeProgress.map((c, i) => (
              <button
                key={c.code}
                onClick={() => { if (c.nivel1Done) { setCurrentCnaeIdx(i); setCurrentLevel("nivel1"); setAnswers({}); setQuestions([]); } }}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all",
                  i === currentCnaeIdx ? "border-primary bg-primary/10 text-primary" :
                  c.nivel1Done ? "border-emerald-300 bg-emerald-50 text-emerald-700 cursor-pointer" :
                  "border-border text-muted-foreground cursor-default"
                )}
              >
                {c.nivel1Done ? <CheckCircle2 className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
                {c.code}
                {c.nivel2Done && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">+2</Badge>}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt de Aprofundamento (Nível 2) */}
        {showDeepDivePrompt && (
          <Card className="border-2 border-primary/20 bg-primary/3 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Deseja se aprofundar neste CNAE?</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Com base nas suas respostas, a IA pode gerar perguntas mais específicas sobre <strong>{currentCnae?.code}</strong> para um diagnóstico mais preciso. Isso leva cerca de 2 minutos a mais.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleAcceptDeepDive} className="flex-1">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Sim, quero me aprofundar
                </Button>
                <Button variant="outline" onClick={handleSkipDeepDive} className="flex-1">
                  <SkipForward className="h-4 w-4 mr-2" />
                  Avançar para próximo CNAE
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Área do Questionário */}
        {!showDeepDivePrompt && (
          <div className="space-y-4">

            {/* Tela de entrada por CNAE: exibida quando o CNAE ainda não foi iniciado */}
            {currentCnae && !startedCnaes.has(currentCnae.code) && (
              <Card className="border-2 border-primary/20 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-primary/8 to-primary/3 p-8">
                  <div className="flex flex-col items-center text-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <FileQuestion className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-mono text-lg font-bold text-primary">{currentCnae.code}</span>
                        <Badge variant="secondary" className="text-xs">CNAE {currentCnaeIdx + 1} de {cnaes.length}</Badge>
                      </div>
                      <h3 className="text-base font-semibold">{currentCnae.description}</h3>
                      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                        A IA irá gerar perguntas personalizadas para este CNAE com base na descrição do negócio.
                        Responda com atenção — suas respostas guiarão o diagnóstico de compliance.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                      {currentCnaeIdx > 0 && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setCurrentCnaeIdx(prev => prev - 1);
                            setCurrentLevel("nivel1");
                            setAnswers({});
                            setQuestions([]);
                            setShowDeepDivePrompt(false);
                          }}
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          CNAE Anterior
                        </Button>
                      )}
                      <Button
                        className="flex-1"
                        size="lg"
                        onClick={() => handleStartCnae(currentCnae.code)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar diagnóstico
                      </Button>
                    </div>
                    {cnaeProgress.find(c => c.code === currentCnae.code)?.nivel1Done && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Este CNAE já foi respondido anteriormente. Clique para revisar.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Cabeçalho do CNAE atual (apenas quando iniciado) */}
            {currentCnae && startedCnaes.has(currentCnae.code) && (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-primary">{currentCnae.code}</span>
                    <Badge variant={currentLevel === "nivel2" ? "default" : "secondary"} className="text-xs">
                      {currentLevel === "nivel1" ? "Nível 1 — Essencial" : "Nível 2 — Aprofundamento"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{currentCnae.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">CNAE {currentCnaeIdx + 1} de {cnaes.length}</p>
                  <p className="text-xs font-medium text-primary mt-0.5">{answeredCount}/{questions.length} respondidas</p>
                </div>
              </div>
            )}

            {/* Loading e perguntas: apenas quando o CNAE foi iniciado pelo usuário */}
            {currentCnae && startedCnaes.has(currentCnae.code) && isLoadingQuestions ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Gerando perguntas personalizadas...</p>
                    <p className="text-xs text-muted-foreground mt-1">A IA está analisando o CNAE {currentCnae?.code}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Perguntas */}
                <div className="space-y-4">
                  {questions.map((question, idx) => (
                    <Card key={question.id} className={cn(
                      "transition-all duration-200",
                      answers[question.id]?.trim() ? "border-primary/20 shadow-sm" : "border-border"
                    )}>
                      <CardContent className="p-5 space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-bold text-primary/60 mt-0.5 shrink-0">{idx + 1}.</span>
                              <p className="text-sm font-medium leading-relaxed">
                                {question.text}
                                {question.required !== false && <span className="text-destructive ml-1">*</span>}
                              </p>
                            </div>
                            {answers[question.id]?.trim() && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            )}
                          </div>
                          <QuestionTypeIcon type={question.type} />
                        </div>
                        <QuestionField
                          question={question}
                          value={answers[question.id] || ""}
                          onChange={(v) => handleAnswer(question.id, v)}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Barra de progresso das perguntas */}
                {questions.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{answeredCount} de {questions.length} respondidas</span>
                      {!allRequiredAnswered && (
                        <span className="text-amber-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {requiredQuestions.filter(q => !answers[q.id]?.trim()).length} obrigatória(s) pendente(s)
                        </span>
                      )}
                    </div>
                    <Progress value={questions.length > 0 ? (answeredCount / questions.length) * 100 : 0} className="h-1.5" />
                  </div>
                )}

                <Separator />

                {/* RF-2.07: Botões de navegação e ação */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Botão Anterior — navega para o CNAE anterior se estiver no primeiro CNAE */}
                    {currentCnaeIdx > 0 && currentLevel === "nivel1" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground"
                        onClick={() => {
                          setCurrentCnaeIdx(prev => prev - 1);
                          setCurrentLevel("nivel1");
                          setAnswers({});
                          setQuestions([]);
                          setShowDeepDivePrompt(false);
                        }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        CNAE Anterior
                      </Button>
                    )}
                    {currentLevel === "nivel2" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground"
                        onClick={() => {
                          setCurrentLevel("nivel1");
                          setAnswers({});
                          setQuestions([]);
                          setShowDeepDivePrompt(false);
                          loadQuestions(currentCnaeIdx, "nivel1");
                        }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar ao Nível 1
                      </Button>
                    )}
                    {currentCnaeIdx === 0 && currentLevel === "nivel1" && (
                      <div className="text-xs text-muted-foreground">
                        {!allRequiredAnswered ? (
                          <span className="text-amber-600">Responda as obrigatórias (*) para avançar</span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Todas respondidas
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {currentLevel === "nivel1" ? (
                      <Button onClick={handleFinishLevel1} disabled={!allRequiredAnswered || isLoadingQuestions} size="lg">
                        {currentCnaeIdx === cnaes.length - 1 && currentLevel === "nivel1" ? (
                          <>Finalizar CNAE<CheckCircle2 className="h-4 w-4 ml-2" /></>
                        ) : (
                          <>Concluir Nível 1<ArrowRight className="h-4 w-4 ml-2" /></>
                        )}
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleSkipDeepDive}>
                          <SkipForward className="h-4 w-4 mr-2" />
                          Pular Nível 2
                        </Button>
                        <Button onClick={handleFinishLevel2} disabled={!allRequiredAnswered || isSaving} size="lg">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {currentCnaeIdx === cnaes.length - 1 ? (
                            <>Finalizar Questionário<CheckCircle2 className="h-4 w-4 ml-2" /></>
                          ) : (
                            <>Próximo CNAE<ArrowRight className="h-4 w-4 ml-2" /></>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ComplianceLayout>
  );
}
