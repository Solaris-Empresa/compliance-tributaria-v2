/**
 * Investigação do bug mono-solaris no projeto 3690001
 * READ-ONLY — apenas SELECT
 */
import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();

  console.log('=== Investigação Projeto 3690001 ===\n');

  // 1. Riscos ativos
  console.log('── 1. Riscos ativos ──');
  const risks = await db.execute(sql`
    SELECT id, categoria, severidade, source_priority, status, risk_key
    FROM risks_v4 
    WHERE project_id = 3690001 AND status = 'active'
    ORDER BY severidade, categoria
  `);
  console.table(risks.rows);

  // 2. Distinct source_priority
  console.log('\n── 2. Distinct source_priority ──');
  const distinct = await db.execute(sql`
    SELECT DISTINCT source_priority, COUNT(*) as cnt
    FROM risks_v4 
    WHERE project_id = 3690001 AND status = 'active'
    GROUP BY source_priority
  `);
  console.table(distinct.rows);

  // 3. Gaps por source
  console.log('\n── 3. Gaps por source ──');
  const gapsBySource = await db.execute(sql`
    SELECT source, COUNT(*) as cnt, 
           SUM(CASE WHEN risk_category_code IS NOT NULL THEN 1 ELSE 0 END) as with_category,
           SUM(CASE WHEN risk_category_code IS NULL THEN 1 ELSE 0 END) as without_category
    FROM project_gaps_v3 
    WHERE project_id = 3690001
    GROUP BY source
  `);
  console.table(gapsBySource.rows);

  // 4. Gaps v1 detail (regulatorio source)
  console.log('\n── 4. Gaps v1 (source="v1") — primeiros 10 ──');
  const gapsV1 = await db.execute(sql`
    SELECT id, source, risk_category_code, gap_classification, evidence_status, source_reference, question_source
    FROM project_gaps_v3 
    WHERE project_id = 3690001 AND source = 'v1'
    LIMIT 10
  `);
  console.table(gapsV1.rows);

  // 5. Total gaps v1
  console.log('\n── 5. Total gaps v1 ──');
  const totalV1 = await db.execute(sql`
    SELECT COUNT(*) as total FROM project_gaps_v3 WHERE project_id = 3690001 AND source = 'v1'
  `);
  console.log('Total v1:', totalV1.rows[0]);

  // 6. Gaps solaris detail
  console.log('\n── 6. Gaps solaris — todos ──');
  const gapsSolaris = await db.execute(sql`
    SELECT id, source, risk_category_code, gap_classification, source_reference, criticality
    FROM project_gaps_v3 
    WHERE project_id = 3690001 AND source = 'solaris'
  `);
  console.table(gapsSolaris.rows);

  // 7. Gaps iagen detail
  console.log('\n── 7. Gaps iagen — todos ──');
  const gapsIagen = await db.execute(sql`
    SELECT id, source, risk_category_code, gap_classification, source_reference, criticality
    FROM project_gaps_v3 
    WHERE project_id = 3690001 AND source = 'iagen'
  `);
  console.table(gapsIagen.rows);

  // 8. Questionnaire answers
  console.log('\n── 8. Respostas questionário (questionnaire_answers_v3) ──');
  const answers = await db.execute(sql`
    SELECT id, question_id, resposta, question_source
    FROM questionnaire_answers_v3
    WHERE project_id = 3690001
    LIMIT 20
  `);
  console.table(answers.rows);

  // 9. Solaris answers
  console.log('\n── 9. Respostas SOLARIS (solaris_answers) ──');
  const solarisAnswers = await db.execute(sql`
    SELECT id, question_id, resposta
    FROM solaris_answers
    WHERE project_id = 3690001
    LIMIT 10
  `);
  console.table(solarisAnswers.rows);

  // 10. Check if generateRisksAllSources was called (audit log)
  console.log('\n── 10. Audit trail (últimas 5 ações de risco) ──');
  const audit = await db.execute(sql`
    SELECT id, action_type, actor_name, created_at, details
    FROM risk_audit_log_v4
    WHERE project_id = 3690001
    ORDER BY created_at DESC
    LIMIT 5
  `);
  console.table(audit.rows);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
