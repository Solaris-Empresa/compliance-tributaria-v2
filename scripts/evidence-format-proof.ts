import mysql from "mysql2/promise";

// DEFINITIVE TEST: The evidence column is returned as a JS object by mysql2
// (because TiDB/MySQL JSON columns are auto-parsed by the driver).
// The DoD script does JSON.parse(row.evidence || '{}') which:
// - row.evidence is an object → truthy → JSON.parse(object) → throws TypeError
// - catch {} swallows the error → fontes stays []
// 
// The inspect-evidence.ts script worked because it did:
// try { ev = JSON.parse(row.evidence); } catch { ev = row.evidence; }
// → on catch, it uses the raw object directly.

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  const [rows] = await conn.execute(
    `SELECT id, categoria, source_priority, evidence FROM risks_v4 WHERE project_id = 3780001 AND status = 'active' LIMIT 2`
  ) as any;

  for (const row of rows) {
    console.log(`\n--- ${row.categoria} ---`);
    console.log("typeof row.evidence:", typeof row.evidence);
    console.log("row.evidence constructor:", row.evidence?.constructor?.name);
    console.log("Is object?", typeof row.evidence === "object");
    console.log("Has .gaps?", "gaps" in (row.evidence || {}));
    
    // What JSON.parse does with an object:
    try {
      const parsed = JSON.parse(row.evidence || '{}');
      console.log("JSON.parse succeeded:", typeof parsed);
    } catch (e: any) {
      console.log("JSON.parse FAILED:", e.message);
    }

    // Correct approach: use directly as object
    const ev = row.evidence;
    if (ev && ev.gaps && Array.isArray(ev.gaps)) {
      const fontes = [...new Set(ev.gaps.map((g: any) => g.fonte).filter(Boolean))];
      console.log("CORRECT extraction - fontes:", fontes);
    }
  }

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
