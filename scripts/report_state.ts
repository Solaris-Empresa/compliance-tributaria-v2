import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  // Q1: Gaps SOLARIS por projeto
  const [gaps] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT project_id, source, COUNT(*) as total_gaps
     FROM project_gaps_v3
     WHERE source = 'solaris'
     GROUP BY project_id, source`
  );
  
  // Q2: Riscos SOLARIS (pós-merge — deve ser > 0 se pipeline funcionou)
  const [risks] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT project_id, fonte_risco, COUNT(*) as total_riscos
     FROM project_risks_v3
     WHERE project_id IN (
       SELECT DISTINCT project_id FROM project_gaps_v3 WHERE source = 'solaris'
     )
     GROUP BY project_id, fonte_risco`
  );
  
  // Q3: Briefings
  const [briefings] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) as total_briefings
     FROM project_briefings_v3
     WHERE project_id IN (
       SELECT DISTINCT project_id FROM project_gaps_v3 WHERE source = 'solaris'
     )`
  );
  
  // Q4: Status dos projetos SOLARIS
  const [statuses] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT id, status
     FROM projects
     WHERE id IN (
       SELECT DISTINCT project_id FROM project_gaps_v3 WHERE source = 'solaris'
     )`
  );

  console.log('=== GAPS SOLARIS ===');
  console.log(JSON.stringify(gaps, null, 2));
  console.log('=== RISCOS SOLARIS (pós-merge G17-B) ===');
  console.log(JSON.stringify(risks, null, 2));
  console.log('=== BRIEFINGS ===');
  console.log(JSON.stringify(briefings, null, 2));
  console.log('=== STATUS PROJETOS ===');
  console.log(JSON.stringify(statuses, null, 2));
  
  await conn.end();
}

main().catch(console.error);
