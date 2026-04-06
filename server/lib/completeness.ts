/**
 * M3 Fase 1 — Consolidador de Completude Diagnóstica
 *
 * DEC-M3-01: contrato DiagnosticCompleteness aprovado pelo P.O. 2026-04-06
 * DEC-M3-02: integração sem alterar schema legado
 * DEC-M2-12: completeness ≠ confidence (NUNCA misturar os dois conceitos)
 *
 * ADR-0007 Seção 12: o sistema nunca deve entregar um briefing sem comunicar
 * ao usuário se o diagnóstico é: insuficiente | parcial | adequado | completo
 *
 * Premissas obrigatórias (DEC-M3-01):
 *   - completude ≠ confidence ≠ coverage
 *   - NCM/NBS são condicionais, não universais
 *   - fonte não aplicável não penaliza o status global
 *   - fonte aplicável sem dado mínimo → nunca 'completo'
 *
 * NOTA DE IMPLEMENTAÇÃO (2026-04-06):
 *   operationProfile.operationType usa valores em PORTUGUÊS conforme o schema real:
 *   'produto' | 'servico' | 'misto' | 'industria' | 'comercio' | 'servicos' | 'agronegocio' | 'financeiro'
 *   Suporte defensivo a valores em inglês ('product'/'service'/'mixed') adicionado como fallback.
 *
 *   NCM/NBS estão dentro de operationProfile JSON (não há tabela separada):
 *   - ncmCodesCount = operationProfile.principaisProdutos.length
 *   - nbsCodesCount = operationProfile.principaisServicos.length
 */

// ─── Tipos canônicos (DEC-M3-01) ─────────────────────────────────────────────

export type DiagnosticCompletenessStatus =
  | "insuficiente"
  | "parcial"
  | "adequado"
  | "completo";

export type SourceStatus =
  | "nao_iniciado"
  | "iniciado"
  | "suficiente"
  | "completo"
  | "nao_aplicavel";

export interface DiagnosticCompleteness {
  status: DiagnosticCompletenessStatus;
  completeness_score: number;             // 0.0–1.0
  source_status: Record<string, SourceStatus>;
  missing_sources: string[];
  non_applicable_sources: string[];
  partiality_reasons: string[];
}

// ─── Input da função de cálculo ───────────────────────────────────────────────

export interface DiagnosticCompletenessInput {
  /** COUNT de solaris_answers por projectId (Onda 1) */
  solarisAnswersCount: number;
  /** COUNT de iagen_answers por projectId (Onda 2) */
  iagenAnswersCount: number;
  /** Status das 3 camadas de diagnóstico — null se ainda não iniciado */
  diagnosticStatus: {
    corporate: string;
    operational: string;
    cnae: string;
  } | null;
  /** Perfil de operação com NCM/NBS — não null = preenchido */
  operationProfile: unknown;
}

// ─── Tipo interno para operationProfile parseado ──────────────────────────────

interface ParsedOperationProfile {
  operationType?: string;
  principaisProdutos?: Array<{ ncm_code: string }>;
  principaisServicos?: Array<{ nbs_code: string }>;
}

// ─── ENTREGA 2: inferCompanyType ──────────────────────────────────────────────

/**
 * Infere o tipo de empresa a partir do operationProfile e CNAEs.
 *
 * Regras determinísticas (DEC-M3-01 — sem heurística livre):
 * - operationType 'produto' | 'industria' | 'comercio' | 'product' → 'produto'
 * - operationType 'servico' | 'servicos' | 'agronegocio' | 'financeiro' | 'service' → 'servico'
 * - operationType 'misto' | 'mixed' → 'misto'
 * - operationProfile null/undefined: inferir por CNAE
 *   - CNAEs com prefixo 1x, 2x, 3x, 4x → 'produto'
 *   - CNAEs com prefixo 6x, 7x, 8x, 9x → 'servico'
 *   - mistura → 'misto'
 * - fallback: 'misto' (conservador)
 */
export function inferCompanyType(
  operationProfile: unknown,
  cnaes: string[] = []
): "produto" | "servico" | "misto" {
  if (operationProfile !== null && operationProfile !== undefined) {
    const profile = operationProfile as ParsedOperationProfile;
    const opType = profile.operationType?.toLowerCase() ?? "";

    // Produto (inclui variantes PT e EN)
    if (["produto", "industria", "comercio", "product"].includes(opType)) {
      return "produto";
    }
    // Serviço (inclui variantes PT e EN)
    if (["servico", "servicos", "agronegocio", "financeiro", "service"].includes(opType)) {
      return "servico";
    }
    // Misto (inclui variante EN)
    if (["misto", "mixed"].includes(opType)) {
      return "misto";
    }
  }

  // Fallback: inferir por CNAE
  if (cnaes.length > 0) {
    let hasProduto = false;
    let hasServico = false;

    for (const cnae of cnaes) {
      const prefix = parseInt(cnae.charAt(0), 10);
      if (!isNaN(prefix)) {
        if (prefix >= 1 && prefix <= 4) hasProduto = true;
        if (prefix >= 6 && prefix <= 9) hasServico = true;
      }
    }

    if (hasProduto && hasServico) return "misto";
    if (hasProduto) return "produto";
    if (hasServico) return "servico";
  }

  // Fallback conservador
  return "misto";
}

// ─── ENTREGA 3: evaluateSourceStatus ─────────────────────────────────────────

/**
 * Avalia o status de uma fonte de dados específica.
 *
 * Limiares canônicos (DEC-M3-01 — P.O. aprovado 2026-04-06):
 *
 * SOLARIS:
 *   nao_iniciado = 0 respostas
 *   iniciado     = 1–11 respostas
 *   suficiente   = 12–23 respostas
 *   completo     = 24 respostas
 *
 * IAGEN:
 *   nao_iniciado = 0 respostas
 *   iniciado     = 1–2 respostas
 *   suficiente   = 3+ respostas
 *   completo     = 3+ respostas (proxy: todas as perguntas geradas respondidas)
 *
 * CORPORATIVO / OPERACIONAL / CNAE:
 *   nao_iniciado = 'not_started' ou null
 *   iniciado     = 'in_progress'
 *   suficiente   = 'completed'
 *   completo     = 'completed' (suficiente === completo para estas 3 fontes)
 *
 * NCM:
 *   nao_aplicavel = companyType === 'servico'
 *   nao_iniciado  = 0 códigos + companyType !== 'servico'
 *   suficiente    = 1+ código válido
 *   completo      = 1+ código válido
 *
 * NBS:
 *   nao_aplicavel = companyType === 'produto'
 *   nao_iniciado  = 0 códigos + companyType !== 'produto'
 *   suficiente    = 1+ código válido
 *   completo      = 1+ código válido
 */
export function evaluateSourceStatus(
  source: string,
  data: {
    solarisAnswersCount: number;
    iagenAnswersCount: number;
    diagnosticStatus: { corporate: string; operational: string; cnae: string } | null;
    operationProfile: unknown;
    ncmCodesCount: number;
    nbsCodesCount: number;
    companyType: "produto" | "servico" | "misto";
  }
): SourceStatus {
  const { solarisAnswersCount, iagenAnswersCount, diagnosticStatus, ncmCodesCount, nbsCodesCount, companyType } = data;

  switch (source) {
    case "solaris": {
      if (solarisAnswersCount === 0) return "nao_iniciado";
      if (solarisAnswersCount >= 24) return "completo";
      if (solarisAnswersCount >= 12) return "suficiente";
      return "iniciado";
    }

    case "iagen": {
      if (iagenAnswersCount === 0) return "nao_iniciado";
      if (iagenAnswersCount >= 3) return "completo";
      return "iniciado";
    }

    case "corporate": {
      const status = diagnosticStatus?.corporate ?? null;
      if (!status || status === "not_started") return "nao_iniciado";
      if (status === "in_progress") return "iniciado";
      if (status === "completed") return "completo";
      return "nao_iniciado";
    }

    case "operational": {
      const status = diagnosticStatus?.operational ?? null;
      if (!status || status === "not_started") return "nao_iniciado";
      if (status === "in_progress") return "iniciado";
      if (status === "completed") return "completo";
      return "nao_iniciado";
    }

    case "cnae": {
      const status = diagnosticStatus?.cnae ?? null;
      if (!status || status === "not_started") return "nao_iniciado";
      if (status === "in_progress") return "iniciado";
      if (status === "completed") return "completo";
      return "nao_iniciado";
    }

    case "ncm": {
      if (companyType === "servico") return "nao_aplicavel";
      if (ncmCodesCount === 0) return "nao_iniciado";
      return "completo";
    }

    case "nbs": {
      if (companyType === "produto") return "nao_aplicavel";
      if (nbsCodesCount === 0) return "nao_iniciado";
      return "completo";
    }

    default:
      return "nao_iniciado";
  }
}

// ─── ENTREGA 4: computeCompleteness ──────────────────────────────────────────

const ALL_SOURCES = ["solaris", "iagen", "corporate", "operational", "cnae", "ncm", "nbs"] as const;

/**
 * Calcula a completude diagnóstica completa de um projeto.
 *
 * Algoritmo determinístico (DEC-M3-01):
 * 1. inferCompanyType → companyType
 * 2. evaluateSourceStatus para cada fonte
 * 3. Identificar applicable_sources (excluir nao_aplicavel)
 * 4. Identificar missing_sources (applicable com status < suficiente)
 * 5. Calcular completeness_score: fontes_suficientes / fontes_aplicáveis
 * 6. Calcular status global
 * 7. Montar partiality_reasons
 * 8. Retornar DiagnosticCompleteness
 */
export function computeCompleteness(inputs: {
  solarisAnswersCount: number;
  iagenAnswersCount: number;
  diagnosticStatus: { corporate: string; operational: string; cnae: string } | null;
  operationProfile: unknown;
  ncmCodesCount: number;
  nbsCodesCount: number;
}): DiagnosticCompleteness {
  const { solarisAnswersCount, iagenAnswersCount, diagnosticStatus, operationProfile, ncmCodesCount, nbsCodesCount } = inputs;

  // Passo 1: inferir tipo de empresa
  const companyType = inferCompanyType(operationProfile);

  // Passo 2: avaliar cada fonte
  const evalData = {
    solarisAnswersCount,
    iagenAnswersCount,
    diagnosticStatus,
    operationProfile,
    ncmCodesCount,
    nbsCodesCount,
    companyType,
  };

  const source_status: Record<string, SourceStatus> = {};
  for (const source of ALL_SOURCES) {
    source_status[source] = evaluateSourceStatus(source, evalData);
  }

  // Passo 3: fontes aplicáveis (excluir nao_aplicavel)
  const applicable_sources = ALL_SOURCES.filter(
    (s) => source_status[s] !== "nao_aplicavel"
  );

  // Passo 4: fontes com status < suficiente (missing)
  const SUFFICIENT_STATUSES: SourceStatus[] = ["suficiente", "completo"];
  const missing_sources = applicable_sources.filter(
    (s) => !SUFFICIENT_STATUSES.includes(source_status[s])
  );

  // Fontes não aplicáveis
  const non_applicable_sources = ALL_SOURCES.filter(
    (s) => source_status[s] === "nao_aplicavel"
  );

  // Passo 5: score
  const fontes_suficientes = applicable_sources.filter((s) =>
    SUFFICIENT_STATUSES.includes(source_status[s])
  ).length;
  const completeness_score =
    applicable_sources.length > 0
      ? fontes_suficientes / applicable_sources.length
      : 0;

  // Passo 6: status global
  let status: DiagnosticCompletenessStatus;
  if (fontes_suficientes === 0) {
    status = "insuficiente";
  } else if (missing_sources.length > 0) {
    status = "parcial";
  } else {
    status = "completo";
  }

  // Passo 7: partiality_reasons (strings legíveis)
  const partiality_reasons: string[] = [];

  if (missing_sources.includes("solaris")) {
    const count = solarisAnswersCount;
    if (count === 0) {
      partiality_reasons.push("Questionário SOLARIS não iniciado (0 respostas)");
    } else if (count < 12) {
      partiality_reasons.push(`Questionário SOLARIS incompleto (${count}/24 respostas)`);
    } else {
      partiality_reasons.push(`Questionário SOLARIS parcial (${count}/24 respostas)`);
    }
  }

  if (missing_sources.includes("iagen")) {
    const count = iagenAnswersCount;
    if (count === 0) {
      partiality_reasons.push("Questionário IA Gen não iniciado (0 respostas)");
    } else {
      partiality_reasons.push(`Questionário IA Gen incompleto (${count} respostas)`);
    }
  }

  if (missing_sources.includes("corporate")) {
    partiality_reasons.push("Diagnóstico Corporativo não concluído");
  }

  if (missing_sources.includes("operational")) {
    partiality_reasons.push("Diagnóstico Operacional não concluído");
  }

  if (missing_sources.includes("cnae")) {
    partiality_reasons.push("Diagnóstico CNAE não concluído");
  }

  if (missing_sources.includes("ncm")) {
    partiality_reasons.push("Códigos NCM não informados (obrigatório para empresa de produto)");
  }

  if (missing_sources.includes("nbs")) {
    partiality_reasons.push("Códigos NBS não informados (obrigatório para empresa de serviço)");
  }

  return {
    status,
    completeness_score: Math.round(completeness_score * 100) / 100,
    source_status,
    missing_sources,
    non_applicable_sources,
    partiality_reasons,
  };
}

// ─── Compatibilidade com M2.1 ─────────────────────────────────────────────────

/**
 * @deprecated Use computeCompleteness para o contrato completo (M3 Fase 1).
 * Mantido para compatibilidade com chamadas existentes do M2.1.
 */
export function calcDiagnosticCompleteness(
  input: DiagnosticCompletenessInput
): DiagnosticCompletenessStatus {
  const profile = input.operationProfile as ParsedOperationProfile | null | undefined;
  const ncmCodesCount = profile?.principaisProdutos?.length ?? 0;
  const nbsCodesCount = profile?.principaisServicos?.length ?? 0;

  const result = computeCompleteness({
    solarisAnswersCount: input.solarisAnswersCount,
    iagenAnswersCount: input.iagenAnswersCount,
    diagnosticStatus: input.diagnosticStatus,
    operationProfile: input.operationProfile,
    ncmCodesCount,
    nbsCodesCount,
  });

  return result.status;
}

// ─── Helper: listar dimensões pendentes (M2.1 — mantido para compatibilidade) ─

/**
 * Retorna as dimensões de diagnóstico que ainda não foram concluídas.
 * Usado no banner 'parcial' para indicar o que falta.
 */
export function getPendingDiagnosticLayers(
  diagnosticStatus: DiagnosticCompletenessInput["diagnosticStatus"]
): string[] {
  if (!diagnosticStatus) return ["Corporativo", "Operacional", "CNAE"];
  const pending: string[] = [];
  if (diagnosticStatus.corporate !== "completed") pending.push("Corporativo");
  if (diagnosticStatus.operational !== "completed") pending.push("Operacional");
  if (diagnosticStatus.cnae !== "completed") pending.push("CNAE");
  return pending;
}

// ─── Helpers adicionais (M3 Fase 1) ──────────────────────────────────────────

/**
 * Verifica se o diagnóstico está completo (todas as 3 camadas concluídas).
 */
export function isDiagnosticComplete(
  diagnosticStatus: { corporate: string; operational: string; cnae: string } | null
): boolean {
  if (!diagnosticStatus) return false;
  return (
    diagnosticStatus.corporate === "completed" &&
    diagnosticStatus.operational === "completed" &&
    diagnosticStatus.cnae === "completed"
  );
}

/**
 * Retorna a próxima camada de diagnóstico a ser concluída.
 * Retorna null se todas as camadas estão concluídas.
 */
export function getNextDiagnosticLayer(
  diagnosticStatus: { corporate: string; operational: string; cnae: string } | null
): "corporate" | "operational" | "cnae" | null {
  if (!diagnosticStatus) return "corporate";
  if (diagnosticStatus.corporate !== "completed") return "corporate";
  if (diagnosticStatus.operational !== "completed") return "operational";
  if (diagnosticStatus.cnae !== "completed") return "cnae";
  return null;
}

/**
 * Calcula o percentual de progresso do diagnóstico (0, 33, 67, 100).
 */
export function getDiagnosticProgress(
  diagnosticStatus: { corporate: string; operational: string; cnae: string } | null
): number {
  if (!diagnosticStatus) return 0;
  let completed = 0;
  if (diagnosticStatus.corporate === "completed") completed++;
  if (diagnosticStatus.operational === "completed") completed++;
  if (diagnosticStatus.cnae === "completed") completed++;
  return Math.round((completed / 3) * 100);
}
