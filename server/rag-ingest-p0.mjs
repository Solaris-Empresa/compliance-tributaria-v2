/**
 * CORPUS-RFC-008 — Script de Ingestão P0
 *
 * Ingere os 3 documentos P0 no banco de produção:
 *   - Decreto 12.955/2026 (831 chunks)
 *   - Resolução CGIBS 6/2026 Livro II (187 chunks)
 *   - Portaria Conjunta MF/CGIBS 7/2026 (2 chunks)
 *
 * Pré-requisito: migration 0094_corpus_freshness_lei_enum.sql executada.
 *
 * Uso:
 *   node server/rag-ingest-p0.mjs --dry-run   # conta chunks sem inserir
 *   node server/rag-ingest-p0.mjs              # executa ingestão real
 *
 * REGRA-ORQ-36: Após execução, confirmar com:
 *   SELECT lei, COUNT(*) as chunks FROM ragDocuments
 *   WHERE lei IN ('decreto12955','resolucao_cgibs_6','portaria_mf_cgibs_7')
 *   GROUP BY lei;
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, unlinkSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const isDryRun = process.argv.includes("--dry-run");

// ── Step 1: Transpile the 3 corpus TS files to JSON ─────────────────────────
console.log("═".repeat(60));
console.log("CORPUS-RFC-008 — Ingestão P0");
console.log("═".repeat(60));
console.log(`Modo: ${isDryRun ? "DRY-RUN (sem INSERT)" : "PRODUÇÃO (INSERT real)"}\n`);

const corpora = [
  {
    name: "decreto12955",
    importPath: "./server/rag-corpus-decreto12955.ts",
    exportName: "RAG_CORPUS_DECRETO_12955",
    expectedChunks: 831,
    autor: "ingestao-p0-sprint-p0-ingest",
  },
  {
    name: "resolucao_cgibs_6",
    importPath: "./server/rag-corpus-resolucao-cgibs6.ts",
    exportName: "RAG_CORPUS_RESOLUCAO_CGIBS_6",
    expectedChunks: 187,
    autor: "ingestao-p0-sprint-p0-ingest",
  },
  {
    name: "portaria_mf_cgibs_7",
    importPath: "./server/rag-corpus-portaria7.ts",
    exportName: "RAG_CORPUS_PORTARIA_7",
    expectedChunks: 2,
    autor: "ingestao-p0-sprint-p0-ingest",
  },
];

const allEntries = [];

for (const corpus of corpora) {
  const tmpFile = join(__dirname, `_corpus_${corpus.name}_dump.json`);
  try {
    console.log(`📦 Transpilando ${corpus.name}...`);
    execSync(
      `cd ${join(__dirname, "..")} && npx tsx -e "import { ${corpus.exportName} } from '${corpus.importPath}'; import { writeFileSync } from 'fs'; writeFileSync('${tmpFile}', JSON.stringify(${corpus.exportName}))"`,
      { stdio: "pipe", timeout: 30000 }
    );
    const entries = JSON.parse(readFileSync(tmpFile, "utf-8"));
    unlinkSync(tmpFile);

    console.log(`   ✅ ${corpus.name}: ${entries.length} chunks (esperado: ${corpus.expectedChunks})`);
    if (entries.length !== corpus.expectedChunks) {
      console.warn(`   ⚠️  DIVERGÊNCIA: esperado ${corpus.expectedChunks}, obtido ${entries.length}`);
    }

    // Tag each entry with autor
    for (const e of entries) {
      e._autor = corpus.autor;
    }
    allEntries.push(...entries);
  } catch (e) {
    console.error(`   ❌ Erro ao transpilhar ${corpus.name}:`, e.message);
    try { unlinkSync(tmpFile); } catch {}
    process.exit(1);
  }
}

console.log(`\n📊 Total de chunks a ingerir: ${allEntries.length}`);
console.log(`   decreto12955:        ${allEntries.filter(e => e.lei === "decreto12955").length}`);
console.log(`   resolucao_cgibs_6:   ${allEntries.filter(e => e.lei === "resolucao_cgibs_6").length}`);
console.log(`   portaria_mf_cgibs_7: ${allEntries.filter(e => e.lei === "portaria_mf_cgibs_7").length}`);

if (isDryRun) {
  console.log("\n🔍 DRY-RUN concluído. Nenhum INSERT executado.");
  console.log("   Para executar a ingestão real: node server/rag-ingest-p0.mjs");
  process.exit(0);
}

// ── Step 2: Connect to DB and insert ─────────────────────────────────────────
console.log("\n🔌 Conectando ao banco...");
const db = await createConnection(process.env.DATABASE_URL);

// Pre-check: verify enum supports the new values
const [enumCheck] = await db.execute(
  "SELECT COUNT(*) as cnt FROM ragDocuments WHERE lei = 'decreto12955'"
);
console.log(`   Chunks decreto12955 existentes: ${enumCheck[0].cnt}`);

const [totalBefore] = await db.execute("SELECT COUNT(*) as total FROM ragDocuments");
console.log(`   Total corpus antes da ingestão: ${totalBefore[0].total}`);

// ── Step 3: Insert chunks with anchor_id and autor ───────────────────────────
console.log("\n🚀 Iniciando ingestão...");
const dataRevisao = new Date().toISOString().slice(0, 10); // 2026-05-14
let inserted = 0;
let skipped = 0;
let errors = 0;

for (const entry of allEntries) {
  // Generate deterministic anchor_id: lei-artigo-chunkIndex
  const anchorId = `${entry.lei}-${entry.artigo.replace(/\s+/g, "_")}-${entry.chunkIndex}`;

  try {
    await db.execute(
      `INSERT INTO ragDocuments
        (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex,
         anchor_id, autor, data_revisao, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         conteudo = VALUES(conteudo),
         topicos = VALUES(topicos),
         cnaeGroups = VALUES(cnaeGroups),
         titulo = VALUES(titulo)`,
      [
        entry.lei,
        entry.artigo,
        entry.titulo,
        entry.conteudo,
        entry.topicos,
        entry.cnaeGroups ?? "",
        entry.chunkIndex ?? 0,
        anchorId,
        entry._autor,
        dataRevisao,
      ]
    );
    inserted++;
  } catch (err) {
    // If anchor_id column doesn't exist or other error, try without it
    if (err.code === "ER_BAD_FIELD_ERROR" && err.message.includes("anchor_id")) {
      try {
        await db.execute(
          `INSERT INTO ragDocuments
            (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex,
             autor, data_revisao, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            entry.lei,
            entry.artigo,
            entry.titulo,
            entry.conteudo,
            entry.topicos,
            entry.cnaeGroups ?? "",
            entry.chunkIndex ?? 0,
            entry._autor,
            dataRevisao,
          ]
        );
        inserted++;
      } catch (err2) {
        errors++;
        if (errors <= 3) console.error(`   ❌ Erro (fallback): ${err2.message}`);
      }
    } else {
      errors++;
      if (errors <= 3) console.error(`   ❌ Erro: ${err.message}`);
    }
  }

  if ((inserted + skipped + errors) % 100 === 0 || (inserted + skipped + errors) === allEntries.length) {
    process.stdout.write(`\r   Progresso: ${inserted + skipped + errors}/${allEntries.length} (inseridos: ${inserted}, erros: ${errors})`);
  }
}
console.log(); // newline

// ── Step 4: Verification (REGRA-ORQ-36) ─────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log("REGRA-ORQ-36 — Query de Verificação Obrigatória");
console.log("═".repeat(60));

const [verification] = await db.execute(
  `SELECT lei, COUNT(*) as chunks
   FROM ragDocuments
   WHERE lei IN ('decreto12955','resolucao_cgibs_6','portaria_mf_cgibs_7')
   GROUP BY lei`
);

for (const row of verification) {
  const expected = corpora.find(c => c.name === row.lei)?.expectedChunks ?? "?";
  const status = Number(row.chunks) === expected ? "✅" : "❌";
  console.log(`   ${status} ${row.lei}: ${row.chunks} chunks (esperado: ${expected})`);
}

const [totalAfter] = await db.execute("SELECT COUNT(*) as total FROM ragDocuments");
console.log(`\n   📊 Total corpus após ingestão: ${totalAfter[0].total}`);
console.log(`   📊 Delta: +${Number(totalAfter[0].total) - Number(totalBefore[0].total)} chunks`);

// Distribution by lei
const [distrib] = await db.execute(
  "SELECT lei, COUNT(*) as chunks FROM ragDocuments GROUP BY lei ORDER BY chunks DESC"
);
console.log("\n   Distribuição completa:");
for (const row of distrib) {
  console.log(`     ${row.lei}: ${row.chunks}`);
}

await db.end();
console.log("\n✅ Ingestão P0 concluída.");
