/**
 * client/src/lib/cited-laws.ts
 *
 * BUG-3/GAP-3 (Auditoria 1050001) — Base Legal dinâmica: deriva as leis citadas
 * a partir do campo `artigo` enriquecido dos riscos + oportunidades (#1169).
 * LC 214/2025 sempre presente; Decreto/CGIBS adicionados quando citados.
 *
 * Catálogo verbatim da spec P.O. (22/05). Descrições dos infralegais em Latin-1
 * estrito (sem ç/ã) para uso seguro no PDF (generateDiagnosticoPDF — Windows-1252).
 * Distinção jurídica: Decreto 12.955 regulamenta a CBS; CGIBS 6 regulamenta o IBS.
 */

export interface LawInfo {
  nome: string;
  descricao: string;
}

export const LAWS_CATALOG: Record<string, LawInfo> = {
  "LC 214/2025": {
    nome: "Lei Complementar 214/2025",
    descricao: "Institui o IBS, a CBS e o IS, e dá outras providências.",
  },
  "Decreto 12.955/2026": {
    nome: "Decreto 12.955/2026",
    descricao: "Regulamenta a CBS — operacionalizacao das disposicoes da LC 214/2025.",
  },
  "Resolução CGIBS 6/2026": {
    nome: "Resolucao CGIBS 6/2026",
    descricao: "Regulamenta o IBS — normas operacionais do Comite Gestor do IBS.",
  },
};

/**
 * Deriva as leis citadas. Itera riscos + oportunidades (ambos têm `artigo`
 * enriquecido via #1169). LC 214 sempre presente; ordem: LC, Decreto, CGIBS.
 */
export function deriveCitedLaws(
  risks: Array<{ artigo?: string | null }>,
  opportunities: Array<{ artigo?: string | null }> = []
): LawInfo[] {
  const keys = new Set<string>(["LC 214/2025"]);
  for (const r of [...risks, ...opportunities]) {
    const artigo = r.artigo ?? "";
    if (artigo.includes("Decreto")) keys.add("Decreto 12.955/2026");
    if (artigo.includes("CGIBS")) keys.add("Resolução CGIBS 6/2026");
  }
  return Array.from(keys).map((k) => LAWS_CATALOG[k]);
}
