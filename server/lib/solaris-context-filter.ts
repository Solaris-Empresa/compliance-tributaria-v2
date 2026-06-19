/**
 * solaris-context-filter.ts — F2 do épico Regime Tributário (ADR-0038)
 * ─────────────────────────────────────────────────────────────────────────────
 * FONTE ÚNICA (D5 · Lição #137) de filtragem das perguntas SOLARIS Onda 1 por
 * CONTEXTO do projeto: CNAE × regime tributário. Consolida o match de `cnae_groups`
 * hoje duplicado em C1/C3/C4 (db.getOnda1Questions / db.getSolarisQuestions /
 * onda1Injector) e adiciona a dimensão `tax_regimes` (coluna criada na F1, mig 0127).
 *
 * Semântica (ADR-0038 D1) — AND com fallback, 3 estados do CNAE:
 *   estado 1 — CNAE ausente (projeto sem CNAE)         → ignora a dimensão CNAE
 *   estado 2 — CNAE resolve p/ genérico/fallback (V-10) → ignora a dimensão CNAE
 *   estado 3 — CNAE mapeado a categoria específica     → dimensão CNAE aplica (match)
 *
 *   exibe SE  (dim CNAE)  E  (dim regime)
 *     dim CNAE   = cnaeGroups null/[] (universal) OU casa CNAE (estado 3) OU ignorada (1/2)
 *     dim regime = taxRegimes null/[] (universal) OU regime do projeto ∈ taxRegimes
 *
 * "não-mapeado" (estados 1/2) = não derruba a pergunta pela falta de CNAE — evita
 * falso negativo silencioso enquanto a cobertura CNAE é parcial (#1510 V-10-FALLBACK).
 *
 * Helper PURO (sem dependência de banco) — F3 substitui os filtros inline por ele.
 */

/** Campos da pergunta usados na filtragem (subset de SolarisQuestion). */
export interface SolarisFilterFields {
  cnaeGroups?: unknown; // JSON: string[] | null (mysql2 auto-parseia; Lição #72)
  taxRegimes?: unknown; // JSON: string[] | null
}

export interface SolarisFilterContext {
  /** CNAE primário do projeto. null/"" = ausente (estado 1). */
  cnae?: string | null;
  /**
   * false = o CNAE resolveu para categoria genérica/fallback (V-10, estado 2) →
   * a dimensão CNAE é ignorada. Default `true` (estado 3 — aplica o match) para
   * preservar o comportamento legado de `getOnda1Questions(cnaeCode)`.
   */
  cnaeMapped?: boolean;
  /** Regime tributário do projeto: simples_nacional | lucro_presumido | lucro_real | ... */
  regime?: string | null;
}

/** Parse defensivo de coluna JSON (Lição #72 — mysql2 auto-parseia; NÃO usar JSON.parse cego). */
function parseStringArray(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "object") return []; // objeto não-array → trata como vazio (universal)
  if (typeof raw === "string") {
    try {
      const p: unknown = JSON.parse(raw);
      return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Dimensão CNAE — espelha `db.getOnda1Questions` (cnae null/[] = universal; match bidirecional). */
export function matchesCnaeDimension(
  cnaeGroups: unknown,
  ctx: SolarisFilterContext,
): boolean {
  const cnae = (ctx.cnae ?? "").trim();
  if (!cnae) return true; // estado 1 — ausente
  if (ctx.cnaeMapped === false) return true; // estado 2 — genérico/fallback (V-10)
  // estado 3 — aplica o match
  const groups = parseStringArray(cnaeGroups);
  if (groups.length === 0) return true; // universal
  return groups.some((g) => cnae.startsWith(g) || g.startsWith(cnae));
}

/** Dimensão regime — taxRegimes null/[] = universal; regime do projeto desconhecido = permissivo. */
export function matchesRegimeDimension(
  taxRegimes: unknown,
  regime?: string | null,
): boolean {
  const regimes = parseStringArray(taxRegimes);
  if (regimes.length === 0) return true; // null/[] = universal
  const r = (regime ?? "").trim();
  if (!r) return true; // regime do projeto desconhecido → permissivo (evita falso negativo)
  return regimes.includes(r);
}

/** AND das duas dimensões (D1). */
export function matchesSolarisContext(
  q: SolarisFilterFields,
  ctx: SolarisFilterContext,
): boolean {
  return (
    matchesCnaeDimension(q.cnaeGroups, ctx) &&
    matchesRegimeDimension(q.taxRegimes, ctx.regime)
  );
}

/** Filtra a lista de perguntas pelo contexto (CNAE × regime). Fonte única (D5). */
export function filterSolarisByContext<T extends SolarisFilterFields>(
  questions: T[],
  ctx: SolarisFilterContext,
): T[] {
  return questions.filter((q) => matchesSolarisContext(q, ctx));
}
