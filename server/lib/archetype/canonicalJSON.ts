/**
 * canonicalJSON.ts — Serialização canônica determinística
 *
 * Fonte canônica: CANONICAL-JSON-SPEC.md §2 (regras C-1 a C-6) + §3 (algoritmo) + §7 (arrays)
 *
 * Regras vinculantes (P.O. 2026-04-24):
 * - C-1: chaves ordenadas recursivamente (lexicographic Unicode codepoint)
 * - C-2: arrays PRESERVAM ordem (função array-agnóstica — ordenação é Wrapper)
 * - C-3: sem whitespace variável (single-line compacto)
 * - C-4: tipos fixos JSON (string, number, boolean, null, array, object);
 *        Date, Map, Set, undefined PROIBIDOS
 * - C-5: `null` explícito (`undefined` lança erro)
 * - C-6: datas serializadas como strings ISO-8601 UTC (caller responsibility)
 *
 * Invariantes (§9):
 * - I-C1: canonicalJSON(x) === canonicalJSON(x) — idempotência byte-a-byte
 * - I-C2: output UTF-8 single-line sem whitespace externo
 * - I-C5: NUNCA re-ordena arrays — implementação que o faz é defeito
 */

// ─── Tipos permitidos (C-4) ────────────────────────────────────────────────

export type CanonicalPrimitive = string | number | boolean | null;
export type CanonicalValue =
  | CanonicalPrimitive
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

// ─── Erro explícito para tipos proibidos ───────────────────────────────────

export class CanonicalJSONError extends Error {
  constructor(message: string) {
    super(`[canonicalJSON] ${message}`);
    this.name = "CanonicalJSONError";
  }
}

// ─── §4 — Serialização de números (formato decimal mínimo) ─────────────────

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) {
    throw new CanonicalJSONError(
      `número não-finito proibido (NaN/Infinity/-Infinity): ${String(n)}`,
    );
  }
  // Normalização de -0 → 0
  if (Object.is(n, -0)) return "0";
  // Number.prototype.toString retorna formato decimal mínimo
  // (ex.: 0.5 → "0.5"; 3.14 → "3.14"; 42 → "42")
  return n.toString();
}

// ─── §5 — Escape de strings via JSON.stringify nativo ──────────────────────
// JSON.stringify produz escape correto para C-5:
// - aspas, barras invertidas, controle <0x20 → \u00XX
// - caracteres não-ASCII (acentos, UTF-8) → literal UTF-8 direto
// Este é o comportamento default de Node/browsers e é estável cross-runtime.

function formatString(s: string): string {
  return JSON.stringify(s);
}

// ─── §3 — Algoritmo principal ──────────────────────────────────────────────

/**
 * Serializa `value` em forma canônica conforme regras C-1 a C-6.
 *
 * - Arrays PRESERVAM ordem (use canonicalizeForHash se ordenação for necessária)
 * - Chaves de objetos ordenadas lexicograficamente (recursivamente)
 * - `undefined` lança CanonicalJSONError
 * - Date/Map/Set lançam CanonicalJSONError
 *
 * @throws CanonicalJSONError em tipo proibido ou valor não-finito
 */
export function canonicalJSON(value: CanonicalValue): string {
  return canonicalize(value);
}

function canonicalize(value: unknown): string {
  // C-5: null explícito
  if (value === null) return "null";

  // C-4: undefined proibido
  if (value === undefined) {
    throw new CanonicalJSONError(
      "undefined proibido — caller deve omitir ou usar null explícito (C-5)",
    );
  }

  // Booleanos
  if (typeof value === "boolean") return value ? "true" : "false";

  // Números (§4)
  if (typeof value === "number") return formatNumber(value);

  // Strings (§5 — escape via JSON.stringify nativo)
  if (typeof value === "string") return formatString(value);

  // Objetos e arrays (ordem abaixo importa: Array.isArray antes de typeof object)
  if (Array.isArray(value)) {
    // C-2: preserva ordem — NÃO re-ordena
    const parts: string[] = [];
    for (const item of value) {
      parts.push(canonicalize(item));
    }
    return "[" + parts.join(",") + "]";
  }

  // C-4: tipos não-JSON proibidos
  if (value instanceof Date) {
    throw new CanonicalJSONError(
      "Date proibido — caller deve converter para string ISO-8601 UTC (C-6) antes de serializar",
    );
  }
  if (value instanceof Map || value instanceof Set) {
    throw new CanonicalJSONError(
      `${value.constructor.name} proibido — converter para plain object/array antes (C-4)`,
    );
  }

  if (typeof value === "object") {
    // C-1: chaves ordenadas lexicograficamente (Unicode codepoint)
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined) {
        throw new CanonicalJSONError(
          `undefined em chave "${k}" proibido (C-4/C-5) — caller deve remover a chave ou usar null`,
        );
      }
      parts.push(formatString(k) + ":" + canonicalize(v));
    }
    return "{" + parts.join(",") + "}";
  }

  // Function, Symbol, BigInt, etc.
  throw new CanonicalJSONError(
    `tipo não suportado: ${typeof value} (C-4 exige apenas string/number/boolean/null/array/object)`,
  );
}
