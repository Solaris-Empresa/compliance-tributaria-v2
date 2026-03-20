/**
 * ConsistencyGate — v2.2
 * Tela de análise de consistência do perfil da empresa.
 * Gate obrigatório antes do diagnóstico.
 *
 * Fluxo:
 * 1. Usuário preenche perfil básico da empresa
 * 2. Sistema analisa inconsistências (determinístico + IA)
 * 3. Se critical → usuário deve corrigir ou aceitar risco explicitamente
 * 4. Apenas após gate liberado → prossegue para diagnóstico
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Info,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ConsistencyLevel = "none" | "low" | "medium" | "high" | "critical";

interface ConsistencyFinding {
  id: string;
  level: ConsistencyLevel;
  category: string;
  title: string;
  description: string;
  recommendation?: string;
  source: "deterministic" | "ai";
}

// ─── Helpers visuais ──────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<ConsistencyLevel, {
  label: string;
  color: string;
  badgeVariant: "destructive" | "secondary" | "outline" | "default";
  icon: React.ReactNode;
}> = {
  critical: {
    label: "Crítico",
    color: "bg-red-50 border-red-200 text-red-900",
    badgeVariant: "destructive",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
  },
  high: {
    label: "Alto",
    color: "bg-orange-50 border-orange-200 text-orange-900",
    badgeVariant: "secondary",
    icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
  },
  medium: {
    label: "Médio",
    color: "bg-yellow-50 border-yellow-200 text-yellow-900",
    badgeVariant: "outline",
    icon: <Info className="w-4 h-4 text-yellow-600" />,
  },
  low: {
    label: "Baixo",
    color: "bg-blue-50 border-blue-200 text-blue-900",
    badgeVariant: "default",
    icon: <Info className="w-4 h-4 text-blue-600" />,
  },
  none: {
    label: "Nenhum",
    color: "bg-green-50 border-green-200 text-green-900",
    badgeVariant: "default",
    icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  revenue_size: "Porte vs. Faturamento",
  tax_regime: "Regime Tributário",
  employee_size: "Quadro de Funcionários",
  cnae_sector: "CNAE / Setor",
  operations: "Operações",
  governance: "Governança",
  ai_detected: "Detectado por IA",
};

// ─── Componente de Finding ────────────────────────────────────────────────────

function FindingCard({ finding }: { finding: ConsistencyFinding }) {
  const config = LEVEL_CONFIG[finding.level] ?? LEVEL_CONFIG.low;
  return (
    <div className={`rounded-lg border p-4 ${config.color}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm">{finding.title}</span>
            <Badge variant={config.badgeVariant} className="text-xs">{config.label}</Badge>
            <span className="text-xs opacity-60">{CATEGORY_LABELS[finding.category] ?? finding.category}</span>
            {finding.source === "ai" && (
              <span className="text-xs opacity-50 italic">IA</span>
            )}
          </div>
          <p className="text-sm opacity-80">{finding.description}</p>
          {finding.recommendation && (
            <p className="text-xs mt-2 opacity-70 italic">
              <strong>Recomendação:</strong> {finding.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConsistencyGate() {
  useAuth();

  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectInput, setProjectInput] = useState("");
  const [step, setStep] = useState<"input" | "analyzing" | "result" | "accept_risk">("input");
  const [checkId, setCheckId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    overallLevel: ConsistencyLevel;
    findings: ConsistencyFinding[];
    canProceed: boolean;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalIssues: number;
  } | null>(null);
  const [acceptReason, setAcceptReason] = useState("");

  // Formulário de perfil
  const [companySize, setCompanySize] = useState("");
  const [taxRegime, setTaxRegime] = useState("");
  const [revenueRange, setRevenueRange] = useState("");
  const [multiState, setMultiState] = useState(false);
  const [hasInternationalOps, setHasInternationalOps] = useState(false);
  const [hasTaxTeam, setHasTaxTeam] = useState<boolean | undefined>(undefined);
  const [hasAudit, setHasAudit] = useState<boolean | undefined>(undefined);
  const [hasTaxIssues, setHasTaxIssues] = useState<boolean | undefined>(undefined);
  const [description, setDescription] = useState("");

  const analyzeMutation = trpc.consistency.analyze.useMutation({
    onSuccess: (data) => {
      setCheckId(data.checkId);
      setResult({
        overallLevel: data.overallLevel,
        findings: data.findings,
        canProceed: data.canProceed,
        criticalCount: data.criticalCount,
        highCount: data.highCount,
        mediumCount: data.mediumCount,
        lowCount: data.lowCount,
        totalIssues: data.totalIssues,
      });
      setStep("result");
    },
    onError: () => setStep("input"),
  });

  const acceptRiskMutation = trpc.consistency.acceptRisk.useMutation({
    onSuccess: () => {
      if (result) {
        setResult({ ...result, canProceed: true });
      }
      setStep("result");
    },
  });

  const handleLoadProject = () => {
    const id = parseInt(projectInput);
    if (!isNaN(id) && id > 0) setProjectId(id);
  };

  const handleAnalyze = () => {
    if (!projectId) return;
    setStep("analyzing");
    analyzeMutation.mutate({
      projectId,
      companyProfile: {
        companySize: companySize as "mei" | "micro" | "pequena" | "media" | "grande" | undefined,
        taxRegime: taxRegime as "simples_nacional" | "lucro_presumido" | "lucro_real" | undefined,
        annualRevenueRange: revenueRange || undefined,
      },
      operationProfile: {
        multiState,
      },
      taxComplexity: {
        hasInternationalOps,
      },
      governanceProfile: {
        hasTaxTeam,
        hasAudit,
        hasTaxIssues,
      },
      description: description || undefined,
    });
  };

  const handleAcceptRisk = () => {
    if (!checkId || acceptReason.length < 10) return;
    acceptRiskMutation.mutate({ checkId, reason: acceptReason });
  };

  const handleReset = () => {
    setStep("input");
    setResult(null);
    setCheckId(null);
    setAcceptReason("");
  };

  const overallConfig = result ? (LEVEL_CONFIG[result.overallLevel] ?? LEVEL_CONFIG.none) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            Análise de Consistência
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gate obrigatório — verifica inconsistências no perfil da empresa antes do diagnóstico.
          </p>
        </div>

        {/* Seletor de projeto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="ID do projeto (ex: 1)"
                value={projectInput}
                onChange={(e) => setProjectInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoadProject()}
                className="max-w-xs"
              />
              <Button variant="outline" onClick={handleLoadProject}>
                Selecionar
              </Button>
            </div>
            {projectId && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Projeto #{projectId} selecionado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Formulário de perfil */}
        {projectId && step === "input" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perfil da Empresa</CardTitle>
              <CardDescription>Preencha as informações básicas para análise de consistência.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Porte da empresa</Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o porte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mei">MEI</SelectItem>
                      <SelectItem value="micro">Microempresa</SelectItem>
                      <SelectItem value="pequena">Pequena empresa</SelectItem>
                      <SelectItem value="media">Média empresa</SelectItem>
                      <SelectItem value="grande">Grande empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Regime tributário</Label>
                  <Select value={taxRegime} onValueChange={setTaxRegime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o regime" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                      <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="lucro_real">Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Faturamento anual</Label>
                  <Select value={revenueRange} onValueChange={setRevenueRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a faixa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-360000">Até R$ 360 mil</SelectItem>
                      <SelectItem value="360000-4800000">R$ 360 mil – R$ 4,8 milhões</SelectItem>
                      <SelectItem value="4800000-78000000">R$ 4,8 mi – R$ 78 milhões</SelectItem>
                      <SelectItem value="78000000+">Acima de R$ 78 milhões</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Equipe tributária interna?</Label>
                  <Select
                    value={hasTaxTeam === undefined ? "" : hasTaxTeam ? "sim" : "nao"}
                    onValueChange={(v) => setHasTaxTeam(v === "sim")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Possui auditoria interna?</Label>
                  <Select
                    value={hasAudit === undefined ? "" : hasAudit ? "sim" : "nao"}
                    onValueChange={(v) => setHasAudit(v === "sim")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Tem pendências tributárias?</Label>
                  <Select
                    value={hasTaxIssues === undefined ? "" : hasTaxIssues ? "sim" : "nao"}
                    onValueChange={(v) => setHasTaxIssues(v === "sim")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiState}
                    onChange={(e) => setMultiState(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Opera em múltiplos estados</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasInternationalOps}
                    onChange={(e) => setHasInternationalOps(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Tem operações internacionais</span>
                </label>
              </div>

              <div className="space-y-1">
                <Label>Descrição adicional (opcional)</Label>
                <Textarea
                  placeholder="Descreva o modelo de negócio, atividades principais, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <Button onClick={handleAnalyze} className="w-full" disabled={!companySize && !taxRegime}>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Analisar Consistência
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Analisando */}
        {step === "analyzing" && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Analisando consistência do perfil...</p>
                  <p className="text-sm text-gray-500 mt-1">Verificando regras determinísticas e analisando com IA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultado */}
        {step === "result" && result && overallConfig && (
          <>
            {/* Resumo geral */}
            <Card className={`border-2 ${overallConfig.color}`}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    {result.canProceed
                      ? <ShieldCheck className="w-8 h-8 text-green-600" />
                      : <ShieldAlert className="w-8 h-8 text-red-600" />
                    }
                    <div>
                      <p className="font-bold text-lg">
                        {result.canProceed
                          ? "Perfil aprovado para diagnóstico"
                          : "Inconsistências críticas detectadas"
                        }
                      </p>
                      <p className="text-sm opacity-70">
                        {result.totalIssues} inconsistência{result.totalIssues !== 1 ? "s" : ""} encontrada{result.totalIssues !== 1 ? "s" : ""}
                        {" — "}nível geral: <strong>{overallConfig.label}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {result.criticalCount > 0 && (
                      <Badge variant="destructive">{result.criticalCount} crítico{result.criticalCount > 1 ? "s" : ""}</Badge>
                    )}
                    {result.highCount > 0 && (
                      <Badge variant="secondary">{result.highCount} alto{result.highCount > 1 ? "s" : ""}</Badge>
                    )}
                    {result.mediumCount > 0 && (
                      <Badge variant="outline">{result.mediumCount} médio{result.mediumCount > 1 ? "s" : ""}</Badge>
                    )}
                    {result.lowCount > 0 && (
                      <Badge>{result.lowCount} baixo{result.lowCount > 1 ? "s" : ""}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Findings */}
            {result.findings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Inconsistências Detectadas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.findings.map((f) => (
                    <FindingCard key={f.id} finding={f} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Gate: sem inconsistências */}
            {result.totalIssues === 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Perfil consistente</AlertTitle>
                <AlertDescription className="text-green-700">
                  Nenhuma inconsistência detectada. O perfil da empresa está pronto para o diagnóstico.
                </AlertDescription>
              </Alert>
            )}

            {/* Gate: critical não aceito */}
            {!result.canProceed && result.criticalCount > 0 && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-base text-red-800 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" />
                    Gate Bloqueado — Ação Obrigatória
                  </CardTitle>
                  <CardDescription className="text-red-700">
                    Existem {result.criticalCount} inconsistência{result.criticalCount > 1 ? "s" : ""} crítica{result.criticalCount > 1 ? "s" : ""}.
                    Você deve corrigir o perfil ou aceitar o risco explicitamente para prosseguir.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3 flex-wrap">
                    <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Corrigir perfil
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setStep("accept_risk")}
                      className="flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Assumir risco e prosseguir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gate liberado */}
            {result.canProceed && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-800">Gate liberado</p>
                        <p className="text-sm text-green-700">Você pode prosseguir para o diagnóstico.</p>
                      </div>
                    </div>
                    <Button className="bg-green-700 hover:bg-green-800 flex items-center gap-2">
                      Ir para Diagnóstico
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-gray-500">
                <RotateCcw className="w-4 h-4 mr-1" />
                Nova análise
              </Button>
            </div>
          </>
        )}

        {/* Aceitar risco */}
        {step === "accept_risk" && (
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="text-base text-orange-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Aceitar Risco — Justificativa Obrigatória
              </CardTitle>
              <CardDescription className="text-orange-700">
                Ao aceitar o risco, você declara ciência das inconsistências críticas e assume a
                responsabilidade pelo diagnóstico com dados potencialmente inconsistentes.
                Esta ação é registrada no audit trail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Justificativa (mínimo 10 caracteres)</Label>
                <Textarea
                  placeholder="Explique por que está prosseguindo mesmo com inconsistências críticas..."
                  value={acceptReason}
                  onChange={(e) => setAcceptReason(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-gray-500">{acceptReason.length} / 10 mínimo</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("result")}>
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleAcceptRisk}
                  disabled={acceptReason.length < 10 || acceptRiskMutation.isPending}
                >
                  {acceptRiskMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 mr-2" />
                  )}
                  Confirmar aceite de risco
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
