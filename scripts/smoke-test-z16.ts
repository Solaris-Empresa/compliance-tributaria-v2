import mysql from 'mysql2/promise';

async function main() {
  const pool = mysql.createPool(process.env.DATABASE_URL!);

  console.log('=== SMOKE TEST Z-16 — Gate 7 ===\n');

  // Gate 0: encontrar projeto de referência com riscos ativos
  const [projetos] = await pool.execute(`
    SELECT project_id, COUNT(*) as n_risks
    FROM risks_v4
    WHERE status = 'active'
    GROUP BY project_id
    ORDER BY n_risks DESC
    LIMIT 5
  `);
  console.log('=== Gate 0: projetos com riscos ativos ===');
  console.log(JSON.stringify(projetos, null, 2));

  const ref = (projetos as any[])[0];
  if (!ref) {
    console.log('❌ NENHUM PROJETO COM RISCOS ATIVOS');
    await pool.end();
    return;
  }
  const REF_ID = ref.project_id;
  console.log(`\nREF_ID: ${REF_ID} | n_risks: ${ref.n_risks}\n`);

  // PROVA 1: contagem de riscos
  const [p1] = await pool.execute(
    'SELECT COUNT(*) as n FROM risks_v4 WHERE project_id = ? AND status = "active"',
    [REF_ID]
  );
  const n = (p1 as any[])[0].n;
  const pass1 = n >= 10 && n <= 40;
  console.log(`PROVA 1 — COUNT: ${n} | ${pass1 ? '✅ PASS' : '❌ FAIL'} (esperado: 10 <= N <= 40)`);

  // PROVA 2: categorias presentes
  const [p2] = await pool.execute(
    'SELECT DISTINCT categoria FROM risks_v4 WHERE project_id = ? AND status = "active"',
    [REF_ID]
  );
  const cats = (p2 as any[]).map((r: any) => r.categoria);
  const hasExpected = cats.includes('aliquota_zero') || cats.includes('credito_presumido');
  console.log(`PROVA 2 — CATEGORIAS: ${cats.join(', ')}`);
  console.log(`PROVA 2 — ${hasExpected ? '✅ PASS' : '❌ FAIL'} (esperado: aliquota_zero OU credito_presumido presente)`);

  // PROVA 3: títulos limpos
  const [p3] = await pool.execute(
    'SELECT titulo FROM risks_v4 WHERE project_id = ?',
    [REF_ID]
  );
  const titulos = (p3 as any[]).map((r: any) => r.titulo);
  const dirty = titulos.filter((t: string) => t && (t.includes('[categoria]') || t.toLowerCase() === 'geral'));
  const pass3 = dirty.length === 0;
  console.log(`PROVA 3 — TÍTULOS SUJOS: ${dirty.length} | ${pass3 ? '✅ PASS' : '❌ FAIL'}`);
  if (dirty.length > 0) console.log('  Exemplos sujos:', dirty.slice(0, 3));

  // PROVA 4: RAG validado
  const [p4] = await pool.execute(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN rag_validated=1 THEN 1 ELSE 0 END) as validados
    FROM risks_v4
    WHERE project_id = ? AND status = 'active'
  `, [REF_ID]);
  const { total, validados } = (p4 as any[])[0];
  const pct = total > 0 ? (Number(validados) / Number(total) * 100) : 0;
  const pass4 = pct >= 50;
  console.log(`PROVA 4 — RAG: ${validados}/${total} (${pct.toFixed(1)}%) | ${pass4 ? '✅ PASS' : '❌ FAIL'} (esperado: >= 50%)`);

  // Resumo
  const allPass = pass1 && hasExpected && pass3 && pass4;
  console.log(`\n=== GATE 7 SMOKE: ${allPass ? '✅ PASS' : '❌ FAIL'} ===`);
  console.log(JSON.stringify({
    ref_id: REF_ID,
    prova1: { n, pass: pass1 },
    prova2: { cats, pass: hasExpected },
    prova3: { dirty_count: dirty.length, pass: pass3 },
    prova4: { validados: Number(validados), total: Number(total), pct: pct.toFixed(1), pass: pass4 },
    gate7: allPass ? 'PASS' : 'FAIL'
  }, null, 2));

  await pool.end();
}

main().catch(console.error);
