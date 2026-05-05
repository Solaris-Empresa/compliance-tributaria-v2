import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log("=== Q1: Gaps por source (3780001) ===");
  const [q1] = await conn.execute(
    `SELECT source, COUNT(*) AS total, SUM(risk_category_code IS NOT NULL) AS com_cat
     FROM project_gaps_v3
     WHERE project_id = 3780001 AND analysis_version = 3
     GROUP BY source`
  );
  console.table(q1);

  console.log("\n=== Q2: Distribuição source_priority dos riscos (3780001) ===");
  const [q2] = await conn.execute(
    `SELECT source_priority, COUNT(*) AS total
     FROM risks_v4
     WHERE project_id = 3780001 AND status = 'active'
     GROUP BY source_priority`
  );
  console.table(q2);

  console.log("\n=== Q3: Fontes contribuintes por risco (evidence JSON) ===");
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

  console.log("\n=== Q4: Duplicação de gaps v1 ===");
  const [q4] = await conn.execute(
    `SELECT requirement_id, COUNT(*) AS dup
     FROM project_gaps_v3
     WHERE project_id = 3780001 AND analysis_version = 3 AND source = 'v1'
     GROUP BY requirement_id
     HAVING COUNT(*) > 1`
  );
  console.table(q4);
  console.log(`Duplicações: ${(q4 as any[]).length}`);

  console.log("\n=== CRITÉRIO DoD ===");
  const distinctSources = (q2 as any[]).length;
  console.log(`Fontes distintas em source_priority: ${distinctSources}`);
  console.log(`DoD (>=2): ${distinctSources >= 2 ? '✅ PASS' : '❌ FAIL'}`);

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
