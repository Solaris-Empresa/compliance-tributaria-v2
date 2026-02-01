import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";

export default function QuestionariosPorRamo() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const [, setLocation] = useLocation();

  const { data: branches, isLoading: loadingBranches } = trpc.branches.getProjectBranches.useQuery({ projectId });
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const { data: assessment, isLoading: loadingAssessment, refetch } = trpc.branchAssessment.get.useQuery(
    { projectId, branchId: selectedBranchId! },
    { enabled: !!selectedBranchId }
  );

  const generateMutation = trpc.branchAssessment.generate.useMutation({
    onSuccess: () => refetch(),
  });

  const answerMutation = trpc.branchAssessment.answer.useMutation({
    onSuccess: () => refetch(),
  });

  const completeMutation = trpc.branchAssessment.complete.useMutation({
    onSuccess: () => {
      alert("Questionário concluído com sucesso!");
      setLocation(`/projetos/\${projectId}/planos-acao`);
    },
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");

  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].branchId);
    }
  }, [branches, selectedBranchId]);

  useEffect(() => {
    if (assessment?.generatedQuestions) {
      const questions = JSON.parse(assessment.generatedQuestions);
      const answers = assessment.answers ? JSON.parse(assessment.answers) : {};
      setCurrentAnswer(answers[currentQuestionIndex] || "");
    }
  }, [assessment, currentQuestionIndex]);

  if (loadingBranches) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!branches || branches.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-8 text-center">
          <p className="text-gray-600">Nenhum ramo de atividade selecionado para este projeto.</p>
          <Button onClick={() => setLocation(`/projetos/\${projectId}`)} className="mt-4">
            Voltar ao Projeto
          </Button>
        </Card>
      </div>
    );
  }

  const handleGenerateQuestions = async () => {
    if (!selectedBranchId) return;
    try {
      await generateMutation.mutateAsync({ projectId, branchId: selectedBranchId });
    } catch (error) {
      alert("Erro ao gerar questionário: " + (error as Error).message);
    }
  };

  const handleSaveAnswer = async () => {
    if (!assessment || !currentAnswer.trim()) return;
    try {
      await answerMutation.mutateAsync({
        assessmentId: assessment.id,
        questionIndex: currentQuestionIndex,
        answer: currentAnswer,
      });
    } catch (error) {
      alert("Erro ao salvar resposta: " + (error as Error).message);
    }
  };

  const handleNext = async () => {
    await handleSaveAnswer();
    const questions = assessment?.generatedQuestions ? JSON.parse(assessment.generatedQuestions) : [];
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = async () => {
    await handleSaveAnswer();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleComplete = async () => {
    if (!assessment) return;
    await handleSaveAnswer();
    const questions = JSON.parse(assessment.generatedQuestions);
    const answers = assessment.answers ? JSON.parse(assessment.answers) : {};
    const allAnswered = questions.every((_: unknown, idx: number) => answers[idx]?.trim());

    if (!allAnswered) {
      alert("Por favor, responda todas as perguntas antes de concluir.");
      return;
    }

    try {
      await completeMutation.mutateAsync({ assessmentId: assessment.id });
    } catch (error) {
      alert("Erro ao concluir questionário: " + (error as Error).message);
    }
  };

  if (!assessment || loadingAssessment) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-8">
          <h1 className="text-2xl font-bold mb-4">Questionário por Ramo de Atividade</h1>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Selecione o Ramo:</label>
            <select
              value={selectedBranchId || ""}
              onChange={(e) => setSelectedBranchId(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            >
              {branches.map((b: { branchId: number; branchName: string }) => (
                <option key={b.branchId} value={b.branchId}>
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleGenerateQuestions} disabled={generateMutation.isPending || !selectedBranchId}>
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              "Gerar Questionário"
            )}
          </Button>
        </Card>
      </div>
    );
  }

  const questions = JSON.parse(assessment.generatedQuestions);
  const answers = assessment.answers ? JSON.parse(assessment.answers) : {};
  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.trim()).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="container mx-auto py-8">
      <Card className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Questionário: {branches.find((b: { branchId: number; branchName: string }) => b.branchId === selectedBranchId)?.branchName}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Pergunta {currentQuestionIndex + 1} de {questions.length}</span>
            <span>•</span>
            <span>{answeredCount} respondidas</span>
          </div>
          <Progress value={progress} className="mt-2" />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            {currentQuestionIndex + 1}. {questions[currentQuestionIndex]}
          </label>
          <Textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Digite sua resposta..."
            rows={6}
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0 || answerMutation.isPending}
            variant="outline"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={handleNext} disabled={answerMutation.isPending}>
                {answerMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    Próxima
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={completeMutation.isPending} className="bg-green-600 hover:bg-green-700">
                {completeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Concluindo...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Concluir Questionário
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
