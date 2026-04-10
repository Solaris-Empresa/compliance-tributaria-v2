/**
 * gap-to-rule-mapper.ts — Sprint Z-10 PR #A
 * Mapper Gap → Categoria de Risco — modo híbrido v4
 *
 * Estratégia de resolução (em ordem de prioridade):
 *   1. rule_code  → categoria com ruleCode explícito que casa com gap.gapType
 *   2. acl_filter → categoria cujos allowedDomains/allowedGapTypes cobrem o gap
 *   3. fallback   → categoria padrão do domínio (hardcoded por domínio)
 *
 * NÃO importa routers nem db — é uma biblioteca pura de mapeamento.
 * O repositório (risk-category.repository.drizzle.ts) injeta as categorias.
 */

import type { GapConfirmed, CategoryACL, RuleMatch, MapperResult } from "../schemas/gap-risk.schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Fallback por domínio — usado quando nenhuma regra ACL casa
// Mapeamento: domain → codigo da categoria padrão
// ─────────────────────────────────────────────────────────────────────────────
const DOMAIN_FALLBACK: Record<string, string> = {
  contabilidade:       "apuracao_ibs_cbs",
  fiscal:              "apuracao_ibs_cbs",
  ti:                  "nfe_nfse_adaptacao",
  juridico:            "transicao_iss_ibs",
  negocio:             "split_payment",
  rh:                  "apuracao_ibs_cbs",
  financeiro:          "split_payment",
  // domínio desconhecido → categoria mais genérica
  _default:            "apuracao_ibs_cbs",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de ACL
// ─────────────────────────────────────────────────────────────────────────────

/** Verifica se uma categoria aceita o domínio do gap (NULL = aceita todos) */
function domainAllowed(cat: CategoryACL, domain: string): boolean {
  if (!cat.allowedDomains || cat.allowedDomains.length === 0) return true;
  return cat.allowedDomains.includes(domain);
}

/** Verifica se uma categoria aceita o tipo de gap (NULL = aceita todos) */
function gapTypeAllowed(cat: CategoryACL, gapType: string): boolean {
  if (!cat.allowedGapTypes || cat.allowedGapTypes.length === 0) return true;
  return cat.allowedGapTypes.includes(gapType);
}

/** Calcula score ACL (0.0 – 1.0) baseado na especificidade dos filtros */
function aclScore(cat: CategoryACL): number {
  let score = 0.5; // base
  if (cat.allowedDomains && cat.allowedDomains.length > 0) score += 0.25;
  if (cat.allowedGapTypes && cat.allowedGapTypes.length > 0) score += 0.25;
  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// Função principal: mapGapsToCategories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapeia uma lista de gaps confirmados para categorias de risco.
 *
 * @param gaps       Lista de gaps confirmados pelo GapEngine
 * @param categories Lista de categorias ativas (injetada pelo repositório)
 * @returns          MapperResult com matches, unmatched e timestamp
 */
export function mapGapsToCategories(
  gaps: GapConfirmed[],
  categories: CategoryACL[],
): MapperResult {
  const activeCategories = categories.filter((c) => c.status === "ativo");
  const matches: RuleMatch[] = [];
  const unmatched: string[] = [];

  for (const gap of gaps) {
    const match = resolveGap(gap, activeCategories);
    if (match) {
      matches.push(match);
    } else {
      unmatched.push(gap.id);
    }
  }

  return {
    matches,
    unmatched,
    executedAt: new Date().toISOString(),
  };
}

/**
 * Resolve um único gap para uma categoria.
 * Retorna null apenas se não houver nenhuma categoria ativa (nem fallback).
 */
function resolveGap(gap: GapConfirmed, activeCategories: CategoryACL[]): RuleMatch | null {
  // ── Estratégia 1: rule_code ──────────────────────────────────────────────
  // Categoria com ruleCode explícito que casa com gap.gapType (prefixo RC-)
  const byRuleCode = activeCategories.find(
    (c) => c.ruleCode && c.ruleCode.toLowerCase() === gap.gapType.toLowerCase(),
  );
  if (byRuleCode) {
    return {
      gapId: gap.id,
      categoriaCodigo: byRuleCode.codigo,
      categoriaNome: byRuleCode.nome,
      mode: "rule_code",
      score: 1.0,
      ruleCode: byRuleCode.ruleCode ?? null,
    };
  }

  // ── Estratégia 2: acl_filter ─────────────────────────────────────────────
  // Categorias cujos allowedDomains e allowedGapTypes cobrem o gap.
  // Seleciona a de maior score (mais específica).
  const candidates = activeCategories
    .filter((c) => domainAllowed(c, gap.domain) && gapTypeAllowed(c, gap.gapType))
    .map((c) => ({ cat: c, score: aclScore(c) }))
    .sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    const best = candidates[0];
    return {
      gapId: gap.id,
      categoriaCodigo: best.cat.codigo,
      categoriaNome: best.cat.nome,
      mode: "acl_filter",
      score: best.score,
      ruleCode: best.cat.ruleCode ?? null,
    };
  }

  // ── Estratégia 3: fallback ───────────────────────────────────────────────
  // Categoria padrão do domínio (hardcoded em DOMAIN_FALLBACK).
  const fallbackCodigo = DOMAIN_FALLBACK[gap.domain] ?? DOMAIN_FALLBACK["_default"];
  const fallbackCat = activeCategories.find((c) => c.codigo === fallbackCodigo);

  if (fallbackCat) {
    return {
      gapId: gap.id,
      categoriaCodigo: fallbackCat.codigo,
      categoriaNome: fallbackCat.nome,
      mode: "fallback",
      score: 0.3,
      ruleCode: null,
    };
  }

  // Nenhuma categoria disponível (banco vazio ou todas inativas)
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export da tabela de fallback (para testes e documentação)
// ─────────────────────────────────────────────────────────────────────────────
export { DOMAIN_FALLBACK };
