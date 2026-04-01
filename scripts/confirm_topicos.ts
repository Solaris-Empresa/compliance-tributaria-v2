import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // 1. Listar todas as perguntas com seus tópicos
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT codigo, enunciado, topicos FROM solaris_questions WHERE ativo = 1 ORDER BY codigo`
  );

  console.log("\n=== Perguntas SOLARIS ativas com tópicos ===\n");
  for (const row of rows) {
    const topicos = (row.topicos as string || "").split(";").map((t: string) => t.trim()).filter(Boolean);
    console.log(`${row.codigo}: ${topicos.join(", ")}`);
    console.log(`  Enunciado: ${(row.enunciado as string).substring(0, 80)}...`);
  }

  // 2. Todos os tópicos distintos ordenados
  const topicoSet = new Set<string>();
  for (const row of rows) {
    const topicos = (row.topicos as string || "").split(";").map((t: string) => t.trim().toLowerCase()).filter(Boolean);
    for (const t of topicos) topicoSet.add(t);
  }
  const sorted = [...topicoSet].sort();
  console.log(`\n=== ${sorted.length} tópicos distintos ===`);
  console.log(JSON.stringify(sorted, null, 2));

  await conn.end();
}
main().catch(e => { console.error(e); process.exit(1); });
