import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log("=== ALL 8 RISKS in #3780001: fonte distribution per risk ===\n");
  const [rows] = await conn.execute(
    `SELECT id, categoria, source_priority, evidence FROM risks_v4 WHERE project_id = 3780001 AND status = 'active'`
  ) as any;

  let multiSourceRiskCount = 0;
  for (const row of rows) {
    let ev: any;
    try { ev = JSON.parse(row.evidence); } catch { ev = row.evidence; }

    if (ev && ev.gaps && Array.isArray(ev.gaps)) {
      const fontes = ev.gaps.map((g: any) => g.fonte).filter(Boolean);
      const uniqueFontes = [...new Set(fontes)];
      const isMulti = uniqueFontes.length > 1;
      if (isMulti) multiSourceRiskCount++;
      console.log(`${isMulti ? '🔴 MULTI' : '🟢 MONO '} | ${row.categoria.padEnd(22)} | source_priority=${row.source_priority.padEnd(12)} | fontes=[${uniqueFontes.join(', ')}] (${fontes.length} gaps)`);
    } else {
      console.log(`⚠️  LEGADO | ${row.categoria.padEnd(22)} | evidence format: ${Array.isArray(ev) ? 'array' : typeof ev}`);
    }
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`Total risks: ${rows.length}`);
  console.log(`Multi-fonte per risk: ${multiSourceRiskCount}`);
  console.log(`Mono-fonte per risk: ${rows.length - multiSourceRiskCount}`);

  // Now check #3570002 
  console.log("\n\n=== ALL RISKS in #3570002: fonte distribution per risk ===\n");
  const [rows2] = await conn.execute(
    `SELECT id, categoria, source_priority, evidence FROM risks_v4 WHERE project_id = 3570002 AND status = 'active'`
  ) as any;

  let multiSourceRiskCount2 = 0;
  for (const row of rows2) {
    let ev: any;
    try { ev = JSON.parse(row.evidence); } catch { ev = row.evidence; }

    if (ev && ev.gaps && Array.isArray(ev.gaps)) {
      const fontes = ev.gaps.map((g: any) => g.fonte).filter(Boolean);
      const uniqueFontes = [...new Set(fontes)];
      const isMulti = uniqueFontes.length > 1;
      if (isMulti) multiSourceRiskCount2++;
      console.log(`${isMulti ? '🔴 MULTI' : '🟢 MONO '} | ${row.categoria.padEnd(22)} | source_priority=${row.source_priority.padEnd(12)} | fontes=[${uniqueFontes.join(', ')}] (${fontes.length} gaps)`);
    } else {
      console.log(`⚠️  LEGADO | ${row.categoria.padEnd(22)} | evidence format: ${Array.isArray(ev) ? 'array' : typeof ev}`);
    }
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`Total risks: ${rows2.length}`);
  console.log(`Multi-fonte per risk: ${multiSourceRiskCount2}`);
  console.log(`Mono-fonte per risk: ${rows2.length - multiSourceRiskCount2}`);

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
