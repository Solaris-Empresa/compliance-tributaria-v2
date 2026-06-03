// ActionBar.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2)
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §9. Superior + inferior sticky.
// Handlers são MOVIDOS (não reescritos) no PR-3 — aqui são props (callbacks opcionais).
// data-testid PRESERVADOS (z17): btn-regenerar-briefing · btn-compartilhar-resumo.
import {
  RefreshCw,
  Pencil,
  Info,
  Share2,
  StickyNote,
  History,
  FileDown,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ActionBarProps {
  onRegenerate?: () => void;
  onCorrect?: () => void;
  onMoreInfo?: () => void;
  onShare?: () => void;
  onAnnotations?: () => void;
  onHistory?: () => void;
  onExportPdf?: () => void;
  onApprove?: () => void;
  canApprove?: boolean;
  isApproving?: boolean;
  approveDisabledReason?: string;
  historyCount?: number;
}

export function ActionBar({
  onRegenerate,
  onCorrect,
  onMoreInfo,
  onShare,
  onAnnotations,
  onHistory,
  onExportPdf,
  onApprove,
  canApprove = true,
  isApproving = false,
  approveDisabledReason = "Resolva as pendências antes de aprovar",
  historyCount = 0,
}: ActionBarProps) {
  return (
    <TooltipProvider>
      {/* Zona 0 — superior */}
      <div
        data-testid="briefing-action-bar-top"
        className="flex flex-wrap items-center gap-2"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="btn-regenerar-briefing"
          onClick={onRegenerate}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Regenerar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="btn-corrigir-briefing"
          onClick={onCorrect}
        >
          <Pencil className="mr-1.5 h-4 w-4" />
          Corrigir
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="btn-mais-info-briefing"
          onClick={onMoreInfo}
        >
          <Info className="mr-1.5 h-4 w-4" />
          Mais Informações
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="btn-compartilhar-resumo"
          onClick={onShare}
        >
          <Share2 className="mr-1.5 h-4 w-4" />
          Compartilhar Resumo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="btn-anotacoes-briefing"
          onClick={onAnnotations}
        >
          <StickyNote className="mr-1.5 h-4 w-4" />
          Anotações
        </Button>
      </div>

      {/* Zona 3 — inferior sticky */}
      <div
        data-testid="briefing-action-bar-bottom"
        className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t bg-background/95 py-2 backdrop-blur"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="btn-historico-briefing"
          onClick={onHistory}
        >
          <History className="mr-1.5 h-4 w-4" />
          Histórico ({historyCount})
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="btn-exportar-pdf-briefing"
          onClick={onExportPdf}
        >
          <FileDown className="mr-1.5 h-4 w-4" />
          Exportar PDF
        </Button>
        {/* Botão desabilitado embrulhado em Tooltip (regra frontend / Radix) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={canApprove ? -1 : 0}>
              <Button
                type="button"
                size="sm"
                data-testid="btn-aprovar-briefing"
                disabled={!canApprove || isApproving}
                onClick={onApprove}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                {isApproving ? "Aprovando..." : "Aprovar Briefing"}
              </Button>
            </span>
          </TooltipTrigger>
          {!canApprove && (
            <TooltipContent>{approveDisabledReason}</TooltipContent>
          )}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
