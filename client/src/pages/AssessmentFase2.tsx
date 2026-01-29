import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";

export default function AssessmentFase2() {
  const [, params] = useRoute("/projetos/:id/assessment/fase2");
  const [, setLocation] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : 0;

  const { data: phase2Data, isLoading: loadingPhase2 } = trpc.assessment.getPhase2.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuestionsMutation = trpc.assessment.generatePhase2Questions.useMutation({
    onSuccess: () => {
      toast.success("Perguntas personalizadas geradas com sucesso!");
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar perguntas: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const savePhase2Mutation = trpc.assessment.savePhase2.useMutation({
    onSuccess: () => {
      toast.success("Respostas salvas com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const completePhase2Mutation = trpc.assessment.completePhase2.useMutation({
    onSuccess: () => {
      toast.success("Assessment concluído! Gerando briefing...");
      setLocation(`/projetos/${projectId}/briefing`);
    },
    onError: (error) => {
      toast.error(`Erro ao concluir: ${error.message}`);
    },
  });

  useEffect(() => {
    if (phase2Data?.answers) {
      try {
        const parsedAnswers = JSON.parse(phase2Data.answers);
        setAnswers(parsedAnswers);
      } catch (e) {
        console.error("Failed to parse answers:", e);
      }
    }
  }, [phase2Data]);

  useEffect(() => {
    // Generate questions if phase2 doesn't exist yet
    if (!loadingPhase2 && !phase2Data && projectId > 0 && !isGenerating) {
      setIsGenerating(true);
      generateQuestionsMutation.mutate({ projectId });
    }
  }, [loadingPhase2, phase2Data, projectId]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSave = () => {
    savePhase2Mutation.mutate({
      projectId,
      answers: JSON.stringify(answers),
    });
  };

  const handleComplete = () => {
    const questions = phase2Data?.generatedQuestions ? JSON.parse(phase2Data.generatedQuestions) : [];
    const answeredCount = Object.keys(answers).filter((key) => answers[key]?.trim()).length;

    if (answeredCount < questions.length * 0.7) {
      toast.error("Por favor, responda pelo menos 70% das perguntas antes de continuar");
      return;
    }

    completePhase2Mutation.mutate({ projectId });
  };

  if (loadingPhase2 || isGenerating) {
    return (
      <ComplianceLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isGenerating ? "Gerando perguntas personalizadas..." : "Carregando assessment..."}
            </h3>
            <p className="text-muted-foreground">
              {isGenerating
                ? "Nossa IA está analisando o perfil da empresa e criando perguntas específicas"
                : "Aguarde um momento"}
            </p>
          </div>
        </div>
      </ComplianceLayout>
    );
  }

  const questions = phase2Data?.generatedQuestions ? JSON.parse(phase2Data.generatedQuestions) : [];
  const answeredCount = Object.keys(answers).filter((key) => answers[key]?.trim()).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href={`/projetos/${projectId}`}>
            <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar para Projeto
            </a>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Assessment - Fase 2</h1>
          <p className="text-muted-foreground mb-4">
            Questionário personalizado baseado no perfil da sua empresa
          </p>

          {/* Progress */}
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Progresso: {answeredCount} de {questions.length} perguntas
              </span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Questions */}
        <div className="max-w-3xl space-y-6">
          {questions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhuma pergunta disponível. Por favor, complete a Fase 1 primeiro.
                </p>
                <Button asChild className="mt-4">
                  <Link href={`/projetos/${projectId}/assessment/fase1`}>
                    <a>Ir para Fase 1</a>
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {questions.map((question: any, index: number) => (
                <Card key={question.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </span>
                      <span className="flex-1">{question.question}</span>
                    </CardTitle>
                    {question.description && (
                      <CardDescription className="ml-11">{question.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="ml-11">
                    {question.type === "text" && (
                      <Input
                        placeholder="Digite sua resposta..."
                        value={answers[question.id] || ""}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      />
                    )}
                    {question.type === "textarea" && (
                      <Textarea
                        placeholder="Digite sua resposta detalhada..."
                        value={answers[question.id] || ""}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        rows={4}
                      />
                    )}
                    {question.type === "number" && (
                      <Input
                        type="number"
                        placeholder="Digite um número..."
                        value={answers[question.id] || ""}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={savePhase2Mutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Rascunho
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={completePhase2Mutation.isPending || answeredCount < questions.length * 0.7}
                  className="flex items-center gap-2"
                >
                  {completePhase2Mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      Concluir Assessment
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>

              {answeredCount < questions.length * 0.7 && (
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-6">
                    <p className="text-sm text-orange-800">
                      <strong>Atenção:</strong> Você precisa responder pelo menos 70% das perguntas
                      para avançar para a próxima etapa.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </ComplianceLayout>
  );
}
