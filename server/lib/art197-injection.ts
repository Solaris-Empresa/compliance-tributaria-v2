/**
 * D1-C — injeção determinística do Art. 197 (alíquota zero p/ máquinas agrícolas /
 * produtor rural) no pool de geração de Q.NCM.
 *
 * Motivação: o Art. 197 (decreto12955 / resolucao_cgibs_6) é o regime correto para
 * fabricante de máquinas agrícolas, mas fica na posição ~72/73 do Pass 2 (id alto)
 * → nunca entra no LIMIT 20 nem nos topK do reranker (ver Lição #101). Em vez de
 * mudar a policy global de retrieval (alto risco, Tier 2), injetamos o chunk
 * diretamente no pool de geração — determinístico, bypassa o reranker. Padrão:
 * `fetchPortariaGrounding` (Frente C / BUG-FONTES).
 *
 * Conteúdo SEMPRE do banco (sem hardcode de texto normativo). Degradação graciosa
 * (Lição #67): qualquer falha → []; nunca bloqueia a geração.
 */
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { ragDocuments } from "../../drizzle/schema";
import type { RagChunk } from "./tracked-question";

const ART197_LEIS = ["decreto12955", "resolucao_cgibs_6"] as const;
const ART197_ARTIGO = "Art. 197";

/**
 * Gate do D1-C — CNAE grupo 28 (máquinas/equipamentos) + NCM família 8436.
 *
 * GATE-NCM-NBS #1219 F3 (M4): `startsWith("8436")` já aceita tanto o GRUPO
 * "8436" (4 díg.) quanto o específico "8436.99.00" (validado em F3). Rótulo
 * "INTERINO" removido: o gate por família 8436 é a semântica correta (máquinas
 * agrícolas — Decreto 12.955 Anexo V), agora consistente com o catálogo de
 * grupos data-driven (#1219 F5). Refino por subitem = evolução, não bloqueio.
 */
export function shouldInjectArt197(cnaeCodes: string[], ncmCodes: string[]): boolean {
  const groups = cnaeCodes.map((c) => c.replace(/\D/g, "").slice(0, 2));
  const hasCnae28 = groups.includes("28");
  const hasNcm8436 = ncmCodes.some((n) => n.replace(/\D/g, "").startsWith("8436"));
  return hasCnae28 && hasNcm8436;
}

/**
 * Busca os chunks do Art. 197 (decreto12955 / resolucao_cgibs_6) no banco para
 * injeção determinística. Nunca lança — em qualquer falha devolve [].
 */
export async function fetchArt197Chunks(): Promise<RagChunk[]> {
  try {
    const database = await getDb();
    if (!database) return [];
    const rows = await database
      .select()
      .from(ragDocuments)
      .where(
        and(
          inArray(ragDocuments.lei, [...ART197_LEIS]),
          eq(ragDocuments.artigo, ART197_ARTIGO)
        )
      );
    return rows.map((r) => ({
      anchor_id: r.anchor_id,
      conteudo: r.conteudo,
      artigo: r.artigo,
      lei: r.lei,
      score: 1, // injeção determinística — confiança máxima [0,1] (pós COL-CONF)
      artigoPai: r.artigo_pai ?? undefined,
    }));
  } catch {
    return [];
  }
}
