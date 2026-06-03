// GapCard.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2) · tab "Gaps"
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §2.
// Fonte: result.data.principais_gaps[]. Label por source_type via SOURCE_TYPE_LABELS (@shared — NÃO recriar).
// Badge alucinação (D1/Opção 0): gap._hallucination_detected === true → "⚠️ Verificar artigo citado".
// Campo de título = gap.gap (NÃO gap.titulo). source_reference já vem sem prefixo (strip no adapter).
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SOURCE_TYPE_LABELS } from "@shared/source-type-labels";
import type { BriefingAdapterResult, Urgencia } from "@/lib/briefingAdapter";

const URGENCIA_LABEL: Record<Urgencia, string> = {
  imediata: "Imediata",
  curto_prazo: "Curto Prazo",
  medio_prazo: "Médio Prazo",
};

const URGENCIA_TONE: Record<Urgencia, string> = {
  imediata: "bg-red-100 text-red-700 border-red-300",
  curto_prazo: "bg-orange-100 text-orange-700 border-orange-300",
  medio_prazo: "bg-blue-100 text-blue-700 border-blue-300",
};

export function GapCard({ result }: { result: BriefingAdapterResult }) {
  if (result.mode === "legacy") return null;
  const gaps = result.data.principais_gaps;

  return (
    <div className="space-y-3">
      {gaps.map((gap, i) => (
        <Card
          key={i}
          data-testid={`briefing-gap-card-${i}`}
          className="border-muted"
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm leading-snug">{gap.gap}</CardTitle>
              <Badge
                data-testid={`briefing-gap-urgencia-badge-${i}`}
                className={`shrink-0 border text-[10px] ${URGENCIA_TONE[gap.urgencia]}`}
              >
                {URGENCIA_LABEL[gap.urgencia]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {gap.causa_raiz && (
              <p>
                <span className="font-semibold">Causa raiz: </span>
                {gap.causa_raiz}
              </p>
            )}
            {gap.evidencia_regulatoria && (
              <p className="text-muted-foreground">
                {gap.evidencia_regulatoria}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Badge
                data-testid={`briefing-gap-source-badge-${i}`}
                variant="outline"
                className="text-[10px]"
              >
                {SOURCE_TYPE_LABELS[gap.source_type] ?? gap.source_type}
              </Badge>
              {gap.source_reference && (
                <span className="text-[10px] text-muted-foreground">
                  {gap.source_reference}
                </span>
              )}
              {gap._hallucination_detected && (
                <Badge
                  data-testid={`briefing-gap-hallucination-badge-${i}`}
                  className="border border-amber-300 bg-amber-100 text-[10px] text-amber-800"
                >
                  <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                  Verificar artigo citado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
