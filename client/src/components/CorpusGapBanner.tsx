/**
 * CorpusGapBanner — Issue #997 Q.NCM Quality Gate (V1: Bloqueio total)
 *
 * Exibido quando `getProductQuestions` retorna `motivo: "corpus_gap_setorial"`,
 * indicando que o corpus RAG não cobre legislação setorial específica para
 * o NCM informado E SOLARIS também não cobre o CNAE do projeto.
 *
 * V1 (Issue #997 AC3): bloqueio total — sem botão de bypass. Usuário fica
 * bloqueado nesta etapa até que equipe SOLARIS valide cobertura legal.
 * Decisão P.O. 2026-05-06: rigor com meta 98% prevalece sobre UX nesta versão.
 *
 * V2 (backlog, sem data): bypass com audit_log de override. Aguarda demanda
 * operacional real para priorizar.
 *
 * Mensagem é deliberadamente honesta (não dizer "legislação em definição" —
 * a legislação existe, está promulgada). O sistema reconhece que não conseguiu
 * recuperar legislação setorial com confiança suficiente para gerar perguntas
 * com base legal específica (REGRA-ORQ-31 meta 98%).
 *
 * Diferente do `NaoAplicavelBanner` (empresa não opera com produto):
 * `CorpusGapBanner` significa que a empresa COULD operar com NCM mas o
 * sistema reconhece sua própria limitação de cobertura legal.
 *
 * Refs:
 * - Issue #997 — Q.NCM Quality Gate (AC3 V1)
 * - REGRA-ORQ-31 (meta 98% de confiança)
 * - REGRA-ORQ-29 (no_question protocol)
 * - REGRA-ORQ-21 (última spec é formal — V1 não inclui bypass)
 */
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CorpusGapBannerProps {
  /** Lista de NCMs do projeto que dispararam o gate. */
  ncms?: string[];
  /** Mensagem específica vinda do backend (se diferente da default). */
  alerta?: string | null;
}

export default function CorpusGapBanner({
  ncms,
  alerta,
}: CorpusGapBannerProps) {
  const ncmList = ncms && ncms.length > 0 ? ncms.join(", ") : "informado(s)";

  const defaultMessage =
    `Não foi possível recuperar legislação setorial específica para o(s) NCM(s) ${ncmList} ` +
    `com o nível de confiança exigido pela plataforma. ` +
    `Nossa equipe foi notificada automaticamente — o questionário ficará disponível ` +
    `assim que a cobertura legal for validada.`;

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
        V1: bloqueio total — sem botão "Avançar".
        Usuário aguarda equipe SOLARIS validar cobertura legal.
        V2 (backlog): bypass com audit_log de override.
      */}
    </div>
  );
}
