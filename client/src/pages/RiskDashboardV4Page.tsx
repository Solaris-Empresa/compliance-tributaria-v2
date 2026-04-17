/**
 * RiskDashboardV4Page.tsx — Sprint Z-07 PR #C
 *
 * Wrapper de página para o componente RiskDashboardV4.
 * Rota: /projetos/:projectId/risk-dashboard-v4
 *
 * Arquivo novo — não altera nenhum arquivo existente (ADR-0022).
 */

import { useRoute } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import RiskDashboardV4 from "@/components/RiskDashboardV4";

export default function RiskDashboardV4Page() {
  const [, params] = useRoute("/projetos/:projectId/risk-dashboard-v4");
  const projectId = parseInt(params?.projectId ?? "0", 10);

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

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href={`/projetos/${projectId}`}>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Projeto
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-red-500" />
          Análise de Riscos v4
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Análise de Riscos — v4</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Engine determinístico · 10 categorias LC 214/2025 · Sprint Z-07
          </p>
        </div>
        {/* Sprint Z-17 #668: botão "Ver Planos" movido para RiskDashboardV4 (condicional) */}
      </div>

      {/* Dashboard */}
      <RiskDashboardV4 projectId={projectId} />
    </div>
  );
}
