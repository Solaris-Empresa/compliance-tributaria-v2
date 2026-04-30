/**
 * HOTFIX-P0 RETROATIVO — Blocos 1, 2, 3
 * Executa queries de snapshot, diagnóstico V5b, e cleanup projeto 2280002.
 */
import { getDb } from './server/db';

async function main() {
  const db = await getDb();
  if (!db) { console.log('DB unavailable'); process.exit(1); }

  console.log('============================================================');
  console.log('BLOCO 1 — SNAPSHOT RETROATIVO');
  console.log('============================================================');

  // A1: schema enum status atual
  console.log('\n--- A1: SHOW COLUMNS FROM projects WHERE Field = "status" ---');
  const [a1] = await db.execute("SHOW COLUMNS FROM projects WHERE Field = 'status'");
  console.log(JSON.stringify(a1, null, 2));

  // A2: confirmar perfil_entidade_confirmado presente
  console.log('\n--- A2: COLUMN_TYPE from INFORMATION_SCHEMA ---');
  const [a2] = await db.execute(`
    SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'status'
  `);
  console.log(JSON.stringify(a2, null, 2));

  // A3: confirmar 6 colunas archetype
  console.log('\n--- A3: archetype columns ---');
  const [a3] = await db.execute(`
    SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' 
      AND COLUMN_NAME LIKE 'archetype%'
  `);
  console.log(JSON.stringify(a3, null, 2));

  // A4: schema snapshot (text-based, since mysqldump not available for TiDB)
  console.log('\n--- A4: SHOW CREATE TABLE projects (schema snapshot) ---');
  const [a4] = await db.execute('SHOW CREATE TABLE projects');
  const createTableSQL = (a4 as any)[0]['Create Table'];
  // Write to file
  const fs = await import('fs');
  const crypto = await import('crypto');
  const snapshotDir = '/tmp/hotfix-p0-retro';
  fs.mkdirSync(snapshotDir, { recursive: true });
  const snapshotPath = `${snapshotDir}/projects-schema-post-alter-2026-04-30.sql`;
  fs.writeFileSync(snapshotPath, createTableSQL + '\n');
  const hash = crypto.createHash('sha256').update(createTableSQL + '\n').digest('hex');
  console.log(`Snapshot written to: ${snapshotPath}`);
  console.log(`SHA256: ${hash}`);

  // A5: validar projeto 2280002 funcional
  console.log('\n--- A5: projeto 2280002 ---');
  const [a5] = await db.execute(`
    SELECT id, name, status, JSON_LENGTH(archetype) AS json_keys, 
           archetypePerfilHash, archetypeRulesHash, archetypeConfirmedAt
    FROM projects WHERE id = 2280002
  `);
  console.log(JSON.stringify(a5, null, 2));

  console.log('\n============================================================');
  console.log('BLOCO 2 — DIAGNÓSTICO V5b');
  console.log('============================================================');

  // D1: distribuição createdBy
  console.log('\n--- D1: distribuição createdBy ---');
  const [d1] = await db.execute(`
    SELECT createdById, createdByRole, COUNT(*) AS qtd 
    FROM projects GROUP BY createdById, createdByRole 
    ORDER BY qtd DESC LIMIT 15
  `);
  console.log(JSON.stringify(d1, null, 2));

  // D2: janela temporal
  console.log('\n--- D2: janela temporal ---');
  const [d2] = await db.execute(`
    SELECT 
      MIN(createdAt) AS oldest, MAX(createdAt) AS newest,
      COUNT(*) AS total,
      COUNT(CASE WHEN createdAt >= '2026-04-29 00:00:00' THEN 1 END) AS apr29,
      COUNT(CASE WHEN createdAt >= '2026-04-30 00:00:00' THEN 1 END) AS apr30
    FROM projects
  `);
  console.log(JSON.stringify(d2, null, 2));

  // D3: prefixos teste
  console.log('\n--- D3: prefixos teste ---');
  const [d3] = await db.execute(`
    SELECT 
      COUNT(CASE WHEN name LIKE 'TEST_%' THEN 1 END) AS test_prefix,
      COUNT(CASE WHEN name LIKE 'TEST_M2_%' THEN 1 END) AS test_m2,
      COUNT(CASE WHEN name LIKE 'TEST_HOTFIX_%' THEN 1 END) AS test_hotfix
    FROM projects
  `);
  console.log(JSON.stringify(d3, null, 2));

  // D4: archetype confirmado
  console.log('\n--- D4: archetype confirmado ---');
  const [d4] = await db.execute(`
    SELECT id, name, archetypeConfirmedAt FROM projects 
    WHERE archetype IS NOT NULL ORDER BY id
  `);
  console.log(JSON.stringify(d4, null, 2));

  console.log('\n============================================================');
  console.log('BLOCO 3 — CLEANUP PROJETO 2280002');
  console.log('============================================================');

  // Check dependent tables first
  console.log('\n--- Pre-cleanup counts ---');
  const tables = ['iagen_answers', 'solaris_answers', 'project_status_log'];
  for (const t of tables) {
    try {
      const [cnt] = await db.execute(`SELECT COUNT(*) AS cnt FROM ${t} WHERE project_id = 2280002`);
      console.log(`${t}: ${JSON.stringify(cnt)}`);
    } catch (e: any) {
      console.log(`${t}: table not found or error: ${e.message}`);
    }
  }

  // Also check other possible FK tables
  const extraTables = ['project_cnaes', 'diagnostic_results', 'risks', 'gap_analysis_results', 'compliance_plans'];
  for (const t of extraTables) {
    try {
      const [cnt] = await db.execute(`SELECT COUNT(*) AS cnt FROM \`${t}\` WHERE project_id = 2280002`);
      console.log(`${t}: ${JSON.stringify(cnt)}`);
    } catch (e: any) {
      console.log(`${t}: ${e.message?.includes('exist') ? 'table not found' : e.message}`);
    }
  }

  // Execute cleanup
  console.log('\n--- Executing cleanup ---');
  try {
    // Delete from dependent tables first
    for (const t of tables) {
      try {
        const [r] = await db.execute(`DELETE FROM ${t} WHERE project_id = 2280002`);
        console.log(`DELETE FROM ${t}: OK (${(r as any).affectedRows} rows)`);
      } catch (e: any) {
        console.log(`DELETE FROM ${t}: ${e.message}`);
      }
    }
    // Delete extra dependent tables
    for (const t of extraTables) {
      try {
        const [r] = await db.execute(`DELETE FROM \`${t}\` WHERE project_id = 2280002`);
        console.log(`DELETE FROM ${t}: OK (${(r as any).affectedRows} rows)`);
      } catch (e: any) {
        if (!e.message?.includes('exist')) {
          console.log(`DELETE FROM ${t}: ${e.message}`);
        }
      }
    }
    // Delete project itself
    const [delProject] = await db.execute('DELETE FROM projects WHERE id = 2280002');
    console.log(`DELETE FROM projects WHERE id = 2280002: OK (${(delProject as any).affectedRows} rows)`);
  } catch (e: any) {
    console.log(`Cleanup error: ${e.message}`);
  }

  // Verify RAG intact
  console.log('\n--- Post-cleanup verification ---');
  const [ragCount] = await db.execute('SELECT COUNT(*) AS cnt FROM ragDocuments');
  console.log(`ragDocuments count: ${JSON.stringify(ragCount)}`);
  
  const [projCount] = await db.execute('SELECT COUNT(*) AS cnt FROM projects');
  console.log(`projects count: ${JSON.stringify(projCount)}`);

  const [proj2280002] = await db.execute('SELECT COUNT(*) AS cnt FROM projects WHERE id = 2280002');
  console.log(`project 2280002 exists: ${JSON.stringify(proj2280002)}`);

  // Also cleanup 2280001 (first failed test project)
  console.log('\n--- Cleanup 2280001 (first test project) ---');
  try {
    for (const t of [...tables, ...extraTables]) {
      try {
        await db.execute(`DELETE FROM \`${t}\` WHERE project_id = 2280001`);
      } catch {}
    }
    const [del2280001] = await db.execute('DELETE FROM projects WHERE id = 2280001');
    console.log(`DELETE FROM projects WHERE id = 2280001: OK (${(del2280001 as any).affectedRows} rows)`);
  } catch (e: any) {
    console.log(`Cleanup 2280001 error: ${e.message}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
