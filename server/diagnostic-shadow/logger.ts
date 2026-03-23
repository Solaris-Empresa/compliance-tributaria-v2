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
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  DiagnosticDivergenceLogInput,
  DiagnosticDivergenceLogger,
} from "./types";
import { getDb } from "../db";
import { diagnosticShadowDivergences } from "../../drizzle/schema";

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
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
