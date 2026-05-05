import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log("=== Tables with 'answer' in name ===");
  const [tables] = await conn.execute("SHOW TABLES LIKE '%answer%'");
  console.table(tables);

  console.log("\n=== Solaris answers for 3750060 ===");
  const [solaris] = await conn.execute(
    "SELECT COUNT(*) AS total, SUM(resposta = 'nao') AS resp_nao, SUM(resposta = 'sim') AS resp_sim FROM solaris_answers WHERE project_id = 3750060"
  );
  console.table(solaris);

  console.log("\n=== IAGEN answers for 3750060 ===");
  const [iagen] = await conn.execute(
    "SELECT COUNT(*) AS total, SUM(resposta = 'nao') AS resp_nao, SUM(resposta = 'sim') AS resp_sim FROM iagen_answers WHERE project_id = 3750060"
  );
  console.table(iagen);

  console.log("\n=== Service answers (v1 questionnaire) for 3750060 ===");
  try {
    const [svc] = await conn.execute(
      "SELECT COUNT(*) AS total, SUM(answer_value = 'nao') AS resp_nao, SUM(answer_value = 'sim') AS resp_sim, SUM(answer_value = 'parcial') AS resp_parcial FROM service_answers WHERE project_id = 3750060"
    );
    console.table(svc);
  } catch (e: any) {
    console.log("Error:", e.message);
  }

  // Check if there's a different table for v1 answers
  console.log("\n=== All tables with 'quest' or 'service' ===");
  const [tables2] = await conn.execute("SHOW TABLES LIKE '%quest%'");
  console.table(tables2);
  const [tables3] = await conn.execute("SHOW TABLES LIKE '%service%'");
  console.table(tables3);

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
