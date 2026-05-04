import mysql from 'mysql2/promise';

async function main() {
  const pool = mysql.createPool(process.env.DATABASE_URL);
  
  // Check if the answers reference questions that exist in solaris_questions with ativo=1
  const [answers] = await pool.query(
    `SELECT sa.question_id, sq.codigo, sq.ativo 
     FROM solaris_answers sa 
     LEFT JOIN solaris_questions sq ON sq.id = sa.question_id 
     WHERE sa.project_id = 3480001`
  );
  
  let nullCount = 0;
  let inactiveCount = 0;
  let activeCount = 0;
  for (const a of answers) {
    if (a.codigo === null || a.codigo === undefined) nullCount++;
    else if (a.ativo !== 1) inactiveCount++;
    else activeCount++;
  }
  
  console.log('=== Answer → Question mapping ===');
  console.log('Total answers:', answers.length);
  console.log('With valid question (ativo=1):', activeCount);
  console.log('Question not found (null join):', nullCount);
  console.log('Question inactive:', inactiveCount);
  
  const uniqueQids = new Set(answers.map(a => a.question_id));
  console.log('Unique question_ids:', uniqueQids.size);
  
  // Now simulate what analyzeSolarisAnswers would do
  const [rows] = await pool.query(
    `SELECT sa.resposta, sq.topicos, sq.codigo
     FROM solaris_answers sa
     LEFT JOIN solaris_questions sq ON sq.id = sa.question_id
     WHERE sa.project_id = 3480001 AND sq.ativo = 1`
  );
  
  console.log('\n=== Simulating analyzeSolarisAnswers ===');
  console.log('Rows returned by query (ativo=1):', rows.length);
  
  if (rows.length === 0) {
    console.log('PROBLEM: Query returns 0 rows! analyzeSolarisAnswers exits early.');
    
    // Debug: check without ativo filter
    const [allRows] = await pool.query(
      `SELECT sa.resposta, sq.topicos, sq.codigo, sq.ativo
       FROM solaris_answers sa
       LEFT JOIN solaris_questions sq ON sq.id = sa.question_id
       WHERE sa.project_id = 3480001`
    );
    console.log('\nWithout ativo filter:', allRows.length, 'rows');
    for (const r of allRows.slice(0, 3)) {
      console.log('  codigo=' + r.codigo + ' | ativo=' + r.ativo + ' | topicos=' + r.topicos);
    }
  }
  
  await pool.end();
}

main().catch(e => console.error('ERR:', e.message));
