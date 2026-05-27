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
 * Gate do D1-C.
 *
 * INTERINO — gate hardcoded CNAE grupo 28 + NCM 8436.*
 * Tech-debt: migrar para gate data-driven via NEW-CAT aliquota_zero_bens_capital_agro
 * Issue: #NEW-CAT (bloqueada por gate jurídico P.O.)
 * (Mesmo precedente ORQ-32 de PARTE_GERAL_LC214_FIM = 128 — interino com tech-debt.)
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
