// ImpactsSection.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2) · tab "Impactos"
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §6. D2: bloco FIXO (3 eixos) via <Streamdown> + âncora de nav.
// NÃO é parser regex e NÃO vem do JSON (server:6835-6843 define os 3 eixos). Conteúdo opcional sobrescreve.
import { Streamdown } from "@/components/MarkdownRenderer";

const IMPACTOS_FIXO = `### Impacto Financeiro
Mudança de carga tributária (IBS/CBS), créditos e fluxo de caixa no período de transição (2026–2033).

### Impacto Operacional
Adequação de sistemas, parametrização fiscal, emissão de documentos e rotinas de apuração.

### Impacto Jurídico
Revisão de contratos, obrigações acessórias e enquadramento conforme a LC 214/2025.`;

export function ImpactsSection({ content }: { content?: string }) {
  return (
    <section
      id="impactos"
      data-testid="briefing-impacts-section"
      className="prose prose-sm max-w-none scroll-mt-20"
    >
      <Streamdown>
        {content && content.trim() ? content : IMPACTOS_FIXO}
      </Streamdown>
    </section>
  );
}
