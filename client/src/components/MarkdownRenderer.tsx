/**
 * MarkdownRenderer — substituto leve do streamdown
 * Usa react-markdown + remark-gfm para renderizar Markdown com suporte a GFM.
 * Sprint Z-21: streamdown removido (13MB → economizado no bundle).
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

/** Alias para compatibilidade com usos de <Streamdown> */
export const Streamdown = MarkdownRenderer;
