/**
 * BriefingReservationBadge — fix(UAT 2026-04-20)
 *
 * Badge permanente exibido no briefing quando este foi aprovado com ressalva
 * (confiança <85%). Reutilizável em todas as telas que exibem o briefing
 * (detalhe, consolidação, PDF, resumo WhatsApp).
 */
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ApprovalReservation {
  confidence_at_approval: number;
  threshold: number;
  predefined_reason: string;
  free_reason: string;
  approver_user_name: string;
  approver_role?: string | null;
  approved_at: number;
  answered_sources?: string[];
  missing_sources?: string[];
}

const PREDEFINED_LABELS: Record<string, string> = {
  urgencia_cliente:   "Urgência do cliente",
  referencia_inicial: "Documento de referência inicial",
  restricao_dados:    "Restrição de dados pelo cliente",
  outro:              "Outro motivo",
};

interface Props {
  reservation: ApprovalReservation | null | undefined;
  className?: string;
  compact?: boolean;
}

export function BriefingReservationBadge({ reservation, className, compact }: Props) {
  if (!reservation) return null;

  const approvedDate = new Date(reservation.approved_at).toLocaleDateString("pt-BR");
  const predefinedLabel = PREDEFINED_LABELS[reservation.predefined_reason] ?? reservation.predefined_reason;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
          className
        )}
        data-testid="briefing-reservation-badge-compact"
        title={`Aprovado com ressalva em ${approvedDate} · ${predefinedLabel}`}
      >
        <ShieldAlert className="h-3 w-3" />
        Ressalva {reservation.confidence_at_approval}%
      </span>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2 dark:border-amber-800 dark:bg-amber-950/30",
        className
      )}
      data-testid="briefing-reservation-badge"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Aprovado com ressalva — {reservation.confidence_at_approval}% de confiança
            <span className="text-xs font-normal ml-2 text-amber-700 dark:text-amber-400">
              (patamar mínimo: {reservation.threshold}%)
            </span>
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Motivo:</strong> {predefinedLabel}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Justificativa:</strong> {reservation.free_reason}
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-500 pt-1">
            Por <strong>{reservation.approver_user_name}</strong>
            {reservation.approver_role ? ` (${reservation.approver_role.replace(/_/g, " ")})` : ""} em {approvedDate}
          </p>
        </div>
      </div>
    </div>
  );
}
