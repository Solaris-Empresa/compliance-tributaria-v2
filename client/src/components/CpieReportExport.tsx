/**
 * CpieReportExport.tsx
 * Sprint H — Issue H3
 *
 * Botão de exportação do relatório CPIE em PDF.
 * Usa a procedure cpie.generateReport para obter o HTML do relatório,
 * depois abre em nova aba para impressão/download via window.print().
 */
import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CpieReportExportProps {
  projectId: number;
  projectName: string;
  /** Variante visual do botão */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Tamanho do botão */
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function CpieReportExport({
  projectId,
  projectName,
  variant = "outline",
  size = "sm",
  className,
}: CpieReportExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = trpc.cpie.generateReport.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      // Abrir o HTML em nova aba para impressão/download
      const blob = new Blob([data.html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        // Aguardar o carregamento e acionar o diálogo de impressão
        win.addEventListener("load", () => {
          setTimeout(() => {
            win.print();
          }, 500);
        });
        // Limpar a URL do blob após uso
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      } else {
        // Fallback: download direto
        const a = document.createElement("a");
        a.href = url;
        a.download = `relatorio-cpie-${projectName.replace(/\s+/g, "-").toLowerCase()}.html`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5_000);
      }
      toast.success("Relatório gerado! Use Ctrl+P para salvar como PDF.");
    },
    onError: (err) => {
      setIsGenerating(false);
      toast.error(`Erro ao gerar relatório: ${err.message}`);
    },
  });

  const handleExport = () => {
    if (isGenerating || generateReport.isPending) return;
    setIsGenerating(true);
    generateReport.mutate({ projectId, projectName });
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleExport}
      disabled={isGenerating || generateReport.isPending}
    >
      {isGenerating || generateReport.isPending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Gerando...</span>
        </>
      ) : (
        <>
          <FileDown className="h-3.5 w-3.5" />
          <span>Exportar PDF</span>
        </>
      )}
    </Button>
  );
}
