/**
 * V66 — Script de Ingestão do Corpus RAG Expandido
 *
 * Lê diretamente do rag-corpus.ts via tsx e insere no banco.
 * Uso: node server/rag-ingest.mjs [--force]
 *
 * --force: limpa a tabela antes de reinserir
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

// Gerar JSON do corpus via tsx (transpila o TS em tempo real)
const tmpFile = join(__dirname, "_corpus_dump.json");
try {
  execSync(
    `cd ${join(__dirname, "..")} && npx tsx -e "import { RAG_CORPUS } from './server/rag-corpus.ts'; import { writeFileSync } from 'fs'; writeFileSync('${tmpFile}', JSON.stringify(RAG_CORPUS))"`,
    { stdio: "pipe" }
  );
} catch (e) {
  console.error("Erro ao transpilhar rag-corpus.ts:", e.message);
  process.exit(1);
}

const RAG_CORPUS = JSON.parse(
  (await import("fs")).default.readFileSync(tmpFile, "utf-8")
);
unlinkSync(tmpFile);

console.log(`Corpus carregado: ${RAG_CORPUS.length} artigos.`);

const db = await createConnection(process.env.DATABASE_URL);
console.log("Conectando ao banco...");

// Verificar registros existentes
const [rows] = await db.execute("SELECT COUNT(*) as count FROM ragDocuments");
const count = rows[0].count;
console.log(`Tabela ragDocuments contém ${count} registros.`);

if (count > 0 && !force) {
  console.log("Use --force para reinserir. Saindo.");
  await db.end();
  process.exit(0);
}

if (force && count > 0) {
  console.log("--force detectado. Limpando tabela...");
  await db.execute("DELETE FROM ragDocuments");
}

console.log(`Inserindo ${RAG_CORPUS.length} chunks...`);
let inserted = 0;

for (const entry of RAG_CORPUS) {
  const id = `${entry.lei}-${entry.artigo.replace(/[^a-zA-Z0-9]/g, "-")}-${entry.chunkIndex}`;
  await db.execute(
    `INSERT INTO ragDocuments (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
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
  if (inserted % 10 === 0) {
    console.log(`  ${inserted}/${RAG_CORPUS.length} inseridos...`);
  }
}

console.log(`✅ Ingestão concluída: ${inserted} chunks inseridos na tabela ragDocuments.`);
await db.end();
