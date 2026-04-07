import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// PASSO 1 - Gaps sem source_reference direto (sem JOIN)
const [orphans] = await conn.execute(`
  SELECT g.id, g.project_id, g.source_reference, g.source, g.created_at
  FROM project_gaps_v3 g
  WHERE g.source_reference IS NULL
  ORDER BY g.id DESC
  LIMIT 15
`);
console.log('PASSO1_TOTAL:', orphans.length);
orphans.forEach(r => console.log('GAP:', JSON.stringify({id:r.id, project_id:r.project_id, source:r.source, created_at:r.created_at?.toISOString?.() ?? r.created_at})));

// Verificar se os project_ids existem na tabela projects
if (orphans.length > 0) {
  const pids = [...new Set(orphans.map(r => r.project_id))];
  const placeholders = pids.map(() => '?').join(',');
  const [projs] = await conn.execute(`SELECT id, name, createdAt FROM projects WHERE id IN (${placeholders})`, pids);
  console.log('\nPROJETOS_EXISTEM:', projs.length);
  projs.forEach(p => console.log('PROJ:', JSON.stringify({id:p.id, name:p.name, createdAt:p.createdAt?.toISOString?.() ?? p.createdAt})));
  
  // Gaps órfãos (sem projeto correspondente)
  const existingIds = new Set(projs.map(p => p.id));
  const orphanGaps = orphans.filter(g => !existingIds.has(g.project_id));
  console.log('\nGAPS_ORFAOS_SEM_PROJETO:', orphanGaps.length);
  orphanGaps.forEach(g => console.log('ORFAO:', JSON.stringify({id:g.id, project_id:g.project_id})));
  
  // Para projetos que existem: verificar data de criação
  if (projs.length > 0) {
    console.log('\nCLASSIFICACAO_POR_DATA:');
    projs.forEach(p => {
      const dt = new Date(p.createdAt);
      const cutoff = new Date('2026-04-07T00:00:00Z');
      const origem = dt < cutoff ? 'pre_pr370_legado' : 'pos_pr370_possivel_bug';
      console.log(`  ${p.name}: ${origem} (${dt.toISOString()})`);
    });
  }
}

// PASSO 1d - Rastreabilidade 100% pós-PR #370
const [p1d] = await conn.execute(`
  SELECT COUNT(*) as total_gaps, COUNT(source_reference) as com_rastreabilidade,
         COUNT(*) - COUNT(source_reference) as sem_rastreabilidade
  FROM project_gaps_v3 g
  JOIN projects p ON p.id = g.project_id
  WHERE p.createdAt >= '2026-04-07 00:00:00'
`);
console.log('\nPASSO1D_POS_PR370:', JSON.stringify(p1d[0]));

// PASSO 5 - Controle: gaps com source_reference recentes
const [p5] = await conn.execute(`
  SELECT g.id, g.project_id, g.source_reference, g.source, g.created_at
  FROM project_gaps_v3 g
  JOIN projects p ON p.id = g.project_id
  WHERE g.source_reference IS NOT NULL AND p.createdAt >= '2026-04-06 00:00:00'
  ORDER BY g.created_at DESC LIMIT 5
`);
console.log('\nPASSO5_CONTROLE:', JSON.stringify(p5.map(r => ({id:r.id, source:r.source, source_reference:r.source_reference}))));

await conn.end();
