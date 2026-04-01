import mysql from "mysql2/promise";
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [cols] = await conn.query<mysql.RowDataPacket[]>(`DESCRIBE solaris_questions`);
  console.log("Colunas:", cols.map((c: mysql.RowDataPacket) => c.Field).join(", "));
  const [rows] = await conn.query<mysql.RowDataPacket[]>(`SELECT * FROM solaris_questions WHERE ativo = 1 LIMIT 2`);
  console.log("Sample row keys:", Object.keys(rows[0] || {}));
  await conn.end();
}
main().catch(e => { console.error(e); process.exit(1); });
