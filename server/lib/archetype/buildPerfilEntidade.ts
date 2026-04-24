/**
 * buildPerfilEntidade.ts — Orquestrador do modelo dimensional M1
 *
 * Fonte canônica: SPEC-RUNNER-RODADA-D.md §2.0 (princípios) + §2.1-2.5 (derivação)
 * Referências cruzadas:
 * - DE-PARA-CAMPOS-PERFIL-ENTIDADE.md §2.2-2.5 (mapeamentos)
 * - LOGICAL-CONFLICTS-v1.0.md §1 (detecção)
 * - DERIVATION-OPERATIONTYPE.md §1 (camada legada)
 * - computeStatus.ts (derivação de status_arquetipo)
 *
 * Regras vinculantes (§2.0):
 * 1. Dimensões são fonte de verdade (Q-2)
 * 2. Mapping 17 → 5 dimensões (ADR-0031)
 * 3. Proibido contains() / substring / regex
 * 4. possui_bens/servicos são derivados (§2.7)
 * 5. papel_na_cadeia é escalar
 * 6. tipo_de_relacao e territorio são arrays
 * 7. Função determinística (I-1)
 *
 * Política de arquivo: função pura, zero I/O externo fora de imports de dataset,
 * zero integração com router/UI/banco. Retorna BuildResult para camada superior
 * compor snapshot + hashes + persistência.
 */

import type {
  Objeto,
  OperationType,
  PapelNaCadeia,
  Regime,
  StatusArquetipo,
  SubnaturezaSetorial,
  Territorio,
  TipoDeRelacao,
} from "./enums";
import {
  AmbiguityError,
  type Blocker,
  type BuildResult,
  type PerfilDimensional,
  type Seed,
} from "./types";
import { deriveObjetoFromNbs, deriveObjetoFromNcm } from "./deriveObjeto";
import { deriveOperationType } from "./deriveOperationType";
import { computeStatus } from "./computeStatus";
import { contextFromSeed, validateConflicts } from "./validateConflicts";

// ─── Helpers §2.7 — predicados internos (não persistidos) ──────────────────

/**
 * §2.7: `possui_bens` é derivado — não mais campo da seed v3.
 */
function hasObjetoBens(seed: Seed): boolean {
  return seed.tipo_objeto_economico.includes("Bens/mercadorias");
}

/**
 * §2.7: `possui_servicos` idem.
 */
function hasObjetoServicos(seed: Seed): boolean {
  return seed.tipo_objeto_economico.includes("Servicos");
}

// ─── Derivação dimensão objeto[] — §2.1 (agrega NCM + NBS + dedup) ─────────

interface DeriveObjetoArrayResult {
  readonly objeto: readonly Objeto[];
  readonly blockers: readonly Blocker[];
  readonly error: AmbiguityError | null;
}

function deriveObjetoForSeed(seed: Seed): DeriveObjetoArrayResult {
  const objetoSet = new Set<Objeto>();
  const blockers: Blocker[] = [];

  try {
    for (const ncm of seed.ncms_principais) {
      const r = deriveObjetoFromNcm(ncm);
      objetoSet.add(r.objeto);
      if (r.blocker !== null) blockers.push(r.blocker);
    }
    for (const nbs of seed.nbss_principais) {
      const r = deriveObjetoFromNbs(nbs);
      objetoSet.add(r.objeto);
      if (r.blocker !== null) blockers.push(r.blocker);
    }
  } catch (e) {
    if (e instanceof AmbiguityError) {
      return {
        objeto: Array.from(objetoSet),
        blockers,
        error: e,
      };
    }
    throw e;
  }

  return {
    objeto: Array.from(objetoSet),
    blockers,
    error: null,
  };
}

// ─── Derivação dimensão papel_na_cadeia — §2.2 (escalar) ───────────────────

function derivePapel(seed: Seed): PapelNaCadeia {
  // Q-D2: normalização de sinais de comércio exterior
  const sinaisCex = new Set<string>(seed.papel_comercio_exterior);
  if (seed.atua_importacao) sinaisCex.add("Importador");
  if (seed.atua_exportacao) sinaisCex.add("Exportador");

  // Tabela de decisão §2.2 (ordem importa)
  const posicao = seed.posicao_na_cadeia_economica;
  if (posicao === "Produtor/fabricante") return "fabricante";
  if (posicao === "Atacadista") return "distribuidor";
  if (posicao === "Varejista") return "varejista";
  if (posicao === "Prestador de servico") return "prestador";
  if (posicao === "Operadora") return "operadora_regulada";

  // Marketplace (Q-3) — intermediador
  if (seed.atua_como_marketplace_plataforma === true) return "intermediador";

  // Transportador
  if (seed.natureza_operacao_principal.includes("Transporte")) {
    return "transportador";
  }

  // Comércio exterior (Q-D2 Passo 2)
  const hasImport = sinaisCex.has("Importador");
  const hasExport = sinaisCex.has("Exportador");
  if (hasImport && hasExport) return "comercio_exterior_misto";
  if (hasImport) return "importador";
  if (hasExport) return "exportador";

  return "indefinido";
}

// ─── Derivação dimensão tipo_de_relacao[] — §2.3 (multi-select) ────────────

const FONTE_RECEITA_TO_RELACAO: ReadonlyMap<string, TipoDeRelacao> = new Map([
  ["Venda de mercadoria", "venda"],
  ["Prestacao de servico", "servico"],
  ["Assinatura/mensalidade", "servico"],
  ["Comissao/intermediacao", "intermediacao"],
  ["Aluguel/locacao", "locacao"],
  ["Royalties/licenciamento", "locacao"],
  ["Outras receitas operacionais", "indefinida"],
]);

function deriveTipoDeRelacao(seed: Seed): readonly TipoDeRelacao[] {
  const out = new Set<TipoDeRelacao>();
  for (const fonte of seed.fontes_receita) {
    const rel = FONTE_RECEITA_TO_RELACAO.get(fonte);
    if (rel !== undefined) out.add(rel);
  }
  return Array.from(out);
}

// ─── Derivação dimensão territorio[] — §2.4 (agregação) ────────────────────

function deriveTerritorio(seed: Seed): readonly Territorio[] {
  const out = new Set<Territorio>();

  if (seed.abrangencia_operacional.includes("Apenas municipal")) {
    out.add("municipal");
  }
  if (
    seed.opera_multiplos_estados ||
    seed.abrangencia_operacional.includes("Interestadual")
  ) {
    out.add("interestadual");
  }
  if (seed.abrangencia_operacional.includes("Nacional")) {
    out.add("nacional");
  }
  // Q-D2: qualquer sinal de comércio exterior → internacional
  if (
    seed.atua_importacao ||
    seed.atua_exportacao ||
    seed.papel_comercio_exterior.length > 0
  ) {
    out.add("internacional");
  }
  if (seed.opera_territorio_incentivado) {
    if (seed.tipo_territorio_incentivado.includes("ZFM")) out.add("ZFM");
    else if (seed.tipo_territorio_incentivado.includes("ALC")) out.add("ALC");
    else out.add("incentivado_outro");
  }

  return Array.from(out);
}

// ─── Derivação dimensão regime — §2.5 (escalar, Q-D3 separa reg. específico)

const REGIME_TRIBUTARIO_TO_REGIME: ReadonlyMap<string, Regime> = new Map([
  ["Simples Nacional", "simples_nacional"],
  ["Lucro Presumido", "lucro_presumido"],
  ["Lucro Real", "lucro_real"],
  ["MEI", "mei"],
]);

function deriveRegime(seed: Seed): Regime {
  const v = seed.regime_tributario_atual;
  return REGIME_TRIBUTARIO_TO_REGIME.get(v) ?? "indefinido";
}

// ─── Derivação contextuais — Q-D4 (subnatureza array), Q-D3 (regime_especifico)

function deriveSubnaturezaSetorial(seed: Seed): readonly SubnaturezaSetorial[] {
  // Apenas valores reconhecidos pelo enum v1 (Q-D4 RESOLVIDA)
  const validValues: readonly SubnaturezaSetorial[] = [
    "telecomunicacoes",
    "saude",
    "saude_regulada",
    "energia",
    "financeiro",
    "combustiveis",
    "transporte",
  ];
  const validSet = new Set(validValues);
  return seed.subnatureza_setorial.filter((s): s is SubnaturezaSetorial =>
    validSet.has(s as SubnaturezaSetorial),
  );
}

function deriveOrgaoRegulador(seed: Seed): readonly string[] {
  return Array.from(new Set(seed.orgao_regulador_principal));
}

function deriveRegimeEspecifico(seed: Seed): readonly string[] {
  if (!seed.possui_regime_especial_negocio) return [];
  return Array.from(new Set(seed.tipo_regime_especial));
}

// ─── Missing required fields — §4.2.1 Regra 4 + Q-C2 ───────────────────────

function computeMissingRequiredFields(
  seed: Seed,
  papel: PapelNaCadeia,
): readonly string[] {
  const missing: string[] = [];

  // Papel indefinido
  if (papel === "indefinido") {
    missing.push("papel_na_cadeia (indefinido — preencher posicao_na_cadeia_economica ou flags CEx)");
  }

  // Objetos condicionais §2.7
  if (hasObjetoBens(seed) && seed.ncms_principais.length === 0) {
    missing.push("ncms_principais (possui_bens derivado=true)");
  }
  if (hasObjetoServicos(seed) && seed.nbss_principais.length === 0) {
    missing.push("nbss_principais (possui_servicos derivado=true)");
  }

  // Contextuais obrigatórios para operadora regulada
  if (papel === "operadora_regulada") {
    if (seed.subnatureza_setorial.length === 0) {
      missing.push("subnatureza_setorial (papel=operadora_regulada)");
    }
    if (seed.orgao_regulador_principal.length === 0) {
      missing.push("orgao_regulador_principal (papel=operadora_regulada)");
    }
  }

  // Regime indefinido
  if (deriveRegime(seed) === "indefinido") {
    missing.push("regime_tributario_atual (valor não reconhecido ou vazio)");
  }

  return missing;
}

// ─── Multi-CNPJ (Q-4 RESOLVIDA) — 3 estados NONE/INFO/DENIED ───────────────

function detectMultiCnpjBlocker(seed: Seed): Blocker | null {
  const { integra_grupo_economico: integra, analise_1_cnpj_operacional: analise1 } =
    seed;

  if (!integra) return null; // NONE

  if (integra && analise1) {
    // INFO — não altera status
    return {
      id: "V-05-INFO",
      severity: "INFO",
      rule: "empresa integra grupo econômico — análise neste projeto é de 1 CNPJ operacional; consolidação requer projetos adicionais",
    };
  }

  // DENIED (integra=true + analise1=false)
  return {
    id: "V-05-DENIED",
    severity: "BLOCK_FLOW",
    rule: "empresa integra grupo econômico E análise consolidada solicitada — fora do escopo M1 (1 CNPJ)",
  };
}

// ─── Orquestrador principal — seed → BuildResult ───────────────────────────

/**
 * Constrói o perfil dimensional parcial (sem hashes, sem metadata de imutabilidade)
 * + status_arquetipo + blockers + campos faltantes. Função pura.
 *
 * Pipeline (ordem determinística):
 * 1. Deriva dimensões (objeto, papel, relação, território, regime)
 * 2. Deriva contextuais (subnatureza, órgão regulador, regime específico)
 * 3. Detecta campos faltantes
 * 4. Detecta multi-CNPJ
 * 5. Tenta derivação legada de OperationType (pode lançar AmbiguityError)
 * 6. Valida conflitos lógicos (6 classes)
 * 7. Computa status_arquetipo + test_status via computeStatus()
 *
 * Qualquer AmbiguityError intermediário é capturado e materializado como
 * blocker HARD_BLOCK (conforme SPEC §4.2.1 regra 2).
 */
export function buildPerfilEntidade(seed: Seed): BuildResult {
  const blockers: Blocker[] = [];

  // Passo 1 — dimensão objeto (pode lançar AmbiguityError → V-10-UNMAPPED-TUPLE / V-10-PENDING)
  const objetoResult = deriveObjetoForSeed(seed);
  for (const b of objetoResult.blockers) blockers.push(b);
  if (objetoResult.error !== null) {
    blockers.push({
      id: objetoResult.error.blocker_id,
      severity: "HARD_BLOCK",
      rule: objetoResult.error.message,
    });
  }

  // Passos 2-5 — dimensões restantes
  const papel = derivePapel(seed);
  const relacao = deriveTipoDeRelacao(seed);
  const territorio = deriveTerritorio(seed);
  const regime = deriveRegime(seed);

  // Contextuais
  const subnatureza = deriveSubnaturezaSetorial(seed);
  const orgao = deriveOrgaoRegulador(seed);
  const regimeEspecifico = deriveRegimeEspecifico(seed);

  // Campos faltantes (Q-C2)
  const missing = computeMissingRequiredFields(seed, papel);

  // Multi-CNPJ (Q-4)
  const multiCnpjBlocker = detectMultiCnpjBlocker(seed);
  if (multiCnpjBlocker !== null) blockers.push(multiCnpjBlocker);

  // Derivação legada de OperationType (Q-2) — pode lançar AmbiguityError
  let derivedOperationType: OperationType | null = null;
  try {
    derivedOperationType = deriveOperationType({
      papel_na_cadeia: papel,
      tipo_de_relacao: relacao,
      objeto: objetoResult.objeto,
    });
  } catch (e) {
    if (e instanceof AmbiguityError) {
      blockers.push({
        id: e.blocker_id,
        severity: "HARD_BLOCK",
        rule: e.message,
      });
    } else {
      throw e;
    }
  }

  // Conflitos lógicos (Q-C4, 6 classes)
  // Evita rodar conflitos sobre perfil inconsistente com indefinido
  // — regras ainda se aplicam mas são mais ruidosas; por I-LC-2 são aditivas.
  const perfilForConflicts = {
    papel_na_cadeia: papel,
    tipo_de_relacao: relacao,
    objeto: objetoResult.objeto,
    territorio,
    regime,
    subnatureza_setorial: subnatureza,
    orgao_regulador: orgao,
    regime_especifico: regimeEspecifico,
  } as const;
  const conflictBlockers = validateConflicts(
    perfilForConflicts,
    contextFromSeed(seed),
  );
  for (const b of conflictBlockers) blockers.push(b);

  // Compõe status via computeStatus() determinística
  const statusResult = computeStatus({
    blockers,
    missing_required_fields: missing,
    user_confirmed: seed.user_confirmed,
  });

  return {
    arquetipo_partial: {
      objeto: objetoResult.objeto,
      papel_na_cadeia: papel,
      tipo_de_relacao: relacao,
      territorio,
      regime,
      subnatureza_setorial: subnatureza,
      orgao_regulador: orgao,
      regime_especifico: regimeEspecifico,
      derived_legacy_operation_type: derivedOperationType,
    },
    status_arquetipo: statusResult.status_arquetipo,
    motivo_bloqueio: statusResult.motivo_bloqueio,
    blockers_triggered: blockers,
    missing_required_fields: missing,
    test_status: statusResult.test_status,
  };
}

// ─── Re-exports úteis para consumidores (runner, testes) ───────────────────

export type { BuildResult, PerfilDimensional, Seed } from "./types";
export type { StatusArquetipo } from "./enums";
