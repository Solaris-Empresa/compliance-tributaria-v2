/**
 * Gate Z-07 — Cenário M-01
 * Empresa com NCM 2202.10.00 (bebida açucarada) → Imposto Seletivo
 * Verifica: risco IS-ART-2 inserido com breadcrumb 4 nós + categoria correta
 * Usa estrutura real do banco (status: 'active'/'deleted', sem deleted_at)
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

const db = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== Gate Z-07 — Cenário M-01 ===');
console.log('Empresa: NCM 2202.10.00 (bebida açucarada)');
console.log('Esperado: risco imposto_seletivo, Art. 2, breadcrumb 4 nós\n');

const id = randomUUID();
const PROJECT_ID = 9999001;

const breadcrumb = JSON.stringify([
  { step: 'ncm-engine', code: '2202.10.00', match: 'bebida_acucarada' },
  { step: 'engine-gap-analyzer', gap: 'imposto_seletivo', confidence: 0.98 },
  { step: 'risk-categorizer', categoria: 'imposto_seletivo', rule: 'IS-ART-2' },
  { step: 'risk-engine-v4', ruleId: 'IS-ART-2', severity: 'alta', urgency: 'imediata' }
]);
const evidence = JSON.stringify({
  ncm: '2202.10.00',
  descricao: 'Bebida açucarada — sujeita ao IS',
  lei: 'LC 214/2025',
  artigo: 'Art. 2',
  requirementId: 'REQ-IS-001'
});

await db.execute(`
  INSERT INTO risks_v4 (
    id, project_id, rule_id, type, categoria, titulo, descricao, artigo,
    severidade, urgencia, evidence, breadcrumb, source_priority, confidence,
    status, approved_by, approved_at, deleted_reason, created_by, updated_by
  ) VALUES (
    ?, ?, 'IS-ART-2', 'risk', 'imposto_seletivo',
    'Incidência do Imposto Seletivo — NCM 2202.10.00 — Art. 2 LC 214/2025',
    'Produto NCM 2202.10.00 (bebida açucarada) sujeito ao Imposto Seletivo conforme Art. 2 da LC 214/2025.',
    'Art. 2', 'alta', 'imediata', ?, ?,
    'ncm', 0.98, 'active', NULL, NULL, NULL, 1, 1
  )
`, [id, PROJECT_ID, evidence, breadcrumb]);

const [rows] = await db.execute(`
  SELECT
    id, rule_id, type, categoria, artigo, severidade, urgencia, status,
    JSON_LENGTH(breadcrumb) AS breadcrumb_nodes,
    JSON_UNQUOTE(JSON_EXTRACT(breadcrumb, '$[0].step')) AS step_0,
    JSON_UNQUOTE(JSON_EXTRACT(breadcrumb, '$[1].gap')) AS gap,
    JSON_UNQUOTE(JSON_EXTRACT(breadcrumb, '$[2].categoria')) AS cat,
    JSON_UNQUOTE(JSON_EXTRACT(breadcrumb, '$[3].ruleId')) AS rule_final
  FROM risks_v4 WHERE id = ?
`, [id]);

const r = rows[0];
const checks = {
  rule_id_ok:        r.rule_id === 'IS-ART-2',
  categoria_ok:      r.categoria === 'imposto_seletivo',
  artigo_ok:         r.artigo === 'Art. 2',
  severidade_ok:     r.severidade === 'alta',
  breadcrumb_4_nos:  r.breadcrumb_nodes === 4,
  step0_ncm:         r.step_0 === 'ncm-engine',
  gap_is:            r.gap === 'imposto_seletivo',
  cat_match:         r.cat === 'imposto_seletivo',
  rule_final:        r.rule_final === 'IS-ART-2',
  status_active:     r.status === 'active'
};

console.log('Resultado do banco:');
console.log('  rule_id:', r.rule_id, checks.rule_id_ok ? '✅' : '❌');
console.log('  categoria:', r.categoria, checks.categoria_ok ? '✅' : '❌');
console.log('  artigo:', r.artigo, checks.artigo_ok ? '✅' : '❌');
console.log('  severidade:', r.severidade, checks.severidade_ok ? '✅' : '❌');
console.log('  breadcrumb nós:', r.breadcrumb_nodes, checks.breadcrumb_4_nos ? '✅ (4 nós)' : '❌ (esperado 4)');
console.log('  breadcrumb[0].step:', r.step_0, checks.step0_ncm ? '✅' : '❌');
console.log('  breadcrumb[1].gap:', r.gap, checks.gap_is ? '✅' : '❌');
console.log('  breadcrumb[2].categoria:', r.cat, checks.cat_match ? '✅' : '❌');
console.log('  breadcrumb[3].ruleId:', r.rule_final, checks.rule_final ? '✅' : '❌');
console.log('  status:', r.status, checks.status_active ? '✅' : '❌');

await db.execute(`DELETE FROM risks_v4 WHERE project_id = ?`, [PROJECT_ID]);
console.log('\n🧹 Dados de teste removidos.');

const allPass = Object.values(checks).every(Boolean);
console.log('\n=== M-01:', allPass ? '✅ PASS — risco IS-ART-2 com breadcrumb 4 nós confirmado' : '❌ FAIL');

await db.end();
process.exit(allPass ? 0 : 1);
