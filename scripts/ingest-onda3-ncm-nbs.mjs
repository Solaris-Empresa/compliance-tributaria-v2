/**
 * ingest-onda3-ncm-nbs.mjs
 *
 * Ingestão direta dos corpus gerados (tabela_ncm_completa, nbs_completa) no TiDB.
 * Lê os .ts gerados, extrai os arrays, e insere em ragDocuments.
 * cnaeGroups = '' (universal — NCM/NBS são tabelas de referência, não setoriais).
 *
 * PRÉ-REQUISITO: ALTER TABLE para adicionar tabela_ncm_completa e nbs_completa ao ENUM lei.
 *
 * USO: node scripts/ingest-onda3-ncm-nbs.mjs [--dry-run]
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
      cnaeGroups: "", // UNIVERSAL — tabelas de referência
      chunkIndex: parseInt(m[7], 10),
    });
  }
  return entries;
}

async function main() {
  console.log("[ingest-onda3-ncm-nbs] Parsing corpus files...");

  const ncmEntries = parseCorpusTs(resolve(root, "server/rag-corpus-ncm.ts"));
  console.log(`  tabela_ncm_completa: ${ncmEntries.length} chunks parsed`);

  const nbsEntries = parseCorpusTs(resolve(root, "server/rag-corpus-nbs.ts"));
  console.log(`  nbs_completa: ${nbsEntries.length} chunks parsed`);

  if (ncmEntries.length === 0) {
    throw new Error("NCM corpus vazio — regex não bateu. Verificar formato do .ts.");
  }
  if (nbsEntries.length === 0) {
    throw new Error("NBS corpus vazio — regex não bateu. Verificar formato do .ts.");
  }

  if (isDryRun) {
    console.log("[DRY RUN] Nenhuma escrita no banco.");
    console.log(`  Total: ${ncmEntries.length + nbsEntries.length} chunks`);
    process.exit(0);
  }

  const conn = await createConnection(process.env.DATABASE_URL);

  // Clean existing (idempotent)
  console.log("[ingest] Limpando chunks antigos (se houver)...");
  await conn.query("DELETE FROM ragDocuments WHERE lei = 'tabela_ncm_completa'");
  await conn.query("DELETE FROM ragDocuments WHERE lei = 'nbs_completa'");

  // Insert NCM in batches of 500
  console.log(`[ingest] Inserindo ${ncmEntries.length} chunks NCM...`);
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < ncmEntries.length; i += BATCH_SIZE) {
    const batch = ncmEntries.slice(i, i + BATCH_SIZE);
    const values = batch.map((e) => [
      e.lei, e.artigo, e.titulo, e.conteudo, e.topicos, e.cnaeGroups, e.chunkIndex,
    ]);
    await conn.query(
      `INSERT INTO ragDocuments (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex)
       VALUES ?`,
      [values]
    );
    inserted += batch.length;
    if (inserted % 2000 === 0 || inserted === ncmEntries.length) {
      console.log(`  NCM: ${inserted}/${ncmEntries.length}`);
    }
  }

  // Insert NBS in batches of 500
  console.log(`[ingest] Inserindo ${nbsEntries.length} chunks NBS...`);
  inserted = 0;
  for (let i = 0; i < nbsEntries.length; i += BATCH_SIZE) {
    const batch = nbsEntries.slice(i, i + BATCH_SIZE);
    const values = batch.map((e) => [
      e.lei, e.artigo, e.titulo, e.conteudo, e.topicos, e.cnaeGroups, e.chunkIndex,
    ]);
    await conn.query(
      `INSERT INTO ragDocuments (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex)
       VALUES ?`,
      [values]
    );
    inserted += batch.length;
    if (inserted % 500 === 0 || inserted === nbsEntries.length) {
      console.log(`  NBS: ${inserted}/${nbsEntries.length}`);
    }
  }

  // Verify
  const [verify] = await conn.query(
    `SELECT lei, COUNT(*) as chunks FROM ragDocuments WHERE lei IN ('tabela_ncm_completa', 'nbs_completa') GROUP BY lei`
  );
  console.log("\n[ingest] Verificação pós-ingestão:");
  for (const r of verify) {
    console.log(`  ${r.lei}: ${r.chunks} chunks`);
  }

  const [total] = await conn.query("SELECT COUNT(*) as total FROM ragDocuments");
  console.log(`\n[ingest] Total corpus: ${total[0].total} chunks`);

  await conn.end();
  console.log("\n[ingest] CONCLUÍDO com sucesso.");
}

main().catch((err) => {
  console.error("[ingest] ERRO:", err);
  process.exit(1);
});
