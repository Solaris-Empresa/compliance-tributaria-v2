import { createConnection } from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL!;

async function main() {
  const url = new URL(DATABASE_URL);
  const conn = await createConnection({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: true },
  });

  console.log("=== AUDIT PART 2 ===\n");

  // 3. Product answers
  const [r1] = await conn.execute(
    "SELECT product_answers FROM projects WHERE id = 4110001"
  ) as any;
  const pa = r1[0]?.product_answers;
  console.log("3. Product Answers:");
  if (pa) {
    const parsed = typeof pa === "string" ? JSON.parse(pa) : pa;
    console.log("   Status: EXIST");
    console.log("   Content:", JSON.stringify(parsed).slice(0, 500));
  } else {
    console.log("   Status: NULL — user has not filled product questionnaire yet");
  }
  console.log("");

  // 4. DoD negative criteria
  const [r2] = await conn.execute(
    "SELECT COUNT(*) as cnt FROM projects WHERE JSON_UNQUOTE(JSON_EXTRACT(operationProfile, '$.operationType')) = 'agronegocio' AND product_answers IS NULL"
  ) as any;
  console.log("4. DoD Negative (agro projects with no product_answers):");
  console.log("   Count:", r2[0].cnt);
  console.log("");

  // 5. All agro projects
  const [r3] = await conn.execute(
    "SELECT id, name, CASE WHEN product_answers IS NULL THEN 'NULL' ELSE 'HAS_DATA' END as pa_status FROM projects WHERE JSON_UNQUOTE(JSON_EXTRACT(operationProfile, '$.operationType')) = 'agronegocio'"
  ) as any;
  console.log("5. All agronegocio projects:");
  for (const row of r3) {
    console.log(`   #${row.id} "${row.name}" → product_answers: ${row.pa_status}`);
  }

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
