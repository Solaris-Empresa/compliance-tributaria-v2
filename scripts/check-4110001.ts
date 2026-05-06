import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute('SELECT id, `operationProfile` FROM projects WHERE id = 4110001');
  const row = (rows as any)[0];
  console.log('Project #4110001 operationProfile:');
  const op = typeof row.operationProfile === 'string' ? JSON.parse(row.operationProfile) : row.operationProfile;
  console.log(JSON.stringify(op, null, 2));
  console.log('---');
  console.log('operationType:', op?.operationType);
  console.log('principaisProdutos:', JSON.stringify(op?.principaisProdutos, null, 2));
  await conn.end();
}

main().catch(console.error);
