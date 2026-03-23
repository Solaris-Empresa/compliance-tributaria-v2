/**
 * IA SOLARIS — Shadow Mode Utils
 * ─────────────────────────────────────────────────────────────────────────────
 * ADR-009: Utilitários de comparação determinística para o Shadow Mode.
 *
 * Usa serialização com chaves ordenadas recursivamente para evitar falsos
 * positivos causados por diferença de ordem de propriedades em objetos JSON.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Serializa um valor de forma determinística (chaves ordenadas recursivamente).
 * Evita falsos positivos em comparações de objetos JSON com chaves fora de ordem.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortRecursively(value));
}

function sortRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortRecursively);
  }

  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      result[key] = sortRecursively(obj[key]);
    }
    return result;
  }

  return value;
}

/**
 * Compara dois valores de forma determinística.
 * Retorna true se forem equivalentes (mesmo conteúdo, independente de ordem de chaves).
 */
export function areValuesEquivalent(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return stableStringify(a) === stableStringify(b);
}
