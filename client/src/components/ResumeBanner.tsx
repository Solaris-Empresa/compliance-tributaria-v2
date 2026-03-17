/**
 * ResumeBanner — Banner de retomada de progresso salvo
 * Exibido quando há dados temporários no localStorage para a etapa atual.
 */

import { Button } from "@/components/ui/button";
import { RotateCcw, PlayCircle, Clock } from "lucide-react";

interface ResumeBannerProps {
  savedAt: number;
  onResume: () => void;
  onDiscard: () => void;
  label?: string;
}

export function ResumeBanner({
  savedAt,
  onResume,
  onDiscard,
  label = "progresso",
}: ResumeBannerProps) {
  const elapsed = Date.now() - savedAt;
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(elapsed / 3600000);
  const days = Math.floor(elapsed / 86400000);

  const timeLabel =
    days > 0
      ? `${days} dia${days > 1 ? "s" : ""} atrás`
      : hours > 0
      ? `${hours}h atrás`
      : minutes > 0
      ? `${minutes} min atrás`
      : "agora há pouco";

  return (
    <div className="mb-6 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-100 p-2 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-amber-900">
              Você tem {label} salvo
            </p>
            <p className="text-sm text-amber-700">
              Salvo automaticamente {timeLabel} — deseja continuar de onde parou?
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={onDiscard}
          >
            <RotateCcw className="h-4 w-4" />
            Descartar
          </Button>
          <Button
            size="sm"
            className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={onResume}
          >
            <PlayCircle className="h-4 w-4" />
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
