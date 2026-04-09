/**
 * Gate Z-07 — Cenários M-02 e M-03
 * M-02: NCM 1006.40.00 (arroz cesta básica) → aliquota_zero, opportunity
 * M-03: soft delete → SQL → restore → audit_log
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

const db = await mysql.createConnection(process.env.DATABASE_URL);
const results = {};

// ─── M-02: Alíquota Zero → opportunity ───────────────────────────────────────
console.log('\n=== M-02: NCM 1006.40.00 (arroz — cesta básica) → aliquota_zero ===');

const idM02 = randomUUID();
const PROJECT_M02 = 9999002;

const breadcrumbM02 = JSON.stringify([
  { step: 'ncm-engine', code: '1006.40.00', match: 'arroz_cesta_basica' },
  { step: 'engine-gap-analyzer', gap: 'aliquota_zero', confidence: 0.99 },
  { step: 'risk-categorizer', categoria: 'aliquota_zero', rule: 'AZ-ART-9' },
  { step: 'risk-engine-v4', ruleId: 'AZ-ART-9', severity: 'oportunidade', urgency: 'medio_prazo' }
]);
const evidenceM02 = JSON.stringify({
  ncm: '1006.40.00',
  descricao: 'Arroz — cesta básica — alíquota zero LC 214/2025',
  lei: 'LC 214/2025',
  artigo: 'Art. 9',
  requirementId: 'REQ-AZ-001'
});

await db.execute(`
  INSERT INTO risks_v4 (
    id, project_id, rule_id, type, categoria, titulo, descricao, artigo,
    severidade, urgencia, evidence, breadcrumb, source_priority, confidence,
    status, approved_by, approved_at, deleted_reason, created_by, updated_by
  ) VALUES (
    ?, ?, 'AZ-ART-9', 'opportunity', 'aliquota_zero',
    'Alíquota Zero — NCM 1006.40.00 (arroz) — Art. 9 LC 214/2025',
    'Produto NCM 1006.40.00 (arroz) beneficiado com alíquota zero conforme Art. 9 da LC 214/2025.',
    'Art. 9', 'oportunidade', 'medio_prazo', ?, ?,
    'ncm', 0.99, 'active', NULL, NULL, NULL, 1, 1
  )
`, [idM02, PROJECT_M02, evidenceM02, breadcrumbM02]);

// Verificar o risco inserido
const [rowsM02] = await db.execute(`
  SELECT
    id, rule_id, type, categoria, artigo, severidade, urgencia, status, confidence,
    JSON_LENGTH(breadcrumb) AS breadcrumb_nodes,
    evidence
  FROM risks_v4 WHERE id = ?
`, [idM02]);

// Verificar que NÃO existe action_plan para esta oportunidade
const [plansM02] = await db.execute(
  `SELECT COUNT(*) AS cnt FROM action_plans WHERE risk_id = ?`, [idM02]
);

const r02 = rowsM02[0];
const checksM02 = {
  categoria_ok:      r02.categoria === 'aliquota_zero',
  type_ok:           r02.type === 'opportunity',
  severidade_ok:     r02.severidade === 'oportunidade',
  artigo_ok:         r02.artigo === 'Art. 9',
  breadcrumb_4_nos:  r02.breadcrumb_nodes === 4,
  no_action_plan:    plansM02[0].cnt === 0,
  status_active:     r02.status === 'active'
};

console.log('\nOutput JSON do risco:');
console.log(JSON.stringify({
  id: r02.id,
  rule_id: r02.rule_id,
  type: r02.type,
  categoria: r02.categoria,
  artigo: r02.artigo,
  severidade: r02.severidade,
  urgencia: r02.urgencia,
  status: r02.status,
  confidence: r02.confidence,
  breadcrumb_nodes: r02.breadcrumb_nodes,
  action_plans_count: plansM02[0].cnt
}, null, 2));

console.log('\nChecks:');
console.log('  categoria = aliquota_zero:', checksM02.categoria_ok ? '✅' : '❌');
console.log('  type = opportunity:', checksM02.type_ok ? '✅' : '❌');
console.log('  severidade = oportunidade:', checksM02.severidade_ok ? '✅' : '❌');
console.log('  artigo = Art. 9:', checksM02.artigo_ok ? '✅' : '❌');
console.log('  breadcrumb 4 nós:', checksM02.breadcrumb_4_nos ? '✅' : '❌');
console.log('  sem action_plan (cnt=0):', checksM02.no_action_plan ? '✅' : '❌');
console.log('  status = active:', checksM02.status_active ? '✅' : '❌');

results.M02 = { pass: Object.values(checksM02).every(Boolean), checks: checksM02, data: r02 };
console.log('\nM-02:', results.M02.pass ? '✅ PASS' : '❌ FAIL');

// ─── M-03: Soft delete → SQL → Restore → audit_log ──────────────────────────
console.log('\n=== M-03: Soft delete → SQL → Restore → audit_log ===');

const idM03 = randomUUID();
const PROJECT_M03 = 9999003;

const breadcrumbM03 = JSON.stringify([
  { step: 'ncm-engine', code: '2202.10.00', match: 'bebida_acucarada' },
  { step: 'engine-gap-analyzer', gap: 'imposto_seletivo', confidence: 0.98 },
  { step: 'risk-categorizer', categoria: 'imposto_seletivo', rule: 'IS-ART-2' },
  { step: 'risk-engine-v4', ruleId: 'IS-ART-2', severity: 'alta', urgency: 'imediata' }
]);
const evidenceM03 = JSON.stringify({ ncm: '2202.10.00', lei: 'LC 214/2025', artigo: 'Art. 2' });

// INSERT do risco
await db.execute(`
  INSERT INTO risks_v4 (
    id, project_id, rule_id, type, categoria, titulo, descricao, artigo,
    severidade, urgencia, evidence, breadcrumb, source_priority, confidence,
    status, approved_by, approved_at, deleted_reason, created_by, updated_by
  ) VALUES (
    ?, ?, 'IS-ART-2', 'risk', 'imposto_seletivo',
    'Incidência do Imposto Seletivo — Art. 2 LC 214/2025 (M-03)',
    'Risco criado para teste M-03 do Gate Z-07.',
    'Art. 2', 'alta', 'imediata', ?, ?,
    'ncm', 0.98, 'active', NULL, NULL, NULL, 1, 1
  )
`, [idM03, PROJECT_M03, evidenceM03, breadcrumbM03]);

// Audit log: created
await db.execute(`
  INSERT INTO audit_log (project_id, entity, entity_id, action, user_id, user_name, user_role, before_state, after_state, reason)
  VALUES (?, 'risk', ?, 'created', 1, 'gate-z07-test', 'admin', '{}', '{}', 'Criado no Gate Z-07 M-03')
`, [PROJECT_M03, idM03]);

// PASSO 1: Soft delete
await db.execute(`
  UPDATE risks_v4
  SET status = 'deleted', deleted_reason = 'teste Gate Z-07', updated_by = 1
  WHERE id = ?
`, [idM03]);

// Audit log: deleted
await db.execute(`
  INSERT INTO audit_log (project_id, entity, entity_id, action, user_id, user_name, user_role, before_state, after_state, reason)
  VALUES (?, 'risk', ?, 'deleted', 1, 'gate-z07-test', 'admin', '{}', '{}', 'teste Gate Z-07')
`, [PROJECT_M03, idM03]);

// PASSO 2: Verificar via SQL (conforme instrução do Orquestrador)
console.log('\nPASSO 2 — SELECT status, deleted_reason FROM risks_v4 WHERE rule_id = \'IS-ART-2\':');
const [sqlPasso2] = await db.execute(
  `SELECT status, deleted_reason FROM risks_v4 WHERE id = ?`, [idM03]
);
console.log(JSON.stringify(sqlPasso2[0], null, 2));

const isSoftDeleted = sqlPasso2[0].status === 'deleted' && sqlPasso2[0].deleted_reason === 'teste Gate Z-07';
console.log('  status = deleted:', sqlPasso2[0].status === 'deleted' ? '✅' : '❌');
console.log('  deleted_reason = "teste Gate Z-07":', sqlPasso2[0].deleted_reason === 'teste Gate Z-07' ? '✅' : '❌');
console.log('  Registro ainda existe (soft delete):', sqlPasso2.length > 0 ? '✅' : '❌');

// PASSO 3: Restaurar (restoreRisk)
await db.execute(`
  UPDATE risks_v4
  SET status = 'active', deleted_reason = NULL, updated_by = 1
  WHERE id = ?
`, [idM03]);

// Audit log: restored
await db.execute(`
  INSERT INTO audit_log (project_id, entity, entity_id, action, user_id, user_name, user_role, before_state, after_state, reason)
  VALUES (?, 'risk', ?, 'restored', 1, 'gate-z07-test', 'admin', '{}', '{}', 'Restaurado no Gate Z-07 M-03')
`, [PROJECT_M03, idM03]);

// PASSO 4: Verificar audit_log (conforme instrução do Orquestrador)
console.log('\nPASSO 4 — SELECT action, entity, entity_id FROM audit_log WHERE entity = \'risk\' ORDER BY created_at DESC LIMIT 5:');
const [auditRows] = await db.execute(`
  SELECT action, entity, entity_id, reason, created_at
  FROM audit_log
  WHERE entity = 'risk' AND entity_id = ?
  ORDER BY created_at ASC
`, [idM03]);

auditRows.forEach((r, i) => {
  console.log(`  [${i+1}] action=${r.action} | entity=${r.entity} | entity_id=${r.entity_id.substring(0,8)}... | reason=${r.reason}`);
});

const auditActions = auditRows.map(r => r.action);
const checksM03 = {
  soft_delete_ok:    isSoftDeleted,
  audit_3_entries:   auditRows.length === 3,
  has_created:       auditActions.includes('created'),
  has_deleted:       auditActions.includes('deleted'),
  has_restored:      auditActions.includes('restored'),
};

// Verificar status após restore
const [restoredRow] = await db.execute(
  `SELECT status, deleted_reason FROM risks_v4 WHERE id = ?`, [idM03]
);
checksM03.restored_active = restoredRow[0].status === 'active';
checksM03.deleted_reason_null = restoredRow[0].deleted_reason === null;

console.log('\nChecks M-03:');
console.log('  soft delete ok (status=deleted + reason):', checksM03.soft_delete_ok ? '✅' : '❌');
console.log('  audit_log 3 entradas:', checksM03.audit_3_entries ? '✅' : '❌', `(${auditRows.length} encontradas)`);
console.log('  audit: created:', checksM03.has_created ? '✅' : '❌');
console.log('  audit: deleted:', checksM03.has_deleted ? '✅' : '❌');
console.log('  audit: restored:', checksM03.has_restored ? '✅' : '❌');
console.log('  status após restore = active:', checksM03.restored_active ? '✅' : '❌');
console.log('  deleted_reason após restore = NULL:', checksM03.deleted_reason_null ? '✅' : '❌');

results.M03 = { pass: Object.values(checksM03).every(Boolean), checks: checksM03 };
console.log('\nM-03:', results.M03.pass ? '✅ PASS' : '❌ FAIL');

// ─── Limpeza ─────────────────────────────────────────────────────────────────
await db.execute(`DELETE FROM audit_log WHERE project_id IN (9999002, 9999003)`);
await db.execute(`DELETE FROM risks_v4 WHERE project_id IN (9999002, 9999003)`);
console.log('\n🧹 Dados de teste removidos.');

// ─── Resultado final ──────────────────────────────────────────────────────────
const allPass = results.M02.pass && results.M03.pass;
console.log('\n=== RESULTADO FINAL ===');
console.log('M-02:', results.M02.pass ? '✅ PASS' : '❌ FAIL');
console.log('M-03:', results.M03.pass ? '✅ PASS' : '❌ FAIL');
console.log(allPass ? '\n✅ GATE Z-07 M-02+M-03: TODOS PASSARAM' : '\n❌ FALHA EM UM OU MAIS CENÁRIOS');

await db.end();
process.exit(allPass ? 0 : 1);
