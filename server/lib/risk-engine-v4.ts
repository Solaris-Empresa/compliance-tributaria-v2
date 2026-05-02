// risk-engine-v4.ts — Engine determinístico de riscos v4 (Sprint Z-07 / ADR-0022)
// Função pura: mesma entrada → mesma saída. SEVERITY é tabela fixa — nunca LLM.
// Sprint Z-09 PR #B: getRiskCategories() lê da tabela risk_categories com cache TTL 1h.

import {
  listActiveCategories,
  getCategoryByCode,
  type RiskCategory,
} from "./db-queries-risk-categories";
import type { InsertRiskV4 } from "./db-queries-risks-v4";
// Hotfix IS v1.2.1 — gate de elegibilidade por operationType no engine v4
import {
  isCategoryAllowed,
  insertEligibilityAuditLog,
} from "./risk-eligibility";
import type { CategoriaCanonica } from "./risk-categorizer";

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
  | "credito_presumido"
  | "enquadramento_geral"; // Hotfix v2.1 — fallback do gate de elegibilidade (downgrade_to)

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
  // M3 NOVA-06: rastreabilidade end-to-end (campos opcionais — backward-compat)
  // Habilitam navegação Risco → Pergunta → Resposta → Gap no frontend.
  questionId?: number | null;
  answerValue?: string | null;
  gapId?: number | null;
  questionSource?: "solaris" | "iagen" | "qa_v3" | "engine" | "cnae" | "v1" | null;
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
  titulo: string;
  responsavel: string;
  prazo: string;
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
  enquadramento_geral: { severity: "media",        urgency: "curto_prazo" }, // v2.1 fallback
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

// ---------------------------------------------------------------------------
// Sprint Z-13.5 — Consolidação de riscos
// ---------------------------------------------------------------------------

export interface EvidenceItem {
  ruleId: string;
  fonte: string;
  gapClassification: string;
  sourceReference: string;
  artigo: string;
  confidence: number;
  weight: number;
  // M3 NOVA-06: rastreabilidade end-to-end (campos opcionais — backward-compat)
  questionId?: number | null;
  answerValue?: string | null;
  gapId?: number | null;
  questionSource?: "solaris" | "iagen" | "qa_v3" | "engine" | "cnae" | "v1" | null;
}

export interface ConsolidatedEvidence {
  gaps: EvidenceItem[];
  rag_validated: boolean;
  rag_confidence: number;
  rag_artigo_exato?: string;
  rag_trecho_legal?: string;
  rag_query?: string;
  rag_validation_note?: string;
  // M3 NOVA-06: contexto do arquétipo (opcional — backward-compat)
  archetype_context?: string;
}

export interface OperationalContext {
  tipoOperacao?: string;
  tipoCliente?: string;
  multiestadual?: boolean;
  meiosPagamento?: string[];
  intermediarios?: string[];
}

const TITULO_TEMPLATES: Record<string, string> = {
  split_payment: "Risco de não conformidade com Split Payment nas operações de {op}",
  confissao_automatica: "Risco de confissão automática de débitos nas operações de {op}",
  obrigacao_acessoria: "Risco de descumprimento de obrigações acessórias nas operações de {op}",
  inscricao_cadastral: "Risco de irregularidade cadastral no IBS/CBS nas operações de {op}",
  transicao_iss_ibs: "Risco de inconsistência na transição ISS/IBS nas operações de {op}",
  regime_diferenciado: "Risco de enquadramento incorreto em regime diferenciado nas operações de {op}",
  imposto_seletivo: "Risco de incidência do Imposto Seletivo nas operações de {op}",
  aliquota_zero: "Oportunidade de alíquota zero sobre produtos elegíveis nas operações de {op}",
  aliquota_reduzida: "Oportunidade de alíquota reduzida nas operações de {op}",
  credito_presumido: "Oportunidade de aproveitamento de crédito presumido nas operações de {op}",
  enquadramento_geral: "Risco de enquadramento tributário nas operações de {op} — revisão recomendada",
};

export function buildRiskKey(categoria: string, ctx: OperationalContext): string {
  const op = ctx.tipoOperacao ?? "na";
  const multi = ctx.multiestadual ? "multi" : "mono";
  return `${categoria}::op:${op}::geo:${multi}`;
}

function mapGapToEvidence(gap: GapRule): EvidenceItem {
  const sourceWeight = SOURCE_RANK[gap.fonte as Fonte] ?? 99;
  return {
    ruleId: gap.ruleId,
    fonte: gap.fonte,
    gapClassification: gap.gapClassification,
    sourceReference: gap.sourceReference,
    artigo: gap.artigo,
    confidence: 1.0,
    weight: 1 / sourceWeight,
    // M3 NOVA-06: rastreabilidade end-to-end
    questionId: gap.questionId ?? null,
    answerValue: gap.answerValue ?? null,
    gapId: gap.gapId ?? null,
    questionSource: gap.questionSource ?? null,
  };
}

function getBestSourcePriority(gaps: GapRule[]): Fonte {
  let best: Fonte = "iagen";
  let bestRank = 99;
  for (const g of gaps) {
    const rank = SOURCE_RANK[g.fonte as Fonte] ?? 99;
    if (rank < bestRank) {
      bestRank = rank;
      best = g.fonte as Fonte;
    }
  }
  return best;
}

function getMaxSeverity(
  baseSeverity: Severity,
  gaps: GapRule[]
): Severity {
  let max = SEVERITY_ORDER[baseSeverity] ?? 1;
  for (const g of gaps) {
    const entry = SEVERITY_TABLE[g.categoria as Categoria];
    if (entry) {
      const order = SEVERITY_ORDER[entry.severity];
      if (order < max) max = order;
    }
  }
  // Lower number = higher severity
  if (max === 0) return "alta";
  if (max === 1) return "media";
  return "oportunidade";
}

function calcWeightedConfidence(evidences: EvidenceItem[]): number {
  if (evidences.length === 0) return 0;
  let totalWeight = 0;
  let weightedSum = 0;
  for (const ev of evidences) {
    totalWeight += ev.weight;
    weightedSum += ev.confidence * ev.weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function buildLegalTitle(categoria: string, ctx: OperationalContext): string {
  const template = TITULO_TEMPLATES[categoria] ?? `Risco: ${categoria} nas operações de {op}`;
  return template.replace("{op}", ctx.tipoOperacao ?? "geral");
}

/**
 * Consolida N gaps em riscos agrupados por categoria + contexto operacional.
 * Substitui a lógica 1:1 de computeRiskMatrix para a geração de riscos persistidos.
 */
export async function consolidateRisks(
  projectId: number,
  gaps: GapRule[],
  context: OperationalContext,
  actorId: number,
  archetypeContext?: string,
): Promise<InsertRiskV4[]> {
  // 1. Agrupar por risk_key
  const grouped = new Map<string, GapRule[]>();
  for (const gap of gaps) {
    const key = buildRiskKey(gap.categoria, context);
    const arr = grouped.get(key) ?? [];
    arr.push(gap);
    grouped.set(key, arr);
  }

  // 2. Consolidar cada grupo
  const results: InsertRiskV4[] = [];

  for (const [riskKey, groupGaps] of grouped) {
    const suggestedCategoria = groupGaps[0].categoria;

    // Hotfix IS v1.2.1 — gate de elegibilidade por operationType
    const eligibility = isCategoryAllowed(
      suggestedCategoria as CategoriaCanonica,
      context.tipoOperacao,
    );
    const auditMode = process.env.ELIGIBILITY_AUDIT_MODE === "full";
    if (auditMode || eligibility.reason !== null) {
      insertEligibilityAuditLog(
        projectId,
        eligibility,
        context.tipoOperacao,
        actorId,
        String(actorId),
        "user",
        riskKey,
      ).catch(() => {});
    }

    const categoria = eligibility.final;
    const effectiveRiskKey =
      categoria === suggestedCategoria ? riskKey : buildRiskKey(categoria, context);

    // Try DB category first, fallback to SEVERITY_TABLE
    let catSeverity: Severity;
    let catUrgency: Urgency;
    let catArtigo: string;
    let catTipo: "risk" | "opportunity";

    const dbCat = await getCategoryByCode(categoria);
    if (dbCat) {
      catSeverity = dbCat.severidade as Severity;
      catUrgency = dbCat.urgencia as Urgency;
      catArtigo = dbCat.artigo_base;
      catTipo = dbCat.tipo as "risk" | "opportunity";
    } else {
      const fallback = SEVERITY_TABLE[categoria as Categoria];
      catSeverity = fallback?.severity ?? "media";
      catUrgency = fallback?.urgency ?? "curto_prazo";
      catArtigo = groupGaps[0].artigo;
      catTipo = catSeverity === "oportunidade" ? "opportunity" : "risk";
    }

    const evidences = groupGaps.map(mapGapToEvidence);
    const maxSev = getMaxSeverity(catSeverity, groupGaps);
    const confidence = calcWeightedConfidence(evidences);
    const titulo = buildLegalTitle(categoria, context);
    const bestSource = getBestSourcePriority(groupGaps);

    const consolidatedEvidence: ConsolidatedEvidence = {
      gaps: evidences,
      rag_validated: false,
      rag_confidence: 0,
      // M3 NOVA-06: contexto do arquétipo (passthrough opcional)
      ...(archetypeContext ? { archetype_context: archetypeContext } : {}),
    };

    results.push({
      project_id: projectId,
      rule_id: effectiveRiskKey,
      type: catTipo,
      categoria: categoria as import("./db-queries-risks-v4").CategoriaV4,
      titulo,
      descricao: groupGaps.map((g) => g.sourceReference).filter(Boolean).join("; "),
      artigo: catArtigo,
      severidade: maxSev as import("./db-queries-risks-v4").SeveridadeV4,
      urgencia: catUrgency as import("./db-queries-risks-v4").UrgenciaV4,
      evidence: consolidatedEvidence,
      breadcrumb: [bestSource, categoria, catArtigo, effectiveRiskKey],
      source_priority: bestSource as import("./db-queries-risks-v4").SourcePriorityV4,
      confidence,
      risk_key: effectiveRiskKey,
      operational_context: context,
      evidence_count: evidences.length,
      rag_validated: 0,
      rag_confidence: 0,
      created_by: actorId,
      updated_by: actorId,
    });
  }

  return results.sort(
    (a, b) => SEVERITY_ORDER[a.severidade as Severity] - SEVERITY_ORDER[b.severidade as Severity]
  );
}
