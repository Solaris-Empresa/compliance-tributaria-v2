import mysql from "mysql2/promise";
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT codigo, titulo, topicos, ativo FROM solaris_questions ORDER BY codigo`
  );
  console.log("=== TODAS as perguntas (incluindo soft-deleted) ===");
  for (const row of rows) {
    const status = row.ativo ? "✅ ATIVO" : "❌ soft-deleted";
    console.log(`${row.codigo} [${status}]: ${row.topicos || "(sem tópicos)"}`);
    console.log(`  ${row.titulo}`);
  }
  await conn.end();
}
main().catch(e => { console.error(e); process.exit(1); });
