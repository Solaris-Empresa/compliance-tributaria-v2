// ComplianceDashboard.tsx — Sprint Z-22 CPIE v3 (#725)
// Rota: /projetos/:projectId/compliance-dashboard
// Dashboard on-demand: usuario clica "Gerar Dashboard" → 3 scores renderizam.
// Zero persistencia nova. Zero LLM. Zero scheduler.

import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronLeft,
  ShieldCheck,
  RefreshCw,
  Download,
  AlertTriangle,
  Info,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ScoreCard } from "@/components/compliance/ScoreCard";
import { AuxiliaryScoresRow } from "@/components/compliance/AuxiliaryScoresRow";
import { ScoreFormulaModal } from "@/components/compliance/ScoreFormulaModal";
import { computeProfileQuality } from "@/lib/compute-profile-quality";
import { generateDiagnosticoPDF } from "@/lib/generateDiagnosticoPDF";
import { toast } from "sonner";

export default function ComplianceDashboard() {
  const [, params] = useRoute("/projetos/:projectId/compliance-dashboard");
  const projectId = parseInt(params?.projectId ?? "0", 10);

  const [formulaOpen, setFormulaOpen] = useState(false);

  const projectQuery = trpc.fluxoV3.getProjectStep1.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const scoresQuery = trpc.compliance.computeScores.useQuery(
    { projectId },
    { enabled: false } // disparo on-demand pelo botao
  );

  if (!projectId) {
    return (
      <div className="container max-w-4xl py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Projeto não identificado na URL.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const project = projectQuery.data;
  const operationProfile = (project as any)?.operationProfile ?? null;
  const profile = computeProfileQuality(operationProfile);

  const scores = scoresQuery.data;
  const isLoading = scoresQuery.isFetching;
  const hasError = scoresQuery.isError;

  const complianceBlock = scores?.compliance;
  const executionBlock = scores?.execution;

  const complianceEmpty =
    complianceBlock && "state" in complianceBlock &&
    complianceBlock.state === "no_approved_risks";
  const executionEmpty =
    executionBlock && "state" in executionBlock &&
    executionBlock.state === "no_plans_yet";

  const handleGenerate = () => {
    void scoresQuery.refetch();
  };

  const handleExportPdf = () => {
    if (!scores || complianceEmpty) {
      toast.warning("Gere o dashboard antes de exportar o PDF.");
      return;
    }
    try {
      const compliance = complianceBlock as Exclude<
        typeof complianceBlock,
        { state: string } | undefined
      >;
      // PR #1 exporta PDF minimalista (so os 3 scores).
      // PR #2 vai enriquecer com risks/plans detalhados.
      generateDiagnosticoPDF({
        empresa: project?.name ?? `Projeto #${projectId}`,
        score: compliance.score,
        nivel: compliance.nivel,
        totalAlta: compliance.total_alta,
        totalMedia: compliance.total_media,
        risks: [],
        opportunities: [],
        plans: [],
      });
      toast.success("PDF gerado com sucesso.");
    } catch (err) {
      toast.error(
        "Falha ao gerar PDF: " + (err instanceof Error ? err.message : "erro desconhecido")
      );
    }
  };

  return (
    <div
      data-testid="compliance-dashboard-page"
      className="container max-w-5xl space-y-6 py-6"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href={`/projetos/${projectId}`}>
          <Button
            data-testid="btn-voltar-projeto"
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Projeto
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Dashboard de Compliance
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard de Compliance
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulta on-demand dos 3 scores do projeto.{" "}
            {project?.name && (
              <span className="text-foreground">· {project.name}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="btn-gerar-dashboard"
            onClick={handleGenerate}
            disabled={isLoading}
            className="gap-1"
          >
            <RefreshCw
              className={"h-4 w-4" + (isLoading ? " animate-spin" : "")}
            />
            {scores ? "Recalcular" : "Gerar Dashboard"}
          </Button>
          <Button
            data-testid="btn-exportar-pdf-compliance"
            variant="outline"
            onClick={handleExportPdf}
            disabled={!scores || !!complianceEmpty}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Banner — propósito do dashboard */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Esta visão é <strong>on-demand</strong> e efêmera — mostra o estado
          atual do projeto. Para o <strong>entregável formal ao cliente</strong>{" "}
          (com snapshot e base legal), use a Consolidação (Step 7).
        </AlertDescription>
      </Alert>

      {/* Loading */}
      {isLoading && !scores && (
        <div
          data-testid="loading-dashboard-skeleton"
          className="grid gap-4 md:grid-cols-2"
        >
          <Card className="animate-pulse">
            <CardContent className="h-36 py-6" />
          </Card>
          <Card className="animate-pulse">
            <CardContent className="h-36 py-6" />
          </Card>
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <Alert variant="destructive" data-testid="error-dashboard-fallback">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Falha ao calcular o dashboard. Tente novamente ou verifique o
            projeto.
          </AlertDescription>
        </Alert>
      )}

      {/* Scores */}
      {scores && !hasError && (
        <div className="space-y-4">
          <ScoreCard
            score={
              complianceEmpty
                ? null
                : (complianceBlock as { score: number }).score
            }
            nivel={
              complianceEmpty
                ? null
                : (complianceBlock as { nivel: any }).nivel
            }
            breakdown={
              complianceEmpty
                ? undefined
                : {
                    total_riscos_aprovados:
                      (complianceBlock as any).total_riscos_aprovados,
                    total_alta: (complianceBlock as any).total_alta,
                    total_media: (complianceBlock as any).total_media,
                    total_oportunidade:
                      (complianceBlock as any).total_oportunidade,
                  }
            }
            emptyState={!!complianceEmpty}
            onFormulaClick={() => setFormulaOpen(true)}
          />
          <AuxiliaryScoresRow
            execution={
              executionEmpty
                ? null
                : (executionBlock as {
                    percent: number;
                    plans: { approved: number; total: number };
                    tasks: { done: number; total: number };
                  })
            }
            executionEmpty={!!executionEmpty}
            profile={profile}
          />
          <p className="text-xs text-muted-foreground">
            Calculado em{" "}
            {new Date(scores.computed_at).toLocaleString("pt-BR")} · Fórmula{" "}
            {scores.formula_version}
          </p>
        </div>
      )}

      {/* Estado inicial: nada clicado ainda */}
      {!scores && !isLoading && !hasError && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-base font-medium">
              Clique em "Gerar Dashboard" para ver os 3 scores
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              O cálculo é determinístico e on-demand — sem persistência.
            </p>
          </CardContent>
        </Card>
      )}

      <ScoreFormulaModal
        open={formulaOpen}
        onClose={() => setFormulaOpen(false)}
      />
    </div>
  );
}
