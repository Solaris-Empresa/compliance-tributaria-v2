/**
 * ApproveReservationModal — fix(UAT 2026-04-20)
 *
 * Modal exibido quando o usuário tenta aprovar briefing com confiança <85%.
 * Permite aprovação com ressalva obrigatória (motivo pré-definido + texto livre).
 *
 * UX decisions:
 * - Lista fontes respondidas vs faltantes com ganho esperado por responder cada.
 * - 4 motivos pré-definidos + textarea obrigatória (mínimo 20 chars).
 * - Carimbo do responsável (nome + role) exibido para clareza.
 * - Submit desabilitado até justificativa ter ≥20 chars.
 */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ShieldAlert, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PredefinedReason =
  | "urgencia_cliente"
  | "referencia_inicial"
  | "restricao_dados"
  | "outro";

const PREDEFINED_REASONS: Array<{ value: PredefinedReason; label: string; help: string }> = [
  {
    value: "urgencia_cliente",
    label: "Cliente autorizou briefing preliminar para decisão urgente",
    help: "Situação de pressão temporal (ex: reunião de diretoria iminente).",
  },
  {
    value: "referencia_inicial",
    label: "Documento de referência inicial, será revisado após questionários",
    help: "Briefing servirá de base para a próxima conversa; versão final virá depois.",
  },
  {
    value: "restricao_dados",
    label: "Dados insuficientes por restrição do cliente",
    help: "O cliente optou por não fornecer todas as informações neste momento.",
  },
  {
    value: "outro",
    label: "Outro motivo (especifique na justificativa)",
    help: "Use este quando nenhuma das opções acima se aplica.",
  },
];

// ─── Fontes de dados (espelha server/lib/project-timeline.ts) ─────────────────

interface SourceInfo {
  key: string;
  label: string;
  expectedGainText: string;
}

const SOURCE_LABELS: Record<string, SourceInfo> = {
  solaris_onda1:        { key: "solaris_onda1",        label: "SOLARIS Onda 1",       expectedGainText: "Responder eleva para 85%" },
  iagen_onda2:          { key: "iagen_onda2",          label: "IA Gen Onda 2",        expectedGainText: "Responder eleva para 85-90%" },
  q_produtos_ncm:       { key: "q_produtos_ncm",       label: "Q.Produtos (NCM)",     expectedGainText: "Responder + NCM cadastrado = +5 pontos" },
  q_servicos_nbs:       { key: "q_servicos_nbs",       label: "Q.Serviços (NBS)",     expectedGainText: "Responder + NBS cadastrado = +5 pontos" },
  qcnae_especializado:  { key: "qcnae_especializado",  label: "QCNAE especializado",  expectedGainText: "Gaps específicos do seu CNAE" },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confidence: number;
  answeredSources: string[];
  missingSources: string[];
  approverName: string;
  approverRole?: string | null;
  onConfirm: (predefinedReason: PredefinedReason, freeReason: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function ApproveReservationModal({
  open,
  onOpenChange,
  confidence,
  answeredSources,
  missingSources,
  approverName,
  approverRole,
  onConfirm,
  isSubmitting,
}: Props) {
  const [predefinedReason, setPredefinedReason] = useState<PredefinedReason>("urgencia_cliente");
  const [freeReason, setFreeReason] = useState("");

  const freeReasonValid = useMemo(() => freeReason.trim().length >= 20, [freeReason]);

  const handleSubmit = async () => {
    if (!freeReasonValid || isSubmitting) return;
    await onConfirm(predefinedReason, freeReason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col"
        data-testid="modal-approve-reservation"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" />
            Aprovar briefing com ressalva
          </DialogTitle>
          <DialogDescription>
            A confiança deste briefing é <strong>{confidence}%</strong>, abaixo do patamar
            mínimo de <strong>85%</strong> estabelecido pela IA SOLARIS. Você pode aprovar
            mesmo assim, desde que justifique. A ressalva ficará registrada permanentemente
            no histórico e será visível em todos os artefatos gerados a partir deste briefing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-2">
          {/* Fontes — respondidas e faltantes */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fontes do diagnóstico
            </p>
            <div className="grid grid-cols-1 gap-1.5 text-sm">
              {answeredSources.map((key) => {
                const info = SOURCE_LABELS[key] ?? { label: key, expectedGainText: "" };
                return (
                  <div key={key} className="flex items-center gap-2" data-testid={`reservation-source-answered-${key}`}>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{info.label}</span>
                    <span className="text-xs text-muted-foreground">respondido</span>
                  </div>
                );
              })}
              {missingSources.map((key) => {
                const info = SOURCE_LABELS[key] ?? { label: key, expectedGainText: "" };
                return (
                  <div key={key} className="flex items-center gap-2" data-testid={`reservation-source-missing-${key}`}>
                    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span className="text-muted-foreground">{info.label}</span>
                    {info.expectedGainText && (
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        — {info.expectedGainText}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Motivo pré-definido */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Motivo da aprovação com ressalva</Label>
            <div className="space-y-1.5" data-testid="reservation-predefined-reasons">
              {PREDEFINED_REASONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-start gap-2 rounded border p-2.5 cursor-pointer transition",
                    predefinedReason === opt.value
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <input
                    type="radio"
                    name="predefined-reason"
                    value={opt.value}
                    checked={predefinedReason === opt.value}
                    onChange={() => setPredefinedReason(opt.value)}
                    className="mt-0.5"
                    data-testid={`reservation-reason-${opt.value}`}
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.help}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Justificativa livre */}
          <div className="space-y-1.5">
            <Label htmlFor="free-reason" className="text-sm font-semibold">
              Justificativa detalhada <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="free-reason"
              value={freeReason}
              onChange={(e) => setFreeReason(e.target.value)}
              placeholder="Descreva o contexto desta aprovação excepcional (mínimo 20 caracteres). Ex: Reunião de diretoria amanhã 9h exige versão inicial; Onda 1 será respondida na próxima semana."
              rows={4}
              className="resize-none"
              data-testid="reservation-free-reason-textarea"
            />
            <div className="flex justify-between text-xs">
              <span className={cn(
                freeReason.trim().length >= 20 ? "text-emerald-600" : "text-muted-foreground"
              )}>
                {freeReason.trim().length}/20 caracteres mínimos
              </span>
              <span className="text-muted-foreground">
                Aprovando como <strong>{approverName}</strong>
                {approverRole ? ` · ${approverRole.replace(/_/g, " ")}` : ""}
              </span>
            </div>
          </div>

          {/* Aviso de permanência */}
          <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <p><strong>Esta aprovação será permanente e visível:</strong></p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Badge "Aprovado com ressalva" no cabeçalho do briefing</li>
                <li>Entrada na Trilha de Auditoria com nome, motivo e timestamp</li>
                <li>Propagação aos riscos e planos gerados deste briefing</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid="btn-reservation-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!freeReasonValid || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            data-testid="btn-reservation-confirm"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            Aprovar com ressalva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
