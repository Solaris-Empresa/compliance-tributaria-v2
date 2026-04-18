/**
 * MarkdownRenderer — substituto leve do Streamdown (Sprint Z-21 bundle-opt)
 * Usa react-markdown + remark-gfm sem shiki/codemirror.
 * Elimina ~10MB de grammars de linguagens do bundle de produção.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  children?: string | null;
  className?: string;
}

export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  if (!children) return null;
  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

// Alias para compatibilidade com código existente que usa <Streamdown>
export const Streamdown = MarkdownRenderer;
