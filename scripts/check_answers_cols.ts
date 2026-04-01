import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  const [cols] = await conn.execute('DESCRIBE solaris_answers');
  console.log(JSON.stringify(cols, null, 2));
  const [s] = await conn.execute('SELECT * FROM solaris_answers LIMIT 1');
  console.log('Sample:', JSON.stringify((s as any[])[0], null, 2));
  await conn.end();
}
main().catch(console.error);
