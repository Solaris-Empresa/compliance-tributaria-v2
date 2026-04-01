import mysql from 'mysql2/promise';
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute(
    `SELECT project_id, source, gap_classification, COUNT(*) as total
     FROM project_gaps_v3
     WHERE project_id IN (2310001, 2370001, 2370002)
     AND source = 'solaris'
     GROUP BY project_id, source, gap_classification`
  ) as any;
  console.log('GAP_CLASSIFICATION:', JSON.stringify(rows, null, 2));
  await conn.end();
}
main().catch(e => console.error(e.message));
