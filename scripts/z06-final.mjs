// Z-06 Cleanup — Fase final: project_status_log + DELETE projects + órfãos + verificação
// Autorizado pelo P.O. Uires Tapajós em 2026-04-07
// Estado anterior: briefings(881), project_risks_v3(95), project_gaps_v3(303),
//   iagen_answers(65), solaris_answers(250) já deletados.
// FK bloqueante: project_status_log -> projects.id

import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';

config();

const url = process.env.DATABASE_URL;
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
const [, user, password, host, port, database] = match;

const conn = await createConnection({
  host, port: parseInt(port), user, password, database,
  ssl: { rejectUnauthorized: true },
});

console.log('✅ Conectado ao TiDB Cloud\n');

// ─── Deletar project_status_log (FK bloqueante) ───────────────────────────────
console.log('═══════════════════════════════════════');
console.log('PASSO 2 (final) — project_status_log + projects');
console.log('═══════════════════════════════════════\n');

const [psl] = await conn.execute(`DELETE FROM project_status_log WHERE project_id IN (SELECT id FROM projects)`);
console.log(`project_status_log deletados: ${psl.affectedRows}`);

const [r7] = await conn.execute(`DELETE FROM projects`);
console.log(`projects deletados: ${r7.affectedRows}`);

console.log('');

// ─── PASSO 3: Limpar órfãos remanescentes ────────────────────────────────────
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

const [o7] = await conn.execute(`DELETE FROM project_status_log WHERE project_id NOT IN (SELECT id FROM projects)`);
console.log(`project_status_log órfãos: ${o7.affectedRows}`);

console.log('');

// ─── PASSO 4: Confirmar RAG preservado ───────────────────────────────────────
console.log('═══════════════════════════════════════');
console.log('PASSO 4 — Confirmar RAG preservado');
console.log('═══════════════════════════════════════\n');

const [[ragRow]]  = await conn.execute(`SELECT COUNT(*) as rag_chunks FROM ragDocuments`);
const [[sqRow]]   = await conn.execute(`SELECT COUNT(*) as solaris_questoes FROM solaris_questions`);
const [[cnaeRow]] = await conn.execute(`SELECT COUNT(*) as cnaes FROM cnaes`);

console.log(`rag_chunks:       ${ragRow.rag_chunks}  (esperado >= 2509)`);
console.log(`solaris_questoes: ${sqRow.solaris_questoes}  (esperado >= 24)`);
console.log(`cnaes:            ${cnaeRow.cnaes}  (esperado > 0)`);

const ragOK  = ragRow.rag_chunks >= 2509;
const sqOK   = sqRow.solaris_questoes >= 24;
const cnaeOK = cnaeRow.cnaes > 0;
console.log(`\nRAG preservado: ${ragOK && sqOK && cnaeOK ? '✅ SIM' : '❌ FALHA'}`);
console.log('');

// ─── PASSO 5: Confirmar banco limpo ──────────────────────────────────────────
console.log('═══════════════════════════════════════');
console.log('PASSO 5 — Confirmar banco limpo (todos = 0)');
console.log('═══════════════════════════════════════\n');

const [final] = await conn.execute(`
  SELECT 'projects'            as tabela, COUNT(*) as total FROM projects
  UNION ALL SELECT 'project_gaps_v3',     COUNT(*) FROM project_gaps_v3
  UNION ALL SELECT 'project_risks_v3',    COUNT(*) FROM project_risks_v3
  UNION ALL SELECT 'solaris_answers',     COUNT(*) FROM solaris_answers
  UNION ALL SELECT 'iagen_answers',       COUNT(*) FROM iagen_answers
  UNION ALL SELECT 'briefings',           COUNT(*) FROM briefings
  UNION ALL SELECT 'actionPlans',         COUNT(*) FROM actionPlans
  UNION ALL SELECT 'project_status_log',  COUNT(*) FROM project_status_log
`);

console.log('Contagens finais:');
final.forEach(r => console.log(`  ${r.tabela}: ${r.total}`));

const allZero = final.every(r => r.total === 0);
console.log(`\nBanco limpo: ${allZero ? '✅ SIM — todos = 0' : '❌ FALHA — verificar acima'}`);

await conn.end();
console.log('\n✅ Z-06 Cleanup concluído');
