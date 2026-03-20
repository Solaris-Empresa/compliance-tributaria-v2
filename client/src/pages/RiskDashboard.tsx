import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ShieldAlert, TrendingUp, BarChart3, Target } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_LEVEL_COLORS: Record<string, string> = {
  critico: "bg-red-100 text-red-800 border-red-200",
  alto: "bg-orange-100 text-orange-800 border-orange-200",
  medio: "bg-yellow-100 text-yellow-800 border-yellow-200",
  baixo: "bg-green-100 text-green-800 border-green-200",
};

const RISK_LEVEL_BADGE: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
  critico: "destructive",
  alto: "secondary",
  medio: "outline",
  baixo: "default",
};

const IMPACT_LABELS: Record<string, string> = {
  financeiro: "Financeiro",
  operacional: "Operacional",
  legal: "Legal",
  reputacional: "Reputacional",
};

const MITIGATION_LABELS: Record<string, string> = {
  imediata: "Imediata",
  curto_prazo: "Curto Prazo",
  medio_prazo: "Médio Prazo",
  monitoramento: "Monitoramento",
};

const NORMATIVE_LABELS: Record<string, string> = {
  obrigacao: "Obrigação",
  vedacao: "Vedação",
  direito: "Direito",
  opcao: "Opção",
};

function RiskScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = score >= 70 ? "bg-red-500" : score >= 50 ? "bg-orange-500" : score >= 25 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-mono font-semibold w-8 text-right">{score}</span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RiskDashboard() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionInput, setSessionInput] = useState("");
  const [calculating, setCalculating] = useState(false);

  const riskQuery = trpc.risk.getBySession.useQuery(
    { sessionId: sessionId! },
    { enabled: sessionId !== null }
  );

  const topRisksQuery = trpc.risk.getTopRisks.useQuery(
    { sessionId: sessionId!, limit: 10 },
    { enabled: sessionId !== null }
  );

  const domainQuery = trpc.risk.getRisksByDomain.useQuery(
    { sessionId: sessionId! },
    { enabled: sessionId !== null }
  );

  const calculateMutation = trpc.risk.calculateForSession.useMutation({
    onSuccess: () => {
      setCalculating(false);
      riskQuery.refetch();
      topRisksQuery.refetch();
      domainQuery.refetch();
    },
    onError: () => setCalculating(false),
  });

  const handleLoadSession = () => {
    const id = parseInt(sessionInput);
    if (!isNaN(id) && id > 0) setSessionId(id);
  };

  const handleCalculate = () => {
    if (!sessionId) return;
    setCalculating(true);
    calculateMutation.mutate({ sessionId });
  };

  const summary = riskQuery.data?.summary;
  const topRisks = topRisksQuery.data || [];
  const domainRisks = domainQuery.data || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-red-600" />
              Risk Engine — Scoring de Compliance
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Risco = impacto × criticidade × natureza do requisito
            </p>
          </div>
        </div>

        {/* Seletor de sessão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selecionar Sessão de Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="ID da sessão (ex: 42)"
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoadSession()}
                className="max-w-xs"
              />
              <Button variant="outline" onClick={handleLoadSession}>
                Carregar
              </Button>
              {sessionId && (
                <Button onClick={handleCalculate} disabled={calculating}>
                  {calculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                  {calculating ? "Calculando..." : "Calcular Risco"}
                </Button>
              )}
            </div>
            {sessionId && (
              <p className="text-sm text-gray-500 mt-2">Sessão #{sessionId} selecionada</p>
            )}
          </CardContent>
        </Card>

        {/* Loading */}
        {(riskQuery.isLoading || calculating) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">Calculando análise de risco...</span>
          </div>
        )}

        {/* Sem dados */}
        {sessionId && !riskQuery.isLoading && !calculating && !summary && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma análise de risco encontrada para a sessão #{sessionId}. Clique em "Calcular Risco" para gerar.
            </AlertDescription>
          </Alert>
        )}

        {/* Dashboard principal */}
        {summary && !calculating && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className={`border-2 ${RISK_LEVEL_COLORS[summary.overallRiskLevel]}`}>
                <CardContent className="pt-4">
                  <div className="text-xs font-medium uppercase tracking-wide opacity-70">Risco Geral</div>
                  <div className="text-3xl font-bold mt-1 capitalize">{summary.overallRiskLevel}</div>
                  <div className="text-sm opacity-70">Score médio: {summary.avgRiskScore}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Score Total</div>
                  <div className="text-3xl font-bold mt-1 text-gray-900">{summary.totalRiskScore}</div>
                  <div className="text-sm text-gray-500">Máximo: {summary.maxRiskScore}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Críticos + Altos</div>
                  <div className="text-3xl font-bold mt-1 text-red-600">{summary.criticalCount + summary.altoCount}</div>
                  <div className="text-sm text-gray-500">{summary.criticalCount} críticos · {summary.altoCount} altos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Médios + Baixos</div>
                  <div className="text-3xl font-bold mt-1 text-yellow-600">{summary.medioCount + summary.baixoCount}</div>
                  <div className="text-sm text-gray-500">{summary.medioCount} médios · {summary.baixoCount} baixos</div>
                </CardContent>
              </Card>
            </div>

            {/* Impacto por tipo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Risco por Tipo de Impacto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Financeiro</div>
                    <RiskScoreBar score={summary.financialRisk} max={Math.max(summary.financialRisk, summary.operationalRisk, summary.legalRisk, 1)} />
                    <div className="text-xs text-gray-500 mt-1">Score acumulado: {summary.financialRisk}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Operacional</div>
                    <RiskScoreBar score={summary.operationalRisk} max={Math.max(summary.financialRisk, summary.operationalRisk, summary.legalRisk, 1)} />
                    <div className="text-xs text-gray-500 mt-1">Score acumulado: {summary.operationalRisk}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Legal</div>
                    <RiskScoreBar score={summary.legalRisk} max={Math.max(summary.financialRisk, summary.operationalRisk, summary.legalRisk, 1)} />
                    <div className="text-xs text-gray-500 mt-1">Score acumulado: {summary.legalRisk}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Riscos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Top 10 Riscos Prioritários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topRisks.length === 0 && (
                      <p className="text-sm text-gray-500">Nenhum risco ativo encontrado.</p>
                    )}
                    {topRisks.map((r, i) => (
                      <div key={r.riskId} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                        <span className="text-xs font-bold text-gray-400 w-4 mt-0.5">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={RISK_LEVEL_BADGE[r.riskLevel]} className="text-xs">
                              {r.riskLevel.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-gray-500">{r.canonicalId}</span>
                            <span className="text-xs text-gray-400">{NORMATIVE_LABELS[r.normativeType]}</span>
                          </div>
                          {r.requirementName && (
                            <p className="text-sm text-gray-700 mt-1 truncate">{r.requirementName}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <RiskScoreBar score={r.riskScore} />
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {IMPACT_LABELS[r.impactType]} · {MITIGATION_LABELS[r.mitigationPriority]}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Riscos por domínio */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Risco por Domínio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {domainRisks.length === 0 && (
                      <p className="text-sm text-gray-500">Nenhum dado de domínio disponível.</p>
                    )}
                    {domainRisks.map((d) => (
                      <div key={d.domain} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {d.domain.replace(/_/g, " ")}
                          </span>
                          <div className="flex items-center gap-2">
                            {d.criticalCount > 0 && (
                              <Badge variant="destructive" className="text-xs">{d.criticalCount} críticos</Badge>
                            )}
                            <span className="text-xs text-gray-500">{d.count} gaps</span>
                          </div>
                        </div>
                        <RiskScoreBar score={d.avgScore} />
                        <div className="text-xs text-gray-400">Máximo: {d.maxScore} · Média: {d.avgScore}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fórmula e legenda */}
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700">Fórmula de Cálculo:</p>
                  <p><code className="bg-gray-100 px-1 rounded">risk_score = base_score × gap_multiplier</code></p>
                  <p>base_score: obrigação/vedação=80 · direito=50 · opção=30 (ajustado por criticidade)</p>
                  <p>gap_multiplier: não_conforme=1.0 · parcial=0.5 · conforme/n.a.=0</p>
                  <p>Risco: ≥70=crítico · ≥50=alto · ≥25=médio · &lt;25=baixo</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
