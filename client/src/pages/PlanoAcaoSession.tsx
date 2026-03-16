/**
 * PlanoAcaoSession.tsx
 * Fase 3 do Novo Fluxo v2.0 — Plano de Ação Consolidado por Sessão
 *
 * Exibe o plano de ação gerado pela IA consolidando todos os ramos,
 * com visualização por prioridade, prazo, responsável e status.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  FileText,
  ArrowRight,
  BarChart3,
  Filter,
  RefreshCw,
} from "lucide-react";
import { FluxoStepper } from "@/components/FluxoStepper";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface PlanItem {
  id: string;
  branchCode: string;
  branchName: string;
  action: string;
  description: string;
  priority: "critica" | "alta" | "media" | "baixa";
  deadline: string;
  responsible: string;
  status: "pendente" | "em_andamento" | "concluido";
  riskLevel: "critico" | "alto" | "medio" | "baixo";
  category: string;
  estimatedCost: "baixo" | "medio" | "alto";
}

// ─── Helpers visuais ───────────────────────────────────────────────────────────

const priorityConfig = {
  critica: { label: "Crítica", color: "bg-red-100 text-red-800 border-red-200", icon: "🔴", order: 4 },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-800 border-orange-200", icon: "🟠", order: 3 },
  media: { label: "Média", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "🟡", order: 2 },
  baixa: { label: "Baixa", color: "bg-green-100 text-green-800 border-green-200", icon: "🟢", order: 1 },
};

const riskConfig = {
  critico: { label: "Crítico", color: "bg-red-500", textColor: "text-red-700" },
  alto: { label: "Alto", color: "bg-orange-500", textColor: "text-orange-700" },
  medio: { label: "Médio", color: "bg-yellow-500", textColor: "text-yellow-700" },
  baixo: { label: "Baixo", color: "bg-green-500", textColor: "text-green-700" },
};

const statusConfig = {
  pendente: { label: "Pendente", color: "bg-slate-100 text-slate-700", icon: <Clock className="w-3 h-3" /> },
  em_andamento: { label: "Em Andamento", color: "bg-blue-100 text-blue-700", icon: <RefreshCw className="w-3 h-3" /> },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> },
};

const costConfig = {
  baixo: { label: "< R$5k", color: "text-green-600" },
  medio: { label: "R$5k–50k", color: "text-yellow-600" },
  alto: { label: "> R$50k", color: "text-red-600" },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PlanoAcaoSession() {
  const [, navigate] = useLocation();
  const sessionToken = new URLSearchParams(window.location.search).get("session") ?? "";

  const [filterPriority, setFilterPriority] = useState<string>("todos");
  const [filterBranch, setFilterBranch] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [activeTab, setActiveTab] = useState("plano");

  // Buscar plano existente
  const { data: plan, isLoading: loadingPlan, refetch } = trpc.sessionActionPlan.get.useQuery(
    { sessionToken },
    { enabled: !!sessionToken }
  );

  // Gerar plano
  const generateMutation = trpc.sessionActionPlan.generate.useMutation({
    onSuccess: () => {
      toast.success("Plano de ação gerado com sucesso!");
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao gerar plano: ${err.message}`);
    },
  });

  // Atualizar item
  const updateItemMutation = trpc.sessionActionPlan.updateItem.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: () => {
      toast.error("Erro ao atualizar item");
    },
  });

  // Buscar dados da matriz
  const { data: matrixData } = trpc.sessionActionPlan.getMatrix.useQuery(
    { sessionToken },
    { enabled: !!sessionToken && activeTab === "matriz" }
  );

  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sessão não encontrada</h2>
            <p className="text-slate-500 mb-4">Inicie um novo diagnóstico para gerar o plano de ação.</p>
            <Button onClick={() => navigate("/modo-uso")}>Iniciar Diagnóstico</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gerar plano automaticamente se não existir
  if (!loadingPlan && !plan && !generateMutation.isPending) {
    generateMutation.mutate({ sessionToken });
  }

  const planItems = (plan?.planItems as PlanItem[]) ?? [];

  // Filtrar itens
  const filteredItems = planItems.filter((item) => {
    if (filterPriority !== "todos" && item.priority !== filterPriority) return false;
    if (filterBranch !== "todos" && item.branchCode !== filterBranch) return false;
    if (filterStatus !== "todos" && item.status !== filterStatus) return false;
    return true;
  });

  // Ordenar por prioridade
  const sortedItems = [...filteredItems].sort(
    (a, b) => (priorityConfig[b.priority]?.order ?? 0) - (priorityConfig[a.priority]?.order ?? 0)
  );

  // Ramos únicos
  const uniqueBranches = Array.from(new Set(planItems.map((i) => i.branchCode))).map((code) => ({
    code,
    name: planItems.find((i) => i.branchCode === code)?.branchName ?? code,
  }));

  // Métricas
  const totalItems = planItems.length;
  const completedItems = planItems.filter((i) => i.status === "concluido").length;
  const criticalItems = planItems.filter((i) => i.priority === "critica").length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const isGenerating = generateMutation.isPending || (loadingPlan && !plan);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Stepper do fluxo */}
          <FluxoStepper current="plano-acao" className="mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Plano de Ação</h1>
              <p className="text-sm text-slate-500 mt-0.5">Diagnóstico de Compliance — Reforma Tributária</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/matriz-riscos-session?session=${sessionToken}`)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Matriz de Riscos
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(`/consolidacao?session=${sessionToken}`)}
                disabled={!plan}
              >
                Consolidar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Estado de geração */}
        {isGenerating && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Gerando Plano de Ação...</h3>
                  <p className="text-sm text-blue-700">
                    A IA está consolidando as análises de todos os ramos. Isso pode levar alguns segundos.
                  </p>
                </div>
              </div>
              <Progress value={undefined} className="mt-4 h-2" />
            </CardContent>
          </Card>
        )}

        {plan && (
          <>
            {/* Cards de métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
                      <p className="text-xs text-slate-500">Total de Ações</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-700">{criticalItems}</p>
                      <p className="text-xs text-slate-500">Ações Críticas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{plan.complianceScore ?? 0}%</p>
                      <p className="text-xs text-slate-500">Score Compliance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{progressPercent}%</p>
                      <p className="text-xs text-slate-500">Progresso</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Barra de progresso geral */}
            <Card className="mb-6">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Progresso Geral do Plano</span>
                  <span className="text-sm text-slate-500">{completedItems}/{totalItems} ações concluídas</span>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">Risco Global:</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${riskConfig[plan.overallRiskLevel as keyof typeof riskConfig]?.textColor ?? ""}`}
                  >
                    {riskConfig[plan.overallRiskLevel as keyof typeof riskConfig]?.label ?? plan.overallRiskLevel}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="plano">Plano de Ação</TabsTrigger>
                <TabsTrigger value="resumo">Resumo Executivo</TabsTrigger>
                <TabsTrigger value="por-ramo">Por Ramo</TabsTrigger>
              </TabsList>

              {/* Tab: Plano de Ação */}
              <TabsContent value="plano">
                {/* Filtros */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">Filtrar:</span>
                  </div>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-36 h-8 text-sm">
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="critica">🔴 Crítica</SelectItem>
                      <SelectItem value="alta">🟠 Alta</SelectItem>
                      <SelectItem value="media">🟡 Média</SelectItem>
                      <SelectItem value="baixa">🟢 Baixa</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterBranch} onValueChange={setFilterBranch}>
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue placeholder="Ramo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Ramos</SelectItem>
                      {uniqueBranches.map((b) => (
                        <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-36 h-8 text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>

                  <span className="text-sm text-slate-500 self-center">
                    {sortedItems.length} de {totalItems} ações
                  </span>
                </div>

                {/* Lista de itens */}
                <div className="space-y-3">
                  {sortedItems.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-4">
                          {/* Ícone de prioridade */}
                          <div className="text-xl mt-0.5 shrink-0">
                            {priorityConfig[item.priority]?.icon ?? "⚪"}
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                                {item.action}
                              </h3>
                              <Select
                                value={item.status}
                                onValueChange={(val) =>
                                  updateItemMutation.mutate({
                                    sessionToken,
                                    itemId: item.id,
                                    status: val as "pendente" | "em_andamento" | "concluido",
                                  })
                                }
                              >
                                <SelectTrigger className="w-36 h-7 text-xs shrink-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendente">Pendente</SelectItem>
                                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                  <SelectItem value="concluido">Concluído</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">{item.description}</p>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${priorityConfig[item.priority]?.color ?? ""}`}
                              >
                                {priorityConfig[item.priority]?.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-slate-600">
                                <Clock className="w-3 h-3 mr-1" />
                                {item.deadline}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-slate-600">
                                <Users className="w-3 h-3 mr-1" />
                                {item.responsible}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-slate-600">
                                {item.category}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${costConfig[item.estimatedCost]?.color ?? ""}`}>
                                💰 {costConfig[item.estimatedCost]?.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-slate-500">
                                {item.branchName}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {sortedItems.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhuma ação encontrada com os filtros selecionados.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Resumo Executivo */}
              <TabsContent value="resumo">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo Executivo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {plan.executiveSummary ?? "Resumo não disponível."}
                    </div>

                    {/* Distribuição por prioridade */}
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(["critica", "alta", "media", "baixa"] as const).map((p) => {
                        const count = planItems.filter((i) => i.priority === p).length;
                        return (
                          <div key={p} className={`rounded-lg p-3 border ${priorityConfig[p].color}`}>
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs font-medium">{priorityConfig[p].label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Por Ramo */}
              <TabsContent value="por-ramo">
                <div className="space-y-4">
                  {uniqueBranches.map((branch) => {
                    const branchItems = planItems.filter((i) => i.branchCode === branch.code);
                    const branchCompleted = branchItems.filter((i) => i.status === "concluido").length;
                    const branchProgress = branchItems.length > 0
                      ? Math.round((branchCompleted / branchItems.length) * 100)
                      : 0;
                    const branchMaxRisk = branchItems.reduce((max, item) => {
                      const order = { critico: 4, alto: 3, medio: 2, baixo: 1 };
                      return (order[item.riskLevel] ?? 0) > (order[max as keyof typeof order] ?? 0) ? item.riskLevel : max;
                    }, "baixo");

                    return (
                      <Card key={branch.code}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">{branch.name}</CardTitle>
                              <p className="text-xs text-slate-500 mt-0.5">{branchItems.length} ações</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${riskConfig[branchMaxRisk as keyof typeof riskConfig]?.textColor ?? ""}`}
                              >
                                Risco {riskConfig[branchMaxRisk as keyof typeof riskConfig]?.label ?? branchMaxRisk}
                              </Badge>
                              <span className="text-sm font-medium text-slate-700">{branchProgress}%</span>
                            </div>
                          </div>
                          <Progress value={branchProgress} className="h-2 mt-2" />
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {branchItems
                              .sort((a, b) => (priorityConfig[b.priority]?.order ?? 0) - (priorityConfig[a.priority]?.order ?? 0))
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-3 py-2 border-t border-slate-100 first:border-0"
                                >
                                  <span className="text-base">{priorityConfig[item.priority]?.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-800 truncate">{item.action}</p>
                                    <p className="text-xs text-slate-500">{item.deadline} · {item.responsible}</p>
                                  </div>
                                  <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusConfig[item.status]?.color}`}>
                                    {statusConfig[item.status]?.icon}
                                    <span>{statusConfig[item.status]?.label}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
