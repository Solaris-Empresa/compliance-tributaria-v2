/**
 * versioning.ts — Constantes de versão do Perfil da Entidade (ADR-0032)
 *
 * MODEL_VERSION: versão do engine M1 (semver). Bumpa em mutações estruturais.
 * DATA_VERSION: timestamp ISO do dataset/corpus snapshot pós-#860 (Art. 169 cnaeGroups).
 *
 * Persistidos em projects.archetypeVersion ao confirmar Perfil da Entidade.
 */

export const MODEL_VERSION = "m1-v1.0.0";

// Pós-PR #860 — saneamento Art. 169 LC 214 cnaeGroups += 49,50,51,52,53
// Merge commit: 593e04c · 2026-04-28T22:29:37Z
export const DATA_VERSION = "2026-04-28T22:29:37Z";
