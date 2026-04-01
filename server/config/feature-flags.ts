/**
 * Feature Flags — IA SOLARIS v5.0
 *
 * Gate 0 D3: features com risk score ≥ medium devem ter feature flag.
 * Ciclo de vida:
 *   1. Feature implementada → flag desabilitada por padrão (false)
 *   2. Habilitar para P.O. apenas → validar em produção
 *   3. Habilitar para todos → se MTTR e CFR estáveis
 *   4. Remover flag → PR de chore após 1 sprint estável
 *
 * Governança: docs/GATES-DOCUMENTACAO-COMPLETA-v5.md § 10
 */

export const FEATURE_FLAGS: Record<string, boolean> = {
  // Sprint N — G17 validado em produção (projeto 2310001, 3 gaps inseridos)
  'g17-solaris-gap-engine': true,

  // Sprint N — G11 fonte_risco: implementado (PR #267)
  'g11-fonte-risco': true,

  // Sprint N — G15 badge ONDA_BADGE nos questionários (Issue #192)
  // false = badge oculto; true = badge visível para P.O. validar
  'g15-fonte-perguntas': true,

  // Bloqueio permanente — aguarda UAT com advogados (Issue #61)
  'diagnostic-read-mode-new': false,

  // Bloqueio permanente — aguarda F-04 Fase 3 (Issue #56)
  'f04-fase3': false,
};

/**
 * Verifica se uma feature está habilitada.
 * Uso em fire-and-forget ou procedures de risco medium/high:
 *
 * ```typescript
 * if (!isFeatureEnabled('g17-solaris-gap-engine', projectId)) {
 *   return { inserted: 0, skipped: true };
 * }
 * ```
 *
 * @param flag - Nome da feature flag
 * @param _projectId - ID do projeto (reservado para rollout gradual futuro)
 */
export function isFeatureEnabled(flag: string, _projectId?: number): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}
