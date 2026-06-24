/**
 * autoConfirmPerfil.ts — Mud.1 (#1562), despacho v132
 *
 * Persist compartilhado da confirmação do Perfil da Entidade, extraído de
 * `server/routers/perfil.ts:353-439` (perfil.confirm) para evitar duplicação
 * entre `perfil.confirm` (página) e `confirmCnaes` (auto-confirm — Mud.1).
 *
 * NÃO duplicar — único ponto de escrita de `projects.archetype*` (ADR-0031
 * write-once / ADR-0032 versionamento). O CALLER constrói seed+snapshot e
 * valida confirmabilidade ANTES de chamar; este helper só persiste.
 */
import { eq } from "drizzle-orm";
import { projects } from "../../../drizzle/schema";
import { computePerfilHash, RULES_HASH } from "./perfilHash";
import { MODEL_VERSION, DATA_VERSION, RULES_VERSION } from "./versioning";
import { assertValidTransition } from "../../flowStateMachine";
import type { BuildResult, Seed } from "./types";

const ARCHETYPE_VERSION_INITIAL = "v1.0.0"; // ADR-0032 — versão inicial

export interface AutoConfirmResult {
  snapshot: Record<string, unknown>;
  perfil_hash: string;
  rules_hash: string;
  archetype_version: string;
  confirmed_at: string;
  immutable: true;
}

/**
 * Avalia confirmabilidade do snapshot SEM lançar (para roteamento condicional).
 * confirmável = status_arquetipo 'confirmado' E zero HARD_BLOCK.
 */
export function isPerfilConfirmable(snapshot: BuildResult): boolean {
  return (
    snapshot.perfil.status_arquetipo === "confirmado" &&
    snapshot.blockers_triggered.filter((b) => b.severity === "HARD_BLOCK").length === 0
  );
}

/**
 * Persiste a confirmação do perfil (perfilHash + FSM + archetype). Espelho fiel
 * de perfil.ts:353-439. Pré-condições do CALLER: archetype null (write-once),
 * seed validado, snapshot confirmável (isPerfilConfirmable === true).
 */
export async function autoConfirmPerfil(args: {
  db: any;
  projectId: number;
  project: Record<string, unknown>;
  seed: Seed;
  snapshot: BuildResult;
  userId: number | null;
}): Promise<AutoConfirmResult> {
  const { db, projectId, project, seed, snapshot, userId } = args;

  // BUG-AGRO-CPF F3 (#1290) — leitura null-safe + dual identity
  const cp = (project.companyProfile ?? {}) as Record<string, unknown>;
  const cnpj = (cp.cnpj ?? "") as string;
  const cpf = cp.cpf as string | undefined;
  const taxIdType = cp.taxIdType as "cnpj" | "cpf" | undefined;
  const taxId = cp.taxId as string | undefined;
  const confirmedCnaesCodes = ((project.confirmedCnaes ?? []) as Array<{ code?: string }>)
    .map((c) => c.code)
    .filter((c): c is string => typeof c === "string");

  const perfilHashExpandido = computePerfilHash({
    project_id: projectId,
    cnpj,
    cpf,
    taxIdType,
    taxId,
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

  const archetypeSnapshot = {
    project_id: projectId,
    cnpj,
    project_name: (project.name as string) ?? "",
    company_type: ((project.companyProfile as Record<string, unknown>)?.companyType ?? "") as string,
    company_size: seed.porte_empresa ?? "Medio",
    annual_revenue_range: ((project.companyProfile as Record<string, unknown>)?.annualRevenueRange ?? "") as string,
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
    derived_legacy_operation_type: snapshot.perfil.derived_legacy_operation_type,
    status_arquetipo: "perfil_confirmado",
    model_version: MODEL_VERSION,
    data_version: DATA_VERSION,
    rules_version: RULES_VERSION,
    confirmed_by_user_id: userId,
  };

  const confirmedAt = new Date();

  await db
    .update(projects)
    .set({
      archetype: archetypeSnapshot,
      archetypeVersion: ARCHETYPE_VERSION_INITIAL,
      archetypePerfilHash: perfilHashExpandido,
      archetypeRulesHash: RULES_HASH,
      archetypeConfirmedAt: confirmedAt,
      archetypeConfirmedBy: userId,
      status: "perfil_entidade_confirmado",
    })
    .where(eq(projects.id, projectId));

  return {
    snapshot: archetypeSnapshot,
    perfil_hash: perfilHashExpandido,
    rules_hash: RULES_HASH,
    archetype_version: ARCHETYPE_VERSION_INITIAL,
    confirmed_at: confirmedAt.toISOString(),
    immutable: true,
  };
}
