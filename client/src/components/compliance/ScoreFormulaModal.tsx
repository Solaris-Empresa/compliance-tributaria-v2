// ScoreFormulaModal.tsx — Sprint Z-22 CPIE v3 (#725) + hotfix transparencia (#733)
// Modal explicando a Exposicao ao Risco de Compliance em linguagem compreensivel por advogado.
// Mantem secao tecnica ao final para auditoria.

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

type Nivel = "critico" | "alto" | "medio" | "baixo";

export interface ScoreBreakdown {
  score: number;
  nivel: Nivel;
  total_riscos_aprovados: number;
  total_alta: number;
  total_media: number;
  total_oportunidade: number;
  computed_at?: string;
}

export interface ScoreFormulaModalProps {
  open: boolean;
  onClose: () => void;
  breakdown?: ScoreBreakdown;
}

const NIVEL_DESCRICAO: Record<Nivel, { label: string; significado: string }> = {
  critico: {
    label: "CRÍTICO",
    significado: "Exposição severa. Ação imediata e priorizada necessária.",
  },
  alto: {
    label: "ALTO",
    significado: "Exposição significativa. Execute o plano aprovado como prioridade.",
  },
  medio: {
    label: "MÉDIO",
    significado: "Atenção recomendada. Acompanhe o plano de mitigação.",
  },
  baixo: {
    label: "BAIXO",
    significado: "Exposição mínima. Monitore conforme calendário regulatório.",
  },
};

export function ScoreFormulaModal({
  open,
  onClose,
  breakdown,
}: ScoreFormulaModalProps) {
  const [technicalOpen, setTechnicalOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        data-testid="formula-modal"
        className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]"
      >
        <DialogHeader>
          <DialogTitle>Como a Exposição ao Risco de Compliance é calculada</DialogTitle>
          <DialogDescription>
            O número de 0 a 100 mede a exposição tributária identificada.{" "}
            <strong>Quanto maior, mais risco a empresa carrega hoje.</strong>
          </DialogDescription>
        </DialogHeader>

        <div
          data-testid="formula-modal-breakdown"
          className="space-y-5 py-2 text-sm"
        >
          {/* Seu projeto (apenas quando houver breakdown real) */}
          {breakdown && breakdown.total_riscos_aprovados > 0 && (
            <section className="rounded-md border bg-muted/30 p-4">
              <p className="mb-2 font-medium">No seu projeto</p>
              <p className="mb-2 text-base">
                Score atual:{" "}
                <span className="text-2xl font-bold">{breakdown.score}</span>
                <span className="ml-2 text-muted-foreground">/ 100</span>
                <span className="ml-3 rounded bg-foreground/10 px-2 py-0.5 text-xs font-semibold">
                  {NIVEL_DESCRICAO[breakdown.nivel].label}
                </span>
              </p>
              <p className="mb-3 text-muted-foreground">
                {NIVEL_DESCRICAO[breakdown.nivel].significado}
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <strong>
                    {breakdown.total_riscos_aprovados} risco
                    {breakdown.total_riscos_aprovados !== 1 ? "s" : ""} aprovado
                    {breakdown.total_riscos_aprovados !== 1 ? "s" : ""}
                  </strong>{" "}
                  pela equipe jurídica
                </li>
                <li>· {breakdown.total_alta} de alta severidade (peso 7 cada)</li>
                <li>
                  · {breakdown.total_media} de média severidade (peso 5 cada)
                </li>
                <li>
                  · {breakdown.total_oportunidade} oportunidade
                  {breakdown.total_oportunidade !== 1 ? "s" : ""} (informativas
                  — não entram no denominador)
                </li>
              </ul>
              {breakdown.computed_at && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Calculado em{" "}
                  {new Date(breakdown.computed_at).toLocaleString("pt-BR")}
                </p>
              )}
            </section>
          )}

          {/* Explicação narrativa */}
          <section>
            <p className="mb-2 font-medium">Como chegamos ao número</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                Cada risco aprovado recebe um <strong>peso</strong> conforme a
                severidade (alta = 7 · média = 5 · oportunidade = 1, fora do
                cálculo)
              </li>
              <li>
                Cada risco recebe uma <strong>confiança</strong> (quão alinhado
                à norma vigente está — considera-se no mínimo 50% para não
                subestimar o risco)
              </li>
              <li>
                Somam-se os pontos <em>peso × confiança</em> de todos os riscos
                aprovados
              </li>
              <li>
                Compara-se com o máximo teórico possível (se todos os riscos
                fossem da severidade mais alta)
              </li>
              <li>Resultado em percentual de 0 a 100</li>
            </ol>
          </section>

          {/* Classificação */}
          <section>
            <p className="mb-2 font-medium">Classificação</p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-1 text-left font-medium">Score</th>
                  <th className="py-1 text-left font-medium">Nível</th>
                  <th className="py-1 text-left font-medium">Significado</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-1">0 – 24</td>
                  <td className="py-1 font-semibold text-emerald-600">
                    Baixo
                  </td>
                  <td className="py-1">Exposição mínima</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1">25 – 49</td>
                  <td className="py-1 font-semibold text-amber-600">Médio</td>
                  <td className="py-1">Atenção recomendada</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1">50 – 74</td>
                  <td className="py-1 font-semibold text-orange-600">Alto</td>
                  <td className="py-1">Ação prioritária</td>
                </tr>
                <tr>
                  <td className="py-1">75 – 100</td>
                  <td className="py-1 font-semibold text-red-600">Crítico</td>
                  <td className="py-1">Exposição severa</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Base legal */}
          <section className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">
              Base técnica e jurídica
            </p>
            <ul className="space-y-0.5">
              <li>
                · Fórmula determinística — mesma entrada produz o mesmo
                resultado, sempre
              </li>
              <li>
                · Nenhum modelo de IA (LLM) é usado no cálculo — apenas regras
                fixas
              </li>
              <li>
                · Normativas de referência: LC 214/2025 + regulamento + súmulas
                CGIBS 1–8
              </li>
              <li>· Auditoria: snapshot persistido na Consolidação (Step 7)</li>
            </ul>
          </section>

          {/* Técnico (colapsável) */}
          <section>
            <button
              type="button"
              onClick={() => setTechnicalOpen((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {technicalOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Ver fórmula técnica (para auditoria)
            </button>
            {technicalOpen && (
              <div
                data-testid="formula-modal-technical"
                className="mt-2 space-y-2"
              >
                <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs">
                  score = round( Σ(peso × max(confiança, 0,5)) / (n × 9) × 100 )
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>
                    · <strong>n</strong> = número de riscos aprovados
                    pontuáveis (exclui oportunidades)
                  </li>
                  <li>
                    · <strong>peso</strong> ∈ {"{"}7 (alta), 5 (média){"}"}
                  </li>
                  <li>
                    · <strong>confiança</strong> ∈ [0, 1], com piso aplicado
                    em 0,5
                  </li>
                  <li>
                    · <strong>denominador n × 9</strong> = máximo teórico
                    (peso 9 × n riscos)
                  </li>
                  <li>
                    · na prática, o score máximo alcançável é ≈ 78 (peso
                    máximo real = 7)
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  Versão da fórmula:{" "}
                  <span className="font-mono">v4.0 · 2026-04-19</span>
                </p>
              </div>
            )}
          </section>
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
