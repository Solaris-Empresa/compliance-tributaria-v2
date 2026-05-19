/**
 * ingest-onda2-moc-cte-mdfe.mjs
 *
 * Ingestão direta dos corpus gerados (moc_cte_v4, moc_mdfe_v3) no TiDB.
 * Lê os .ts gerados, extrai os arrays, e insere em ragDocuments.
 * Aplica cnaeGroups = '' (padrão universal) independente do valor no .ts.
 *
 * PRÉ-REQUISITO: ALTER TABLE para adicionar moc_cte_v4 e moc_mdfe_v3 ao ENUM lei.
 *
 * USO: node scripts/ingest-onda2-moc-cte-mdfe.mjs [--dry-run]
 */
import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const isDryRun = process.argv.includes("--dry-run");

// Parse the generated .ts files to extract the corpus arrays
function parseCorpusTs(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const entries = [];
  const entryRegex = /\{\s*lei:\s*"([^"]+)",\s*artigo:\s*("(?:[^"\\]|\\.)*"),\s*titulo:\s*("(?:[^"\\]|\\.)*"),\s*conteudo:\s*`((?:[^`\\]|\\[\s\S])*?)`,\s*topicos:\s*("(?:[^"\\]|\\.)*"),\s*cnaeGroups:\s*("(?:[^"\\]|\\.)*"),\s*chunkIndex:\s*(\d+),?\s*\}/g;

  let m;
  while ((m = entryRegex.exec(content)) !== null) {
    entries.push({
      lei: m[1],
      artigo: JSON.parse(m[2]),
      titulo: JSON.parse(m[3]),
      conteudo: m[4].replace(/\\`/g, "`").replace(/\\\$/g, "$"),
      topicos: JSON.parse(m[5]),
      cnaeGroups: "", // PADRÃO UNIVERSAL — cnaeGroups vazio para leis universais
      chunkIndex: parseInt(m[7], 10),
    });
  }
  return entries;
}

async function main() {
  console.log("[ingest-onda2-moc] Parsing corpus files...");

  const cteEntries = parseCorpusTs(resolve(root, "server/rag-corpus-moc-cte-v4.ts"));
  console.log(`  moc_cte_v4: ${cteEntries.length} chunks parsed`);

  const mdfeEntries = parseCorpusTs(resolve(root, "server/rag-corpus-moc-mdfe-v3.ts"));
  console.log(`  moc_mdfe_v3: ${mdfeEntries.length} chunks parsed`);

  const allEntries = [...cteEntries, ...mdfeEntries];
  console.log(`  TOTAL: ${allEntries.length} chunks to ingest`);
  console.log(`  cnaeGroups override: '' (padrão universal)`);

  if (isDryRun) {
    console.log("[DRY RUN] Would insert", allEntries.length, "chunks. Exiting.");
    console.log(`  Sample entry:`, JSON.stringify(allEntries[0], null, 2).slice(0, 300));
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const conn = await createConnection(dbUrl);

  try {
    // First, delete existing entries for these leis to avoid duplicates
    console.log("[ingest-onda2-moc] Cleaning existing entries...");
    const [delResult1] = await conn.execute(
      "DELETE FROM ragDocuments WHERE lei = 'moc_cte_v4'"
    );
    console.log(`  Deleted ${delResult1.affectedRows} existing moc_cte_v4 chunks`);

    const [delResult2] = await conn.execute(
      "DELETE FROM ragDocuments WHERE lei = 'moc_mdfe_v3'"
    );
    console.log(`  Deleted ${delResult2.affectedRows} existing moc_mdfe_v3 chunks`);

    // Insert in batches of 50
    const BATCH_SIZE = 50;
    let inserted = 0;

    for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
      const batch = allEntries.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
      const values = batch.flatMap((r) => [
        r.lei,
        r.artigo,
        r.titulo,
        r.conteudo,
        r.topicos,
        r.cnaeGroups,
        r.chunkIndex,
      ]);
      await conn.execute(
        `INSERT INTO ragDocuments (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex)
         VALUES ${placeholders}`,
        values
      );
      inserted += batch.length;
      if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= allEntries.length) {
        console.log(`  Inserted ${inserted}/${allEntries.length}...`);
      }
    }

    console.log(`\n[ingest-onda2-moc] ✅ DONE: ${inserted} chunks inserted.`);

    // Verify
    const [stats] = await conn.execute(
      `SELECT lei, COUNT(*) as chunks FROM ragDocuments WHERE lei IN ('moc_cte_v4', 'moc_mdfe_v3') GROUP BY lei`
    );
    console.log("\n[VERIFICAÇÃO]");
    for (const row of stats) {
      console.log(`  ${row.lei}: ${row.chunks} chunks`);
    }

    const [total] = await conn.execute("SELECT COUNT(*) as total FROM ragDocuments");
    console.log(`  TOTAL ragDocuments: ${total[0].total}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[ingest-onda2-moc] ERRO:", err.message);
  process.exit(1);
});
