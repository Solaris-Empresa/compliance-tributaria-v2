import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '/home/ubuntu/compliance-tributaria-v2/.env' });

const pool = mysql.createPool(process.env.DATABASE_URL);

const [reqs] = await pool.query('SELECT id, code, domain, gap_level, legal_reference, tags FROM regulatory_requirements_v3 WHERE active=1');

let updated = 0;
for (const req of reqs) {
  const tags = JSON.parse(req.tags || '[]');
  const domain = req.domain || '';
  const code = req.code || '';

  // Determinar layer baseado no domínio e código
  let layer = 'universal';
  if (domain.includes('governanca') || domain.includes('cadastro') || domain.includes('contratos')) {
    layer = 'corporativo';
  } else if (domain.includes('sistemas') || domain.includes('documentos') || domain.includes('apuracao') || domain.includes('split') || domain.includes('conformidade')) {
    layer = 'operacional';
  } else if (domain.includes('classificacao') || domain.includes('regimes') || domain.includes('creditos') || domain.includes('incentivos')) {
    layer = 'cnae';
  }
  if (code.startsWith('REQ-GOV') || code.startsWith('REQ-CAD') || code.startsWith('REQ-CTR')) layer = 'corporativo';
  if (code.startsWith('REQ-SIS') || code.startsWith('REQ-DOC') || code.startsWith('REQ-APU') || code.startsWith('REQ-SPL') || code.startsWith('REQ-CON')) layer = 'operacional';
  if (code.startsWith('REQ-CLS') || code.startsWith('REQ-REG') || code.startsWith('REQ-CRE') || code.startsWith('REQ-INC')) layer = 'cnae';

  // source_reference
  let sourceRef = req.legal_reference || null;
  if (!sourceRef) {
    if (code.includes('LC214')) sourceRef = 'LC 214/2024';
    else if (code.includes('EC132')) sourceRef = 'EC 132/2023';
    else if (code.includes('LC224')) sourceRef = 'LC 224/2024';
    else sourceRef = 'EC 132/2023, LC 214/2024';
  }

  // regime_scope
  const regimeTags = tags.filter(t => ['simples_nacional','lucro_presumido','lucro_real','mei','todos'].includes(t));
  const regimeScope = regimeTags.length > 0 ? JSON.stringify(regimeTags) : null;

  // porte_scope
  const porteTags = tags.filter(t => ['mei','pequena','media','grande','todos'].includes(t));
  const porteScope = porteTags.length > 0 ? JSON.stringify(porteTags) : null;

  await pool.query(
    'UPDATE regulatory_requirements_v3 SET layer=?, source_reference=?, regime_scope=?, porte_scope=? WHERE id=?',
    [layer, sourceRef, regimeScope, porteScope, req.id]
  );
  updated++;
}

console.log('Requisitos atualizados:', updated);

const [dist] = await pool.query('SELECT layer, COUNT(*) as total FROM regulatory_requirements_v3 WHERE active=1 GROUP BY layer ORDER BY total DESC');
console.log('\n=== DISTRIBUIÇÃO POR LAYER ===');
dist.forEach(d => console.log(d.layer + ': ' + d.total));

const [sample] = await pool.query('SELECT code, layer, source_reference FROM regulatory_requirements_v3 WHERE active=1 ORDER BY id LIMIT 8');
console.log('\n=== AMOSTRA COM CAMPOS NOVOS ===');
sample.forEach(r => console.log(r.code + ' | layer: ' + r.layer + ' | source: ' + r.source_reference));

await pool.end();
