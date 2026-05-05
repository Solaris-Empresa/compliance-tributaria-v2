import mysql from "mysql2/promise";

// Replicate EXACTLY what the DoD script does to understand the discrepancy
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log("=== REPLAY of DoD Q3 logic (exact same code) ===\n");
  const [q3] = await conn.execute(
    `SELECT id, categoria, source_priority, evidence
     FROM risks_v4
     WHERE project_id = 3780001 AND status = 'active'`
  ) as any;

  for (const row of q3) {
    let fontes: string[] = [];
    try {
      const ev = JSON.parse(row.evidence || '{}');
      if (ev.gaps && Array.isArray(ev.gaps)) {
        fontes = [...new Set(ev.gaps.map((g: any) => g.fonte).filter(Boolean))];
      }
    } catch {}
    console.log(`  ${row.categoria} | source_priority=${row.source_priority} | fontes_evidence=[${fontes.join(', ')}]`);
  }

  // Check: what does typeof row.evidence return?
  console.log("\n=== DEBUG: typeof evidence column ===");
  for (const row of q3) {
    console.log(`  ${row.categoria}: typeof evidence = ${typeof row.evidence}, first 100 chars: ${String(row.evidence).substring(0, 100)}`);
    break; // just first one
  }

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
