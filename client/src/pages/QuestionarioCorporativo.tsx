import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export default function QuestionarioCorporativo() {
  const [, params] = useRoute("/projetos/:id/questionario-corporativo");
  const [, navigate] = useLocation();
  const toast = ({ title, description, variant }: any) => {
    alert(`${title}\n${description}`);
  };
  
  const projectId = params?.id ? parseInt(params.id) : 0;
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [localAnswer, setLocalAnswer] = useState("");
  
  // Buscar questionário existente
  const { data: assessment, isLoading, refetch } = trpc.corporateAssessment.get.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );
  
  // Mutations
  const answerMutation = trpc.corporateAssessment.answer.useMutation({
    onSuccess: () => {
      toast({
        title: "Resposta salva",
        description: "Sua resposta foi salva com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar resposta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const completeMutation = trpc.corporateAssessment.complete.useMutation({
    onSuccess: () => {
      toast({
        title: "Questionário concluído!",
        description: "Você pode agora gerar o plano de ação corporativo.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro ao concluir questionário",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Parse questions
  const questions = assessment?.generatedQuestions 
    ? (typeof assessment.generatedQuestions === 'string' 
        ? JSON.parse(assessment.generatedQuestions) 
        : assessment.generatedQuestions)
    : [];
  
  // Parse existing answers
  useEffect(() => {
    if (assessment?.answers) {
      const parsed = typeof assessment.answers === 'string' 
        ? JSON.parse(assessment.answers) 
        : assessment.answers;
      setAnswers(parsed || {});
    }
  }, [assessment]);
  
  // Load current answer
  useEffect(() => {
    setLocalAnswer(answers[currentQuestionIndex] || "");
  }, [currentQuestionIndex, answers]);
  
  const handleSaveAnswer = async () => {
    if (!assessment?.id || !localAnswer.trim()) {
      toast({
        title: "Resposta vazia",
        description: "Por favor, escreva uma resposta antes de salvar.",
        variant: "destructive",
      });
      return;
    }
    
    await answerMutation.mutateAsync({
      assessmentId: assessment.id,
      questionIndex: currentQuestionIndex,
      answer: localAnswer,
    });
    
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: localAnswer }));
  };
  
  const handleNext = async () => {
    await handleSaveAnswer();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  const handleComplete = async () => {
    if (!assessment?.id) return;
    
    // Verificar se todas as perguntas foram respondidas
    const unanswered = questions.filter((_: any, idx: number) => !answers[idx]);
    if (unanswered.length > 0) {
      toast({
        title: "Questionário incompleto",
        description: `Ainda faltam ${unanswered.length} pergunta(s) para responder.`,
        variant: "destructive",
      });
      return;
    }
    
    await completeMutation.mutateAsync({ assessmentId: assessment.id });
  };
  
  const progress = questions.length > 0 
    ? (Object.keys(answers).length / questions.length) * 100 
    : 0;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!assessment) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Questionário não encontrado</CardTitle>
            <CardDescription>
              O questionário corporativo ainda não foi gerado para este projeto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/projetos/${projectId}`)}>
              Voltar ao Projeto
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (assessment.completedAt) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Questionário Concluído
            </CardTitle>
            <CardDescription>
              Este questionário foi concluído em {new Date(assessment.completedAt).toLocaleDateString('pt-BR')}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Você respondeu todas as {questions.length} perguntas.</p>
            <div className="flex gap-4">
              <Button onClick={() => navigate(`/projetos/${projectId}`)}>
                Voltar ao Projeto
              </Button>
              <Button variant="outline" onClick={() => navigate(`/projetos/${projectId}/planos-acao`)}>
                Ver Plano de Ação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(`/projetos/${projectId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Projeto
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Questionário Corporativo</CardTitle>
          <CardDescription>
            Pergunta {currentQuestionIndex + 1} de {questions.length}
          </CardDescription>
          <Progress value={progress} className="mt-2" />
        </CardHeader>
        
        <CardContent className="space-y-6">
          {currentQuestion && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {currentQuestion.question || currentQuestion}
                </h3>
                {currentQuestion.context && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {currentQuestion.context}
                  </p>
                )}
              </div>
              
              <Textarea
                value={localAnswer}
                onChange={(e) => setLocalAnswer(e.target.value)}
                placeholder="Digite sua resposta aqui..."
                rows={6}
                className="resize-none"
              />
              
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveAnswer}
                    disabled={answerMutation.isPending || !localAnswer.trim()}
                  >
                    {answerMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Salvar
                  </Button>
                  
                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button onClick={handleNext} disabled={answerMutation.isPending}>
                      Próxima
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleComplete} 
                      disabled={completeMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {completeMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Concluir Questionário
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Progress Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Progresso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{Object.keys(answers).length}</p>
              <p className="text-sm text-muted-foreground">Respondidas</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{questions.length - Object.keys(answers).length}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.round(progress)}%</p>
              <p className="text-sm text-muted-foreground">Completo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
