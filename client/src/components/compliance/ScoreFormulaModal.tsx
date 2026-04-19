// ScoreFormulaModal.tsx — Sprint Z-22 CPIE v3 (#725)
// Modal com breakdown da formula deterministica do Score de Compliance.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ScoreFormulaModalProps {
  open: boolean;
  onClose: () => void;
}

export function ScoreFormulaModal({ open, onClose }: ScoreFormulaModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        data-testid="formula-modal"
        className="sm:max-w-[560px]"
      >
        <DialogHeader>
          <DialogTitle>Como o Score de Compliance é calculado</DialogTitle>
          <DialogDescription>
            Fórmula determinística. Mesma entrada, mesmo resultado — sempre.
            Nenhum LLM é usado no cálculo.
          </DialogDescription>
        </DialogHeader>

        <div
          data-testid="formula-modal-breakdown"
          className="space-y-4 py-4 text-sm"
        >
          <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs">
            score = round( Σ(peso × max(confidence, 0.5)) / (n × 9) × 100 )
          </div>

          <div>
            <p className="mb-2 font-medium">Pesos por severidade</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>· Alta: <span className="font-mono">7</span></li>
              <li>· Média: <span className="font-mono">5</span></li>
              <li>· Oportunidade: <span className="font-mono">1</span> (fora do denominador)</li>
            </ul>
          </div>

          <div>
            <p className="mb-2 font-medium">Regras invioláveis</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>· Apenas riscos <strong>aprovados</strong> entram no cálculo</li>
              <li>· Oportunidades entram como informação, não no denominador</li>
              <li>· Confidence mínima aplicada = 0.5 (piso)</li>
              <li>· Peso máximo = 9 (score ≤ 78 na prática)</li>
            </ul>
          </div>

          <div>
            <p className="mb-2 font-medium">Classificação</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>· ≥ 75: <strong>Crítico</strong></li>
              <li>· 50–74: <strong>Alto</strong></li>
              <li>· 25–49: <strong>Médio</strong></li>
              <li>· &lt; 25: <strong>Baixo</strong></li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            data-testid="formula-modal-close"
            variant="default"
            onClick={onClose}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
