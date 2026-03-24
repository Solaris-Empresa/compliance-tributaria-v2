/**
 * shared/questionario-prefill.ts
 *
 * PREFILL CONTRACT v1 — Sub-Sprint Estrutural de Prefill Contract
 *
 * Regras arquiteturais (DA-1 a DA-5):
 *   DA-1: Path canônico = JSON aninhado (companyProfile, operationProfile, etc.)
 *   DA-2: Frontend nunca recebe string JSON — normalização feita na API
 *   DA-3: Nenhum questionário tem lógica local de prefill — tudo aqui
 *   DA-4: Três tipos: direto | derivado | sem prefill legítimo
 *   DA-5: Campo coletado + mapeado = não pode reaparecer vazio
 *
 * Campos SEM prefill legítimo (dado não coletado no formulário inicial):
 *   - qc02_grupo (grupo econômico)
 *   - qc02_centralizacao (operações centralizadas)
 */

// ─────────────────────────────────────────────────────────────────────────────
// OBSERVABILIDADE — PrefillTrace
// Fase 6 da Sub-Sprint: tornar erro de hidratação visível
// ─────────────────────────────────────────────────────────────────────────────

export interface PrefillTrace {
  /** Campos que deveriam ser preenchidos segundo a Prefill Contract Matrix */
  prefill_fields_expected: string[];
  /** Campos efetivamente preenchidos */
  prefill_fields_resolved: string[];
  /** Campos esperados mas não resolvidos (dado ausente ou null) */
  prefill_fields_missing: string[];
  /** Paths canônicos que foram lidos com sucesso */
  prefill_source_paths_used: string[];
  /** Erros de serialização capturados (string JSON inesperada) */
  prefill_parse_errors: string[];
}

function emptyTrace(): PrefillTrace {
  return {
    prefill_fields_expected: [],
    prefill_fields_resolved: [],
    prefill_fields_missing: [],
    prefill_source_paths_used: [],
    prefill_parse_errors: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONÁRIO CORPORATIVO — QC-01 e QC-02
// ─────────────────────────────────────────────────────────────────────────────

export const TAX_REGIME_MAP: Record<string, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  mei: "MEI / Microempresa (até R$ 360 mil)",
};

export const COMPANY_SIZE_MAP: Record<string, string> = {
  mei: "MEI / Microempresa (até R$ 360 mil)",
  micro: "MEI / Microempresa (até R$ 360 mil)",
  pequena: "Empresa de Pequeno Porte (até R$ 4,8 mi)",
  media: "Médio porte (até R$ 78 mi)",
  grande: "Grande porte (acima de R$ 78 mi)",
};

/**
 * Tipo canônico do projeto normalizado esperado pelos builders.
 * Todos os campos JSON chegam como objetos (nunca string) após normalizeProject().
 */
export interface NormalizedProjectForPrefill {
  // Colunas diretas (legado — não usar como fonte primária de prefill)
  taxRegime?: string | null;
  companySize?: string | null;
  // JSONs canônicos (DA-1: fonte da verdade)
  companyProfile?: {
    taxRegime?: string;
    companySize?: string;
    companyType?: string;
    cnpj?: string;
    annualRevenueRange?: string;
  } | null;
  operationProfile?: {
    operationType?: string;
    clientType?: string[];
    multiState?: boolean | null;
  } | null;
  financialProfile?: {
    paymentMethods?: string[];
    hasIntermediaries?: boolean | null;
  } | null;
  governanceProfile?: {
    hasTaxTeam?: boolean | null;
    hasAudit?: boolean | null;
    hasTaxIssues?: boolean | null;
  } | null;
  taxComplexity?: {
    hasMultipleEstablishments?: boolean | null;
    hasImportExport?: boolean | null;
    hasSpecialRegimes?: boolean | null;
  } | null;
  confirmedCnaes?: Array<{ code: string; description?: string }> | null;
}

/**
 * buildCorporatePrefill — QC-01 e QC-02
 *
 * Campos pré-preenchidos:
 *   qc01_regime      (direto)   ← companyProfile.taxRegime
 *   qc01_porte       (direto)   ← companyProfile.companySize
 *   qc02_filiais     (derivado) ← operationProfile.multiState | taxComplexity.hasMultipleEstablishments
 *
 * Campos SEM prefill legítimo (dado não coletado):
 *   qc02_grupo        — grupo econômico não é coletado no formulário inicial
 *   qc02_centralizacao — centralização fiscal não é coletada no formulário inicial
 */
export function buildCorporatePrefill(
  projeto: NormalizedProjectForPrefill,
  options?: { trace?: boolean }
): Record<string, string> & { _trace?: PrefillTrace } {
  const prefill: Record<string, string> = {};
  const trace = emptyTrace();

  // ── QC-01-P1: Regime tributário (direto) ────────────────────────────────
  // DA-1: path canônico = companyProfile.taxRegime
  // Fallback para coluna direta por compatibilidade com projetos legados
  trace.prefill_fields_expected.push("qc01_regime");
  const taxRegime = projeto.companyProfile?.taxRegime ?? projeto.taxRegime;
  if (taxRegime) trace.prefill_source_paths_used.push("companyProfile.taxRegime");
  if (taxRegime && TAX_REGIME_MAP[taxRegime]) {
    prefill["qc01_regime"] = TAX_REGIME_MAP[taxRegime];
    trace.prefill_fields_resolved.push("qc01_regime");
  } else {
    trace.prefill_fields_missing.push("qc01_regime");
  }

  // ── QC-01-P2: Porte da empresa (direto) ─────────────────────────────────
  trace.prefill_fields_expected.push("qc01_porte");
  const companySize = projeto.companyProfile?.companySize ?? projeto.companySize;
  if (companySize) trace.prefill_source_paths_used.push("companyProfile.companySize");
  if (companySize && COMPANY_SIZE_MAP[companySize]) {
    prefill["qc01_porte"] = COMPANY_SIZE_MAP[companySize];
    trace.prefill_fields_resolved.push("qc01_porte");
  } else {
    trace.prefill_fields_missing.push("qc01_porte");
  }

  // ── QC-02-P2: Estabelecimentos em outros estados (derivado) ─────────────
  // DA-4: derivável de multiState ou hasMultipleEstablishments
  trace.prefill_fields_expected.push("qc02_filiais");
  const multiState = projeto.operationProfile?.multiState;
  const hasMultipleEstablishments = projeto.taxComplexity?.hasMultipleEstablishments;
  // Prioridade: multiState (operationProfile) > hasMultipleEstablishments (taxComplexity)
  const filiaisSource = multiState !== null && multiState !== undefined
    ? multiState
    : hasMultipleEstablishments;
  if (filiaisSource !== null && filiaisSource !== undefined) {
    trace.prefill_source_paths_used.push(
      multiState !== null && multiState !== undefined
        ? "operationProfile.multiState"
        : "taxComplexity.hasMultipleEstablishments"
    );
    prefill["qc02_filiais"] = filiaisSource ? "Sim" : "Não";
    trace.prefill_fields_resolved.push("qc02_filiais");
  } else {
    trace.prefill_fields_missing.push("qc02_filiais");
  }

  // ── QC-02-P1: Grupo econômico — SEM PREFILL LEGÍTIMO ────────────────────
  // DA-4: dado não coletado no formulário inicial. Campo permanece em aberto.
  // (não adicionar a prefill_fields_expected — ausência intencional)

  // ── QC-02-P3: Centralização fiscal — SEM PREFILL LEGÍTIMO ───────────────
  // DA-4: dado não coletado no formulário inicial. Campo permanece em aberto.
  // (não adicionar a prefill_fields_expected — ausência intencional)

  if (options?.trace) {
    return { ...prefill, _trace: trace };
  }
  return prefill;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONÁRIO OPERACIONAL — QO-01, QO-03, QO-08
// ─────────────────────────────────────────────────────────────────────────────

/** operationProfile.operationType → canais de venda (checkbox) */
export const OPERATION_TYPE_TO_CANAIS: Record<string, string[]> = {
  industria: ["Venda direta B2B"],
  comercio: ["Loja física"],
  servicos: ["Venda direta B2B"],
  misto: ["Loja física", "Venda direta B2B"],
  agronegocio: ["Venda direta B2B"],
  financeiro: ["Venda direta B2B"],
  produto: ["Loja física"],
  servico: ["Venda direta B2B"],
};

/** operationProfile.clientType[] → perfil de clientes (radio) */
export function clientTypeToPerfilClientes(clientTypes: string[]): string {
  if (!clientTypes || clientTypes.length === 0) return "";
  const hasB2C = clientTypes.includes("b2c");
  const hasB2B = clientTypes.includes("b2b");
  const hasB2G = clientTypes.includes("b2g");
  const hasB2B2C = clientTypes.includes("b2b2c");
  if (hasB2B2C) return "Misto (B2B e B2C)";
  if (hasB2C && hasB2B) return "Misto (B2B e B2C)";
  if (hasB2G && !hasB2B && !hasB2C) return "Governo (B2G)";
  if (hasB2B && !hasB2C) return "Pessoa Jurídica (B2B)";
  if (hasB2C && !hasB2B) return "Pessoa Física (B2C)";
  return "Misto (B2B e B2C)";
}

/** financialProfile.paymentMethods[] → meios de pagamento (checkbox) */
export const PAYMENT_METHOD_MAP: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão de débito",
  boleto: "Boleto bancário",
  transferencia: "TED/DOC",
  dinheiro: "Dinheiro em espécie",
  marketplace: "Outro",
};

/** governanceProfile.hasTaxTeam → gestão fiscal (radio) */
export function hasTaxTeamToEquipe(hasTaxTeam: boolean | null | undefined): string {
  if (hasTaxTeam === true) return "Equipe interna dedicada";
  if (hasTaxTeam === false) return "Contador autônomo";
  return "";
}

export function buildOperationalPrefill(
  projeto: NormalizedProjectForPrefill,
  options?: { trace?: boolean }
): Record<string, string | string[]> & { _trace?: PrefillTrace } {
  const prefill: Record<string, string | string[]> = {};
  const trace = emptyTrace();

  const op = projeto.operationProfile;
  const fp = projeto.financialProfile;
  const gp = projeto.governanceProfile;

  // ── QO-01-P1: Canais de venda (derivado) ← operationProfile.operationType
  trace.prefill_fields_expected.push("qo01_canais");
  if (op?.operationType && OPERATION_TYPE_TO_CANAIS[op.operationType]) {
    trace.prefill_source_paths_used.push("operationProfile.operationType");
    prefill["qo01_canais"] = OPERATION_TYPE_TO_CANAIS[op.operationType];
    trace.prefill_fields_resolved.push("qo01_canais");
  } else {
    trace.prefill_fields_missing.push("qo01_canais");
  }

  // ── QO-01-P2: Perfil de clientes (derivado) ← operationProfile.clientType[]
  trace.prefill_fields_expected.push("qo01_clientes");
  if (op?.clientType && Array.isArray(op.clientType) && op.clientType.length > 0) {
    trace.prefill_source_paths_used.push("operationProfile.clientType");
    const perfilClientes = clientTypeToPerfilClientes(op.clientType);
    if (perfilClientes) {
      prefill["qo01_clientes"] = perfilClientes;
      trace.prefill_fields_resolved.push("qo01_clientes");
    } else {
      trace.prefill_fields_missing.push("qo01_clientes");
    }
  } else {
    trace.prefill_fields_missing.push("qo01_clientes");
  }

  // ── QO-03-P1: Meios de pagamento (direto) ← financialProfile.paymentMethods[]
  trace.prefill_fields_expected.push("qo03_meios");
  if (fp?.paymentMethods && Array.isArray(fp.paymentMethods) && fp.paymentMethods.length > 0) {
    trace.prefill_source_paths_used.push("financialProfile.paymentMethods");
    const meios = fp.paymentMethods
      .map((m: string) => PAYMENT_METHOD_MAP[m])
      .filter(Boolean) as string[];
    if (meios.length > 0) {
      prefill["qo03_meios"] = meios;
      trace.prefill_fields_resolved.push("qo03_meios");
    } else {
      trace.prefill_fields_missing.push("qo03_meios");
    }
  } else {
    trace.prefill_fields_missing.push("qo03_meios");
  }

  // ── QO-08-P2: Gestão fiscal (derivado) ← governanceProfile.hasTaxTeam
  trace.prefill_fields_expected.push("qo08_equipe");
  if (gp?.hasTaxTeam !== undefined && gp?.hasTaxTeam !== null) {
    trace.prefill_source_paths_used.push("governanceProfile.hasTaxTeam");
    const equipe = hasTaxTeamToEquipe(gp.hasTaxTeam);
    if (equipe) {
      prefill["qo08_equipe"] = equipe;
      trace.prefill_fields_resolved.push("qo08_equipe");
    } else {
      trace.prefill_fields_missing.push("qo08_equipe");
    }
  } else {
    trace.prefill_fields_missing.push("qo08_equipe");
  }

  if (options?.trace) {
    return { ...prefill, _trace: trace };
  }
  return prefill;
}

/** Detecta quais seções do Operacional têm campos pré-preenchidos */
export function getPrefilledSectionsOperacional(projeto: NormalizedProjectForPrefill): Set<string> {
  const filled = new Set<string>();
  const op = projeto?.operationProfile;
  const fp = projeto?.financialProfile;
  const gp = projeto?.governanceProfile;
  if (op?.operationType || (op?.clientType && op.clientType.length > 0)) filled.add("QO-01");
  if (fp?.paymentMethods && fp.paymentMethods.length > 0) filled.add("QO-03");
  if (gp?.hasTaxTeam !== undefined && gp?.hasTaxTeam !== null) filled.add("QO-08");
  return filled;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONÁRIO CNAE — QCNAE-01
// ─────────────────────────────────────────────────────────────────────────────

/** operationProfile.operationType → setor econômico principal (radio) */
export const OPERATION_TYPE_TO_SETOR: Record<string, string> = {
  industria: "Indústria (transformação, extração, construção)",
  comercio: "Comércio (atacado ou varejo)",
  servicos: "Serviços (geral)",
  misto: "Serviços (geral)",
  agronegocio: "Agronegócio / Agropecuária",
  financeiro: "Financeiro / Seguros",
  produto: "Comércio (atacado ou varejo)",
  servico: "Serviços (geral)",
};

/** confirmedCnaes[].length → múltiplos CNAEs (radio) */
export function cnaeCountToAtividades(count: number): string {
  if (count > 4) return "Sim — mais de 3 CNAEs secundários";
  if (count >= 2) return "Sim — 1 a 3 CNAEs secundários";
  return "Não — apenas CNAE principal";
}

/** confirmedCnaes[] → texto descritivo para textarea */
export function cnaesToObservacoes(cnaes: Array<{ code: string; description?: string }>): string {
  if (!cnaes || cnaes.length === 0) return "";
  return cnaes.map(c => `${c.code}${c.description ? ` — ${c.description}` : ""}`).join("\n");
}

export function buildCnaePrefill(
  projeto: NormalizedProjectForPrefill,
  options?: { trace?: boolean }
): Record<string, string> & { _trace?: PrefillTrace } {
  const prefill: Record<string, string> = {};
  const trace = emptyTrace();

  const op = projeto.operationProfile;
  // DA-2: confirmedCnaes chega como array após normalizeProject()
  // Defesa extra: se ainda for string (projeto legado sem normalização), tratar graciosamente
  let cnaes: Array<{ code: string; description?: string }> = [];
  if (Array.isArray(projeto.confirmedCnaes)) {
    cnaes = projeto.confirmedCnaes;
  } else if (typeof projeto.confirmedCnaes === "string") {
    trace.prefill_parse_errors.push("confirmedCnaes chegou como string — normalizeProject() não foi aplicado");
    try { cnaes = JSON.parse(projeto.confirmedCnaes as unknown as string); } catch { cnaes = []; }
  }

  // ── QCNAE-01: Setor econômico (derivado) ← operationProfile.operationType
  trace.prefill_fields_expected.push("qcnae01_setor");
  if (op?.operationType && OPERATION_TYPE_TO_SETOR[op.operationType]) {
    trace.prefill_source_paths_used.push("operationProfile.operationType");
    prefill["qcnae01_setor"] = OPERATION_TYPE_TO_SETOR[op.operationType];
    trace.prefill_fields_resolved.push("qcnae01_setor");
  } else {
    trace.prefill_fields_missing.push("qcnae01_setor");
  }

  // ── QCNAE-01: Múltiplos CNAEs (derivado) ← confirmedCnaes[].length
  trace.prefill_fields_expected.push("qcnae01_atividades");
  if (cnaes.length > 0) {
    trace.prefill_source_paths_used.push("confirmedCnaes");
    prefill["qcnae01_atividades"] = cnaeCountToAtividades(cnaes.length);
    trace.prefill_fields_resolved.push("qcnae01_atividades");
    const obs = cnaesToObservacoes(cnaes);
    if (obs) {
      prefill["qcnae01_observacoes"] = obs;
      trace.prefill_fields_resolved.push("qcnae01_observacoes");
    }
  } else {
    trace.prefill_fields_missing.push("qcnae01_atividades");
  }

  if (options?.trace) {
    return { ...prefill, _trace: trace };
  }
  return prefill;
}

/** Detecta quais seções do CNAE têm campos pré-preenchidos */
export function getPrefilledSectionsCnae(projeto: NormalizedProjectForPrefill): Set<string> {
  const filled = new Set<string>();
  const op = projeto?.operationProfile;
  const cnaes = projeto?.confirmedCnaes;
  if (op?.operationType || (Array.isArray(cnaes) && cnaes.length > 0)) {
    filled.add("QCNAE-01");
  }
  return filled;
}
