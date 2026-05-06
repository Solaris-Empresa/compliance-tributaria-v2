import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute('SELECT id, status FROM projects WHERE id = 4110001');
  const row = (rows as any)[0];
  console.log('Project #4110001 status:', row?.status);
  await conn.end();
}

main().catch(console.error);
