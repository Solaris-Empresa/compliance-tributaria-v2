import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Loader2,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  ScanSearch,
  BarChart3,
  Shield,
  AlertCircle,
  TrendingUp,
  ClipboardList,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";

// ─── Tipos internos ──────────────────────────────────────────────────────────

interface BriefingSection {
  title: string;
  content: string | Record<string, unknown>;
  source_refs?: string[];
}

interface BriefingData {
  identificacao?: Record<string, unknown>;
  escopo?: Record<string, unknown>;
  resumo_executivo?: Record<string, unknown>;
  perfil_regulatorio?: Record<string, unknown>;
  gaps?: Record<string, unknown>;
  riscos?: Record<string, unknown>;
  plano_acao?: Record<string, unknown>;
  proximos_passos?: Record<string, unknown>;
}

interface GenerateResult {
  success: boolean;
  briefingId?: number;
  coverage_percent?: number;
  consistency_score?: number;
  is_traceable?: boolean;
  briefing?: BriefingData;
  blocking_issues?: string[];
}

// ─── Configuração das 8 seções ───────────────────────────────────────────────

const SECTIONS = [
  {
    key: "identificacao",
    label: "1. Identificação",
    icon: Building2,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    description: "Dados do cliente, CNPJ, porte, regime tributário e responsável técnico.",
  },
  {
    key: "escopo",
    label: "2. Escopo",
    icon: ScanSearch,
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200",
    description: "Perímetro da análise, legislação aplicável e domínios avaliados.",
  },
  {
    key: "resumo_executivo",
    label: "3. Resumo Executivo",
    icon: BarChart3,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
    description: "Síntese da situação de compliance, score geral e principais achados.",
  },
  {
    key: "perfil_regulatorio",
    label: "4. Perfil Regulatório",
    icon: Shield,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    description: "Requisitos aplicáveis por camada (operacional, corporativo, CNAE).",
  },
  {
    key: "gaps",
    label: "5. Gaps",
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    description: "Lacunas identificadas por domínio, criticidade e status de atendimento.",
  },
  {
    key: "riscos",
    label: "6. Riscos",
    icon: TrendingUp,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    description: "Mapa de riscos com nível, score e estratégia de mitigação.",
  },
  {
    key: "plano_acao",
    label: "7. Plano de Ação",
    icon: ClipboardList,
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
    description: "Ações priorizadas com prazo, responsável e evidência requerida.",
  },
  {
    key: "proximos_passos",
    label: "8. Próximos Passos",
    icon: ArrowRight,
    color: "text-teal-600",
    bg: "bg-teal-50 border-teal-200",
    description: "Recomendações imediatas, cronograma e marcos de acompanhamento.",
  },
] as const;

// ─── Componente de seção expansível ─────────────────────────────────────────

function SectionCard({
  sectionConfig,
  data,
}: {
  sectionConfig: (typeof SECTIONS)[number];
  data: Record<string, unknown> | undefined;
}) {
  const [open, setOpen] = useState(true);
  const Icon = sectionConfig.icon;

  if (!data) return null;

  const renderValue = (val: unknown, depth = 0): React.ReactNode => {
    if (val === null || val === undefined) return <span className="text-muted-foreground italic">—</span>;
    if (typeof val === "boolean") return <Badge variant={val ? "default" : "secondary"}>{val ? "Sim" : "Não"}</Badge>;
    if (typeof val === "number") return <span className="font-mono font-semibold">{val}</span>;
    if (typeof val === "string") {
      if (val.length === 0) return <span className="text-muted-foreground italic">—</span>;
      // Multi-line strings
      if (val.includes("\n")) {
        return (
          <div className="space-y-1">
            {val.split("\n").map((line, i) => (
              <p key={i} className="text-sm leading-relaxed">{line}</p>
            ))}
          </div>
        );
      }
      return <span className="text-sm">{val}</span>;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-muted-foreground italic text-sm">Nenhum item</span>;
      return (
        <ul className={`space-y-1 ${depth > 0 ? "ml-4" : ""}`}>
          {val.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-muted-foreground mt-0.5 text-xs">•</span>
              <span className="text-sm flex-1">{renderValue(item, depth + 1)}</span>
            </li>
          ))}
        </ul>
      );
    }
    if (typeof val === "object") {
      return (
        <div className={`space-y-2 ${depth > 0 ? "ml-3 pl-3 border-l border-border" : ""}`}>
          {Object.entries(val as Record<string, unknown>).map(([k, v]) => (
            <div key={k} className="space-y-0.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {k.replace(/_/g, " ")}
              </p>
              <div>{renderValue(v, depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-sm">{String(val)}</span>;
  };

  return (
    <Card className={`border ${sectionConfig.bg}`}>
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className={`text-base flex items-center gap-2 ${sectionConfig.color}`}>
            <Icon className="h-4 w-4" />
            {sectionConfig.label}
          </CardTitle>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{sectionConfig.description}</p>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          <Separator className="mb-3" />
          {renderValue(data)}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Componente de métricas do briefing ──────────────────────────────────────

function BriefingMetrics({
  coverage,
  consistency,
  traceable,
}: {
  coverage: number;
  consistency: number;
  traceable: boolean;
}) {
  const getColor = (val: number) =>
    val >= 90 ? "text-emerald-600" : val >= 70 ? "text-amber-600" : "text-red-600";

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center p-3 bg-muted/40 rounded-lg">
        <p className="text-2xl font-bold font-mono text-emerald-600">{coverage}%</p>
        <p className="text-xs text-muted-foreground mt-0.5">Coverage</p>
      </div>
      <div className="text-center p-3 bg-muted/40 rounded-lg">
        <p className={`text-2xl font-bold font-mono ${getColor(consistency)}`}>{consistency}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Consistência</p>
      </div>
      <div className="text-center p-3 bg-muted/40 rounded-lg">
        {traceable ? (
          <CheckCircle2 className="h-7 w-7 text-emerald-600 mx-auto" />
        ) : (
          <XCircle className="h-7 w-7 text-red-500 mx-auto" />
        )}
        <p className="text-xs text-muted-foreground mt-0.5">Rastreável</p>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function BriefingEngineView() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const printRef = useRef<HTMLDivElement>(null);

  // Estado local do briefing gerado (pode vir de generate ou getByProject)
  const [generatedBriefing, setGeneratedBriefing] = useState<GenerateResult | null>(null);

  // Buscar briefing existente
  const {
    data: existingBriefing,
    isLoading: isLoadingExisting,
    refetch: refetchExisting,
  } = trpc.briefingEngine.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Mutation de geração
  const generateMutation = trpc.briefingEngine.generate.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setGeneratedBriefing(data as GenerateResult);
        refetchExisting();
        toast.success("Briefing gerado com sucesso!", {
          description: `Coverage: ${data.coverage_percent}% | Consistência: ${data.consistency_score}`,
        });
      } else {
        toast.error("Não foi possível gerar o briefing", {
          description: data.blocking_issues?.join("; "),
        });
      }
    },
    onError: (err) => {
      toast.error("Erro ao gerar briefing", { description: err.message });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({ projectId });
  };

  // Exportação para PDF via window.print()
  const handleExportPdf = () => {
    window.print();
  };

  // Determinar qual briefing exibir: o recém-gerado ou o existente no banco
  const activeBriefing = generatedBriefing?.briefing ?? null;
  const activeMetrics = generatedBriefing
    ? {
        coverage: generatedBriefing.coverage_percent ?? 0,
        consistency: generatedBriefing.consistency_score ?? 0,
        traceable: generatedBriefing.is_traceable ?? false,
      }
    : existingBriefing
    ? {
        coverage: Number(existingBriefing.coverage_percent ?? 0),
        consistency: Number(existingBriefing.consistency_score ?? 0),
        traceable: !existingBriefing.has_critical_conflicts,
      }
    : null;

  // Parsear seções do briefing existente (armazenadas como colunas JSON separadas)
  const parsedExistingBriefing: BriefingData | null = existingBriefing
    ? {
        identificacao: parseJson(existingBriefing.section_identificacao),
        escopo: parseJson(existingBriefing.section_escopo),
        resumo_executivo: parseJson(existingBriefing.section_resumo_executivo),
        perfil_regulatorio: parseJson(existingBriefing.section_perfil_regulatorio),
        gaps: parseJson(existingBriefing.section_gaps),
        riscos: parseJson(existingBriefing.section_riscos),
        plano_acao: parseJson(existingBriefing.section_plano_acao),
        proximos_passos: parseJson(existingBriefing.section_proximos_passos),
      }
    : null;

  const displayBriefing: BriefingData | null = activeBriefing ?? parsedExistingBriefing;
  const hasExistingBriefing = !!existingBriefing;
  const isGenerating = generateMutation.isPending;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Header — oculto na impressão */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href={`/projetos/${projectId}/compliance-v3`}>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            <div>
              <h1 className="text-lg font-semibold leading-none">Briefing Executivo</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Projeto #{projectId} — Engine B7
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasExistingBriefing && (
            <Badge variant="outline" className="text-xs gap-1 text-emerald-700 border-emerald-300 bg-emerald-50">
              <CheckCircle2 className="h-3 w-3" />
              Briefing disponível
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExportPdf}
            disabled={!displayBriefing}
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : hasExistingBriefing ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerar
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Briefing
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6" ref={printRef}>

        {/* Estado: carregando briefing existente */}
        {isLoadingExisting && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {/* Estado: gerando */}
        {isGenerating && (
          <Card className="border-violet-200 bg-violet-50/50">
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-violet-600 animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-violet-700">Gerando Briefing Executivo...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analisando requisitos, gaps, riscos e ações do projeto.
                  <br />
                  Isso pode levar alguns segundos.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado: erro de blocking issues */}
        {!isGenerating && generatedBriefing && !generatedBriefing.success && (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Briefing bloqueado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                O briefing não pôde ser gerado porque os seguintes problemas foram detectados:
              </p>
              <ul className="space-y-1">
                {generatedBriefing.blocking_issues?.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                Complete o questionário e a análise de gaps antes de gerar o briefing.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Estado: sem briefing ainda */}
        {!isLoadingExisting && !isGenerating && !displayBriefing && (
          <Card className="border-dashed border-2 border-muted-foreground/25">
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-semibold text-lg">Nenhum briefing gerado</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Clique em <strong>Gerar Briefing</strong> para criar o relatório executivo
                  completo com as 8 seções baseadas nos dados de compliance deste projeto.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
                <Info className="h-3.5 w-3.5 shrink-0" />
                O projeto deve ter gaps, riscos e ações registrados para gerar o briefing.
              </div>
              <Button
                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleGenerate}
              >
                <Sparkles className="h-4 w-4" />
                Gerar Briefing Agora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Briefing disponível */}
        {!isGenerating && displayBriefing && (
          <>
            {/* Métricas de qualidade */}
            {activeMetrics && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Qualidade do Briefing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BriefingMetrics
                    coverage={activeMetrics.coverage}
                    consistency={activeMetrics.consistency}
                    traceable={activeMetrics.traceable}
                  />
                </CardContent>
              </Card>
            )}

            {/* Cabeçalho do briefing para impressão */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-bold">Briefing Executivo — Reforma Tributária</h1>
              <p className="text-sm text-muted-foreground">Projeto #{projectId} | Gerado por IA SOLARIS — Engine B7</p>
              <Separator className="mt-3" />
            </div>

            {/* 8 Seções */}
            <div className="space-y-4">
              {SECTIONS.map((section) => (
                <SectionCard
                  key={section.key}
                  sectionConfig={section}
                  data={displayBriefing[section.key as keyof BriefingData] as Record<string, unknown> | undefined}
                />
              ))}
            </div>

            {/* Rodapé de rastreabilidade */}
            <Card className="border-muted bg-muted/30 print:hidden">
              <CardContent className="py-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Briefing gerado pelo Engine B7 (Sprint 98% Confidence). Todas as afirmações são
                rastreáveis à cadeia REQ→Q→GAP→RISCO→AÇÃO. Coverage 100% obrigatório para geração.
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* CSS de impressão */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          body { font-size: 12px; }
          .max-w-5xl { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Utilitário ──────────────────────────────────────────────────────────────

function parseJson(val: unknown): Record<string, unknown> | undefined {
  if (!val) return undefined;
  if (typeof val === "object") return val as Record<string, unknown>;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return { text: val };
    }
  }
  return undefined;
}
