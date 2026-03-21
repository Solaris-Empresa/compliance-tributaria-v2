/**
 * CpieHistoryPanel.tsx
 * Sprint I — Issue I1
 *
 * Timeline de histórico de análises CPIE por projeto.
 * Exibe as últimas 10 análises com score, nível de prontidão e data.
 * Permite comparar a evolução do score ao longo do tempo.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Brain, TrendingUp, TrendingDown, Minus, ChevronRight, Clock, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: number;
  overallScore: number;
  confidenceScore: number;
  readinessLevel: "insufficient" | "basic" | "good" | "excellent";
  readinessMessage: string | null;
  analysisVersion: string | null;
  createdAt: string;
  dimensionsJson: unknown;
  suggestionsCount: number;
  questionsCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const READINESS_CONFIG = {
  excellent: { label: "Excelente", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  good: { label: "Bom", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
  basic: { label: "Básico", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  insufficient: { label: "Insuficiente", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
};

function ScoreTrend({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff > 0) return (
    <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium">
      <TrendingUp className="h-3 w-3" />+{diff}%
    </span>
  );
  if (diff < 0) return (
    <span className="flex items-center gap-0.5 text-xs text-red-500 font-medium">
      <TrendingDown className="h-3 w-3" />{diff}%
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />0%
    </span>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface CpieHistoryPanelProps {
  projectId: number;
  projectName: string;
  /** Modo compacto: exibe apenas os 3 últimos e botão "Ver histórico" */
  compact?: boolean;
}

export function CpieHistoryPanel({ projectId, projectName, compact = false }: CpieHistoryPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  const { data: history, isLoading } = trpc.cpie.getAnalysisHistory.useQuery(
    { projectId },
    { enabled: !!projectId, staleTime: 2 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-4 space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-4 text-center space-y-2">
        <Brain className="h-8 w-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">Nenhuma análise CPIE registrada ainda.</p>
        <p className="text-xs text-muted-foreground">Clique em "Analisar com IA" para iniciar.</p>
      </div>
    );
  }

  const displayEntries = compact ? history.slice(0, 3) : history;

  return (
    <>
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Histórico de Análises</span>
          <Badge variant="outline" className="text-xs ml-auto">{history.length} análise{history.length !== 1 ? "s" : ""}</Badge>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {displayEntries.map((entry, idx) => {
            const cfg = READINESS_CONFIG[entry.readinessLevel] ?? READINESS_CONFIG.basic;
            const prevScore = history[idx + 1]?.overallScore;
            const scoreColor = entry.overallScore >= 80 ? "text-emerald-600" : entry.overallScore >= 50 ? "text-amber-600" : "text-red-500";

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedEntry(entry)}
                className="w-full text-left rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-lg font-bold tabular-nums", scoreColor)}>
                      {entry.overallScore}%
                    </span>
                    <ScoreTrend current={entry.overallScore} previous={prevScore} />
                  </div>
                  <Badge variant="secondary" className={cn("text-xs", cfg.color, cfg.bg)}>
                    {cfg.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                  {entry.suggestionsCount > 0 && (
                    <span>{entry.suggestionsCount} sugestão{entry.suggestionsCount !== 1 ? "ões" : ""}</span>
                  )}
                  {entry.questionsCount > 0 && (
                    <span>{entry.questionsCount} pergunta{entry.questionsCount !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Ver mais */}
        {compact && history.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1 text-xs"
            onClick={() => setShowAll(true)}
          >
            Ver todas as {history.length} análises
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Modal histórico completo */}
      {compact && (
        <Dialog open={showAll} onOpenChange={setShowAll}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                Histórico CPIE — {projectName}
              </DialogTitle>
              <DialogDescription>
                Evolução do score de perfil ao longo do tempo.
              </DialogDescription>
            </DialogHeader>
            <CpieHistoryPanel projectId={projectId} projectName={projectName} compact={false} />
          </DialogContent>
        </Dialog>
      )}

      {/* Modal detalhe de uma análise */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Análise de {selectedEntry ? new Date(selectedEntry.createdAt).toLocaleString("pt-BR") : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Score Geral</p>
                  <p className={cn("text-3xl font-bold",
                    selectedEntry.overallScore >= 80 ? "text-emerald-600" :
                    selectedEntry.overallScore >= 50 ? "text-amber-600" : "text-red-500"
                  )}>{selectedEntry.overallScore}%</p>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Confiança</p>
                  <p className={cn("text-3xl font-bold",
                    selectedEntry.confidenceScore >= 80 ? "text-emerald-600" :
                    selectedEntry.confidenceScore >= 50 ? "text-amber-600" : "text-red-500"
                  )}>{selectedEntry.confidenceScore}%</p>
                </div>
              </div>
              {selectedEntry.readinessMessage && (
                <div className={cn(
                  "rounded-xl p-3 text-sm",
                  READINESS_CONFIG[selectedEntry.readinessLevel]?.bg,
                  READINESS_CONFIG[selectedEntry.readinessLevel]?.color
                )}>
                  {selectedEntry.readinessMessage}
                </div>
              )}
              {Array.isArray(selectedEntry.dimensionsJson) && (selectedEntry.dimensionsJson as unknown[]).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Score por Dimensão</p>
                  {(selectedEntry.dimensionsJson as Array<{ name: string; score: number }>).map((dim) => (
                    <div key={dim.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{dim.name}</span>
                        <span className={cn("font-bold",
                          dim.score >= 80 ? "text-emerald-600" :
                          dim.score >= 50 ? "text-amber-600" : "text-red-500"
                        )}>{dim.score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full",
                            dim.score >= 80 ? "bg-emerald-500" :
                            dim.score >= 50 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                <span>{selectedEntry.suggestionsCount} sugestões</span>
                <span>·</span>
                <span>{selectedEntry.questionsCount} perguntas</span>
                <span>·</span>
                <span>v{selectedEntry.analysisVersion}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
