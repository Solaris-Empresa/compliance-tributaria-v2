/**
 * QuestionarioProduto — Z-02 DEC-M3-05 v3 · ADR-0010
 * Wizard de questionário de produtos NCM.
 * Rota: /projetos/:id/questionario-produto
 *
 * ADR-0016 Etapa 4 (BUG-NCM-01): adicionados botões "Pular pergunta" e
 * "Pular questionário" com data-testid obrigatórios.
 * ADR-0017: aviso informativo quando sem NCM (não bloqueia).
 */
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Package, SkipForward, AlertTriangle } from "lucide-react";
import NaoAplicavelBanner from "@/components/NaoAplicavelBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ─── Prefix helper (fix UAT 2026-04-20 — opção A2, padrão Onda 1/2) ─────────
// Sugere formato Sim/Não/N.A. + justificativa. Backend aceita qualquer texto.

const PREFIX_OPTIONS = [
  { prefix: "Sim. ", label: "Sim", testId: "sim" },
  { prefix: "Não. ", label: "Não", testId: "nao" },
  { prefix: "N/A. ", label: "Não se aplica", testId: "na" },
] as const;

const KNOWN_PREFIXES = PREFIX_OPTIONS.map((o) => o.prefix);

function applyPrefix(currentText: string, newPrefix: string): string {
  const existing = KNOWN_PREFIXES.find((p) => currentText.startsWith(p));
  if (existing) {
    return newPrefix + currentText.slice(existing.length);
  }
  return newPrefix + currentText;
}

export default function QuestionarioProduto() {
  const [, params] = useRoute("/projetos/:id/questionario-produto");
  const projectId = parseInt(params?.id ?? "0");
  const [, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [confirmSkipAll, setConfirmSkipAll] = useState(false);

  const { data: projectData } = trpc.fluxoV3.getProjectStep1.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  // ADR-0017: aviso informativo quando sem NCM cadastrado (não bloqueia)
  const hasNcm = (projectData?.operationProfile?.principaisProdutos ?? [])
    .some((p: any) => p.ncm_code);

  const { data, isLoading, isError } = trpc.fluxoV3.getProductQuestions.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const completeMutation = trpc.fluxoV3.completeProductQuestionnaire.useMutation({
    onSuccess: (result) => {
      const nextRoute =
        result.nextStatus === "q_servico"
          ? `/projetos/${projectId}/questionario-servico`
          : `/projetos/${projectId}/questionario-cnae`;
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

  const handleSkipQuestion = () => {
    if (!perguntaAtual) return;
    const id = String(perguntaAtual.id);
    setSkippedIds((prev) => new Set([...prev, id]));
    toast.info("Pergunta pulada. Você pode voltar e responder depois.");
    if (currentIndex < total - 1) setCurrentIndex((i) => i + 1);
  };

  const handleSkipAll = () => {
    // Pular questionário inteiro: submeter com respostas vazias
    toast.warning("Questionário de Produtos pulado — diagnóstico com confiança reduzida.", { duration: 6000 });
    completeMutation.mutate({ projectId, respostas: [] });
    setConfirmSkipAll(false);
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
          <CardContent className="space-y-3">
            {/* fix UAT 2026-04-20: guia de formato + botões de prefix — padrão das Ondas 1 e 2. */}
            <p className="text-xs text-muted-foreground">
              💡 Formato sugerido: <strong>Sim</strong>, <strong>Não</strong> ou <strong>Não se aplica</strong> — seguido de justificativa breve.
            </p>

            <div className="flex gap-2 flex-wrap" data-testid="prefix-buttons">
              {PREFIX_OPTIONS.map((opt) => (
                <Button
                  key={opt.prefix}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [perguntaAtual.id]: applyPrefix(prev[perguntaAtual.id] ?? "", opt.prefix),
                    }))
                  }
                  data-testid={`prefix-btn-${opt.testId}`}
                  className="h-7 text-xs"
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <Textarea
              placeholder="Ex: Sim. O NCM está cadastrado corretamente conforme TIPI..."
              value={answers[perguntaAtual.id] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [perguntaAtual.id]: e.target.value }))}
              rows={4}
              className="resize-none"
              data-testid={`textarea-resposta-${perguntaAtual.id}`}
            />
            {/* ADR-0016 BUG-NCM-01: Botão Pular pergunta */}
            {!answers[perguntaAtual.id]?.trim() && !skippedIds.has(String(perguntaAtual.id)) && (
              <div className="flex justify-end pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipQuestion}
                  data-testid={`btn-pular-pergunta-${perguntaAtual.id}`}
                  className="text-xs text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1.5"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Pular esta pergunta
                </Button>
              </div>
            )}
            {skippedIds.has(String(perguntaAtual.id)) && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Pergunta pulada
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ADR-0017: aviso informativo quando sem NCM — não bloqueia */}
      {!hasNcm && (
        <div
          data-testid="aviso-sem-ncm"
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-sm"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Diagnóstico genérico</p>
            <p className="text-amber-700 dark:text-amber-400">
              Nenhum código NCM foi informado para esta empresa. O diagnóstico de produtos será
              baseado em perguntas genéricas, sem análise específica de alíquota zero, Imposto
              Seletivo ou regime diferenciado por produto (LC 214/2025).
            </p>
            <p className="text-amber-700 dark:text-amber-400">
              Para um diagnóstico mais preciso, adicione os códigos NCM no perfil do projeto.
            </p>
          </div>
        </div>
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

      {/* ADR-0016 BUG-NCM-01: Botão Pular questionário */}
      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmSkipAll(true)}
          data-testid="btn-pular-questionario-produto"
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
              Pular questionário de Produtos?
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
              disabled={completeMutation.isPending}
              data-testid="btn-confirmar-pular"
            >
              {completeMutation.isPending ? "Pulando..." : "Confirmar — Pular questionário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
