/**
 * Diagnóstico SQL — Issue #796 (compliance score cravado em 66%)
 * LEITURA APENAS — zero escrita, zero alteração de schema
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Carregar .env de produção
dotenv.config({ path: '.env' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL não encontrada');
  process.exit(1);
}

// Parse da connection string mysql://user:pass@host:port/db?ssl=...
const url = new URL(DATABASE_URL);
const config = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1).split('?')[0],
  ssl: { rejectUnauthorized: false },
  connectTimeout: 15000,
};

async function run() {
  const conn = await mysql.createConnection(config);
  console.log('✅ Conectado ao banco de produção\n');

  // ── Q1 ──────────────────────────────────────────────────────────────────
  console.log('=== Q1 — Distribuição severidade/confidence/type/aprovado ===');
  try {
    const [rows] = await conn.execute(`
      SELECT 
        severidade,
        confidence,
        type,
        (approved_at IS NOT NULL) AS aprovado,
        COUNT(*) AS qty
      FROM risks_v4
      GROUP BY severidade, confidence, type, (approved_at IS NOT NULL)
      ORDER BY qty DESC
      LIMIT 30
    `);
    console.table(rows);
  } catch (e) { console.error('Q1 ERRO:', e.message); }

  // ── Q2 ──────────────────────────────────────────────────────────────────
  console.log('\n=== Q2 — Distribuição scores em projects.scoringData ===');
  try {
    const [rows] = await conn.execute(`
      SELECT 
        JSON_EXTRACT(scoringData, '$.score') AS score,
        JSON_EXTRACT(scoringData, '$.nivel') AS nivel,
        JSON_EXTRACT(scoringData, '$.formula_version') AS formula_version,
        COUNT(*) AS qty
      FROM projects
      WHERE scoringData IS NOT NULL
      GROUP BY score, nivel, formula_version
      ORDER BY qty DESC
      LIMIT 30
    `);
    console.table(rows);
  } catch (e) { console.error('Q2 ERRO:', e.message); }

  // ── Q3 ──────────────────────────────────────────────────────────────────
  console.log('\n=== Q3 — Amostra 15 riscos aprovados mais recentes ===');
  try {
    const [rows] = await conn.execute(`
      SELECT 
        id,
        project_id,
        categoria,
        severidade,
        confidence,
        type,
        approved_at,
        rag_validated,
        source_priority,
        evidence_count
      FROM risks_v4
      WHERE approved_at IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 15
    `);
    console.table(rows);
  } catch (e) { console.error('Q3 ERRO:', e.message); }

  // ── Q4 ──────────────────────────────────────────────────────────────────
  console.log('\n=== Q4 — risk_categories ativas ===');
  try {
    const [rows] = await conn.execute(`
      SELECT 
        codigo,
        severidade,
        urgencia,
        tipo,
        vigencia_fim,
        descricao
      FROM risk_categories
      WHERE vigencia_fim IS NULL OR vigencia_fim > NOW()
      ORDER BY codigo
    `);
    console.table(rows);
  } catch (e) { console.error('Q4 ERRO:', e.message); }

  // ── Q5 — encontrar projeto com score 66% e reconstituir cálculo ─────────
  console.log('\n=== Q5 — Reconstituição de 1 projeto com score 66% ===');
  try {
    // Primeiro: achar um project_id com score 66
    const [proj] = await conn.execute(`
      SELECT id, JSON_EXTRACT(scoringData, '$.score') AS score
      FROM projects
      WHERE JSON_EXTRACT(scoringData, '$.score') = 66
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    if (!proj.length) {
      console.log('Nenhum projeto com score=66 encontrado em scoringData');
    } else {
      const projectId = proj[0].id;
      console.log(`Projeto selecionado: ${projectId} | scoringData.score=${proj[0].score}`);

      const [risks] = await conn.execute(`
        SELECT id, severidade, confidence, type, approved_at
        FROM risks_v4
        WHERE project_id = ?
        ORDER BY severidade, id
      `, [projectId]);
      console.table(risks);

      // Reconstituição manual
      const pesoMap = { alta: 7, media: 5, oportunidade: 1 };
      const scorable = risks.filter(r => r.approved_at !== null && r.type !== 'opportunity');
      const weightedSum = scorable.reduce((acc, r) => {
        const peso = pesoMap[r.severidade] ?? 5;
        const conf = Math.max(parseFloat(r.confidence) || 1.0, 0.5);
        return acc + peso * conf;
      }, 0);
      const scoreCalc = scorable.length > 0
        ? Math.round(weightedSum / (scorable.length * 9) * 100)
        : 0;
      console.log(`\nRiscos scorable (approved + não-opportunity): ${scorable.length}`);
      console.log(`weightedSum: ${weightedSum.toFixed(4)}`);
      console.log(`score_calculado: ${scoreCalc}`);
      console.log(`Match com scoringData.score (66)? ${scoreCalc === 66 ? 'SIM' : 'NÃO'}`);

      // Detalhe por risco
      console.log('\nDetalhe do cálculo por risco:');
      scorable.forEach(r => {
        const peso = pesoMap[r.severidade] ?? 5;
        const conf = Math.max(parseFloat(r.confidence) || 1.0, 0.5);
        console.log(`  id=${r.id} sev=${r.severidade} conf=${conf} peso=${peso} contribuição=${(peso * conf).toFixed(4)}`);
      });
    }
  } catch (e) { console.error('Q5 ERRO:', e.message); }

  await conn.end();
  console.log('\n✅ Diagnóstico concluído — zero escrita executada');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
