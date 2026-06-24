/**
 * QuestionarioSolaris.tsx — K-4-B
 * ─────────────────────────────────────────────────────────────────────────────
 * Tela da Onda 1: exibe as 12 perguntas SOL-001..SOL-012 da Equipe Jurídica
 * SOLARIS, salva respostas em solaris_answers via procedure completeOnda1.
 *
 * Critério de aceite do P.O.:
 * "Ao criar projeto com CNAE 4639-7/01, o PRIMEIRO questionário apresentado
 *  é o Questionário SOLARIS com as 12 questões dos advogados, com badge azul."
 *
 * Enforcement: assertValidTransition é chamado no backend (completeOnda1).
 * Issue: K-4-B | Milestone: M2 — Sprint K
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Scale,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowRight,
  SkipForward,
  AlertTriangle,
  Lightbulb,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  computeVisibleSolarisQuestions,
  isCreditoPresumidoGateQuestion,
} from "@/lib/solaris-question-visibility";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Question {
  id: number;
  codigo: string;
  texto: string;
  categoria: string;
  cnaeGroups: unknown;
  obrigatorio: number;
  existingAnswer: string | null;
}

// ─── FEAT-SOL-UX-01 PR-C — Radio dual-column ─────────────────────────────────
// Substitui os prefix-buttons históricos (fix UAT 2026-04-20 / opção A2) por
// um RadioGroup estruturado de 4 opções que escreve em `solaris_answers.resposta_opcao`
// (coluna nova — migration 0120 / PR-A). O Textarea legado fica como justificativa
// opcional gravada em `solaris_answers.resposta` (text — preservada intacta).

type RespostaOpcao = "sim" | "nao" | "nao_sei" | "nao_se_aplica";

const OPCOES: ReadonlyArray<{ value: RespostaOpcao; label: string; testId: string }> = [
  { value: "sim", label: "Sim", testId: "sim" },
  { value: "nao", label: "Não", testId: "nao" },
  { value: "nao_sei", label: "Não sei", testId: "nao-sei" },
  { value: "nao_se_aplica", label: "Não se aplica", testId: "nao-se-aplica" },
];

// ─── Componente: Card "Objetivo desta pergunta" ───────────────────────────────
// FEAT-SOL-UX-01 PR-C — sempre expandido. Consome solarisObjetivo.get por código.
// Fallback silencioso: se a rota retorna { objetivo: null }, o card não aparece —
// não bloqueia o fluxo (Lição #67 — degradação graciosa).

function ObjetivoCard({ codigo }: { codigo: string }) {
  const { data, isFetching, isError } = trpc.solarisObjetivo.get.useQuery(
    { codigo },
    {
      // Sem refetch em foco/reconnect — o card é informacional, custo controlado
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Cacheia por sessão para evitar regeneração ao navegar entre perguntas
      staleTime: Infinity,
    }
  );

  // Loading: skeleton enxuto enquanto o LLM responde (≤5s)
  if (isFetching && !data) {
    return (
      <Alert
        className="border-amber-500/30 bg-amber-500/5"
        data-testid="objetivo-card-loading"
      >
        <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
        <AlertDescription className="text-xs text-muted-foreground">
          <strong className="block text-sm text-amber-700 dark:text-amber-400">
            Objetivo desta pergunta
          </strong>
          <span className="flex items-center gap-2 pt-1">
            <Skeleton className="h-3 w-full" />
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // Sem objetivo (pergunta sem registro, LLM 5xx, timeout 5s): não renderiza nada
  if (isError || !data?.objetivo) return null;

  return (
    <Alert
      className="border-amber-500/30 bg-amber-500/5"
      data-testid="objetivo-card"
    >
      <Lightbulb className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-xs text-muted-foreground">
        <strong className="block text-sm text-amber-700 dark:text-amber-400">
          Objetivo desta pergunta
        </strong>
        <span
          className="block pt-1 leading-relaxed"
          data-testid="objetivo-card-texto"
        >
          {data.objetivo}
        </span>
      </AlertDescription>
    </Alert>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function QuestionarioSolaris() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Estado local das respostas: { [questionId]: resposta }
  const [answers, setAnswers] = useState<Record<number, string>>({});
  // FEAT-SOL-UX-01 PR-C — opção discreta (dual-column). null = ainda não selecionado.
  const [opcoes, setOpcoes] = useState<Record<number, RespostaOpcao | null>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Feature flags (G15) ─────────────────────────────────────────────────
  const { data: featureFlags } = trpc.system.getFeatureFlags.useQuery();
  const showOndaBadge = featureFlags?.g15FontePerguntas ?? false;

  // ── M2 PR-B gate: redirecionar para /perfil-entidade se flag ativa e perfil ainda não confirmado ─
  const m2EnabledQuery = trpc.featureFlags.isM2Enabled.useQuery(
    { projectId },
    { enabled: !!projectId && !isNaN(projectId) },
  );
  const perfilGetQuery = trpc.perfil.get.useQuery(
    { projectId },
    {
      enabled: !!projectId && !isNaN(projectId) && m2EnabledQuery.data === true,
      retry: false,
    },
  );
  useEffect(() => {
    if (!m2EnabledQuery.data) return; // flag false: comportamento legado preservado
    if (perfilGetQuery.isLoading) return;
    if (perfilGetQuery.data && perfilGetQuery.data.confirmed === false) {
      setLocation(`/projetos/${projectId}/perfil-entidade`, { replace: true });
    }
  }, [m2EnabledQuery.data, perfilGetQuery.data, perfilGetQuery.isLoading, projectId, setLocation]);

  // ── Buscar perguntas ──────────────────────────────────────────────────────
  const { data, isLoading, error } = trpc.fluxoV3.getOnda1Questions.useQuery(
    { projectId },
    { enabled: !!projectId && !isNaN(projectId) }
  );

  // Pré-popular respostas existentes quando os dados chegam
  const questionsData = data?.questions ?? [];
  useMemo(() => {
    if (!data) return;
    const pre: Record<number, string> = {};
    data.questions.forEach((q) => {
      if (q.existingAnswer) pre[q.id] = q.existingAnswer;
    });
    setAnswers((prev) => {
      // Só pré-popula se não há resposta local ainda
      const merged: Record<number, string> = { ...pre };
      Object.entries(prev).forEach(([k, v]) => { if (v) merged[Number(k)] = v; });
      return merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.questions.length]);

  // ── ADR-0016 Etapa 4: Skip de perguntas e questionário ─────────────────────
  const [confirmSkipAll, setConfirmSkipAll] = useState(false);
  const [skippedIds, setSkippedIds] = useState<Set<number>>(new Set());

  const skipSolarisQuestion = trpc.fluxoV3.skipSolarisQuestion.useMutation({
    onSuccess: (data) => {
      const newSkipped = new Set(data.skippedIds.map(Number));
      setSkippedIds(newSkipped);
      toast.info("Pergunta pulada. Você pode voltar e responder depois.");
      if (currentIndex < totalQuestions - 1) setCurrentIndex((i) => i + 1);
    },
    onError: (err) => toast.error(err.message ?? "Erro ao pular pergunta."),
  });

  const skipQuestionnaire = trpc.fluxoV3.skipQuestionnaire.useMutation({
    onSuccess: (data) => {
      toast.warning(data.confidenceWarning, { duration: 6000 });
      // Mud.4 (#1570) — auto-chain: pular SOLARIS também vai direto ao IA Gen (flag ON).
      const autopilot =
        (import.meta.env.VITE_ENABLE_AUTO_PILOT as string | undefined) === "true";
      setLocation(
        autopilot
          ? `/projetos/${projectId}/questionario-iagen`
          : `/projetos/${projectId}`,
      );
    },
    onError: (err) => toast.error(err.message ?? "Erro ao pular questionário."),
  });

  const completeOnda1 = trpc.fluxoV3.completeOnda1.useMutation({
    onSuccess: () => {
      toast.success("Questionário SOLARIS concluído! Avançando para a próxima etapa.");
      // Mud.4 (#1570) — auto-chain: flag ON vai direto ao IA Gen; OFF volta ao hub (atual).
      const autopilot =
        (import.meta.env.VITE_ENABLE_AUTO_PILOT as string | undefined) === "true";
      setLocation(
        autopilot
          ? `/projetos/${projectId}/questionario-iagen`
          : `/projetos/${projectId}`,
      );
    },
    onError: (err) => {
      toast.error(err.message ?? "Erro ao salvar respostas. Tente novamente.");
      setIsSubmitting(false);
    },
  });
  // BUG-SOLARIS-SAVE: auto-save individual com debounce 800ms
  const saveSolarisAnswer = trpc.fluxoV3.saveSolarisAnswer.useMutation();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BUG-SOLARIS-SAVE: Mudança 3 — retomar da última pergunta não respondida
  useEffect(() => {
    if (!data?.questions?.length) return;
    const qs = data.questions;
    // Encontrar a primeira pergunta SEM resposta salva (existingAnswer)
    const firstUnanswered = qs.findIndex((q) => !q.existingAnswer);
    const resumeIndex = firstUnanswered > 0 ? firstUnanswered : 0;
    setCurrentIndex(resumeIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.questions?.length]);

  // ── Derivações ────────────────────────────────────────────────────────────

  const questions: Question[] = useMemo(() => data?.questions ?? [], [data]);

  // BUG-UX-01 (#1249): visibilidade condicional — SOL-052 só aparece quando
  // SOL-051 = "Sim". Filtro reativo de DISPLAY/navegação (não toca gate nem submit).
  const visibleQuestions = useMemo(
    () => computeVisibleSolarisQuestions(questions, answers),
    [questions, answers]
  );

  const currentQuestion = visibleQuestions[currentIndex];
  const totalQuestions = visibleQuestions.length;

  // BUG-UX-01 (#1249): clamp do currentIndex quando a lista visível encolhe
  // (ex.: usuário muda SOL-051 de "Sim" para "Não" estando além de SOL-052).
  useEffect(() => {
    if (currentIndex > visibleQuestions.length - 1) {
      setCurrentIndex(Math.max(0, visibleQuestions.length - 1));
    }
  }, [visibleQuestions.length, currentIndex]);

  // FEAT-SOL-UX-01 PR-C — pergunta respondida se houver opção selecionada
  // OU texto livre preenchido (mantém retrocompatibilidade com fluxo pré-radio).
  const answeredCount = useMemo(
    () =>
      visibleQuestions.filter(
        (q) => opcoes[q.id] != null || answers[q.id]?.trim()
      ).length,
    [visibleQuestions, answers, opcoes]
  );

  const progressPct = totalQuestions > 0
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;

  // ADR-0016 Opção B: sem perguntas obrigatórias — habilitar Concluir assim que as perguntas carregarem
  const canSubmit = visibleQuestions.length > 0

  // ── Handlers ────────────────────────────────────────────────────────────────────────────────

  const handleSkipQuestion = useCallback(() => {
    if (!currentQuestion) return;
    skipSolarisQuestion.mutate({ projectId, questionId: String(currentQuestion.id) });
  }, [currentQuestion, projectId, skipSolarisQuestion]);

  const handleSkipAll = useCallback(() => {
    skipQuestionnaire.mutate({ projectId, questionnaire: 'solaris' });
    setConfirmSkipAll(false);
  }, [projectId, skipQuestionnaire]);

  // FEAT-SOL-UX-01 PR-C — auto-save dual-column (texto livre + opção discreta)
  // Recebe os valores novos como argumento para evitar closure stale do setTimeout.
  function scheduleSave(
    questionId: number,
    texto: string,
    opcao: RespostaOpcao | null
  ) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;
    saveTimer.current = setTimeout(() => {
      saveSolarisAnswer.mutate({
        projectId,
        questionId,
        codigo: question.codigo,
        answer: texto,
        respostaOpcao: opcao,
      });
    }, 800);
  }

  function handleAnswerChange(questionId: number, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    scheduleSave(questionId, value, opcoes[questionId] ?? null);
  }

  function handleOpcaoChange(questionId: number, value: RespostaOpcao) {
    setOpcoes((prev) => ({ ...prev, [questionId]: value }));
    scheduleSave(questionId, answers[questionId] ?? "", value);
  }

  function handleNext() {
    if (currentIndex < totalQuestions - 1) setCurrentIndex((i) => i + 1);
  }

  function handlePrev() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  async function handleSubmit() {
    if (!canSubmit) {
      // ADR-0016 MASP: mensagem alinhada com Opção B (canSubmit = questions.length > 0)
      toast.warning("Nenhuma pergunta disponível para concluir.");
      return;
    }
    setIsSubmitting(true);

    // ADR-0016 MASP: envia TODAS as perguntas (sem filter) — consistênte com IaGen
    // Perguntas sem resposta chegam com resposta: "" e são aceitas pelo backend (z.string())
    // FEAT-SOL-UX-01 PR-C — payload dual-column: texto livre + opção discreta
    const payload = questions.map((q) => ({
      questionId: q.id,
      codigo: q.codigo,
      resposta: answers[q.id]?.trim() ?? "",
      respostaOpcao: opcoes[q.id] ?? null,
    }));

    completeOnda1.mutate({ projectId, answers: payload });
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-3xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message ?? "Erro ao carregar questionário. Verifique sua conexão."}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setLocation(`/projetos/${projectId}`)}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar ao projeto
          </Button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-3xl">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma pergunta SOLARIS encontrada. Entre em contato com a equipe jurídica.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setLocation(`/projetos/${projectId}`)}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar ao projeto
          </Button>
        </div>
      </div>
    );
  }

  // ── Render principal ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/projetos/${projectId}`)}
              className="shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-500/20">
                <Scale className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">Questionário SOLARIS</p>
                <p className="text-xs text-muted-foreground">Etapa 1 de 8 — Onda 1</p>
              </div>
            </div>
          </div>
          {/* Badge azul — critério de aceite do P.O. */}
          <Badge
            variant="outline"
            className="shrink-0 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-xs"
          >
            Equipe técnica SOLARIS
          </Badge>
        </div>

        {/* Barra de progresso */}
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {answeredCount} de {totalQuestions} respondidas
            </span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
              {progressPct}%
            </span>
          </div>
          <Progress
            value={progressPct}
            className="h-1.5 [&>div]:bg-blue-500"
          />
        </div>
      </div>

      {/* ── Corpo ── */}
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">

        {/* Índice de perguntas (pills) */}
        <div className="flex flex-wrap gap-1.5">
          {visibleQuestions.map((q, idx) => {
            const answered = !!answers[q.id]?.trim();
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "h-7 w-7 rounded-full text-xs font-semibold transition-all border",
                  isCurrent
                    ? "border-blue-500 bg-blue-500 text-white"
                    : answered
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border bg-background text-muted-foreground hover:border-blue-500/50"
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* UX-02 (#1250): header de contexto do bloco crédito presumido (Art. 168).
            Aparece nas 3 perguntas-gate (SOL-050/051/052), independente de onde
            o usuário entra no bloco. Apresentação apenas — não toca conteúdo/gate. */}
        {currentQuestion && isCreditoPresumidoGateQuestion(currentQuestion.codigo) && (
          <Alert
            className="border-blue-500/30 bg-blue-500/5"
            data-testid="solaris-section-header-credito-presumido"
          >
            <Scale className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-xs text-muted-foreground">
              <strong className="block text-sm text-blue-700 dark:text-blue-400">
                Crédito Presumido — Produtor Rural
              </strong>
              Art. 168 LC 214/2025 — aplicável a qualquer contribuinte que adquira
              de produtor rural não contribuinte, independentemente do CNAE.
            </AlertDescription>
          </Alert>
        )}

        {/* Card da pergunta atual */}
        {currentQuestion && (
          <Card className="border-blue-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      {currentQuestion.codigo}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 border-slate-300 text-slate-600 dark:text-slate-400"
                    >
                      {currentQuestion.categoria}
                    </Badge>
                    {/* ADR-0016 Etapa 4: label "Obrigatória" removido — skip habilitado */}
                    {/* G15 — ONDA_BADGE: exibido sob feature flag g15-fonte-perguntas */}
                    {showOndaBadge && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 border-blue-300/60 text-blue-600 dark:text-blue-400 bg-blue-500/5"
                        title="Origem: Orientação jurídica SOLARIS (Onda 1)"
                      >
                        • Onda 1 — SOLARIS
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base leading-snug">
                    {currentQuestion.texto}
                  </CardTitle>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {currentIndex + 1}/{totalQuestions}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* C3 — Card "Objetivo desta pergunta" — sempre expandido. */}
              <ObjetivoCard codigo={currentQuestion.codigo} />

              {/* C1 — Radio dual-column: 4 opções acima do textarea. */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Selecione a resposta</p>
                <RadioGroup
                  value={opcoes[currentQuestion.id] ?? ""}
                  onValueChange={(v) =>
                    handleOpcaoChange(currentQuestion.id, v as RespostaOpcao)
                  }
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                  data-testid={`radio-opcoes-${currentQuestion.id}`}
                >
                  {OPCOES.map((opt) => (
                    <div
                      key={opt.value}
                      className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 hover:border-blue-500/50"
                    >
                      <RadioGroupItem
                        value={opt.value}
                        id={`opcao-${currentQuestion.id}-${opt.testId}`}
                        data-testid={`radio-opcao-${opt.testId}`}
                      />
                      <Label
                        htmlFor={`opcao-${currentQuestion.id}-${opt.testId}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* C4 — Badge informativo quando "Não sei" — não bloqueia. */}
                {opcoes[currentQuestion.id] === "nao_sei" && (
                  <Alert
                    className="border-amber-500/40 bg-amber-500/5"
                    data-testid="badge-nao-sei-info"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                      Para efeitos de diagnóstico tributário, esta resposta será
                      tratada de forma conservadora — equivalente a uma negativa.
                      Você pode avançar normalmente.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* C2 — Textarea agora opcional: justificativa / complemento. */}
              <div className="space-y-1.5">
                <Label
                  htmlFor={`justificativa-${currentQuestion.id}`}
                  className="text-xs text-muted-foreground"
                >
                  Justificativa / complemento{" "}
                  <span className="text-muted-foreground/70">(opcional)</span>
                </Label>
                <Textarea
                  id={`justificativa-${currentQuestion.id}`}
                  placeholder="Adicione contexto, fundamento ou ressalva. Ex.: contrato vigente desde 2024, processo em revisão pela auditoria, etc."
                  value={answers[currentQuestion.id] ?? ""}
                  onChange={(e) =>
                    handleAnswerChange(currentQuestion.id, e.target.value)
                  }
                  rows={4}
                  className="resize-none focus-visible:ring-blue-500/50"
                  data-testid={`textarea-resposta-${currentQuestion.id}`}
                />
              </div>

              {/* Indicador de resposta salva */}
              {(opcoes[currentQuestion.id] != null ||
                answers[currentQuestion.id]?.trim()) && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resposta registrada
                </p>
              )}
              {/* ADR-0016 Etapa 4: Botão Pular pergunta — só aparece quando NEM opção
                  selecionada NEM texto livre preenchido (FEAT-SOL-UX-01 PR-C). */}
              {opcoes[currentQuestion.id] == null &&
                !answers[currentQuestion.id]?.trim() &&
                !skippedIds.has(currentQuestion.id) && (
                <div className="flex justify-end pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkipQuestion}
                    disabled={skipSolarisQuestion.isPending}
                    data-testid={`btn-pular-pergunta-${currentQuestion.id}`}
                    className="text-xs text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1.5"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    Pular esta pergunta
                  </Button>
                </div>
              )}
              {skippedIds.has(currentQuestion.id) && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Pergunta pulada
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navegação entre perguntas */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            size="sm"
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            {currentIndex < totalQuestions - 1 ? (
              <Button
                onClick={handleNext}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Próxima
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                size="sm"
                className={cn(
                  "font-semibold",
                  canSubmit
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Save className="mr-1.5 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    Concluir Onda 1
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* ADR-0016 Etapa 4: Botão Pular questionário */}
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmSkipAll(true)}
            data-testid="btn-pular-questionario-solaris"
            className="text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Pular este questionário
          </Button>
        </div>

        {/* Modal de confirmação — Pular questionário */}
        <Dialog open={confirmSkipAll} onOpenChange={setConfirmSkipAll}>
          <DialogContent data-testid="modal-confirmar-pular-questionario">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Pular questionário SOLARIS?
              </DialogTitle>
              <DialogDescription>
                Ao pular este questionário, o diagnóstico será gerado com{" "}
                <strong>confiança reduzida</strong>. Você poderá voltar e
                responder as perguntas depois.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmSkipAll(false)}
                data-testid="btn-cancelar-pular"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleSkipAll}
                disabled={skipQuestionnaire.isPending}
                data-testid="btn-confirmar-pular"
              >
                {skipQuestionnaire.isPending ? "Pulando..." : "Confirmar — Pular questionário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Aviso de perguntas obrigatórias pendentes */}
        {/* ADR-0016: aviso de obrigatórias removido — sem perguntas obrigatórias no fluxo TO-BE */}

        {/* Resumo final (última pergunta) */}
        {currentIndex === totalQuestions - 1 && canSubmit && (
          <Alert className="border-emerald-500/40 bg-emerald-500/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-400">
              Todas as {totalQuestions} perguntas respondidas. Clique em "Concluir Onda 1" para salvar e avançar.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
