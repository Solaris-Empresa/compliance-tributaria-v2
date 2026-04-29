/**
 * perfil.ts — Router M2 PR-A · Perfil da Entidade
 *
 * 3 procedures tRPC:
 *   - perfil.build(projectId)    — read-only; computa snapshot via buildSnapshot
 *   - perfil.confirm(projectId)  — write-once; persiste em projects.archetype*
 *   - perfil.get(projectId)      — read-only; retorna snapshot ou null
 *
 * Reusa:
 *   - buildSnapshot (server/lib/archetype/buildSnapshot.ts) — engine puro
 *   - validateM1Seed (server/lib/archetype/validateM1Input.ts) — gate input PR #859
 *   - assertValidTransition (server/flowStateMachine.ts) — FSM dual-path
 *
 * Imutabilidade: ADR-0031 (write-once em archetype IS NOT NULL → 409 CONFLICT)
 * Versionamento: ADR-0032 (archetypeVersion semver, default v1.0.0)
 *
 * Política RAG (P.O. 2026-04-29): este router NÃO toca rag-corpus, rag-retriever,
 * ncm-dataset, ragDocuments. Apenas persiste snapshot em projects.* — futuro
 * consumo M3 lerá projects.archetype no briefing.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { projects } from "../../drizzle/schema";
import { buildSnapshot } from "../lib/archetype/buildSnapshot";
import {
  validateM1Seed,
  deriveTipoObjetoEconomico,
} from "../lib/archetype/validateM1Input";
import {
  computePerfilHash,
  RULES_HASH,
  RULES_VERSION,
} from "../lib/archetype/perfilHash";
import { MODEL_VERSION, DATA_VERSION } from "../lib/archetype/versioning";
import { assertValidTransition } from "../flowStateMachine";
import { isM2PerfilEntidadeEnabled } from "../config/feature-flags";
import type { Seed } from "../lib/archetype/types";

const ARCHETYPE_VERSION_INITIAL = "v1.0.0"; // ADR-0032 — versão inicial

/**
 * Guard de feature flag — corrige BUG-1 da review Manus PR #865.
 * Sem este guard, as procedures eram acessíveis a qualquer usuário autenticado
 * mesmo com flag=false em produção, anulando a política de rollout em 5 etapas.
 *
 * E2E_TEST_MODE=true → sempre passa (suite Playwright opera em CI sem auth real).
 * Cliente externo com flag=false → HTTP 403 FORBIDDEN.
 * equipe_solaris → passa apenas com M2_PERFIL_ENTIDADE_INTERNAL_ROLES=true (Step 3).
 */
function assertM2Enabled(ctx: { user?: { role?: string } }, projectId?: number): void {
  if (
    !isM2PerfilEntidadeEnabled({
      role: ctx.user?.role,
      projectId,
    })
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "M2_PERFIL_ENTIDADE_DISABLED: feature flag m2-perfil-entidade-enabled está desativada para este contexto. Aguarda rollout (5 etapas — ver server/config/feature-flags.ts:isM2PerfilEntidadeEnabled).",
    });
  }
}

// ─── Helpers privados ──────────────────────────────────────────────────────

/**
 * Constrói Seed a partir das colunas legacy do projeto (companyProfile +
 * operationProfile + confirmedCnaes). Mapping mínimo — Sprint M3 expandirá.
 */
export function buildSeedFromProject(project: Record<string, unknown>): Seed {
  const cp = (project.companyProfile ?? {}) as Record<string, unknown>;
  const op = (project.operationProfile ?? {}) as Record<string, unknown>;
  const confirmedCnaes = ((project.confirmedCnaes ?? []) as Array<{
    code?: string;
  }>)
    .map((c) => c.code)
    .filter((c): c is string => typeof c === "string");

  // NCMs / NBSs do operationProfile (formato legacy: principaisProdutos[])
  const ncmsFromOp = (
    (op.principaisProdutos ?? []) as Array<{ ncm_code?: string }>
  )
    .map((p) => p.ncm_code)
    .filter((c): c is string => typeof c === "string" && c.trim().length > 0);
  const nbssFromOp = (
    (op.principaisServicos ?? []) as Array<{ nbs_code?: string }>
  )
    .map((s) => s.nbs_code)
    .filter((c): c is string => typeof c === "string" && c.trim().length > 0);

  // Mapping single-select operationType (legacy) → natureza_operacao (M1)
  const operationType = (op.operationType ?? "") as string;
  const naturezaFromLegacy: string[] = [];
  if (operationType === "industria" || operationType === "agronegocio")
    naturezaFromLegacy.push("Produção própria");
  if (operationType === "comercio") naturezaFromLegacy.push("Comércio");
  if (operationType === "servicos") naturezaFromLegacy.push("Prestação de serviço");
  if (operationType === "misto")
    naturezaFromLegacy.push("Comércio", "Prestação de serviço");
  if (operationType === "financeiro")
    naturezaFromLegacy.push("Prestação de serviço");

  // PR-D BUG-1 fix: posicao_na_cadeia_economica derivado do operationType.
  // derivePapel (buildPerfilEntidade.ts:117-127) espera literais EXATOS:
  //   "Produtor/fabricante" → fabricante
  //   "Atacadista"          → distribuidor
  //   "Varejista"           → varejista
  //   "Prestador de servico"→ prestador
  //   "Operadora"           → operadora_regulada
  //   "Intermediador"       → intermediador
  // Versão anterior usava "Produtor" para agro (sem case match → indefinido) e
  // não cobria misto/financeiro (vazio → indefinido). Resolve bug funcional
  // que bloqueava CTA "Confirmar Perfil da Entidade".
  // Refs: routers-m1-monitor.ts:193-216 (POSICAO_ALIASES canônicos).
  let posicaoCadeia = "";
  if (operationType === "industria") posicaoCadeia = "Produtor/fabricante";
  else if (operationType === "comercio") posicaoCadeia = "Atacadista";
  else if (operationType === "servicos") posicaoCadeia = "Prestador de servico";
  else if (operationType === "agronegocio") posicaoCadeia = "Produtor/fabricante"; // FIX-1
  else if (operationType === "misto") posicaoCadeia = "Atacadista"; // FIX-1: misto é predominantemente comércio (decisão P.O.)
  else if (operationType === "financeiro") posicaoCadeia = "Operadora"; // FIX-1: financeiro → operadora_regulada via derivePapel

  // PR-D BUG-2 fix: normalizar taxRegime snake_case → title case.
  // PerfilEmpresaIntelligente.tsx:911-913 grava companyProfile.taxRegime em
  // snake_case ("simples_nacional", "lucro_presumido", "lucro_real").
  // deriveRegime (buildPerfilEntidade.ts:205-210) espera title case
  // ("Simples Nacional", etc). Sem normalização: regime sempre "indefinido".
  // Aliases idempotentes (aceita ambos formatos).
  // Refs: routers-m1-monitor.ts:170-184 (REGIME_ALIASES canônicos).
  const taxRegimeRaw =
    (op.taxRegime as string) ?? (cp.taxRegime as string) ?? "Lucro Real";
  const TAX_REGIME_ALIASES: Record<string, string> = {
    // snake_case (formato salvo pelo client form)
    simples_nacional: "Simples Nacional",
    lucro_presumido: "Lucro Presumido",
    lucro_real: "Lucro Real",
    mei: "MEI",
    // title case (passthrough idempotente)
    "Simples Nacional": "Simples Nacional",
    "Lucro Presumido": "Lucro Presumido",
    "Lucro Real": "Lucro Real",
    MEI: "MEI",
  };
  const taxRegime = TAX_REGIME_ALIASES[taxRegimeRaw] ?? taxRegimeRaw;

  return {
    natureza_operacao_principal: naturezaFromLegacy,
    operacoes_secundarias: [],
    fontes_receita: [],
    tipo_objeto_economico: deriveTipoObjetoEconomico(naturezaFromLegacy),
    posicao_na_cadeia_economica: posicaoCadeia,
    cnae_principal_confirmado: confirmedCnaes[0],
    ncms_principais: ncmsFromOp,
    nbss_principais: nbssFromOp,
    abrangencia_operacional: ["Nacional"],
    opera_multiplos_estados: Boolean(op.multiState),
    atua_importacao: false,
    atua_exportacao: false,
    papel_comercio_exterior: [],
    opera_territorio_incentivado: false,
    tipo_territorio_incentivado: [],
    regime_tributario_atual: taxRegime,
    possui_regime_especial_negocio: false,
    tipo_regime_especial: [],
    porte_empresa: (cp.companySize as string) ?? "Medio",
    setor_regulado: false,
    orgao_regulador_principal: [],
    subnatureza_setorial: [],
    tipo_operacao_especifica: [],
    papel_operacional_especifico: [],
    integra_grupo_economico: Boolean(cp.isEconomicGroup),
    analise_1_cnpj_operacional: true,
    user_confirmed: true,
  };
}

// ─── Router ────────────────────────────────────────────────────────────────

export const perfilRouter = router({
  /**
   * perfil.build — read-only; computa snapshot do M1 sem persistir.
   * Validação de input via validateM1Seed (PR #859) reusada.
   */
  build: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      assertM2Enabled(ctx, input.projectId);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const projectRows = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);
      if (projectRows.length === 0)
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      const project = projectRows[0] as Record<string, unknown>;
      const seed = buildSeedFromProject(project);

      // Reusa gate de input PR #859 (NCM/NBS regex + CNAE obrigatório)
      validateM1Seed({
        cnae_principal_confirmado: seed.cnae_principal_confirmado,
        natureza_operacao_principal: [...seed.natureza_operacao_principal],
        ncms_principais: [...seed.ncms_principais],
        nbss_principais: [...seed.nbss_principais],
      });

      const snapshot = buildSnapshot(seed, DATA_VERSION);
      const cnpj = ((project.companyProfile as Record<string, unknown>)?.cnpj ??
        "") as string;
      const confirmedCnaesCodes = (
        (project.confirmedCnaes ?? []) as Array<{ code?: string }>
      )
        .map((c) => c.code)
        .filter((c): c is string => typeof c === "string");

      // Re-computa perfil_hash com escopo expandido (project_id + cnpj + cnaes)
      const perfilHashExpandido = computePerfilHash({
        project_id: input.projectId,
        cnpj,
        confirmedCnaes: confirmedCnaesCodes,
        ncms_canonicos_array: [...seed.ncms_principais],
        nbss_canonicos_array: [...seed.nbss_principais],
        dim_objeto: [...snapshot.perfil.objeto],
        dim_papel_na_cadeia: snapshot.perfil.papel_na_cadeia,
        dim_tipo_de_relacao: [...snapshot.perfil.tipo_de_relacao],
        dim_territorio: [...snapshot.perfil.territorio][0] ?? "",
        dim_regime: snapshot.perfil.regime,
        natureza_operacao_principal: [...seed.natureza_operacao_principal],
        tax_regime: seed.regime_tributario_atual,
        company_size: seed.porte_empresa ?? "Medio",
        subnatureza_setorial: [...snapshot.perfil.subnatureza_setorial],
        orgao_regulador: [...snapshot.perfil.orgao_regulador],
      });

      return {
        snapshot: snapshot.perfil,
        blockers: snapshot.blockers_triggered,
        missing_required_fields: snapshot.missing_required_fields,
        test_status: snapshot.test_status,
        status_arquetipo: snapshot.perfil.status_arquetipo,
        perfil_hash: perfilHashExpandido,
        rules_hash: RULES_HASH,
        rules_version: RULES_VERSION,
        model_version: MODEL_VERSION,
        data_version: DATA_VERSION,
        archetype_version_target: ARCHETYPE_VERSION_INITIAL,
      };
    }),

  /**
   * perfil.confirm — write-once. Imutabilidade ADR-0031.
   * Rejeita HTTP 409 se archetype IS NOT NULL.
   */
  confirm: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      assertM2Enabled(ctx, input.projectId);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const projectRows = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);
      if (projectRows.length === 0)
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      const project = projectRows[0] as Record<string, unknown>;

      // ADR-0031 — imutabilidade write-once: rejeitar 409 se já confirmado
      if (project.archetype !== null && project.archetype !== undefined) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "ARCHETYPE_ALREADY_CONFIRMED: Perfil da Entidade já confirmado para este projeto. Mutações exigem incremento de archetypeVersion (ADR-0032).",
        });
      }

      const seed = buildSeedFromProject(project);

      // Gate de input (reusa PR #859)
      validateM1Seed({
        cnae_principal_confirmado: seed.cnae_principal_confirmado,
        natureza_operacao_principal: [...seed.natureza_operacao_principal],
        ncms_principais: [...seed.ncms_principais],
        nbss_principais: [...seed.nbss_principais],
      });

      const snapshot = buildSnapshot(seed, DATA_VERSION);

      // Engine retorna sem prefixo (pendente|inconsistente|bloqueado|confirmado)
      // FSM persiste com prefixo (perfil_*) — IMP-6 do Manus
      if (snapshot.perfil.status_arquetipo !== "confirmado") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `PERFIL_NOT_CONFIRMABLE: status_arquetipo=${snapshot.perfil.status_arquetipo}. Resolva pendências/inconsistências antes de confirmar.`,
        });
      }

      // Verificação adicional: zero HARD_BLOCK
      const hardBlocks = snapshot.blockers_triggered.filter(
        (b) => b.severity === "HARD_BLOCK",
      );
      if (hardBlocks.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `PERFIL_HARD_BLOCKED: ${hardBlocks.length} HARD_BLOCK(s) ativo(s). IDs: ${hardBlocks.map((b) => b.id).join(", ")}`,
        });
      }

      const cnpj = ((project.companyProfile as Record<string, unknown>)?.cnpj ??
        "") as string;
      const confirmedCnaesCodes = (
        (project.confirmedCnaes ?? []) as Array<{ code?: string }>
      )
        .map((c) => c.code)
        .filter((c): c is string => typeof c === "string");

      const perfilHashExpandido = computePerfilHash({
        project_id: input.projectId,
        cnpj,
        confirmedCnaes: confirmedCnaesCodes,
        ncms_canonicos_array: [...seed.ncms_principais],
        nbss_canonicos_array: [...seed.nbss_principais],
        dim_objeto: [...snapshot.perfil.objeto],
        dim_papel_na_cadeia: snapshot.perfil.papel_na_cadeia,
        dim_tipo_de_relacao: [...snapshot.perfil.tipo_de_relacao],
        dim_territorio: [...snapshot.perfil.territorio][0] ?? "",
        dim_regime: snapshot.perfil.regime,
        natureza_operacao_principal: [...seed.natureza_operacao_principal],
        tax_regime: seed.regime_tributario_atual,
        company_size: seed.porte_empresa ?? "Medio",
        subnatureza_setorial: [...snapshot.perfil.subnatureza_setorial],
        orgao_regulador: [...snapshot.perfil.orgao_regulador],
      });

      // FSM transition (dual-path — preserva legado quando flag=false)
      const currentStatus = (project.status as string) ?? "rascunho";
      assertValidTransition(currentStatus, "perfil_entidade_confirmado");

      // Snapshot completo persistido em projects.archetype (JSON)
      const archetypeSnapshot = {
        project_id: input.projectId,
        cnpj,
        project_name: (project.name as string) ?? "",
        company_type:
          ((project.companyProfile as Record<string, unknown>)?.companyType ??
            "") as string,
        company_size: seed.porte_empresa ?? "Medio",
        annual_revenue_range:
          ((project.companyProfile as Record<string, unknown>)
            ?.annualRevenueRange ?? "") as string,
        tax_regime: seed.regime_tributario_atual,
        confirmedCnaes: confirmedCnaesCodes,
        ncms_canonicos: [...seed.ncms_principais],
        nbss_canonicos: [...seed.nbss_principais],
        dim_objeto: [...snapshot.perfil.objeto],
        dim_papel_na_cadeia: snapshot.perfil.papel_na_cadeia,
        dim_tipo_de_relacao: [...snapshot.perfil.tipo_de_relacao],
        dim_territorio: [...snapshot.perfil.territorio],
        dim_regime: snapshot.perfil.regime,
        natureza_operacao_principal: [...seed.natureza_operacao_principal],
        subnatureza_setorial: [...snapshot.perfil.subnatureza_setorial],
        orgao_regulador: [...snapshot.perfil.orgao_regulador],
        regime_especifico: [...snapshot.perfil.regime_especifico],
        derived_legacy_operation_type:
          snapshot.perfil.derived_legacy_operation_type,
        // FSM com prefixo (Manus IMP-6)
        status_arquetipo: "perfil_confirmado",
        model_version: MODEL_VERSION,
        data_version: DATA_VERSION,
        rules_version: RULES_VERSION,
        confirmed_by_user_id: ctx.user?.id ?? null,
      };

      const confirmedAt = new Date();

      // Update atômico — único INSERT/UPDATE pelo PR-A
      await db
        .update(projects)
        .set({
          archetype: archetypeSnapshot,
          archetypeVersion: ARCHETYPE_VERSION_INITIAL,
          archetypePerfilHash: perfilHashExpandido,
          archetypeRulesHash: RULES_HASH,
          archetypeConfirmedAt: confirmedAt,
          archetypeConfirmedBy: ctx.user?.id ?? null,
          status: "perfil_entidade_confirmado",
        })
        .where(eq(projects.id, input.projectId));

      return {
        snapshot: archetypeSnapshot,
        perfil_hash: perfilHashExpandido,
        rules_hash: RULES_HASH,
        archetype_version: ARCHETYPE_VERSION_INITIAL,
        confirmed_at: confirmedAt.toISOString(),
        immutable: true as const,
      };
    }),

  /**
   * perfil.get — read-only; retorna snapshot persistido ou null.
   */
  get: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      assertM2Enabled(ctx, input.projectId);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const projectRows = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);
      if (projectRows.length === 0)
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      const project = projectRows[0] as Record<string, unknown>;
      if (project.archetype === null || project.archetype === undefined) {
        return {
          confirmed: false as const,
          snapshot: null,
          perfil_hash: null,
          rules_hash: null,
          archetype_version: null,
          confirmed_at: null,
        };
      }

      return {
        confirmed: true as const,
        snapshot: project.archetype,
        perfil_hash: project.archetypePerfilHash as string,
        rules_hash: project.archetypeRulesHash as string,
        archetype_version: project.archetypeVersion as string,
        confirmed_at:
          (project.archetypeConfirmedAt as Date | null)?.toISOString() ?? null,
        confirmed_by: (project.archetypeConfirmedBy as number | null) ?? null,
      };
    }),
});
