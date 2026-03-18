/**
 * V70 — Script de Ingestão Incremental das LCs 214, 224 e 227
 *
 * Adiciona apenas as novas entradas do rag-corpus-lcs-novas.ts ao banco.
 * NÃO apaga entradas existentes — modo incremental (upsert por ID único).
 *
 * Uso:
 *   node server/rag-ingest-lcs-novas.mjs          # insere apenas novas entradas
 *   node server/rag-ingest-lcs-novas.mjs --force  # apaga e reinserere todas as LCs novas
 *   node server/rag-ingest-lcs-novas.mjs --all    # reinserere TUDO (corpus antigo + novas)
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const force = process.argv.includes("--force");
const all = process.argv.includes("--all");

// Gerar JSON do corpus novo via tsx
const tmpFile = join(__dirname, "_corpus_lcs_novas_dump.json");
try {
  execSync(
    `cd ${join(__dirname, "..")} && npx tsx -e "import { RAG_CORPUS_LCS_NOVAS } from './server/rag-corpus-lcs-novas.ts'; import { writeFileSync } from 'fs'; writeFileSync('${tmpFile}', JSON.stringify(RAG_CORPUS_LCS_NOVAS))"`,
    { stdio: "pipe" }
  );
} catch (e) {
  console.error("Erro ao transpilhar rag-corpus-lcs-novas.ts:", e.message);
  process.exit(1);
}

const CORPUS_NOVAS = JSON.parse(
  (await import("fs")).default.readFileSync(tmpFile, "utf-8")
);
unlinkSync(tmpFile);

console.log(`\n${"=".repeat(60)}`);
console.log(`RAG Ingestão Incremental — LCs 214, 224 e 227`);
console.log(`${"=".repeat(60)}`);
console.log(`Corpus carregado: ${CORPUS_NOVAS.length} entradas`);

// Estatísticas por lei
const stats = {};
for (const e of CORPUS_NOVAS) {
  stats[e.lei] = (stats[e.lei] || 0) + 1;
}
for (const [lei, count] of Object.entries(stats)) {
  console.log(`  ${lei.toUpperCase()}: ${count} entradas`);
}

const db = await createConnection(process.env.DATABASE_URL);
console.log("\nConectando ao banco...");

// Verificar registros existentes
const [rows] = await db.execute("SELECT COUNT(*) as count FROM ragDocuments");
const totalExistente = rows[0].count;
console.log(`Tabela ragDocuments contém ${totalExistente} registros.`);

// Verificar quantos das LCs novas já existem
const [rowsLcs] = await db.execute(
  "SELECT COUNT(*) as count FROM ragDocuments WHERE lei IN ('lc214', 'lc224', 'lc227') AND artigo NOT LIKE 'Art. %-%'"
);
const existentesLcsNovas = rowsLcs[0].count;

if (force || all) {
  if (all) {
    console.log("\n--all detectado. Limpando TODA a tabela ragDocuments...");
    await db.execute("DELETE FROM ragDocuments");
    
    // Reinserir corpus completo (antigo + novo)
    const tmpAll = join(__dirname, "_corpus_all_dump.json");
    execSync(
      `cd ${join(__dirname, "..")} && npx tsx -e "import { RAG_CORPUS } from './server/rag-corpus.ts'; import { writeFileSync } from 'fs'; writeFileSync('${tmpAll}', JSON.stringify(RAG_CORPUS))"`,
      { stdio: "pipe" }
    );
    const CORPUS_ALL = JSON.parse(
      (await import("fs")).default.readFileSync(tmpAll, "utf-8")
    );
    unlinkSync(tmpAll);
    console.log(`Reinserindo corpus completo: ${CORPUS_ALL.length} entradas...`);
    await inserirCorpus(db, CORPUS_ALL);
    console.log(`\n✅ Ingestão completa: ${CORPUS_ALL.length} entradas inseridas.`);
  } else {
    console.log("\n--force detectado. Removendo entradas das LCs novas...");
    await db.execute("DELETE FROM ragDocuments WHERE lei IN ('lc214', 'lc224', 'lc227')");
    console.log(`Reinserindo ${CORPUS_NOVAS.length} entradas das LCs novas...`);
    await inserirCorpus(db, CORPUS_NOVAS);
    console.log(`\n✅ Reinserção concluída: ${CORPUS_NOVAS.length} entradas.`);
  }
} else {
  // Modo incremental: inserir apenas entradas que não existem
  console.log(`\nModo incremental: verificando entradas existentes...`);
  
  // Buscar IDs existentes das LCs novas
  const [existentes] = await db.execute(
    "SELECT CONCAT(lei, '-', artigo, '-', chunkIndex) as uid FROM ragDocuments WHERE lei IN ('lc214', 'lc224', 'lc227')"
  );
  const existentesSet = new Set(existentes.map(r => r.uid));
  
  const novas = CORPUS_NOVAS.filter(e => {
    const uid = `${e.lei}-${e.artigo}-${e.chunkIndex}`;
    return !existentesSet.has(uid);
  });
  
  console.log(`  Entradas já existentes: ${existentesSet.size}`);
  console.log(`  Novas a inserir: ${novas.length}`);
  
  if (novas.length === 0) {
    console.log("\n✅ Nenhuma entrada nova. Banco já está atualizado.");
    await db.end();
    process.exit(0);
  }
  
  await inserirCorpus(db, novas);
  console.log(`\n✅ Ingestão incremental concluída: ${novas.length} novas entradas inseridas.`);
}

// Verificar total final
const [rowsFinal] = await db.execute("SELECT COUNT(*) as count FROM ragDocuments");
console.log(`\nTotal de registros no banco: ${rowsFinal[0].count}`);

// Mostrar distribuição por lei
const [distrib] = await db.execute(
  "SELECT lei, COUNT(*) as count FROM ragDocuments GROUP BY lei ORDER BY count DESC"
);
console.log("\nDistribuição por lei:");
for (const row of distrib) {
  console.log(`  ${row.lei}: ${row.count} artigos`);
}

await db.end();

async function inserirCorpus(db, corpus) {
  let inserted = 0;
  const total = corpus.length;
  
  for (const entry of corpus) {
    await db.execute(
      `INSERT INTO ragDocuments (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), conteudo = VALUES(conteudo), topicos = VALUES(topicos)`,
      [
        entry.lei,
        entry.artigo,
        entry.titulo,
        entry.conteudo,
        entry.topicos,
        entry.cnaeGroups ?? "",
        entry.chunkIndex ?? 0,
      ]
    );
    inserted++;
    if (inserted % 50 === 0 || inserted === total) {
      process.stdout.write(`\r  Progresso: ${inserted}/${total} (${Math.round(inserted/total*100)}%)`);
    }
  }
  console.log(); // nova linha após progresso
}
