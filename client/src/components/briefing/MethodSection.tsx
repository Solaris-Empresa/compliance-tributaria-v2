// MethodSection.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2) · tab "Metodologia"
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §7. Fonte: briefingContent (markdown) via <Streamdown>.
// testid: briefing-method-section.
// PDF-1-FIX-2 (P.O. 12/06/2026): recorta só as subseções de metodologia pura
// (extractMethodologySection) — evita duplicar gaps/opp/ações que já são cards no Split View.
import { Streamdown } from "@/components/MarkdownRenderer";
import { extractMethodologySection } from "@/lib/briefingPdfStructured";

export function MethodSection({ content }: { content: string }) {
  const methodology = extractMethodologySection(content);
  return (
    <section
      data-testid="briefing-method-section"
      className="prose prose-sm max-w-none"
    >
      {methodology ? (
        <Streamdown>{methodology}</Streamdown>
      ) : (
        <p className="text-xs text-muted-foreground">
          Metodologia indisponível para este diagnóstico.
        </p>
      )}
    </section>
  );
}
