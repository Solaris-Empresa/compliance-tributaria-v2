/**
 * RetrocessoConfirmModal — Issue #54 (Sprint Final)
 *
 * Modal de confirmação exibido quando o usuário tenta navegar para uma etapa
 * anterior no FlowStepper. Usa o endpoint `retrocesso.check` para determinar
 * se dados serão perdidos e exibe aviso claro antes de prosseguir.
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface RetrocessoConfirmModalProps {
  /** Controla a visibilidade do modal */
  open: boolean;
  /** ID do projeto */
  projectId: number;
  /** Etapa atual do projeto (antes do retrocesso) */
  fromStep: number;
  /** Etapa de destino (após o retrocesso) */
  toStep: number;
  /** Label da etapa de destino para exibição */
  toStepLabel: string;
  /** Callback chamado quando o usuário confirma o retrocesso */
  onConfirm: () => void;
  /** Callback chamado quando o usuário cancela */
  onCancel: () => void;
}

export default function RetrocessoConfirmModal({
  open,
  projectId,
  fromStep,
  toStep,
  toStepLabel,
  onConfirm,
  onCancel,
}: RetrocessoConfirmModalProps) {
  const { data, isLoading } = trpc.retrocesso.check.useQuery(
    { projectId, fromStep, toStep },
    { enabled: open && fromStep > toStep }
  );

  // Labels amigáveis para as colunas afetadas
  const dataLabels: Record<string, string> = {
    corporateAnswers: "Respostas do diagnóstico corporativo",
    operationalAnswers: "Respostas do diagnóstico operacional",
    cnaeAnswers: "Respostas do diagnóstico por CNAE",
    briefingContent: "Briefing gerado pela IA",
    riskMatricesData: "Matrizes de riscos",
    actionPlansData: "Plano de ação",
    "questionnaireAnswersV3 (tabela)": "Respostas do questionário V3",
  };

  const affectedLabels =
    data?.affectedColumns?.map((col) => dataLabels[col] ?? col) ?? [];

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            Retroceder para "{toStepLabel}"?
          </AlertDialogTitle>

          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-foreground/80">
              {isLoading ? (
                <p className="text-muted-foreground">Verificando impacto...</p>
              ) : data?.requiresCleanup ? (
                <>
                  <p>
                    Ao retroceder para esta etapa, os seguintes dados serão{" "}
                    <strong className="text-destructive">removidos permanentemente</strong>{" "}
                    e precisarão ser regenerados:
                  </p>
                  <ul className="space-y-1 pl-4">
                    {affectedLabels.map((label) => (
                      <li key={label} className="flex items-center gap-2 text-destructive/90">
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        {label}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                    Esta ação não pode ser desfeita. Os dados removidos precisarão ser
                    regenerados pela IA na próxima vez que você avançar por essas etapas.
                  </p>
                </>
              ) : (
                <p>
                  Você está prestes a navegar para a etapa <strong>{toStepLabel}</strong>.
                  Nenhum dado será perdido nesta operação.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              data?.requiresCleanup
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
            disabled={isLoading}
          >
            {data?.requiresCleanup ? "Sim, retroceder e remover dados" : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
