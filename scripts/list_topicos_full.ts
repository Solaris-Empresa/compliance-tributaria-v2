import mysql from "mysql2/promise";
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT codigo, titulo, topicos, categoria, severidade_base FROM solaris_questions WHERE ativo = 1 ORDER BY codigo`
  );
  console.log("\n=== Perguntas SOLARIS ativas ===\n");
  const topicoSet = new Set<string>();
  for (const row of rows) {
    const topicos = (row.topicos as string || "").split(";").map((t: string) => t.trim().toLowerCase()).filter(Boolean);
    console.log(`${row.codigo} [${row.categoria}/${row.severidade_base}]: ${topicos.join(", ")}`);
    console.log(`  Título: ${row.titulo}`);
    for (const t of topicos) topicoSet.add(t);
  }
  const sorted = [...topicoSet].sort();
  console.log(`\n=== ${sorted.length} TÓPICOS DISTINTOS ===`);
  sorted.forEach((t, i) => console.log(`  ${i+1}. "${t}"`));
  await conn.end();
}
main().catch(e => { console.error(e); process.exit(1); });
