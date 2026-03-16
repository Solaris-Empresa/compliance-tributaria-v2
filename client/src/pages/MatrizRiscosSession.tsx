/**
 * MatrizRiscosSession.tsx
 * Fase 3 do Novo Fluxo v2.0 — Matriz de Riscos Visual por Sessão
 *
 * Exibe a matriz de riscos 4x4 (Probabilidade x Impacto) com os itens do plano
 * posicionados de acordo com seu nível de risco e prioridade.
 */

import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface MatrixItem {
  id: string;
  branchCode: string;
  branchName: string;
  action: string;
  x: number; // 1-4 (probabilidade/risco)
  y: number; // 1-4 (impacto/prioridade)
  priority: string;
  riskLevel: string;
  status: string;
}

interface BranchSummary {
  code: string;
  name: string;
  maxRisk: string;
  totalActions: number;
  criticalActions: number;
  completedActions: number;
}

// ─── Configurações da Matriz ──────────────────────────────────────────────────

const MATRIX_LABELS = {
  x: ["Baixo", "Médio", "Alto", "Crítico"],
  y: ["Baixa", "Média", "Alta", "Crítica"],
};

// Cor de fundo de cada célula da matriz (4x4)
// [y][x] onde y=0 é baixo impacto, y=3 é alto impacto
const CELL_COLORS: string[][] = [
  ["bg-green-100", "bg-green-100", "bg-yellow-100", "bg-orange-100"],   // y=1 (baixa prioridade)
  ["bg-green-100", "bg-yellow-100", "bg-orange-100", "bg-red-100"],     // y=2 (média prioridade)
  ["bg-yellow-100", "bg-orange-100", "bg-red-100", "bg-red-200"],       // y=3 (alta prioridade)
  ["bg-orange-100", "bg-red-100", "bg-red-200", "bg-red-300"],          // y=4 (crítica)
];

const riskColors: Record<string, string> = {
  critico: "bg-red-500 text-white",
  alto: "bg-orange-500 text-white",
  medio: "bg-yellow-500 text-slate-900",
  baixo: "bg-green-500 text-white",
};

const riskLabels: Record<string, string> = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function MatrizRiscosSession() {
  const [, navigate] = useLocation();
  const sessionToken = new URLSearchParams(window.location.search).get("session") ?? "";

  const { data, isLoading } = trpc.sessionActionPlan.getMatrix.useQuery(
    { sessionToken },
    { enabled: !!sessionToken }
  );

  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sessão não encontrada</h2>
            <Button onClick={() => navigate("/modo-uso")}>Iniciar Diagnóstico</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const matrixItems = (data?.matrixData as MatrixItem[]) ?? [];
  const branches = (data?.branches as BranchSummary[]) ?? [];

  // Agrupar itens por célula da matriz
  const getCellItems = (x: number, y: number) =>
    matrixItems.filter((item) => item.x === x && item.y === y);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/plano-acao-session?session=${sessionToken}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Plano de Ação
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Matriz de Riscos</h1>
                <p className="text-sm text-slate-500">Probabilidade × Impacto</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/consolidacao?session=${sessionToken}`)}
            >
              Consolidar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400">Carregando matriz...</div>
        ) : (
          <>
            {/* Resumo por ramo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {branches.map((branch) => (
                <Card key={branch.code} className="border-slate-200">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800 truncate">{branch.name}</span>
                      <Badge
                        className={`text-xs ml-1 shrink-0 ${riskColors[branch.maxRisk] ?? "bg-slate-200 text-slate-700"}`}
                      >
                        {riskLabels[branch.maxRisk] ?? branch.maxRisk}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {branch.criticalActions} críticas · {branch.completedActions}/{branch.totalActions} concluídas
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Matriz 4x4 */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Matriz de Risco — Probabilidade × Impacto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Eixo X (Probabilidade/Risco) */}
                    <div className="flex mb-1 ml-16">
                      {MATRIX_LABELS.x.map((label, i) => (
                        <div key={i} className="flex-1 text-center text-xs font-medium text-slate-500 px-1">
                          {label}
                        </div>
                      ))}
                    </div>

                    {/* Linhas da matriz (y de 4 a 1, de cima para baixo) */}
                    {[4, 3, 2, 1].map((y) => (
                      <div key={y} className="flex items-stretch mb-1">
                        {/* Label do eixo Y */}
                        <div className="w-16 flex items-center justify-end pr-2">
                          <span className="text-xs font-medium text-slate-500 text-right leading-tight">
                            {MATRIX_LABELS.y[y - 1]}
                          </span>
                        </div>

                        {/* Células */}
                        {[1, 2, 3, 4].map((x) => {
                          const cellItems = getCellItems(x, y);
                          const cellColor = CELL_COLORS[y - 1]?.[x - 1] ?? "bg-slate-100";

                          return (
                            <div
                              key={x}
                              className={`flex-1 min-h-[80px] ${cellColor} rounded-md mx-0.5 p-1.5 flex flex-col gap-1`}
                            >
                              {cellItems.map((item) => (
                                <div
                                  key={item.id}
                                  title={`${item.action}\n${item.branchName}`}
                                  className="bg-white/80 rounded px-1.5 py-1 text-xs text-slate-700 leading-tight cursor-default hover:bg-white transition-colors shadow-sm"
                                >
                                  <span className="font-medium block truncate">{item.action}</span>
                                  <span className="text-slate-400 text-[10px]">{item.branchName}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* Legenda dos eixos */}
                    <div className="flex items-center justify-between mt-3 ml-16">
                      <span className="text-xs text-slate-400">← Menor Probabilidade</span>
                      <span className="text-xs text-slate-400">Maior Probabilidade →</span>
                    </div>
                  </div>
                </div>

                {/* Legenda de cores */}
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
                    <span className="text-xs text-slate-600">Baixo Risco</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200" />
                    <span className="text-xs text-slate-600">Risco Moderado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200" />
                    <span className="text-xs text-slate-600">Risco Alto</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-red-200 border border-red-300" />
                    <span className="text-xs text-slate-600">Risco Crítico</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Score de Compliance */}
            {data?.complianceScore !== undefined && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900">Score de Compliance</h3>
                      <p className="text-sm text-blue-700">
                        Avaliação geral da adequação à Reforma Tributária
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-blue-900">{data.complianceScore}%</p>
                      <p className="text-xs text-blue-600">
                        Risco Global:{" "}
                        <span className="font-medium">
                          {riskLabels[data.overallRiskLevel ?? ""] ?? data.overallRiskLevel}
                        </span>
                      </p>
                    </div>
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
