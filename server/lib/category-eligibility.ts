/**
 * category-eligibility.ts — PR-B F1 (A-5 · Lição #137)
 * ─────────────────────────────────────────────────────────────────────────────
 * FONTE ÚNICA de elegibilidade de categoria de risco. Consolida as duas tabelas
 * divergentes que existiam:
 *   - filtrarCategoriasPorPerfil (routers-fluxo-v3.ts:160) — geração Onda 2
 *   - isCategoryAllowed/ELIGIBILITY_TABLE (risk-eligibility.ts) — matriz risk-engine-v4
 *
 * F1 é ADITIVO: este módulo NÃO é consumido ainda (F2 = wrapper isCategoryAllowed;
 * F3 = wrapper filtrarCategoriasPorPerfil — ambos atrás de ENABLE_UNIFIED_ELIGIBILITY).
 * Zero mudança de comportamento ao mergear F1.
 *
 * Decisões (Parecer Consultor, despacho v80, Lcp_214.pdf — 100% determinístico):
 *
 *   D1-IS  imposto_seletivo NÃO é gateado por operationType (aproximação não-normativa).
 *          Critério real = NCM/CNAE (Art. 409 §1º + Anexo XVII) em
 *          risk-eligibility-is-ncm-cnae.ts. Aqui é NÃO-AUTORITATIVO (allowed=true,
 *          authoritative=false) → a decisão real fica no gate NCM/CNAE. Ver #1282.
 *
 *   D1-RD  regime_diferenciado: critério correto é SETORIAL (NCM/NBS/CNAE por capítulo
 *          do Título IV, Arts. 127/128). A regra por operationType abaixo é PALIATIVO
 *          documentado (band-aid): exclui apenas `industria`. FALSO NEGATIVO conhecido:
 *          indústria de dispositivos médicos (Art. 128 III) e medicamentos (Art. 128 V)
 *          são industria elegível e seriam suprimidos. Fix real = #1506 (subdivisão).
 *
 *   split_payment: gate EXPLÍCITO por meio de pagamento / intermediários (não "sempre
 *          permite" como a ELIGIBILITY_TABLE atual, que não tinha a regra).
 *
 *   transicao_iss_ibs: ["servicos","misto"] (Art. 342) — consistente pós-#1507.
 *
 * ROBUSTEZ A PERFIL PARCIAL (divergência de input AS-IS): a matriz só dispõe de
 * `operationType`; a Onda 2 dispõe do perfil rico. Cada regra trata o input AUSENTE
 * como PERMISSIVO na dimensão correspondente (não derruba a categoria por falta de
 * dado) — preserva o comportamento permissivo de isCategoryAllowed (operation_type_ausente)
 * e evita falso negativo no wrapper da matriz (ex.: split_payment sem paymentMethods).
 */

export interface CategoryEligibilityProfile {
  operationType?: string | null;
  /** financialProfile.paymentMethods */
  paymentMethods?: string[] | null;
  /** financialProfile.hasIntermediaries */
  hasIntermediaries?: boolean | null;
  /** taxComplexity.usesTaxIncentives */
  usesTaxIncentives?: boolean | null;
}

export interface CategoryEligibilityResult {
  allowed: boolean;
  /** rótulo do motivo quando bloqueado/condicional; null quando permitido sem ressalva */
  reason: string | null;
  /**
   * false = a decisão NÃO é autoritativa aqui; o gate real está em outro lugar
   * (ex.: imposto_seletivo → risk-eligibility-is-ncm-cnae.ts). Consumidores podem
   * usar para não sobrepor o gate autoritativo.
   */
  authoritative: boolean;
}

const PERMITIDO: CategoryEligibilityResult = {
  allowed: true,
  reason: null,
  authoritative: true,
};

const SPLIT_PAYMENT_METHODS = ["cartao", "cartão", "marketplace", "pix"];

/** operationType ausente/vazio → não há como restringir por essa dimensão. */
function opTypeAusente(op: string | null | undefined): boolean {
  return !op || op.trim() === "";
}

type Rule = (p: CategoryEligibilityProfile) => CategoryEligibilityResult;

const RULES: Record<string, Rule> = {
  // D1-IS — NÃO-AUTORITATIVO: gate real é NCM/CNAE (Art. 409 §1º). Ver #1282.
  imposto_seletivo: () => ({
    allowed: true,
    reason: "is_ncm_cnae_driven",
    authoritative: false,
  }),

  // Art. 342 — transição ISS→IBS: só prestadores de serviço.
  transicao_iss_ibs: (p) =>
    opTypeAusente(p.operationType)
      ? { allowed: true, reason: "operation_type_ausente", authoritative: true }
      : {
          allowed: ["servicos", "misto"].includes(p.operationType!.trim()),
          reason: ["servicos", "misto"].includes(p.operationType!.trim())
            ? null
            : "sujeito_passivo_incompativel",
          authoritative: true,
        },

  // D1-RD — PALIATIVO (band-aid): exclui só industria. Critério correto = setorial
  // (Título IV). Falso negativo: industria dispositivos médicos/medicamentos (Art.128 III/V).
  // Fix real = #1506.
  regime_diferenciado: (p) =>
    opTypeAusente(p.operationType)
      ? { allowed: true, reason: "operation_type_ausente", authoritative: false }
      : {
          allowed: ["servicos", "misto", "agronegocio", "comercio"].includes(
            p.operationType!.trim(),
          ),
          reason: ["servicos", "misto", "agronegocio", "comercio"].includes(
            p.operationType!.trim(),
          )
            ? null
            : "regime_diferenciado_paliativo_industria",
          // não-autoritativo: o critério normativo real é setorial (#1506)
          authoritative: false,
        },

  // Gate explícito por meio de pagamento / intermediários. Input ausente → permissivo.
  split_payment: (p) => {
    const semDados =
      (p.paymentMethods == null || p.paymentMethods.length === 0) &&
      (p.hasIntermediaries == null);
    if (semDados) {
      return { allowed: true, reason: "payment_data_ausente", authoritative: true };
    }
    const casa =
      (p.paymentMethods ?? []).some((m) => SPLIT_PAYMENT_METHODS.includes(m)) ||
      p.hasIntermediaries === true;
    return {
      allowed: casa,
      reason: casa ? null : "sem_meio_split_payment",
      authoritative: true,
    };
  },
};

/**
 * Resolve a elegibilidade de uma categoria dado o perfil (parcial ou completo).
 * Categoria sem regra → permitida (default-permissivo, paridade com isCategoryAllowed).
 */
export function resolveCategoryEligibility(
  codigo: string,
  profile: CategoryEligibilityProfile,
): CategoryEligibilityResult {
  const rule = RULES[codigo];
  return rule ? rule(profile) : PERMITIDO;
}

/** Conveniência booleana. */
export function isCategoryEligible(
  codigo: string,
  profile: CategoryEligibilityProfile,
): boolean {
  return resolveCategoryEligibility(codigo, profile).allowed;
}

/** Categorias com regra explícita (para testes/observabilidade). */
export const RULED_CATEGORIES = Object.keys(RULES);

/**
 * Feature flag (PR-B F2/F3) — rollback cold→hot. OFF (default) = os consumers
 * (isCategoryAllowed / filtrarCategoriasPorPerfil) mantêm o comportamento legado;
 * ON = roteiam por esta fonte única. Flip só após DoD de paridade (F4) +
 * confirmação do gate NCM/CNAE do IS (D1-IS — #1282).
 */
export function isUnifiedEligibilityEnabled(): boolean {
  return process.env.ENABLE_UNIFIED_ELIGIBILITY === "true";
}
