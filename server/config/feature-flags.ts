/**
 * Feature Flags — IA SOLARIS v5.0
 *
 * Gate 0 D3: features com risk score ≥ medium devem ter feature flag.
 * Ciclo de vida:
 *   1. Feature implementada → flag desabilitada por padrão (false)
 *   2. Habilitar para P.O. apenas → validar em produção
 *   3. Habilitar para todos → se MTTR e CFR estáveis
 *   4. Remover flag → PR de chore após 1 sprint estável
 *
 * Governança: docs/GATES-DOCUMENTACAO-COMPLETA-v5.md § 10
 */

export const FEATURE_FLAGS: Record<string, boolean> = {
  // Sprint N — G17 validado em produção (projeto 2310001, 3 gaps inseridos)
  'g17-solaris-gap-engine': true,

  // Sprint N — G11 fonte_risco: implementado (PR #267)
  'g11-fonte-risco': true,

  // Sprint N — G15 badge ONDA_BADGE nos questionários (Issue #192)
  // false = badge oculto; true = badge visível para P.O. validar
  'g15-fonte-perguntas': true,

  // Bloqueio permanente — aguarda UAT com advogados (Issue #61)
  'diagnostic-read-mode-new': false,

  // Bloqueio permanente — aguarda F-04 Fase 3 (Issue #56)
  'f04-fase3': false,

  // M1 — Runner v3 do Perfil da Entidade (deploy controlado)
  // false = desabilitado para todos (default)
  // Ativar apenas para: equipe_solaris, ambiente de teste, projetos específicos
  // Rollout global: aguarda aprovação P.O. após validação interna
  // Ref: feat/m1-archetype-runner-v3 · SPEC-RUNNER-RODADA-D.md
  'm1-archetype-enabled': false,

  // M2 — Perfil da Entidade no fluxo /projetos/novo (PR-A schema+backend)
  // false = redirect legado preservado (cnaes_confirmados → onda1_solaris)
  // true  = redirect novo (cnaes_confirmados → perfil_entidade_confirmado → onda1_solaris)
  // Rollout em 5 etapas (ver docs/specs/m2-perfil-entidade/PROMPT-M2-v3-FINAL.json)
  // Ref: feat/m2-pr-a-schema-backend
  'm2-perfil-entidade-enabled': false,
};

/**
 * Verifica se uma feature está habilitada.
 * Uso em fire-and-forget ou procedures de risco medium/high:
 *
 * ```typescript
 * if (!isFeatureEnabled('g17-solaris-gap-engine', projectId)) {
 *   return { inserted: 0, skipped: true };
 * }
 * ```
 *
 * @param flag - Nome da feature flag
 * @param _projectId - ID do projeto (reservado para rollout gradual futuro)
 */
export function isFeatureEnabled(flag: string, _projectId?: number): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}

/**
 * M1 — Verifica se o Runner v3 do Perfil da Entidade está habilitado
 * para o contexto atual.
 *
 * Política de rollout controlado (deploy M1 fase 1):
 *   1. Flag global `m1-archetype-enabled` = false por padrão
 *   2. Ativo para: equipe_solaris | advogado_senior (usuários internos)
 *   3. Ativo para: projectId em M1_ARCHETYPE_ALLOWED_PROJECTS
 *   4. Ativo para: E2E_TEST_MODE=true (ambiente de teste)
 *   5. Rollout global: apenas após aprovação explícita do P.O.
 *
 * @param userRole - Role do usuário autenticado
 * @param projectId - ID do projeto sendo processado
 * @returns true se o runner v3 deve ser executado
 */
export function isM1ArchetypeEnabled(
  userRole: string,
  projectId?: number,
): boolean {
  // PR defesa em profundidade (P.O. 2026-04-30): E2E_TEST_MODE só vale fora de prod.
  // Detecta produção por NODE_ENV ou hostname canonico do deploy ativo.
  // Bug histórico: bypass ativo em prod desde commit 639937d (2026-04-24)
  // permitiu que isM2PerfilEntidadeEnabled retornasse true para qualquer role.
  // Detectado em smoke R3-A Cenário 5 (Issue #874).
  if (process.env.E2E_TEST_MODE === "true") {
    const databaseUrl = process.env.DATABASE_URL ?? "";
    const isProd =
      process.env.NODE_ENV === "production" ||
      databaseUrl.includes("iasolaris.manus.space");
    if (isProd) {
      console.warn(
        "[SECURITY] E2E_TEST_MODE=true ignored in production env (potential misconfig)",
      );
      // continua para checks normais — NÃO retorna true
    } else {
      return true;
    }
  }

  // Usuários internos (equipe_solaris e advogado_senior) — sempre ativo
  const INTERNAL_ROLES = ["equipe_solaris", "advogado_senior"];
  if (INTERNAL_ROLES.includes(userRole)) return true;

  // Projetos específicos em whitelist (configurado via env)
  if (projectId !== undefined) {
    const allowedProjects = (process.env.M1_ARCHETYPE_ALLOWED_PROJECTS ?? "")
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    if (allowedProjects.includes(projectId)) return true;
  }

  // Flag global — false por padrão (rollout global não iniciado)
  return FEATURE_FLAGS["m1-archetype-enabled"] ?? false;
}

/**
 * M2 — Verifica se o Perfil da Entidade no fluxo /projetos/novo está habilitado.
 *
 * Política de rollout (5 etapas — docs/specs/m2-perfil-entidade/PROMPT-M2-v3-FINAL.json):
 *   1. PR-A merged: flag false. Schema deployado mas inerte.
 *   2. PR-B merged: flag false. Frontend deployado mas redirect antigo.
 *   3. P.O. ativa para equipe_solaris (validar internamente).
 *   4. UAT OK: flag true global.
 *   5. Sprint estável: remover flag em PR de chore.
 *
 * Override via env var M2_PERFIL_ENTIDADE_ENABLED ("true" | "false") tem precedência.
 *
 * @param ctx - Contexto opcional com role e/ou projectId
 * @returns true se o redirect novo deve ser ativado
 */
export function isM2PerfilEntidadeEnabled(ctx: {
  role?: string;
  projectId?: number;
} = {}): boolean {
  // Override explícito via env (CI / staging / debug)
  if (process.env.M2_PERFIL_ENTIDADE_ENABLED === "false") return false;
  if (process.env.M2_PERFIL_ENTIDADE_ENABLED === "true") return true;

  // PR defesa em profundidade (P.O. 2026-04-30): E2E_TEST_MODE só vale fora de prod.
  // Detecta produção por NODE_ENV ou hostname canonico do deploy ativo.
  // Bug histórico: bypass ativo em prod desde commit 639937d (2026-04-24)
  // permitiu que isM2PerfilEntidadeEnabled retornasse true para qualquer role.
  // Detectado em smoke R3-A Cenário 5 (Issue #874).
  if (process.env.E2E_TEST_MODE === "true") {
    const databaseUrl = process.env.DATABASE_URL ?? "";
    const isProd =
      process.env.NODE_ENV === "production" ||
      databaseUrl.includes("iasolaris.manus.space");
    if (isProd) {
      console.warn(
        "[SECURITY] E2E_TEST_MODE=true ignored in production env (potential misconfig)",
      );
      // continua para checks normais — NÃO retorna true
    } else {
      return true;
    }
  }

  // Usuários internos — opt-in via env adicional (rollout step 3)
  const INTERNAL_ROLES = ["equipe_solaris", "advogado_senior"];
  if (
    ctx.role &&
    INTERNAL_ROLES.includes(ctx.role) &&
    process.env.M2_PERFIL_ENTIDADE_INTERNAL_ROLES === "true"
  ) {
    return true;
  }

  // Whitelist de projetos (rollout step 3 alternativo)
  if (ctx.projectId !== undefined) {
    const allowedProjects = (process.env.M2_PERFIL_ENTIDADE_ALLOWED_PROJECTS ?? "")
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    if (allowedProjects.includes(ctx.projectId)) return true;
  }

  // Default: false (rollout global não iniciado)
  return FEATURE_FLAGS["m2-perfil-entidade-enabled"] ?? false;
}
