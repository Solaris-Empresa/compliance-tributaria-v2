// risk-engine-v4.ts — Engine determinístico de riscos v4 (Sprint Z-07 / ADR-0022)
// Função pura: mesma entrada → mesma saída. SEVERITY é tabela fixa — nunca LLM.

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
