/**
 * gap-to-rule-mapper.ts — Sprint Z-10 / ACL Gap→Risk v2
 *
 * Anti-Corruption Layer: traduz Gap (compliance operacional) em GapRule (normativo).
 *
 * Lei central do produto:
 *   1 candidato  → mapped
 *   2+ candidatos → ambiguous
 *   0 candidatos  → unmapped
 *
 * PROIBIDO: score, confidence, ranking, fallback por domínio, "melhor candidato".
 * PROIBIDO: DOMAIN_FALLBACK, sort(...)[0], qualquer heurística de seleção.
 *
 * allowLayerInference=true só pode inferir source_origin (fonte), NUNCA categoria.
 */

import type {
  GapInput,
  GapMappingResult,
  MapGapsToRulesResult,
  CategoryACL,
} from "../schemas/gap-risk.schemas";
import type { GapRule } from "./risk-engine-v4";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MapperOptions {
  allowLayerInference?: boolean;
}

export interface CategoryResolver {
  findByCodigo(codigo: string): Promise<CategoryACL | undefined>;
  findByArticle(normalizedArticle: string): Promise<CategoryACL[]>;
}

// ---------------------------------------------------------------------------
// Normalização de artigo
// ---------------------------------------------------------------------------

export function normalizeArticle(ref: string): string {
  const match = ref.match(/arts?\.?\s*[\d\-,\s]+/i);
  if (!match) return ref.toLowerCase().trim();
  return match[0].toLowerCase().replace(/\s+/g, "");
}

// ---------------------------------------------------------------------------
// Filtros semânticos (allowed_domains / allowed_gap_types)
// ---------------------------------------------------------------------------

function applySemanticFilters(
  candidates: CategoryACL[],
  gap: GapInput,
): { filtered: CategoryACL[]; hadFilters: boolean } {
  let hadFilters = false;
  let filtered = candidates;

  if (gap.domain) {
    const withDomainFilter = filtered.filter(
      (c) => c.allowedDomains !== null && c.allowedDomains !== undefined,
    );
    if (withDomainFilter.length > 0) {
      hadFilters = true;
      filtered = filtered.filter((c) => {
        if (c.allowedDomains === null || c.allowedDomains === undefined) return false;
        return c.allowedDomains.includes(gap.domain!);
      });
    }
  }

  if (gap.gapType) {
    const withTypeFilter = filtered.filter(
      (c) => c.allowedGapTypes !== null && c.allowedGapTypes !== undefined,
    );
    if (withTypeFilter.length > 0) {
      hadFilters = true;
      filtered = filtered.filter((c) => {
        if (c.allowedGapTypes === null || c.allowedGapTypes === undefined) return false;
        return c.allowedGapTypes.includes(gap.gapType!);
      });
    }
  }

  return { filtered, hadFilters };
}

// ---------------------------------------------------------------------------
// GapToRuleMapper — classe principal
// ---------------------------------------------------------------------------

export class GapToRuleMapper {
  constructor(
    private resolver: CategoryResolver,
    private options: MapperOptions = {},
  ) {}

  /**
   * Mapeia um único gap. Retorna APENAS: mapped | ambiguous | unmapped.
   * NUNCA retorna mapped com heurística. NUNCA usa fallback por domínio.
   */
  async mapOne(gap: GapInput): Promise<GapMappingResult> {
    // Skip compliant/nao_aplicavel — não geram risco
    if (
      gap.gapStatus === "compliant" ||
      gap.gapStatus === "nao_aplicavel"
    ) {
      return {
        gapId: gap.id,
        status: "unmapped",
        ruleCode: null,
        categoria: null,
        reason: "skip: gapStatus=" + gap.gapStatus,
      };
    }

    // ── CASO A: categoria explícita no gap ──────────────────────────
    if (gap.categoria) {
      const cat = await this.resolver.findByCodigo(gap.categoria);
      if (cat && cat.status === "ativo") {
        return {
          gapId: gap.id,
          status: "mapped",
          ruleCode: cat.ruleCode ?? cat.codigo,
          categoria: cat.codigo,
          reason: `explicit: gap.categoria="${gap.categoria}" encontrada em risk_categories`,
        };
      }
      return {
        gapId: gap.id,
        status: "unmapped",
        ruleCode: null,
        categoria: null,
        reason: `explicit_not_found: gap.categoria="${gap.categoria}" inexistente ou inativa em risk_categories`,
      };
    }

    // ── CASO B: resolução por artigo ────────────────────────────────
    if (gap.sourceReference) {
      const normalized = normalizeArticle(gap.sourceReference);
      const candidates = await this.resolver.findByArticle(normalized);

      if (candidates.length === 0) {
        return {
          gapId: gap.id,
          status: "unmapped",
          ruleCode: null,
          categoria: null,
          reason: `article_not_found: artigo="${normalized}" sem candidatos em risk_categories`,
        };
      }

      const { filtered, hadFilters } = applySemanticFilters(candidates, gap);

      if (filtered.length === 1) {
        const cat = filtered[0];
        return {
          gapId: gap.id,
          status: "mapped",
          ruleCode: cat.ruleCode ?? cat.codigo,
          categoria: cat.codigo,
          reason: `article: artigo="${normalized}" resolveu para "${cat.codigo}"`,
        };
      }

      if (filtered.length > 1) {
        return {
          gapId: gap.id,
          status: "ambiguous",
          ruleCode: null,
          categoria: null,
          reason: `ambiguous: artigo="${normalized}" tem ${filtered.length} candidatos: ${filtered.map((c) => c.codigo).join(", ")}`,
        };
      }

      // filtered.length === 0
      if (hadFilters) {
        return {
          gapId: gap.id,
          status: "unmapped",
          ruleCode: null,
          categoria: null,
          reason: `filtered_out: artigo="${normalized}" tinha ${candidates.length} candidatos, filtros semânticos eliminaram todos`,
        };
      }

      return {
        gapId: gap.id,
        status: "ambiguous",
        ruleCode: null,
        categoria: null,
        reason: `ambiguous: artigo="${normalized}" tem ${candidates.length} candidatos sem filtro semântico`,
      };
    }

    // ── Sem categoria, sem artigo ───────────────────────────────────
    return {
      gapId: gap.id,
      status: "unmapped",
      ruleCode: null,
      categoria: null,
      reason: "unmapped: gap sem categoria e sem sourceReference",
    };
  }

  /**
   * Mapeia múltiplos gaps. Gaps compliant/nao_aplicavel são ignorados.
   */
  async mapMany(gaps: GapInput[]): Promise<MapGapsToRulesResult> {
    const { allowLayerInference = false } = this.options;
    const mappedRules: GapRule[] = [];
    const reviewQueue: GapMappingResult[] = [];
    let mapped = 0;
    let ambiguous = 0;
    let unmapped = 0;

    for (const gap of gaps) {
      if (
        gap.gapStatus === "compliant" ||
        gap.gapStatus === "nao_aplicavel"
      ) {
        continue;
      }

      const result = await this.mapOne(gap);
      reviewQueue.push(result);

      if (result.status === "mapped" && result.categoria) {
        mapped++;
        mappedRules.push(toGapRule(gap, result, allowLayerInference));
      } else if (result.status === "ambiguous") {
        ambiguous++;
      } else {
        unmapped++;
      }
    }

    return {
      mappedRules,
      reviewQueue,
      stats: { total: reviewQueue.length, mapped, ambiguous, unmapped },
    };
  }
}

// ---------------------------------------------------------------------------
// Conversão GapInput → GapRule
//
// allowLayerInference=true permite inferir APENAS source_origin (fonte),
// NUNCA categoria. A categoria já foi resolvida deterministicamente acima.
// ---------------------------------------------------------------------------

function inferFonte(gap: GapInput, allowLayerInference: boolean): string {
  if (gap.sourceOrigin) return gap.sourceOrigin;
  if (!allowLayerInference) return "solaris";
  if (gap.layer === "onda2") return "iagen";
  if (gap.layer === "onda1") return "solaris";
  return "solaris";
}

function toGapRule(
  gap: GapInput,
  mapping: GapMappingResult,
  allowLayerInference: boolean,
): GapRule {
  return {
    ruleId: mapping.ruleCode ?? gap.id,
    categoria: mapping.categoria!,
    artigo: gap.sourceReference ?? "N/A",
    fonte: inferFonte(gap, allowLayerInference),
    gapClassification:
      gap.gapStatus === "nao_compliant" ? "ausencia" : "parcial",
    requirementId: gap.requirementId ?? gap.canonicalId,
    sourceReference: gap.sourceReference ?? "N/A",
    domain: gap.domain ?? "geral",
  };
}
