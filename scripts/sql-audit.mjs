import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await mysql.createConnection(url);

async function q(label, sql) {
  try {
    const [rows] = await conn.execute(sql);
    console.log(`${label}: ${rows[0]?.total ?? JSON.stringify(rows[0])}`);
  } catch(e) {
    console.log(`${label} ERROR: ${e.message}`);
  }
}

await q('rag_chunks COUNT', 'SELECT COUNT(*) as total FROM rag_chunks');
await q('solaris_questions ativo=1', "SELECT COUNT(*) as total FROM solaris_questions WHERE ativo = 1");
await q('solaris_questions TOTAL', 'SELECT COUNT(*) as total FROM solaris_questions');
await q('rag_documents COUNT', 'SELECT COUNT(*) as total FROM rag_documents');
await q('project_risks_v3 COUNT', 'SELECT COUNT(*) as total FROM project_risks_v3');

await conn.end();
