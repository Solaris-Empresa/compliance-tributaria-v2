import mysql from '/home/ubuntu/compliance-tributaria-v2/node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise.js';

const url = process.env.DATABASE_URL || '';
const m = url.match(/mysql2?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!m) { console.error('DATABASE_URL não encontrado'); process.exit(1); }

const [, user, password, host, port, database] = m;

const conn = await mysql.createConnection({
  host, port: parseInt(port), user, password, database,
  ssl: { rejectUnauthorized: false },
  connectTimeout: 15000,
});

console.log('=== PASSO 3 — SHOW FULL COLUMNS FROM assessmentPhase1 ===');
const [cols] = await conn.query('SHOW FULL COLUMNS FROM `assessmentPhase1`');
for (const c of cols) console.log(`  ${c.Field} | ${c.Type} | Null:${c.Null} | Key:${c.Key} | Default:${c.Default}`);

console.log('\n=== PASSO 4 — SHOW CREATE TABLE assessmentPhase1 ===');
const [ct] = await conn.query('SHOW CREATE TABLE `assessmentPhase1`');
console.log(ct[0]['Create Table']);

console.log('\n=== PASSO 5 — MAX(idx) FROM __drizzle_migrations ===');
try {
  const [rows] = await conn.query('SELECT MAX(idx) as max_idx FROM `__drizzle_migrations`');
  console.log('max_idx =', rows[0].max_idx);
} catch (e) {
  console.log('Erro ao consultar __drizzle_migrations:', e.message);
}

console.log('\n=== EXTRA — Verificar se cpie_analysis_history existe no banco ===');
const [tables] = await conn.query("SHOW TABLES LIKE 'cpie_%'");
console.log('Tabelas cpie_* no banco:', tables.map(t => Object.values(t)[0]));

console.log('\n=== EXTRA — Drizzle journal: último snapshot ===');
const [jRows] = await conn.query('SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY idx DESC LIMIT 5');
for (const r of jRows) console.log(`  idx=${r.idx} hash=${String(r.hash).substring(0,20)}... created_at=${r.created_at}`);
console.log('DONE');

await conn.end();
