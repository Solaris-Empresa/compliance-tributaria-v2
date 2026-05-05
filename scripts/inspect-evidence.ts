import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // Inspect evidence format for project #3780001
  const [rows] = await conn.execute(
    `SELECT id, categoria, source_priority, evidence FROM risks_v4 WHERE project_id = 3780001 AND status = 'active' LIMIT 3`
  ) as any;

  for (const row of rows) {
    console.log("--- RISK:", row.id, row.categoria, row.source_priority, "---");
    let ev: any;
    try { ev = JSON.parse(row.evidence); } catch { ev = row.evidence; }

    if (ev && ev.gaps) {
      console.log("evidence.gaps length:", ev.gaps.length);
      console.log("First gap keys:", Object.keys(ev.gaps[0] || {}));
      console.log("First gap fonte:", JSON.stringify(ev.gaps[0]?.fonte));
      console.log("First 2 gaps:", JSON.stringify(ev.gaps.slice(0, 2), null, 2));
    } else if (Array.isArray(ev)) {
      console.log("evidence is ARRAY (legado), length:", ev.length);
      console.log("First item keys:", Object.keys(ev[0] || {}));
      console.log("First item:", JSON.stringify(ev[0], null, 2));
    } else {
      console.log("evidence type:", typeof ev);
      console.log("evidence preview:", JSON.stringify(ev).substring(0, 500));
    }
  }

  // Also check project #3570002 (retrigger project)
  console.log("\n\n=== PROJECT #3570002 ===");
  const [rows2] = await conn.execute(
    `SELECT id, categoria, source_priority, evidence FROM risks_v4 WHERE project_id = 3570002 AND status = 'active' LIMIT 3`
  ) as any;

  for (const row of rows2) {
    console.log("--- RISK:", row.id, row.categoria, row.source_priority, "---");
    let ev: any;
    try { ev = JSON.parse(row.evidence); } catch { ev = row.evidence; }

    if (ev && ev.gaps) {
      console.log("evidence.gaps length:", ev.gaps.length);
      console.log("First gap keys:", Object.keys(ev.gaps[0] || {}));
      console.log("First gap fonte:", JSON.stringify(ev.gaps[0]?.fonte));
      // Check if any gap has a different fonte
      const fontes = ev.gaps.map((g: any) => g.fonte).filter(Boolean);
      const uniqueFontes = [...new Set(fontes)];
      console.log("All fontes in this risk:", uniqueFontes);
    } else if (Array.isArray(ev)) {
      console.log("evidence is ARRAY (legado), length:", ev.length);
    } else {
      console.log("evidence type:", typeof ev);
    }
  }

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
