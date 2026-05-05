/**
 * Executa as 3 queries exatas solicitadas pelo P.O. para projeto 3690001
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
    SELECT source, COUNT(*) AS cnt, SUM(risk_category_code IS NOT NULL) AS com_categoria
    FROM project_gaps_v3
    WHERE project_id = 3690001 AND analysis_version = 3
    GROUP BY source
  `);
  console.table(q1);

  // Query 2: distribuição source_priority dos riscos
  console.log('\n── Query 2: distribuição source_priority dos riscos ──');
  const [q2] = await pool.query(`
    SELECT source_priority, COUNT(*) AS cnt
    FROM risks_v4
    WHERE project_id = 3690001 AND status = 'active'
    GROUP BY source_priority
  `);
  console.table(q2);

  // Query 3: para cada risco, quantas fontes distintas contribuíram (do JSON evidence)
  console.log('\n── Query 3: fontes contribuintes por risco (JSON_TABLE) ──');
  try {
    const [q3] = await pool.query(`
      SELECT r.id, r.categoria, r.source_priority,
             (SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(g.value, '$.fonte')))
              FROM JSON_TABLE(r.evidence, '$.gaps[*]' COLUMNS(value JSON PATH '$')) g) AS fontes_contribuintes
      FROM risks_v4 r
      WHERE r.project_id = 3690001 AND r.status = 'active'
    `);
    console.table(q3);
  } catch (err: any) {
    console.log('JSON_TABLE falhou:', err.message);
    console.log('\nFallback: parsing evidence em JS...');
    const [rows] = await pool.query(`
      SELECT id, categoria, source_priority, evidence
      FROM risks_v4
      WHERE project_id = 3690001 AND status = 'active'
    `) as any;
    const results: any[] = [];
    for (const row of rows) {
      let fontesCount = 0;
      let fontesList = '';
      try {
        const ev = typeof row.evidence === 'string' ? JSON.parse(row.evidence) : row.evidence;
        if (ev?.gaps) {
          const fontesSet = new Set(ev.gaps.map((g: any) => g.fonte));
          fontesCount = fontesSet.size;
          fontesList = Array.from(fontesSet).join(', ');
        }
      } catch {}
      results.push({
        id: row.id.substring(0, 8) + '...',
        categoria: row.categoria,
        source_priority: row.source_priority,
        fontes_contribuintes: fontesCount,
        fontes_lista: fontesList,
      });
    }
    console.table(results);
  }

  await pool.end();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
