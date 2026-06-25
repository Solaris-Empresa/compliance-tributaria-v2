/**
 * align-intl-ops.ts — F2 dual-name (FORM-NOVO-PROJETO-V2 / SPEC-F2-dual-name.md)
 *
 * O formulário escreve `taxComplexity.hasImportExport`; os engines (consistencyEngine
 * DET-004/005, db-requirements tag "internacional", limite de perguntas) leem
 * `taxComplexity.hasInternationalOps` — nome diferente, nunca escrito → regras mortas.
 *
 * Este helper, atrás de `ENABLE_INTL_OPS_ALIGN`, DERIVA o nome canônico a partir do
 * que o form escreve, no único ponto de escrita (createProject). É ADITIVO: NÃO
 * renomeia `hasImportExport` (leitores legados — diagnostic-consolidator, confidence —
 * seguem intactos). Flag OFF = comportamento atual idêntico.
 */
export function alignIntlOps<T extends Record<string, any> | null | undefined>(tc: T): T {
  if (!tc || process.env.ENABLE_INTL_OPS_ALIGN !== "true") return tc;
  if (tc.hasInternationalOps === undefined && tc.hasImportExport !== undefined) {
    return { ...tc, hasInternationalOps: tc.hasImportExport } as T;
  }
  return tc;
}
