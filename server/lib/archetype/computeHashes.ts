/**
 * computeHashes.ts — Cálculo de perfil_hash e rules_hash
 *
 * Fonte canônica:
 * - SPEC-RUNNER-RODADA-D.md §6.2 (perfil_hash) + §6.3 (rules_hash) + §6.2.1 (política de arrays)
 * - ADR-0032 §2 (obrigatoriedade de ambos os hashes)
 * - CANONICAL-JSON-SPEC.md §4.1 (pipeline)
 * - CANONICAL-RULES-MANIFEST.md §4.1 (pipeline manifesto)
 *
 * Regras vinculantes:
 * - perfil_hash = sha256(canonicalJSON(canonicalizeForHash(dimensoes+contextuais)))
 * - rules_hash = sha256(canonicalJSON(manifesto))  [manifesto é 100% semântico — sem wrapper]
 * - Formato de output: "sha256:[64 hex chars]"
 * - Mesma entrada → mesmo hash byte-a-byte (determinismo I-H2, I-C1)
 */

import { createHash } from "node:crypto";
import { canonicalJSON, type CanonicalValue } from "./canonicalJSON";
import { canonicalizeForHash } from "./canonicalizeForHash";

// ─── SHA-256 wrapper com prefixo "sha256:" ────────────────────────────────

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function sha256Prefixed(input: string): string {
  return `sha256:${sha256Hex(input)}`;
}

// ─── Tipo do subset hashável do arquétipo — SPEC §6.2 ──────────────────────

/**
 * Subset exato de campos que entram em perfil_hash:
 * 5 dimensões + 3 contextuais. NÃO inclui:
 * - derived_legacy_operation_type (Q-2 — computável a partir das 5 dim)
 * - status_arquetipo, motivo_bloqueio, model_version, data_version (metadata)
 * - perfil_hash, rules_hash, imutavel (o próprio hash)
 */
export interface PerfilHashInput {
  readonly objeto: readonly string[];
  readonly papel_na_cadeia: string;
  readonly tipo_de_relacao: readonly string[];
  readonly territorio: readonly string[];
  readonly regime: string;
  readonly subnatureza_setorial: readonly string[];
  readonly orgao_regulador: readonly string[];
  readonly regime_especifico: readonly string[];
}

// ─── Função principal — perfil_hash (SPEC §6.2) ────────────────────────────

/**
 * Computa `perfil_hash` a partir das 5 dimensões + contextuais do arquétipo.
 *
 * Pipeline:
 *   1. Monta objeto canônico com 8 campos (§6.2 + Q-D3 incluiu regime_especifico)
 *   2. Aplica canonicalizeForHash (ordena arrays NEUTROS)
 *   3. Serializa via canonicalJSON (chaves ordenadas, sem whitespace)
 *   4. SHA-256 sobre bytes UTF-8
 *   5. Prefixa "sha256:"
 *
 * Invariantes:
 * - I-3: output é string "sha256:[64 hex chars]"
 * - I-H2: mesmo input → mesmo output em Node/Deno/navegadores
 */
export function computePerfilHash(input: PerfilHashInput): string {
  // Converte readonly arrays para mutable (CanonicalValue não exige readonly)
  const hashable: CanonicalValue = {
    objeto: [...input.objeto],
    orgao_regulador: [...input.orgao_regulador],
    papel_na_cadeia: input.papel_na_cadeia,
    regime: input.regime,
    regime_especifico: [...input.regime_especifico],
    subnatureza_setorial: [...input.subnatureza_setorial],
    territorio: [...input.territorio],
    tipo_de_relacao: [...input.tipo_de_relacao],
  };
  const canonicalized = canonicalizeForHash(hashable);
  const json = canonicalJSON(canonicalized);
  return sha256Prefixed(json);
}

// ─── Função principal — rules_hash (SPEC §6.3) ─────────────────────────────

/**
 * Computa `rules_hash` a partir do manifesto declarativo.
 *
 * Manifesto é 100% semântico (rules[] ordem define precedência; enums[] ordem define ranking)
 * → NÃO aplica canonicalizeForHash (arrays permanecem como declarados).
 *
 * Pipeline:
 *   1. Recebe manifesto (já no shape canônico §3 do CANONICAL-RULES-MANIFEST)
 *   2. Serializa via canonicalJSON (chaves ordenadas, arrays preservados)
 *   3. SHA-256 sobre bytes UTF-8
 *   4. Prefixa "sha256:"
 *
 * @param manifesto objeto já deserializado (import JSON) ou equivalente
 */
export function computeRulesHash(manifesto: CanonicalValue): string {
  const json = canonicalJSON(manifesto);
  return sha256Prefixed(json);
}
