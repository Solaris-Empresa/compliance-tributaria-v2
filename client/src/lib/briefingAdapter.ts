/**
 * briefingAdapter.ts — Adapter para transformar briefingStructured (JSON) em tipos consumíveis.
 *
 * UX-BRIEFING-C-V2 PR-1 / F1 — Issue #1344
 * Contrato: DB-SPEC-UX-BRIEFING-C-V2.md (§2 schema, §3 double-encoding, §4 hallucination)
 *
 * Regras:
 *   - NUNCA JSON.parse() sobre um objeto já parseado (Lição #72 / DP-19)
 *   - Fallback: se structured é null/undefined/string-vazia → { mode: "legacy" }
 *   - confidence_score é OBJECT {nivel_confianca, limitacoes, recomendacao} (NÃO number)
 *   - gap.gap é o campo de texto (NÃO gap.titulo — campo inexistente)
 *   - _hallucination_detected é opcional (pós-Zod) → default false
 *   - Strip prefixo "Aplicação obrigatória: " do source_reference (N2-b, 1.1% dos dados)
 *   - aplicacao_obrigatoria normalizado para regra_semantica (alias)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type SourceType =
  | "rag"
  | "cnae"
  | "descricao"
  | "solaris"
  | "questionario"
  | "iagen"
  | "regra_semantica"
  | "regulatorio";

export type Urgencia = "imediata" | "curto_prazo" | "medio_prazo";

export type NivelRisco = "baixo" | "medio" | "alto" | "critico";

export interface BriefingGap {
  gap: string;
  causa_raiz: string;
  evidencia_regulatoria: string;
  urgencia: Urgencia;
  source_type: SourceType;
  source_reference: string;
  _hallucination_detected: boolean;
  _hallucinated_articles: string[];
}

export interface BriefingAcao {
  acao: string;
  justificativa: string;
  prazo: "imediato" | "curto_prazo" | "medio_prazo";
}

export interface BriefingInconsistencia {
  pergunta_origem: string;
  resposta_declarada: string;
  contradicao_detectada: string;
  impacto: string;
}

export interface ConfidenceScore {
  nivel_confianca: number;
  limitacoes: string[];
  recomendacao: string;
}

export interface ApprovalReservation {
  confidence_at_approval: number;
  threshold: number;
  predefined_reason: string;
  free_reason: string;
  approver_user_id: number;
  approver_user_name: string;
  approver_role: string;
  approved_at: number;
  answered_sources: string[];
  missing_sources: string[];
}

export interface BriefingStructuredData {
  nivel_risco_geral: NivelRisco;
  resumo_executivo: string;
  principais_gaps: BriefingGap[];
  oportunidades: string[];
  recomendacoes_prioritarias: string[];
  top_3_acoes: BriefingAcao[];
  inconsistencias: BriefingInconsistencia[];
  confidence_score: ConfidenceScore;
  dismissed_inconsistencias: string[];
  approval_reservation: ApprovalReservation | null;
}

/** Resultado do adapter quando structured está disponível */
export interface BriefingAdapted {
  mode: "split-view";
  data: BriefingStructuredData;
}

/** Resultado do adapter quando structured é null/inválido → fallback legado */
export interface BriefingLegacy {
  mode: "legacy";
  error?: string;
}

export type BriefingAdapterResult = BriefingAdapted | BriefingLegacy;

// ─── Normalization helpers ────────────────────────────────────────────────────

const LEGACY_PREFIX = "Aplicação obrigatória: ";

/**
 * Strip prefixo legado do source_reference (N2-b).
 * 4/372 gaps (1.1%) contêm esse prefixo — dados pré-existentes.
 */
export function stripLegacyPrefix(ref: string | undefined | null): string {
  if (!ref) return "";
  return ref.startsWith(LEGACY_PREFIX) ? ref.slice(LEGACY_PREFIX.length) : ref;
}

/**
 * Normaliza source_type: mapeia alias `aplicacao_obrigatoria` → `regra_semantica`.
 * Decisão D4 / UX-LABELS-02 #1346.
 */
export function normalizeSourceType(raw: string | undefined | null): SourceType {
  if (!raw) return "rag";
  if (raw === "aplicacao_obrigatoria") return "regra_semantica";
  // Validar contra tipos conhecidos
  const valid: SourceType[] = [
    "rag", "cnae", "descricao", "solaris",
    "questionario", "iagen", "regra_semantica", "regulatorio",
  ];
  return valid.includes(raw as SourceType) ? (raw as SourceType) : "rag";
}

/**
 * Normaliza urgencia para valores canônicos.
 */
export function normalizeUrgencia(raw: string | undefined | null): Urgencia {
  if (!raw) return "medio_prazo";
  const map: Record<string, Urgencia> = {
    imediata: "imediata",
    curto_prazo: "curto_prazo",
    medio_prazo: "medio_prazo",
    // aliases comuns do LLM
    curto: "curto_prazo",
    medio: "medio_prazo",
    imediato: "imediata",
  };
  return map[raw] ?? "medio_prazo";
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

/**
 * parseBriefingStructured — Transforma o raw briefingStructured em dados tipados.
 *
 * @param raw - O valor vindo de getBriefingInconsistencias.structured (já 1× parseado pelo backend)
 *              OU null/undefined para projetos sem structured (98% do tráfego).
 *
 * Regra DP-19/Lição #72:
 *   - Se raw é string → JSON.parse (double-encoding residual)
 *   - Se raw é object → usar diretamente (backend já desfez 1 nível)
 *   - NUNCA JSON.parse sobre um objeto → "[object Object]"
 */
export function parseBriefingStructured(
  raw: unknown
): BriefingAdapterResult {
  // ─── Fallback path (98.1% dos projetos) ─────────────────────────────────
  if (raw === null || raw === undefined) {
    return { mode: "legacy" };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "null") {
      return { mode: "legacy" };
    }

    // Double-encoding: string → parse
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        // Triple-encoding edge case (defensive)
        try {
          const doubleParsed = JSON.parse(parsed);
          return adaptStructured(doubleParsed);
        } catch {
          return { mode: "legacy", error: "triple-encoding-parse-fail" };
        }
      }
      return adaptStructured(parsed);
    } catch {
      return { mode: "legacy", error: "json-parse-fail" };
    }
  }

  if (typeof raw === "object") {
    // Backend already parsed — use directly (Lição #72: NEVER re-parse an object)
    return adaptStructured(raw as Record<string, unknown>);
  }

  return { mode: "legacy", error: "unexpected-type" };
}

// ─── Internal: shape validation + normalization ───────────────────────────────

function adaptStructured(obj: Record<string, unknown>): BriefingAdapterResult {
  // Minimal shape validation: confidence_score must be object with nivel_confianca
  const cs = obj.confidence_score;
  if (!cs || typeof cs !== "object" || !("nivel_confianca" in (cs as object))) {
    return { mode: "legacy", error: "missing-confidence-score" };
  }

  const confidenceScore = cs as Record<string, unknown>;
  const nivelConfianca = Number(confidenceScore.nivel_confianca) || 0;

  // Parse gaps
  const rawGaps = Array.isArray(obj.principais_gaps) ? obj.principais_gaps : [];
  const gaps: BriefingGap[] = rawGaps.map((g: Record<string, unknown>) => ({
    gap: String(g?.gap ?? ""),
    causa_raiz: String(g?.causa_raiz ?? ""),
    evidencia_regulatoria: String(g?.evidencia_regulatoria ?? ""),
    urgencia: normalizeUrgencia(g?.urgencia as string),
    source_type: normalizeSourceType(g?.source_type as string),
    source_reference: stripLegacyPrefix(g?.source_reference as string),
    _hallucination_detected: Boolean(g?._hallucination_detected ?? false),
    _hallucinated_articles: Array.isArray(g?._hallucinated_articles)
      ? (g._hallucinated_articles as string[])
      : [],
  }));

  // Parse top_3_acoes (optional — ai-schemas.ts:225)
  const rawAcoes = Array.isArray(obj.top_3_acoes) ? obj.top_3_acoes : [];
  const top3Acoes: BriefingAcao[] = rawAcoes.map((a: Record<string, unknown>) => ({
    acao: String(a?.acao ?? ""),
    justificativa: String(a?.justificativa ?? ""),
    prazo: (["imediato", "curto_prazo", "medio_prazo"].includes(a?.prazo as string)
      ? a.prazo
      : "medio_prazo") as BriefingAcao["prazo"],
  }));

  // Parse inconsistencias
  const rawInc = Array.isArray(obj.inconsistencias) ? obj.inconsistencias : [];
  const inconsistencias: BriefingInconsistencia[] = rawInc.map((i: Record<string, unknown>) => ({
    pergunta_origem: String(i?.pergunta_origem ?? ""),
    resposta_declarada: String(i?.resposta_declarada ?? ""),
    contradicao_detectada: String(i?.contradicao_detectada ?? ""),
    impacto: String(i?.impacto ?? ""),
  }));

  // Parse approval_reservation (optional)
  const rawApproval = obj.approval_reservation as Record<string, unknown> | null | undefined;
  const approvalReservation: ApprovalReservation | null = rawApproval
    ? {
        confidence_at_approval: Number(rawApproval.confidence_at_approval) || 0,
        threshold: Number(rawApproval.threshold) || 85,
        predefined_reason: String(rawApproval.predefined_reason ?? ""),
        free_reason: String(rawApproval.free_reason ?? ""),
        approver_user_id: Number(rawApproval.approver_user_id) || 0,
        approver_user_name: String(rawApproval.approver_user_name ?? ""),
        approver_role: String(rawApproval.approver_role ?? ""),
        approved_at: Number(rawApproval.approved_at) || 0,
        answered_sources: Array.isArray(rawApproval.answered_sources)
          ? (rawApproval.answered_sources as string[])
          : [],
        missing_sources: Array.isArray(rawApproval.missing_sources)
          ? (rawApproval.missing_sources as string[])
          : [],
      }
    : null;

  const data: BriefingStructuredData = {
    nivel_risco_geral: (["baixo", "medio", "alto", "critico"].includes(obj.nivel_risco_geral as string)
      ? obj.nivel_risco_geral
      : "medio") as NivelRisco,
    resumo_executivo: String(obj.resumo_executivo ?? ""),
    principais_gaps: gaps,
    oportunidades: Array.isArray(obj.oportunidades) ? obj.oportunidades.map(String) : [],
    recomendacoes_prioritarias: Array.isArray(obj.recomendacoes_prioritarias)
      ? obj.recomendacoes_prioritarias.map(String)
      : [],
    top_3_acoes: top3Acoes,
    inconsistencias,
    confidence_score: {
      nivel_confianca: nivelConfianca,
      limitacoes: Array.isArray(confidenceScore.limitacoes)
        ? (confidenceScore.limitacoes as string[])
        : [],
      recomendacao: String(confidenceScore.recomendacao ?? ""),
    },
    dismissed_inconsistencias: Array.isArray(obj.dismissed_inconsistencias)
      ? obj.dismissed_inconsistencias.map(String)
      : [],
    approval_reservation: approvalReservation,
  };

  return { mode: "split-view", data };
}
