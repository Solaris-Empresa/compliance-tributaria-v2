import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

/**
 * MarkdownRenderer — substituto leve do Streamdown (sem shiki/grammars pesados).
 * Usa react-markdown + remark-gfm para renderizar Markdown com suporte a tabelas,
 * listas de tarefas, strikethrough e links.
 */
export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-headings:font-semibold prose-headings:text-foreground",
        "prose-p:text-foreground prose-p:leading-relaxed",
        "prose-li:text-foreground",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs",
        "prose-pre:bg-muted prose-pre:text-foreground prose-pre:rounded-md prose-pre:p-3",
        "prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:text-muted-foreground",
        "prose-a:text-primary prose-a:underline",
        "prose-table:text-sm prose-th:text-foreground prose-td:text-foreground",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

// Alias para compatibilidade com imports existentes de Streamdown
export const Streamdown = MarkdownRenderer;
