/**
 * ConsolidacaoV4.tsx — Sprint Z-16 #624
 * Step 7 — Tela de consolidação do diagnóstico v4.
 * RN-CV4-01..16 · INV-CV4-01..10
 * Leitura defensiva: data_fim ?? '—'
 */

import { useMemo, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Home,
  Shield,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ──────────────────────────────────────────────────────────────

const DISCLAIMER = `AVISO LEGAL: Este diagnóstico é uma ferramenta de apoio à decisão tributária elaborada com base nas informações fornecidas pela empresa. Os resultados apresentados — incluindo a identificação de riscos, oportunidades e planos de ação — NÃO constituem parecer jurídico. Toda classificação e recomendação deve ser validada por advogado tributarista ou contador habilitado antes de qualquer ação fiscal, contábil ou de compliance. A severidade dos riscos é determinística (baseada em tabelas normativas), mas a aplicabilidade ao caso concreto depende de análise humana qualificada. IA SOLARIS não se responsabiliza por decisões tomadas sem a devida validação profissional.`;

const CATEGORIA_LABELS: Record<string, string> = {
  imposto_seletivo: "Imposto Seletivo",
  confissao_automatica: "Confissão Automática",
  split_payment: "Split Payment",
  inscricao_cadastral: "Inscrição Cadastral",
  regime_diferenciado: "Regime Diferenciado",
  transicao_iss_ibs: "Transição ISS/IBS",
  obrigacao_acessoria: "Obrigação Acessória",
  aliquota_zero: "Alíquota Zero",
  aliquota_reduzida: "Alíquota Reduzida",
  credito_presumido: "Crédito Presumido",
};

const SOURCE_LABELS: Record<string, string> = {
  cnae: "CNAE",
  ncm: "NCM",
  nbs: "NBS",
  solaris: "Solaris",
  iagen: "IA Gen",
};

const SEVERITY_COLORS: Record<string, string> = {
  alta: "bg-red-100 text-red-700 border-red-200",
  media: "bg-amber-100 text-amber-700 border-amber-200",
  oportunidade: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const NIVEL_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  critico: { bg: "bg-red-50", text: "text-red-700", bar: "bg-red-500" },
  alto: { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500" },
  medio: { bg: "bg-yellow-50", text: "text-yellow-700", bar: "bg-yellow-500" },
  baixo: { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" },
};

const TIMELINE = [
  { year: "2026", label: "Início da transição", desc: "CBS e IBS começam a ser cobrados em caráter de teste" },
  { year: "2027", label: "Fase de calibragem", desc: "Ajuste de alíquotas e processos de split payment" },
  { year: "2028", label: "Extinção gradual PIS/Cofins", desc: "Redução progressiva das alíquotas federais" },
  { year: "2029", label: "IBS estadual avança", desc: "Substituição gradual do ICMS pelo IBS" },
  { year: "2030", label: "ISS → IBS municipal", desc: "Municípios migram para o IBS" },
  { year: "2032", label: "Consolidação", desc: "Transição completa para o novo sistema" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ConsolidacaoV4() {
  const [, params] = useRoute("/projetos/:projectId/consolidacao-v4");
  const projectId = parseInt(params?.projectId ?? "0", 10);

  const risksQuery = trpc.risksV4.listRisks.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const scoreMutation = trpc.risksV4.calculateAndSaveScore.useMutation({
    onError: (err) => toast.error("Erro ao calcular score", { description: err.message }),
  });

  const data = risksQuery.data;
  const allRisks = useMemo(() => data?.risks ?? [], [data]);

  const approvedRisks = useMemo(
    () => allRisks.filter((r: any) => r.approved_at && r.type === "risk"),
    [allRisks]
  );
  const opportunities = useMemo(
    () => allRisks.filter((r: any) => r.type === "opportunity"),
    [allRisks]
  );
  const deletedRisks = useMemo(
    () => allRisks.filter((r: any) => r.status === "deleted"),
    [allRisks]
  );
  const allPlans = useMemo(
    () => allRisks.flatMap((r: any) => r.actionPlans ?? []),
    [allRisks]
  );
  const approvedPlans = useMemo(
    () => allPlans.filter((p: any) => p.status !== "rascunho" && p.status !== "deleted"),
    [allPlans]
  );
  const allTasks = useMemo(
    () => allPlans.flatMap((p: any) => p.tasks ?? []),
    [allPlans]
  );

  // Calculate score on mount — useEffect (não useMemo) para side effects
  const score = scoreMutation.data;
  useEffect(() => {
    if (projectId && !scoreMutation.data && !scoreMutation.isPending) {
      scoreMutation.mutate({ projectId });
    }
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const nivel = score?.nivel ?? "baixo";
  const nivelColors = NIVEL_COLORS[nivel] ?? NIVEL_COLORS.baixo;

  if (!projectId) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Projeto não identificado na URL.</AlertDescription>
      </Alert>
    );
  }

  if (risksQuery.isLoading) {
    return (
      <div className="container max-w-5xl py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container max-w-5xl py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link href={`/projetos/${projectId}/planos-v4`}>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
              Planos de Ação
            </Button>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            Consolidação v4
          </span>
        </div>

        {/* Header */}
        <div data-testid="consolidacao-header">
          <h1 className="text-xl font-bold text-foreground">
            Diagnóstico de Adequação Tributária
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reforma Tributária — LC 214/2025
          </p>
        </div>

        {/* Disclaimer jurídico (RN-CV4-11) */}
        <Alert data-testid="disclaimer-box" className="border-amber-200 bg-amber-50">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-800 leading-relaxed">
            {DISCLAIMER}
          </AlertDescription>
        </Alert>

        {/* KPI Grid */}
        <div data-testid="kpi-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard testId="kpi-score" label="Score" value={score?.score ?? 0} suffix="%" color={nivelColors.text} />
          <KpiCard testId="kpi-alta" label="Alta" value={score?.total_alta ?? 0} color="text-red-600" />
          <KpiCard testId="kpi-media" label="Média" value={score?.total_media ?? 0} color="text-amber-600" />
          <KpiCard testId="kpi-oportunidades" label="Oportunidades" value={opportunities.length} color="text-emerald-600" />
          <KpiCard testId="kpi-planos" label="Planos" value={approvedPlans.length} color="text-blue-600" />
          <KpiCard testId="kpi-tarefas" label="Tarefas" value={allTasks.length} color="text-purple-600" />
        </div>

        {/* Compliance Score Card (RN-CV4-01..07) */}
        <Card data-testid="compliance-score-card" className={nivelColors.bg}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Score de Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <span className={`text-4xl font-bold ${nivelColors.text}`}>
                {score?.score ?? 0}%
              </span>
              <Badge className={`${nivelColors.bar} text-white`}>
                {nivel.toUpperCase()}
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${nivelColors.bar}`}
                style={{ width: `${Math.min(score?.score ?? 0, 100)}%` }}
              />
            </div>
            <p data-testid="score-transparencia" className="text-xs text-muted-foreground">
              Fórmula v4.0: sum(peso × max(confiança, 0.5)) / (n × 9) × 100 —{" "}
              {approvedRisks.length} riscos aprovados no cálculo
            </p>
          </CardContent>
        </Card>

        {/* Aviso: planos sem tarefas (RN-CV4-09) */}
        {approvedPlans.some((p: any) => !(p.tasks?.length > 0)) && (
          <Alert data-testid="aviso-planos-sem-tarefas" className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-800">
              Alguns planos aprovados ainda não possuem tarefas atribuídas.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabela riscos aprovados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Riscos Aprovados
              <Badge variant="secondary" className="ml-auto text-xs">{approvedRisks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="tabela-riscos-aprovados" className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Risco</th>
                    <th className="pb-2 pr-3">Categoria</th>
                    <th className="pb-2 pr-3">Severidade</th>
                    <th className="pb-2 pr-3">Origem</th>
                    <th className="pb-2 pr-3">Base Legal</th>
                    <th className="pb-2">RAG</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedRisks.map((risk: any) => (
                    <tr key={risk.id} data-testid="risk-row" className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium max-w-[200px] truncate">{risk.titulo}</td>
                      <td className="py-2 pr-3">{CATEGORIA_LABELS[risk.categoria] ?? risk.categoria}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={SEVERITY_COLORS[risk.severidade] ?? ""}>
                          {risk.severidade}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge data-testid="risk-origem-badge" variant="secondary" className="text-[10px]">
                          {SOURCE_LABELS[risk.source_priority] ?? risk.source_priority}
                        </Badge>
                      </td>
                      <td data-testid="risk-base-legal" className="py-2 pr-3 text-muted-foreground">
                        {risk.artigo || "—"}
                      </td>
                      <td data-testid="risk-rag-status" className="py-2">
                        {risk.rag_validated ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">RAG ✓</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">N/V</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {approvedRisks.length === 0 && (
                    <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Nenhum risco aprovado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Oportunidades (RN-CV4-02 — seção separada) */}
        {opportunities.length > 0 && (
          <Card data-testid="secao-oportunidades">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Oportunidades Tributárias
                <Badge variant="secondary" className="ml-auto text-xs">{opportunities.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {opportunities.map((opp: any) => (
                <div key={opp.id} data-testid="oportunidade-row" className="flex items-center gap-3 rounded border border-emerald-100 bg-emerald-50/50 px-3 py-2">
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px] shrink-0">
                    {CATEGORIA_LABELS[opp.categoria] ?? opp.categoria}
                  </Badge>
                  <span className="text-xs truncate">{opp.titulo}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{opp.artigo || "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Riscos desconsiderados (RN-CV4-08) */}
        {deletedRisks.length > 0 && (
          <Card data-testid="secao-riscos-desconsiderados">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">
                Riscos Desconsiderados ({deletedRisks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {deletedRisks.map((r: any) => (
                <div key={r.id} data-testid="risco-desconsiderado-row" className="flex items-center gap-2 text-xs text-muted-foreground border-b last:border-0 py-1.5">
                  <span className="truncate">{r.titulo}</span>
                  <span className="ml-auto shrink-0 italic">{r.deleted_reason ?? "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Planos de Ação aprovados */}
        <Card data-testid="secao-planos">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-500" />
              Planos de Ação
              <Badge variant="secondary" className="ml-auto text-xs">{approvedPlans.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvedPlans.map((plan: any) => (
              <div key={plan.id} data-testid="plano-row" className="rounded border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{plan.titulo}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{plan.prazo}</Badge>
                    <Badge className={plan.status === "aprovado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                      {plan.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Responsável: {plan.responsavel}</p>
                {plan.tasks && plan.tasks.length > 0 && (
                  <div data-testid="plano-tarefas-lista" className="pl-3 border-l-2 border-muted space-y-1">
                    {plan.tasks.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          task.status === "done" ? "bg-emerald-500" : "bg-amber-400"
                        }`} />
                        <span className="truncate">{task.titulo}</span>
                        <span className="text-muted-foreground ml-auto shrink-0">
                          {task.data_fim
                            ? (task.data_fim instanceof Date
                                ? task.data_fim.toLocaleDateString("pt-BR")
                                : String(task.data_fim).slice(0, 10))
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {approvedPlans.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum plano aprovado</p>
            )}
          </CardContent>
        </Card>

        {/* Base legal escalável (RN-CV4-13) */}
        <Card data-testid="secao-base-legal">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Base Legal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div data-testid="lei-card" className="rounded border p-3">
              <p className="text-sm font-medium">Lei Complementar 214/2025</p>
              <p className="text-xs text-muted-foreground mt-1">
                Institui o Imposto sobre Bens e Serviços (IBS), a Contribuição Social sobre Bens e Serviços (CBS)
                e o Imposto Seletivo (IS), e dá outras providências.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline (RN-CV4-15) */}
        <Card data-testid="timeline-reforma">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Linha do Tempo — Reforma Tributária 2026–2032</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {TIMELINE.map((item, i) => (
                <div key={item.year} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 rounded px-2 py-0.5">{item.year}</span>
                    {i < TIMELINE.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Próximos passos */}
        <Card data-testid="proximo-passo-box">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>1. Validar este diagnóstico com advogado tributarista ou contador habilitado.</p>
            <p>2. Priorizar planos de ação com severidade alta e urgência imediata.</p>
            <p>3. Iniciar execução das tarefas aprovadas dentro dos prazos estabelecidos.</p>
            <p>4. Acompanhar a evolução da reforma tributária (2026–2032).</p>
            <p>5. Reavaliar diagnóstico periodicamente conforme novas regulamentações.</p>
          </CardContent>
        </Card>

        {/* Footer buttons */}
        <div className="flex flex-wrap justify-center gap-3 pt-4 pb-8">
          <Button
            data-testid="btn-download-pdf"
            variant="outline"
            size="sm"
            onClick={() => toast.info("PDF será implementado na issue #626")}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Baixar diagnóstico (PDF)
          </Button>
          <Link href="/projetos">
            <Button data-testid="btn-ver-projetos" variant="outline" size="sm">
              <Home className="h-3.5 w-3.5 mr-1.5" />
              Ver projetos
            </Button>
          </Link>
          <Link href={`/projetos/${projectId}/planos-v4`}>
            <Button data-testid="btn-voltar-planos" variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Voltar aos planos
            </Button>
          </Link>
          <Link href={`/projetos/${projectId}`}>
            <Button data-testid="btn-ver-projeto" variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ver projeto
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ testId, label, value, suffix, color }: {
  testId: string; label: string; value: number; suffix?: string; color: string;
}) {
  return (
    <Card data-testid={testId} className="text-center">
      <CardContent className="pt-4 pb-3">
        <p className={`text-2xl font-bold ${color}`}>{value}{suffix}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
