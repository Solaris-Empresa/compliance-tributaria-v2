/**
 * IA SOLARIS — Shadow Mode Logger
 * ─────────────────────────────────────────────────────────────────────────────
 * ADR-009: Logger de divergência para o Shadow Mode.
 *
 * Dois loggers disponíveis:
 * - ConsoleDiagnosticDivergenceLogger: loga no console (fallback / desenvolvimento)
 * - DbDiagnosticDivergenceLogger: persiste na tabela diagnostic_shadow_divergences
 *
 * O logger NUNCA derruba o fluxo principal — erros são capturados silenciosamente.
 *
 * Alerta automático: quando uma divergência crítica é detectada, o owner é
 * notificado via notifyOwner(). Falha silenciosa — não afeta o fluxo principal.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  DiagnosticDivergenceLogInput,
  DiagnosticDivergenceLogger,
} from "./types";
import { getDb } from "../db";
import { diagnosticShadowDivergences } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
}

/**
 * Determina se uma divergência é crítica com base no campo e motivo.
 * Critério: campo de conteúdo principal (briefing, riskMatrices, actionPlans)
 * com valores divergentes não-nulos em ambos os lados.
 */
function isCriticalDivergence(input: DiagnosticDivergenceLogInput): boolean {
  const criticalFields = ["briefingContent", "riskMatricesData", "actionPlansData"];
  const fieldIsCritical = criticalFields.some(f => input.field?.includes(f));
  const bothNonNull = input.legacyValue !== null && input.newValue !== null;
  const reasonIndicatesCritical =
    input.reason?.toLowerCase().includes("critical") ||
    input.reason?.toLowerCase().includes("crítico") ||
    input.reason?.toLowerCase().includes("mismatch");
  return fieldIsCritical && bothNonNull || reasonIndicatesCritical;
}

/**
 * Logger de console — usado em desenvolvimento ou como fallback.
 * Não persiste dados, apenas emite console.warn.
 */
export class ConsoleDiagnosticDivergenceLogger
  implements DiagnosticDivergenceLogger
{
  async log(input: DiagnosticDivergenceLogInput): Promise<void> {
    const payload = {
      ...input,
      timestamp: input.timestamp ?? new Date().toISOString(),
      legacyValue: safeJson(input.legacyValue),
      newValue: safeJson(input.newValue),
    };
    console.warn("[diagnostic-shadow-divergence]", JSON.stringify(payload));
  }
}

/**
 * Logger persistente — persiste na tabela diagnostic_shadow_divergences.
 * Usado em produção com DIAGNOSTIC_READ_MODE=shadow.
 * Erros de persistência são capturados silenciosamente para não derrubar o fluxo.
 *
 * Alerta automático: divergências críticas disparam notifyOwner() de forma
 * assíncrona e silenciosa (falha não propaga).
 */
export class DbDiagnosticDivergenceLogger implements DiagnosticDivergenceLogger {
  async log(input: DiagnosticDivergenceLogInput): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        console.warn("[diagnostic-shadow-logger] DB não disponível, usando console fallback");
        console.warn("[diagnostic-shadow-divergence]", JSON.stringify(input));
        return;
      }

      await db.insert(diagnosticShadowDivergences).values({
        projectId: input.projectId,
        flowVersion: input.flowVersion,
        fieldName: input.field,
        legacySourceColumn: input.legacySourceColumn ?? null,
        newSourceColumn: input.newSourceColumn ?? null,
        legacyValueJson: input.legacyValue !== undefined ? input.legacyValue : null,
        newValueJson: input.newValue !== undefined ? input.newValue : null,
        reason: input.reason,
        createdAt: new Date(input.timestamp ?? new Date().toISOString()),
      });

      // Alerta automático para divergências críticas — "Decisão sem métrica volta ao modelo antigo."
      if (isCriticalDivergence(input)) {
        notifyOwner({
          title: "🚨 [Shadow Mode] Divergência crítica detectada",
          content: [
            `Projeto #${input.projectId} | Campo: ${input.field} | Versão: ${input.flowVersion}`,
            `Motivo: ${input.reason}`,
            `Valor legado: ${safeJson(input.legacyValue).substring(0, 200)}`,
            `Valor novo: ${safeJson(input.newValue).substring(0, 200)}`,
            "",
            "Acesse o Shadow Monitor para detalhes: /admin/shadow-monitor",
            "AÇÃO REQUERIDA: verificar antes de ativar modo 'new'.",
          ].join("\n"),
        }).catch(() => {
          // Falha silenciosa — notificação não derruba o fluxo principal
          console.warn("[diagnostic-shadow-logger] Falha ao enviar alerta de divergência crítica");
        });
      }
    } catch (err) {
      // Falha no logger NÃO derruba o fluxo principal
      console.error("[diagnostic-shadow-logger] Falha ao persistir divergência:", err);
    }
  }
}

/**
 * Factory: retorna o logger correto baseado no ambiente.
 * Em produção usa DbLogger; em testes usa ConsoleLogger.
 */
export function createDivergenceLogger(): DiagnosticDivergenceLogger {
  if (process.env.NODE_ENV === "test") {
    return new ConsoleDiagnosticDivergenceLogger();
  }
  return new DbDiagnosticDivergenceLogger();
}
