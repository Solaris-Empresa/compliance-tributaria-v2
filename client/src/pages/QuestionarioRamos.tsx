import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Building2,
  ArrowRight,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  question: string;
  type: "single_choice" | "multiple_choice" | "text" | "scale";
  options?: string[];
  required: boolean;
  helpText?: string;
}

interface ConfirmedBranch {
  code: string;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_CONFIG = {
  baixo: { label: "Baixo Risco", color: "bg-green-100 text-green-800 border-green-200", icon: "🟢" },
  medio: { label: "Risco Médio", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "🟡" },
  alto: { label: "Alto Risco", color: "bg-orange-100 text-orange-800 border-orange-200", icon: "🟠" },
  critico: { label: "Risco Crítico", color: "bg-red-100 text-red-800 border-red-200", icon: "🔴" },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function QuestionarioRamos() {
  const [, navigate] = useLocation();

  // Recuperar dados da sessão do localStorage
  const sessionToken = localStorage.getItem("sessionToken") ?? "";
  const confirmedBranchesRaw = localStorage.getItem("confirmedBranches") ?? "[]";
  const confirmedBranches: ConfirmedBranch[] = JSON.parse(confirmedBranchesRaw);

  // Estado de navegação entre ramos
  const [currentBranchIndex, setCurrentBranchIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, string | string[] | number>>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completedBranches, setCompletedBranches] = useState<Set<string>>(new Set());
  const [branchAnalyses, setBranchAnalyses] = useState<Record<string, { analysis: string; riskLevel: string }>>({});

  const currentBranch = confirmedBranches[currentBranchIndex];

  // Redirecionar se não houver sessão ou ramos
  useEffect(() => {
    if (!sessionToken || confirmedBranches.length === 0) {
      toast.error("Sessão não encontrada. Iniciando novo diagnóstico...");
      navigate("/modo-uso");
    }
  }, [sessionToken, confirmedBranches.length]);

  // ── Gerar perguntas para o ramo atual ──────────────────────────────────────
  const generateMutation = trpc.sessionQuestionnaire.generateQuestions.useMutation();

  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const loadQuestionsForBranch = useCallback(
    async (branch: ConfirmedBranch) => {
      setIsLoadingQuestions(true);
      setCurrentQuestionIndex(0);
      try {
        const result = await generateMutation.mutateAsync({
          sessionToken,
          branchCode: branch.code,
          branchName: branch.name,
        });
        setCurrentQuestions(result.questions as Question[]);
        // Restaurar respostas já salvas
        if (result.answers && result.answers.length > 0) {
          const restored: Record<string, string | string[] | number> = {};
          (result.answers as Array<{ questionId: string; answer: string | string[] | number }>).forEach((a) => {
            restored[a.questionId] = a.answer;
          });
          setAnswers((prev) => ({ ...prev, [branch.code]: restored }));
        }
        if (result.status === "concluido") {
          setCompletedBranches((prev) => new Set(Array.from(prev).concat(branch.code)));
          if (result.aiAnalysis && result.riskLevel) {
            setBranchAnalyses((prev) => ({
              ...prev,
              [branch.code]: { analysis: result.aiAnalysis!, riskLevel: result.riskLevel! },
            }));
          }
        }
      } catch (err) {
        toast.error("Erro ao carregar perguntas. Tente novamente.");
      } finally {
        setIsLoadingQuestions(false);
      }
    },
    [sessionToken, generateMutation]
  );

  useEffect(() => {
    if (currentBranch) {
      loadQuestionsForBranch(currentBranch);
    }
  }, [currentBranchIndex]);

  // ── Salvar respostas ────────────────────────────────────────────────────────
  const saveAnswersMutation = trpc.sessionQuestionnaire.saveAnswers.useMutation();
  const analyzeAnswersMutation = trpc.sessionQuestionnaire.analyzeAnswers.useMutation();

  const handleAnswer = (questionId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentBranch.code]: {
        ...(prev[currentBranch.code] ?? {}),
        [questionId]: value,
      },
    }));
  };

  const handleMultipleChoice = (questionId: string, option: string, checked: boolean) => {
    const current = (answers[currentBranch.code]?.[questionId] as string[]) ?? [];
    const updated = checked ? [...current, option] : current.filter((o) => o !== option);
    handleAnswer(questionId, updated);
  };

  const handleFinishBranch = async () => {
    const branchAnswers = answers[currentBranch.code] ?? {};
    const requiredQuestions = currentQuestions.filter((q) => q.required);
    const unanswered = requiredQuestions.filter((q) => {
      const ans = branchAnswers[q.id];
      return ans === undefined || ans === "" || (Array.isArray(ans) && ans.length === 0);
    });

    if (unanswered.length > 0) {
      toast.error(`Responda ${unanswered.length} pergunta(s) obrigatória(s) antes de continuar.`);
      // Navegar para a primeira pergunta não respondida
      const firstUnansweredIndex = currentQuestions.findIndex((q) => q.id === unanswered[0].id);
      setCurrentQuestionIndex(firstUnansweredIndex);
      return;
    }

    // Salvar respostas
    const answersArray = Object.entries(branchAnswers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    try {
      await saveAnswersMutation.mutateAsync({
        sessionToken,
        branchCode: currentBranch.code,
        answers: answersArray as any,
      });

      // Analisar com IA
      setIsAnalyzing(true);
      const result = await analyzeAnswersMutation.mutateAsync({
        sessionToken,
        branchCode: currentBranch.code,
      });

      setCompletedBranches((prev) => new Set(Array.from(prev).concat(currentBranch.code)));
      setBranchAnalyses((prev) => ({
        ...prev,
        [currentBranch.code]: { analysis: result.analysis, riskLevel: result.riskLevel },
      }));

      toast.success(`Ramo ${currentBranch.name} concluído! Risco: ${RISK_CONFIG[result.riskLevel as keyof typeof RISK_CONFIG]?.label ?? result.riskLevel}`);

      // Avançar para próximo ramo ou concluir
      if (currentBranchIndex < confirmedBranches.length - 1) {
        setCurrentBranchIndex((prev) => prev + 1);
      }
    } catch (err) {
      toast.error("Erro ao salvar respostas. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConcluirTodos = () => {
    // Salvar progresso no localStorage
    localStorage.setItem("branchAnalyses", JSON.stringify(branchAnalyses));
    // Atualizar step da sessão e navegar para plano de ação
    navigate("/plano-acao-session");
  };

  // ── Renderização de perguntas ───────────────────────────────────────────────
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const currentAnswer = answers[currentBranch?.code ?? ""]?.[currentQuestion?.id ?? ""];
  const totalQuestions = currentQuestions.length;
  const answeredCount = Object.keys(answers[currentBranch?.code ?? ""] ?? {}).length;
  const questionProgress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const allBranchesCompleted = confirmedBranches.every((b) => completedBranches.has(b.code));

  if (!currentBranch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-400" />
            <span className="text-white font-semibold">Diagnóstico por Ramo</span>
          </div>
          <div className="flex items-center gap-2">
            {confirmedBranches.map((branch, idx) => (
              <button
                key={branch.code}
                onClick={() => !isLoadingQuestions && setCurrentBranchIndex(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  idx === currentBranchIndex
                    ? "bg-blue-600 text-white"
                    : completedBranches.has(branch.code)
                    ? "bg-green-600/30 text-green-300 border border-green-500/30"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {completedBranches.has(branch.code) ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5" />
                )}
                {branch.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Progresso geral */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-sm">
              {completedBranches.size} de {confirmedBranches.length} ramos concluídos
            </span>
            <span className="text-white/70 text-sm">
              {Math.round((completedBranches.size / confirmedBranches.length) * 100)}%
            </span>
          </div>
          <Progress
            value={Math.round((completedBranches.size / confirmedBranches.length) * 100)}
            className="h-2 bg-white/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel esquerdo — Ramo atual */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-blue-600/30 text-blue-300 border-blue-500/30 text-xs">
                    Ramo {currentBranchIndex + 1}/{confirmedBranches.length}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{currentBranch.name}</CardTitle>
                <CardDescription className="text-white/50 text-sm">
                  {currentBranch.code}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Perguntas respondidas</span>
                    <span className="text-white font-medium">
                      {answeredCount}/{totalQuestions}
                    </span>
                  </div>
                  <Progress value={questionProgress} className="h-1.5 bg-white/10" />
                </div>
              </CardContent>
            </Card>

            {/* Análise do ramo (após conclusão) */}
            {completedBranches.has(currentBranch.code) && branchAnalyses[currentBranch.code] && (
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <CardTitle className="text-sm">Análise de Risco</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border mb-3 ${
                      RISK_CONFIG[branchAnalyses[currentBranch.code].riskLevel as keyof typeof RISK_CONFIG]?.color
                    }`}
                  >
                    {RISK_CONFIG[branchAnalyses[currentBranch.code].riskLevel as keyof typeof RISK_CONFIG]?.icon}{" "}
                    {RISK_CONFIG[branchAnalyses[currentBranch.code].riskLevel as keyof typeof RISK_CONFIG]?.label}
                  </div>
                  <p className="text-white/60 text-xs leading-relaxed line-clamp-4">
                    {branchAnalyses[currentBranch.code].analysis}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Botão de concluir todos */}
            {allBranchesCompleted && (
              <Button
                onClick={handleConcluirTodos}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Gerar Plano de Ação
              </Button>
            )}
          </div>

          {/* Painel direito — Perguntas */}
          <div className="lg:col-span-2">
            {isLoadingQuestions ? (
              <Card className="bg-white/5 border-white/10 text-white h-64 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
                  <p className="text-white/60 text-sm">
                    Gerando perguntas personalizadas para {currentBranch.name}...
                  </p>
                </div>
              </Card>
            ) : completedBranches.has(currentBranch.code) ? (
              <Card className="bg-white/5 border-white/10 text-white">
                <CardContent className="pt-8 pb-8 text-center space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
                  <h3 className="text-xl font-semibold">Ramo {currentBranch.name} Concluído!</h3>
                  <p className="text-white/60 text-sm max-w-md mx-auto">
                    {branchAnalyses[currentBranch.code]?.analysis?.slice(0, 200)}...
                  </p>
                  {currentBranchIndex < confirmedBranches.length - 1 && (
                    <Button
                      onClick={() => setCurrentBranchIndex((prev) => prev + 1)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Próximo Ramo: {confirmedBranches[currentBranchIndex + 1]?.name}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : currentQuestion ? (
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-white/10 text-white/70 text-xs">
                      Pergunta {currentQuestionIndex + 1} de {totalQuestions}
                    </Badge>
                    {currentQuestion.required && (
                      <span className="text-red-400 text-xs">* Obrigatória</span>
                    )}
                  </div>
                  <CardTitle className="text-base font-medium leading-relaxed">
                    {currentQuestion.question}
                  </CardTitle>
                  {currentQuestion.helpText && (
                    <CardDescription className="text-white/50 text-sm mt-1">
                      {currentQuestion.helpText}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Single Choice */}
                  {currentQuestion.type === "single_choice" && currentQuestion.options && (
                    <div className="space-y-2">
                      {currentQuestion.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => handleAnswer(currentQuestion.id, option)}
                          className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                            currentAnswer === option
                              ? "bg-blue-600/30 border-blue-500 text-white"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {currentAnswer === option ? (
                              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-white/30 shrink-0" />
                            )}
                            {option}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Multiple Choice */}
                  {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
                    <div className="space-y-2">
                      {currentQuestion.options.map((option) => {
                        const selected = ((currentAnswer as string[]) ?? []).includes(option);
                        return (
                          <button
                            key={option}
                            onClick={() => handleMultipleChoice(currentQuestion.id, option, !selected)}
                            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                              selected
                                ? "bg-blue-600/30 border-blue-500 text-white"
                                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {selected ? (
                                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-white/30 shrink-0" />
                              )}
                              {option}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Text */}
                  {currentQuestion.type === "text" && (
                    <Textarea
                      value={(currentAnswer as string) ?? ""}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 resize-none min-h-[100px]"
                    />
                  )}

                  {/* Scale */}
                  {currentQuestion.type === "scale" && (
                    <div className="space-y-4">
                      <div className="flex justify-between text-xs text-white/50">
                        <span>1 — Muito baixo</span>
                        <span>5 — Muito alto</span>
                      </div>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[(currentAnswer as number) ?? 3]}
                        onValueChange={([val]) => handleAnswer(currentQuestion.id, val)}
                        className="w-full"
                      />
                      <div className="text-center">
                        <span className="text-2xl font-bold text-blue-400">
                          {(currentAnswer as number) ?? 3}
                        </span>
                        <span className="text-white/50 text-sm ml-1">/ 5</span>
                      </div>
                    </div>
                  )}

                  {/* Navegação entre perguntas */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>

                    {currentQuestionIndex < totalQuestions - 1 ? (
                      <Button
                        onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Próxima
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleFinishBranch}
                        disabled={isAnalyzing}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analisando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Concluir Ramo
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/5 border-white/10 text-white h-64 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto" />
                  <p className="text-white/60 text-sm">Nenhuma pergunta disponível</p>
                  <Button
                    onClick={() => loadQuestionsForBranch(currentBranch)}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Tentar novamente
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
