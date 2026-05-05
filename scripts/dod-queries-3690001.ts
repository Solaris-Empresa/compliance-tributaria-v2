import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log("=== Q1: gaps por source no #3690001 ===");
  const [q1] = await conn.execute(`
    SELECT source, COUNT(*) AS total, SUM(risk_category_code IS NOT NULL) AS com_categoria
    FROM project_gaps_v3
    WHERE project_id = 3690001 AND analysis_version = 3
    GROUP BY source
  `);
  console.table(q1);

  console.log("\n=== Q2: distribuição source_priority dos riscos ===");
  const [q2] = await conn.execute(`
    SELECT source_priority, COUNT(*) AS total
    FROM risks_v4
    WHERE project_id = 3690001 AND status = 'active'
    GROUP BY source_priority
  `);
  console.table(q2);

  console.log("\n=== Q3: fontes contribuintes por risco (evidence JSON) ===");
  const [q3rows] = await conn.execute(`
    SELECT id, categoria, source_priority, evidence
    FROM risks_v4
    WHERE project_id = 3690001 AND status = 'active'
  `) as any;

  const q3results: any[] = [];
  for (const row of q3rows as any[]) {
    let fontes: string[] = [];
    try {
      const ev = typeof row.evidence === "string" ? JSON.parse(row.evidence) : row.evidence;
      if (ev && ev.gaps && Array.isArray(ev.gaps)) {
        fontes = [...new Set(ev.gaps.map((g: any) => g.fonte).filter(Boolean))] as string[];
      }
    } catch {}
    q3results.push({
      id: row.id?.substring(0, 8) + "...",
      categoria: row.categoria,
      source_priority: row.source_priority,
      fontes_contribuintes: fontes.length,
      fontes_lista: fontes.join(", ") || row.source_priority,
    });
  }
  console.table(q3results);

  console.log("\n=== Q4: ausência de duplicação de gaps v1 ===");
  const [q4] = await conn.execute(`
    SELECT requirement_id, COUNT(*) AS dup
    FROM project_gaps_v3
    WHERE project_id = 3690001 AND analysis_version = 3 AND source = 'v1'
    GROUP BY requirement_id
    HAVING COUNT(*) > 1
  `);
  const q4arr = q4 as any[];
  if (q4arr.length === 0) {
    console.log("✅ 0 duplicações de gaps v1 (PASS)");
  } else {
    console.log("❌ Duplicações encontradas:");
    console.table(q4);
  }

  console.log("\n=== RESUMO DoD ===");
  const q2arr = q2 as any[];
  const distinctSources = q2arr.length;
  const hasSolarisOrIagen = q2arr.some((r: any) => r.source_priority === "solaris" || r.source_priority === "iagen");
  const hasRegulatorio = q2arr.some((r: any) => r.source_priority === "regulatorio");
  const multifonteRisks = q3results.filter(r => r.fontes_contribuintes >= 2).length;

  console.log(`Fontes distintas em source_priority: ${distinctSources}`);
  console.log(`Tem solaris/iagen: ${hasSolarisOrIagen}`);
  console.log(`Tem regulatorio: ${hasRegulatorio}`);
  console.log(`Riscos com multi-fonte no evidence: ${multifonteRisks}/${q3results.length}`);
  console.log(`Duplicação gaps v1: ${q4arr.length}`);
  console.log(`\n${distinctSources >= 2 ? "✅ CRITÉRIO POSITIVO 1 PASS (>=2 fontes)" : "⚠️ CRITÉRIO POSITIVO 1: apenas " + distinctSources + " fonte(s)"}`);
  console.log(`${q4arr.length === 0 ? "✅ CRITÉRIO Q4 PASS (0 duplicações)" : "❌ CRITÉRIO Q4 FAIL"}`);

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
