/**
 * tracer.ts — Tracing Estruturado para o Pipeline CNAE Discovery
 *
 * Fornece rastreamento detalhado de cada chamada ao pipeline, com:
 * - requestId único por chamada (UUID v4 curto)
 * - Etapas com latência individual (ms)
 * - Nível de log configurável por ambiente
 * - Saída JSON estruturada para facilitar grep/parsing em logs de produção
 *
 * Uso:
 *   const trace = createTrace("extractCnaes", { projectId: 123 });
 *   trace.step("embedding_start");
 *   // ... operação ...
 *   trace.step("embedding_done", { cnaeCount: 20 });
 *   trace.finish("ok", { cnaesReturned: 5 });
 *
 * Sprint v5.5.0
 */

/** Nível de log: "debug" emite todos os steps; "info" apenas start/finish; "off" desabilita */
type LogLevel = "debug" | "info" | "off";

/** Uma etapa do trace com timestamp e dados extras */
interface TraceStep {
  step: string;
  t: number;       // ms desde início do trace
  data?: Record<string, unknown>;
}

/** Resultado final do trace */
interface TraceResult {
  requestId: string;
  operation: string;
  status: "ok" | "error" | "fallback" | "timeout";
  totalMs: number;
  steps: TraceStep[];
  context: Record<string, unknown>;
  error?: string;
}

/** Gera um ID curto de 8 chars para identificar a requisição nos logs */
function shortId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/** Determina o nível de log com base no ambiente */
function getLogLevel(): LogLevel {
  if (process.env.TRACE_LEVEL) {
    return process.env.TRACE_LEVEL as LogLevel;
  }
  // Em produção: "info" (apenas start/finish); em dev: "debug" (todos os steps)
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/**
 * Cria um trace para uma operação do pipeline.
 *
 * @param operation - Nome da operação (ex: "extractCnaes")
 * @param context - Dados de contexto fixos (ex: projectId, userId)
 */
export function createTrace(
  operation: string,
  context: Record<string, unknown> = {}
) {
  const requestId = shortId();
  const startTime = Date.now();
  const steps: TraceStep[] = [];
  const level = getLogLevel();

  // Log de início
  if (level !== "off") {
    console.log(
      JSON.stringify({
        trace: "start",
        requestId,
        operation,
        ...context,
        ts: new Date().toISOString(),
      })
    );
  }

  return {
    requestId,

    /**
     * Registra uma etapa do trace com latência desde o início.
     * Em nível "debug" emite log imediato; em "info" acumula silenciosamente.
     */
    step(name: string, data?: Record<string, unknown>) {
      const t = Date.now() - startTime;
      steps.push({ step: name, t, ...(data ? { data } : {}) });

      if (level === "debug") {
        console.log(
          JSON.stringify({
            trace: "step",
            requestId,
            operation,
            step: name,
            t,
            ...(data ?? {}),
          })
        );
      }
    },

    /**
     * Finaliza o trace e emite o log de conclusão.
     * Sempre emitido independente do nível de log (exceto "off").
     */
    finish(
      status: TraceResult["status"],
      data?: Record<string, unknown>,
      errorMsg?: string
    ): TraceResult {
      const totalMs = Date.now() - startTime;
      const result: TraceResult = {
        requestId,
        operation,
        status,
        totalMs,
        steps,
        context,
        ...(errorMsg ? { error: errorMsg } : {}),
      };

      if (level !== "off") {
        console.log(
          JSON.stringify({
            trace: "finish",
            requestId,
            operation,
            status,
            totalMs,
            stepCount: steps.length,
            ...(data ?? {}),
            ...(errorMsg ? { error: errorMsg } : {}),
            ...context,
            ts: new Date().toISOString(),
          })
        );
      }

      return result;
    },

    /**
     * Finaliza o trace com status de erro e emite via console.error.
     * Sempre visível nos logs independente do nível.
     */
    error(errorMsg: string, data?: Record<string, unknown>): TraceResult {
      const totalMs = Date.now() - startTime;
      const result: TraceResult = {
        requestId,
        operation,
        status: "error",
        totalMs,
        steps,
        context,
        error: errorMsg,
      };

      // Erros sempre emitidos via console.error para máxima visibilidade
      console.error(
        JSON.stringify({
          trace: "error",
          requestId,
          operation,
          totalMs,
          stepCount: steps.length,
          error: errorMsg,
          ...(data ?? {}),
          ...context,
          ts: new Date().toISOString(),
          // Snapshot das etapas para diagnóstico completo
          steps: steps.map((s) => `${s.step}@${s.t}ms`).join(" → "),
        })
      );

      return result;
    },
  };
}
