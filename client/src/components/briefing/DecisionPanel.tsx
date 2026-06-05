// DecisionPanel.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2) · Zona 1 (sidebar fixa)
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §1.
// Fonte: result.data.confidence_score.nivel_confianca (number dentro de OBJECT) + nivel_risco_geral.
// Guard de modo: result.mode === "legacy" → null (adapter mergeado usa "split-view", não "structured").
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BriefingAdapterResult, NivelRisco } from "@/lib/briefingAdapter";

// CALC-4 (#1383) — 5 faixas unificadas de completude, thresholds 0/50/70/85/95.
// Mesmas faixas/labels do ConfidenceBar (getConfidenceConfig) — fonte única.
// "Em construção" (70-84) é orientativo, não punitivo. Verde (>=85) = aprovação direta.
export function faixaCompletude(n: number): { label: string; tone: string } {
  if (n < 50) return { label: "Insuficiente", tone: "text-red-600" };
  if (n < 70) return { label: "Parcial", tone: "text-orange-600" };
  if (n < 85) return { label: "Em construção", tone: "text-yellow-600" };
  if (n < 95) return { label: "Confiável", tone: "text-green-600" };
  return { label: "Pleno", tone: "text-green-800" };
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
          Completude do Diagnóstico
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

        {/* CALC-4 (#1383): aviso orientativo < 85 (unificado com o gate de
            aprovação e o badge do Split View; antes era < 80, threshold órfão). */}
        {nivel < 85 && (
          <div
            data-testid="decision-panel-alerta"
            className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-700"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Diagnóstico em construção: completude abaixo de 85%
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
