// MethodSection.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2) · tab "Metodologia"
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §7. Fonte: briefingContent (markdown) via <Streamdown>.
// testid: briefing-method-section.
import { Streamdown } from "@/components/MarkdownRenderer";

export function MethodSection({ content }: { content: string }) {
  return (
    <section
      data-testid="briefing-method-section"
      className="prose prose-sm max-w-none"
    >
      <h3 className="text-sm font-semibold">Como calculamos a Confiança</h3>
      {content && content.trim() ? (
        <Streamdown>{content}</Streamdown>
      ) : (
        <p className="text-xs text-muted-foreground">
          Metodologia indisponível para este diagnóstico.
        </p>
      )}
    </section>
  );
}
