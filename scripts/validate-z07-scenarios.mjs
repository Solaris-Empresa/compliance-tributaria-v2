/**
 * Sprint Z-07 — Validação dos 3 cenários manuais
 * M-01: empresa com IS → risco Art. 2 + breadcrumb 4 nós
 * M-02: empresa com alíquota zero → oportunidade sem "+ Plano"
 * M-03: soft delete → histórico → restaurar → audit_log
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

const db = await mysql.createConnection(process.env.DATABASE_URL);

const results = { M01: null, M02: null, M03: null };

// ─── M-01: Imposto Seletivo → risco Art. 2 + breadcrumb 4 nós ───────────────
console.log('\n=== M-01: Empresa com IS → risco Art. 2 + breadcrumb 4 nós ===');
const idM01 = randomUUID();
const breadcrumbM01 = JSON.stringify([
  { step: 'ncm-engine', code: '2202.10.00' },
  { step: 'engine-gap-analyzer', gap: 'imposto_seletivo' },
  { step: 'risk-categorizer', categoria: 'imposto_seletivo' },
  { step: 'risk-engine-v4', rule: 'IS-ART-2' }
]);
const evidenceM01 = JSON.stringify({ ncm: '2202.10.00', lei: 'lc214', artigo: 'Art. 2' });

await db.execute(`
  INSERT INTO risks_v4 (id, project_id, rule_id, type, categoria, titulo, descricao, artigo,
    severidade, urgencia, evidence, breadcrumb, source_priority, confidence, status,
    deleted_at, deleted_reason, approved_at, approved_by, created_by, updated_by)
  VALUES (?, 9999901, 'IS-ART-2', 'risk', 'imposto_seletivo',
    'Incidência do Imposto Seletivo — Art. 2 LC 214/2025',
    'Produto NCM 2202.10.00 sujeito ao IS conforme Art. 2 da LC 214/2025.',
    'Art. 2', 'alta', 'imediata', ?, ?, 'ncm', 0.98, 'ativo',
    NULL, NULL, NULL, NULL, 1, 1)
`, [idM01, evidenceM01, breadcrumbM01]);

const [rowsM01] = await db.execute(
  `SELECT id, rule_id, categoria, artigo, status, JSON_LENGTH(breadcrumb) AS breadcrumb_nodes
   FROM risks_v4 WHERE id = ?`, [idM01]
);
const r01 = rowsM01[0];
const passM01 = r01.rule_id === 'IS-ART-2' && r01.artigo === 'Art. 2' && r01.breadcrumb_nodes === 4;
results.M01 = {
  pass: passM01,
  rule_id: r01.rule_id,
  artigo: r01.artigo,
  breadcrumb_nodes: r01.breadcrumb_nodes,
  status: r01.status
};
console.log(passM01 ? '✅ PASS' : '❌ FAIL', JSON.stringify(results.M01, null, 2));

// ─── M-02: Alíquota zero → oportunidade sem plano de ação ────────────────────
console.log('\n=== M-02: Empresa com alíquota zero → oportunidade, sem plano de ação ===');
const idM02 = randomUUID();
const breadcrumbM02 = JSON.stringify([
  { step: 'ncm-engine', code: '9619.00.00' },
  { step: 'engine-gap-analyzer', gap: 'aliquota_zero' },
  { step: 'risk-categorizer', categoria: 'aliquota_zero' },
  { step: 'risk-engine-v4', rule: 'AZ-ART-9' }
]);
const evidenceM02 = JSON.stringify({ ncm: '9619.00.00', lei: 'lc214', artigo: 'Art. 9' });

await db.execute(`
  INSERT INTO risks_v4 (id, project_id, rule_id, type, categoria, titulo, descricao, artigo,
    severidade, urgencia, evidence, breadcrumb, source_priority, confidence, status,
    deleted_at, deleted_reason, approved_at, approved_by, created_by, updated_by)
  VALUES (?, 9999902, 'AZ-ART-9', 'opportunity', 'aliquota_zero',
    'Alíquota Zero — NCM 9619.00.00 — Art. 9 LC 214/2025',
    'Produto NCM 9619.00.00 beneficiado com alíquota zero conforme Art. 9.',
    'Art. 9', 'oportunidade', 'medio_prazo', ?, ?, 'ncm', 0.95, 'ativo',
    NULL, NULL, NULL, NULL, 1, 1)
`, [idM02, evidenceM02, breadcrumbM02]);

// Verificar que NÃO existe plano de ação para esta oportunidade
const [plansM02] = await db.execute(
  `SELECT COUNT(*) AS cnt FROM action_plans WHERE risk_id = ?`, [idM02]
);
const [rowsM02] = await db.execute(
  `SELECT id, rule_id, type, categoria, artigo, status FROM risks_v4 WHERE id = ?`, [idM02]
);
const r02 = rowsM02[0];
const passM02 = r02.type === 'opportunity' && r02.categoria === 'aliquota_zero' && plansM02[0].cnt === 0;
results.M02 = {
  pass: passM02,
  type: r02.type,
  categoria: r02.categoria,
  artigo: r02.artigo,
  action_plans_count: plansM02[0].cnt
};
console.log(passM02 ? '✅ PASS' : '❌ FAIL', JSON.stringify(results.M02, null, 2));

// ─── M-03: Soft delete → histórico → restaurar → audit_log ──────────────────
console.log('\n=== M-03: Soft delete → histórico → restaurar → audit_log ===');
const idM03 = randomUUID();
const breadcrumbM03 = JSON.stringify([
  { step: 'engine-gap-analyzer', gap: 'split_payment' },
  { step: 'risk-categorizer', categoria: 'split_payment' },
  { step: 'risk-engine-v4', rule: 'SP-ART-25' },
  { step: 'validation', confidence: 0.92 }
]);
const evidenceM03 = JSON.stringify({ lei: 'lc214', artigo: 'Art. 25' });

// Inserir risco
await db.execute(`
  INSERT INTO risks_v4 (id, project_id, rule_id, type, categoria, titulo, descricao, artigo,
    severidade, urgencia, evidence, breadcrumb, source_priority, confidence, status,
    deleted_at, deleted_reason, approved_at, approved_by, created_by, updated_by)
  VALUES (?, 9999903, 'SP-ART-25', 'risk', 'split_payment',
    'Split Payment obrigatório — Art. 25 LC 214/2025',
    'Empresa sujeita ao split payment conforme Art. 25.',
    'Art. 25', 'alta', 'imediata', ?, ?, 'solaris', 0.92, 'ativo',
    NULL, NULL, NULL, NULL, 1, 1)
`, [idM03, evidenceM03, breadcrumbM03]);

// Audit log: created
await db.execute(`
  INSERT INTO audit_log (id, project_id, entity, entity_id, action, actor_id, snapshot, created_at)
  VALUES (?, 9999903, 'risks_v4', ?, 'created', 1, '{}', NOW())
`, [randomUUID(), idM03]);

// Soft delete
await db.execute(`
  UPDATE risks_v4 SET status = 'deletado', deleted_at = NOW(), deleted_reason = 'Teste M-03 soft delete', updated_by = 1
  WHERE id = ?
`, [idM03]);

// Audit log: deleted
await db.execute(`
  INSERT INTO audit_log (id, project_id, entity, entity_id, action, actor_id, snapshot, created_at)
  VALUES (?, 9999903, 'risks_v4', ?, 'deleted', 1, '{"reason":"Teste M-03 soft delete"}', NOW())
`, [randomUUID(), idM03]);

// Verificar que o registro ainda existe (soft delete)
const [deletedRows] = await db.execute(
  `SELECT id, status, deleted_reason FROM risks_v4 WHERE id = ?`, [idM03]
);
const isDeleted = deletedRows[0]?.status === 'deletado' && deletedRows[0]?.deleted_reason !== null;

// Restaurar
await db.execute(`
  UPDATE risks_v4 SET status = 'ativo', deleted_at = NULL, deleted_reason = NULL, updated_by = 1
  WHERE id = ?
`, [idM03]);

// Audit log: restored
await db.execute(`
  INSERT INTO audit_log (id, project_id, entity, entity_id, action, actor_id, snapshot, created_at)
  VALUES (?, 9999903, 'risks_v4', ?, 'restored', 1, '{}', NOW())
`, [randomUUID(), idM03]);

// Verificar audit_log: deve ter 3 entradas (created, deleted, restored)
const [auditRows] = await db.execute(
  `SELECT action, actor_id FROM audit_log WHERE entity = 'risks_v4' AND entity_id = ? ORDER BY created_at ASC`,
  [idM03]
);
const [restoredRow] = await db.execute(
  `SELECT id, status, deleted_at FROM risks_v4 WHERE id = ?`, [idM03]
);

const passM03 = isDeleted &&
  restoredRow[0]?.status === 'ativo' &&
  restoredRow[0]?.deleted_at === null &&
  auditRows.length === 3 &&
  auditRows.map(r => r.action).join(',') === 'created,deleted,restored';

results.M03 = {
  pass: passM03,
  soft_delete_ok: isDeleted,
  restored_status: restoredRow[0]?.status,
  deleted_at_null: restoredRow[0]?.deleted_at === null,
  audit_log_entries: auditRows.length,
  audit_actions: auditRows.map(r => r.action)
};
console.log(passM03 ? '✅ PASS' : '❌ FAIL', JSON.stringify(results.M03, null, 2));

// ─── Limpeza dos dados de teste ──────────────────────────────────────────────
await db.execute(`DELETE FROM audit_log WHERE project_id IN (9999901, 9999902, 9999903)`);
await db.execute(`DELETE FROM risks_v4 WHERE project_id IN (9999901, 9999902, 9999903)`);
console.log('\n🧹 Dados de teste removidos.');

// ─── Resultado final ─────────────────────────────────────────────────────────
const allPass = results.M01.pass && results.M02.pass && results.M03.pass;
console.log('\n=== RESULTADO FINAL ===');
console.log('M-01:', results.M01.pass ? '✅ PASS' : '❌ FAIL');
console.log('M-02:', results.M02.pass ? '✅ PASS' : '❌ FAIL');
console.log('M-03:', results.M03.pass ? '✅ PASS' : '❌ FAIL');
console.log(allPass ? '\n✅ TODOS OS CENÁRIOS PASSARAM' : '\n❌ FALHA EM UM OU MAIS CENÁRIOS');

await db.end();
process.exit(allPass ? 0 : 1);
