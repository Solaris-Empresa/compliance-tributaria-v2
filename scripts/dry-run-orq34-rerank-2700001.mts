// DRY-RUN corrigido — REGRA-ORQ-34 Protocolo 2 — projeto 2700001
// Read-only. Reproduz o bug end-to-end + instrumenta o retrieval N vezes.
import { retrieveArticles, isSetorialArtigo } from "../server/rag-retriever";
import { isJinaRerankerEnabled } from "../server/lib/jina-reranker";
import { generateProductQuestions } from "../server/lib/product-questions";
import { getDb } from "../server/db";

const PROJECT_ID = 2700001;
const N_RUNS = 3;

async function main() {
  console.log("== ENV ==");
  console.log("isJinaRerankerEnabled():", isJinaRerankerEnabled());      // fecha N1-4

  // --- montar args REAIS do projeto 2700001 (PASSO 1b) ---
  const db = await getDb();
  if (!db) { console.error("FATAL: getDb() returned null"); process.exit(1); }

  const [projectRows] = await db.execute(
    `SELECT operationProfile, confirmedCnaes, archetype FROM projects WHERE id = ${PROJECT_ID}`
  );
  const project = (projectRows as any[])[0];
  if (!project) { console.error("FATAL: projeto 2700001 não encontrado"); process.exit(1); }

  // Replicar EXATAMENTE a montagem da procedure tRPC (routers-fluxo-v3.ts:5514-5552)
  const op = typeof project.operationProfile === "string"
    ? JSON.parse(project.operationProfile)
    : (project.operationProfile ?? {});
  const ncmCodes: string[] = (op.principaisProdutos ?? [])
    .map((p: any) => p.ncm_code)
    .filter(Boolean);

  const confirmedCnaesRaw = typeof project.confirmedCnaes === "string"
    ? JSON.parse(project.confirmedCnaes)
    : (project.confirmedCnaes ?? []);
  const cnaeCodes: string[] = (confirmedCnaesRaw as Array<{ code: string }>)
    .map((c) => c.code)
    .filter(Boolean);

  const companyProfile = {
    operationType: op.operationType,
    archetype: typeof project.archetype === "string"
      ? JSON.parse(project.archetype)
      : (project.archetype ?? null),
  };

  console.log("ncmCodes:", ncmCodes, "cnaeCodes:", cnaeCodes);
  console.log("archetype:", JSON.stringify(companyProfile.archetype)?.slice(0, 200));

  // === A) Reproduzir o SINTOMA end-to-end ===
  const r = await generateProductQuestions(ncmCodes, cnaeCodes, companyProfile);
  console.log("== A) generateProductQuestions ==");
  console.log(JSON.stringify(r, null, 2).slice(0, 800));
  // esperado p/ reproduzir bug: { nao_aplicavel:true, motivo:"corpus_gap_setorial" }

  // === B) Instrumentar o RETRIEVAL real, N vezes (fecha N1-2, N1-3) ===
  const cnaeGroups = ["84", "28"];  // derivados no PASSO 1c
  for (let i = 1; i <= N_RUNS; i++) {
    const ncm = ncmCodes[0];
    // Replicar contextQuery da product-questions.ts:77-79
    const { getArchetypeContext } = await import("../server/lib/archetype/getArchetypeContext");
    const archetypeContext = getArchetypeContext(companyProfile.archetype as never);
    const contextQuery = archetypeContext
      ? `IBS CBS alíquota produto NCM ${ncm} reforma tributária ${archetypeContext}`
      : `IBS CBS alíquota produto NCM ${ncm} reforma tributária`;

    const out = await retrieveArticles([ncm, ...cnaeCodes], contextQuery, 3, undefined, {}, false);
    const finais = out.articles.map(a => a.artigo);
    const F = out.articles.filter(a => isSetorialArtigo(a.artigo)).length;  // setoriais nos 3 finais

    // Réplica EXATA do Pass 2 real (LIMIT 20, SEM ORDER BY) — fecha N1-1/N1-2
    const pass2Result = await db.execute(`
      SELECT id, lei, artigo, cnaeGroups
      FROM ragDocuments
      WHERE (CAST(REGEXP_SUBSTR(artigo,'[0-9]+') AS UNSIGNED) BETWEEN 128 AND 260
             OR artigo LIKE 'Anexo%')
        AND (${cnaeGroups.map(g =>
              `cnaeGroups LIKE '${g},%' OR cnaeGroups LIKE '%,${g},%' OR cnaeGroups LIKE '%,${g}' OR cnaeGroups = '${g}'`
            ).join(" OR ")} OR LENGTH(cnaeGroups) < 50)
      LIMIT 20
    `);
    const rows = (pass2Result as any).rows ?? (pass2Result as any)[0] ?? pass2Result;
    const P2 = (rows as any[]).length;
    const art197NoPass2 = (rows as any[]).some((x: any) => String(x.artigo).match(/(\d+)/)?.[1] === "197");

    console.log(`== B) RUN ${i} ==`);
    console.log("  totalCandidates(merge):", out.totalCandidates);
    console.log("  3 finais:", finais, "| setoriais nos finais (F):", F);
    console.log("  Pass2 real (LIMIT 20) P2:", P2, "| Art.197 no Pass2:", art197NoPass2);
    console.log("  Pass2 artigos:", (rows as any[]).map((x: any) => x.artigo));

    // CRITÉRIO NEGATIVO (ORQ-34 Protocolo 3): DEVE ser 0 ocorrências de (P2>=1 && F===0)
    if (P2 >= 1 && F === 0) {
      console.log("  >>> NEGATIVO VIOLADO: existe setorial no Pass2 mas NENHUM nos 3 finais → reranker/merge descartou.");
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
