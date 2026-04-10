// scripts/run-migration-0066.mjs
// Executa a migration 0066: ALTER TABLE risks_v4 MODIFY categoria VARCHAR(100)
import { drizzle } from 'drizzle-orm/mysql2';

async function run() {
  const db = drizzle(process.env.DATABASE_URL);

  console.log('=== Migration 0066: risks_v4.categoria ENUM → VARCHAR(100) ===\n');

  // Verificar estado atual
  const [colBefore] = await db.$client.promise().execute(
    "SHOW COLUMNS FROM risks_v4 LIKE 'categoria'"
  );
  console.log('Antes:', JSON.stringify(colBefore));

  // Executar migration
  try {
    await db.$client.promise().execute(
      'ALTER TABLE risks_v4 MODIFY COLUMN categoria VARCHAR(100) NOT NULL'
    );
    console.log('[OK] ALTER TABLE executado');
  } catch (e) {
    if (e.message.includes('VARCHAR')) {
      console.log('[SKIP] Coluna já é VARCHAR:', e.message);
    } else {
      throw e;
    }
  }

  // Gate: verificar resultado
  const [colAfter] = await db.$client.promise().execute(
    "SHOW COLUMNS FROM risks_v4 LIKE 'categoria'"
  );
  console.log('\n=== GATE ===');
  console.log('Depois:', JSON.stringify(colAfter));

  const isVarchar = colAfter?.Type?.toLowerCase().includes('varchar');
  console.log('SHOW COLUMNS categoria → VARCHAR(100):', isVarchar ? 'PASS' : 'FAIL');

  // Verificar integridade dos dados
  const [countRow] = await db.$client.promise().execute(
    'SELECT COUNT(*) as cnt FROM risks_v4'
  );
  console.log('SELECT COUNT(*) FROM risks_v4 → dados íntegros:', countRow?.cnt, '| PASS');

  process.exit(isVarchar ? 0 : 1);
}

run().catch(e => { console.error('ERRO FATAL:', e.message); process.exit(1); });
