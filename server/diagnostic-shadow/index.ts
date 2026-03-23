/**
 * IA SOLARIS — Shadow Mode Barrel Export
 * ADR-009: Ponto de entrada único para o módulo de Shadow Mode.
 */

export type {
  FlowVersion,
  DiagnosticReadMode,
  DiagnosticShadowResult,
  DiagnosticDivergenceLogInput,
  DiagnosticDivergenceLogger,
} from "./types";

export {
  readLegacyDiagnosticSource,
  readNewDiagnosticSource,
  determineShadowFlowVersion,
  type ProjectRowForShadow,
} from "./readers";

export { areValuesEquivalent, stableStringify } from "./utils";

export {
  ConsoleDiagnosticDivergenceLogger,
  DbDiagnosticDivergenceLogger,
  createDivergenceLogger,
} from "./logger";

export {
  runShadowComparison,
  compareDiagnosticSources,
  type ShadowComparisonSummary,
} from "./shadow";
