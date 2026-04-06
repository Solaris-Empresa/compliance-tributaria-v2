// E2E Test Script — Decision Kernel
// Passos 1-3: Criar projeto, verificar operationProfile, acionar engine
import { getDb, createProject } from './db';
import { analyzeEngineGaps } from './lib/engine-gap-analyzer';
import { projects } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  // Passo 1 — Criar projeto de teste
  console.log('=== PASSO 1 — CRIAR PROJETO ===');
  const operationProfile = {
    operationType: 'comercio',
    clientType: 'b2b',
    multiState: false,
    principaisProdutos: [
      { ncm_code: '1006.40.00', descricao: 'Arroz quebrado' }
    ],
    principaisServicos: []
  };

  // clientId=9999 (demo-client), createdById=1 (equipe_solaris)
  const projectId = await createProject({
    name: 'TESTE-E2E-ENGINE-' + Date.now(),
    description: 'Projeto de teste para validação do Decision Kernel engine',
    operationProfile: JSON.stringify(operationProfile),
    status: 'rascunho',
    clientId: 9999,
    createdById: 1,
    createdByRole: 'equipe_solaris'
  });

  console.log('PROJECT_ID:', projectId);

  // Passo 2 — Verificar operationProfile salvo
  console.log('\n=== PASSO 2 — VERIFICAR OPERATION PROFILE ===');
  const db = await getDb();
  if (!db) { console.error('DB não disponível'); process.exit(1); }

  const rows = await db.select({
    id: projects.id,
    produtos: sql<string>`JSON_EXTRACT(operationProfile, '$.principaisProdutos')`,
    tipo: sql<string>`JSON_EXTRACT(operationProfile, '$.operationType')`
  }).from(projects).where(eq(projects.id, projectId));

  console.log(JSON.stringify(rows[0], null, 2));

  const produtosRaw = rows[0]?.produtos;
  if (!produtosRaw || produtosRaw === 'null') {
    console.error('RRI — principaisProdutos retornou null. Parando.');
    process.exit(1);
  }
  console.log('Critério de aprovação Passo 2: PASS — produtos não é null');

  // Passo 3 — Acionar analyzeEngineGaps diretamente
  console.log('\n=== PASSO 3 — ACIONAR ENGINE ===');
  console.log('Acionando engine para project', projectId);
  const ncmCodes = ['1006.40.00'];
  const nbsCodes: string[] = [];
  const engineResult = await analyzeEngineGaps(projectId, ncmCodes, nbsCodes);
  console.log('Engine concluído:', JSON.stringify(engineResult));

  process.exit(0);
}

main().catch(e => { console.error('ERRO:', e.message, '\n', e.stack); process.exit(1); });
