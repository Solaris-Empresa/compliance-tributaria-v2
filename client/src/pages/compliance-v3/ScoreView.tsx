/**
 * ScoreView — Página dedicada ao Score CPIE B8
 * Exibe o score consolidado com breakdown completo por dimensão.
 */
import { useParams, Link } from "wouter";
import { ArrowLeft, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Activity, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const MATURITY_DESCRIPTIONS: Record<string, string> = {
  critico: "O projeto apresenta gaps críticos não endereçados, riscos de alta exposição e ações urgentes pendentes. Requer intervenção imediata.",
  baixo: "Conformidade parcial identificada. Existem gaps relevantes e riscos que precisam ser priorizados no plano de ação.",
  medio: "Nível de conformidade razoável. Gaps e riscos estão mapeados, mas o plano de ação ainda precisa avançar.",
  alto: "Boa conformidade com a Reforma Tributária. Poucos gaps críticos e riscos bem gerenciados.",
  excelente: "Conformidade exemplar. Todos os requisitos críticos estão atendidos e o plano de ação está em execução.",
};

export default function ScoreView() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const { data, isLoading, refetch, isFetching } = trpc.scoringEngine.getScore.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const { data: history, isLoading: isLoadingHistory, refetch: refetchHistory } = trpc.scoringEngine.getHistory.useQuery(
    { projectId, limit: 10 },
    { enabled: !!projectId }
  );
  const persistMutation = trpc.scoringEngine.persistScore.useMutation({
    onSuccess: (result) => {
      toast.success(`Score CPIE ${result.cpieScore} (${result.maturityLabel}) salvo no histórico.`);
      void refetchHistory();
    },
    onError: () => toast.error("Erro ao salvar o score no histórico."),
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projetos/${projectId}/compliance-v3`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              Score CPIE
              <span className="text-xs font-normal bg-primary/10 text-primary px-1.5 py-0.5 rounded">B8</span>
            </h1>
            <p className="text-xs text-muted-foreground">Índice de Maturidade de Compliance Tributário</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => persistMutation.mutate({ projectId })}
            disabled={persistMutation.isPending || !data?.meta.hasData}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Salvar no Histórico
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        ) : !data || !data.meta.hasData ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Score CPIE não disponível</h3>
              <p className="text-muted-foreground mb-4">
                Execute a análise completa (Gaps → Riscos → Ações) para calcular o Score CPIE deste projeto.
              </p>
              <Link href={`/projetos/${projectId}/compliance-v3`}>
                <Button>Ir para o Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Score Principal */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Score CPIE Consolidado</p>
                    <div className="flex items-baseline gap-3">
                      <span
                        className="text-6xl font-bold tabular-nums"
                        style={{ color: data.maturityColor }}
                      >
                        {data.cpieScore}
                      </span>
                      <span className="text-2xl text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-lg font-semibold px-4 py-2 rounded-full text-white"
                      style={{ backgroundColor: data.maturityColor }}
                    >
                      {data.maturityLabel}
                    </span>
                    <p className="text-xs text-muted-foreground mt-2">
                      Calculado em {new Date(data.meta.calculatedAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>

                {/* Barra de progresso principal */}
                <div className="mt-6">
                  <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className="h-4 rounded-full transition-all duration-700"
                      style={{ width: `${data.cpieScore}%`, backgroundColor: data.maturityColor }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0 — Crítico</span>
                    <span>30 — Baixo</span>
                    <span>50 — Médio</span>
                    <span>70 — Alto</span>
                    <span>85 — Excelente</span>
                  </div>
                </div>

                {/* Descrição da maturidade */}
                <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/40 rounded-lg">
                  {MATURITY_DESCRIPTIONS[data.maturityLevel] ?? ""}
                </p>
              </CardContent>
            </Card>

            {/* Breakdown por Dimensão */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gaps */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-500" />
                    Gaps
                    <span className="text-xs font-normal text-muted-foreground ml-auto">Peso 40%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-1">{data.dimensions.gap.score}</div>
                  <div className="w-full bg-muted rounded-full h-2 mb-3">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${data.dimensions.gap.score}%` }} />
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Total de gaps</span>
                      <span className="font-medium text-foreground">{data.dimensions.gap.detail.totalGaps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gaps críticos</span>
                      <span className={`font-medium ${data.dimensions.gap.detail.criticalGaps > 0 ? "text-red-600" : "text-green-600"}`}>
                        {data.dimensions.gap.detail.criticalGaps}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gaps altos</span>
                      <span className={`font-medium ${data.dimensions.gap.detail.highGaps > 0 ? "text-orange-600" : "text-green-600"}`}>
                        {data.dimensions.gap.detail.highGaps}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Score médio</span>
                      <span className="font-medium text-foreground">
                        {(data.dimensions.gap.detail.avgScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Riscos */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Riscos
                    <span className="text-xs font-normal text-muted-foreground ml-auto">Peso 35%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600 mb-1">{data.dimensions.risk.score}</div>
                  <div className="w-full bg-muted rounded-full h-2 mb-3">
                    <div className="h-2 rounded-full bg-orange-500" style={{ width: `${data.dimensions.risk.score}%` }} />
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Total de riscos</span>
                      <span className="font-medium text-foreground">{data.dimensions.risk.detail.totalRisks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Riscos críticos</span>
                      <span className={`font-medium ${data.dimensions.risk.detail.criticalRisks > 0 ? "text-red-600" : "text-green-600"}`}>
                        {data.dimensions.risk.detail.criticalRisks}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Riscos altos</span>
                      <span className={`font-medium ${data.dimensions.risk.detail.highRisks > 0 ? "text-orange-600" : "text-green-600"}`}>
                        {data.dimensions.risk.detail.highRisks}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Score médio</span>
                      <span className="font-medium text-foreground">
                        {data.dimensions.risk.detail.avgRiskScore.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ações */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Ações
                    <span className="text-xs font-normal text-muted-foreground ml-auto">Peso 25%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-1">{data.dimensions.action.score}</div>
                  <div className="w-full bg-muted rounded-full h-2 mb-3">
                    <div className="h-2 rounded-full bg-green-500" style={{ width: `${data.dimensions.action.score}%` }} />
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Total de ações</span>
                      <span className="font-medium text-foreground">{data.dimensions.action.detail.totalActions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Concluídas</span>
                      <span className="font-medium text-green-600">{data.dimensions.action.detail.completedActions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Imediatas pendentes</span>
                      <span className={`font-medium ${data.dimensions.action.detail.pendingImmediate > 0 ? "text-red-600" : "text-green-600"}`}>
                        {data.dimensions.action.detail.pendingImmediate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conclusão</span>
                      <span className="font-medium text-foreground">
                        {data.dimensions.action.detail.totalActions > 0
                          ? Math.round((data.dimensions.action.detail.completedActions / data.dimensions.action.detail.totalActions) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fórmula */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Fórmula de Cálculo</CardTitle>
                <CardDescription>Metodologia CPIE — Ponderação por dimensão</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-sm bg-muted/40 rounded-lg p-4">
                  <p className="text-muted-foreground">Score CPIE =</p>
                  <p className="mt-1">
                    <span className="text-blue-600 font-semibold">Gap Score ({data.dimensions.gap.score})</span>
                    <span className="text-muted-foreground"> × 0.40</span>
                    <span className="text-muted-foreground"> + </span>
                    <span className="text-orange-600 font-semibold">Risk Score ({data.dimensions.risk.score})</span>
                    <span className="text-muted-foreground"> × 0.35</span>
                    <span className="text-muted-foreground"> + </span>
                    <span className="text-green-600 font-semibold">Action Score ({data.dimensions.action.score})</span>
                    <span className="text-muted-foreground"> × 0.25</span>
                  </p>
                  <p className="mt-2 text-lg font-bold" style={{ color: data.maturityColor }}>
                    = {data.cpieScore} / 100
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                  <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-2">
                    <p className="font-medium text-blue-700 dark:text-blue-400">Gap Score</p>
                    <p className="mt-0.5">Penaliza gaps não atendidos ponderados por criticidade (crítico=3×, alto=2×, médio=1×, baixa=0.5×)</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/10 rounded p-2">
                    <p className="font-medium text-orange-700 dark:text-orange-400">Risk Score</p>
                    <p className="mt-0.5">Penaliza riscos por nível (crítico=4×, alto=3×, médio=2×, baixo=1×) normalizado pelo total</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/10 rounded p-2">
                    <p className="font-medium text-green-700 dark:text-green-400">Action Score</p>
                    <p className="mt-0.5">Proporção de ações concluídas ponderadas por prioridade (imediata=3×, curto_prazo=2×, médio_prazo=1.5×)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Histórico */}
            {!isLoadingHistory && history && history.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Histórico de Scores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {history.map((entry: { calculatedAt: string; cpieScore: number; maturityLabel: string; maturityColor: string }, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.calculatedAt).toLocaleString("pt-BR")}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{ width: `${entry.cpieScore}%`, backgroundColor: entry.maturityColor }}
                            />
                          </div>
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded text-white"
                            style={{ backgroundColor: entry.maturityColor }}
                          >
                            {entry.cpieScore} — {entry.maturityLabel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
