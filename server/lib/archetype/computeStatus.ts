/**
 * computeStatus.ts — Derivação determinística de `status_arquetipo`
 *
 * Fonte canônica: SPEC-RUNNER-RODADA-D.md §4.2.1 (tabela determinística)
 * Referências cruzadas: §4.2.2 (semântica), §4.2.3 (AmbiguityError), §4.7 (invariantes)
 *
 * Ordem das regras (top-down, primeira que bate vence):
 * 1. BLOCK_FLOW (V-05-DENIED) → bloqueado
 * 2. AmbiguityError (qualquer derivação) → inconsistente
 * 3. Conflito lógico (V-LC-NNN) → inconsistente
 * 4. missing_required_fields != [] → inconsistente
 * 5. user_confirmed == true E regras 1-4 falharam → confirmado
 * 6. default → pendente
 *
 * Invariantes aplicadas: IS-1..IS-9 (§4.7) e IS-M-1..IS-M-4 (§4.7.1)
 */

import type { BlockerSeverity, StatusArquetipo } from "./enums";
import type { Blocker } from "./types";

/**
 * Decide `status_arquetipo` + `motivo_bloqueio` + `test_status` a partir de:
 * - blockers acumulados (V-05, V-10, V-LC, DERIVE-001)
 * - campos faltantes detectados durante derivação
 * - flag user_confirmed da seed (Q-C1)
 *
 * Não acessa runtime external (função pura).
 */
export interface ComputeStatusInput {
  readonly blockers: readonly Blocker[];
  readonly missing_required_fields: readonly string[];
  readonly user_confirmed: boolean;
}

export interface ComputeStatusOutput {
  readonly status_arquetipo: StatusArquetipo;
  readonly motivo_bloqueio: string | null;
  readonly test_status: "PASS" | "FAIL" | "BLOCKED";
}

function hasSeverity(
  blockers: readonly Blocker[],
  severity: BlockerSeverity,
): boolean {
  return blockers.some((b) => b.severity === severity);
}

function firstBlockerMessage(
  blockers: readonly Blocker[],
  severity: BlockerSeverity,
): string | null {
  const b = blockers.find((x) => x.severity === severity);
  return b ? `[${b.id}] ${b.rule}` : null;
}

/**
 * Tabela §4.2.1 aplicada de forma determinística.
 *
 * Ordem é preservada em runtime: primeira condição verdadeira vence.
 * Regras 1-4 são mutuamente exclusivas com regra 5 (IS-9).
 *
 * Test result mapping (Q-C3 RESOLVIDA — AMBIGUOUS removido):
 * - bloqueado → test=BLOCKED
 * - inconsistente → test=FAIL
 * - pendente → test=PASS (não avançado, mas não falha o teste)
 * - confirmado → test=PASS
 *
 * INFO blockers (V-05-INFO, V-10-FALLBACK) NÃO alteram status_arquetipo (IS-7).
 */
export function computeStatus(input: ComputeStatusInput): ComputeStatusOutput {
  const { blockers, missing_required_fields, user_confirmed } = input;

  // Regra 1: BLOCK_FLOW → bloqueado (terminal)
  if (hasSeverity(blockers, "BLOCK_FLOW")) {
    const motivo = firstBlockerMessage(blockers, "BLOCK_FLOW");
    // motivo nunca nulo aqui dado hasSeverity=true, mas TS pede guard
    if (motivo === null) {
      throw new Error(
        "[computeStatus] contradição: hasSeverity(BLOCK_FLOW)=true mas firstBlockerMessage=null",
      );
    }
    return {
      status_arquetipo: "bloqueado",
      motivo_bloqueio: motivo,
      test_status: "BLOCKED",
    };
  }

  // Regras 2-4: HARD_BLOCK ou missing fields → inconsistente
  //   Regra 2: AmbiguityError (qualquer derivação) — já materializado em blocker HARD_BLOCK
  //   Regra 3: conflito lógico (V-LC-NNN) — HARD_BLOCK
  //   Regra 4: missing_required_fields != empty
  const hasHardBlock = hasSeverity(blockers, "HARD_BLOCK");
  const hasMissingFields = missing_required_fields.length > 0;

  if (hasHardBlock || hasMissingFields) {
    return {
      status_arquetipo: "inconsistente",
      motivo_bloqueio: null, // IS-2: motivo_bloqueio só presente se status=bloqueado
      test_status: "FAIL",
    };
  }

  // Regra 5: user_confirmed E sem issues (garantido pelas regras anteriores não aplicáveis)
  if (user_confirmed) {
    return {
      status_arquetipo: "confirmado",
      motivo_bloqueio: null,
      test_status: "PASS",
    };
  }

  // Regra 6: default
  return {
    status_arquetipo: "pendente",
    motivo_bloqueio: null,
    test_status: "PASS",
  };
}

/**
 * Mapping Q-8 RESOLVIDA: status_arquetipo → projects.status (novos valores M1).
 * Usado por camada de persistência (fora deste módulo — runner não persiste).
 */
export function statusArquetipoToProjectStatus(
  status: StatusArquetipo,
): "perfil_pendente" | "perfil_inconsistente" | "perfil_bloqueado" | "perfil_confirmado" {
  switch (status) {
    case "pendente":
      return "perfil_pendente";
    case "inconsistente":
      return "perfil_inconsistente";
    case "bloqueado":
      return "perfil_bloqueado";
    case "confirmado":
      return "perfil_confirmado";
  }
}
