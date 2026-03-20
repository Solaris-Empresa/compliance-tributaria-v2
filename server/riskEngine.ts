/**
 * riskEngine.ts — TASK 5: Risk Engine (Compliance Risk Scoring)
 *
 * Princípio fundamental: Risco ≠ apenas não conformidade
 * Risco = impacto × criticidade × natureza do requisito
 *
 * Fórmula: risk_score = base_score × gap_multiplier
 *   base_score: derivado de normative_type + base_criticality
 *   gap_multiplier: 1.0 (nao_compliant) | 0.5 (parcial) | 0 (compliant/na)
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type GapStatus = "compliant" | "nao_compliant" | "parcial" | "nao_aplicavel";
export type RiskLevel = "baixo" | "medio" | "alto" | "critico";
export type ImpactType = "financeiro" | "operacional" | "legal" | "reputacional";
export type NormativeType = "obrigacao" | "vedacao" | "direito" | "opcao";
export type SeverityBase = "critica" | "alta" | "media" | "baixa";
export type MitigationPriority = "imediata" | "curto_prazo" | "medio_prazo" | "monitoramento";

export interface GapInput {
  canonicalId: string;
  mappingId: string;
  gapStatus: GapStatus;
  normativeType?: NormativeType;
  baseCriticality?: SeverityBase;
  domain?: string;
  requirementName?: string;
  answerNote?: string;
}

export interface RiskItem {
  canonicalId: string;
  mappingId: string;
  gapStatus: GapStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  impactType: ImpactType;
  severityBase: SeverityBase;
  normativeType: NormativeType;
  gapMultiplier: string;
  baseScore: number;
  domain?: string;
  requirementName?: string;
  mitigationPriority: MitigationPriority;
}

export interface RiskSummary {
  totalRiskScore: number;
  avgRiskScore: number;
  maxRiskScore: number;
  criticalCount: number;
  altoCount: number;
  medioCount: number;
  baixoCount: number;
  financialRisk: number;
  operationalRisk: number;
  legalRisk: number;
  overallRiskLevel: RiskLevel;
  topRisks: RiskItem[];
  risksByDomain: Record<string, { count: number; avgScore: number; maxScore: number }>;
}

// ─── Tabelas de regras ────────────────────────────────────────────────────────

/**
 * FASE 2 — Base score por normative_type
 * Obrigação e vedação têm impacto máximo; direito é médio; opção é baixo
 */
const NORMATIVE_BASE_SCORE: Record<NormativeType, number> = {
  obrigacao: 80,  // Obrigação legal → alto impacto se descumprida
  vedacao: 80,    // Vedação → alto impacto se violada
  direito: 50,    // Direito → médio (empresa perde benefício, não sofre penalidade)
  opcao: 30,      // Opção → baixo (escolha estratégica, não obrigatória)
};

/**
 * Multiplicador de criticidade do requisito
 * Ajusta o base_score para cima ou para baixo conforme a criticidade
 */
const CRITICALITY_MULTIPLIER: Record<SeverityBase, number> = {
  critica: 1.25,  // +25% → requisito de máxima criticidade
  alta: 1.0,      // base → criticidade padrão alta
  media: 0.75,    // -25% → criticidade moderada
  baixa: 0.5,     // -50% → criticidade baixa
};

/**
 * FASE 2 — Multiplicador por gap_status
 * nao_compliant: 100% do risco | parcial: 50% | compliant/na: 0%
 */
const GAP_MULTIPLIER: Record<GapStatus, number> = {
  nao_compliant: 1.0,
  parcial: 0.5,
  compliant: 0.0,
  nao_aplicavel: 0.0,
};

/**
 * Tipo de impacto por domínio do requisito
 */
const DOMAIN_IMPACT_TYPE: Record<string, ImpactType> = {
  governanca_transicao: "operacional",
  cadastro_identificacao: "legal",
  apuracao_extincao: "financeiro",
  creditos_ressarcimento: "financeiro",
  documentos_obrigacoes: "legal",
  regimes_diferenciados: "financeiro",
  conformidade_fiscalizacao_contencioso: "legal",
  sistemas_erp_dados: "operacional",
  incentivos_beneficios_transparencia: "financeiro",
  default: "operacional",
};

// ─── Funções principais ───────────────────────────────────────────────────────

/**
 * Inferir normative_type a partir do texto da pergunta ou canonical_id
 * Usado quando o campo não está disponível no banco
 */
export function inferNormativeType(requirementName?: string, domain?: string): NormativeType {
  const name = (requirementName || "").toLowerCase();
  if (name.includes("vedaç") || name.includes("vedado") || name.includes("proibid")) return "vedacao";
  if (name.includes("direito") || name.includes("benefício") || name.includes("incentivo") || name.includes("crédito")) return "direito";
  if (name.includes("opção") || name.includes("opcional") || name.includes("pode")) return "opcao";
  return "obrigacao"; // padrão: a maioria dos requisitos da reforma tributária são obrigações
}

/**
 * Calcular base_score considerando normative_type e criticidade
 */
export function calculateBaseScore(normativeType: NormativeType, criticality: SeverityBase): number {
  const base = NORMATIVE_BASE_SCORE[normativeType];
  const multiplier = CRITICALITY_MULTIPLIER[criticality];
  return Math.min(100, Math.round(base * multiplier));
}

/**
 * FASE 3 — Calcular risk_score
 * risk_score = base_score × gap_multiplier
 */
export function calculateRiskScore(baseScore: number, gapStatus: GapStatus): number {
  const multiplier = GAP_MULTIPLIER[gapStatus];
  return Math.round(baseScore * multiplier);
}

/**
 * Classificar risk_level a partir do risk_score
 */
export function classifyRiskLevel(riskScore: number): RiskLevel {
  if (riskScore >= 70) return "critico";
  if (riskScore >= 50) return "alto";
  if (riskScore >= 25) return "medio";
  return "baixo";
}

/**
 * Determinar prioridade de mitigação baseada em risk_level e normative_type
 */
export function determineMitigationPriority(
  riskLevel: RiskLevel,
  normativeType: NormativeType
): MitigationPriority {
  if (riskLevel === "critico") return "imediata";
  if (riskLevel === "alto" && (normativeType === "obrigacao" || normativeType === "vedacao")) return "curto_prazo";
  if (riskLevel === "alto") return "curto_prazo";
  if (riskLevel === "medio") return "medio_prazo";
  return "monitoramento";
}

/**
 * Classificar um gap individual e retornar o RiskItem completo
 */
export function classifyRisk(gap: GapInput): RiskItem {
  // Normalizar inputs com defaults
  const normativeType: NormativeType = gap.normativeType || inferNormativeType(gap.requirementName, gap.domain);
  const criticality: SeverityBase = gap.baseCriticality || "alta";
  const domain = gap.domain || "default";

  // Calcular scores
  const baseScore = calculateBaseScore(normativeType, criticality);
  const riskScore = calculateRiskScore(baseScore, gap.gapStatus);
  const riskLevel = classifyRiskLevel(riskScore);
  const impactType = DOMAIN_IMPACT_TYPE[domain] || DOMAIN_IMPACT_TYPE.default;
  const mitigationPriority = determineMitigationPriority(riskLevel, normativeType);

  return {
    canonicalId: gap.canonicalId,
    mappingId: gap.mappingId,
    gapStatus: gap.gapStatus,
    riskLevel,
    riskScore,
    impactType,
    severityBase: criticality,
    normativeType,
    gapMultiplier: String(GAP_MULTIPLIER[gap.gapStatus]),
    baseScore,
    domain: gap.domain,
    requirementName: gap.requirementName,
    mitigationPriority,
  };
}

/**
 * Calcular resumo de risco para uma sessão completa
 */
export function calculateRiskSummary(risks: RiskItem[]): RiskSummary {
  // Filtrar apenas gaps com risco > 0 (excluir compliant e nao_aplicavel)
  const activeRisks = risks.filter((r) => r.riskScore > 0);

  const totalRiskScore = activeRisks.reduce((sum, r) => sum + r.riskScore, 0);
  const avgRiskScore = activeRisks.length > 0 ? Math.round(totalRiskScore / activeRisks.length) : 0;
  const maxRiskScore = activeRisks.length > 0 ? Math.max(...activeRisks.map((r) => r.riskScore)) : 0;

  const criticalCount = risks.filter((r) => r.riskLevel === "critico").length;
  const altoCount = risks.filter((r) => r.riskLevel === "alto").length;
  const medioCount = risks.filter((r) => r.riskLevel === "medio").length;
  const baixoCount = risks.filter((r) => r.riskLevel === "baixo" && r.riskScore > 0).length;

  const financialRisk = activeRisks
    .filter((r) => r.impactType === "financeiro")
    .reduce((sum, r) => sum + r.riskScore, 0);
  const operationalRisk = activeRisks
    .filter((r) => r.impactType === "operacional")
    .reduce((sum, r) => sum + r.riskScore, 0);
  const legalRisk = activeRisks
    .filter((r) => r.impactType === "legal")
    .reduce((sum, r) => sum + r.riskScore, 0);

  // Overall risk level baseado no avgRiskScore
  const overallRiskLevel = classifyRiskLevel(avgRiskScore);

  // Top 5 riscos por score
  const topRisks = [...activeRisks].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  // Riscos por domínio
  const risksByDomain: Record<string, { count: number; avgScore: number; maxScore: number }> = {};
  for (const r of activeRisks) {
    const d = r.domain || "outros";
    if (!risksByDomain[d]) risksByDomain[d] = { count: 0, avgScore: 0, maxScore: 0 };
    risksByDomain[d].count++;
    risksByDomain[d].maxScore = Math.max(risksByDomain[d].maxScore, r.riskScore);
  }
  // Calcular avgScore por domínio
  for (const d of Object.keys(risksByDomain)) {
    const domainRisks = activeRisks.filter((r) => (r.domain || "outros") === d);
    risksByDomain[d].avgScore = Math.round(
      domainRisks.reduce((sum, r) => sum + r.riskScore, 0) / domainRisks.length
    );
  }

  return {
    totalRiskScore,
    avgRiskScore,
    maxRiskScore,
    criticalCount,
    altoCount,
    medioCount,
    baixoCount,
    financialRisk,
    operationalRisk,
    legalRisk,
    overallRiskLevel,
    topRisks,
    risksByDomain,
  };
}

/**
 * Processar lista completa de gaps e retornar análise de risco completa
 */
export function runRiskAnalysis(gaps: GapInput[]): {
  risks: RiskItem[];
  summary: RiskSummary;
} {
  const risks = gaps.map((g) => classifyRisk(g));
  const summary = calculateRiskSummary(risks);
  return { risks, summary };
}
