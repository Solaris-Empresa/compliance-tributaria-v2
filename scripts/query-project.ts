import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const projectId = parseInt(process.argv[2] || '3570002');
  const db = await getDb();
  if (!db) { console.error('No DB connection'); process.exit(1); }
  
  console.log(`\n=== Querying project ${projectId} ===\n`);

  // 1. Gaps by source
  const gaps = await db.execute(sql`
    SELECT source, COUNT(*) as cnt
    FROM project_gaps_v3 
    WHERE project_id = ${projectId}
    GROUP BY source
    ORDER BY source
  `);
  console.log('GAPS by source:');
  console.table(gaps[0]);

  // 2. Risks by source_priority
  const risks = await db.execute(sql`
    SELECT source_priority, COUNT(*) as cnt
    FROM risks_v4 
    WHERE project_id = ${projectId}
    GROUP BY source_priority
    ORDER BY source_priority
  `);
  console.log('\nRISKS by source_priority:');
  console.table(risks[0]);

  // 3. Solaris answers
  const sa = await db.execute(sql`
    SELECT COUNT(*) as total, 
           SUM(CASE WHEN answer_value = 'nao' THEN 1 ELSE 0 END) as nao_count,
           SUM(CASE WHEN answer_value = 'sim' THEN 1 ELSE 0 END) as sim_count
    FROM solaris_answers WHERE project_id = ${projectId}
  `);
  console.log('\nSOLARIS_ANSWERS:');
  console.table(sa[0]);

  // 4. Iagen answers
  const ia = await db.execute(sql`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN answer_value = 'nao' THEN 1 ELSE 0 END) as nao_count,
           SUM(CASE WHEN answer_value = 'sim' THEN 1 ELSE 0 END) as sim_count
    FROM iagen_answers WHERE project_id = ${projectId}
  `);
  console.log('\nIAGEN_ANSWERS:');
  console.table(ia[0]);

  // 5. Service answers (NBS)
  const svc = await db.execute(sql`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN answer_value = 'nao' THEN 1 ELSE 0 END) as nao_count,
           SUM(CASE WHEN answer_value = 'sim' THEN 1 ELSE 0 END) as sim_count
    FROM service_answers WHERE project_id = ${projectId}
  `);
  console.log('\nSERVICE_ANSWERS (NBS):');
  console.table(svc[0]);

  // 6. Check if gaps have answer_value populated
  const gapDetails = await db.execute(sql`
    SELECT source, requirement_id, answer_value, fonte_ref
    FROM project_gaps_v3 
    WHERE project_id = ${projectId}
    ORDER BY source, requirement_id
    LIMIT 30
  `);
  console.log('\nGAP DETAILS (first 30):');
  console.table(gapDetails[0]);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
