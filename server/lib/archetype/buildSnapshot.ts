/**
 * buildSnapshot.ts — Composição do snapshot imutável do Arquétipo
 *
 * Fonte canônica: SPEC-RUNNER-RODADA-D.md §6.1 (shape) + §6.2/§6.3 (hashes) + §6.4/§6.5 (metadata)
 *                 ADR-0032 (imutabilidade + versionamento)
 *
 * Regras vinculantes:
 * - Snapshot completo só após derivação bem-sucedida (buildPerfilEntidade)
 * - `model_version` fixo em "m1-v1.0.0" (constante desta release)
 * - `data_version` é ISO-8601 UTC — passado como parâmetro para preservar pureza
 * - `imutavel: true` marker (ADR-0032)
 * - `perfil_hash` + `rules_hash` computados internamente
 *
 * Pureza: função aceita opcionalmente `dataVersion` injetado externamente;
 * quando omitido, usa Date.now() (única dependência de clock permitida §1.4 SPEC).
 */

import type { CanonicalValue } from "./canonicalJSON";
import { computePerfilHash, computeRulesHash } from "./computeHashes";
import { buildPerfilEntidade } from "./buildPerfilEntidade";
import type { BuildResult, PerfilDimensional, Seed } from "./types";

// ─── Manifesto canônico v1.0.0 — fonte de rules_hash ───────────────────────
// Importado como JSON (resolveJsonModule). Este é o MESMO arquivo consumido
// por auditoria externa (docs/epic-830-rag-arquetipo/manifests/).

import manifestoV1 from "../../../docs/epic-830-rag-arquetipo/manifests/m1-v1.0.0.json";

// ─── Constantes ────────────────────────────────────────────────────────────

/**
 * Versão do modelo — fixa nesta release. Bumps exigem novo arquivo manifesto
 * + novo hash (ADR-0032 §5 + CANONICAL-RULES-MANIFEST §5).
 */
export const MODEL_VERSION = "m1-v1.0.0" as const;

// ─── Output completo ───────────────────────────────────────────────────────

/**
 * Retorno de `buildSnapshot(seed)`:
 * - `perfil` — snapshot imutável completo (ADR-0032)
 * - `test_status` — resultado do teste (PASS/FAIL/BLOCKED)
 * - `blockers_triggered` — todos os blockers emitidos (INFO/HARD_BLOCK/BLOCK_FLOW)
 * - `missing_required_fields` — lista de campos faltantes
 *
 * `perfil` contém todos os 16 campos da §6.1 + hashes pré-computados.
 */
export interface BuildSnapshotOutput {
  readonly perfil: PerfilDimensional;
  readonly test_status: BuildResult["test_status"];
  readonly blockers_triggered: BuildResult["blockers_triggered"];
  readonly missing_required_fields: BuildResult["missing_required_fields"];
}

// ─── Orquestrador principal ────────────────────────────────────────────────

/**
 * Constrói snapshot completo do arquétipo com hashes e metadata de imutabilidade.
 *
 * Pipeline (ordem determinística):
 *   1. Invoca `buildPerfilEntidade(seed)` — derivação das 5 dimensões + contextuais
 *   2. Computa `perfil_hash` sobre dimensional + contextuais (exclui metadata)
 *   3. Computa `rules_hash` sobre manifesto v1.0.0
 *   4. Compõe `PerfilDimensional` final com metadata ADR-0032
 *   5. Retorna output + blockers + test_status + missing_required_fields
 *
 * @param seed Seed v3 (input)
 * @param dataVersion ISO-8601 UTC opcional (injeção para testes determinísticos).
 *                    Se omitido, usa `new Date().toISOString()` no momento da chamada.
 *
 * @example
 *   // Execução determinística (teste):
 *   buildSnapshot(seed, "2026-04-24T12:00:00.000Z")
 *
 *   // Execução em produção:
 *   buildSnapshot(seed)  // data_version = now
 */
export function buildSnapshot(
  seed: Seed,
  dataVersion?: string,
): BuildSnapshotOutput {
  const result = buildPerfilEntidade(seed);

  // data_version: ISO-8601 UTC estrito (formato YYYY-MM-DDTHH:mm:ss.sssZ)
  const effectiveDataVersion = dataVersion ?? new Date().toISOString();

  // perfil_hash: dimensões + contextuais (exclui metadata, derived_legacy, hashes)
  const perfilHash = computePerfilHash({
    objeto: result.arquetipo_partial.objeto,
    papel_na_cadeia: result.arquetipo_partial.papel_na_cadeia,
    tipo_de_relacao: result.arquetipo_partial.tipo_de_relacao,
    territorio: result.arquetipo_partial.territorio,
    regime: result.arquetipo_partial.regime,
    subnatureza_setorial: result.arquetipo_partial.subnatureza_setorial,
    orgao_regulador: result.arquetipo_partial.orgao_regulador,
    regime_especifico: result.arquetipo_partial.regime_especifico,
  });

  // rules_hash: manifesto completo (já no shape canônico)
  const rulesHash = computeRulesHash(manifestoV1 as CanonicalValue);

  const perfil: PerfilDimensional = {
    // 5 dimensões
    objeto: result.arquetipo_partial.objeto,
    papel_na_cadeia: result.arquetipo_partial.papel_na_cadeia,
    tipo_de_relacao: result.arquetipo_partial.tipo_de_relacao,
    territorio: result.arquetipo_partial.territorio,
    regime: result.arquetipo_partial.regime,

    // Contextuais
    subnatureza_setorial: result.arquetipo_partial.subnatureza_setorial,
    orgao_regulador: result.arquetipo_partial.orgao_regulador,
    regime_especifico: result.arquetipo_partial.regime_especifico,

    // Campo derivado legado (Q-2)
    derived_legacy_operation_type:
      result.arquetipo_partial.derived_legacy_operation_type,

    // Metadata ADR-0032 §2
    status_arquetipo: result.status_arquetipo,
    motivo_bloqueio: result.motivo_bloqueio,
    model_version: MODEL_VERSION,
    data_version: effectiveDataVersion,
    perfil_hash: perfilHash,
    rules_hash: rulesHash,
    imutavel: true,
  };

  return {
    perfil,
    test_status: result.test_status,
    blockers_triggered: result.blockers_triggered,
    missing_required_fields: result.missing_required_fields,
  };
}

// ─── Re-exports úteis ──────────────────────────────────────────────────────

export type { BuildResult, PerfilDimensional, Seed } from "./types";
