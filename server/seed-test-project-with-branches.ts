/**
 * Script para criar projeto de teste completo com ramos de atividade
 * 
 * Este script cria um projeto de demonstração com:
 * - Dados básicos do projeto
 * - 3 ramos de atividade (CNAEs)
 * - Assessment Fase 1 preenchido
 * 
 * Uso: node --loader ts-node/esm server/seed-test-project-with-branches.ts
 */

import { getDb } from './db.js';
import { projects, projectBranches, assessmentPhase1, activityBranches } from '../drizzle/schema.js';

async function seedTestProject() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  console.log('🚀 Criando projeto de teste completo...\n');

  try {
    // 1. Criar projeto
    console.log('1️⃣ Criando projeto...');
    const projectResult = await db.insert(projects).values({
      name: 'Projeto Teste - Planos por Ramo v1.0',
      description: 'Projeto de demonstração da funcionalidade de planos de ação por ramo de atividade',
      clientId: 1, // Assumindo que cliente 1 existe
      createdById: 1, // Assumindo que usuário 1 existe
      status: 'em_andamento',
    }) as any;
    
    const projectId = Number(projectResult[0]?.insertId || projectResult.insertId);
    console.log(`✅ Projeto criado: ID ${projectId}\n`);

    // 2. Buscar 3 ramos de atividade existentes
    console.log('2️⃣ Buscando ramos de atividade...');
    const branches = await db.select().from(activityBranches).limit(3);
    
    if (branches.length === 0) {
      console.error('❌ Nenhum ramo de atividade encontrado no banco. Execute seed de ramos primeiro.');
      process.exit(1);
    }

    console.log(`✅ Encontrados ${branches.length} ramos:\n`);
    branches.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.code} - ${b.name}`);
    });
    console.log('');

    // 3. Associar ramos ao projeto
    console.log('3️⃣ Associando ramos ao projeto...');
    for (const branch of branches) {
      await db.insert(projectBranches).values({
        projectId: projectId,
        branchId: branch.id,
      });
    }
    console.log(`✅ ${branches.length} ramos associados ao projeto\n`);

    // 4. Criar Assessment Fase 1
    console.log('4️⃣ Criando Assessment Fase 1...');
    await db.insert(assessmentPhase1).values({
      projectId: projectId,
      taxRegime: 'lucro_real',
      companySize: 'media',
      annualRevenue: 15000000,
      businessSector: 'saude',
      mainActivity: 'Serviços de tecnologia médica',
      employeeCount: 90,
      hasAccountingDept: 'sim',
      currentERPSystem: 'SAP',
      mainChallenges: 'Adaptação aos novos tributos IBS/CBS, gestão de créditos tributários',
      complianceGoals: 'Conformidade 100% até 2026, otimização de carga tributária',
    });
    console.log('✅ Assessment Fase 1 criado\n');

    // 5. Resumo final
    console.log('🎉 PROJETO DE TESTE CRIADO COM SUCESSO!\n');
    console.log('📊 Resumo:');
    console.log(`   - Projeto ID: ${projectId}`);
    console.log(`   - Nome: Projeto Teste - Planos por Ramo v1.0`);
    console.log(`   - Ramos cadastrados: ${branches.length}`);
    console.log(`   - Assessment Fase 1: ✅ Preenchido\n`);
    console.log('🔗 Próximos passos:');
    console.log(`   1. Acesse: /projetos/${projectId}/plano-acao`);
    console.log(`   2. A seção "Planos de Ação por Ramo" estará visível`);
    console.log(`   3. Clique em "Gerar Planos por Ramo" para testar\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar projeto de teste:', error);
    process.exit(1);
  }
}

seedTestProject();
