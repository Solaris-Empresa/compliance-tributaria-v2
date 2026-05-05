/**
 * 3 queries específicas para projeto 3690001
 * READ-ONLY
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  // Query 1: gaps por source no #3690001
  console.log('── Query 1: gaps por source no #3690001 ──');
  const [q1] = await pool.query(`
    SELECT source, COUNT(*) as cnt, SUM(risk_category_code IS NOT NULL) AS com_categoria
    FROM project_gaps_v3
    WHERE project_id = 3690001 AND analysis_version = 3
    GROUP BY source
  `);
  console.table(q1);

  // Query 2: distribuição source_priority dos riscos
  console.log('\n── Query 2: distribuição source_priority dos riscos ──');
  const [q2] = await pool.query(`
    SELECT source_priority, COUNT(*) as cnt
    FROM risks_v4
    WHERE project_id = 3690001 AND status = 'active'
    GROUP BY source_priority
  `);
  console.table(q2);

  // Query 3: para cada risco, quantas fontes distintas contribuíram
  console.log('\n── Query 3: fontes contribuintes por risco (do JSON evidence) ──');
  const [q3] = await pool.query(`
    SELECT id, categoria, source_priority, evidence
    FROM risks_v4
    WHERE project_id = 3690001 AND status = 'active'
  `) as any;
  
  for (const row of q3) {
    let fontes = 'N/A';
    try {
      const ev = typeof row.evidence === 'string' ? JSON.parse(row.evidence) : row.evidence;
      if (ev?.gaps) {
        const fontesSet = new Set(ev.gaps.map((g: any) => g.fonte || g.sourceOrigin || 'unknown'));
        fontes = Array.from(fontesSet).join(', ');
      }
    } catch {}
    console.log(`  ${row.id} | ${row.categoria} | source_priority=${row.source_priority} | fontes=[${fontes}]`);
  }

  // Query 4 (bonus): verificar se há gaps v1 e qual o question_source deles
  console.log('\n── Query 4 (bonus): gaps v1 — risk_category_code e classificação ──');
  const [q4] = await pool.query(`
    SELECT risk_category_code, gap_classification, COUNT(*) as cnt
    FROM project_gaps_v3
    WHERE project_id = 3690001 AND source = 'v1' AND analysis_version = 3
    GROUP BY risk_category_code, gap_classification
    ORDER BY cnt DESC
    LIMIT 20
  `);
  console.table(q4);

  // Query 5 (bonus): gaps solaris com risk_category_code
  console.log('\n── Query 5 (bonus): gaps solaris — risk_category_code ──');
  const [q5] = await pool.query(`
    SELECT risk_category_code, COUNT(*) as cnt
    FROM project_gaps_v3
    WHERE project_id = 3690001 AND source = 'solaris' AND analysis_version = 3
    GROUP BY risk_category_code
  `);
  console.table(q5);

  // Query 6 (bonus): gaps iagen com risk_category_code
  console.log('\n── Query 6 (bonus): gaps iagen — risk_category_code ──');
  const [q6] = await pool.query(`
    SELECT risk_category_code, COUNT(*) as cnt
    FROM project_gaps_v3
    WHERE project_id = 3690001 AND source = 'iagen' AND analysis_version = 3
    GROUP BY risk_category_code
  `);
  console.table(q6);

  await pool.end();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
