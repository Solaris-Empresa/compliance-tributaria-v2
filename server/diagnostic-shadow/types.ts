/**
 * IA SOLARIS — Shadow Mode Types
 * ─────────────────────────────────────────────────────────────────────────────
 * ADR-009: Shadow Mode para getDiagnosticSource.
 *
 * Tipos base compartilhados por todos os módulos do Shadow Mode.
 * NÃO altera comportamento funcional — apenas define contratos de tipos.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type FlowVersion = "v1" | "v3" | "hybrid" | "none";

/**
 * Modo de leitura do adaptador de diagnóstico.
 * Controlado pela variável de ambiente DIAGNOSTIC_READ_MODE.
 *
 * - legacy: lê apenas colunas legadas (briefingContent, riskMatricesData, actionPlansData)
 * - shadow: lê legadas + novas, compara, loga divergências, retorna legadas (produção segura)
 * - new:    lê apenas novas colunas V1/V3 (ativar somente após divergência = 0%)
 */
export type DiagnosticReadMode = "legacy" | "shadow" | "new";

/**
 * Resultado normalizado de leitura de diagnóstico para comparação no Shadow Mode.
 * Contém apenas os 3 campos comparáveis (briefing, matrizes, planos).
 * Não substitui DiagnosticSource — é usado internamente pelo comparador.
 */
export interface DiagnosticShadowResult {
  flowVersion: FlowVersion;

  /** Conteúdo do briefing (markdown ou null) */
  briefingContent: string | null;
  /** Matrizes de risco (JSON ou null) */
  riskMatricesData: unknown | null;
  /** Planos de ação (JSON ou null) */
  actionPlansData: unknown | null;

  /** Rastreabilidade: qual coluna/tabela foi a fonte de cada campo */
  source: {
    briefing: string | null;
    riskMatrices: string | null;
    actionPlans: string | null;
  };
}

/** Input para o logger de divergência */
export interface DiagnosticDivergenceLogInput {
  projectId: number;
  flowVersion: FlowVersion;
  field: "briefingContent" | "riskMatricesData" | "actionPlansData";
  legacySourceColumn: string | null;
  newSourceColumn: string | null;
  legacyValue: unknown;
  newValue: unknown;
  reason: string;
  timestamp?: string;
}

/** Contrato do logger de divergência */
export interface DiagnosticDivergenceLogger {
  log(input: DiagnosticDivergenceLogInput): Promise<void>;
}
