/**
 * Frente C (BUG-FONTES) — grounding silencioso da Portaria Conjunta MF/CGIBS 7.
 *
 * A Portaria tem apenas 2 chunks (Arts. 1-2) — volume insuficiente para
 * retrieval semântico confiável. Em vez de depender do RAG, injetamos os
 * chunks diretamente como bloco de grounding no contexto do briefing, para o
 * LLM saber que as disposições do Livro I do Decreto 12.955 e da Resolução
 * CGIBS 6 são comuns ao IBS e à CBS.
 *
 * Regras:
 *  - Conteúdo SEMPRE vem do banco (sem hardcode de texto normativo).
 *  - Grounding SILENCIOSO: não emite instrução pedindo ao LLM para citar.
 *  - Degradação graciosa (Lição #67): qualquer falha → string vazia, nunca
 *    bloqueia a geração do briefing.
 *
 * O formatador (`formatPortariaGrounding`) é puro e testável sem DB.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { ragDocuments } from "../../drizzle/schema";

export const PORTARIA_LEI = "portaria_mf_cgibs_7" as const;

/**
 * Monta o bloco de grounding a ANEXAR ao regulatoryContext.
 * Retorna string vazia se não houver conteúdo (nenhum chunk ou só vazios).
 */
export function formatPortariaGrounding(chunks: { conteudo: string }[]): string {
  const conteudo = chunks
    .map((c) => c.conteudo?.trim())
    .filter((s): s is string => Boolean(s))
    .join("\n");
  if (!conteudo) return "";
  return `\n\nCONTEXTO NORMATIVO — DISPOSIÇÕES COMUNS IBS E CBS:\n${conteudo}`;
}

/**
 * Busca os chunks da Portaria MF/CGIBS 7 no banco e devolve o bloco de
 * grounding formatado. Nunca lança — em qualquer falha devolve "".
 */
export async function fetchPortariaGrounding(): Promise<string> {
  try {
    const database = await getDb();
    if (!database) return "";
    const rows = await database
      .select({ conteudo: ragDocuments.conteudo })
      .from(ragDocuments)
      .where(eq(ragDocuments.lei, PORTARIA_LEI))
      .orderBy(ragDocuments.artigo);
    return formatPortariaGrounding(rows);
  } catch {
    return "";
  }
}
