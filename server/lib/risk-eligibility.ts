// Hotfix IS v1.2 — Gate de Elegibilidade por operationType
// SPEC: docs/specs/SPEC-HOTFIX-IS-v1.2.md (hash 80176084...)
// Contrato: docs/specs/CONTRATO-TECNICO-isCategoryAllowed-v1.2.ts (hash 9cd96bed...)
// ADR: docs/adr/ADR-0030-hotfix-is-elegibilidade-por-operationtype-v1.1.md

import type { CategoriaCanonica } from "./risk-categorizer";
import { insertAuditLog } from "./db-queries-risks-v4";

// ───────────────────────────────────────────────────────────────────────────
// 1. TIPOS EXPORTADOS
// ───────────────────────────────────────────────────────────────────────────

export interface EligibilityResult {
  final: CategoriaCanonica;
  suggested: CategoriaCanonica;
  allowed: boolean;
  reason: EligibilityReason | null;
}

// agro_requer_revisao reservado — ver ADR-0030 v1.1 D-6 (não exercitado em v1.1)
export type EligibilityReason =
  | "sujeito_passivo_incompativel"
  | "operation_type_ausente"
  | "operation_type_desconhecido"
  | "agro_requer_revisao";

export interface EligibilityRule {
  eligible: readonly OperationType[];
  conditional: readonly OperationType[];
  conditional_reason: EligibilityReason;
  downgrade_to: CategoriaCanonica;
}

export type OperationType =
  | "industria"
  | "comercio"
  | "servicos"
  | "misto"
  | "agronegocio"
  | "financeiro";

const CANONIC_OPERATION_TYPES: readonly OperationType[] = [
  "industria",
  "comercio",
  "servicos",
  "misto",
  "agronegocio",
  "financeiro",
] as const;

// Hotfix v1.2.1 — aliases privados para valores não-canônicos observados em produção.
// Não exportar. Escopo: normalização mínima, sem semântica jurídica nova.
const OPERATION_TYPE_ALIASES: Record<string, OperationType> = {
  servico: "servicos",
};

function normalizeOperationType(v: string): string {
  return OPERATION_TYPE_ALIASES[v] ?? v;
}

/**
 * Type guard sobre OperationType.
 * Uso: if (isOperationType(v)) { // v: OperationType nesta branch
 *        rule.eligible.includes(v);  // sem cast após narrow
 *      }
 */
export function isOperationType(v: unknown): v is OperationType {
  // T4: cast necessário dentro do type guard — Array.includes<T>(arg: T) não aceita string arbitrária contra readonly OperationType[]. Após narrow via esta função, nenhum cast adicional é permitido.
  return typeof v === "string" && (CANONIC_OPERATION_TYPES as readonly string[]).includes(v);
}

// ───────────────────────────────────────────────────────────────────────────
// 2. TABELA CANÔNICA v1.2 — agronegócio BLOCKED (ADR-0030 v1.1 D-6)
// ───────────────────────────────────────────────────────────────────────────

export const ELIGIBILITY_TABLE: Partial<
  Record<CategoriaCanonica, EligibilityRule>
> = {
  imposto_seletivo: {
    eligible: ["industria", "comercio", "misto"] as const,
    conditional: [] as const,
    conditional_reason: "agro_requer_revisao",
    // M3.8-3 (REGRA-ORQ-29 + Lição #62): archetype não elegível → "unmapped"
    // (supressão via reviewQueue), em vez de "enquadramento_geral" (gap fantasma).
    // ANTES: "enquadramento_geral" — gerava risco genérico sem rastreabilidade.
    // DEPOIS: "unmapped" — handler downstream em risk-engine-v4 skip o risco.
    downgrade_to: "unmapped",
  },
};

// ───────────────────────────────────────────────────────────────────────────
// 3. FUNÇÃO PRINCIPAL — P2 resolvido (sem cast após narrow)
// ───────────────────────────────────────────────────────────────────────────

export function isCategoryAllowed(
  suggested: CategoriaCanonica,
  operationType: string | null | undefined,
): EligibilityResult {
  const rule = ELIGIBILITY_TABLE[suggested];

  // (1) Categoria não-restrita → permite
  if (!rule) {
    return { final: suggested, suggested, allowed: true, reason: null };
  }

  // (2) operationType ausente → fallback permissivo + reason
  const normalized = normalizeOperationType((operationType ?? "").trim());
  if (normalized === "") {
    return {
      final: suggested,
      suggested,
      allowed: true,
      reason: "operation_type_ausente",
    };
  }

  // (3) Eligible canônico → permite sem reason
  if (isOperationType(normalized) && rule.eligible.includes(normalized)) {
    return { final: suggested, suggested, allowed: true, reason: null };
  }

  // (4) Conditional canônico → permite COM reason da regra
  if (isOperationType(normalized) && rule.conditional.includes(normalized)) {
    return {
      final: suggested,
      suggested,
      allowed: true,
      reason: rule.conditional_reason,
    };
  }

  // (5) Canônico mas bloqueado → downgrade
  if (isOperationType(normalized)) {
    return {
      final: rule.downgrade_to,
      suggested,
      allowed: false,
      reason: "sujeito_passivo_incompativel",
    };
  }

  // (6) Fora dos canônicos → permite com warning
  return {
    final: suggested,
    suggested,
    allowed: true,
    reason: "operation_type_desconhecido",
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 4. HELPER DE LOG — fire-and-forget, Q2 e Q1 do F3 aplicados
// ───────────────────────────────────────────────────────────────────────────

/**
 * Registra decisão de elegibilidade em audit_log.
 *
 * Fire-and-forget: NUNCA propaga exceção (caller usa void).
 * userId/userName obrigatórios: caller passa ctx.user.id/name do contexto tRPC.
 * entityId opcional: prefere gap.gap_id quando disponível; fallback para
 * namespace "eligibility:<suggested>".
 *
 * Schema: entity='risk', action='created' (ENUMs existentes — zero migration).
 */
export async function insertEligibilityAuditLog(
  projectId: number,
  result: EligibilityResult,
  operationType: string | null | undefined,
  userId: number,
  userName: string,
  userRole: string = "user",
  entityId?: string,
): Promise<void> {
  try {
    await insertAuditLog({
      project_id: projectId,
      entity: "risk",
      // Q1 (F3): prefere gap.gap_id quando disponível; fallback namespaceado
      entity_id: entityId ?? `eligibility:${result.suggested}`,
      action: "created",
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      before_state: null,
      after_state: {
        suggested: result.suggested,
        final: result.final,
        allowed: result.allowed,
        reason: result.reason,
        operation_type: operationType ?? null,
        hotfix_version: "hotfix-is-v1.2",
      },
      reason: result.reason,
    });
  } catch {
    // Silencioso por contrato (fire-and-forget)
  }
}
