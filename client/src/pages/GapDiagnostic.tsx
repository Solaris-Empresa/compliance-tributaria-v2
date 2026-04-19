import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Shield,
  ClipboardList,
  FileText,
  Loader2,
  ArrowLeft,
} from "lucide-react";

type AnswerValue = "sim" | "nao" | "parcial" | "nao_aplicavel";

interface Answer {
  mappingId: string;
  canonicalId: string;
  answerValue: AnswerValue;
  answerNote?: string;
}

interface Question {
  mapping_id: string;
  canonical_id: string;
  question_text_clean: string;
  question_type: string;
  questionnaire_section: string;
}

function AnswerOption({
  label,
  description,
  icon,
  selected,
  color,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        selected ? `${color} border-current` : "border-border bg-card hover:border-muted-foreground/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${selected ? "" : "text-muted-foreground"}`}>{icon}</div>
        <div>
          <div className={`font-semibold text-sm ${selected ? "" : "text-foreground"}`}>{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
      </div>
    </button>
  );
}

function ScoreCard({
  score,
  riskLevel,
  totalCompliant,
  totalNonCompliant,
  totalPartial,
}: {
  score: number;
  riskLevel: string;
  totalCompliant: number;
  totalNonCompliant: number;
  totalPartial: number;
}) {
  const riskColors: Record<string, string> = {
    baixo: "text-green-600",
    medio: "text-yellow-600",
    alto: "text-orange-600",
    critico: "text-red-600",
  };
  const riskBg: Record<string, string> = {
    baixo: "bg-green-50 border-green-200",
    medio: "bg-yellow-50 border-yellow-200",
    alto: "bg-orange-50 border-orange-200",
    critico: "bg-red-50 border-red-200",
  };
  const riskLabel: Record<string, string> = {
    baixo: "Baixo Risco",
    medio: "Risco Moderado",
    alto: "Alto Risco",
    critico: "Risco Critico",
  };

  return (
    <div className={`rounded-xl border-2 p-6 ${riskBg[riskLevel] ?? "bg-card border-border"}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium text-muted-foreground">Exposição ao Risco de Compliance</div>
          <div className={`text-5xl font-bold mt-1 ${riskColors[riskLevel] ?? "text-foreground"}`}>
            {score}%
          </div>
        </div>
        <Badge variant="outline" className={`text-sm px-3 py-1 ${riskColors[riskLevel] ?? ""} border-current`}>
          {riskLabel[riskLevel] ?? riskLevel}
        </Badge>
      </div>
      <Progress value={score} className="h-3 mb-4" />
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="text-center p-3 bg-white/60 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{totalCompliant}</div>
          <div className="text-xs text-muted-foreground mt-1">Atendidos</div>
        </div>
        <div className="text-center p-3 bg-white/60 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{totalPartial}</div>
          <div className="text-xs text-muted-foreground mt-1">Parciais</div>
        </div>
        <div className="text-center p-3 bg-white/60 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{totalNonCompliant}</div>
          <div className="text-xs text-muted-foreground mt-1">Nao Atendidos</div>
        </div>
      </div>
    </div>
  );
}

export default function GapDiagnostic() {
  const [, navigate] = useLocation();
  const projectId = 1;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentNote, setCurrentNote] = useState("");
  const [phase, setPhase] = useState<"questionnaire" | "processing" | "result">("questionnaire");
  const [sessionResult, setSessionResult] = useState<any>(null);

  const { data: questionsData, isLoading: loadingQuestions } = trpc.gap.getQuestions.useQuery({
    limit: 50,
    offset: 0,
  });

  const questions: Question[] = (questionsData?.questions as Question[]) ?? [];
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.mapping_id] : undefined;

  const runDiagnostic = trpc.gap.runDiagnostic.useMutation({
    onSuccess: (data) => {
      setSessionResult(data);
      setPhase("result");
    },
  });

  const { data: sessionReport } = trpc.gap.getSessionReport.useQuery(
    { sessionId: sessionResult?.sessionId ?? 0 },
    { enabled: Boolean(sessionResult?.sessionId) }
  );

  function handleAnswer(value: AnswerValue) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.mapping_id]: {
        mappingId: currentQuestion.mapping_id,
        canonicalId: currentQuestion.canonical_id,
        answerValue: value,
        answerNote: currentNote || undefined,
      },
    }));
  }

  function handleNext() {
    if (currentQuestion && answers[currentQuestion.mapping_id]) {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.mapping_id]: {
          ...prev[currentQuestion.mapping_id],
          answerNote: currentNote || undefined,
        },
      }));
    }
    setCurrentNote("");
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      const prevQ = questions[currentIndex - 1];
      if (prevQ) setCurrentNote(answers[prevQ.mapping_id]?.answerNote ?? "");
    }
  }

  useEffect(() => {
    if (currentQuestion) setCurrentNote(answers[currentQuestion.mapping_id]?.answerNote ?? "");
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit() {
    const answeredList = Object.values(answers);
    if (answeredList.length === 0) return;
    setPhase("processing");
    runDiagnostic.mutate({ projectId, answers: answeredList });
  }

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <ClipboardList className="h-12 w-12 text-muted-foreground" />
        <div className="text-lg font-medium">Nenhuma pergunta disponivel</div>
        <p className="text-sm text-muted-foreground">
          As perguntas do questionario serao carregadas em breve.
        </p>
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="relative">
          <Shield className="h-16 w-16 text-primary" />
          <Loader2 className="h-6 w-6 animate-spin text-primary absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold">Calculando Diagnostico</div>
          <div className="text-sm text-muted-foreground mt-2">
            Analisando {answeredCount} respostas...
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result" && sessionResult) {
    const report = sessionReport;
    const score = sessionResult.score;
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Relatorio de Diagnostico de Compliance
          </h1>
          <p className="text-muted-foreground mt-1">
            Sessao #{sessionResult.sessionId} &middot; {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>

        <ScoreCard
          score={score.complianceScore}
          riskLevel={score.riskLevel}
          totalCompliant={score.totalCompliant}
          totalNonCompliant={score.totalNonCompliant}
          totalPartial={score.totalPartial}
        />

        {sessionResult.criticalGaps > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-red-700 font-semibold mb-3">
              <XCircle className="h-5 w-5" />
              {sessionResult.criticalGaps} Gap(s) Critico(s) — Acao Imediata Necessaria
            </div>
            {report?.priorityGaps?.critica?.slice(0, 5).map((gap: any) => (
              <div
                key={gap.id}
                className="flex items-start gap-2 text-sm text-red-800 py-1.5 border-t border-red-100"
              >
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-mono text-xs text-red-500 mr-2">{gap.canonicalId}</span>
                  {gap.recommendation ?? "Implementar controle normativo imediatamente"}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(report?.gapsByStatus?.nao_compliant?.length ?? 0) > 0 && (
            <div className="border rounded-xl p-4">
              <div className="flex items-center gap-2 font-semibold text-red-600 mb-3">
                <XCircle className="h-4 w-4" />
                Nao Atendidos ({report?.gapsByStatus?.nao_compliant?.length})
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {report?.gapsByStatus?.nao_compliant?.map((gap: any) => (
                  <div key={gap.id} className="text-xs p-2 bg-red-50 rounded flex items-start gap-2">
                    <span className="font-mono text-red-500 shrink-0">{gap.canonicalId}</span>
                    <span className="text-muted-foreground">
                      {gap.gapType} &middot; {gap.gapSeverity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(report?.gapsByStatus?.parcial?.length ?? 0) > 0 && (
            <div className="border rounded-xl p-4">
              <div className="flex items-center gap-2 font-semibold text-yellow-600 mb-3">
                <AlertCircle className="h-4 w-4" />
                Parcialmente Atendidos ({report?.gapsByStatus?.parcial?.length})
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {report?.gapsByStatus?.parcial?.map((gap: any) => (
                  <div key={gap.id} className="text-xs p-2 bg-yellow-50 rounded flex items-start gap-2">
                    <span className="font-mono text-yellow-600 shrink-0">{gap.canonicalId}</span>
                    <span className="text-muted-foreground">
                      {gap.gapType} &middot; {gap.gapSeverity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {report?.auditTrail && report.auditTrail.length > 0 && (
          <div className="border rounded-xl p-4">
            <div className="flex items-center gap-2 font-semibold mb-3">
              <FileText className="h-4 w-4 text-primary" />
              Audit Trail
            </div>
            <div className="space-y-2">
              {report.auditTrail.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 text-xs py-1.5 border-b border-border last:border-0"
                >
                  <span className="text-muted-foreground shrink-0">
                    {new Date(entry.occurredAt).toLocaleTimeString("pt-BR")}
                  </span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {entry.eventType}
                  </Badge>
                  <span className="text-muted-foreground">{entry.userName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => {
              setPhase("questionnaire");
              setCurrentIndex(0);
              setAnswers({});
              setSessionResult(null);
            }}
          >
            Novo Diagnostico
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar ao Inicio
          </Button>
        </div>
      </div>
    );
  }

  const sectionLabels: Record<string, string> = {
    QC: "Corporativo",
    QO: "Operacional",
    QN: "Especializado CNAE",
    QF: "Financeiro",
    QG: "Governanca",
  };
  const sectionPrefix = currentQuestion?.questionnaire_section?.slice(0, 2) ?? "";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <div className="text-sm text-muted-foreground">
          {answeredCount} de {questions.length} respondidas
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Diagnostico de Compliance — Reforma Tributaria
        </h1>
        <Progress value={progress} className="mt-3 h-2" />
      </div>

      {currentQuestion && (
        <div className="border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {sectionLabels[sectionPrefix] ?? currentQuestion.questionnaire_section}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              {currentQuestion.mapping_id}
            </span>
            <span className="ml-auto text-sm text-muted-foreground">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>

          <div className="text-base font-medium leading-relaxed">
            {currentQuestion.question_text_clean}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnswerOption
              label="Sim — Atendido"
              description="O requisito esta completamente implementado"
              icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
              selected={currentAnswer?.answerValue === "sim"}
              color="bg-green-50 text-green-700 border-green-300"
              onClick={() => handleAnswer("sim")}
            />
            <AnswerOption
              label="Nao — Nao Atendido"
              description="O requisito nao esta implementado"
              icon={<XCircle className="h-5 w-5 text-red-600" />}
              selected={currentAnswer?.answerValue === "nao"}
              color="bg-red-50 text-red-700 border-red-300"
              onClick={() => handleAnswer("nao")}
            />
            <AnswerOption
              label="Parcial — Em Progresso"
              description="Implementacao parcial ou em andamento"
              icon={<AlertCircle className="h-5 w-5 text-yellow-600" />}
              selected={currentAnswer?.answerValue === "parcial"}
              color="bg-yellow-50 text-yellow-700 border-yellow-300"
              onClick={() => handleAnswer("parcial")}
            />
            <AnswerOption
              label="Nao Aplicavel"
              description="Este requisito nao se aplica a empresa"
              icon={<MinusCircle className="h-5 w-5 text-gray-500" />}
              selected={currentAnswer?.answerValue === "nao_aplicavel"}
              color="bg-gray-50 text-gray-600 border-gray-300"
              onClick={() => handleAnswer("nao_aplicavel")}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Observacao (opcional)
            </label>
            <Textarea
              placeholder="Descreva evidencias, contexto ou justificativa..."
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              className="text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        <div className="flex gap-2">
          {currentIndex < questions.length - 1 ? (
            <Button onClick={handleNext} disabled={currentAnswer === undefined}>
              Proxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={answeredCount === 0 || runDiagnostic.isPending}
              className="bg-primary text-primary-foreground"
            >
              {runDiagnostic.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Gerar Diagnostico ({answeredCount} respostas)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
