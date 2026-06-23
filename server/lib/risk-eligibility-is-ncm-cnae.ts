/**
 * risk-eligibility-is-ncm-cnae.ts — Issue #1046
 *
 * Filtro de elegibilidade do Imposto Seletivo (IS) por NCM/CNAE conforme
 * Art. 409 §1º LC 214/2025. Bloqueia geração de risco IS para empresas
 * que não comercializam bens/serviços sujeitos ao IS.
 *
 * Lista taxativa do Art. 409 §1º LC 214/2025 (7 incisos, na ordem da lei):
 *   I.   veículos                                 → NCM 87
 *   II.  embarcações e aeronaves                  → NCM 89, 88
 *   III. produtos fumígenos (tabaco)             → NCM 24
 *   IV.  bebidas alcoólicas                       → NCM 22
 *   V.   bebidas açucaradas                       → NCM 22 (subset)
 *   VI.  bens minerais (petróleo, ferro,
 *        manganês, ouro, etc.)                    → NCM 26, 27
 *   VII. concursos de prognósticos e fantasy
 *        sport (apostas)                          → CNAE 92
 *
 * Errata CONS-IS-ART-01 (23/06/2026): a referência "Art. 393 §1º" estava
 * INCORRETA (Art. 393 = regularização de crédito apurado a maior). O IS é o
 * Art. 409 §1º (LC 214/2025, Livro II — Do Imposto Seletivo), verificado no PDF
 * primário (parecer do Consultor). A lei une "embarcações e aeronaves" no inciso
 * II (o código separava em 2). Substância dos NCMs inalterada — só a referência
 * legal e a estrutura de incisos.
 *
 * Caso canônico empírico (projeto #5040001 — I COMÉRCIO - UIRES - 6h52):
 *   NCMs: 2306.10.00, 2304.00.10 (Capítulo 23 — farelos de soja)
 *   CNAE principal: 4623-1/09 (comércio atacadista alimentos para animais)
 *   → Nenhum prefix da lista taxativa → IS NÃO deve ser gerado.
 *
 * REGRA-ORQ-32 (tech debt declarado):
 *   Prefixes hardcoded por escopo da Issue #1046. Migração para tabela
 *   `is_eligibility_rules` é evolução futura — permite refinamento por
 *   curadoria jurídica (ex: distinguir bebidas alcoólicas de águas
 *   minerais dentro do Capítulo 22).
 */

import { isNcmResolverEnabled } from "./ncm-nbs-resolver";

/**
 * Prefixes de NCM elegíveis ao IS conforme Art. 409 §1º LC 214/2025.
 *
 * NOTA sobre conservadorismo: usar prefixo de Capítulo (2 dígitos) é
 * intencionalmente CONSERVADOR — mantém riscos potenciais visíveis ao
 * advogado para validação. Falsos positivos preferíveis a falsos negativos
 * em compliance tributária.
 *
 * Refinamento curatorial futuro (ex: distinguir 2201 águas vs 2203 cervejas)
 * cabe em sprint de migração para tabela de configuração.
 */
const IS_ELIGIBLE_NCM_PREFIXES: readonly string[] = [
  "22", // Capítulo 22 — bebidas (alcoólicas e açucaradas)
  "24", // Capítulo 24 — tabaco e produtos fumígenos
  "26", // Capítulo 26 — minérios, escórias, cinzas
  "27", // Capítulo 27 — combustíveis fósseis e óleos minerais
  "87", // Capítulo 87 — veículos automotores
  "88", // Capítulo 88 — aeronaves
  "89", // Capítulo 89 — embarcações
] as const;

/**
 * Prefixes de CNAE (Divisão de 2 dígitos) elegíveis ao IS conforme
 * Art. 393 §1º VIII LC 214/2025.
 */
const IS_ELIGIBLE_CNAE_PREFIXES: readonly string[] = [
  "92", // Divisão 92 — atividades artísticas, esportivas e jogos (apostas)
] as const;

export type ImpostoSeletivoEligibilityReason =
  | "ncm_cnae_not_in_art_393"
  | "ncm_cnae_ausentes"
  | "ncm_ausente"; // #1219 F3 — NCM ausente com resolver ON (fecha #827)

export interface ImpostoSeletivoEligibilityResult {
  eligible: boolean;
  reason: ImpostoSeletivoEligibilityReason | null;
  matchedPrefix: string | null;
}

/** Remove caracteres não-dígitos para normalizar NCM/CNAE. */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Verifica se o projeto é elegível ao Imposto Seletivo conforme NCMs/CNAEs.
 *
 * Comportamento:
 *   - Se algum NCM tem prefixo elegível → eligible=true (matchedPrefix=ncm)
 *   - Se algum CNAE tem prefixo elegível → eligible=true (matchedPrefix=cnae)
 *   - Se nenhum NCM/CNAE bate → eligible=false, reason="ncm_cnae_not_in_art_393"
 *   - Se ambos arrays vazios → eligible=true, reason="ncm_cnae_ausentes"
 *     (fallback permissivo — sem dado, não bloqueia; mantém comportamento
 *     conservador para empresas em onboarding sem cadastro completo)
 *
 * @param ncmCodes NCMs do projeto (productNcms do extractProjectProfile)
 * @param cnaes    CNAEs confirmados do projeto
 */
export function isImpostoSeletivoEligible(
  ncmCodes: readonly string[],
  cnaes: readonly string[],
): ImpostoSeletivoEligibilityResult {
  // GATE-NCM-NBS #1219 F3 (M3) — fecha #827: com o resolver ON, NCM ausente
  // NÃO é elegível ao IS (antes caía no fallback permissivo ncm_cnae_ausentes,
  // gerando falso-positivo — caso 5040001/F11). IS mantém prefixo 2 díg. para
  // NCMs presentes (semântica legal Art. 393 §1º). Gated por flag → zero
  // regressão com ENABLE_NCM_RESOLVER off.
  if (isNcmResolverEnabled() && ncmCodes.length === 0) {
    return { eligible: false, reason: "ncm_ausente", matchedPrefix: null };
  }

  const ncmHits = ncmCodes
    .map((ncm) => {
      const digits = digitsOnly(ncm);
      const matched = IS_ELIGIBLE_NCM_PREFIXES.find((p) => digits.startsWith(p));
      return matched ? { ncm, prefix: matched } : null;
    })
    .filter(Boolean);

  if (ncmHits.length > 0) {
    return {
      eligible: true,
      reason: null,
      matchedPrefix: `ncm:${ncmHits[0]!.prefix}`,
    };
  }

  const cnaeHits = cnaes
    .map((cnae) => {
      const digits = digitsOnly(cnae);
      const matched = IS_ELIGIBLE_CNAE_PREFIXES.find((p) => digits.startsWith(p));
      return matched ? { cnae, prefix: matched } : null;
    })
    .filter(Boolean);

  if (cnaeHits.length > 0) {
    return {
      eligible: true,
      reason: null,
      matchedPrefix: `cnae:${cnaeHits[0]!.prefix}`,
    };
  }

  // Edge case: sem NCMs nem CNAEs declarados → fallback permissivo.
  // Evita bloquear projetos em onboarding sem cadastro completo.
  if (ncmCodes.length === 0 && cnaes.length === 0) {
    return {
      eligible: true,
      reason: "ncm_cnae_ausentes",
      matchedPrefix: null,
    };
  }

  return {
    eligible: false,
    reason: "ncm_cnae_not_in_art_393",
    matchedPrefix: null,
  };
}
