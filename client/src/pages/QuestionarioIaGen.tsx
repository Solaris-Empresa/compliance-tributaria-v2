/**
 * QuestionarioIaGen.tsx — Onda 2: Questionário IA Generativa
 * K-4-C: Sprint K — FLUXO-3-ONDAS v1.1 Seção 9
 *
 * Gera 5–10 perguntas combinatórias via LLM com base no perfil da empresa.
 * Badge laranja "Perfil da empresa". Salva em iagen_answers via completeOnda2.
 * Ao concluir: navega para /questionario-corporativo-v2.
 */
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Brain, ChevronLeft, ChevronRight, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Pergunta {
  id: string;
  texto: string;
  objetivo_diagnostico: string;
  combinacao_gatilho: string;
  fonte: "ia_gen";
  confidence_score: number;
}

export default function QuestionarioIaGen() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, setLocation] = useLocation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar perguntas geradas pela IA
  const { data, isLoading, error } = trpc.fluxoV3.generateOnda2Questions.useQuery(
    { projectId },
    { enabled: !!projectId && !isNaN(projectId) }
  );

  const perguntas: Pergunta[] = data?.questions ?? [];
  const source = data?.source ?? "llm";
  const totalPerguntas = perguntas.length;
  const perguntaAtual = perguntas[currentIndex];
  const respondidas = Object.values(respostas).filter((r) => r.trim().length > 0).length;
  const todasRespondidas = respondidas === totalPerguntas && totalPerguntas > 0;
  const progresso = totalPerguntas > 0 ? Math.round((respondidas / totalPerguntas) * 100) : 0;

  // Mutation para salvar respostas e avançar status
  const completeOnda2 = trpc.fluxoV3.completeOnda2.useMutation({
    onSuccess: () => {
      toast.success("Onda 2 concluída! Iniciando Questionário Corporativo...");
      setLocation(`/projetos/${projectId}/questionario-corporativo-v2`);
    },
    onError: (err) => {
      toast.error(err.message ?? "Erro ao concluir Onda 2. Tente novamente.");
      setIsSubmitting(false);
    },
  });

  const handleResposta = (texto: string) => {
    if (!perguntaAtual) return;
    setRespostas((prev) => ({ ...prev, [perguntaAtual.id]: texto }));
  };

  const handleAnterior = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleProxima = () => {
    if (currentIndex < totalPerguntas - 1) setCurrentIndex((i) => i + 1);
  };

  const handleConcluir = async () => {
    if (!todasRespondidas) {
      toast.warning(`Faltam ${totalPerguntas - respondidas} resposta(s) para concluir.`);
      return;
    }
    setIsSubmitting(true);
    const answers = perguntas.map((p) => ({
      questionText: p.texto,
      resposta: respostas[p.id] ?? "",
      confidenceScore: p.confidence_score,
    }));
    completeOnda2.mutate({ projectId, answers });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <p className="text-muted-foreground text-sm">
          Gerando perguntas personalizadas com base no perfil da empresa...
        </p>
        <p className="text-xs text-muted-foreground">(pode levar até 30 segundos)</p>
      </div>
    );
  }

  if (error || totalPerguntas === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-foreground font-medium">Erro ao gerar perguntas</p>
        <p className="text-muted-foreground text-sm text-center">
          {error?.message ?? "Nenhuma pergunta foi gerada. Tente novamente."}
        </p>
        <Button variant="outline" onClick={() => setLocation(`/projetos/${projectId}`)}>
          Voltar ao Projeto
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation(`/projetos/${projectId}`)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao Projeto
          </button>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-orange-500" />
              <span className="font-semibold text-foreground">Questionário por IA</span>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs font-medium">
                Perfil da empresa
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground mt-0.5">
              Etapa 2 de 8 — Onda 2
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {respondidas}/{totalPerguntas} respondidas
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <Progress value={progresso} className="h-1.5" />
        </div>

        {/* Pills de navegação */}
        <div className="max-w-3xl mx-auto px-4 pb-3 flex gap-1.5 flex-wrap">
          {perguntas.map((p, i) => {
            const respondida = (respostas[p.id] ?? "").trim().length > 0;
            return (
              <button
                key={p.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors border ${
                  i === currentIndex
                    ? "bg-orange-500 text-white border-orange-500"
                    : respondida
                    ? "bg-orange-100 text-orange-700 border-orange-300"
                    : "bg-background text-muted-foreground border-border hover:border-orange-300"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Aviso de fallback */}
        {source === "fallback" && (
          <div className="mb-6 p-3 rounded-lg border border-amber-200 bg-amber-50 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700">
              As perguntas foram geradas com base em um modelo padrão (IA indisponível temporariamente).
            </p>
          </div>
        )}

        {/* Card da pergunta atual */}
        {perguntaAtual && (
          <div className="border rounded-xl bg-card p-6 shadow-sm">
            {/* Header da pergunta */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                  {perguntaAtual.id.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1}/{totalPerguntas}
                </span>
                <Badge variant="outline" className="text-[10px] h-4 border-red-300/60 text-red-600 dark:text-red-400 bg-red-500/5">
                  Obrigatória
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Confiança: {Math.round(perguntaAtual.confidence_score * 100)}%
              </span>
            </div>

            {/* Texto da pergunta */}
            <p className="text-base font-medium text-foreground leading-relaxed mb-6">
              {perguntaAtual.texto}
            </p>

            {/* Objetivo diagnóstico */}
            <p className="text-xs text-muted-foreground mb-4 italic">
              Objetivo: {perguntaAtual.objetivo_diagnostico}
            </p>

            {/* Campo de resposta */}
            <Textarea
              placeholder="Digite sua resposta aqui..."
              value={respostas[perguntaAtual.id] ?? ""}
              onChange={(e) => handleResposta(e.target.value)}
              className="min-h-[120px] resize-none"
              autoFocus
            />

            {(respostas[perguntaAtual.id] ?? "").trim().length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs text-green-600">Resposta registrada</span>
              </div>
            )}
          </div>
        )}

        {/* Navegação */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleAnterior}
            disabled={currentIndex === 0}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          {currentIndex < totalPerguntas - 1 ? (
            <Button
              onClick={handleProxima}
              className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleConcluir}
              disabled={!todasRespondidas || isSubmitting}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Concluir Onda 2
                </>
              )}
            </Button>
          )}
        </div>

        {/* Resumo final */}
        {todasRespondidas && (
          <div className="mt-4 p-3 rounded-lg border border-green-200 bg-green-50 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-700">
              Todas as {totalPerguntas} perguntas respondidas. Clique em "Concluir Onda 2" para salvar e avançar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
