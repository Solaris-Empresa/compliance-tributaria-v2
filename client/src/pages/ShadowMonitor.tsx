import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Activity,
  Database,
  RefreshCw,
  Trash2,
  FlaskConical,
  ArrowLeftRight,
  Users,
} from "lucide-react";

type Tab = "shadow" | "uat";

export default function ShadowMonitor() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [limitFilter, setLimitFilter] = useState(50);
  const [activeTab, setActiveTab] = useState<Tab>("shadow");

  // Redirecionar se não for equipe_solaris
  if (user && user.role !== "equipe_solaris") {
    setLocation("/");
    return null;
  }

  const { data: readMode, isLoading: loadingMode } = trpc.shadowMode.getReadMode.useQuery();
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } =
    trpc.shadowMode.summarizeDivergences.useQuery();
  const { data: divergences, isLoading: loadingDivergences, refetch: refetchDivergences } =
    trpc.shadowMode.listDivergences.useQuery({ limit: limitFilter });
  const { data: uatProgress, isLoading: loadingUat, refetch: refetchUat } =
    trpc.shadowMode.getUatProgress.useQuery();

  const clearOld = trpc.shadowMode.clearOld.useMutation({
    onSuccess: () => {
      refetchSummary();
      refetchDivergences();
    },
  });

  const isLoadingShadow = loadingMode || loadingSummary || loadingDivergences;

  // Preparar dados para gráfico de divergências por campo
  const fieldChartData = summary?.byField
    ? summary.byField.map((f: { fieldName: string; count: number }) => ({
        field: fieldLabel(f.fieldName),
        total: Number(f.count),
      }))
    : [];

  // Preparar dados para gráfico de evolução no tempo (últimas 24h por hora)
  const timelineData = buildTimelineData(divergences?.divergences ?? []);

  // Dados por projeto (top 10) — derivado de listDivergences
  const projectCountMap: Record<string, number> = {};
  for (const d of divergences?.divergences ?? []) {
    const key = String(d.projectId);
    projectCountMap[key] = (projectCountMap[key] ?? 0) + 1;
  }
  const projectData = Object.entries(projectCountMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([projectId, count]) => ({ projectId, count }));

  // Contagem de críticos — derivada de listDivergences
  const criticalCount = (divergences?.divergences ?? []).filter(
    (d: any) => d.severity === "critical"
  ).length;

  const modeColor =
    readMode?.mode === "shadow"
      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
      : readMode?.mode === "new"
      ? "bg-green-100 text-green-800 border-green-300"
      : "bg-gray-100 text-gray-700 border-gray-300";

  // UAT data
  const uatProjects = uatProgress?.projects ?? [];
  const uatSummary = uatProgress?.summary;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shadow Mode Monitor</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitoramento de divergências e progresso do UAT
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loadingMode && (
            <Badge variant="outline" className={`text-sm px-3 py-1 font-mono ${modeColor}`}>
              DIAGNOSTIC_READ_MODE = {readMode?.mode ?? "—"}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSummary();
              refetchDivergences();
              refetchUat();
            }}
            disabled={isLoadingShadow || loadingUat}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(isLoadingShadow || loadingUat) ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("shadow")}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "shadow"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="w-4 h-4" />
          Shadow Mode
        </button>
        <button
          onClick={() => setActiveTab("uat")}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "uat"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          Progresso UAT
          {uatProjects.length > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              {uatProjects.length}
            </Badge>
          )}
        </button>
      </div>

      {/* ── ABA: Shadow Mode ── */}
      {activeTab === "shadow" && (
        <div className="space-y-6">
          {/* Cards de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Total de Divergências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loadingSummary ? "—" : (summary?.total ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">registros na tabela</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Divergências Críticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${criticalCount > 0 ? "text-red-600" : "text-green-600"}`}>
                  {loadingDivergences ? "—" : criticalCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">severity = critical</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Projetos Afetados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loadingDivergences ? "—" : Object.keys(projectCountMap).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">projetos únicos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Campos Monitorados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loadingSummary ? "—" : (summary?.byField?.length ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">campos com divergência</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Divergências por campo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Divergências por Campo</CardTitle>
              </CardHeader>
              <CardContent>
                {fieldChartData.length === 0 ? (
                  <EmptyState message="Nenhuma divergência registrada por campo" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={fieldChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="field" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Evolução no tempo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução nas Últimas 24h</CardTitle>
              </CardHeader>
              <CardContent>
                {timelineData.length === 0 ? (
                  <EmptyState message="Nenhuma divergência nas últimas 24h" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={timelineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        name="Divergências"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top projetos com mais divergências */}
          {projectData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 Projetos com Mais Divergências</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={projectData} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="projectId" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name="Divergências" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tabela de divergências recentes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Divergências Recentes</CardTitle>
                <div className="flex items-center gap-3">
                  <Select
                    value={String(limitFilter)}
                    onValueChange={(v) => setLimitFilter(Number(v))}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 linhas</SelectItem>
                      <SelectItem value="50">50 linhas</SelectItem>
                      <SelectItem value="100">100 linhas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => clearOld.mutate({ olderThanDays: 7 })}
                    disabled={clearOld.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Limpar &gt;7d
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDivergences ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
              ) : !divergences?.divergences?.length ? (
                <EmptyState message="Nenhuma divergência registrada. O sistema está consistente." icon="ok" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Projeto</TableHead>
                        <TableHead>Campo</TableHead>
                        <TableHead>Versão</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead className="w-40">Data/Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {divergences.divergences.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{d.projectId}</TableCell>
                          <TableCell className="font-mono text-xs">{fieldLabel(d.fieldName)}</TableCell>
                          <TableCell className="text-xs">{d.flowVersion ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {d.reason ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.createdAt ? new Date(d.createdAt).toLocaleString("pt-BR") : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ABA: Progresso UAT ── */}
      {activeTab === "uat" && (
        <div className="space-y-6">
          {/* Cards de resumo UAT */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-blue-500" />
                  Projetos UAT
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loadingUat ? "—" : (uatSummary?.totalProjects ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">com prefixo [UAT]</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-orange-500" />
                  Total Retrocessos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${(uatSummary?.totalRetrocessos ?? 0) > 0 ? "text-orange-600" : "text-green-600"}`}>
                  {loadingUat ? "—" : (uatSummary?.totalRetrocessos ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">retrocessos registrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-500" />
                  Etapa Média
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loadingUat ? "—" : (uatSummary?.avgStep ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">de 9 etapas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Modo Leitura
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold font-mono">
                  {loadingUat ? "—" : (uatSummary?.readMode ?? "—")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">DIAGNOSTIC_READ_MODE</p>
              </CardContent>
            </Card>
          </div>

          {/* Instrução UAT */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <FlaskConical className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 space-y-1">
                  <p className="font-medium">Como criar um projeto UAT:</p>
                  <p>Crie um novo projeto com o nome começando com <code className="bg-blue-100 px-1 rounded font-mono">[UAT]</code> — ex: <em>[UAT] Empresa Teste Ltda</em>. O projeto aparecerá automaticamente nesta lista para monitoramento.</p>
                  <p className="text-blue-600">Consulte o <strong>GUIA-UAT-ADVOGADOS.md</strong> para os 7 cenários de teste e regras do ambiente.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de projetos UAT */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Projetos em Teste
                </CardTitle>
                {uatSummary?.generatedAt && (
                  <span className="text-xs text-muted-foreground">
                    Atualizado: {new Date(uatSummary.generatedAt).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingUat ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Carregando projetos UAT...</div>
              ) : uatProjects.length === 0 ? (
                <EmptyState
                  message="Nenhum projeto [UAT] encontrado. Crie um projeto com prefixo [UAT] para iniciar os testes."
                  icon="empty"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">ID</TableHead>
                        <TableHead>Nome do Projeto</TableHead>
                        <TableHead>Etapa Atual</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-28 text-center">Retrocessos</TableHead>
                        <TableHead className="w-28 text-center">Transições</TableHead>
                        <TableHead>Criador</TableHead>
                        <TableHead className="w-40">Última Atividade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uatProjects.map((p: any) => (
                        <TableRow key={p.projectId}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            #{p.projectId}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {p.projectName}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {p.currentStep}
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">
                                {p.currentStepName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {p.retrocedeCount > 0 ? (
                              <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                                {p.retrocedeCount}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {p.stepHistoryLength}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.creatorName ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.lastActivityAt
                              ? new Date(p.lastActivityAt).toLocaleString("pt-BR")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Critérios de avanço para Fase 3 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Critérios de Avanço para Fase 3 (modo new)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  {
                    label: "UAT ativo com uso significativo",
                    check: uatProjects.length > 0,
                    detail: `${uatProjects.length} projeto(s) UAT criado(s)`,
                  },
                  {
                    label: "Divergências críticas = 0",
                    check: criticalCount === 0,
                    detail: `${criticalCount} divergência(s) crítica(s)`,
                  },
                  {
                    label: "Divergências totais = 0 ou explicadas",
                    check: (summary?.total ?? 0) === 0,
                    detail: `${summary?.total ?? 0} divergência(s) total`,
                  },
                  {
                    label: "48-72h de observação completos",
                    check: false,
                    detail: "Aguardando período de observação",
                  },
                ].map((criterion, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    {criterion.check ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{criterion.label}</p>
                      <p className="text-xs text-muted-foreground">{criterion.detail}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={criterion.check
                        ? "border-green-300 text-green-700 bg-green-50"
                        : "border-yellow-300 text-yellow-700 bg-yellow-50"
                      }
                    >
                      {criterion.check ? "OK" : "Pendente"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────

function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    briefingContent: "Briefing",
    briefingContentV1: "Briefing V1",
    briefingContentV3: "Briefing V3",
    riskMatricesData: "Matrizes",
    riskMatricesDataV1: "Matrizes V1",
    riskMatricesDataV3: "Matrizes V3",
    actionPlansData: "Plano Ação",
    actionPlansDataV1: "Plano Ação V1",
    actionPlansDataV3: "Plano Ação V3",
  };
  return map[field] ?? field;
}

function buildTimelineData(divergences: any[]): { hour: string; count: number }[] {
  const now = Date.now();
  const buckets: Record<string, number> = {};
  // Criar 24 buckets vazios
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now - i * 3600 * 1000);
    const key = `${String(d.getHours()).padStart(2, "0")}h`;
    buckets[key] = 0;
  }
  for (const d of divergences) {
    const ts = new Date(d.createdAt ?? d.detectedAt).getTime();
    if (now - ts <= 24 * 3600 * 1000) {
      const key = `${String(new Date(ts).getHours()).padStart(2, "0")}h`;
      if (key in buckets) buckets[key]++;
    }
  }
  return Object.entries(buckets).map(([hour, count]) => ({ hour, count }));
}

function EmptyState({ message, icon = "empty" }: { message: string; icon?: "ok" | "empty" }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
      {icon === "ok" ? (
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      ) : (
        <Activity className="w-10 h-10 opacity-30" />
      )}
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}
