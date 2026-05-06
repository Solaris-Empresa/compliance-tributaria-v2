import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { projects } from "../drizzle/schema";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  const [p] = await db.select({ archetype: projects.archetype }).from(projects).where(eq(projects.id, 4110001));
  console.log("=== TOP-LEVEL KEYS ===");
  if (p.archetype && typeof p.archetype === "object") {
    console.log(Object.keys(p.archetype));
    const arch = p.archetype as any;
    console.log("\n=== KEY FIELDS ===");
    console.log("Has 'objeto':", "objeto" in arch);
    console.log("Has 'dim_objeto':", "dim_objeto" in arch);
    console.log("Has 'papel_na_cadeia':", "papel_na_cadeia" in arch);
    console.log("Has 'dim_papel_na_cadeia':", "dim_papel_na_cadeia" in arch);
    console.log("\n=== VALUES ===");
    console.log("objeto:", arch.objeto);
    console.log("dim_objeto:", arch.dim_objeto);
    console.log("papel_na_cadeia:", arch.papel_na_cadeia);
    console.log("dim_papel_na_cadeia:", arch.dim_papel_na_cadeia);
    console.log("territorio:", arch.territorio);
    console.log("dim_territorio:", arch.dim_territorio);
    console.log("regime:", arch.regime);
    console.log("dim_regime:", arch.dim_regime);
    console.log("derived_legacy_operation_type:", arch.derived_legacy_operation_type);
  } else {
    console.log("archetype is NULL or not object:", p.archetype);
  }
  await conn.end();
}
main();
