// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import { useAutoSave, loadTempData, clearTempData } from "@/hooks/usePersistenceV3";
import { ResumeBanner } from "@/components/ResumeBanner";
import { useParams, useLocation, useSearch } from "wouter";
import { RevisaoQuestionario } from "@/components/RevisaoQuestionario";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import FlowStepper from "@/components/FlowStepper";
import { statusToCompletedStep } from "@/lib/flowStepperUtils";
import {
  ArrowLeft, ArrowRight, ChevronRight, Loader2, Sparkles,
  CheckCircle2, Clock, SkipForward, MessageSquare, BarChart2,
  AlignLeft, List, ToggleLeft, Layers, Play, FileQuestion,
  AlertCircle, RefreshCw, StickyNote
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  revisado: boolean; // RF-2.07 UX: true quando usuário retorna e altera respostas
  answers: { question: string; answer: string }[];
  nivel1Questions?: Question[]; // Cache das perguntas geradas para o nível 1 (evita rechamada à IA ao voltar)
  nivel1AnswersMap?: Record<string, string>; // Cache do mapa de respostas do nível 1 (id→valor)
  nivel2Answers: { question: string; answer: string }[];
  deepDiveRounds?: { roundIndex: number; answers: { question: string; answer: string }[]; contextNote?: string }[];
  currentRound?: number;
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
  const search = useSearch();
  const projectId = Number(id);

  // V70.2: Modo Revisão — ativado quando o usuário vem do Briefing para corrigir inconsistência
  const isRevisaoMode = new URLSearchParams(search).get("revisao") === "true";
  const perguntaInconsistente = new URLSearchParams(search).get("pergunta") ?? "";

  const [cnaes, setCnaes] = useState<{ code: string; description: string }[]>([]);
  const initializedRef = useRef(false); // Evita reset de cnaes após primeira carga (bug closure stale)
  const cnaeProgressInitializedRef = useRef(false); // Evita reset de cnaeProgress durante sessão ativa
  const [currentCnaeIdx, setCurrentCnaeIdx] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<"nivel1" | "nivel2">("nivel1");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cnaeProgress, setCnaeProgress] = useState<CnaeProgress[]>([]);
  const [showDeepDivePrompt, setShowDeepDivePrompt] = useState(false);
  const [confirmPrevCnae, setConfirmPrevCnae] = useState(false); // RF-2.07: confirmação ao retornar a CNAE concluído
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [isTimeoutError, setIsTimeoutError] = useState(false); // true quando o erro é LLM_TIMEOUT
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null); // countdown 10→0 ou null
  const retryCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryPendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Contador de tempo da geração de perguntas
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const generationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number>(0);
  // Tela de entrada por CNAE: Set de códigos CNAE que o usuário já iniciou
  // Persistido no localStorage junto com o progresso do questionário
  const [startedCnaes, setStartedCnaes] = useState<Set<string>>(new Set());
  // Feature: aprofundamento ilimitado
  const [currentRound, setCurrentRound] = useState(0); // 0 = nivel1, 1 = primeiro nivel2, 2 = segundo nivel2...
  const [showNextRoundPrompt, setShowNextRoundPrompt] = useState(false); // prompt após concluir nivel2
  const [contextNote, setContextNote] = useState(""); // campo livre de contexto adicional
  const [isValidatingContext, setIsValidatingContext] = useState(false); // loading da validação LLM
  const [contextValidationResult, setContextValidationResult] = useState<{ relevant: boolean; reason: string } | null>(null);
  const [contextRejected, setContextRejected] = useState(false); // true quando IA rejeitou o contexto e aguarda decisão do usuário
  const [contextAccepted, setContextAccepted] = useState(false); // true quando IA aceitou o contexto — exibe feedback verde brevemente

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
  const validateContextNoteMutation = trpc.fluxoV3.validateContextNote.useMutation();
  const saveQuestionsCacheMutation = trpc.fluxoV3.saveQuestionsCache.useMutation();
  // MAX_DEEP_DIVE_ROUNDS: limite máximo de rounds de aprofundamento por CNAE
  const MAX_DEEP_DIVE_ROUNDS = 5;

  // Buscar progresso salvo no banco (para retomada)
  const { data: savedProgress } = trpc.fluxoV3.getProgress.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Inicializar CNAEs do projeto (apenas uma vez — não resetar ao invalidar savedProgress)
  useEffect(() => {
    if (project?.confirmedCnaes && Array.isArray(project.confirmedCnaes)) {
      const cnaeList = project.confirmedCnaes as { code: string; description: string }[];
      // Só define cnaes uma vez: evita reset quando savedProgress é invalidado pelo saveAnswer
      if (!initializedRef.current) {
        setCnaes(cnaeList);
        initializedRef.current = true;
      }
      // Restaurar progresso a partir das respostas salvas no banco
      const savedAnswers = savedProgress?.answers || [];
      const answeredCnaes = new Set(savedAnswers.map((a: any) => a.cnaeCode));
      const nivel2Cnaes = new Set(
        savedAnswers.filter((a: any) => a.level === "nivel2").map((a: any) => a.cnaeCode)
      );
      // Só restaura cnaeProgress na primeira vez — após isso, o estado em memória é fonte de verdade
      // Isso evita que o saveAnswer (que invalida savedProgress) resete o progresso do usuário
      if (!cnaeProgressInitializedRef.current) {
        cnaeProgressInitializedRef.current = true;
        setCnaeProgress(cnaeList.map(c => ({
        code: c.code,
        description: c.description,
        nivel1Done: answeredCnaes.has(c.code),
        nivel2Done: nivel2Cnaes.has(c.code),
        skippedNivel2: answeredCnaes.has(c.code) && !nivel2Cnaes.has(c.code),
        revisado: false,
        answers: savedAnswers
          .filter((a: any) => a.cnaeCode === c.code && a.level === "nivel1")
          .map((a: any) => ({ question: a.questionText, answer: a.answerValue })),
        nivel2Answers: savedAnswers
          .filter((a: any) => a.cnaeCode === c.code && a.level === "nivel2")
          .map((a: any) => ({ question: a.questionText, answer: a.answerValue })),
      })));
        // Restaurar CNAEs já iniciados
        if (answeredCnaes.size > 0) {
          setStartedCnaes(answeredCnaes);
        }
      }
    }
  }, [project, savedProgress]);

  // Carregar perguntas do CNAE atual
  const loadQuestions = useCallback(async (
    cnaeIdx: number,
    level: "nivel1" | "nivel2",
    prevAnswers?: { question: string; answer: string }[],
    roundIndex?: number,
    contextNoteParam?: string,
  ) => {
    if (!cnaes[cnaeIdx]) return;
    setIsLoadingQuestions(true);
    setQuestionsError(null);
    setAnswers({});
    setQuestions([]);
    // Iniciar contador de tempo
    setGenerationElapsed(0);
    if (generationTimerRef.current) clearInterval(generationTimerRef.current);
    generationTimerRef.current = setInterval(() => {
      setGenerationElapsed(prev => prev + 1);
    }, 1000);
    try {
      const result = await generateQuestions.mutateAsync({
        projectId,
        cnaeCode: cnaes[cnaeIdx].code,
        cnaeDescription: cnaes[cnaeIdx].description,
        level,
        previousAnswers: prevAnswers,
        roundIndex: roundIndex ?? 0,
        contextNote: contextNoteParam,
      });
      const qs = result.questions || [];
      if (qs.length === 0) {
        setQuestionsError("A IA não retornou perguntas. Tente novamente.");
        toast.error("Erro ao gerar perguntas. Tente novamente.");
      } else {
        setQuestions(qs);
        // Salvar perguntas geradas no banco (persistência cross-device)
        saveQuestionsCacheMutation.mutate({
          projectId,
          cnaeCode: cnaes[cnaeIdx].code,
          level,
          roundIndex: roundIndex ?? 0,
          questionsJson: JSON.stringify(qs),
          contextNote: contextNoteParam || undefined, // Persistir contexto usado na geração
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[loadQuestions] error:", msg);
      const isTimeout = msg.includes("LLM_TIMEOUT");
      setIsTimeoutError(isTimeout);
      setQuestionsError(
        isTimeout
          ? "A IA demorou mais de 3 minutos para responder."
          : "Erro ao gerar perguntas. Tente novamente."
      );
      if (isTimeout) {
        // Iniciar countdown de 10s para retry automático
        setRetryCountdown(10);
        if (retryCountdownRef.current) clearInterval(retryCountdownRef.current);
        retryCountdownRef.current = setInterval(() => {
          setRetryCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(retryCountdownRef.current!);
              retryCountdownRef.current = null;
              return null;
            }
            return prev - 1;
          });
        }, 1000);
        // Disparar retry ao fim do countdown (10s)
        if (retryPendingRef.current) clearTimeout(retryPendingRef.current);
        retryPendingRef.current = setTimeout(() => {
          const cacheKey = `${cnaes[cnaeIdx]?.code}-${level}`;
          loadedQuestionsRef.current.delete(cacheKey);
          setQuestionsError(null);
          setIsTimeoutError(false);
          setRetryCountdown(null);
          loadQuestions(cnaeIdx, level, prevAnswers);
        }, 10_000);
      } else {
        toast.error("Erro ao gerar perguntas. Tente novamente.");
      }
    } finally {
      setIsLoadingQuestions(false);
      // Parar contador de tempo
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
    }
  }, [cnaes, projectId, generateQuestions]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Ref para rastrear quais CNAE+nível já tiveram perguntas carregadas (evita recargas em loop)
  // DEVE ser declarado ANTES dos useEffects que o utilizam
  const loadedQuestionsRef = useRef<Set<string>>(new Set());

  // Carregar perguntas quando o nível OU o CNAE atual muda
  // Cobre: (1) mudança de nível 1→2, (2) navegação entre CNAEs já iniciados
  // Não dispara no mount inicial — isso é tratado por handleStartCnae
  // Não dispara quando handleAcceptDeepDive já adicionou o cacheKey ao ref
  // Cleanup de todos os timers ao desmontar o componente
  useEffect(() => {
    return () => {
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      if (retryCountdownRef.current) {
        clearInterval(retryCountdownRef.current);
        retryCountdownRef.current = null;
      }
      if (retryPendingRef.current) {
        clearTimeout(retryPendingRef.current);
        retryPendingRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const currentCode = cnaes[currentCnaeIdx]?.code;
    if (!currentCode) return;
    const cacheKey = `${currentCode}-${currentLevel}`;
    // Só carrega se: CNAE foi iniciado E ainda não foi carregado para este nível
    // Isso garante que ao navegar para um CNAE já concluído (clicar no chip do topo
    // ou "Retornar ao CNAE anterior"), as perguntas sejam recarregadas
    if (startedCnaes.has(currentCode) && !loadedQuestionsRef.current.has(cacheKey)) {
      loadedQuestionsRef.current.add(cacheKey);
      loadQuestions(currentCnaeIdx, currentLevel);
    }
  }, [currentLevel, currentCnaeIdx]); // Reage a mudança de nível E de CNAE

  const currentCnae = cnaes[currentCnaeIdx];
  const answeredCount = Object.values(answers).filter(v => v.trim()).length;
  const requiredQuestions = questions.filter(q => q.required !== false);
  const allRequiredAnswered = requiredQuestions.every(q => answers[q.id]?.trim());
  const totalProgress = cnaeProgress.filter(c => c.nivel1Done).length;

  // Auto-save no localStorage a cada 800ms de inatividade
  // Inclui startedCnaes para persistir o estado de "iniciado" por CNAE
  useAutoSave(projectId, 'etapa2', { cnaeProgress, currentCnaeIdx, startedCnaes: [...startedCnaes] }, 800);

  // Handler: usuário clica em "Iniciar diagnóstico" — marca o CNAE como iniciado
  // e dispara a geração de perguntas pela IA diretamente (sem depender do useEffect)
  const handleStartCnae = (cnaeCode: string) => {
    const idx = cnaes.findIndex(c => c.code === cnaeCode);
    const cacheKey = `${cnaeCode}-nivel1`;
    setStartedCnaes(prev => new Set([...prev, cnaeCode]));
    // Carregar perguntas diretamente ao iniciar, sem depender do useEffect
    if (idx >= 0 && !loadedQuestionsRef.current.has(cacheKey)) {
      loadedQuestionsRef.current.add(cacheKey);
      loadQuestions(idx, "nivel1");
    }
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
        roundIndex: currentRound,
      });
    }
  };

  const handleFinishLevel1 = () => {
    if (!allRequiredAnswered) {
      toast.error("Responda todas as perguntas obrigatórias antes de avançar.");
      return;
    }
    // Salvar respostas do Nível 1
    // RF-2.07 UX: ao re-concluir um CNAE revisado, limpar a flag 'revisado'
    const level1Answers = questions.map(q => ({ question: q.text, answer: answers[q.id] || "" }));
    // Salvar também as perguntas geradas e o mapa de respostas para restauração sem rechamada à IA
    setCnaeProgress(prev => prev.map((c, i) =>
      i === currentCnaeIdx ? {
        ...c,
        nivel1Done: true,
        revisado: false,
        answers: level1Answers,
        nivel1Questions: [...questions], // cache das perguntas geradas
        nivel1AnswersMap: { ...answers }, // cache do mapa id→valor
      } : c
    ));
    setShowDeepDivePrompt(true);
  };

  const handleAcceptDeepDive = (withContextNote?: string) => {
    setShowDeepDivePrompt(false);
    setShowNextRoundPrompt(false);
    const currentCode = cnaes[currentCnaeIdx]?.code;
    if (!currentCode) return;
    const nextRound = currentRound + 1;
    // Pré-registrar o cacheKey ANTES de mudar o nível para evitar que o useEffect
    // dispare uma segunda chamada sem previousAnswers (Bug 3)
    const cacheKey = `${currentCode}-nivel2-round${nextRound}`;
    loadedQuestionsRef.current.add(cacheKey);
    // Também registrar o cacheKey genérico nivel2 para compatibilidade com o useEffect
    loadedQuestionsRef.current.add(`${currentCode}-nivel2`);
    // Coletar todas as respostas anteriores (nivel1 + todos os rounds anteriores)
    const level1Answers = questions.map(q => ({ question: q.text, answer: answers[q.id] || "" }));
    const allPrevAnswers = [
      ...cnaeProgress[currentCnaeIdx]?.answers || [],
      ...cnaeProgress[currentCnaeIdx]?.nivel2Answers || [],
      ...(cnaeProgress[currentCnaeIdx]?.deepDiveRounds || []).flatMap(r => r.answers),
    ];
    setCurrentRound(nextRound);
    setCurrentLevel("nivel2");
    setContextNote("");
    setContextValidationResult(null);
    loadQuestions(currentCnaeIdx, "nivel2", allPrevAnswers.length > 0 ? allPrevAnswers : level1Answers, nextRound, withContextNote);
  };

  const handleSkipDeepDive = () => {
    const total = cnaeProgress.length || cnaes.length;
    setCnaeProgress(prev => prev.map((c, i) =>
      i === currentCnaeIdx ? { ...c, skippedNivel2: true } : c
    ));
    setShowDeepDivePrompt(false);
    advanceToNextCnae(total);
  };

  const handleFinishLevel2 = () => {
    if (!allRequiredAnswered) {
      toast.error("Responda todas as perguntas obrigatórias antes de avançar.");
      return;
    }
    const roundAnswers = questions.map(q => ({ question: q.text, answer: answers[q.id] || "" }));
    // Salvar o round atual no progresso
    setCnaeProgress(prev => prev.map((c, i) => {
      if (i !== currentCnaeIdx) return c;
      const isFirstRound = currentRound <= 1;
      const newDeepDiveRounds = [
        ...(c.deepDiveRounds || []),
        { roundIndex: currentRound, answers: roundAnswers, contextNote: contextNote.trim() || undefined },
      ];
      return {
        ...c,
        nivel2Done: true,
        nivel2Answers: isFirstRound ? roundAnswers : c.nivel2Answers, // manter nivel2Answers do primeiro round
        deepDiveRounds: newDeepDiveRounds,
        currentRound,
      };
    }));
    // Mostrar prompt de novo round em vez de avançar imediatamente
    setShowNextRoundPrompt(true);
  };

  const handleConfirmNextRound = async () => {
    // Se há contexto digitado, validar automaticamente antes de avançar
    if (contextNote.trim().length > 0) {
      setIsValidatingContext(true);
      setContextRejected(false);
      try {
        const result = await validateContextNoteMutation.mutateAsync({
          projectId,
          cnaeCode: currentCnae?.code || "",
          cnaeDescription: currentCnae?.description || "",
          contextNote: contextNote.trim(),
        });
        setContextValidationResult(result);
        if (result.relevant) {
          // Contexto válido — exibir feedback verde por 1.5s antes de avançar
          setContextAccepted(true);
          setTimeout(() => {
            setContextAccepted(false);
            handleAcceptDeepDive(contextNote.trim());
          }, 1500);
        } else {
          // Contexto inválido — exibir alerta e aguardar decisão do usuário
          setContextRejected(true);
        }
      } catch {
        // Erro na validação — avançar sem contexto (não bloqueia o usuário)
        toast.error("Não foi possível validar o contexto. Avançando sem contexto adicional.");
        handleAcceptDeepDive();
      } finally {
        setIsValidatingContext(false);
      }
    } else {
      // Campo vazio — avançar diretamente sem validação
      handleAcceptDeepDive();
    }
  };

  const handleSkipNextRound = () => {
    // Usuário não quer mais rounds — avançar para próximo CNAE
    setShowNextRoundPrompt(false);
    setCurrentRound(0);
    advanceToNextCnae(cnaeProgress.length || cnaes.length);
  };

  // Recebe totalCnaes como parâmetro para evitar closure stale
  // Chamadores devem passar o valor correto (não depender do estado do closure)
  const advanceToNextCnae = (totalCnaes?: number) => {
    const total = totalCnaes ?? (cnaeProgress.length || cnaes.length);
    // BUGFIX V70.1: sempre resetar o DeepDivePrompt ao avançar de CNAE.
    // Sem isso, se showDeepDivePrompt estava true no CNAE anterior,
    // o próximo CNAE exibia o prompt imediatamente sem mostrar as perguntas,
    // e ao clicar "Pular" no último CNAE, ia direto para o Briefing.
    setShowDeepDivePrompt(false);
    setShowNextRoundPrompt(false);
    setCurrentRound(0);
    setContextNote("");
    setContextValidationResult(null);
    if (currentCnaeIdx < total - 1) {
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

  // Modo visualização: projeto já passou da etapa 2 (questionario concluído)
  // Exibe as respostas salvas no banco sem precisar regenerar perguntas pela IA
  const isViewMode = (project?.currentStep ?? 1) >= 3 || 
    ["aprovado", "em_andamento", "concluido", "arquivado", "em_avaliacao", "parado", "plano_acao", "matriz_riscos"].includes(project?.status ?? "");

  // V70.2: Modo Revisão substitui o isViewMode quando ?revisao=true
  // O usuário pode editar respostas sem regredir o status do projeto
  if (isViewMode && isRevisaoMode && savedProgress && !loadingProject) {
    return (
      <RevisaoQuestionario
        projectId={projectId}
        project={project}
        savedProgress={savedProgress}
        perguntaInconsistente={perguntaInconsistente}
        onSalvar={() => setLocation(`/projetos/${projectId}/briefing-v3?regenerar=true`)}
        onCancelar={() => setLocation(`/projetos/${projectId}/briefing-v3`)}
      />
    );
  }

  if (isViewMode && savedProgress && !loadingProject) {
    const allAnswers = savedProgress.answers || [];
    const cnaeList = (project?.confirmedCnaes as any[]) || [];
    // Agrupar respostas por CNAE
    const answersByCnae = cnaeList.map((cnae: any) => ({
      code: cnae.code,
      description: cnae.description,
      nivel1: allAnswers.filter((a: any) => a.cnaeCode === cnae.code && a.level === "nivel1"),
      nivel2: allAnswers.filter((a: any) => a.cnaeCode === cnae.code && a.level === "nivel2"),
    }));
    const totalAnswers = allAnswers.length;
    return (
      <ComplianceLayout>
        <div className="max-w-3xl mx-auto space-y-6 py-2">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="gap-2 text-sm shrink-0" onClick={() => setLocation(`/projetos/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar ao Projeto</span>
              <span className="sm:hidden">Voltar</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{project?.name || "Questionário"}</h1>
              <p className="text-sm text-muted-foreground">Etapa 2 de 5 — Questionário Adaptativo</p>
            </div>
          </div>
          {/* Stepper — clicável para etapas concluídas */}
          <FlowStepper currentStep={2} projectId={projectId} completedUpTo={statusToCompletedStep(project?.status)} />
          {/* Banner de conclusão */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">Questionário concluído</p>
              <p className="text-xs text-emerald-700 mt-0.5">{totalAnswers} respostas registradas em {cnaeList.length} CNAE(s). Você pode visualizar as respostas abaixo.</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-100" onClick={() => setLocation(`/projetos/${projectId}/briefing-v3`)}>
              Ver Briefing
            </Button>
          </div>
          {/* Respostas por CNAE */}
          {answersByCnae.map((cnae) => (
            <div key={cnae.code} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-primary">{cnae.code}</span>
                <Badge variant="secondary" className="text-xs">{cnae.description}</Badge>
                <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">
                  {cnae.nivel1.length + cnae.nivel2.length} respostas
                </Badge>
              </div>
              {cnae.nivel1.length > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nível 1 — Essencial</p>
                    {cnae.nivel1.map((a: any, idx: number) => (
                      <div key={idx} className="space-y-1 border-b last:border-0 pb-3 last:pb-0">
                        <p className="text-sm font-medium">{idx + 1}. {a.questionText}</p>
                        <p className="text-sm text-primary font-semibold pl-4">→ {a.answerValue}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {cnae.nivel2.length > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nível 2 — Aprofundamento</p>
                    {cnae.nivel2.map((a: any, idx: number) => (
                      <div key={idx} className="space-y-1 border-b last:border-0 pb-3 last:pb-0">
                        <p className="text-sm font-medium">{idx + 1}. {a.questionText}</p>
                        <p className="text-sm text-primary font-semibold pl-4">→ {a.answerValue}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {cnae.nivel1.length === 0 && cnae.nivel2.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Nenhuma resposta registrada para este CNAE.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
          {/* Ações */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setLocation(`/projetos/${projectId}`)}>Ver Projeto</Button>
            <Button variant="outline" onClick={() => setLocation(`/projetos/${projectId}/briefing-v3`)}>Ver Briefing</Button>
          </div>
        </div>
      </ComplianceLayout>
    );
  }

  return (
    <>
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
          <Button variant="ghost" className="gap-2 text-sm shrink-0" onClick={() => setLocation(`/projetos/${projectId}`)}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Projeto</span>
            <span className="sm:hidden">Voltar</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{project?.name || "Questionário"}</h1>
            <p className="text-sm text-muted-foreground">Etapa 2 de 5 — Questionário Adaptativo</p>
          </div>
        </div>

        {/* Stepper — clicável para etapas concluídas */}
        <FlowStepper currentStep={2} projectId={projectId} completedUpTo={statusToCompletedStep(project?.status)} />

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
                onClick={() => {
                  if (c.nivel1Done) {
                    // Limpar o cacheKey do ref para forçar recarga das perguntas
                    loadedQuestionsRef.current.delete(`${c.code}-nivel1`);
                    loadedQuestionsRef.current.delete(`${c.code}-nivel2`);
                    setCurrentCnaeIdx(i);
                    setCurrentLevel("nivel1");
                    setAnswers({});
                    setQuestions([]);
                    setShowDeepDivePrompt(false);
                    setShowNextRoundPrompt(false);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all",
                  i === currentCnaeIdx ? "border-primary bg-primary/10 text-primary" :
                  c.nivel1Done ? "border-emerald-300 bg-emerald-50 text-emerald-700 cursor-pointer" :
                  "border-border text-muted-foreground cursor-default"
                )}
              >
                {c.nivel1Done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Layers className="h-3 w-3" />}
                {c.code}
                {c.revisado && (
                  <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0 rounded-full bg-amber-100 text-amber-700 border border-amber-300 leading-4">
                    Revisado
                  </span>
                )}
                {c.nivel2Done && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                    {c.deepDiveRounds && c.deepDiveRounds.length > 0
                      ? `+${c.deepDiveRounds.length + 1}`
                      : "+2"}
                  </Badge>
                )}
                {/* Indicador de contexto adicional: aparece quando algum round foi gerado com nota */}
                {c.deepDiveRounds && c.deepDiveRounds.some(r => r.contextNote) && (
                  <span
                    title={`Contexto adicional usado em ${c.deepDiveRounds.filter(r => r.contextNote).length} round(s)`}
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet-100 border border-violet-300"
                  >
                    <StickyNote className="h-2.5 w-2.5 text-violet-600" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt de Aprofundamento (Nível 2) */}
        {showDeepDivePrompt && (
          <Card className="border-2 border-primary/20 bg-primary/3 shadow-sm">
            <CardContent className="p-6 space-y-5">
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
              {/* Campo livre de contexto adicional */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Contexto adicional <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Textarea
                  value={contextNote}
                  onChange={e => { setContextNote(e.target.value); setContextValidationResult(null); setContextRejected(false); }}
                  placeholder={`Descreva desafios, exceções ou pontos de atenção específicos do CNAE ${currentCnae?.code}...`}
                  rows={3}
                  className={`resize-none text-sm ${contextRejected ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
                  disabled={isValidatingContext}
                />
                {/* Feedback: contexto aceito pela IA — exibe brevemente antes de avançar */}
                {contextAccepted && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Contexto aceito!</p>
                      <p className="text-xs text-emerald-600">Será considerado para o desenvolvimento do questionário.</p>
                    </div>
                  </div>
                )}
                {/* Alerta: contexto rejeitado pela IA — aguarda decisão do usuário */}
                {contextRejected && contextValidationResult && !contextValidationResult.relevant && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-0.5">Contexto não relacionado ao CNAE</p>
                        <p className="text-xs text-amber-600">{contextValidationResult.reason}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => { setContextRejected(false); setContextValidationResult(null); }}
                      >
                        Revisar contexto
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => { setContextNote(""); setContextRejected(false); setContextValidationResult(null); handleAcceptDeepDive(); }}
                      >
                        Avançar sem contexto
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {!contextRejected && !contextAccepted && (
                  <Button
                    onClick={async () => {
                      if (contextNote.trim().length > 0) {
                        setIsValidatingContext(true);
                        setContextRejected(false);
                        try {
                          const result = await validateContextNoteMutation.mutateAsync({
                            projectId,
                            cnaeCode: currentCnae?.code || "",
                            cnaeDescription: currentCnae?.description || "",
                            contextNote: contextNote.trim(),
                          });
                          setContextValidationResult(result);
                          if (result.relevant) {
                            // Exibir feedback verde por 1.5s antes de avançar
                            setContextAccepted(true);
                            setTimeout(() => {
                              setContextAccepted(false);
                              handleAcceptDeepDive(contextNote.trim());
                            }, 1500);
                          } else {
                            setContextRejected(true);
                          }
                        } catch {
                          toast.error("Não foi possível validar o contexto. Avançando sem contexto adicional.");
                          handleAcceptDeepDive();
                        } finally {
                          setIsValidatingContext(false);
                        }
                      } else {
                        handleAcceptDeepDive();
                      }
                    }}
                    className="flex-1"
                    disabled={isValidatingContext}
                  >
                    {isValidatingContext
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Validando contexto...</>
                      : <><Sparkles className="h-4 w-4 mr-2" />Sim, quero me aprofundar</>
                    }
                  </Button>
                )}
                <Button variant="outline" onClick={handleSkipDeepDive} className="flex-1" disabled={isValidatingContext}>
                  <SkipForward className="h-4 w-4 mr-2" />
                  Avançar para próximo CNAE
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prompt de Novo Round de Aprofundamento */}
        {showNextRoundPrompt && !showDeepDivePrompt && (
          <Card className="border-2 border-blue-200 bg-blue-50/50 shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Deseja um novo round de aprofundamento?</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Round {currentRound} concluído para <strong>{currentCnae?.code}</strong>.
                    {currentRound >= MAX_DEEP_DIVE_ROUNDS
                      ? " Limite de rounds atingido."
                      : ` Você pode continuar se aprofundando (${currentRound} de ${MAX_DEEP_DIVE_ROUNDS} rounds usados), ou avançar para o próximo CNAE.`}
                  </p>
                  {/* Barra de progresso dos rounds */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Rounds usados</span>
                      <span className={currentRound >= MAX_DEEP_DIVE_ROUNDS ? "text-red-600 font-semibold" : "text-primary font-medium"}>{currentRound} / {MAX_DEEP_DIVE_ROUNDS}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${currentRound >= MAX_DEEP_DIVE_ROUNDS ? "bg-red-500" : "bg-primary"}`}
                        style={{ width: `${Math.min((currentRound / MAX_DEEP_DIVE_ROUNDS) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Campo livre de contexto para novo round */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Contexto para este round <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Textarea
                  value={contextNote}
                  onChange={e => { setContextNote(e.target.value); setContextValidationResult(null); setContextRejected(false); }}
                  placeholder={`Algum ponto específico que ainda não foi abordado no CNAE ${currentCnae?.code}?`}
                  rows={3}
                  className={`resize-none text-sm ${contextRejected ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
                  disabled={isValidatingContext}
                />
                {/* Feedback: contexto aceito pela IA — exibe brevemente antes de avançar */}
                {contextAccepted && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Contexto aceito!</p>
                      <p className="text-xs text-emerald-600">Será considerado para o desenvolvimento do questionário.</p>
                    </div>
                  </div>
                )}
                {/* Alerta: contexto rejeitado pela IA — aguarda decisão do usuário */}
                {contextRejected && contextValidationResult && !contextValidationResult.relevant && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-0.5">Contexto não relacionado ao CNAE</p>
                        <p className="text-xs text-amber-600">{contextValidationResult.reason}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => { setContextRejected(false); setContextValidationResult(null); }}
                      >
                        Revisar contexto
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => { setContextNote(""); setContextRejected(false); setContextValidationResult(null); handleAcceptDeepDive(); }}
                      >
                        Avançar sem contexto
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {currentRound >= MAX_DEEP_DIVE_ROUNDS && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Limite de {MAX_DEEP_DIVE_ROUNDS} rounds de aprofundamento atingido para este CNAE. Avance para o próximo CNAE.</span>
                  </div>
                )}
                {!contextRejected && !contextAccepted && (
                  <Button
                    onClick={() => handleConfirmNextRound()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={currentRound >= MAX_DEEP_DIVE_ROUNDS || isValidatingContext}
                  >
                    {isValidatingContext
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Validando contexto...</>
                      : <><Sparkles className="h-4 w-4 mr-2" />{currentRound >= MAX_DEEP_DIVE_ROUNDS ? "Limite atingido" : "Sim, mais um round"}</>
                    }
                  </Button>
                )}
                <Button variant="outline" onClick={handleSkipNextRound} className="flex-1" disabled={isValidatingContext || contextAccepted}>
                  <SkipForward className="h-4 w-4 mr-2" />
                  {currentCnaeIdx === cnaes.length - 1 ? "Finalizar Questionário" : "Próximo CNAE"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Área do Questionário: ocultado quando prompt de aprofundamento ou prompt de novo round estão visíveis */}
        {!showDeepDivePrompt && !showNextRoundPrompt && (
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
                            const prevProgress = cnaeProgress[currentCnaeIdx - 1];
                            if (prevProgress?.nivel1Done) {
                              setConfirmPrevCnae(true);
                            } else {
                              setCurrentCnaeIdx(prev => prev - 1);
                              setCurrentLevel("nivel1");
                              setAnswers({});
                              setQuestions([]);
                              setShowDeepDivePrompt(false);
                              setShowNextRoundPrompt(false);
                            }
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
                      {currentLevel === "nivel1"
                        ? "Nível 1 — Essencial"
                        : currentRound <= 1
                          ? "Nível 2 — Aprofundamento"
                          : `Nível ${currentRound + 1} — Round ${currentRound}`}
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
              (() => {
                // Tempo estimado por nível (em segundos)
                const estimatedSeconds = currentLevel === "nivel2" ? 60 : 45;
                // Progresso: sobe até 95% para não chegar a 100% antes de terminar
                const progressPct = Math.min(95, Math.round((generationElapsed / estimatedSeconds) * 100));
                // Formatação do tempo decorrido
                const elapsedLabel = generationElapsed >= 60
                  ? `${Math.floor(generationElapsed / 60)}m ${generationElapsed % 60}s`
                  : `${generationElapsed}s`;
                // Mensagem contextual por faixa de tempo
                const contextMsg = generationElapsed < 15
                  ? `Analisando o CNAE ${currentCnae?.code} e o contexto do negócio...`
                  : generationElapsed < 45
                  ? "Buscando artigos regulatórios da Reforma Tributária..."
                  : "Finalizando perguntas personalizadas para o seu diagnóstico...";
                return (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-14 gap-5">
                      <div className="relative">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-semibold">Gerando perguntas personalizadas...</p>
                        <p className="text-xs text-muted-foreground">{contextMsg}</p>
                      </div>
                      {/* Barra de progresso estimada */}
                      <div className="w-full max-w-xs space-y-2">
                        <Progress value={progressPct} className="h-1.5" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {elapsedLabel}
                          </span>
                          <span>~{Math.max(0, estimatedSeconds - generationElapsed)}s restantes</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()
            ) : questionsError ? (
              <Card className={isTimeoutError ? "border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20" : "border-destructive/30 bg-destructive/5"}>
                <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                  {isTimeoutError && retryCountdown !== null ? (
                    // Modo countdown: anel animado com número
                    <>
                      <div className="relative flex items-center justify-center">
                        {/* Anel SVG animado */}
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor"
                            className="text-amber-200 dark:text-amber-900" strokeWidth="4" />
                          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor"
                            className="text-amber-500" strokeWidth="4"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            strokeDashoffset={`${2 * Math.PI * 28 * (1 - retryCountdown / 10)}`}
                            strokeLinecap="round"
                            style={{ transition: "stroke-dashoffset 0.9s linear" }}
                          />
                        </svg>
                        <span className="absolute text-xl font-bold text-amber-600 dark:text-amber-400">
                          {retryCountdown}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Tempo limite atingido</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                          Nova tentativa automática em <strong>{retryCountdown}s</strong>...
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Cancelar retry automático
                          if (retryCountdownRef.current) { clearInterval(retryCountdownRef.current); retryCountdownRef.current = null; }
                          if (retryPendingRef.current) { clearTimeout(retryPendingRef.current); retryPendingRef.current = null; }
                          setRetryCountdown(null);
                        }}
                      >
                        Cancelar retry automático
                      </Button>
                    </>
                  ) : (
                    // Modo erro normal (timeout cancelado ou erro genérico)
                    <>
                      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-destructive">Falha ao gerar perguntas</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{questionsError}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const cacheKey = `${currentCnae?.code}-${currentLevel}`;
                          loadedQuestionsRef.current.delete(cacheKey);
                          setQuestionsError(null);
                          setIsTimeoutError(false);
                          const prevAnswers = currentLevel === "nivel2" ? (cnaeProgress[currentCnaeIdx]?.answers || []) : undefined;
                          loadQuestions(currentCnaeIdx, currentLevel, prevAnswers);
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tentar novamente
                      </Button>
                    </>
                  )}
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
                          const prevProgress = cnaeProgress[currentCnaeIdx - 1];
                          if (prevProgress?.nivel1Done) {
                            setConfirmPrevCnae(true);
                          } else {
                            setCurrentCnaeIdx(prev => prev - 1);
                            setCurrentLevel("nivel1");
                            setAnswers({});
                            setQuestions([]);
                            setShowDeepDivePrompt(false);
                            setShowNextRoundPrompt(false);
                          }
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
                          // Restaurar perguntas e respostas do Nível 1 do cache (sem rechamar a IA)
                          const cachedProgress = cnaeProgress[currentCnaeIdx];
                          if (cachedProgress?.nivel1Questions?.length) {
                            setQuestions(cachedProgress.nivel1Questions);
                            setAnswers(cachedProgress.nivel1AnswersMap || {});
                          } else {
                            // Fallback: se não há cache (sessão antiga), recarregar da IA
                            const currentCode = cnaes[currentCnaeIdx]?.code;
                            if (currentCode) {
                              loadedQuestionsRef.current.delete(`${currentCode}-nivel1`);
                            }
                            setAnswers({});
                            setQuestions([]);
                          }
                          setCurrentLevel("nivel1");
                          setCurrentRound(0);
                          setShowDeepDivePrompt(true); // Mostrar o prompt de aprofundamento (nível 1 já concluído)
                          setShowNextRoundPrompt(false);
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
                          Pular e avançar
                        </Button>
                        <Button onClick={handleFinishLevel2} disabled={!allRequiredAnswered || isSaving} size="lg">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                          Concluir Nível 2
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

    {/* RF-2.07: Diálogo de confirmação ao retornar a CNAE já concluído */}
    <AlertDialog open={confirmPrevCnae} onOpenChange={setConfirmPrevCnae}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retornar ao CNAE anterior?</AlertDialogTitle>
          <AlertDialogDescription>
            O CNAE <strong>{cnaeProgress[currentCnaeIdx - 1]?.code}</strong> já foi concluído.
            Ao retornar, você poderá revisar as respostas, mas o progresso atual deste CNAE será preservado.
            Deseja continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const targetIdx = currentCnaeIdx - 1;
              const targetCode = cnaeProgress[targetIdx]?.code;
              // Limpar cacheKey do ref para forçar recarga das perguntas
              if (targetCode) {
                loadedQuestionsRef.current.delete(`${targetCode}-nivel1`);
                loadedQuestionsRef.current.delete(`${targetCode}-nivel2`);
              }
              // RF-2.07 UX: marcar o CNAE alvo como 'revisado' ao retornar
              setCnaeProgress(prev => prev.map((c, i) =>
                i === targetIdx && c.nivel1Done ? { ...c, revisado: true } : c
              ));
              setCurrentCnaeIdx(targetIdx);
              setCurrentLevel("nivel1");
              setAnswers({});
              setQuestions([]);
              setShowDeepDivePrompt(false);
              setShowNextRoundPrompt(false);
              setConfirmPrevCnae(false);
            }}
          >
            Sim, retornar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
