/**
 * canonicalizeForHash.ts — Wrapper que ordena arrays NEUTROS antes do hash
 *
 * Fonte canônica: CANONICAL-JSON-SPEC.md §7 (classificação neutro vs semântico)
 *                 SPEC-RUNNER-RODADA-D.md §6.2.1 (política por classe de array)
 *
 * Regras vinculantes (Q-D5 RESOLVIDA 2026-04-24):
 * - canonicalJSON é array-agnóstico (I-C5)
 * - canonicalizeForHash ordena APENAS arrays listados como NEUTROS (§7.3)
 * - Arrays SEMÂNTICOS (rules[], enums.*[], ncms_principais[], etc.) NÃO são
 *   tocados — ordem original preservada
 *
 * Pipeline de uso:
 *   perfil_hash = sha256(canonicalJSON(canonicalizeForHash(archetype)))
 *
 * Manifesto (rules_hash) NÃO usa este wrapper — todos seus arrays são
 * semânticos por definição (§3.3 MANIFEST).
 */

import type { CanonicalValue } from "./canonicalJSON";

// ─── Arrays NEUTROS do arquétipo — CANONICAL-JSON-SPEC §7.3 ────────────────
// Sempre que estes nomes aparecerem como chaves no objeto serializado,
// seus valores de array são ordenados lexicograficamente antes do hash.

const NEUTRAL_ARRAY_KEYS: ReadonlySet<string> = new Set([
  "objeto",
  "territorio",
  "tipo_de_relacao",
  "orgao_regulador",
  "subnatureza_setorial",
  "regime_especifico",
] as const);

// ─── Função principal ──────────────────────────────────────────────────────

/**
 * Aplica ordenação lexicográfica apenas em arrays explicitamente marcados
 * como NEUTROS (§7.3). Retorna estrutura nova (imutabilidade).
 *
 * Função idempotente: canonicalizeForHash(canonicalizeForHash(x)) === canonicalizeForHash(x).
 *
 * NÃO recursa profundamente em arrays (arrays neutros contêm apenas strings/números).
 * Recursa em objetos aninhados apenas se houver — v1 não tem, mas guard defensivo.
 */
export function canonicalizeForHash(value: CanonicalValue): CanonicalValue {
  if (value === null) return null;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    // Arrays no top-level sem classificação: preserva ordem (comportamento conservador)
    return value.map(canonicalizeForHash);
  }

  // Object: aplica ordenação em arrays neutros; recursa em demais valores
  const obj = value as { [key: string]: CanonicalValue };
  const out: { [key: string]: CanonicalValue } = {};
  for (const [k, v] of Object.entries(obj)) {
    if (NEUTRAL_ARRAY_KEYS.has(k) && Array.isArray(v)) {
      // Clone + sort estável (lexicographic codepoint, idêntico a canonicalJSON C-1)
      out[k] = [...v].sort((a, b) => {
        // Apenas strings/números esperados em arrays neutros; guard defensivo
        const as = typeof a === "string" ? a : JSON.stringify(a);
        const bs = typeof b === "string" ? b : JSON.stringify(b);
        return as < bs ? -1 : as > bs ? 1 : 0;
      });
    } else {
      out[k] = canonicalizeForHash(v);
    }
  }
  return out;
}
