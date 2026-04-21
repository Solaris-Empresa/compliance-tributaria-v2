/**
 * BriefingFreshnessBanner.tsx — fix UAT 2026-04-21 V1
 *
 * Banner que aparece no topo do briefing quando:
 *   - Existe snapshot persistido (briefing já foi gerado ao menos uma vez), E
 *   - Fingerprint de pelo menos uma fonte divergiu (hash mudou real)
 *
 * Comportamento:
 *   - Mostra diff semântico ("Perfil da empresa mudou", "Q1 SOLARIS ganhou respostas", etc)
 *   - Botão [Regerar v7] → dispara geração de nova versão
 *   - Botão [Manter] → fecha por sessão
 *
 * Quando NÃO aparece:
 *   - Sem snapshot (primeiro briefing a gerar)
 *   - Sem divergência (hash igual em todas as fontes)
 *   - Usuário dispensou via "Manter" (estado local por sessão)
 */

import { useState } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SourceKey = "perfil" | "q1_solaris" | "q2_iagen" | "q3_cnae" | "q3_produtos" | "q3_servicos";

interface FingerprintDiff {
  source: SourceKey;
  changed: boolean;
  reason: "hash" | "ts_only" | "none";
  before: { ts: string | null; hash: string } | null;
  after: { ts: string | null; hash: string };
}

interface FreshnessData {
  hasSnapshot: boolean;
  diverged: boolean;
  diffs: FingerprintDiff[];
  snapshot: {
    score: number;
    aplicabilidade: string;
    geradoEm: string;
    formulaVersion: string;
  } | null;
}

const SOURCE_LABEL: Record<SourceKey, string> = {
  perfil: "Perfil da empresa",
  q1_solaris: "Q1 SOLARIS (Onda 1)",
  q2_iagen: "Q2 IA Gen (Onda 2)",
  q3_cnae: "Q3 CNAE especializado",
  q3_produtos: "Q3 Produtos (NCM)",
  q3_servicos: "Q3 Serviços (NBS)",
};

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "—";
  }
}

export interface BriefingFreshnessBannerProps {
  freshness?: FreshnessData | null;
  isRegenerating?: boolean;
  onRegerar: () => void;
  className?: string;
}

export function BriefingFreshnessBanner({
  freshness,
  isRegenerating = false,
  onRegerar,
  className,
}: BriefingFreshnessBannerProps) {
  const [dismissedBySession, setDismissedBySession] = useState(false);

  if (!freshness || !freshness.hasSnapshot || !freshness.diverged) return null;
  if (dismissedBySession) return null;

  const changedDiffs = freshness.diffs.filter((d) => d.changed);

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-300 bg-amber-50 p-4",
        "dark:border-amber-800 dark:bg-amber-950/40",
        className
      )}
      data-testid="briefing-freshness-banner"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1 space-y-2">
          <div className="font-semibold text-amber-900 dark:text-amber-100">
            Dados desta análise foram atualizados
          </div>
          <div className="text-sm text-amber-800 dark:text-amber-200">
            Esta versão reflete o estado de {formatDateBR(freshness.snapshot?.geradoEm)}.
            Desde então, {changedDiffs.length === 1 ? "1 fonte mudou" : `${changedDiffs.length} fontes mudaram`}:
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-amber-900 dark:text-amber-100">
            {changedDiffs.map((d) => (
              <li key={d.source} data-testid={`freshness-diff-${d.source}`}>
                <strong>{SOURCE_LABEL[d.source] ?? d.source}</strong>
                {d.before?.ts && d.after.ts && d.before.ts !== d.after.ts ? (
                  <>
                    {" "}— atualizado em {formatDateBR(d.after.ts)}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant="default"
              onClick={onRegerar}
              disabled={isRegenerating}
              className="gap-2"
              data-testid="briefing-freshness-regerar"
            >
              <RefreshCw className={cn("h-4 w-4", isRegenerating && "animate-spin")} />
              {isRegenerating ? "Regerando..." : "Gerar nova versão"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDismissedBySession(true)}
              className="gap-2"
              data-testid="briefing-freshness-manter"
            >
              <X className="h-4 w-4" />
              Manter versão atual
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
