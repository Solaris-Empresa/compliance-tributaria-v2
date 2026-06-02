/**
 * Ingestão Onda 1 — CGIBS 4 + CGIBS 5
 * Uso: node server/rag-ingest-onda1.mjs [--dry-run]
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Transpile TS on-the-fly
const { register } = await import('node:module');

// Use tsx to load TS files
const { RAG_CORPUS_RESOLUCAO_CGIBS_4 } = await import('./rag-corpus-resolucao-cgibs4.ts');
const { RAG_CORPUS_RESOLUCAO_CGIBS_5 } = await import('./rag-corpus-resolucao-cgibs5.ts');

const DRY_RUN = process.argv.includes('--dry-run');

const datasets = [
  { lei: 'resolucao_cgibs_4', data: RAG_CORPUS_RESOLUCAO_CGIBS_4, idStart: 190001 },
  { lei: 'resolucao_cgibs_5', data: RAG_CORPUS_RESOLUCAO_CGIBS_5, idStart: 191001 },
];

if (DRY_RUN) {
  console.log('=== DRY-RUN MODE ===');
  for (const ds of datasets) {
    console.log(`${ds.lei}: ${ds.data.length} chunks (IDs ${ds.idStart}–${ds.idStart + ds.data.length - 1})`);
  }
  const total = datasets.reduce((s, d) => s + d.data.length, 0);
  console.log(`\nTotal: ${total} chunks seriam inseridos.`);
  process.exit(0);
}

// Real ingest
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida');
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);
const BATCH_SIZE = 50;
const AUTOR = 'ingestao-onda1-sprint-p0';
const DATA_REVISAO = '2026-05-14';

let totalInserted = 0;

for (const ds of datasets) {
  console.log(`\n📥 Inserindo ${ds.lei} (${ds.data.length} chunks)...`);
  let inserted = 0;

  for (let i = 0; i < ds.data.length; i += BATCH_SIZE) {
    const batch = ds.data.slice(i, i + BATCH_SIZE);
    const values = batch.map((entry, idx) => [
      ds.idStart + i + idx,       // id
      entry.lei,                   // lei
      entry.artigo,                // artigo
      entry.titulo,                // titulo
      entry.conteudo,              // conteudo
      entry.topicos,               // topicos
      entry.cnaeGroups,            // cnaeGroups
      entry.chunkIndex,            // chunkIndex
      `${ds.lei}::${entry.artigo}::${entry.chunkIndex}`, // anchor_id
      AUTOR,                       // autor
      DATA_REVISAO,                // data_revisao
    ]);

    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',\n');
    const flat = values.flat();

    await conn.execute(
      `INSERT INTO ragDocuments (id, lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex, anchor_id, autor, data_revisao)
       VALUES ${placeholders}`,
      flat
    );
    inserted += batch.length;
  }

  console.log(`✅ ${ds.lei}: ${inserted} chunks inseridos (IDs ${ds.idStart}–${ds.idStart + inserted - 1})`);
  totalInserted += inserted;
}

console.log(`\n🎉 Total inserido: ${totalInserted} chunks`);
await conn.end();
