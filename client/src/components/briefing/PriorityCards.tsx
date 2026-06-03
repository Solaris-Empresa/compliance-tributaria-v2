// PriorityCards.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2)
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §3. Fonte: result.data.top_3_acoes[] ({acao, justificativa, prazo}).
// testid: priority-card-{i} (despacho DEFINITIVO PR-2).
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  BriefingAdapterResult,
  BriefingAcao,
} from "@/lib/briefingAdapter";

const PRAZO_LABEL: Record<BriefingAcao["prazo"], string> = {
  imediato: "Imediato",
  curto_prazo: "Curto Prazo",
  medio_prazo: "Médio Prazo",
};

export function PriorityCards({ result }: { result: BriefingAdapterResult }) {
  if (result.mode === "legacy") return null;
  const acoes = result.data.top_3_acoes;
  if (acoes.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Top 3 Prioridades</h3>
      {acoes.map((a, i) => (
        <Card
          key={i}
          data-testid={`priority-card-${i}`}
          className="border-primary/20"
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm leading-snug">{a.acao}</CardTitle>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {PRAZO_LABEL[a.prazo]}
              </Badge>
            </div>
          </CardHeader>
          {a.justificativa && (
            <CardContent className="pt-0 text-xs text-muted-foreground">
              {a.justificativa}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
