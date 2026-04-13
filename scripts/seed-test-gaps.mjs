import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar requirements com risk_category_code
const [reqs] = await conn.execute(
  'SELECT id, code, name, domain, risk_category_code, source_reference FROM regulatory_requirements_v3 WHERE risk_category_code IS NOT NULL LIMIT 30'
);
console.log('Requirements disponíveis:', reqs.length);

let inserted = 0;
let firstErr = null;
for (const req of reqs) {
  try {
    await conn.execute(
      `INSERT INTO project_gaps_v3 
       (client_id, project_id, requirement_id, requirement_code, requirement_name, domain,
        gap_level, gap_type, compliance_status, criticality,
        evidence_status, operational_dependency,
        score, risk_level, priority_score, action_priority, estimated_days,
        gap_description, deterministic_reason, unmet_criteria, recommended_actions,
        risk_category_code, source, source_reference,
        created_at, updated_at)
       VALUES (1, 1, ?, ?, ?, ?,
        'operacional', 'normativo', 'nao_atendido', 'alta',
        'ausente', 'alta',
        75, 'alto', 75, 'curto_prazo', 30,
        'Gap de conformidade identificado para teste Z-13.5',
        'Requisito não atendido conforme avaliação determinística',
        'Critério de conformidade não satisfeito',
        'Implementar controles de conformidade necessários',
        ?, 'cnae', ?,
        NOW(), NOW())`,
      [req.id, req.code, req.name || req.code, req.domain,
       req.risk_category_code, req.source_reference || '']
    );
    inserted++;
  } catch (e) {
    if (!firstErr) firstErr = e.message.substring(0, 150);
  }
}

if (firstErr) console.log('Primeiro erro:', firstErr);
console.log('Gaps inseridos:', inserted);

const [r] = await conn.execute('SELECT COUNT(*) as n FROM project_gaps_v3 WHERE project_id = 1');
console.log('Total gaps projeto 1:', r[0].n);

const [r2] = await conn.execute(
  'SELECT risk_category_code, COUNT(*) as total FROM project_gaps_v3 WHERE project_id = 1 GROUP BY risk_category_code ORDER BY total DESC'
);
console.log('Distribuição por categoria:');
r2.forEach(row => console.log('  ' + row.risk_category_code + ': ' + row.total));

await conn.end();
