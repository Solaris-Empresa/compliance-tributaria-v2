/**
 * rag-ingest-onda1-nts.mjs — Onda 1 Fases 3-4
 *
 * Ingere as 2 NTs no banco de produção:
 *   - NT 2025.002 v1.36 (NF-e IBS/CBS/IS) → lei = nt_2025_002 (IDs 200001+)
 *   - NT 008/2026 (DANFSe)                → lei = nt_008_2026 (IDs 201001+)
 *
 * Uso:
 *   node server/rag-ingest-onda1-nts.mjs --dry-run   # conta chunks sem inserir
 *   node server/rag-ingest-onda1-nts.mjs              # executa ingestão real
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });
const isDryRun = process.argv.includes("--dry-run");

const CORPORA = [
  {
    lei: "nt_2025_002",
    label: "NT 2025.002 v1.36",
    exportName: "RAG_CORPUS_NT_2025_002",
    importPath: "./server/rag-corpus-nt2025002.ts",
    idBase: 200001,
  },
  {
    lei: "nt_008_2026",
    label: "NT 008/2026",
    exportName: "RAG_CORPUS_NT_008_2026",
    importPath: "./server/rag-corpus-nt008-2026.ts",
    idBase: 201001,
  },
];

const AUTOR = "onda1-fases3-4-sprint-p0-ingest";
const DATA_REVISAO = "2026-05-14";

async function main() {
  // Load corpus data via tsx transpilation (same pattern as rag-ingest-p0.mjs)
  const allCorpora = [];
  for (const corpus of CORPORA) {
    const tmpFile = join(__dirname, `_tmp_${corpus.lei}.json`);
    try {
      execSync(
        `cd ${join(__dirname, "..")} && npx tsx -e "import { ${corpus.exportName} } from '${corpus.importPath}'; import { writeFileSync } from 'fs'; writeFileSync('${tmpFile}', JSON.stringify(${corpus.exportName}))"`,
        { stdio: "pipe" }
      );
      const data = JSON.parse(readFileSync(tmpFile, "utf-8"));
      allCorpora.push({ ...corpus, data });
      console.log(`${corpus.label}: ${data.length} chunks (IDs ${corpus.idBase}–${corpus.idBase + data.length - 1})`);
    } finally {
      try { unlinkSync(tmpFile); } catch {}
    }
  }

  const totalChunks = allCorpora.reduce((s, c) => s + c.data.length, 0);
  console.log(`Total: ${totalChunks} chunks`);

  if (isDryRun) {
    console.log("\n[DRY-RUN] Nenhum INSERT executado.");
    return;
  }

  // Connect to DB
  const conn = await createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  let inserted = 0;
  let errors = 0;

  for (const corpus of allCorpora) {
    console.log(`\nInserindo ${corpus.label}...`);
    for (let i = 0; i < corpus.data.length; i++) {
      const e = corpus.data[i];
      const id = corpus.idBase + i;
      const anchorId = `${e.lei}_${(e.artigo || "").replace(/\s+/g, "_")}`;
      try {
        await conn.execute(
          `INSERT INTO ragDocuments (id, lei, artigo, titulo, conteudo, topicos, cnaeGroups, anchor_id, autor, data_revisao)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, e.lei, e.artigo, e.titulo, e.conteudo, e.topicos, e.cnaeGroups || "", anchorId, AUTOR, DATA_REVISAO]
        );
        inserted++;
      } catch (err) {
        console.error(`  [ERRO] id=${id} lei=${e.lei}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\n✅ Inseridos: ${inserted}/${totalChunks} | ❌ Erros: ${errors}`);
  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
