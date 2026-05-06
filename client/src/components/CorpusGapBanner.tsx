/**
 * CorpusGapBanner — Issue #997 Q.NCM Quality Gate
 *
 * Exibido quando `getProductQuestions` retorna `motivo: "corpus_gap_setorial"`,
 * indicando que o corpus RAG não cobre legislação setorial específica para
 * o NCM informado E SOLARIS também não cobre o CNAE do projeto.
 *
 * V1 (PR #1003): bloqueio total — sem botão de bypass. Usuário ficava
 * bloqueado nesta etapa até equipe SOLARIS validar cobertura legal.
 *
 * V1.5 (Issue #1008): bypass com audit trail. Mensagem 98% preservada
 * integralmente; botão "Continuar com diagnóstico parcial" só renderiza
 * quando `onAvancar` é fornecido. Sem `onAvancar`, comportamento V1
 * (bloqueio total) é preservado para casos onde bypass não faz sentido.
 *
 * Decisão P.O. 2026-05-06: rigor com meta 98% prevalece, MAS não pode
 * criar dead-end no fluxo. Botão registra `corpus_gap_bypass` em audit_log
 * para que a equipe SOLARIS possa medir frequência de gap e priorizar
 * curadoria de cobertura legal por NCM.
 *
 * Diferente do `NaoAplicavelBanner` (empresa não opera com produto):
 * `CorpusGapBanner` significa que a empresa COULD operar com NCM mas o
 * sistema reconhece sua própria limitação de cobertura legal.
 *
 * Refs:
 * - Issue #997 — Q.NCM Quality Gate (AC3 V1)
 * - Issue #1008 — V1.5 bypass com audit
 * - REGRA-ORQ-31 (meta 98% de confiança)
 * - REGRA-ORQ-29 (no_question protocol)
 */
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface CorpusGapBannerProps {
  /** Lista de NCMs do projeto que dispararam o gate. */
  ncms?: string[];
  /** Mensagem específica vinda do backend (se diferente da default). */
  alerta?: string | null;
  /**
   * V1.5 (Issue #1008): callback opcional para bypass com audit trail.
   * Quando ausente → comportamento V1 (bloqueio total, sem botão).
   * Quando presente → botão "Continuar com diagnóstico parcial" renderiza.
   */
  onAvancar?: () => void;
  /**
   * V1.5: label do próximo passo, derivado do operationType pelo caller.
   * Ex: "Questionário de Serviços" | "Questionário CNAE".
   * Se omitido → label genérico.
   */
  nextStepLabel?: string;
  /** V1.5: spinner no botão durante mutation. */
  isLoading?: boolean;
}

export default function CorpusGapBanner({
  ncms,
  alerta,
  onAvancar,
  nextStepLabel,
  isLoading = false,
}: CorpusGapBannerProps) {
  const ncmList = ncms && ncms.length > 0 ? ncms.join(", ") : "informado(s)";

  const defaultMessage =
    `Não foi possível recuperar legislação setorial específica para o(s) NCM(s) ${ncmList} ` +
    `com o nível de confiança exigido pela plataforma. ` +
    `Nossa equipe foi notificada automaticamente — o questionário ficará disponível ` +
    `assim que a cobertura legal for validada.`;

  const buttonLabel = nextStepLabel
    ? `Continuar para ${nextStepLabel} →`
    : "Continuar com diagnóstico parcial →";

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Alert className="border-amber-200 bg-amber-50 text-amber-900" data-testid="corpus-gap-banner">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertTitle className="text-amber-800 font-semibold text-base">
          Diagnóstico setorial em validação
        </AlertTitle>
        <AlertDescription className="mt-2 text-amber-700">
          {alerta ?? defaultMessage}
        </AlertDescription>
      </Alert>

      <div className="mt-4 text-xs text-muted-foreground">
        <p>
          A plataforma IA SOLARIS opera com meta de <strong>98% de confiança jurídica</strong>.
          Quando essa meta não pode ser alcançada para um NCM específico, preferimos
          comunicar a limitação a gerar perguntas sem base legal setorial validada.
        </p>
      </div>

      {/*
        V1.5 (Issue #1008): botão de bypass condicional.
        Renderiza apenas quando `onAvancar` é fornecido pelo caller — preserva
        compatibilidade com chamadas V1 que não passam o callback.
        Click registra `corpus_gap_bypass` no audit_log via caller (telemetria
        para curadoria SOLARIS priorizar cobertura legal por NCM).
      */}
      {onAvancar && (
        <div className="mt-6 flex justify-end">
          <Button
            variant="outline"
            onClick={onAvancar}
            disabled={isLoading}
            className="gap-2"
            data-testid="corpus-gap-bypass"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {buttonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
