import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Loader2, Save, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";

type DynamicQuestion = {
  id: string;
  question: string;
  type: "text" | "number" | "select" | "textarea";
  options?: string[];
  required: boolean;
};

export default function AssessmentFase2() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0");

  const [questions, setQuestions] = useState<DynamicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: phase1 } = trpc.assessment.getPhase1.useQuery({ projectId });
  const { data: existingPhase2 } = trpc.assessment.getPhase2.useQuery({ projectId });

  const generateQuestions = trpc.assessment.generatePhase2Questions.useMutation({
    onSuccess: (data) => {
      setQuestions(data.questions);
      setIsGenerating(false);
      toast.success("Perguntas geradas com sucesso!");
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(`Erro ao gerar perguntas: ${error.message}`);
    },
  });

  const savePhase2 = trpc.assessment.savePhase2.useMutation({
    onSuccess: () => {
      toast.success("Respostas salvas!");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const completePhase2 = trpc.assessment.completePhase2.useMutation({
    onSuccess: () => {
      toast.success("Assessment concluído! Gerando briefing...");
      setLocation(`/projetos/${projectId}/briefing`);
    },
    onError: (error) => {
      toast.error(`Erro ao finalizar: ${error.message}`);
    },
  });

  // Carregar perguntas existentes ou gerar novas
  useEffect(() => {
    if (existingPhase2?.generatedQuestions) {
      try {
        const parsed = JSON.parse(existingPhase2.generatedQuestions);
        setQuestions(parsed);
      } catch (e) {
        console.error("Erro ao parsear perguntas:", e);
      }
    }

    if (existingPhase2?.answers) {
      try {
        const parsed = JSON.parse(existingPhase2.answers);
        setAnswers(parsed);
      } catch (e) {
        console.error("Erro ao parsear respostas:", e);
      }
    }
  }, [existingPhase2]);

  // Gerar perguntas automaticamente se não existirem
  useEffect(() => {
    if (phase1 && !existingPhase2?.generatedQuestions && !isGenerating && questions.length === 0) {
      setIsGenerating(true);
      generateQuestions.mutate({ projectId });
    }
  }, [phase1, existingPhase2, projectId, isGenerating, questions.length]);

  // Salvamento automático
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(answers).length > 0 && questions.length > 0) {
        handleSaveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [answers, questions]);

  const handleSaveDraft = () => {
    if (questions.length === 0) return;

    savePhase2.mutate({
      projectId,
      generatedQuestions: JSON.stringify(questions),
      answers: JSON.stringify(answers),
    });
  };

  const handleComplete = () => {
    // Calcular completude
    const requiredQuestions = questions.filter(q => q.required);
    const answeredRequired = requiredQuestions.filter(q => answers[q.id]?.trim()).length;
    const completionRate = requiredQuestions.length > 0 
      ? (answeredRequired / requiredQuestions.length) * 100 
      : 0;

    if (completionRate < 70) {
      toast.error(`Complete pelo menos 70% das perguntas obrigatórias (${Math.round(completionRate)}% concluído)`);
      return;
    }

    completePhase2.mutate({
      projectId,
      generatedQuestions: JSON.stringify(questions),
      answers: JSON.stringify(answers),
    });
  };

  const renderQuestion = (question: DynamicQuestion) => {
    const value = answers[question.id] || "";

    switch (question.type) {
      case "text":
        return (
          <Input
            value={value}
            onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
            placeholder="Digite sua resposta"
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
            placeholder="Digite um número"
          />
        );

      case "select":
        return (
          <Select
            value={value}
            onValueChange={(val) => setAnswers({ ...answers, [question.id]: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
            placeholder="Digite sua resposta detalhada"
            rows={4}
          />
        );

      default:
        return null;
    }
  };

  const calculateProgress = () => {
    const requiredQuestions = questions.filter(q => q.required);
    if (requiredQuestions.length === 0) return 0;

    const answered = requiredQuestions.filter(q => answers[q.id]?.trim()).length;
    return Math.round((answered / requiredQuestions.length) * 100);
  };

  if (!project) {
    return (
      <ComplianceLayout>
        <div className="p-8">
          <p>Carregando projeto...</p>
        </div>
      </ComplianceLayout>
    );
  }

  if (!phase1) {
    return (
      <ComplianceLayout>
        <div className="p-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Complete a Fase 1 do Assessment antes de continuar
              </p>
              <div className="flex justify-center mt-4">
                <Button asChild>
                  <Link href={`/projetos/${projectId}/assessment/fase1`}>Ir para Fase 1</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ComplianceLayout>
    );
  }

  const progress = calculateProgress();

  return (
    <ComplianceLayout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href={`/projetos/${projectId}`}>
                <ArrowLeft className="h-4 w-4" />
                Voltar para Projeto
              </Link>
          </Button>
          <h1 className="text-3xl font-bold">Assessment - Fase 2</h1>
          <p className="text-muted-foreground mt-1">
            {project.name}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Questionário personalizado gerado por IA baseado no perfil da sua empresa
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <span>Fase 1</span>
              <span>→</span>
              <span className="font-medium text-primary">Fase 2</span>
              <span>→</span>
              <span>Briefing</span>
            </div>
            <span className="font-medium text-primary">{progress}% completo</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300" 
              style={{ width: `${(progress / 100) * 66.6}%` }}
            ></div>
          </div>
        </div>

        {/* Generating State */}
        {isGenerating && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-center justify-center">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <p className="text-muted-foreground">
                  Gerando perguntas personalizadas com IA...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions */}
        {questions.length > 0 && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Questionário Personalizado</CardTitle>
                <CardDescription>
                  Perguntas geradas especificamente para o perfil da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((question, index) => (
                  <div key={question.id} className="space-y-2">
                    <Label htmlFor={question.id}>
                      {index + 1}. {question.question}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderQuestion(question)}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={savePhase2.isPending}
              >
                {savePhase2.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Rascunho
                  </>
                )}
              </Button>
              <Button
                onClick={handleComplete}
                disabled={completePhase2.isPending || progress < 70}
                className="flex-1"
              >
                {completePhase2.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    Finalizar Assessment e Gerar Briefing
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Info */}
            <Card className="mt-6 bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong>Salvamento automático:</strong> Suas respostas são salvas automaticamente a cada 30 segundos.
                  Complete pelo menos 70% das perguntas obrigatórias para finalizar esta fase.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ComplianceLayout>
  );
}
