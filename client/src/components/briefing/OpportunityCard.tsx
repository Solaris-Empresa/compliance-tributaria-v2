// OpportunityCard.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2) · tab "Oportunidades"
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §4. Fonte: result.data.oportunidades[] (string[]).
// Vazio → "Nenhuma oportunidade identificada". testid: briefing-opportunity-{i}.
import { Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BriefingAdapterResult } from "@/lib/briefingAdapter";

export function OpportunityCard({ result }: { result: BriefingAdapterResult }) {
  if (result.mode === "legacy") return null;
  const oportunidades = result.data.oportunidades;

  if (oportunidades.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhuma oportunidade identificada
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {oportunidades.map((o, i) => (
        <Card
          key={i}
          data-testid={`briefing-opportunity-${i}`}
          className="border-green-200"
        >
          <CardContent className="flex items-start gap-2 py-3 text-sm">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>{o}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
