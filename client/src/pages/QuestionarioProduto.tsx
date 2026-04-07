/**
 * QuestionarioProduto — Z-02 DEC-M3-05 v3 · ADR-0010
 * Wizard de questionário de produtos NCM.
 * Rota: /projetos/:id/questionario-produto
 */
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Package } from "lucide-react";
import NaoAplicavelBanner from "@/components/NaoAplicavelBanner";

export default function QuestionarioProduto() {
  const [, params] = useRoute("/projetos/:id/questionario-produto");
  const projectId = parseInt(params?.id ?? "0");
  const [, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data, isLoading, isError } = trpc.fluxoV3.getProductQuestions.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const completeMutation = trpc.fluxoV3.completeProductQuestionnaire.useMutation({
    onSuccess: (result) => {
      const nextRoute =
        result.nextStatus === "q_servico"
          ? `/projetos/${projectId}/questionario-servico`
          : `/projetos/${projectId}/diagnostico-cnae`;
      navigate(nextRoute);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Gerando questionário de produtos com base nos NCMs identificados…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive">Não foi possível carregar o questionário de produtos.</p>
        <Button variant="outline" onClick={() => navigate(`/projetos/${projectId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar ao projeto
        </Button>
      </div>
    );
  }

  if (data.nao_aplicavel) {
    return (
      <NaoAplicavelBanner
        tipo="servico"
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
      fonte_ref: "NCM",
      lei_ref: "LC 214/2025",
    }));
    completeMutation.mutate({ projectId, respostas });
  };

  if (total === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Questionário de Produtos</CardTitle>
            <CardDescription>Nenhuma pergunta gerada para os NCMs identificados.</CardDescription>
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
          <Package className="h-4 w-4" /><span>Questionário de Produtos NCM</span>
        </div>
        <h1 className="text-2xl font-bold">Perguntas sobre seus produtos</h1>
        <p className="text-muted-foreground text-sm">Responda às perguntas abaixo para refinar a análise tributária dos seus produtos.</p>
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
