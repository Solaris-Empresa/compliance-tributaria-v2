/**
 * scripts/spike-frente-b-leifilter.ts
 *
 * BUG-FONTES Frente B — SPIKE (read-only, decisão P.O. "spike antes de decidir").
 *
 * Mede a composição do topK do `retrieveArticles` por lei, comparando:
 *   (A) leiFilter = undefined          → comportamento atual (corpus completo)
 *   (B) leiFilter = union(source_basis) → modelo Frente B (data-driven)
 *
 * Responde 2 perguntas que decidem se a quota por fonte é necessária:
 *   1. Com (B), o Decreto 12.955 / CGIBS 6 aparecem no topK?
 *   2. (A) vs (B): quais leis são perdidas ao restringir (ec132/lc116/etc.)?
 *
 * NÃO escreve nada. Read-only. Manus executa em ambiente com corpus + chaves.
 *
 * Uso:
 *   DATABASE_URL=... OPENAI_API_KEY=... [JINA_RERANKER_ENABLED=true] \
 *     npx tsx scripts/spike-frente-b-leifilter.ts "<cnaes,csv>" "<contextQuery>"
 *   (args opcionais — defaults representativos abaixo)
 */
import { getDb } from "../server/db";
import { retrieveArticles } from "../server/rag-retriever";
import { buildLeiFilterFromSourceBasis } from "../server/lib/lei-filter";

const DEFAULT_CNAES = ["4712100", "4711301"]; // comércio varejista (representativo)
const DEFAULT_QUERY =
  "split payment crédito presumido apuração IBS CBS obrigação acessória inscrição cadastral";
const TOP_K = 7; // mesmo topK do briefing (routers-fluxo-v3.ts:1419)

function countByLei(articles: { lei: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of articles) out[a.lei] = (out[a.lei] ?? 0) + 1;
  return out;
}

async function main(): Promise<void> {
  const cnaes = (process.argv[2]?.split(",").map((s) => s.trim()).filter(Boolean)) ?? DEFAULT_CNAES;
  const query = process.argv[3] ?? DEFAULT_QUERY;

  const db = await getDb();
  if (!db) throw new Error("[SPIKE-B] DATABASE_URL ausente.");

  // 1) union de source_basis das categorias ativas (data-driven)
  const [rows] = await (db.$client as any).promise().execute(
    `SELECT source_basis FROM risk_categories WHERE status = 'ativo'`
  );
  const sourceBases = (rows as { source_basis: unknown }[]).map((r) => r.source_basis);
  const union = buildLeiFilterFromSourceBasis(sourceBases);
  console.log("[SPIKE-B] union(source_basis) =", JSON.stringify(union));
  console.log("[SPIKE-B] cnaes =", JSON.stringify(cnaes), "| topK =", TOP_K);

  // 2) (A) sem filtro
  const a = await retrieveArticles(cnaes, query, TOP_K, undefined);
  console.log("\n[SPIKE-B] (A) leiFilter=undefined");
  console.log("  totalCandidates:", a.totalCandidates);
  console.log("  topK por lei:", JSON.stringify(countByLei(a.articles)));
  console.log("  topK artigos:", a.articles.map((x) => `${x.lei}:${x.artigo}`).join(", "));

  // 3) (B) union
  const b = await retrieveArticles(cnaes, query, TOP_K, union);
  console.log("\n[SPIKE-B] (B) leiFilter=union(source_basis)");
  console.log("  totalCandidates:", b.totalCandidates);
  console.log("  topK por lei:", JSON.stringify(countByLei(b.articles)));
  console.log("  topK artigos:", b.articles.map((x) => `${x.lei}:${x.artigo}`).join(", "));

  // 4) veredito
  const bLeis = new Set(b.articles.map((x) => x.lei));
  const aLeis = new Set(a.articles.map((x) => x.lei));
  console.log("\n[SPIKE-B] VEREDITO:");
  console.log("  decreto12955 no topK (B)?", bLeis.has("decreto12955"));
  console.log("  resolucao_cgibs_6 no topK (B)?", bLeis.has("resolucao_cgibs_6"));
  console.log(
    "  leis perdidas ao restringir (em A, fora de B):",
    JSON.stringify([...aLeis].filter((l) => !bLeis.has(l)))
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[SPIKE-B] ERRO:", err);
    process.exit(1);
  });
