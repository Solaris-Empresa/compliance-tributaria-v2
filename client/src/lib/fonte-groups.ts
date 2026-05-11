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
 * Calcula contagem de riscos por grupo de fonte usando MULTI-FONTE
 * (todos os contributors). Risco multi-fonte conta em múltiplos grupos.
 *
 * Comportamento legado (Issue #1049 / PR #1058). Substituído por
 * `countRisksBySourcePriority` na Issue #1064.
 *
 * MANTIDO: retrocompatibilidade. Não usar em código novo.
 *
 * @deprecated Use countRisksBySourcePriority — Issue #1064
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

/**
 * Mapeia um valor de `source_priority` (fonte primária do risco) ao grupo
 * canônico. Retorna `null` se a fonte não pertence a nenhum dos 3 grupos
 * exibidos no filtro (ex: cnae, ncm, nbs, inferred — não exibidos por
 * decisão de UX da Issue #1064).
 *
 * @param sourcePriority - Valor de `risks_v4.source_priority`
 * @returns grupo canônico ou null
 */
export function getSourcePriorityGroup(
  sourcePriority: string | null | undefined,
): FonteGroup | null {
  if (!sourcePriority) return null;
  for (const group of ["solaris", "regulatorio", "iagen"] as const) {
    if (FONTE_GROUPS[group].has(sourcePriority)) return group;
  }
  return null;
}

/**
 * Issue #1064 — contagem de riscos por `source_priority` (fonte primária).
 *
 * Comportamento:
 *   - Cada risco conta em APENAS UM grupo (o da sua source_priority)
 *   - Soma dos contadores = total de riscos do grupo solaris/regulatorio/iagen
 *   - Riscos com source_priority fora dos 3 grupos (ex: cnae, ncm, nbs)
 *     NÃO entram em nenhum contador (não exibidos no filtro)
 *
 * Substitui semanticamente `countRisksByFonteGroup` para o caso do filtro
 * em /riscos. Decisão P.O. 2026-05-11.
 *
 * @param risks - Array de riscos com source_priority
 * @returns counts por grupo {solaris, regulatorio, iagen}
 */
export function countRisksBySourcePriority(
  risks: ReadonlyArray<{ source_priority: string | null | undefined }>,
): Record<FonteGroup, number> {
  const counts: Record<FonteGroup, number> = {
    solaris: 0,
    regulatorio: 0,
    iagen: 0,
  };
  for (const risk of risks) {
    const group = getSourcePriorityGroup(risk.source_priority);
    if (group) counts[group]++;
  }
  return counts;
}

/**
 * Issue #1064 — verifica se a `source_priority` de um risco bate com o grupo.
 * Usado pelo filtro em /riscos (substitui `riskHasFonteGroup` no caller).
 *
 * @param sourcePriority - Valor de `risks_v4.source_priority`
 * @param group - Grupo canônico do filtro
 * @returns true se a fonte primária está no grupo
 */
export function riskMatchesSourcePriority(
  sourcePriority: string | null | undefined,
  group: FonteGroup,
): boolean {
  return getSourcePriorityGroup(sourcePriority) === group;
}
