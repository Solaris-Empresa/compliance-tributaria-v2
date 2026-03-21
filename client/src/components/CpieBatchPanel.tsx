/**
 * CpieBatchPanel — K1 + L4
 * Painel para análise CPIE em lote de projetos sem score.
 * Exibe progresso em tempo real via WebSocket (Sprint L4).
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Play, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

interface BatchResult {
  projectId: number;
  name: string;
  score: number;
  status: "ok" | "error";
}

interface BatchSummary {
  processed: number;
  skipped: number;
  errors: number;
  results: BatchResult[];
}

interface ProgressEvent {
  current: number;
  total: number;
  projectId: number;
  projectName: string;
  score: number;
  status: "ok" | "error";
}

interface CpieBatchPanelProps {
  onComplete?: () => void;
  pendingCount?: number;
}

export function CpieBatchPanel({ onComplete, pendingCount }: CpieBatchPanelProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [limit, setLimit] = useState(20);
  const [wsConnected, setWsConnected] = useState(false);
  const [realtimeProgress, setRealtimeProgress] = useState<ProgressEvent | null>(null);
  const [realtimeResults, setRealtimeResults] = useState<BatchResult[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const utils = trpc.useUtils();

  // ── WebSocket para progresso em tempo real ────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const socket = io(window.location.origin, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setWsConnected(true);
      socket.emit("authenticate", user.id);
    });

    socket.on("disconnect", () => setWsConnected(false));

    socket.on("cpie:batch:progress", (data: ProgressEvent) => {
      setRealtimeProgress(data);
      setRealtimeResults(prev => [...prev, {
        projectId: data.projectId,
        name: data.projectName,
        score: data.score,
        status: data.status,
      }]);
    });

    socket.on("cpie:batch:done", () => {
      // O onSuccess do mutation vai atualizar o summary final
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const batchAnalyze = trpc.cpie.batchAnalyze.useMutation({
    onSuccess: (data) => {
      setSummary(data);
      setRealtimeProgress(null);
      if (data.processed > 0) {
        toast.success(`${data.processed} projeto(s) analisados com sucesso!`);
        utils.projects.list.invalidate();
        onComplete?.();
      } else {
        toast.info("Nenhum projeto pendente encontrado.");
      }
    },
    onError: (err) => {
      setRealtimeProgress(null);
      toast.error(`Erro na análise em lote: ${err.message}`);
    },
  });

  const handleRun = () => {
    setSummary(null);
    setRealtimeProgress(null);
    setRealtimeResults([]);
    batchAnalyze.mutate({ limit, onlyZeroScore: true });
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-500";
  };

  const isRunning = batchAnalyze.isPending;
  const progressPct = realtimeProgress
    ? Math.round((realtimeProgress.current / realtimeProgress.total) * 100)
    : 0;

  return (
    <Card className="border-dashed border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Análise CPIE em Lote
          {pendingCount !== undefined && pendingCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {pendingCount} pendentes
            </Badge>
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            {wsConnected ? (
              <><Wifi className="h-3 w-3 text-emerald-500" />Tempo real</>
            ) : (
              <><WifiOff className="h-3 w-3 text-muted-foreground" />Offline</>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Calcula o score CPIE determinístico para todos os projetos sem análise.
          Rápido e sem consumo de IA — usa apenas os dados já preenchidos no perfil.
        </p>

        {/* Controle de limite */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted-foreground shrink-0">Processar até:</label>
          <div className="flex gap-1">
            {[10, 20, 50].map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                disabled={isRunning}
                className={cn(
                  "px-3 py-1 text-xs rounded-md border transition-colors",
                  limit === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent",
                  isRunning && "opacity-50 cursor-not-allowed"
                )}
              >
                {n} projetos
              </button>
            ))}
          </div>
        </div>

        {/* Botão principal */}
        <Button
          onClick={handleRun}
          disabled={isRunning}
          className="w-full gap-2"
          variant="outline"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando projetos...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Analisar projetos pendentes
            </>
          )}
        </Button>

        {/* Progresso em tempo real (L4) */}
        {isRunning && realtimeProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate max-w-[70%]">
                Processando: <span className="font-medium text-foreground">{realtimeProgress.projectName}</span>
              </span>
              <span className="shrink-0 font-mono">
                {realtimeProgress.current}/{realtimeProgress.total}
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">{progressPct}% concluído</p>
          </div>
        )}

        {/* Progresso sem WebSocket (fallback) */}
        {isRunning && !realtimeProgress && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Aguardando início do processamento...
          </div>
        )}

        {/* Resultado final */}
        {summary && !isRunning && (
          <div className="space-y-3">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
                <div className="text-lg font-bold text-emerald-700">{summary.processed}</div>
                <div className="text-xs text-emerald-600">Processados</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-900/10 border border-slate-200">
                <div className="text-lg font-bold text-slate-600">{summary.skipped}</div>
                <div className="text-xs text-slate-500">Já tinham score</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                <div className="text-lg font-bold text-red-600">{summary.errors}</div>
                <div className="text-xs text-red-500">Erros</div>
              </div>
            </div>

            {/* Detalhes */}
            {summary.results.length > 0 && (
              <div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showDetails ? "Ocultar" : "Ver"} detalhes ({summary.results.length} projetos)
                </button>

                {showDetails && (
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {summary.results.map((r) => (
                      <div key={r.projectId} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                        <span className="truncate max-w-[60%] text-foreground">{r.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {r.status === "ok" ? (
                            <>
                              <span className={cn("font-semibold", scoreColor(r.score))}>{r.score}%</span>
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            </>
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
