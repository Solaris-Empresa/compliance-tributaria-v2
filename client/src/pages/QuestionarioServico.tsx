/**
 * QuestionarioServico — Z-02 DEC-M3-05 v3 · ADR-0010
 * Wizard de questionário de serviços NBS.
 * Rota: /projetos/:id/questionario-servico
 */
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Briefcase } from "lucide-react";
import NaoAplicavelBanner from "@/components/NaoAplicavelBanner";

export default function QuestionarioServico() {
  const [, params] = useRoute("/projetos/:id/questionario-servico");
  const projectId = parseInt(params?.id ?? "0");
  const [, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data, isLoading, isError } = trpc.fluxoV3.getServiceQuestions.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const completeMutation = trpc.fluxoV3.completeServiceQuestionnaire.useMutation({
    onSuccess: () => {
      navigate(`/projetos/${projectId}/diagnostico-cnae`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Gerando questionário de serviços com base nos NBSs identificados…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive">Não foi possível carregar o questionário de serviços.</p>
        <Button variant="outline" onClick={() => navigate(`/projetos/${projectId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar ao projeto
        </Button>
      </div>
    );
  }

  if (data.nao_aplicavel) {
    return (
      <NaoAplicavelBanner
        tipo="produto"
        onAvancar={() => completeMutation.mutate({ projectId, respostas: [] })}
        isLoading={completeMutation.isPending}
      />
    );
  }

  const perguntas = data.perguntas ?? [];
  const total = perguntas.length;
  const perguntaAtual = perguntas[currentIndex];
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
  const isLast = currentIndex === total - 1;

  const handleFinalize = () => {
    const respostas = perguntas.map((p) => ({
      pergunta_id: p.id,
      resposta: answers[p.id] ?? "",
      fonte_ref: "NBS",
      lei_ref: "LC 214/2025",
    }));
    completeMutation.mutate({ projectId, respostas });
  };

  if (total === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Questionário de Serviços</CardTitle>
            <CardDescription>Nenhuma pergunta gerada para os NBSs identificados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleFinalize} disabled={completeMutation.isPending} className="gap-2">
              {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Avançar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Briefcase className="h-4 w-4" /><span>Questionário de Serviços NBS</span>
        </div>
        <h1 className="text-2xl font-bold">Perguntas sobre seus serviços</h1>
        <p className="text-muted-foreground text-sm">Responda às perguntas abaixo para refinar a análise tributária dos seus serviços.</p>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Pergunta {currentIndex + 1} de {total}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {perguntaAtual && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {(perguntaAtual as any).texto ?? (perguntaAtual as any).pergunta ?? `Pergunta ${currentIndex + 1}`}
            </CardTitle>
            {(perguntaAtual as any).contexto && (
              <CardDescription>{(perguntaAtual as any).contexto}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Digite sua resposta aqui…"
              value={answers[perguntaAtual.id] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [perguntaAtual.id]: e.target.value }))}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className="gap-2">
          <ArrowLeft className="h-4 w-4" />Anterior
        </Button>
        {isLast ? (
          <Button onClick={handleFinalize} disabled={completeMutation.isPending} className="gap-2">
            {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Finalizar questionário
          </Button>
        ) : (
          <Button onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))} className="gap-2">
            Próxima<ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
