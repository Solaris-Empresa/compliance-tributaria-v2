import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

async function q(label, sql) {
  try {
    const [rows] = await conn.execute(sql);
    console.log(`${label}: ${rows[0]?.total ?? JSON.stringify(rows[0])}`);
  } catch(e) {
    console.log(`${label} ERROR: ${e.message}`);
  }
}

// RAG
await q('ragDocuments COUNT', 'SELECT COUNT(*) as total FROM ragDocuments');
await q('ragDocuments com chunks', 'SELECT COUNT(*) as total FROM ragDocuments WHERE chunkCount > 0');
await q('ragDocuments total chunks (soma)', 'SELECT SUM(chunkCount) as total FROM ragDocuments');

// SOLARIS
await q('solaris_questions ativo=1', "SELECT COUNT(*) as total FROM solaris_questions WHERE ativo = 1");
await q('solaris_questions TOTAL', 'SELECT COUNT(*) as total FROM solaris_questions');
await q('solaris_answers TOTAL', 'SELECT COUNT(*) as total FROM solaris_answers');

// RISCOS
await q('project_risks_v3 COUNT', 'SELECT COUNT(*) as total FROM project_risks_v3');

// CPIE
await q('cpie_score_history COUNT', 'SELECT COUNT(*) as total FROM cpie_score_history');
await q('cpie_settings COUNT', 'SELECT COUNT(*) as total FROM cpie_settings');

await conn.end();
