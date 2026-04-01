import mysql from 'mysql2/promise';
async function main() {
  console.log('Conectando...');
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute('SELECT 1 as ping') as any;
  console.log('PING:', (rows as any[])[0].ping);
  await conn.end();
  console.log('OK');
}
main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
