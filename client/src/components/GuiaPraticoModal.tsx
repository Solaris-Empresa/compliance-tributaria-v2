/**
 * GuiaPraticoModal — FEAT-GUIA-PRÁTICO (F-03→F-13 · ADR-GP-001)
 *
 * Modal que gera (via trpc.guiaPratico.gerar — query read-only) um guia prático
 * ILUSTRATIVO para uma tarefa do plano de ação.
 *
 * Governança:
 *   - F-04: gera ao abrir (useEffect[open]); F-05: react-query cancela in-flight
 *     ao fechar/trocar de chave (signal) — sem AbortController manual.
 *   - F-08/F-09: detalhamento + nível técnico regeram automaticamente (queryKey).
 *   - F-10/F-11: contexto adicional (≤500) aplicado via "Regerar" (debounce 2s).
 *   - F-13: disclaimer ilustrativo (tela). F-12: export PDF.
 *   - ZERO persistência: gcTime 0 + reset ao fechar (nada cacheado entre aberturas).
 */
import { useEffect, useState, useRef } from "react";
import { Sparkles, Loader2, FileDown, RefreshCw, AlertTriangle, Clock, BookMarked, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { exportGuiaPDF, GUIA_DISCLAIMER } from "@/lib/exportGuiaPDF";

type Detalhamento = "resumido" | "normal" | "detalhado";
type NivelTecnico = "simples" | "normal" | "especialista";

interface GuiaPraticoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  projectId: number;
  taskTitulo: string;
}

const NIVEL_OPTIONS: { value: NivelTecnico; label: string }[] = [
  { value: "simples", label: "Leigo" },
  { value: "normal", label: "Técnico" },
  { value: "especialista", label: "Especialista" },
];

const DETALHE_OPTIONS: { value: Detalhamento; label: string }[] = [
  { value: "resumido", label: "Resumido" },
  { value: "normal", label: "Normal" },
  { value: "detalhado", label: "Detalhado" },
];

const TAG_STYLE: Record<string, { icon: typeof Clock; cls: string }> = {
  tempo: { icon: Clock, cls: "border-blue-200 bg-blue-50 text-blue-700" },
  atencao: { icon: AlertTriangle, cls: "border-amber-200 bg-amber-50 text-amber-700" },
  referencia: { icon: BookMarked, cls: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  entregavel: { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

export function GuiaPraticoModal({ open, onOpenChange, taskId, projectId, taskTitulo }: GuiaPraticoModalProps) {
  const [detalhamento, setDetalhamento] = useState<Detalhamento>("normal");
  const [nivelTecnico, setNivelTecnico] = useState<NivelTecnico>("normal");
  const [contexto, setContexto] = useState("");
  const [committedContexto, setCommittedContexto] = useState("");
  const [started, setStarted] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // F-04: gera ao abrir. F-14/ZERO persistência: reseta ao fechar.
  useEffect(() => {
    if (open) {
      setStarted(true);
    } else {
      setStarted(false);
      setContexto("");
      setCommittedContexto("");
      setDetalhamento("normal");
      setNivelTecnico("normal");
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
      setCooldown(false);
    }
  }, [open]);

  const query = trpc.guiaPratico.gerar.useQuery(
    {
      taskId,
      projectId,
      detalhamento,
      nivelTecnico,
      contextoAdicional: committedContexto.trim() || undefined,
    },
    {
      enabled: open && started,
      retry: false,
      refetchOnWindowFocus: false,
      gcTime: 0,
      staleTime: Infinity,
    }
  );

  const guia = query.data;
  const isLoading = query.isFetching;

  // F-11: Regerar com debounce 2s (evita re-clique em rajada).
  const handleRegerar = () => {
    if (cooldown || isLoading) return;
    setCooldown(true);
    cooldownRef.current = setTimeout(() => setCooldown(false), 2000);
    const novo = contexto.trim();
    if (novo !== committedContexto.trim()) {
      setCommittedContexto(contexto); // troca queryKey → refetch automático
    } else {
      query.refetch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="guia-pratico-modal"
        className="sm:max-w-2xl max-h-[88vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <Sparkles className="h-4 w-4" />
            Guia Prático
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{taskTitulo}</DialogDescription>
        </DialogHeader>

        {/* Controles de personalização (F-08/F-09/F-10) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Nível técnico</Label>
            <Select value={nivelTecnico} onValueChange={(v) => setNivelTecnico(v as NivelTecnico)}>
              <SelectTrigger data-testid="guia-nivel-select" className="mt-1 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NIVEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Detalhamento</Label>
            <Select value={detalhamento} onValueChange={(v) => setDetalhamento(v as Detalhamento)}>
              <SelectTrigger data-testid="guia-detalhamento-select" className="mt-1 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DETALHE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs" htmlFor="guia-contexto">
            Contexto adicional (opcional)
          </Label>
          <Textarea
            id="guia-contexto"
            data-testid="guia-contexto-textarea"
            className="mt-1 text-sm"
            rows={2}
            maxLength={500}
            placeholder="Ex.: empresa em transição de ERP, foco em filial de SP..."
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-0.5 text-right">{contexto.length}/500</p>
        </div>

        {/* Resultado (F-06 loading / F-07 cards / erro) */}
        <div className="min-h-[120px]">
          {isLoading ? (
            <div data-testid="guia-loading" className="space-y-2 py-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : query.isError ? (
            <div
              data-testid="guia-error"
              className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <p className="font-medium">Não foi possível gerar o guia.</p>
              <p className="text-xs mt-1">{query.error?.message ?? "Tente novamente."}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => query.refetch()}>
                <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
              </Button>
            </div>
          ) : guia ? (
            <div data-testid="guia-content" className="space-y-3">
              <p className="text-xs text-muted-foreground">{guia.contextoEmpresa}</p>

              <div className="rounded border border-amber-200 bg-amber-50 p-2.5">
                <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Alerta crítico
                </p>
                <p className="text-xs text-amber-800 mt-0.5">{guia.alertaCritico}</p>
              </div>

              <ol className="space-y-2">
                {guia.passos.map((p) => {
                  const style = TAG_STYLE[p.tagTipo] ?? TAG_STYLE.referencia;
                  const Icon = style.icon;
                  return (
                    <li
                      key={p.numero}
                      data-testid="guia-passo"
                      className="rounded border border-border bg-background p-2.5"
                    >
                      <p className="text-sm font-medium">
                        {p.numero}. {p.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{p.descricao}</p>
                      <span
                        className={cn(
                          "mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          style.cls
                        )}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {p.tagTexto}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
        </div>

        {/* F-13: disclaimer ilustrativo (tela) */}
        <p
          data-testid="guia-disclaimer"
          className="text-[10px] leading-snug text-muted-foreground border-t pt-2"
        >
          {GUIA_DISCLAIMER}
        </p>

        {/* Ações (F-11 Regerar / F-12 Export) */}
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            data-testid="guia-regerar-button"
            disabled={isLoading || cooldown}
            onClick={handleRegerar}
          >
            {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Regerar
          </Button>
          <Button
            size="sm"
            data-testid="guia-export-button"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={!guia || isLoading}
            onClick={() => guia && exportGuiaPDF(guia, taskTitulo)}
          >
            <FileDown className="h-3 w-3 mr-1" /> Exportar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
