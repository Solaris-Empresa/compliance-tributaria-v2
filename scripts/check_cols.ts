import mysql from 'mysql2/promise';
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute(
    `DESCRIBE project_gaps_v3`
  ) as any;
  console.log('COLUNAS:', rows.map((r: any) => `${r.Field} (${r.Type})`).join('\n'));
  await conn.end();
}
main().catch(e => console.error(e.message));
