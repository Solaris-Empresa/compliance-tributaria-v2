import { getArchetypeContext } from "../server/lib/archetype/getArchetypeContext";
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
  console.log("\n=== SAMPLE VALUES ===");
  console.log("dim_objeto:", archetype.dim_objeto);
  console.log("objeto:", archetype.objeto);
  console.log("dim_papel_na_cadeia:", archetype.dim_papel_na_cadeia);
  console.log("papel_na_cadeia:", archetype.papel_na_cadeia);
  console.log("subnatureza_setorial:", archetype.subnatureza_setorial);
  console.log("orgao_regulador:", archetype.orgao_regulador);
  console.log("\n=== getArchetypeContext OUTPUT ===");
  const result = getArchetypeContext(archetype);
  console.log(`Result: "${result}"`);
  console.log(`Length: ${result.length}`);
  console.log(`Empty: ${result === ""}`);
  await conn.end();
}
main();
