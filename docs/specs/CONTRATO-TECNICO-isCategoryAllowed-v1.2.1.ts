// CONTRATO TÉCNICO v1.2.1 — isCategoryAllowed (Hotfix IS — correção de caller)
// Versão: 1.2.1 · 2026-04-22
// Referência: SPEC-HOTFIX-IS-v1.2 (inalterada · hash 80176084...) · ADR-0030 v1.1 (amendment)
// Supersede parcial: CONTRATO-TECNICO-isCategoryAllowed-v1.2.ts (escopo do engine corrigido)
//
// MOTIVAÇÃO (UAT 2026-04-22):
//   Deploy do Hotfix IS v1.2 (PR #826 mergeado em 871cbe8) NÃO corrigiu o
//   bug em produção. Causa raiz: gate aplicado em server/routers/riskEngine.ts
//   (engine v3) mas o frontend usa useNewRiskEngine=true → risksV4 →
//   server/lib/risk-engine-v4.ts (engine v4). v3 é caller inativo no runtime.
//
//   Adicionalmente: projeto de teste do P.O. tem operationType='servico'
//   (singular), não-canônico em OperationType. Gate caía no caso (6) warning
//   sem bloquear.
//
// MUDANÇAS vs v1.2 (delta cirúrgico):
//   (1) risk-eligibility.ts — OPERATION_TYPE_ALIASES privado
//       { servico: "servicos" } + normalizeOperationType privada aplicada
//       inline em isCategoryAllowed. Sem alterações na assinatura pública,
//       sem novos exports, sem alteração da ELIGIBILITY_TABLE.
//   (2) risk-engine-v4.ts — gate aplicado em consolidateRisks (caller efetivo)
//       Pós `const suggestedCategoria = groupGaps[0].categoria;`, aplicar
//       isCategoryAllowed(suggestedCategoria, context.tipoOperacao).
//       Audit log fire-and-forget com .catch(() => {}) EXPLÍCITO (não void).
//
// INALTERADOS vs v1.2:
//   - Tipos exportados (EligibilityResult, EligibilityReason, EligibilityRule,
//     OperationType)
//   - ELIGIBILITY_TABLE (imposto_seletivo apenas)
//   - Assinatura isCategoryAllowed(suggested, operationType)
//   - Helper insertEligibilityAuditLog (Q2, entityId opcional)
//   - Caller em server/routers/riskEngine.ts (v3) — preservado como fallback
//
// INVARIANTES DE ESCOPO (ADR-0030 v1.1 amendment):
//   - OPERATION_TYPE_ALIASES contém EXATAMENTE 1 entrada (servico → servicos)
//   - normalizeOperationType e OPERATION_TYPE_ALIASES NÃO são exportados
//   - SPEC-HOTFIX-IS-v1.2.md NÃO é tocada (hash 80176084... preservado)
//   - server/routers/riskEngine.ts NÃO é tocado
//   - 8 testes obrigatórios (4 unit + 4 integration) passam antes do PR

// ═══════════════════════════════════════════════════════════════════════════
// 1. DELTA NO MÓDULO risk-eligibility.ts (adições privadas)
// ═══════════════════════════════════════════════════════════════════════════

/*
// Hotfix v1.2.1 — aliases privados para valores não-canônicos observados em produção.
// Não exportar. Escopo: normalização mínima, sem semântica jurídica nova.
const OPERATION_TYPE_ALIASES: Record<string, OperationType> = {
  servico: "servicos",
};

function normalizeOperationType(v: string): string {
  return OPERATION_TYPE_ALIASES[v] ?? v;
}
*/

// Aplicação inline no fluxo existente de isCategoryAllowed:
//
//   // (2) operationType ausente → fallback permissivo + reason
//   const normalized = normalizeOperationType((operationType ?? "").trim());
//   if (normalized === "") { ... }
//
// A normalização ocorre ANTES das checagens (3)-(6), garantindo que aliases
// sejam avaliados nas mesmas branches que valores canônicos.

// ═══════════════════════════════════════════════════════════════════════════
// 2. DELTA NO MÓDULO risk-engine-v4.ts (gate no caller efetivo)
// ═══════════════════════════════════════════════════════════════════════════

/*
import { isCategoryAllowed, insertEligibilityAuditLog } from "./risk-eligibility";
import type { CategoriaCanonica } from "./risk-categorizer";

// Em consolidateRisks, dentro do loop `for (const [riskKey, groupGaps] of grouped)`:

const suggestedCategoria = groupGaps[0].categoria;

const eligibility = isCategoryAllowed(
  suggestedCategoria as CategoriaCanonica,
  context.tipoOperacao,
);
const auditMode = process.env.ELIGIBILITY_AUDIT_MODE === "full";
if (auditMode || eligibility.reason !== null) {
  insertEligibilityAuditLog(
    projectId,
    eligibility,
    context.tipoOperacao,
    actorId,
    String(actorId),
    "user",
    riskKey,
  ).catch(() => {});  // EXPLÍCITO — não usar void
}

const categoria = eligibility.final;
const effectiveRiskKey =
  categoria === suggestedCategoria ? riskKey : buildRiskKey(categoria, context);

// Todas as linhas subsequentes usam `categoria` (pós-gate) e `effectiveRiskKey`.
// buildLegalTitle(categoria, context) gera título correto.
// results.push({ rule_id: effectiveRiskKey, risk_key: effectiveRiskKey,
//                breadcrumb: [bestSource, categoria, catArtigo, effectiveRiskKey], ... });
*/

// ═══════════════════════════════════════════════════════════════════════════
// 3. JUSTIFICATIVA DE .catch(() => {}) EXPLÍCITO
// ═══════════════════════════════════════════════════════════════════════════
//
// `void insertEligibilityAuditLog(...)` descarta a Promise mas não captura
// rejeição — dispara UnhandledPromiseRejection warning em runtime se o helper
// lançar. O try/catch interno do helper silencia a maioria, mas mudanças
// futuras podem quebrar essa garantia.
//
// `.catch(() => {})` é defensivo: mesmo que o helper passe a rejeitar, o
// consolidateRisks nunca propaga erro por causa da auditoria. Fire-and-forget
// real, sem side-effect em runtime.

// ═══════════════════════════════════════════════════════════════════════════
// 4. CRITÉRIOS DE ACEITE (8 testes obrigatórios)
// ═══════════════════════════════════════════════════════════════════════════
//
// Unit (risk-eligibility.test.ts):
//   U1: servicos (canônico) → bloqueia IS, final=enquadramento_geral
//   U2: servico (alias singular) → bloqueia IS via normalizeOperationType
//   U3: industria → permite IS (sem regressão)
//   U4: comercio → permite IS (sem regressão)
//
// Integration (risk-engine-v4.test.ts, novo Bloco G):
//   I1: consolidateRisks({ tipoOperacao: "servicos" }) com gap IS →
//       categoria final = enquadramento_geral, risk_key sem "imposto_seletivo::"
//   I2: consolidateRisks({ tipoOperacao: "servico" }) com gap IS → idem
//   I3: consolidateRisks({ tipoOperacao: "industria" }) com gap IS →
//       categoria = imposto_seletivo (sem regressão)
//   I4: consolidateRisks({ tipoOperacao: "comercio" }) com gap IS → idem
//
// Todos os 39 testes preexistentes do risk-engine-v4.test.ts e os 24 do
// risk-eligibility.test.ts continuam verdes (total 35+28 = 63 no limite).

// ═══════════════════════════════════════════════════════════════════════════
// 5. RASTREABILIDADE
// ═══════════════════════════════════════════════════════════════════════════
//
// - PR anterior: #826 (merge 2026-04-22T14:21:40Z, commit 871cbe8)
// - UAT P.O.: 2026-04-22 — bug persiste em produção
// - Investigação D: mapeou v3 vs v4 — v3 é inativo no runtime
// - F3 pré-v2: vocabulário divergente (servico vs servicos) descoberto
// - Política ADR: amendment inline no v1.1 (sem ADR-0030 v1.2 separado)
// - SPEC v1.2: NÃO tocada (hash 80176084429aa615de8fa02ba1c4b096706e4172200e3093221f36a5316b70b9 preservado)
