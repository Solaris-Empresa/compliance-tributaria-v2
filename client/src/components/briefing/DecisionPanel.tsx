// DecisionPanel.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2) · Zona 1 (sidebar fixa)
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §1.
// Fonte: result.data.confidence_score.nivel_confianca (number dentro de OBJECT) + nivel_risco_geral.
// Guard de modo: result.mode === "legacy" → null (adapter mergeado usa "split-view", não "structured").
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BriefingAdapterResult, NivelRisco } from "@/lib/briefingAdapter";

// C1 — 4 faixas de completude (NÃO as 3 faixas do ConfidenceBar, TK-1).
function faixaCompletude(n: number): { label: string; tone: string } {
  if (n < 50) return { label: "Crítico", tone: "text-red-600" };
  if (n < 80) return { label: "Parcial", tone: "text-orange-600" };
  if (n < 95) return { label: "Adequado", tone: "text-blue-600" };
  return { label: "Completo", tone: "text-green-600" };
}

const RISCO_LABEL: Record<NivelRisco, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

const RISCO_TONE: Record<NivelRisco, string> = {
  baixo: "bg-green-100 text-green-700 border-green-300",
  medio: "bg-yellow-100 text-yellow-700 border-yellow-300",
  alto: "bg-orange-100 text-orange-700 border-orange-300",
  critico: "bg-red-100 text-red-700 border-red-300",
};

export function DecisionPanel({ result }: { result: BriefingAdapterResult }) {
  if (result.mode === "legacy") return null;
  const d = result.data;
  const nivel = d.confidence_score.nivel_confianca;
  const faixa = faixaCompletude(nivel);

  return (
    <Card data-testid="decision-panel" className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          Grau de Completude do Diagnóstico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gauge de completude (C1 — 4 faixas) */}
        <div data-testid="decision-panel-gauge" className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold">{nivel}%</span>
            <span
              data-testid="decision-panel-faixa"
              className={`text-sm font-semibold ${faixa.tone}`}
            >
              {faixa.label}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(0, Math.min(100, nivel))}%` }}
            />
          </div>
        </div>

        {/* Alerta visual < 80 (C1; ≠ gate de aprovação < 85, D5) */}
        {nivel < 80 && (
          <div
            data-testid="decision-panel-alerta"
            className="flex items-center gap-2 rounded-md border border-orange-300 bg-orange-50 px-2 py-1.5 text-xs text-orange-700"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Alerta: completude abaixo de 80%
          </div>
        )}

        {/* Badge de risco — "Nível de Exposição" (não "Nível de Risco") */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Nível de Exposição</p>
          <Badge
            data-testid="decision-panel-risco-badge"
            className={`border ${RISCO_TONE[d.nivel_risco_geral]}`}
          >
            {RISCO_LABEL[d.nivel_risco_geral]}
          </Badge>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-2 gap-2 text-center">
          {[
            { label: "Gaps", value: d.principais_gaps.length },
            { label: "Oportunidades", value: d.oportunidades.length },
            { label: "Ações", value: d.top_3_acoes.length },
            { label: "Inconsistências", value: d.inconsistencias.length },
          ].map(c => (
            <div key={c.label} className="rounded-md bg-muted/50 py-1.5">
              <div className="text-lg font-bold">{c.value}</div>
              <div className="text-[10px] text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Resumo executivo */}
        {d.resumo_executivo && (
          <p
            data-testid="decision-panel-resumo"
            className="text-xs leading-relaxed text-muted-foreground"
          >
            {d.resumo_executivo}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
