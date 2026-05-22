/**
 * server/lib/validate-article-citations.ts
 *
 * DIAG-A (BUG-FONTES) — gate anti-alucinação de citações de artigos infralegais.
 *
 * Problema: o LLM faz "ranging" e cita artigos adjacentes não-injetados (ex.: 780002
 * citou "Decreto 12.955/2026, Art. 244-246" — Art. 244 ∉ bundle curado 245-258).
 *
 * Opção B (decisão P.O.): NÃO-DESTRUTIVO nesta versão — apenas FLAG + LOG. Mantém o
 * texto original, adiciona `_hallucination_detected` + `console.warn`. Remoção/correção
 * = PR futuro após dados de frequência.
 *
 * Data-driven (REGRA-ORQ-32): valida contra `normative_bundle.artigos_decreto`/`artigos_cgibs6`
 * das categorias `confirmed` (do banco), NÃO lista hardcoded.
 *
 * Funções puras testáveis isoladamente; `loadAllowedArticles` é o glue de DB (graceful).
 */
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { riskCategories } from "../../drizzle/schema";

export interface AllowedArticles {
  decreto: Set<string>;
  cgibs6: Set<string>;
}

interface NormativeBundleObject {
  artigos_decreto?: string[];
  artigos_cgibs6?: string[];
}

/** Extrai cada token "Art. N" (ranges retornam o início — ex.: "Art. 244-246" → ["Art. 244"]). */
export function extractArticleNumbers(text: string): string[] {
  if (!text) return [];
  return [...text.matchAll(/Art\.\s*(\d+)/gi)].map((m) => `Art. ${m[1]}`);
}

/**
 * Retorna os artigos citados como Decreto 12.955 ou Resolução CGIBS 6 que NÃO estão no
 * conjunto curado. Só valida quando a citação atribui a uma fonte infralegal (não LC 214)
 * E quando há conjunto curado não-vazio (sem set → não validável → sem falso positivo).
 */
export function findHallucinatedCitations(text: string, allowed: AllowedArticles): string[] {
  if (!text) return [];
  const arts = extractArticleNumbers(text);
  if (!arts.length) return [];
  const mentionsDecreto = /decreto\s*(n[ºo.]*\s*)?12\.?955/i.test(text);
  const mentionsCgibs = /(resolu[çc][ãa]o\s*(cgibs|n[ºo.]*\s*6)|cgibs\s*6)/i.test(text);
  if (!mentionsDecreto && !mentionsCgibs) return []; // LC 214 / sem infralegal → fora de escopo

  const invalid: string[] = [];
  for (const art of arts) {
    if (mentionsDecreto && allowed.decreto.size > 0 && !allowed.decreto.has(art)) {
      invalid.push(art);
    } else if (!mentionsDecreto && mentionsCgibs && allowed.cgibs6.size > 0 && !allowed.cgibs6.has(art)) {
      invalid.push(art);
    }
  }
  return [...new Set(invalid)];
}

/**
 * Opção B — flag + log, não-destrutivo. Para cada gap cuja `evidencia_regulatoria`/
 * `source_reference` cite artigo infralegal fora do conjunto curado: adiciona
 * `_hallucination_detected: true` + `_hallucinated_articles` + `console.warn`. Texto intacto.
 */
export function flagHallucinatedCitations<
  T extends { evidencia_regulatoria?: string; source_reference?: string }
>(gaps: T[], allowed: AllowedArticles): T[] {
  if (!Array.isArray(gaps)) return gaps;
  return gaps.map((gap) => {
    const fields = [gap.evidencia_regulatoria, gap.source_reference].filter(Boolean) as string[];
    const invalid = [...new Set(fields.flatMap((f) => findHallucinatedCitations(f, allowed)))];
    if (invalid.length === 0) return gap;
    console.warn(
      `[CitationGate] artigo(s) fora do normative_bundle citado(s) como infralegal: ${invalid.join(", ")} | evidencia="${gap.evidencia_regulatoria ?? ""}"`
    );
    return { ...gap, _hallucination_detected: true, _hallucinated_articles: invalid };
  });
}

/** Carrega os artigos curados (Decreto + CGIBS 6) das categorias `confirmed`. Graceful → vazio. */
export async function loadAllowedArticles(): Promise<AllowedArticles> {
  const empty: AllowedArticles = { decreto: new Set(), cgibs6: new Set() };
  try {
    const db = await getDb();
    if (!db) return empty;
    const cats = await db
      .select()
      .from(riskCategories)
      .where(eq(riskCategories.normativeStatus, "confirmed"));
    const decreto = new Set<string>();
    const cgibs6 = new Set<string>();
    for (const cat of cats) {
      const raw = cat.normativeBundle as unknown;
      let bundle: NormativeBundleObject | null = null;
      try {
        bundle = typeof raw === "string" ? (JSON.parse(raw) as NormativeBundleObject) : (raw as NormativeBundleObject);
      } catch {
        continue;
      }
      if (!bundle || Array.isArray(bundle)) continue;
      bundle.artigos_decreto?.forEach((a) => decreto.add(a));
      bundle.artigos_cgibs6?.forEach((a) => cgibs6.add(a));
    }
    return { decreto, cgibs6 };
  } catch {
    return empty;
  }
}
