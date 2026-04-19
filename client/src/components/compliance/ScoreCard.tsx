// ScoreCard.tsx — Sprint Z-22 CPIE v3 (#725)
// Card principal (hero) com a Exposicao ao Risco de Compliance.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Info, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Nivel = "critico" | "alto" | "medio" | "baixo";

const NIVEL_LABELS: Record<Nivel, string> = {
  critico: "CRÍTICO",
  alto: "ALTO",
  medio: "MÉDIO",
  baixo: "BAIXO",
};

const NIVEL_BADGE_CLASS: Record<Nivel, string> = {
  critico: "bg-red-600 text-white hover:bg-red-700",
  alto: "bg-orange-500 text-white hover:bg-orange-600",
  medio: "bg-amber-500 text-white hover:bg-amber-600",
  baixo: "bg-emerald-500 text-white hover:bg-emerald-600",
};

export interface ComplianceBreakdown {
  total_riscos_aprovados: number;
  total_alta: number;
  total_media: number;
  total_oportunidade: number;
}

export interface ScoreCardProps {
  score: number | null;
  nivel: Nivel | null;
  breakdown?: ComplianceBreakdown;
  emptyState?: boolean;
  onFormulaClick?: () => void;
}

export function ScoreCard({
  score,
  nivel,
  breakdown,
  emptyState,
  onFormulaClick,
}: ScoreCardProps) {
  if (emptyState) {
    return (
      <Card
        data-testid="score-card-compliance"
        className="border-2 border-dashed"
      >
        <CardContent className="py-10 text-center">
          <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p
            data-testid="state-no-approved-risks"
            className="text-base font-medium text-muted-foreground"
          >
            Nenhum risco aprovado ainda
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            A Exposição ao Risco de Compliance é calculada após a aprovação de
            pelo menos um risco.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="score-card-compliance" className="border-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Shield className="h-4 w-4" />
          Exposição ao Risco de Compliance
        </CardTitle>
        {onFormulaClick && (
          <Button
            data-testid="btn-formula-modal"
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={onFormulaClick}
          >
            <Info className="h-4 w-4" />
            <span className="text-xs">Ver fórmula</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <span
            data-testid="score-valor-principal"
            className="text-6xl font-bold tracking-tight"
          >
            {score ?? 0}
          </span>
          <span className="text-2xl text-muted-foreground">/ 100</span>
          {nivel && (
            <Badge
              data-testid="score-nivel-principal"
              className={cn("ml-2 text-xs", NIVEL_BADGE_CLASS[nivel])}
            >
              {NIVEL_LABELS[nivel]}
            </Badge>
          )}
        </div>
        {breakdown && (
          <p
            data-testid="score-breakdown-principal"
            className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {breakdown.total_riscos_aprovados} aprovados
            </span>
            <span>·</span>
            <span>{breakdown.total_alta} alta</span>
            <span>·</span>
            <span>{breakdown.total_media} média</span>
            <span>·</span>
            <span>{breakdown.total_oportunidade} oportunidade</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
