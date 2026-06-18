/**
 * shared/ncm-nbs-validation.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Helper único de validação NCM/NBS consumido por todos os formulários.
 * Consolidação D4 (épico NCM/NBS #1219) — evita divergência entre 3+ matchers.
 *
 * Formatos aceitos:
 *   NCM grupo:       NNNN          (ex: 8436, 2301, 1006)
 *   NCM subposição:  NNNN.NN       (ex: 1006.20, 2304.00)
 *   NCM específico:  NNNN.NN.NN    (ex: 8436.99.00, 1006.40.00)
 *
 *   NBS grupo:       N.NNNN        (ex: 1.0501)
 *   NBS subposição:  N.NNNN.NN     (ex: 1.0501.14)
 *   NBS específico:  N.NNNN.NN.NN  (ex: 1.0501.14.59)
 *
 * Decisões P.O.:
 *   - D2 (18/jun/2026): Aceitar subposição NNNN.NN — nível da lei + curado no backend
 *   - ADR-0035 §10: Aceitar grupo (4 dígitos) — GATE-NCM-NBS #1219 F1
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── NCM ────────────────────────────────────────────────────────────────────

/** Regex unificada NCM: grupo (4 díg.) | subposição (NNNN.NN) | específico (NNNN.NN.NN) */
export const NCM_REGEX = /^\d{4}$|^\d{4}\.\d{2}$|^\d{4}\.\d{2}\.\d{2}$/;

/** Valida se o código NCM está em formato aceito */
export function isValidNcm(code: string): boolean {
  return NCM_REGEX.test(code.trim());
}

/** Detecta se o código NCM é um grupo (4 dígitos) */
export function isNcmGroup(code: string): boolean {
  return /^\d{4}$/.test(code.trim());
}

/** Detecta se o código NCM é uma subposição (NNNN.NN) */
export function isNcmSubposition(code: string): boolean {
  return /^\d{4}\.\d{2}$/.test(code.trim());
}

/** Detecta se o código NCM é específico (NNNN.NN.NN) */
export function isNcmSpecific(code: string): boolean {
  return /^\d{4}\.\d{2}\.\d{2}$/.test(code.trim());
}

/** Retorna a granularidade do NCM para badge visual */
export function ncmGranularity(code: string): "grupo" | "subposição" | "específico" | null {
  const trimmed = code.trim();
  if (isNcmGroup(trimmed)) return "grupo";
  if (isNcmSubposition(trimmed)) return "subposição";
  if (isNcmSpecific(trimmed)) return "específico";
  return null;
}

// ─── NBS ────────────────────────────────────────────────────────────────────

/** Regex unificada NBS: grupo (N.NNNN) | subposição (N.NNNN.NN) | específico (N.NNNN.NN.NN) */
export const NBS_REGEX = /^\d\.\d{4}$|^\d\.\d{4}\.\d{2}$|^\d\.\d{4}\.\d{2}\.\d{2}$/;

/** Valida se o código NBS está em formato aceito */
export function isValidNbs(code: string): boolean {
  return NBS_REGEX.test(code.trim());
}

/** Detecta se o código NBS é um grupo (N.NNNN) */
export function isNbsGroup(code: string): boolean {
  return /^\d\.\d{4}$/.test(code.trim());
}

/** Detecta se o código NBS é uma subposição (N.NNNN.NN) */
export function isNbsSubposition(code: string): boolean {
  return /^\d\.\d{4}\.\d{2}$/.test(code.trim());
}

/** Detecta se o código NBS é específico (N.NNNN.NN.NN) */
export function isNbsSpecific(code: string): boolean {
  return /^\d\.\d{4}\.\d{2}\.\d{2}$/.test(code.trim());
}

/** Retorna a granularidade do NBS para badge visual */
export function nbsGranularity(code: string): "grupo" | "subposição" | "específico" | null {
  const trimmed = code.trim();
  if (isNbsGroup(trimmed)) return "grupo";
  if (isNbsSubposition(trimmed)) return "subposição";
  if (isNbsSpecific(trimmed)) return "específico";
  return null;
}

// ─── Mensagens de erro padronizadas ─────────────────────────────────────────

export const NCM_FORMAT_HINT = "Use NNNN (grupo), NNNN.NN (subposição) ou NNNN.NN.NN (ex: 8436, 1006.20, 1006.40.00)";
export const NBS_FORMAT_HINT = "Use N.NNNN (grupo), N.NNNN.NN (subposição) ou N.NNNN.NN.NN (ex: 1.0501, 1.0501.14, 1.0501.14.59)";
