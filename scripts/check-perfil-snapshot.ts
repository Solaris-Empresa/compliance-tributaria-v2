import mysql from 'mysql2/promise';
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  // Check if there's a separate perfil_entidade or snapshot table
  const [tables] = await conn.execute("SHOW TABLES LIKE '%perfil%'");
  console.log('Tables with perfil:', tables);
  const [tables2] = await conn.execute("SHOW TABLES LIKE '%snapshot%'");
  console.log('Tables with snapshot:', tables2);
  const [tables3] = await conn.execute("SHOW TABLES LIKE '%archetype%'");
  console.log('Tables with archetype:', tables3);
  await conn.end();
}
main().catch(console.error);
