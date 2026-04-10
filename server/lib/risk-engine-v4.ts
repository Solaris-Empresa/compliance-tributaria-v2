// risk-engine-v4.ts — Engine determinístico de riscos v4 (Sprint Z-07 / ADR-0022)
// Função pura: mesma entrada → mesma saída. SEVERITY é tabela fixa — nunca LLM.
// Sprint Z-09 PR #B: getRiskCategories() lê da tabela risk_categories com cache TTL 1h.

import {
  listActiveCategories,
  type RiskCategory,
} from "./db-queries-risk-categories";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Categoria =
  | "imposto_seletivo"
  | "confissao_automatica"
  | "split_payment"
  | "inscricao_cadastral"
  | "regime_diferenciado"
  | "transicao_iss_ibs"
  | "obrigacao_acessoria"
  | "aliquota_zero"
  | "aliquota_reduzida"
  | "credito_presumido";

export type Severity = "alta" | "media" | "oportunidade";
export type Urgency = "imediata" | "curto_prazo" | "medio_prazo";
export type Fonte = "cnae" | "ncm" | "nbs" | "solaris" | "iagen";

export interface GapRule {
  ruleId: string;
  categoria: string;
  artigo: string;
  fonte: string;
  gapClassification: string;
  requirementId: string;
  sourceReference: string;
  domain: string;
}

export interface RiskV4 {
  ruleId: string;
  categoria: string;
  artigo: string;
  fonte: string;
  severity: Severity;
  urgency: Urgency;
  breadcrumb: [string, string, string, string];
  gapClassification: string;
  requirementId: string;
  sourceReference: string;
  domain: string;
}

export interface ActionPlanV4 {
  riskRuleId: string;
  categoria: string;
  artigo: string;
  prioridade: Urgency;
  breadcrumb: [string, string, string, string];
  severity: Severity;
}

// ---------------------------------------------------------------------------
// Constantes determinísticas
// ---------------------------------------------------------------------------

export const SEVERITY_TABLE: Record<Categoria, { severity: Severity; urgency: Urgency }> = {
  imposto_seletivo:    { severity: "alta",         urgency: "imediata" },
  confissao_automatica:{ severity: "alta",         urgency: "imediata" },
  split_payment:       { severity: "alta",         urgency: "imediata" },
  inscricao_cadastral: { severity: "alta",         urgency: "imediata" },
  regime_diferenciado: { severity: "media",        urgency: "curto_prazo" },
  transicao_iss_ibs:   { severity: "media",        urgency: "medio_prazo" },
  obrigacao_acessoria: { severity: "media",        urgency: "curto_prazo" },
  aliquota_zero:       { severity: "oportunidade", urgency: "curto_prazo" },
  aliquota_reduzida:   { severity: "oportunidade", urgency: "curto_prazo" },
  credito_presumido:   { severity: "oportunidade", urgency: "curto_prazo" },
};

export const SOURCE_RANK: Record<Fonte, number> = {
  cnae: 1,
  ncm: 2,
  nbs: 3,
  solaris: 4,
  iagen: 5,
};

const SEVERITY_ORDER: Record<Severity, number> = {
  alta: 0,
  media: 1,
  oportunidade: 2,
};

// ---------------------------------------------------------------------------
// Cache de categorias via DB (Sprint Z-09 PR #B)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

let _categoryCache: Record<string, { severity: Severity; urgency: Urgency }> | null = null;
let _cacheTimestamp = 0;

/**
 * Lê categorias ativas da tabela risk_categories com cache em memória (TTL 1h).
 * Filtra categorias com vigencia_fim expirada (defesa em profundidade).
 * Substitui SEVERITY_TABLE para chamadas via DB.
 */
export async function getRiskCategories(): Promise<
  Record<string, { severity: Severity; urgency: Urgency }>
> {
  const now = Date.now();
  if (_categoryCache && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _categoryCache;
  }

  const rows = await listActiveCategories();
  const table: Record<string, { severity: Severity; urgency: Urgency }> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const row of rows) {
    if (row.vigencia_fim) {
      const fim = new Date(row.vigencia_fim);
      if (fim < today) continue;
    }
    table[row.codigo] = {
      severity: row.severidade as Severity,
      urgency: row.urgencia as Urgency,
    };
  }

  _categoryCache = table;
  _cacheTimestamp = now;
  return table;
}

/** Reset do cache — usado apenas em testes. */
export function resetCategoryCache(): void {
  _categoryCache = null;
  _cacheTimestamp = 0;
}

// ---------------------------------------------------------------------------
// Funções puras
// ---------------------------------------------------------------------------

export function buildBreadcrumb(gap: GapRule): [string, string, string, string] {
  return [gap.fonte, gap.categoria, gap.artigo, gap.ruleId];
}

export function sortBySourceRank<T extends { fonte: string }>(gaps: T[]): T[] {
  return [...gaps].sort((a, b) => {
    const ra = SOURCE_RANK[a.fonte as Fonte] ?? 99;
    const rb = SOURCE_RANK[b.fonte as Fonte] ?? 99;
    return ra - rb;
  });
}

export function classifyRisk(gap: GapRule): RiskV4 {
  const entry = SEVERITY_TABLE[gap.categoria as Categoria];
  const severity = entry?.severity ?? "media";
  const urgency = entry?.urgency ?? "curto_prazo";

  return {
    ruleId: gap.ruleId,
    categoria: gap.categoria,
    artigo: gap.artigo,
    fonte: gap.fonte,
    severity,
    urgency,
    breadcrumb: buildBreadcrumb(gap),
    gapClassification: gap.gapClassification,
    requirementId: gap.requirementId,
    sourceReference: gap.sourceReference,
    domain: gap.domain,
  };
}

export function computeRiskMatrix(gaps: GapRule[]): RiskV4[] {
  return gaps
    .map(classifyRisk)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export { buildActionPlans } from "./action-plan-engine-v4";
