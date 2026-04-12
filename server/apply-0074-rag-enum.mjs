/**
 * Aplica migration 0074 — adiciona resolucao_cgibs_1/2/3 ao ENUM lei de ragDocuments.
 * Uso: node server/apply-0074-rag-enum.mjs
 */
import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const conn = await createConnection(process.env.DATABASE_URL);

const sql = readFileSync(
  join(__dirname, '../drizzle/0074_ragdocuments_lei_enum_cgibs.sql'),
  'utf-8'
);

// Extrair apenas o ALTER TABLE (ignorar comentários)
const stmt = sql
  .split('\n')
  .filter(l => !l.trim().startsWith('--') && l.trim().length > 0)
  .join('\n')
  .trim();

console.log('Aplicando migration 0074...');
await conn.execute(stmt);
console.log('✅ Migration 0074 aplicada — ENUM lei atualizado com resolucao_cgibs_1/2/3.');

// Verificar resultado
const [rows] = await conn.query("SHOW COLUMNS FROM ragDocuments LIKE 'lei'");
console.log('\nColuna lei após migration:');
console.log(rows[0].Type);

await conn.end();
