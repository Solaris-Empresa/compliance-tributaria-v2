/**
 * server/lib/deterministic-grounding.ts
 *
 * BUG-FONTES Frente B — injeção DETERMINÍSTICA de regulamentação operacional
 * (Decreto 12.955 / Resolução CGIBS 6) no contexto do briefing.
 *
 * POR QUÊ (causa raiz 21/05/2026): o 2º passe via retrieval retornava ~0 chunks
 * do Decreto em produção — 79% dos chunks Decreto têm cnaeGroups="" e a query
 * real do briefing é domain-specific, então o candidate fetch (keyword/cnae LIKE)
 * não casa. Solução: buscar os artigos por-categoria de forma determinística
 * (sem reranker, sem keyword match), padrão idêntico ao fetchPortariaGrounding
 * (Frente C, PR #1143 — smoke comprovado).
 *
 * Project-agnostic (decisão Gate 0): injeta todas as categorias `confirmed`
 * (risks_v4 pode estar vazio no momento do briefing — Briefing precede Matriz).
 * O conjunto é pequeno (split_payment + credito_presumido); o nudge imperativo
 * do prompt (#1155) faz o LLM citar as relevantes.
 *
 * Degradação graciosa (Lição #67): qualquer falha → "" (nunca bloqueia briefing).
 */
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { riskCategories, ragDocuments } from "../../drizzle/schema";

interface NormativeBundleObject {
  artigos_lc214?: string[];
  artigos_decreto?: string[];
  artigos_cgibs6?: string[];
  tema?: string;
}

/**
 * Monta o bloco de grounding a ANEXAR ao regulatoryContext. Vazio se sem conteúdo.
 * Puro e testável (deterministic-grounding.test.ts).
 */
export function formatDeterministicGrounding(conteudos: string[]): string {
  const joined = conteudos
    .map((c) => c?.trim())
    .filter((s): s is string => Boolean(s))
    .join("\n\n");
  if (!joined) return "";
  return `\n\nREGULAMENTAÇÃO OPERACIONAL (Decreto 12.955/2026 e Resolução CGIBS 6/2026):\n${joined}`;
}

/**
 * BUG-IBS-02: nota explicativa para Simples Nacional/MEI. Para SN, os artigos do regime
 * regular do IBS (CGIBS 6) NÃO são injetados (guard em fetchDeterministicGrounding) — em vez
 * do vazio, injeta a nota do tratamento PRÓPRIO do SN (CGIBS 6 Art. 41 §2º + Art. 49,
 * verificados no corpus). Em PROSA — sem prefixo `[FONTE: Resolução CGIBS 6...]`, para preservar
 * o invariante "0 tags [FONTE: CGIBS] para SN" (guard do smoke). "" para regimes != SN.
 */
export function buildSimplesNacionalNote(regime?: string | null): string {
  if (regime !== "simples_nacional") return "";
  return (
    "OBSERVAÇÃO — SIMPLES NACIONAL/MEI:\n" +
    "Para empresas optantes pelo Simples Nacional/MEI, a Resolução CGIBS 6/2026 prevê " +
    "tratamento próprio (Art. 41, §2º e Art. 49). Os dispositivos do regime regular do IBS " +
    "não se aplicam a este enquadramento."
  );
}

/**
 * Busca determinística dos artigos infralegais das categorias `confirmed` e
 * devolve o bloco formatado. Nunca lança — em falha devolve "".
 *
 * @param regime taxRegime do projeto; `simples_nacional` → não injeta CGIBS 6
 *   (não recolhe IBS — preserva intenção do PR #1099).
 */
export async function fetchDeterministicGrounding(
  regime?: string | null
): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "";

    const cats = await db
      .select()
      .from(riskCategories)
      .where(eq(riskCategories.normativeStatus, "confirmed"));

    const conteudos: string[] = [];

    for (const cat of cats) {
      const raw = cat.normativeBundle;
      // Drizzle/MySQL retorna JSON como string crua — parse necessário.
      let bundle: NormativeBundleObject | string[] | null;
      if (!raw) continue;
      try {
        bundle = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        continue;
      }
      // Robusto a shape misto: só objeto por-lei contribui (array legado/null → skip).
      if (!bundle || Array.isArray(bundle)) continue;

      const decreto = bundle.artigos_decreto;
      if (decreto?.length) {
        const rows = await db
          .select({ conteudo: ragDocuments.conteudo, artigo: ragDocuments.artigo })
          .from(ragDocuments)
          .where(
            and(eq(ragDocuments.lei, "decreto12955"), inArray(ragDocuments.artigo, decreto))
          );
        conteudos.push(...rows.map((r) => `[FONTE: Decreto 12.955/2026, ${r.artigo}]\n${r.conteudo}`));
      }

      const cgibs6 = bundle.artigos_cgibs6;
      if (cgibs6?.length && regime !== "simples_nacional") {
        const rows = await db
          .select({ conteudo: ragDocuments.conteudo, artigo: ragDocuments.artigo })
          .from(ragDocuments)
          .where(
            and(
              eq(ragDocuments.lei, "resolucao_cgibs_6"),
              inArray(ragDocuments.artigo, cgibs6)
            )
          );
        conteudos.push(...rows.map((r) => `[FONTE: Resolução CGIBS 6/2026, ${r.artigo}]\n${r.conteudo}`));
      }
    }

    // BUG-IBS-02: nota do tratamento próprio do SN (CGIBS não injetada acima p/ SN).
    const snNote = buildSimplesNacionalNote(regime);
    if (snNote) conteudos.push(snNote);

    return formatDeterministicGrounding(conteudos);
  } catch {
    return "";
  }
}
