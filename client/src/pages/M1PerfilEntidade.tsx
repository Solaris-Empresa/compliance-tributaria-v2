/**
 * M1PerfilEntidade.tsx — Tela do Runner v3 (M1)
 *
 * Funcionalidades:
 *  1. Formulário de Seed (campos do arquétipo)
 *  2. Execução do Runner via trpc.m1Monitor.runAndLog
 *  3. Painel de Confiança (score, coerência, completude, inferência)
 *  4. Tabela de logs recentes
 *  5. Métricas agregadas (últimas 24h)
 *
 * Acesso: equipe_solaris | advogado_senior | E2E_TEST_MODE
 * Flag: m1-archetype-enabled (avaliada no servidor)
 *
 * Ref: PAINEL-CONFIANCA-SPEC.md · feat/m1-archetype-runner-v3
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Info,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type RunResult = {
  status_arquetipo: string;
  test_status: string;
  fallback_count: number;
  hard_block_count: number;
  lc_conflict_count: number;
  missing_field_count: number;
  score_confianca: number;
  blockers_triggered: ReadonlyArray<{ id: string; severity: string; rule: string }> | Array<{ id: string; severity: string; rule: string }>;
  missing_required_fields: string[];
  duration_ms: number;
};

type SeedForm = {
  nome_empresa: string;
  cnpj: string;
  ncms_principais: string; // CSV
  nbss_principais: string; // CSV
  papel_na_cadeia_input: string;
  tipo_de_relacao_input: string;
  territorio_input: string;
  regime_tributario_input: string;
  cnae_principal_confirmado: string;
  projectId: string;
};

const INITIAL_FORM: SeedForm = {
  nome_empresa: "",
  cnpj: "",
  ncms_principais: "",
  nbss_principais: "",
  papel_na_cadeia_input: "",
  tipo_de_relacao_input: "",
  territorio_input: "",
  regime_tributario_input: "",
  cnae_principal_confirmado: "",
  projectId: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  if (status === "confirmado") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (status === "inconsistente") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (status === "bloqueado_terminal") return "bg-red-700/15 text-red-300 border-red-700/30";
  if (status === "pendente") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-slate-500/15 text-slate-400 border-slate-500/30";
}

function severityColor(sev: string) {
  if (sev === "HARD_BLOCK") return "bg-red-500/20 text-red-300";
  if (sev === "BLOCK_FLOW") return "bg-orange-500/20 text-orange-300";
  return "bg-slate-500/20 text-slate-400";
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function ScoreGauge({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? "#34d399" : value >= 50 ? "#fbbf24" : "#f87171";
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="49" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">
          {value}
        </text>
      </svg>
      <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function M1PerfilEntidade() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirecionar se não for usuário interno
  if (user && !["equipe_solaris", "advogado_senior"].includes(user.role)) {
    setLocation("/");
    return null;
  }

  const [form, setForm] = useState<SeedForm>(INITIAL_FORM);
  const [result, setResult] = useState<RunResult | null>(null);
  const [showBlockers, setShowBlockers] = useState(false);
  const [logLimit] = useState(50);

  const runMutation = trpc.m1Monitor.runAndLog.useMutation({
    onSuccess: (data) => setResult(data as unknown as RunResult),
  });

  const metricsQuery = trpc.m1Monitor.getMetrics.useQuery(
    {},
    { enabled: !!user && user.role === "equipe_solaris" },
  );

  const logsQuery = trpc.m1Monitor.getRecentLogs.useQuery(
    { limit: logLimit },
    { enabled: !!user && user.role === "equipe_solaris" },
  );

  const chartData = useMemo(() => {
    const byStatus = metricsQuery.data?.by_status_arquetipo;
    if (!byStatus) return [];
    return Object.entries(byStatus).map(([name, count]) => ({ name: name ?? "—", count: count as number }));
  }, [metricsQuery.data]);

  function handleChange(key: keyof SeedForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleRun() {
    const projectId = parseInt(form.projectId, 10);
    if (isNaN(projectId) || projectId <= 0) {
      alert("Informe um Project ID válido (inteiro positivo).");
      return;
    }
    const seed = {
      nome_empresa: form.nome_empresa || undefined,
      cnpj: form.cnpj || undefined,
      ncms_principais: form.ncms_principais
        ? form.ncms_principais.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      nbss_principais: form.nbss_principais
        ? form.nbss_principais.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      papel_na_cadeia_input: form.papel_na_cadeia_input || undefined,
      tipo_de_relacao_input: form.tipo_de_relacao_input || undefined,
      territorio_input: form.territorio_input || undefined,
      regime_tributario_input: form.regime_tributario_input || undefined,
      cnae_principal_confirmado: form.cnae_principal_confirmado || undefined,
    };
    runMutation.mutate({ projectId, seed });
  }

  // ── Painel de Confiança derivado do resultado ──────────────────────────────
  const completude = result
    ? Math.floor(((6 - result.missing_field_count) / 6) * 100)
    : 0;
  const coerencia = result ? (result.lc_conflict_count === 0 ? 100 : 0) : 0;
  const inferencia = result ? (result.fallback_count === 0 ? 100 : 0) : 0;
  const score = result?.score_confianca ?? 0;

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* ── Cabeçalho ── */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <FlaskConical className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              M1 — Perfil da Entidade
            </h1>
            <p className="text-sm text-slate-400">
              Runner v3 · Deploy controlado · Flag{" "}
              <code className="text-xs bg-slate-800 px-1 rounded">
                m1-archetype-enabled=false
              </code>{" "}
              (rollout por role/projeto)
            </p>
          </div>
          <Badge className="ml-auto bg-indigo-500/15 text-indigo-300 border-indigo-500/30 text-xs">
            {user?.role ?? "—"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Formulário de Seed ── */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                Seed do Arquétipo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Project ID *</Label>
                  <Input
                    placeholder="ex: 1234"
                    value={form.projectId}
                    onChange={(e) => handleChange("projectId", e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Nome da Empresa</Label>
                  <Input
                    placeholder="ex: Acme Telecom"
                    value={form.nome_empresa}
                    onChange={(e) => handleChange("nome_empresa", e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">CNPJ</Label>
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj}
                    onChange={(e) => handleChange("cnpj", e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">CNAE Principal</Label>
                  <Input
                    placeholder="ex: 6110-8/01"
                    value={form.cnae_principal_confirmado}
                    onChange={(e) => handleChange("cnae_principal_confirmado", e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-400">NCMs Principais (CSV)</Label>
                <Input
                  placeholder="ex: 8517.12.31, 8517.62.99"
                  value={form.ncms_principais}
                  onChange={(e) => handleChange("ncms_principais", e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-400">NBSs Principais (CSV)</Label>
                <Input
                  placeholder="ex: 1.0901.00.00, 1.0902.00.00"
                  value={form.nbss_principais}
                  onChange={(e) => handleChange("nbss_principais", e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Papel na Cadeia</Label>
                  <Select
                    value={form.papel_na_cadeia_input}
                    onValueChange={(v) => handleChange("papel_na_cadeia_input", v)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="fabricante">Fabricante</SelectItem>
                      <SelectItem value="importador">Importador</SelectItem>
                      <SelectItem value="distribuidor">Distribuidor</SelectItem>
                      <SelectItem value="varejista">Varejista</SelectItem>
                      <SelectItem value="prestador_servico">Prestador de Serviço</SelectItem>
                      <SelectItem value="misto">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Tipo de Relação</Label>
                  <Select
                    value={form.tipo_de_relacao_input}
                    onValueChange={(v) => handleChange("tipo_de_relacao_input", v)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="b2b">B2B</SelectItem>
                      <SelectItem value="b2c">B2C</SelectItem>
                      <SelectItem value="b2b_b2c">B2B + B2C</SelectItem>
                      <SelectItem value="b2g">B2G</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Território</Label>
                  <Select
                    value={form.territorio_input}
                    onValueChange={(v) => handleChange("territorio_input", v)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="nacional">Nacional</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                      <SelectItem value="internacional">Internacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Regime Tributário</Label>
                  <Select
                    value={form.regime_tributario_input}
                    onValueChange={(v) => handleChange("regime_tributario_input", v)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="lucro_real">Lucro Real</SelectItem>
                      <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                      <SelectItem value="mei">MEI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleRun}
                disabled={runMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm h-9 mt-1"
              >
                {runMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Executando Runner v3...
                  </>
                ) : (
                  <>
                    <FlaskConical className="h-4 w-4 mr-2" />
                    Executar Runner v3
                  </>
                )}
              </Button>

              {runMutation.error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
                  {runMutation.error.message}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Painel de Confiança ── */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                Painel de Confiança
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-slate-500 ml-1" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs bg-slate-800 border-slate-700">
                    Score = Completude×40% + Inferência×30% + Coerência×30%.
                    Score é explicativo — não libera gate.
                    Gate = status_arquetipo + hard_blocks + erros_estruturais.
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm gap-2">
                  <Activity className="h-8 w-8 opacity-30" />
                  <span>Execute o runner para ver os resultados</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status do arquétipo */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Status Arquétipo</span>
                    <Badge className={`text-xs border ${statusColor(result.status_arquetipo)}`}>
                      {result.status_arquetipo}
                    </Badge>
                  </div>

                  {/* Gauges */}
                  <div className="grid grid-cols-4 gap-2 py-2">
                    <ScoreGauge value={score} label="Score" />
                    <ScoreGauge value={completude} label="Completude" />
                    <ScoreGauge value={inferencia} label="Inferência" />
                    <ScoreGauge value={coerencia} label="Coerência" />
                  </div>

                  {/* Aviso: score não libera gate */}
                  {result.status_arquetipo !== "confirmado" && score >= 70 && (
                    <div className="flex items-start gap-2 text-xs bg-amber-500/10 border border-amber-500/20 rounded p-2 text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        <strong>FP-01:</strong> Score alto ({score}%) mas gate bloqueado
                        ({result.status_arquetipo}). Score é explicativo — não libera gate.
                      </span>
                    </div>
                  )}

                  {/* Fallback visível */}
                  {result.fallback_count > 0 && result.status_arquetipo === "confirmado" && (
                    <div className="flex items-start gap-2 text-xs bg-slate-700/50 border border-slate-600/30 rounded p-2 text-slate-300">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                      <span>
                        <strong>FP-02:</strong> Gate liberado mas {result.fallback_count} fallback(s)
                        ativo(s). Objeto/setor derivado de forma genérica.
                      </span>
                    </div>
                  )}

                  {/* Contadores */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-800 rounded p-2">
                      <div className="text-lg font-bold text-slate-100">{result.fallback_count}</div>
                      <div className="text-xs text-slate-500">Fallbacks</div>
                    </div>
                    <div className="bg-slate-800 rounded p-2">
                      <div className="text-lg font-bold text-red-400">{result.hard_block_count}</div>
                      <div className="text-xs text-slate-500">Hard Blocks</div>
                    </div>
                    <div className="bg-slate-800 rounded p-2">
                      <div className="text-lg font-bold text-orange-400">{result.lc_conflict_count}</div>
                      <div className="text-xs text-slate-500">Conflitos LC</div>
                    </div>
                  </div>

                  {/* Campos faltantes */}
                  {result.missing_required_fields.length > 0 && (
                    <div className="text-xs bg-red-500/10 border border-red-500/20 rounded p-2">
                      <div className="text-red-400 font-medium mb-1">Campos obrigatórios ausentes:</div>
                      <div className="flex flex-wrap gap-1">
                        {result.missing_required_fields.map((f) => (
                          <Badge key={f} className="text-xs bg-red-500/20 text-red-300 border-0">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blockers */}
                  {result.blockers_triggered.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowBlockers((v) => !v)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
                      >
                        {showBlockers ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {result.blockers_triggered.length} blocker(s) disparado(s)
                      </button>
                      {showBlockers && (
                        <div className="mt-2 space-y-1">
                          {result.blockers_triggered.map((b, i) => (
                            <div
                              key={i}
                              className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${severityColor(b.severity)}`}
                            >
                              <ShieldAlert className="h-3 w-3 shrink-0" />
                              <span className="font-mono">{b.id}</span>
                              <span className="text-slate-500">·</span>
                              <span className="opacity-80">{b.rule}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Duração */}
                  <div className="text-xs text-slate-500 text-right">
                    Executado em {result.duration_ms}ms
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Métricas Agregadas (últimas 24h) — apenas equipe_solaris ── */}
        {user?.role === "equipe_solaris" && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-400" />
                Métricas M1 — Últimas 24h
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => metricsQuery.refetch()}
                  className="ml-auto h-6 px-2 text-xs text-slate-400"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${metricsQuery.isFetching ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsQuery.isLoading ? (
                <div className="text-sm text-slate-500 text-center py-4">Carregando métricas...</div>
              ) : metricsQuery.error ? (
                <div className="text-sm text-red-400 text-center py-4">{metricsQuery.error.message}</div>
              ) : metricsQuery.data ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Total Runs", value: metricsQuery.data.summary?.total_logs ?? 0, color: "text-slate-100" },
                      { label: "Com Fallback", value: metricsQuery.data.blockers?.logs_with_fallback ?? 0, color: "text-amber-400" },
                      { label: "Hard Blocks", value: metricsQuery.data.blockers?.total_hard_blocks ?? 0, color: "text-red-400" },
                      { label: "Conflitos LC", value: metricsQuery.data.blockers?.total_lc_conflicts ?? 0, color: "text-orange-400" },
                      { label: "Score Médio", value: `${metricsQuery.data.confidence?.avg_score ?? 0}%`, color: scoreColor(metricsQuery.data.confidence?.avg_score ?? 0) },
                      { label: "Duração Média", value: `${metricsQuery.data.confidence?.avg_duration_ms ?? 0}ms`, color: "text-slate-300" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-slate-800 rounded p-3 text-center">
                        <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Gráfico de distribuição por status_arquetipo */}
                  <div>
                    <div className="text-xs text-slate-400 mb-2">Distribuição por Status Arquétipo</div>
                    {chartData.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-8">Sem dados ainda</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={chartData} barSize={24}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <RechartsTooltip
                            contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 12 }}
                          />
                          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                            {chartData.map((entry: { name: string; count: number }, index: number) => (
                              <Cell
                                key={index}
                                fill={
                                  entry.name === "confirmado" ? "#34d399"
                                  : entry.name === "inconsistente" ? "#f87171"
                                  : entry.name === "bloqueado_terminal" ? "#ef4444"
                                  : "#fbbf24"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* ── Logs Recentes — apenas equipe_solaris ── */}
        {user?.role === "equipe_solaris" && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-indigo-400" />
                Logs Recentes
                <span className="text-xs text-slate-500 font-normal ml-1">
                  ({logsQuery.data?.total ?? 0} registros)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logsQuery.refetch()}
                  className="ml-auto h-6 px-2 text-xs text-slate-400"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${logsQuery.isFetching ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logsQuery.isLoading ? (
                <div className="text-sm text-slate-500 text-center py-4">Carregando logs...</div>
              ) : logsQuery.error ? (
                <div className="text-sm text-red-400 text-center py-4">{logsQuery.error.message}</div>
              ) : !logsQuery.data?.logs.length ? (
                <div className="text-sm text-slate-500 text-center py-8">
                  Nenhum log registrado ainda. Execute o runner para gerar o primeiro log.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-xs text-slate-400">ID</TableHead>
                        <TableHead className="text-xs text-slate-400">Projeto</TableHead>
                        <TableHead className="text-xs text-slate-400">Status</TableHead>
                        <TableHead className="text-xs text-slate-400">Score</TableHead>
                        <TableHead className="text-xs text-slate-400">Fallback</TableHead>
                        <TableHead className="text-xs text-slate-400">Hard Blocks</TableHead>
                        <TableHead className="text-xs text-slate-400">LC</TableHead>
                        <TableHead className="text-xs text-slate-400">Duração</TableHead>
                        <TableHead className="text-xs text-slate-400">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsQuery.data.logs.map((log) => (
                        <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/50">
                          <TableCell className="text-xs text-slate-400 font-mono">{log.id}</TableCell>
                          <TableCell className="text-xs text-slate-300">{log.projectId}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs border ${statusColor(log.statusArquetipo ?? "")}`}>
                              {log.statusArquetipo ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-xs font-mono ${scoreColor(log.scoreConfianca ?? 0)}`}>
                            {log.scoreConfianca ?? 0}%
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            {log.fallbackCount > 0 ? (
                              <span className="text-amber-400">{log.fallbackCount}</span>
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            {log.hardBlockCount > 0 ? (
                              <span className="text-red-400">{log.hardBlockCount}</span>
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            {log.lcConflictCount > 0 ? (
                              <span className="text-orange-400">{log.lcConflictCount}</span>
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 font-mono">
                            {log.durationMs}ms
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {new Date(log.createdAt).toLocaleString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
