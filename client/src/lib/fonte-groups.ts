/**
 * fonte-groups.ts — Issue #1049
 *
 * Mapeamento de aliases de fonte para grupos canônicos exibidos nos
 * filtros/contadores em /riscos.
 *
 * Cobre aliases legados que podem aparecer em dados pré-Sprint M3.8.1:
 *   - solaris_hardcode (antes do mapping curado em topico-to-categoria)
 *   - rag / rag_validated (antes da unificação em "regulatorio" via inferFonte)
 *   - ia_gen (variação ortográfica antes de iagen)
 *
 * Função pura — extraída de RiskDashboardV4.tsx para teste isolado.
 */

export const FONTE_GROUPS = {
  solaris: new Set(["solaris", "solaris_hardcode"]),
  regulatorio: new Set(["regulatorio", "rag", "rag_validated"]),
  iagen: new Set(["iagen", "ia_gen"]),
} as const;

export type FonteGroup = keyof typeof FONTE_GROUPS;

/**
 * Verifica se as fontes de um risco incluem alguma fonte do grupo especificado.
 *
 * @param fontes - Lista de fontes (de getSourceContributors)
 * @param group - Grupo canônico (solaris | regulatorio | iagen)
 * @returns true se pelo menos 1 fonte está no grupo
 */
export function riskHasFonteGroup(
  fontes: readonly string[],
  group: FonteGroup,
): boolean {
  return fontes.some((f) => FONTE_GROUPS[group].has(f));
}

/**
 * Calcula contagem de riscos por grupo de fonte. Risco multi-fonte
 * (ex: ["solaris","regulatorio"]) conta em AMBOS os contadores.
 *
 * @param risksFontes - Array onde cada item é a lista de fontes de um risco
 * @returns counts por grupo {solaris, regulatorio, iagen}
 */
export function countRisksByFonteGroup(
  risksFontes: ReadonlyArray<readonly string[]>,
): Record<FonteGroup, number> {
  const counts: Record<FonteGroup, number> = {
    solaris: 0,
    regulatorio: 0,
    iagen: 0,
  };
  for (const fontes of risksFontes) {
    if (riskHasFonteGroup(fontes, "solaris")) counts.solaris++;
    if (riskHasFonteGroup(fontes, "regulatorio")) counts.regulatorio++;
    if (riskHasFonteGroup(fontes, "iagen")) counts.iagen++;
  }
  return counts;
}
