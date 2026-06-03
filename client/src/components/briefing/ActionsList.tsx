// ActionsList.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2) · tab "Ações Prioritárias"
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §5.
// Fonte: result.data.recomendacoes_prioritarias[] (NÃO "recomendacoes"). testid: briefing-action-{i}.
import { ListChecks } from "lucide-react";
import type { BriefingAdapterResult } from "@/lib/briefingAdapter";

export function ActionsList({ result }: { result: BriefingAdapterResult }) {
  if (result.mode === "legacy") return null;
  const recomendacoes = result.data.recomendacoes_prioritarias;

  if (recomendacoes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhuma ação prioritária identificada
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {recomendacoes.map((r, i) => (
        <li
          key={i}
          data-testid={`briefing-action-${i}`}
          className="flex items-start gap-2 rounded-md border border-muted px-3 py-2 text-sm"
        >
          <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
}
