/**
 * shared/questionario-prefill.ts
 * Funções puras de pré-preenchimento dos questionários Corporativo, Operacional e CNAE.
 * Extraídas para módulo compartilhado para facilitar testes unitários.
 *
 * v2.2 — Sprint de correção de redundâncias nos questionários
 */

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONÁRIO CORPORATIVO (QC-01)
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

export function buildCorporatePrefill(projeto: {
  taxRegime?: string | null;
  companySize?: string | null;
  companyProfile?: { taxRegime?: string; companySize?: string } | null;
}): Record<string, string> {
  const prefill: Record<string, string> = {};

  // Suporta tanto campos diretos quanto companyProfile aninhado
  const taxRegime = projeto.taxRegime ?? projeto.companyProfile?.taxRegime;
  const companySize = projeto.companySize ?? projeto.companyProfile?.companySize;

  if (taxRegime && TAX_REGIME_MAP[taxRegime]) {
    prefill["qc01_regime"] = TAX_REGIME_MAP[taxRegime];
  }
  if (companySize && COMPANY_SIZE_MAP[companySize]) {
    prefill["qc01_porte"] = COMPANY_SIZE_MAP[companySize];
  }
  return prefill;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONÁRIO OPERACIONAL (QO-01, QO-03, QO-08)
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

export function buildOperationalPrefill(projeto: {
  operationProfile?: {
    operationType?: string;
    clientType?: string[];
  } | null;
  financialProfile?: {
    paymentMethods?: string[];
  } | null;
  governanceProfile?: {
    hasTaxTeam?: boolean | null;
  } | null;
}): Record<string, string | string[]> {
  const prefill: Record<string, string | string[]> = {};
  const op = projeto.operationProfile;
  const fp = projeto.financialProfile;
  const gp = projeto.governanceProfile;

  // QO-01-P1: Canais de venda ← operationProfile.operationType
  if (op?.operationType && OPERATION_TYPE_TO_CANAIS[op.operationType]) {
    prefill["qo01_canais"] = OPERATION_TYPE_TO_CANAIS[op.operationType];
  }

  // QO-01-P2: Perfil de clientes ← operationProfile.clientType[]
  if (op?.clientType && Array.isArray(op.clientType) && op.clientType.length > 0) {
    const perfilClientes = clientTypeToPerfilClientes(op.clientType);
    if (perfilClientes) prefill["qo01_clientes"] = perfilClientes;
  }

  // QO-03-P1: Meios de pagamento ← financialProfile.paymentMethods[]
  if (fp?.paymentMethods && Array.isArray(fp.paymentMethods) && fp.paymentMethods.length > 0) {
    const meios = fp.paymentMethods
      .map((m: string) => PAYMENT_METHOD_MAP[m])
      .filter(Boolean) as string[];
    if (meios.length > 0) prefill["qo03_meios"] = meios;
  }

  // QO-08-P2: Gestão fiscal ← governanceProfile.hasTaxTeam
  if (gp?.hasTaxTeam !== undefined && gp?.hasTaxTeam !== null) {
    const equipe = hasTaxTeamToEquipe(gp.hasTaxTeam);
    if (equipe) prefill["qo08_equipe"] = equipe;
  }

  return prefill;
}

/** Detecta quais seções do Operacional têm campos pré-preenchidos */
export function getPrefilledSectionsOperacional(projeto: {
  operationProfile?: { operationType?: string; clientType?: string[] } | null;
  financialProfile?: { paymentMethods?: string[] } | null;
  governanceProfile?: { hasTaxTeam?: boolean | null } | null;
}): Set<string> {
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
// QUESTIONÁRIO CNAE (QCNAE-01)
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

export function buildCnaePrefill(projeto: {
  operationProfile?: { operationType?: string } | null;
  confirmedCnaes?: Array<{ code: string; description?: string }> | null;
}): Record<string, string> {
  const prefill: Record<string, string> = {};
  const op = projeto.operationProfile;
  const cnaes = Array.isArray(projeto.confirmedCnaes) ? projeto.confirmedCnaes : [];

  // QCNAE-01: Setor econômico ← operationProfile.operationType
  if (op?.operationType && OPERATION_TYPE_TO_SETOR[op.operationType]) {
    prefill["qcnae01_setor"] = OPERATION_TYPE_TO_SETOR[op.operationType];
  }

  // QCNAE-01: Múltiplos CNAEs ← confirmedCnaes[].length
  if (cnaes.length > 0) {
    prefill["qcnae01_atividades"] = cnaeCountToAtividades(cnaes.length);
    const obs = cnaesToObservacoes(cnaes);
    if (obs) prefill["qcnae01_observacoes"] = obs;
  }

  return prefill;
}

/** Detecta quais seções do CNAE têm campos pré-preenchidos */
export function getPrefilledSectionsCnae(projeto: {
  operationProfile?: { operationType?: string } | null;
  confirmedCnaes?: Array<{ code: string; description?: string }> | null;
}): Set<string> {
  const filled = new Set<string>();
  const op = projeto?.operationProfile;
  const cnaes = projeto?.confirmedCnaes;
  if (op?.operationType || (Array.isArray(cnaes) && cnaes.length > 0)) {
    filled.add("QCNAE-01");
  }
  return filled;
}
