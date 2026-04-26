#!/usr/bin/env node
/**
 * run-50-v3.mjs — Runner v3 do Arquétipo (M1 Perfil da Entidade)
 *
 * Fonte canônica: SPEC-RUNNER-RODADA-D.md §1 (contrato) + §5 (gate GO)
 *
 * Responsabilidades (estritamente orquestração, zero lógica de negócio):
 *   1. Carrega suite v3 JSON (51 cenários)
 *   2. Itera cada test, invoca buildSnapshot(seed, FIXED_DATA_VERSION)
 *   3. Coleta status_arquetipo + blockers + test_status + hashes
 *   4. Agrega summary + verdict GO/NO-GO
 *   5. Emite relatório JSON único em stdout
 *
 * Execução (tsx necessário para importar .ts):
 *   pnpm exec tsx tests/archetype-validation/run-50-v3.mjs > RESULT-51-casos-brasil-v3.json
 *
 * Determinismo: data_version fixada; buildSnapshot pura → mesma entrada → mesmo output byte-a-byte.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Import do núcleo archetype (arquivos .ts resolvidos via tsx)
import { buildSnapshot } from "../../server/lib/archetype/buildSnapshot.ts";

// ─── Constantes ────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * data_version fixada para determinismo cross-execution.
 * Qualquer bump nesta constante muda todos os snapshots — evitar em execução
 * de validação/auditoria.
 */
const FIXED_DATA_VERSION = "2026-04-24T12:00:00.000Z";

/**
 * Alvo do gate GO conforme SPEC §5.1 (Q-C3 RESOLVIDA — AMBIGUOUS removido).
 * GO ⟺ (FAIL == 0) ∧ (BLOCKED == 1)
 */
const GATE_TARGET = Object.freeze({
  PASS: 50,
  FAIL: 0,
  BLOCKED: 1,
  total: 51,
});

// ─── Carga da suite ────────────────────────────────────────────────────────

const suitePath = path.join(
  __dirname,
  "M1-arquetipo-51-casos-brasil-v3.json",
);
const suite = JSON.parse(readFileSync(suitePath, "utf8"));

// ─── Execução por cenário ──────────────────────────────────────────────────

const results = suite.tests.map((test) => {
  const seed = test.seed_data;
  try {
    const output = buildSnapshot(seed, FIXED_DATA_VERSION);
    return {
      id: test.id,
      scenario_name: test.scenario_name,
      macro_setor: test.macro_setor,
      test_status: output.test_status,
      status_arquetipo: output.perfil.status_arquetipo,
      motivo_bloqueio: output.perfil.motivo_bloqueio,
      blockers_triggered: output.blockers_triggered,
      missing_required_fields: output.missing_required_fields,
      perfil_hash: output.perfil.perfil_hash,
      rules_hash: output.perfil.rules_hash,
      derived_legacy_operation_type:
        output.perfil.derived_legacy_operation_type,
      arquetipo_dimensions: {
        objeto: output.perfil.objeto,
        papel_na_cadeia: output.perfil.papel_na_cadeia,
        tipo_de_relacao: output.perfil.tipo_de_relacao,
        territorio: output.perfil.territorio,
        regime: output.perfil.regime,
      },
    };
  } catch (err) {
    // Erro inesperado (não-AmbiguityError) = defeito do runner ou dado malformado
    return {
      id: test.id,
      scenario_name: test.scenario_name,
      macro_setor: test.macro_setor,
      test_status: "FAIL",
      status_arquetipo: null,
      motivo_bloqueio: null,
      blockers_triggered: [
        {
          id: "RUNNER-UNEXPECTED-ERROR",
          severity: "HARD_BLOCK",
          rule: `Runtime error: ${err?.message ?? String(err)}`,
        },
      ],
      missing_required_fields: [],
      perfil_hash: null,
      rules_hash: null,
      derived_legacy_operation_type: null,
      arquetipo_dimensions: null,
    };
  }
});

// ─── Agregação ─────────────────────────────────────────────────────────────

function countBy(arr, predicate) {
  return arr.filter(predicate).length;
}

const summary = {
  total: results.length,
  by_test_status: {
    PASS: countBy(results, (r) => r.test_status === "PASS"),
    FAIL: countBy(results, (r) => r.test_status === "FAIL"),
    BLOCKED: countBy(results, (r) => r.test_status === "BLOCKED"),
  },
  by_status_arquetipo: {
    pendente: countBy(results, (r) => r.status_arquetipo === "pendente"),
    inconsistente: countBy(
      results,
      (r) => r.status_arquetipo === "inconsistente",
    ),
    bloqueado: countBy(results, (r) => r.status_arquetipo === "bloqueado"),
    confirmado: countBy(results, (r) => r.status_arquetipo === "confirmado"),
  },
  by_macro_setor: {
    servicos: countBy(results, (r) => r.macro_setor === "servicos"),
    industria: countBy(results, (r) => r.macro_setor === "industria"),
    agro: countBy(results, (r) => r.macro_setor === "agro"),
  },
  blockers_by_id: {},
};

// Contagem de blockers por id (observabilidade)
for (const r of results) {
  for (const b of r.blockers_triggered) {
    summary.blockers_by_id[b.id] = (summary.blockers_by_id[b.id] ?? 0) + 1;
  }
}

// ─── Verdict GO/NO-GO ──────────────────────────────────────────────────────

const failCount = summary.by_test_status.FAIL;
const blockedCount = summary.by_test_status.BLOCKED;
const isGO = failCount === 0 && blockedCount === 1;

const verdict = {
  decision: isGO ? "GO" : "NO-GO",
  target: GATE_TARGET,
  rationale: [
    `FAIL = ${failCount} (alvo: 0)`,
    `BLOCKED = ${blockedCount} (alvo: 1 — controle negativo S27)`,
    `PASS = ${summary.by_test_status.PASS}`,
  ],
};

// ─── Rules hash consistency check ──────────────────────────────────────────

const rulesHashes = new Set(
  results.map((r) => r.rules_hash).filter((h) => h !== null),
);
const rulesHashConsistency = {
  unique_rules_hashes: rulesHashes.size,
  expected: 1,
  ok: rulesHashes.size === 1,
};

// ─── Output final ──────────────────────────────────────────────────────────

const output = {
  suite_name: suite.suite_name,
  phase: suite.phase,
  executed_at: new Date().toISOString(),
  model_version: "m1-v1.0.0",
  data_version_fixed: FIXED_DATA_VERSION,
  summary,
  verdict,
  rules_hash_consistency: rulesHashConsistency,
  results,
};

process.stdout.write(JSON.stringify(output, null, 2) + "\n");
