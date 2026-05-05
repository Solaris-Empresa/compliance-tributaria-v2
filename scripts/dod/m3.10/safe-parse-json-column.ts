/**
 * safe-parse-json-column.ts — Helper canônico para Lição #72
 *
 * Driver mysql2 auto-parseia colunas JSON do TiDB/MySQL retornando
 * objetos JavaScript já estruturados. Aplicar `JSON.parse(row.jsonColumn)`
 * sobre um objeto invoca `Object.prototype.toString()` → `"[object Object]"`
 * → `JSON.parse("[object Object]")` lança SyntaxError. Em try/catch ao redor,
 * o erro é silenciado e o output cai em fallback ([] ou {}).
 *
 * Caso canônico: bug em `scripts/dod-3780001.ts` (Sprint M3.10, Manus sandbox)
 * mascarou multi-fonte como `evidence.gaps[*].fonte = []` em todos os riscos
 * — falso negativo que propagou para Lição #69 (corrigida em PR #983).
 *
 * Pattern proibido:
 *   const ev = JSON.parse(row.evidence || '{}');  // ❌ throws em objeto
 *
 * Pattern correto (este helper):
 *   const ev = safeParseJsonColumn(row.evidence, {});
 *
 * Vinculadas:
 * - Lição #71 (.claude/rules/governance.md) — autor do script DoD valida o parser
 * - Lição #72 (.claude/rules/governance.md) — antipattern documentado
 * - PR #983 (M3.10 governance closure) — origem desta utility
 * - Issue #987 — recuperação dos scripts DoD
 */

/**
 * Parse defensivo de coluna JSON do TiDB/MySQL via driver mysql2.
 *
 * Aceita 3 formatos de input:
 * 1. Objeto JS já parseado (driver mysql2 default — caso esperado)
 * 2. String JSON serializada (drivers alternativos ou cache)
 * 3. null/undefined (coluna NULL no banco)
 *
 * Em qualquer caso de erro, retorna `fallback` SEM throw.
 *
 * @param raw — valor cru retornado pelo driver (row.jsonColumn)
 * @param fallback — valor a retornar se input for null/inválido/malformed
 * @returns objeto T parseado, ou fallback
 *
 * @example
 *   const ev = safeParseJsonColumn<{ gaps: Gap[] }>(row.evidence, { gaps: [] });
 *   const fontes = ev.gaps.map(g => g.fonte);
 */
export function safeParseJsonColumn<T>(raw: unknown, fallback: T): T {
  // Caso 1: null/undefined → fallback
  if (raw == null) return fallback;

  // Caso 2: objeto (caminho esperado com mysql2 default)
  if (typeof raw === "object") return raw as T;

  // Caso 3: string JSON — parse defensivo
  if (typeof raw === "string") {
    if (raw.length === 0) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  // Caso inesperado (number, boolean, etc.) → fallback
  return fallback;
}
