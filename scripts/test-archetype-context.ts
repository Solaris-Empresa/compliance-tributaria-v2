import { getArchetypeContext } from "../server/lib/product-questions";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.query("SELECT archetype FROM projects WHERE id = 4110001");
  const row = (rows as any[])[0];
  if (!row?.archetype) {
    console.log("NO ARCHETYPE DATA for project #4110001");
    await conn.end();
    return;
  }
  const archetype = typeof row.archetype === 'string' ? JSON.parse(row.archetype) : row.archetype;
  console.log("=== RAW ARCHETYPE KEYS ===");
  console.log(Object.keys(archetype));
  console.log("\n=== getArchetypeContext OUTPUT ===");
  const result = getArchetypeContext(archetype);
  console.log(`"${result}"`);
  console.log(`\nLength: ${result.length}`);
  console.log(`Empty: ${result === ""}`);
  await conn.end();
}
main();
