// Z-06 Cleanup — Execução via mysql2
// Autorizado pelo P.O. Uires Tapajós em 2026-04-07
// HEAD: edc32ef

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const url = process.env.DATABASE_URL;
// Parse: mysql://user:pass@host:port/dbname?ssl=...
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!match) throw new Error('DATABASE_URL parse failed: ' + url.substring(0, 50));

const [, user, password, host, port, database] = match;

const conn = await createConnection({
  host,
  port: parseInt(port),
  user,
  password,
  database,
  ssl: { rejectUnauthorized: true },
});

console.log('✅ Conectado ao TiDB Cloud\n');

async function query(sql, label) {
  const [rows] = await conn.execute(sql);
  if (label) console.log(`--- ${label} ---`);
  console.log(rows);
  console.log('');
  return rows;
}

// ─── PASSO 1: Contagens antes ────────────────────────────────────────────────
console.log('═══════════════════════════════════════');
console.log('PASSO 1 — Contagens ANTES dos DELETEs');
console.log('═══════════════════════════════════════\n');

await query(`
  SELECT 'projects' as tabela,
    COUNT(*) as total,
    COUNT(CASE WHEN name LIKE '%Teste%' OR name LIKE '%teste%'
               OR name LIKE '%GATE%' OR name LIKE '%E2E%'
               OR name LIKE '%seed%' OR name LIKE '%Seed%'
               THEN 1 END) as candidatos_limpeza
  FROM projects
`, 'projects');

await query(`SELECT 'project_gaps_v3' as tabela, COUNT(*) as total FROM project_gaps_v3`, 'project_gaps_v3');
await query(`SELECT 'project_risks_v3' as tabela, COUNT(*) as total FROM project_risks_v3`, 'project_risks_v3');
await query(`SELECT 'solaris_answers' as tabela, COUNT(*) as total FROM solaris_answers`, 'solaris_answers');
await query(`SELECT 'iagen_answers' as tabela, COUNT(*) as total FROM iagen_answers`, 'iagen_answers');
await query(`SELECT 'briefings' as tabela, COUNT(*) as total FROM briefings`, 'briefings');
// action_plans nao existe — tabela real e actionPlans
await query(`SELECT 'actionPlans' as tabela, COUNT(*) as total FROM actionPlans`, 'actionPlans');

// ─── PASSO 2: Listar projetos ─────────────────────────────────────────────────
console.log('═══════════════════════════════════════');
console.log('PASSO 2 — Lista completa de projetos');
console.log('═══════════════════════════════════════\n');

const projetos = await query(`
  SELECT id, name, status, createdAt
  FROM projects
  ORDER BY id DESC
`, 'todos os projetos');

// ─── PASSO 2: DELETEs nas tabelas dependentes ─────────────────────────────────
console.log('═══════════════════════════════════════');
console.log('PASSO 2 — DELETEs (tabelas dependentes + projects)');
console.log('═══════════════════════════════════════\n');

// actionPlans usa projectId (camelCase)
const [r1] = await conn.execute(`DELETE FROM actionPlans WHERE projectId IN (SELECT id FROM projects)`);
console.log(`actionPlans deletados: ${r1.affectedRows}`);

const [r2] = await conn.execute(`DELETE FROM briefings WHERE projectId IN (SELECT id FROM projects)`);
console.log(`briefings deletados: ${r2.affectedRows}`);

const [r3] = await conn.execute(`DELETE FROM project_risks_v3 WHERE project_id IN (SELECT id FROM projects)`);
console.log(`project_risks_v3 deletados: ${r3.affectedRows}`);

const [r4] = await conn.execute(`DELETE FROM project_gaps_v3 WHERE project_id IN (SELECT id FROM projects)`);
console.log(`project_gaps_v3 deletados: ${r4.affectedRows}`);

const [r5] = await conn.execute(`DELETE FROM iagen_answers WHERE project_id IN (SELECT id FROM projects)`);
console.log(`iagen_answers deletados: ${r5.affectedRows}`);

const [r6] = await conn.execute(`DELETE FROM solaris_answers WHERE project_id IN (SELECT id FROM projects)`);
console.log(`solaris_answers deletados: ${r6.affectedRows}`);

const [r7] = await conn.execute(`DELETE FROM projects`);
console.log(`projects deletados: ${r7.affectedRows}`);

console.log('');

// ─── PASSO 3: Limpar órfãos ───────────────────────────────────────────────────
console.log('═══════════════════════════════════════');
console.log('PASSO 3 — Limpar órfãos remanescentes');
console.log('═══════════════════════════════════════\n');

const [o1] = await conn.execute(`DELETE FROM project_gaps_v3 WHERE project_id NOT IN (SELECT id FROM projects)`);
console.log(`project_gaps_v3 órfãos: ${o1.affectedRows}`);

const [o2] = await conn.execute(`DELETE FROM project_risks_v3 WHERE project_id NOT IN (SELECT id FROM projects)`);
console.log(`project_risks_v3 órfãos: ${o2.affectedRows}`);

const [o3] = await conn.execute(`DELETE FROM solaris_answers WHERE project_id NOT IN (SELECT id FROM projects)`);
console.log(`solaris_answers órfãos: ${o3.affectedRows}`);

const [o4] = await conn.execute(`DELETE FROM iagen_answers WHERE project_id NOT IN (SELECT id FROM projects)`);
console.log(`iagen_answers órfãos: ${o4.affectedRows}`);

const [o5] = await conn.execute(`DELETE FROM briefings WHERE projectId NOT IN (SELECT id FROM projects)`);
console.log(`briefings órfãos: ${o5.affectedRows}`);

const [o6] = await conn.execute(`DELETE FROM actionPlans WHERE projectId NOT IN (SELECT id FROM projects)`);
console.log(`actionPlans órfãos: ${o6.affectedRows}`);

console.log('');

// ─── PASSO 4: Confirmar RAG preservado ───────────────────────────────────────
console.log('═══════════════════════════════════════');
console.log('PASSO 4 — Confirmar RAG preservado');
console.log('═══════════════════════════════════════\n');

const [[ragRow]] = await conn.execute(`SELECT COUNT(*) as rag_chunks FROM ragDocuments`);
const [[sqRow]] = await conn.execute(`SELECT COUNT(*) as solaris_questoes FROM solaris_questions`);
const [[cnaeRow]] = await conn.execute(`SELECT COUNT(*) as cnaes FROM cnaes`);

console.log(`rag_chunks:       ${ragRow.rag_chunks}  (esperado >= 2509)`);
console.log(`solaris_questoes: ${sqRow.solaris_questoes}  (esperado >= 24)`);
console.log(`cnaes:            ${cnaeRow.cnaes}  (esperado > 0)`);

const ragOK = ragRow.rag_chunks >= 2509;
const sqOK = sqRow.solaris_questoes >= 24;
const cnaeOK = cnaeRow.cnaes > 0;
console.log(`\nRAG preservado: ${ragOK && sqOK && cnaeOK ? '✅ SIM' : '❌ FALHA'}`);
console.log('');

// ─── PASSO 5: Confirmar banco limpo ──────────────────────────────────────────
console.log('═══════════════════════════════════════');
console.log('PASSO 5 — Confirmar banco limpo (todos = 0)');
console.log('═══════════════════════════════════════\n');

await query(`
  SELECT 'projects'        as tabela, COUNT(*) as total FROM projects
  UNION ALL
  SELECT 'project_gaps_v3',           COUNT(*) FROM project_gaps_v3
  UNION ALL
  SELECT 'project_risks_v3',          COUNT(*) FROM project_risks_v3
  UNION ALL
  SELECT 'solaris_answers',           COUNT(*) FROM solaris_answers
  UNION ALL
  SELECT 'iagen_answers',             COUNT(*) FROM iagen_answers
  UNION ALL
  SELECT 'briefings',                COUNT(*) FROM briefings
  UNION ALL
  SELECT 'actionPlans',             COUNT(*) FROM actionPlans
`, 'contagens finais (esperado: todos = 0)');

await conn.end();
console.log('✅ Z-06 Cleanup concluído');
