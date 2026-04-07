/**
 * risk-categorizer.ts — Z-02b
 *
 * Categorias canônicas da LC 214/2025 para riscos de compliance.
 * Integrado ao riskEngine.ts no ponto de gravação em project_risks_v3.
 *
 * Categorias disponíveis:
 *   imposto_seletivo   — IS (Imposto Seletivo) sobre produtos específicos
 *   ibs_cbs            — IBS/CBS (substituição de ICMS/ISS/PIS/COFINS)
 *   regime_diferenciado — Regimes específicos (saúde, educação, agro, etc.)
 *   aliquota_reduzida  — Alíquotas reduzidas por setor
 *   aliquota_zero      — Isenções e alíquota zero
 *   cadastro_fiscal    — Obrigações de cadastro e inscrição
 *   split_payment      — Split payment e recolhimento automático
 *   obrigacao_acessoria — NF-e, SPED, eSocial e outras obrigações
 *   enquadramento_geral — Fallback quando não há categoria específica
 */

export type CategoriaCanonica =
  | "imposto_seletivo"
  | "ibs_cbs"
  | "regime_diferenciado"
  | "aliquota_reduzida"
  | "aliquota_zero"
  | "cadastro_fiscal"
  | "split_payment"
  | "obrigacao_acessoria"
  | "enquadramento_geral";

/**
 * Input mínimo necessário para categorizar um risco.
 * Compatível com GapInput (riskEngine.ts) e TrackedQuestion (tracked-question.ts).
 */
export interface RiskCategorizationInput {
  /** Descrição do risco ou do gap de origem */
  description?: string | null;
  /** Lei de referência (ex: "Art. 2 LC 214/2025") */
  lei_ref?: string | null;
  /** Tópicos do chunk RAG (ex: "imposto seletivo, bebidas") */
  topicos?: string | null;
  /** Domínio técnico já derivado (ex: "fiscal", "trabalhista") */
  domain?: string | null;
  /** Categoria técnica L2 já derivada (ex: "apuracao", "recolhimento") */
  category?: string | null;
  /** Tipo técnico L3 já derivado (ex: "split_payment", "nfe") */
  type?: string | null;
}

/**
 * Mapeia um risco/gap para a categoria canônica da LC 214/2025.
 *
 * Prioridade de inferência:
 *   1. Tópicos do RAG (mais específico)
 *   2. Descrição do risco
 *   3. Lei de referência
 *   4. Tipo técnico L3 (split_payment, nfe, etc.)
 *   5. Fallback: enquadramento_geral
 *
 * @param input - Dados do risco ou gap de origem
 * @returns Categoria canônica nunca vazia
 */
export function categorizeRisk(input: RiskCategorizationInput): CategoriaCanonica {
  const topicos = (input.topicos ?? "").toLowerCase();
  const desc    = (input.description ?? "").toLowerCase();
  const leiRef  = (input.lei_ref ?? "").toLowerCase();
  const type    = (input.type ?? "").toLowerCase();
  const cat     = (input.category ?? "").toLowerCase();

  // ── 1. Imposto Seletivo (IS) ──────────────────────────────────────────────
  if (
    topicos.includes("imposto seletivo") || topicos.includes("seletivo") ||
    desc.includes("imposto seletivo") || desc.includes(" is ") ||
    /art\.\s*[234]\b/.test(leiRef) ||
    desc.includes("destilado") || desc.includes("cigarro") || desc.includes("tabaco") ||
    desc.includes("bebida alcoólica") || desc.includes("veículo") && desc.includes("combustível")
  ) {
    return "imposto_seletivo";
  }

  // ── 2. Regime Diferenciado (saúde, educação, agro, financeiro) ────────────
  if (
    topicos.includes("regime diferenciado") || topicos.includes("específico") ||
    desc.includes("saúde") || desc.includes("medicamento") || desc.includes("farmacêutico") ||
    desc.includes("educação") || desc.includes("ensino") ||
    desc.includes("agropecuário") || desc.includes("agro") || desc.includes("rural") ||
    desc.includes("serviço financeiro") || desc.includes("seguro") ||
    desc.includes("regime específico") || desc.includes("regime diferenciado")
  ) {
    return "regime_diferenciado";
  }

  // ── 3. Alíquota Zero ──────────────────────────────────────────────────────
  if (
    topicos.includes("alíquota zero") || topicos.includes("aliquota zero") ||
    desc.includes("alíquota zero") || desc.includes("aliquota zero") ||
    desc.includes("isenção") || desc.includes("isento") ||
    type === "aliquota_zero"
  ) {
    return "aliquota_zero";
  }

  // ── 4. Alíquota Reduzida ──────────────────────────────────────────────────
  if (
    topicos.includes("alíquota reduzida") || topicos.includes("aliquota reduzida") ||
    desc.includes("alíquota reduzida") || desc.includes("aliquota reduzida") ||
    desc.includes("redução de alíquota") || desc.includes("50%") && desc.includes("alíquota")
  ) {
    return "aliquota_reduzida";
  }

  // ── 5. Split Payment ──────────────────────────────────────────────────────
  if (
    type === "split_payment" || type.includes("split") ||
    desc.includes("split payment") || desc.includes("recolhimento automático") ||
    desc.includes("split") || cat.includes("split")
  ) {
    return "split_payment";
  }

  // ── 6. IBS / CBS ─────────────────────────────────────────────────────────
  if (
    topicos.includes("cbs") || topicos.includes("ibs") ||
    desc.includes("ibs") || desc.includes("cbs") ||
    desc.includes("contribuição sobre bens") || desc.includes("imposto sobre bens") ||
    leiRef.includes("lc 214") || leiRef.includes("lc214")
  ) {
    return "ibs_cbs";
  }

  // ── 7. Cadastro Fiscal ────────────────────────────────────────────────────
  if (
    topicos.includes("inscrição") || topicos.includes("cadastro") ||
    desc.includes("inscrição") || desc.includes("cadastro") ||
    desc.includes("cnpj") || desc.includes("registro") ||
    type === "cnae_principal" || cat === "registro"
  ) {
    return "cadastro_fiscal";
  }

  // ── 8. Obrigação Acessória ────────────────────────────────────────────────
  if (
    type === "nfe" || type === "esocial" || type === "sped" || type === "erp" ||
    desc.includes("nf-e") || desc.includes("nota fiscal") ||
    desc.includes("sped") || desc.includes("esocial") ||
    desc.includes("obrigação acessória") || desc.includes("declaração") ||
    cat === "obrigacao_acessoria"
  ) {
    return "obrigacao_acessoria";
  }

  // ── 9. Fallback ───────────────────────────────────────────────────────────
  return "enquadramento_geral";
}

/**
 * Valida que a categoria não está vazia.
 * Lança Error se inválida (nunca deve acontecer com categorizeRisk).
 */
export function assertCategoria(
  categoria: string | null | undefined,
  riskId: string
): asserts categoria is CategoriaCanonica {
  if (!categoria || categoria.trim() === "") {
    throw new Error(`[risk-categorizer] Risco sem categoria: ${riskId}`);
  }
}
