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
  // BUG-AGRO-CPF F3 (#1290) — cnpj tornou-se OPCIONAL para suportar PF (CPF).
  // Retrocompat preservada: registros legacy sem cpf/taxIdType continuam
  // produzindo o mesmo hash byte-a-byte (canonical idêntico ao pré-F3).
  readonly cnpj?: string;
  readonly cpf?: string;
  readonly taxIdType?: "cnpj" | "cpf";
  readonly taxId?: string;
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
 * BUG-AGRO-CPF F3 (#1290) — Sentinel para inputs sem identificador fiscal.
 * Usado quando taxId, cpf E cnpj estão todos ausentes/null/undefined.
 * Não-pretende-ser-um-CPF/CNPJ-válido; serve para gerar hash determinístico
 * mesmo em projetos sem documento (3202/3400 projetos com companyProfile=NULL
 * — confirmado pelo Gate 3 do F0).
 */
export const UNKNOWN_TAX_ID = "UNKNOWN_TAX_ID" as const;

/**
 * Computa sha256 hex do snapshot canonical.
 *
 * Garantias:
 *   - Mesmo input → mesmo hash (determinístico)
 *   - Insensível a ordem de elementos em arrays (sort interno)
 *   - Insensível a whitespace nas strings de array (trim interno)
 */
export function computePerfilHash(input: PerfilSnapshotInput): string {
  // BUG-AGRO-CPF F3 (#1290) — Canonical preservando retrocompat byte-a-byte.
  // Registros legacy (sem taxIdType) produzem o MESMO hash que pré-F3.
  // Registros F3-aware (com taxIdType explícito) ganham taxId + taxIdType
  // no canonical → permite distinguir PF (cpf) de PJ (cnpj) com mesma string.
  //
  // null-safety: cnpj?.trim() ?? "" tolera undefined/null silenciosamente.
  // Para o teste TR-03 (companyProfile=null no callsite), o callsite em
  // routers/perfil.ts:233 já faz `?.cnpj ?? ""` antes de chamar esta função.
  const canonical: Record<string, unknown> = {
    project_id: input.project_id,
    cnpj: (input.cnpj ?? "").trim(),
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

  // F3 ADR-0033 — Identidade fiscal dual.
  // Adicionado ao canonical APENAS quando taxIdType é explícito:
  //   - Registros legacy (taxIdType undefined): canonical permanece IDÊNTICO ao pré-F3
  //     → hash byte-a-byte igual ao histórico. Preserva ADR-0032 §3 (MINOR aditivo).
  //   - Registros F3 PJ (taxIdType='cnpj'): canonical ganha campos → hash NOVO.
  //   - Registros F3 PF (taxIdType='cpf'): canonical ganha campos → hash NOVO.
  // taxId derivado: taxId explícito → cpf → cnpj → UNKNOWN_TAX_ID (null-safe).
  if (input.taxIdType !== undefined) {
    const effectiveTaxId = (
      input.taxId ?? input.cpf ?? input.cnpj ?? UNKNOWN_TAX_ID
    ).trim();
    canonical.taxIdType = input.taxIdType;
    canonical.taxId = effectiveTaxId.length > 0 ? effectiveTaxId : UNKNOWN_TAX_ID;
  }

  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
