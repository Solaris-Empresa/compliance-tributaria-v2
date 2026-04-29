/**
 * perfilHash.ts — Hash determinístico do Perfil da Entidade (ADR-0031)
 *
 * Computa sha256 do snapshot canonical do M1 v3. Insensível a ordem de arrays.
 * Usado para imutabilidade write-once em projects.archetypePerfilHash.
 *
 * RULES_HASH é a constante m1-v1.0.0 — alinhada com tests/archetype-validation/RESULT-51-casos-brasil-v3.json
 * Bate byte-a-byte com auditoria v7.60.
 */
import { createHash } from "crypto";

export const RULES_VERSION = "m1-v1.0.0";
export const RULES_HASH =
  "4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272";

export interface PerfilSnapshotInput {
  readonly project_id: number;
  readonly cnpj: string;
  readonly confirmedCnaes: readonly string[];
  readonly ncms_canonicos_array: readonly string[];
  readonly nbss_canonicos_array: readonly string[];
  readonly dim_objeto: readonly string[];
  readonly dim_papel_na_cadeia: string;
  readonly dim_tipo_de_relacao: readonly string[];
  readonly dim_territorio: string;
  readonly dim_regime: string;
  readonly natureza_operacao_principal: readonly string[];
  readonly tax_regime: string;
  readonly company_size: string;
  readonly subnatureza_setorial?: readonly string[];
  readonly orgao_regulador?: readonly string[];
  readonly regime_especifico?: string;
}

/**
 * Computa sha256 hex do snapshot canonical.
 *
 * Garantias:
 *   - Mesmo input → mesmo hash (determinístico)
 *   - Insensível a ordem de elementos em arrays (sort interno)
 *   - Insensível a whitespace nas strings de array (trim interno)
 */
export function computePerfilHash(input: PerfilSnapshotInput): string {
  const canonical = {
    project_id: input.project_id,
    cnpj: input.cnpj.trim(),
    confirmedCnaes: [...input.confirmedCnaes].map((s) => s.trim()).sort(),
    ncms_canonicos_array: [...input.ncms_canonicos_array]
      .map((s) => s.trim())
      .sort(),
    nbss_canonicos_array: [...input.nbss_canonicos_array]
      .map((s) => s.trim())
      .sort(),
    dim_objeto: [...input.dim_objeto].sort(),
    dim_papel_na_cadeia: input.dim_papel_na_cadeia,
    dim_tipo_de_relacao: [...input.dim_tipo_de_relacao].sort(),
    dim_territorio: input.dim_territorio,
    dim_regime: input.dim_regime,
    natureza_operacao_principal: [...input.natureza_operacao_principal].sort(),
    tax_regime: input.tax_regime,
    company_size: input.company_size,
    subnatureza_setorial: [...(input.subnatureza_setorial ?? [])].sort(),
    orgao_regulador: [...(input.orgao_regulador ?? [])].sort(),
    regime_especifico: input.regime_especifico ?? null,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
