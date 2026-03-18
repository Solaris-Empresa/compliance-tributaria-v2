/**
 * AdminEmbeddings.tsx
 *
 * Página de administração para reconstrução dos embeddings CNAE 2.3.
 * Acesso restrito a equipe_solaris.
 *
 * Funcionalidades:
 * - Exibe status atual do banco de embeddings (cobertura, última atualização)
 * - Botão para disparar rebuild completo via OpenAI text-embedding-3-small
 * - Progresso em tempo real via WebSocket (barra de progresso + log de eventos)
 * - Botão para invalidar o cache em memória do servidor
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import {
  RefreshCw,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Trash2,
  Activity,
  CalendarClock,
  History,
} from "lucide-react";

interface RebuildProgress {
  processed: number;
  total: number;
  batch: number;
  totalBatches: number;
  percent: number;
}

interface LogEntry {
  time: string;
  type: "info" | "success" | "error" | "progress";
  message: string;
}

export default function AdminEmbeddings() {
  const { user } = useAuth();

  const utils = trpc.useUtils();

  const [progress, setProgress] = useState<RebuildProgress | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Buscar status atual
  const { data: status, refetch: refetchStatus } = trpc.adminEmbeddings.getStatus.useQuery(
    undefined,
    { refetchInterval: isRebuilding ? 3000 : false }
  );

  // Mutation de rebuild
  const rebuildMutation = trpc.adminEmbeddings.rebuild.useMutation({
    onSuccess: (data) => {
      addLog("info", data.message);
      setIsRebuilding(true);
    },
    onError: (err) => {
      addLog("error", `Erro ao iniciar rebuild: ${err.message}`);
      toast.error(err.message);
    },
  });

  // Mutation de invalidar cache
  const invalidateMutation = trpc.adminEmbeddings.invalidateCache.useMutation({
    onSuccess: () => {
      addLog("success", "Cache em memória invalidado. Próxima consulta recarregará do banco.");
      toast.success("Cache invalidado. O servidor recarregará os embeddings na próxima consulta.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function addLog(type: LogEntry["type"], message: string) {
    const now = new Date().toLocaleTimeString("pt-BR");
    setLogs((prev) => [...prev.slice(-199), { time: now, type, message }]);
  }

  // Scroll automático no log
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // WebSocket: escutar eventos de progresso do rebuild
  useEffect(() => {
    if (!user) return;

    const socket = io(window.location.origin, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("authenticate", user.id);
      addLog("info", "Conectado ao servidor WebSocket");
    });

    socket.on("embeddings:rebuild:started", (data: { total: number; batchSize: number }) => {
      addLog("info", `Rebuild iniciado: ${data.total} CNAEs em batches de ${data.batchSize}`);
      setIsRebuilding(true);
      setProgress({ processed: 0, total: data.total, batch: 0, totalBatches: Math.ceil(data.total / data.batchSize), percent: 0 });
    });

    socket.on("embeddings:rebuild:progress", (data: RebuildProgress) => {
      setProgress(data);
      if (data.batch % 3 === 0 || data.batch === data.totalBatches) {
        addLog("progress", `Batch ${data.batch}/${data.totalBatches} — ${data.processed}/${data.total} CNAEs (${data.percent}%)`);
      }
    });

    socket.on("embeddings:rebuild:batchError", (data: { batch: number; error: string }) => {
      addLog("error", `Erro no batch ${data.batch}: ${data.error}`);
    });

    socket.on("embeddings:rebuild:completed", (data: { processed: number; total: number; errors: number; durationSeconds: number }) => {
      setIsRebuilding(false);
      addLog("success", `✅ Rebuild concluído: ${data.processed}/${data.total} CNAEs em ${data.durationSeconds}s (${data.errors} erros)`);
      setProgress(null);
      refetchStatus();
      utils.adminEmbeddings.getStatus.invalidate();
      toast.success(`Rebuild concluído: ${data.processed} embeddings gerados em ${data.durationSeconds}s`);
    });

    socket.on("embeddings:rebuild:error", (data: { message: string }) => {
      setIsRebuilding(false);
      addLog("error", `Erro fatal: ${data.message}`);
      toast.error(`Erro no rebuild: ${data.message}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Sincronizar estado de rebuild com o status do servidor
  useEffect(() => {
    if (status?.rebuild.running !== undefined) {
      setIsRebuilding(status.rebuild.running);
      if (status.rebuild.running && status.rebuild.total > 0) {
        setProgress({
          processed: status.rebuild.processed,
          total: status.rebuild.total,
          batch: 0,
          totalBatches: Math.ceil(status.rebuild.total / 95),
          percent: status.rebuild.percent,
        });
      }
    }
  }, [status?.rebuild.running]);

  if (user?.role !== "equipe_solaris") {
    return (
      <ComplianceLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
            <p className="text-lg font-semibold">Acesso Restrito</p>
            <p className="text-muted-foreground">Esta página é exclusiva para a equipe SOLARIS.</p>
          </div>
        </div>
      </ComplianceLayout>
    );
  }

  const coverageColor =
    !status ? "text-muted-foreground" :
    status.coverage >= 99 ? "text-green-600" :
    status.coverage >= 80 ? "text-yellow-600" :
    "text-red-600";

  return (
    <ComplianceLayout>
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-16 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Administração de Embeddings CNAE
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os vetores semânticos usados para identificação de CNAEs via OpenAI{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">text-embedding-3-small</code>
          </p>
        </div>

        {/* Cards de status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">CNAEs no banco</p>
            <p className={`text-3xl font-bold ${coverageColor}`}>
              {status?.totalInDb ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">de {status?.totalCnaes ?? 1332} CNAEs 2.3</p>
          </div>

          <div className="border rounded-lg p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Cobertura</p>
            <p className={`text-3xl font-bold ${coverageColor}`}>
              {status?.coverage ?? "—"}%
            </p>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${status?.coverage ?? 0}%` }}
              />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Última atualização</p>
            <p className="text-sm font-medium">
              {status?.lastUpdated
                ? new Date(status.lastUpdated).toLocaleString("pt-BR")
                : "—"}
            </p>
            <Badge variant={status?.coverage === 100 ? "default" : "secondary"} className="text-xs">
              {status?.coverage === 100 ? "Completo" : "Parcial"}
            </Badge>
          </div>
        </div>

        {/* Barra de progresso do rebuild */}
        {(isRebuilding || progress) && (
          <div className="border rounded-lg p-5 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <p className="font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary animate-pulse" />
                Rebuild em andamento...
              </p>
              <span className="text-sm text-muted-foreground">
                {progress?.processed ?? status?.rebuild.processed ?? 0} / {progress?.total ?? status?.rebuild.total ?? 1332} CNAEs
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress?.percent ?? status?.rebuild.percent ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {progress?.percent ?? status?.rebuild.percent ?? 0}% concluído
              {progress && ` — Batch ${progress.batch}/${progress.totalBatches}`}
            </p>
          </div>
        )}

        {/* Ações */}
        <div className="border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold text-base">Ações</h2>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Rebuild completo */}
            <Button
              onClick={() => rebuildMutation.mutate()}
              disabled={isRebuilding || rebuildMutation.isPending}
              className="flex items-center gap-2"
            >
              {isRebuilding ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isRebuilding ? "Rebuild em andamento..." : "Reconstruir todos os embeddings"}
            </Button>

            {/* Invalidar cache */}
            <Button
              variant="outline"
              onClick={() => invalidateMutation.mutate()}
              disabled={invalidateMutation.isPending || isRebuilding}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Invalidar cache em memória
            </Button>

            {/* Atualizar status */}
            <Button
              variant="ghost"
              onClick={() => refetchStatus()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar status
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
            <p>
              <strong>Reconstruir todos os embeddings</strong> — Chama a API OpenAI para todos os 1.332 CNAEs em batches de 95. Leva ~3 minutos. O progresso é exibido em tempo real.
            </p>
            <p>
              <strong>Invalidar cache em memória</strong> — Força o servidor a recarregar os embeddings do banco na próxima consulta (sem chamar a API OpenAI).
            </p>
          </div>
        </div>

        {/* Log de eventos */}
        <div className="border rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Log de eventos
            </h2>
            {logs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setLogs([])}>
                Limpar
              </Button>
            )}
          </div>

          <div className="bg-muted/50 rounded-md p-3 h-64 overflow-y-auto font-mono text-xs space-y-1">
            {logs.length === 0 ? (
              <p className="text-muted-foreground italic">Nenhum evento ainda. Inicie um rebuild para ver o progresso aqui.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">{log.time}</span>
                  <span
                    className={
                      log.type === "success" ? "text-green-600" :
                      log.type === "error" ? "text-red-500" :
                      log.type === "progress" ? "text-blue-500" :
                      "text-foreground"
                    }
                  >
                    {log.type === "success" && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
                    {log.type === "error" && <AlertCircle className="inline h-3 w-3 mr-1" />}
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Cron agendamento */}
        <div className="border rounded-lg p-5 space-y-3 bg-blue-50/40 dark:bg-blue-950/20">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-500" />
            Rebuild Automático Agendado
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Frequência</p>
              <p className="font-medium mt-1">Toda segunda-feira</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Horário</p>
              <p className="font-medium mt-1">03:00 (America/São_Paulo)</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Notificação</p>
              <p className="font-medium mt-1">Owner via sistema ao concluir</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground border-t pt-2">
            O cron job executa <code className="bg-muted px-1 rounded">node-cron</code> no servidor com expressão{" "}
            <code className="bg-muted px-1 rounded">0 3 * * 1</code> (seg, 03:00 BRT). O resultado é registrado no histórico abaixo e uma notificação é enviada ao owner.
          </p>
        </div>

        {/* Histórico de rebuilds */}
        <HistorySection />

        {/* Info técnica */}
        <div className="border rounded-lg p-5 space-y-2 bg-muted/20">
          <h2 className="font-semibold text-sm">Informações técnicas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Modelo</p>
              <p className="font-medium">text-embedding-3-small</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dimensões</p>
              <p className="font-medium">1.536</p>
            </div>
            <div>
              <p className="text-muted-foreground">Batch size</p>
              <p className="font-medium">95 CNAEs</p>
            </div>
            <div>
              <p className="text-muted-foreground">Similaridade</p>
              <p className="font-medium">Cosseno</p>
            </div>
          </div>
        </div>
      </div>
    </ComplianceLayout>
  );
}

// ─── Sub-componente: histórico de rebuilds ────────────────────────────────────
function HistorySection() {
  const { data: history, isLoading } = trpc.adminEmbeddings.getHistory.useQuery();

  return (
    <div className="border rounded-lg p-5 space-y-3">
      <h2 className="font-semibold text-base flex items-center gap-2">
        <History className="h-4 w-4" />
        Histórico de Rebuilds
      </h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando histórico...</p>
      ) : !history || history.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nenhum rebuild registrado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 pr-4">Data/Hora</th>
                <th className="text-left py-2 pr-4">Disparado por</th>
                <th className="text-left py-2 pr-4">Status</th>
                <th className="text-right py-2 pr-4">CNAEs</th>
                <th className="text-right py-2 pr-4">Erros</th>
                <th className="text-right py-2">Duração</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {row.startedAt ? new Date(row.startedAt).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant={row.triggeredBy === "cron" ? "secondary" : "outline"} className="text-xs">
                      {row.triggeredBy === "cron" ? "Cron auto" : "Manual"}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    {row.status === "completed" ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Concluído
                      </span>
                    ) : row.status === "failed" ? (
                      <span className="text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Falhou
                      </span>
                    ) : (
                      <span className="text-blue-500 flex items-center gap-1">
                        <Activity className="h-3 w-3 animate-pulse" /> Em andamento
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {row.processedCnaes ?? 0}/{row.totalCnaes ?? 1332}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {row.errorCount > 0 ? (
                      <span className="text-red-500">{row.errorCount}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {row.durationSeconds ? `${row.durationSeconds}s` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
