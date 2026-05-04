/**
 * risk-categorizer.ts — Z-02 (DIV-Z01-005 Opção C)
 *
 * Categorias canônicas aprovadas da LC 214/2025 para riscos de compliance.
 * Integrado ao riskEngine.ts no ponto de gravação em project_risks_v3.
 *
 * Taxonomia aprovada final — 10 categorias (decisão Orquestrador 2026-04-07):
 *   1. imposto_seletivo      → Arts. 2–4 LC 214/2025
 *   2. regime_diferenciado   → saúde, educação, agro, financeiro
 *   3. aliquota_zero         → isenções, cesta básica
 *   4. aliquota_reduzida     → medicamentos, educação
 *   5. split_payment         → Art. 9 LC 214/2025 (aprovado DIV-Z01-005)
 *   6. ibs_cbs               → substituição ICMS/ISS/PIS/COFINS (inclui nao_cumulatividade)
 *   7. cadastro_fiscal        → inscrição, CNPJ, registro
 *   8. obrigacao_acessoria   → NF-e, SPED, eSocial (inclui compliance)
 *   9. transicao             → Arts. 25–30 LC 214/2025 (ADICIONADO DIV-Z01-005 Opção C)
 *  10. enquadramento_geral   → fallback
 *
 * Histórico:
 *   Z-02: 9 categorias iniciais (sem transicao)
 *   Z-02 pós-DIV-Z01-005: 10 categorias (transicao adicionada)
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
  | "transicao"
  | "enquadramento_geral"
  // M3.8-3: status para gap não-categorizável → não gera risco, vai para reviewQueue
  // Substitui fallback silencioso "enquadramento_geral" (REGRA-ORQ-29 + Lição #62)
  | "unmapped";

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
 * 1. Tópicos do RAG (mais específico)
 * 2. Descrição do risco
 * 3. Lei de referência
 * 4. Tipo técnico L3 (split_payment, nfe, etc.)
 * 5. Fallback: enquadramento_geral
 *
 * @param input - Dados do risco ou gap de origem
 * @returns Categoria canônica nunca vazia
 */
export function categorizeRisk(input: RiskCategorizationInput): CategoriaCanonica {
  const topicos = (input.topicos ?? "").toLowerCase();
  const desc = (input.description ?? "").toLowerCase();
  const leiRef = (input.lei_ref ?? "").toLowerCase();
  const type = (input.type ?? "").toLowerCase();
  const cat = (input.category ?? "").toLowerCase();

  // ── 1. Imposto Seletivo (IS) ────────────────────────────────────────────────
  if (
    topicos.includes("imposto seletivo") || topicos.includes("seletivo") ||
    desc.includes("imposto seletivo") || desc.includes(" is ") ||
    /art\.\s*[234]\b/.test(leiRef) ||
    desc.includes("destilado") || desc.includes("cigarro") || desc.includes("tabaco") ||
    (desc.includes("bebida alcoólica")) || (desc.includes("veículo") && desc.includes("combustível"))
  ) {
    return "imposto_seletivo";
  }

  // ── 2. Regime Diferenciado (saúde, educação, agro, financeiro) ──────────────
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

  // ── 3. Alíquota Zero ────────────────────────────────────────────────────────
  if (
    topicos.includes("alíquota zero") || topicos.includes("aliquota zero") ||
    desc.includes("alíquota zero") || desc.includes("aliquota zero") ||
    desc.includes("isenção") || desc.includes("isento") ||
    type === "aliquota_zero"
  ) {
    return "aliquota_zero";
  }

  // ── 4. Alíquota Reduzida ────────────────────────────────────────────────────
  if (
    topicos.includes("alíquota reduzida") || topicos.includes("aliquota reduzida") ||
    desc.includes("alíquota reduzida") || desc.includes("aliquota reduzida") ||
    desc.includes("redução de alíquota") ||
    (desc.includes("50%") && desc.includes("alíquota"))
  ) {
    return "aliquota_reduzida";
  }

  // ── 5. Split Payment ────────────────────────────────────────────────────────
  if (
    type === "split_payment" || type.includes("split") ||
    desc.includes("split payment") || desc.includes("recolhimento automático") ||
    desc.includes("split") || cat.includes("split")
  ) {
    return "split_payment";
  }

  // ── 6. Período de Transição (Arts. 25–30 LC 214/2025) ──────────────────────
  if (
    /art\.\s*2[5-9]\b/.test(leiRef) || /art\.\s*30\b/.test(leiRef) ||
    topicos.includes("transição") || topicos.includes("transicao") ||
    desc.includes("período de transição") || desc.includes("periodo de transicao") ||
    desc.includes("transição tributária") || desc.includes("2026") || desc.includes("2032") ||
    desc.includes("fase de transição") || desc.includes("regime de transição")
  ) {
    return "transicao";
  }

  // ── 7. IBS / CBS ───────────────────────────────────────────────────────────
  if (
    topicos.includes("cbs") || topicos.includes("ibs") ||
    desc.includes("ibs") || desc.includes("cbs") ||
    desc.includes("contribuição sobre bens") || desc.includes("imposto sobre bens") ||
    leiRef.includes("lc 214") || leiRef.includes("lc214")
  ) {
    return "ibs_cbs";
  }

  // ── 8. Cadastro Fiscal ──────────────────────────────────────────────────────
  if (
    topicos.includes("inscrição") || topicos.includes("cadastro") ||
    desc.includes("inscrição") || desc.includes("cadastro") ||
    desc.includes("cnpj") || desc.includes("registro") ||
    type === "cnae_principal" || cat === "registro"
  ) {
    return "cadastro_fiscal";
  }

  // ── 9. Obrigação Acessória ──────────────────────────────────────────────────
  if (
    type === "nfe" || type === "esocial" || type === "sped" || type === "erp" ||
    desc.includes("nf-e") || desc.includes("nota fiscal") ||
    desc.includes("sped") || desc.includes("esocial") ||
    desc.includes("obrigação acessória") || desc.includes("declaração") ||
    cat === "obrigacao_acessoria"
  ) {
    return "obrigacao_acessoria";
  }

  // ── 10. Fallback final (M3.8-3, REGRA-ORQ-29 + Lição #62) ────────────────────
  // ANTES: return "enquadramento_geral" — gerava risco fantasma sem rastreabilidade.
  // DEPOIS: "unmapped" — gap vai para reviewQueue (revisão humana), NÃO gera risco.
  // A categoria "enquadramento_geral" permanece válida quando explicitamente atribuída
  // por LLM ou curadoria humana (preservada nos demais 11 contextos do código).
  return "unmapped";
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
