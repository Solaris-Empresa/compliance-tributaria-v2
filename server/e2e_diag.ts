// Diagnóstico: verificar o que foi salvo no banco para o projeto de teste
import { getDb } from './db';
import { projects } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.error('DB null'); process.exit(1); }

  const PROJECT_ID = 2790002;

  // 1. Verificar o valor raw do campo operationProfile
  const raw = await db.select({
    id: projects.id,
    opRaw: projects.operationProfile,
    opType: sql<string>`typeof(operationProfile)`,
    // Tentar JSON_EXTRACT com o nome exato da coluna
    extract1: sql<string>`JSON_EXTRACT(operationProfile, '$')`,
    extract2: sql<string>`JSON_EXTRACT(operationProfile, '$.principaisProdutos')`,
  }).from(projects).where(eq(projects.id, PROJECT_ID));

  console.log('=== RAW QUERY ===');
  console.log(JSON.stringify(raw[0], null, 2));

  // 2. Verificar se o campo está como string serializada
  const opRaw = raw[0]?.opRaw;
  console.log('\n=== TIPO DO CAMPO ===');
  console.log('typeof opRaw:', typeof opRaw);
  console.log('opRaw value:', opRaw);

  if (typeof opRaw === 'string') {
    try {
      const parsed = JSON.parse(opRaw);
      console.log('\n=== PARSED ===');
      console.log(JSON.stringify(parsed, null, 2));
      console.log('principaisProdutos:', parsed.principaisProdutos);
    } catch (e) {
      console.error('Falha ao parsear:', e);
    }
  } else if (typeof opRaw === 'object') {
    console.log('\n=== JÁ É OBJETO ===');
    console.log(JSON.stringify(opRaw, null, 2));
  }

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
