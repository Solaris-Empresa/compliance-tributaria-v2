// scripts/run-migration-0065.mjs
// Executa a migration 0065_risk_categories.sql no banco TiDB
import { drizzle } from 'drizzle-orm/mysql2';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const db = drizzle(process.env.DATABASE_URL);
  const sqlFile = join(__dirname, '../drizzle/0065_risk_categories.sql');
  const fullSql = readFileSync(sqlFile, 'utf8');

  // Remover comentários de linha e dividir por ';'
  const lines = fullSql.split('\n').filter(l => !l.trim().startsWith('--'));
  const cleaned = lines.join('\n');
  // Dividir em statements: CREATE TABLE e INSERT
  const raw = cleaned.split(';');
  const statements = raw.map(s => s.trim()).filter(s => s.length > 10);

  console.log(`Executando ${statements.length} statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 70).replace(/\s+/g, ' ');
    try {
      await db.$client.promise().execute(stmt);
      console.log(`[OK] stmt ${i + 1}: ${preview}...`);
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('Duplicate entry')) {
        console.log(`[SKIP] stmt ${i + 1} (já existe): ${preview}...`);
      } else {
        console.error(`[ERRO] stmt ${i + 1}: ${e.message}`);
        console.error('SQL:', stmt.substring(0, 200));
      }
    }
  }

  // Gate: verificar contagem
  const [rows1] = await db.$client.promise().execute(
    "SELECT COUNT(*) as cnt FROM risk_categories WHERE status='ativo'"
  );
  console.log('\n=== GATE ===');
  console.log('risk_categories ativo:', JSON.stringify(rows1));

  const [rows2] = await db.$client.promise().execute(
    "SELECT codigo, vigencia_fim FROM risk_categories WHERE vigencia_fim IS NOT NULL"
  );
  console.log('vigencia_fim NOT NULL:', JSON.stringify(rows2));

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
