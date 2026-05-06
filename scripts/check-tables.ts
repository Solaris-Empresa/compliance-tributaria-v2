import mysql from 'mysql2/promise';
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [t1] = await conn.execute("SHOW TABLES LIKE '%perfil%'");
  console.log('Tables with perfil:', JSON.stringify(t1));
  const [t2] = await conn.execute("SHOW TABLES LIKE '%snapshot%'");
  console.log('Tables with snapshot:', JSON.stringify(t2));
  // Also check if the archetype column has a 'perfil' sub-object
  const [rows] = await conn.execute('SELECT archetype FROM projects WHERE id = 4110001');
  const row = (rows as any)[0];
  const arch = typeof row.archetype === 'string' ? JSON.parse(row.archetype) : row.archetype;
  console.log('archetype has perfil key:', 'perfil' in arch);
  console.log('archetype has snapshot key:', 'snapshot' in arch);
  // Check if there's a mapping function somewhere
  await conn.end();
}
main().catch(console.error);
