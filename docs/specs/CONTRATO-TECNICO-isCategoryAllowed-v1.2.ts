// CONTRATO TÉCNICO v1.2 — isCategoryAllowed (Hotfix IS)
// Versão: 1.2 · 2026-04-21
// Referência: SPEC-HOTFIX-IS-v1.2 · ADR-0030 v1.1
// Supersede: CONTRATO-TECNICO-isCategoryAllowed-v1.1.ts
//
// MUDANÇAS vs v1.1 (delta cirúrgico — Caminho C):
//   P2 residual: remoção do cast `as readonly string[]` após narrow type guard
//   Q2:          insertEligibilityAuditLog sem defaults sintéticos em userId/userName
//
// INALTERADOS vs v1.1:
//   - Todo o restante: tipos, tabela, isCategoryAllowed lógica, caller pseudo-código
//   - Helper fire-and-forget (P3 v1.1)
//   - Type guard isOperationType (P2 v1.1 — agora plenamente usado sem cast)
//   - conditional_reason na EligibilityRule (D2 v1.1)
//   - Tabela com agro bloqueado (D1 v1.1)

// ═══════════════════════════════════════════════════════════════════════════
// 1. TIPOS EXPORTADOS (idênticos a v1.1)
// ═══════════════════════════════════════════════════════════════════════════

import type { CategoriaCanonica } from "./risk-categorizer";
import { insertAuditLog } from "./db-queries-risks-v4";

export interface EligibilityResult {
  final: CategoriaCanonica;
  suggested: CategoriaCanonica;
  allowed: boolean;
  reason: EligibilityReason | null;
}

// agro_requer_revisao permanece reservado (decisão Q3 mantida)
export type EligibilityReason =
  | "sujeito_passivo_incompativel"
  | "operation_type_ausente"
  | "operation_type_desconhecido"
  | "agro_requer_revisao"; // reservado — ver ADR-0030 v1.1 D-6

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

/**
 * Type guard sobre OperationType.
 * Uso: if (isOperationType(v)) { // v: OperationType nesta branch
 *        rule.eligible.includes(v);  // sem cast após narrow
 *      }
 */
export function isOperationType(v: unknown): v is OperationType {
  return typeof v === "string" && (CANONIC_OPERATION_TYPES as readonly string[]).includes(v);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. TABELA CANÔNICA v1.2 (idêntica a v1.1 — agro continua blocked)
// ═══════════════════════════════════════════════════════════════════════════

export const ELIGIBILITY_TABLE: Partial<Record<CategoriaCanonica, EligibilityRule>> = {
  imposto_seletivo: {
    eligible: ["industria", "comercio", "misto"] as const,
    conditional: [] as const,
    conditional_reason: "agro_requer_revisao",
    downgrade_to: "enquadramento_geral",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. FUNÇÃO PRINCIPAL v1.2 — P2 residual resolvido (casts removidos)
// ═══════════════════════════════════════════════════════════════════════════

export function isCategoryAllowed(
  suggested: CategoriaCanonica,
  operationType: string | null | undefined
): EligibilityResult {
  const rule = ELIGIBILITY_TABLE[suggested];

  // (1) Categoria não-restrita → permite
  if (!rule) {
    return { final: suggested, suggested, allowed: true, reason: null };
  }

  // (2) operationType ausente → fallback permissivo + reason
  const normalized = (operationType ?? "").trim();
  if (normalized === "") {
    return {
      final: suggested,
      suggested,
      allowed: true,
      reason: "operation_type_ausente",
    };
  }

  // (3) Eligible canônico → permite sem reason
  //     v1.2 (P2 resolvido): após narrow via isOperationType, rule.eligible.includes
  //     compila sem cast — tsconfig target ES2017 + strict true.
  if (isOperationType(normalized) && rule.eligible.includes(normalized)) {
    return { final: suggested, suggested, allowed: true, reason: null };
  }

  // (4) Conditional canônico → permite COM reason da regra
  //     v1.2 (P2 resolvido): sem cast após narrow
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

// ═══════════════════════════════════════════════════════════════════════════
// 4. HELPER DE LOG v1.2 — Q2 resolvido (sem defaults sintéticos)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registra decisão de elegibilidade em audit_log.
 *
 * CONTRATO v1.2:
 * - Fire-and-forget: NUNCA propaga exceção
 * - userId e userName são OBRIGATÓRIOS (Q2 resolvido — sem defaults sintéticos)
 * - Caller deve passar ctx.user.id, ctx.user.name do contexto tRPC
 * - userRole mantém default 'user' (valor textual não-referencial, seguro)
 *
 * Fonte primária Q2: drizzle/0064_risks_v4.sql — user_id INT NOT NULL
 * Padrão estabelecido: server/routers/risks-v4.ts (13+ callers, todos
 *   passam ctx.user.id — nenhum usa valor sintético).
 *
 * SCHEMA:
 * - entity='risk' (ENUM existente)
 * - action='created' (ENUM existente)
 * - Zero migration necessária
 */
export async function insertEligibilityAuditLog(
  projectId: number,
  result: EligibilityResult,
  operationType: string | null | undefined,
  userId: number,                              // v1.2: obrigatório (era default=0)
  userName: string,                            // v1.2: obrigatório (era default sintético)
  userRole: string = "user"                    // default OK — campo textual não-referencial
): Promise<void> {
  try {
    await insertAuditLog({
      project_id: projectId,
      entity: "risk",
      entity_id: `eligibility:${result.suggested}`,
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
    // Silencioso por contrato
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. PSEUDO-CÓDIGO DO CALLER v1.2 — caller passa ctx.user real (Q2)
// ═══════════════════════════════════════════════════════════════════════════

/*
DEPOIS v1.2 (hotfix):

    import { isCategoryAllowed, insertEligibilityAuditLog } from "../lib/risk-eligibility";

    // operationType extraído do projectProfile (já carregado no topo do fluxo)
    const operationType = extractedProfile?.tipoOperacao ?? null;

    // --- dentro do loop de gaps ---

    const categoriaSugerida = categorizeRisk({
      description: effectiveDescription,
      lei_ref: gap.req_source_reference || gap.gap_source_reference || null,
      topicos: gap.topicos || null,
      domain: effectiveDomain,
      category: mapDomainToTaxonomy(...).category,
      type: mapDomainToTaxonomy(...).type,
    });

    const eligibility = isCategoryAllowed(categoriaSugerida, operationType);

    // v1.2 (Q2): caller passa ctx.user.id (não 0), seguindo padrão de risks-v4.ts
    const fullAuditMode = process.env.ELIGIBILITY_AUDIT_MODE === "full";
    if (fullAuditMode || eligibility.reason !== null) {
      void insertEligibilityAuditLog(
        projectId,
        eligibility,
        operationType,
        ctx.user.id,                                        // real, não sintético
        ctx.user.name ?? ctx.user.email ?? "unknown",       // real, não sintético
        ctx.user.role ?? "user"                             // padrão risks-v4.ts:455
      );
    }

    risks.push({
      ...
      categoria: eligibility.final,
      risk_category_code: gap.risk_category_code || null,
    });

GATE 0 DO F3 (obrigatório):
- Confirmar que ctx.user.id está acessível no escopo do caller em
  server/routers/riskEngine.ts:416 (procedure tRPC com auth)
- Se não estiver: PARAR e escalar ao P.O. — escopo do hotfix não
  comporta refactor de contexto

NOTA SOBRE entity_id (Q1 — via prompt F3, não spec):
- Preferir usar gap.gap_id como entity_id se disponível no escopo
- Fallback: "eligibility:${result.suggested}" (como em v1.1) com comentário
  inline justificando o namespace lógico
*/

// ═══════════════════════════════════════════════════════════════════════════
// 6. INVARIANTES DE TESTE v1.2 (idênticos a v1.1)
// ═══════════════════════════════════════════════════════════════════════════

/*
SEM MUDANÇA em relação a v1.1. Testes obrigatórios permanecem conforme
SPEC-HOTFIX-IS-v1.1 Bloco 8 e teste "red" conforme Bloco 8.2.

ÚNICA ADIÇÃO via prompt F3 (Q5): nomenclatura dos cenários de teste que
verificam "bug persiste intencionalmente" (como C6 da SPEC) deve ser
explícita — usar prefixo "LIM-1:" ou similar nos nomes dos testes para
evitar interpretação de "bug não corrigido".
*/

// ═══════════════════════════════════════════════════════════════════════════
// 7. COMPATIBILIDADE COM ARQUETIPO FUTURO (idêntico a v1.1)
// ═══════════════════════════════════════════════════════════════════════════

/*
Sem mudança — ver contrato v1.1 seção 7 e ADR-0030 v1.1 LIM-5.
*/
