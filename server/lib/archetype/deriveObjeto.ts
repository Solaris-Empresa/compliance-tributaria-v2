/**
 * deriveObjeto.ts — Translation layer regime → `objeto`
 *
 * Fonte canônica:
 * - NCM-OBJETO-LOOKUP.md §3.3 (tabela REGIME_TUPLE_TO_OBJETO_NCM, 13 regras)
 * - NBS-OBJETO-LOOKUP.md §3.3 (tabela REGIME_TUPLE_TO_OBJETO_NBS, 11 regras)
 * - SPEC-RUNNER-RODADA-D.md §2.1 (Q-D1 v2 Opção B + Ajuste A)
 *
 * Regras vinculantes (P.O. 2026-04-24):
 * - NÃO criar lookup novo — reusar lookupNcm()/lookupNbs() existentes
 * - NÃO alterar contratos do Decision Kernel
 * - Chapter/divisão extraídos determinísticamente do código
 * - Fallback tolerante (Ajuste A): regime_geral → objeto genérico + INFO blocker
 * - AmbiguityError para pending_validation e tuplas não-mapeadas
 */

import { lookupNcm } from "../decision-kernel/engine/ncm-engine";
import { lookupNbs } from "../decision-kernel/engine/nbs-engine";
import ncmDataset from "../decision-kernel/datasets/ncm-dataset.json";
import type { Objeto } from "./enums";
import { AmbiguityError } from "./types";
import type { Blocker, DeriveObjetoResult } from "./types";

// ─── Dataset auxiliar: campo imposto_seletivo não exposto pelo engine ──────
// Não alteramos contrato do Decision Kernel (regra P.O. 2026-04-24).
// Lookup local sobre o MESMO dataset JSON para obter a flag.

interface NcmEntryPartial {
  readonly ncm_code: string;
  readonly imposto_seletivo: boolean;
  readonly status?: string;
}

function getImpostoSeletivoFromNcmDataset(ncm: string): boolean {
  const normalized = ncm.trim().toUpperCase();
  const entry = (ncmDataset as readonly NcmEntryPartial[]).find(
    (e) => e.ncm_code.trim().toUpperCase() === normalized,
  );
  return entry?.imposto_seletivo ?? false;
}

// ─── Extração de chapter/divisao — determinística a partir do código ───────

/**
 * NCM: primeiros 2 dígitos. Ex.: "1905.00.00" → "19"
 */
function extractNcmChapter(ncm: string): string {
  return ncm.replace(/\./g, "").substring(0, 2);
}

/**
 * NBS: primeiros 4 dígitos após "1.". Ex.: "1.1401.10.00" → "1.1401"
 */
function extractNbsDivisao(nbs: string): string {
  const parts = nbs.split(".");
  if (parts.length < 2 || parts[0] !== "1") return nbs;
  return `1.${parts[1]}`;
}

// ─── Tabela NCM: (regime, IS_flag, chapter) → objeto — §3.3 do artefato ────

/**
 * Regras R-N-03 a R-N-11 (caminho feliz) + R-N-02 (fallback) + R-N-01/R-N-12/R-N-13 (AmbiguityError).
 * Mapeamento construído a partir da medição real do dataset (2026-04-24):
 *   - aliquota_zero (12 entries): chapters {04, 05, 17, 19, 20, 21, 30, 96}
 *   - condicional (3 entries): chapter 31
 *   - reducao_60 (4 entries): aguarda categorização
 *   - regime_geral (1 real + fallback N): chapter 22 IS=true é bebida
 */
type NcmTupleKey = `${string}|${boolean}|${string}`;

const REGIME_TUPLE_TO_OBJETO_NCM = new Map<NcmTupleKey, Objeto>([
  // Chapter 22 (bebidas) — bebida açucarada com IS=true
  ["regime_geral|true|22", "bebida"],
  // Chapter 24 (tabaco) — IS=true
  ["regime_geral|true|24", "tabaco"],
  // Chapter 27 (combustíveis) — IS=true
  ["regime_geral|true|27", "combustivel"],
  // aliquota_zero — alimentos
  ["aliquota_zero|false|04", "pecuario"],
  ["aliquota_zero|false|05", "pecuario"],
  ["aliquota_zero|false|17", "alimento"],
  ["aliquota_zero|false|19", "alimento"],
  ["aliquota_zero|false|20", "alimento"],
  ["aliquota_zero|false|21", "alimento"],
  // aliquota_zero — medicamentos e saúde
  ["aliquota_zero|false|30", "medicamento"],
  ["aliquota_zero|false|96", "bens_mercadoria_geral"],
  // condicional — fertilizantes (chapter 31)
  ["condicional|false|31", "agricola"],
  // aliquota_zero — soja em grão e demais oleaginosas/cereais cesta básica (chapter 12)
  // LC 214/2025 Art. 128 I (Anexo I — cesta básica nacional ampliada)
  // EC 132/2023 Art. 153 VIII confirma: IS NÃO incide sobre commodities agrícolas
  ["aliquota_zero|false|12", "agricola"],
]);

function lookupNcmTuple(
  regime: string,
  impostoSeletivo: boolean,
  chapter: string,
): Objeto | undefined {
  const key: NcmTupleKey = `${regime}|${impostoSeletivo}|${chapter}`;
  return REGIME_TUPLE_TO_OBJETO_NCM.get(key);
}

// ─── Tabela NBS: (regime, divisao) → objeto — §3.3 do artefato ─────────────

/**
 * Regras R-B-03 a R-B-09 (caminho feliz) + R-B-02 (fallback) + R-B-01/R-B-05/R-B-10/R-B-99 (AmbiguityError).
 * Dataset real: regime_geral (8), reducao_60 (6), regime_especial (5), pending_validation (1).
 */
type NbsTupleKey = `${string}|${string}`;

const REGIME_TUPLE_TO_OBJETO_NBS = new Map<NbsTupleKey, Objeto>([
  // regime_especial — serviços financeiros
  ["regime_especial|1.0501", "servico_financeiro"],
  ["regime_especial|1.0901", "servico_financeiro"],
  // regime_especial — saúde (planos privados — divisão 1.0910)
  ["regime_especial|1.0910", "servico_regulado"],
  // regime_especial — telecom (divisão 1.1801; entrada declarativa para extensão futura do dataset)
  ["regime_especial|1.1801", "servico_regulado"],
  // regime_geral — consultoria TI (divisão 1.1501 confirmada no dataset)
  ["regime_geral|1.1501", "servico_digital"],
  // reducao_60 — educação (divisões 1.09 a 1.11)
  ["reducao_60|1.0901", "servico_geral"],
  ["reducao_60|1.0902", "servico_geral"],
  ["reducao_60|1.1001", "servico_geral"],
  ["reducao_60|1.1101", "servico_geral"],
  // reducao_60 — saúde (divisão 1.18)
  ["reducao_60|1.1801", "servico_regulado"],
]);

function lookupNbsTuple(
  regime: string,
  divisao: string,
): Objeto | undefined {
  const key: NbsTupleKey = `${regime}|${divisao}`;
  return REGIME_TUPLE_TO_OBJETO_NBS.get(key);
}

// ─── Setores regulados — fallback proibido (P.O. 2026-04-24) ───────────────

/**
 * Subnaturezas reguladas críticas. Para qualquer destas, V-10-FALLBACK INFO
 * é elevado a HARD_BLOCK V-10-FALLBACK-REGULATED — derivação tem que ser
 * estritamente determinística via dataset + mapping; aproximação genérica
 * (servico_geral) inaceitável.
 */
const REGULATED_SUBNATUREZAS: ReadonlySet<string> = new Set<string>([
  "telecomunicacoes",
  "saude_regulada",
  "financeiro",
]);

/**
 * Contexto opcional propagado pelo orquestrador. Permite à camada NBS
 * conhecer atributos da seed sem violar pureza (input explícito, não global).
 */
export interface DeriveObjetoContext {
  readonly subnaturezaSetorial?: readonly string[];
}

function isRegulatedContext(context?: DeriveObjetoContext): boolean {
  if (!context?.subnaturezaSetorial) return false;
  for (const s of context.subnaturezaSetorial) {
    if (REGULATED_SUBNATUREZAS.has(s)) return true;
  }
  return false;
}

// ─── Derivação NCM — 3 classes de saída (SPEC §2.1.1) ──────────────────────

/**
 * Deriva categoria `objeto` a partir de um código NCM.
 *
 * Classes de saída:
 * 1. Determinística — tupla bate em regra; retorna valor + blocker=null
 * 2. Fallback tolerante (Ajuste A) — regime_geral não-mapeado;
 *    retorna `bens_mercadoria_geral` + V-10-FALLBACK severity INFO
 * 3. AmbiguityError — pending_validation ou tupla inédita
 *
 * @throws AmbiguityError quando classe 3 se aplica
 */
export function deriveObjetoFromNcm(ncm: string): DeriveObjetoResult {
  const result = lookupNcm({ codigo: ncm, sistema: "NCM" });

  // Classe 3a — pending_validation (confianca.valor === 0 → pending)
  if (result.confianca.valor === 0) {
    throw new AmbiguityError(
      "V-10-PENDING",
      `NCM ${ncm} com status=pending_validation no Decision Kernel — não usar em produção`,
    );
  }

  // Classe 2 — fallback tolerante (NCM fora do dataset)
  if (result.regime === "regime_geral" && result.confianca.tipo === "fallback") {
    return {
      objeto: "bens_mercadoria_geral",
      blocker: {
        id: "V-10-FALLBACK",
        severity: "INFO",
        rule: `NCM ${ncm} não mapeado no dataset — categoria genérica bens_mercadoria_geral aplicada com confiança baixa`,
      },
    };
  }

  // Classe 1 — tradução determinística via tupla
  const impostoSeletivo = getImpostoSeletivoFromNcmDataset(ncm);
  const chapter = extractNcmChapter(ncm);
  const objeto = lookupNcmTuple(result.regime, impostoSeletivo, chapter);

  if (objeto === undefined) {
    throw new AmbiguityError(
      "V-10-UNMAPPED-TUPLE",
      `Tupla (regime=${result.regime}, IS=${impostoSeletivo}, chapter=${chapter}) não tem regra na tabela REGIME_TUPLE_TO_OBJETO_NCM`,
    );
  }

  return { objeto, blocker: null };
}

// ─── Derivação NBS — 3 classes de saída (análogo NCM) ──────────────────────

/**
 * Deriva categoria `objeto` a partir de um código NBS.
 * Mesma estrutura da função NCM. Mapeamento via `(regime, divisao)`.
 *
 * Setores regulados (telecom, saúde regulada, financeiro): fallback é
 * proibido — escala para HARD_BLOCK V-10-FALLBACK-REGULATED. A camada
 * superior passa subnatureza_setorial via `context`.
 *
 * @throws AmbiguityError em classe 3 ou em fallback de setor regulado
 */
export function deriveObjetoFromNbs(
  nbs: string,
  context?: DeriveObjetoContext,
): DeriveObjetoResult {
  const result = lookupNbs({ codigo: nbs, sistema: "NBS" });

  // Classe 3a — pending_validation
  if (result.confianca.valor === 0) {
    throw new AmbiguityError(
      "V-10-PENDING",
      `NBS ${nbs} com status=pending_validation no Decision Kernel — não usar em produção`,
    );
  }

  // Classe 2 — fallback tolerante (NBS fora do dataset)
  if (result.regime === "regime_geral" && result.confianca.tipo === "fallback") {
    // Classe 2-R — setor regulado: NÃO bloqueia, mas emite alerta forte
    // (P.O. 2026-04-24, reversão pós-experimento CNAE).
    // Id distintivo permite à camada de confiança penalizar score sem afetar gate.
    if (isRegulatedContext(context)) {
      const reguladas = (context!.subnaturezaSetorial ?? []).filter((s) =>
        REGULATED_SUBNATUREZAS.has(s),
      );
      return {
        objeto: "servico_geral",
        blocker: {
          id: "V-10-FALLBACK-REGULATED",
          severity: "INFO",
          rule: `[ALERTA FORTE] NBS ${nbs} não mapeado no dataset E subnatureza regulada (${reguladas.join(", ")}) — derivação não-determinística em setor crítico; penalização de confiança aplicável`,
        },
      };
    }
    return {
      objeto: "servico_geral",
      blocker: {
        id: "V-10-FALLBACK",
        severity: "INFO",
        rule: `NBS ${nbs} não mapeado no dataset — categoria genérica servico_geral aplicada com confiança baixa`,
      },
    };
  }

  // Classe 1 — tradução determinística via tupla
  const divisao = extractNbsDivisao(nbs);
  const objeto = lookupNbsTuple(result.regime, divisao);

  if (objeto === undefined) {
    throw new AmbiguityError(
      "V-10-UNMAPPED-TUPLE",
      `Tupla (regime=${result.regime}, divisao=${divisao}) não tem regra na tabela REGIME_TUPLE_TO_OBJETO_NBS`,
    );
  }

  return { objeto, blocker: null };
}

// ─── Agregação sobre arrays de NCM/NBS (deduplicação) ──────────────────────

/**
 * Deriva `objeto[]` sobre arrays de NCMs + NBSs de uma seed.
 * Dedup final preserva ordem de primeira ocorrência.
 * Acumula blockers de fallback (INFO) e propaga AmbiguityError.
 *
 * `context` é repassado para `deriveObjetoFromNbs` — habilita a regra de
 * setor regulado (V-10-FALLBACK-REGULATED).
 */
export function deriveObjetoArray(
  ncms: readonly string[],
  nbss: readonly string[],
  context?: DeriveObjetoContext,
): { objeto: readonly Objeto[]; blockers: readonly Blocker[] } {
  const objetoSet = new Set<Objeto>();
  const blockers: Blocker[] = [];

  for (const ncm of ncms) {
    const r = deriveObjetoFromNcm(ncm);
    objetoSet.add(r.objeto);
    if (r.blocker !== null) blockers.push(r.blocker);
  }

  for (const nbs of nbss) {
    const r = deriveObjetoFromNbs(nbs, context);
    objetoSet.add(r.objeto);
    if (r.blocker !== null) blockers.push(r.blocker);
  }

  return {
    objeto: Array.from(objetoSet),
    blockers,
  };
}
