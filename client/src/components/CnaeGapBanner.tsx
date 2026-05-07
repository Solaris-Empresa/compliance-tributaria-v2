/**
 * CnaeGapBanner — Issue #1010 Wave 2
 *
 * Exibido quando `generateQuestions` retorna `hasGap: true` (motivo:
 * `cnae_sem_legislacao_especifica`) — o RAG não retornou chunks setoriais
 * E SOLARIS Onda 1 não cobre o CNAE.
 *
 * Diferença vs `CorpusGapBanner` (Q.NCM, Issue #997/#1008):
 * - CorpusGapBanner V1.5 = bypass com confirmação (Q.NCM é etapa única do
 *   produto — ausência de cobertura é evento raro e relevante).
 * - CnaeGapBanner = não-bloqueante por design (Q.CNAE processa N CNAEs em
 *   sequência; ausência de cobertura para 1 CNAE não deve bloquear os outros).
 *
 * Tom neutro: "ainda não temos legislação específica para este CNAE" — não
 * sugere problema na empresa, apenas limitação de cobertura do corpus.
 *
 * Audit: caller dispara `auditCnaeGapSkip` no click (fire-and-forget).
 *
 * Refs:
 * - Issue #1010 (Q.CNAE dinâmico)
 * - Backend: server/routers-fluxo-v3.ts gate hasGap em generateQuestions
 * - Procedure: trpc.fluxoV3.auditCnaeGapSkip
 */
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface CnaeGapBannerProps {
  /** Código do CNAE sem cobertura (ex: "5211-7/99"). */
  cnaeCode: string;
  /** Descrição do CNAE (ex: "Depósitos de mercadorias para terceiros"). */
  cnaeDescription?: string;
  /** Indica se este é o último CNAE da lista (muda label do botão). */
  isLastCnae?: boolean;
  /** Callback ao clicar em "Avançar". Caller dispara audit + advanceToNextCnae. */
  onAvancar: () => void;
  /** Spinner no botão durante auditCnaeGapSkip + navegação. */
  isLoading?: boolean;
}

export default function CnaeGapBanner({
  cnaeCode,
  cnaeDescription,
  isLastCnae = false,
  onAvancar,
  isLoading = false,
}: CnaeGapBannerProps) {
  const cnaeLabel = cnaeDescription
    ? `${cnaeCode} — ${cnaeDescription}`
    : cnaeCode;

  const buttonLabel = isLastCnae
    ? "Avançar para Briefing →"
    : "Avançar para próximo CNAE →";

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <Alert
        className="border-amber-200 bg-amber-50 text-amber-900"
        data-testid="cnae-gap-banner"
      >
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertTitle className="text-amber-800 font-semibold text-base">
          CNAE {cnaeCode} — sem legislação específica
        </AlertTitle>
        <AlertDescription className="mt-2 text-amber-700">
          No momento, não identificamos legislação específica para o CNAE{" "}
          <strong>{cnaeLabel}</strong>. Isso pode significar que esta atividade
          segue as regras gerais do IBS/CBS, ou que a regulamentação específica
          ainda não foi publicada.
        </AlertDescription>
      </Alert>

      <div className="mt-4 text-xs text-muted-foreground">
        <p>
          O diagnóstico geral da sua empresa não será prejudicado — os demais
          CNAEs e as etapas anteriores (Q.NCM, Q.NBS) já fornecem base para o
          briefing. A equipe SOLARIS é notificada automaticamente para
          priorizar curadoria da cobertura legal deste CNAE.
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={onAvancar}
          disabled={isLoading}
          className="gap-2"
          data-testid="cnae-gap-skip"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
