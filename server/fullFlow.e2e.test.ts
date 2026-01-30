import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';

let dbConnection: any;

describe('Fluxo Completo E2E - Projeto até Plano de Ação', () => {
  beforeAll(async () => {
    dbConnection = await getDb();
  });

  it('deve criar projeto e avançar até plano de ação validado', async () => {
    const timestamp = Date.now();
    
    console.log('\n🚀 Iniciando teste end-to-end completo...\n');

    // 1. Criar usuário equipe_solaris e cliente usando SQL direto
    await dbConnection.execute(`
      INSERT INTO users (openId, name, email, role, createdAt, updatedAt)
      VALUES ('test-solaris-${timestamp}', 'Test Solaris User', 'solaris-${timestamp}@example.com', 'equipe_solaris', NOW(), NOW())
    `);
    
    const userResult = await dbConnection.execute(`SELECT id FROM users WHERE openId = 'test-solaris-${timestamp}'`);
    const testUserId = (userResult as any)[0][0].id;
    
    await dbConnection.execute(`
      INSERT INTO users (openId, name, email, role, createdAt, updatedAt)
      VALUES ('test-client-${timestamp}', 'Test Client Company', 'client-${timestamp}@example.com', 'cliente', NOW(), NOW())
    `);
    
    const clientResult = await dbConnection.execute(`SELECT id FROM users WHERE openId = 'test-client-${timestamp}'`);
    const testClientId = (clientResult as any)[0][0].id;

    console.log(`✅ Usuários criados: Solaris ID ${testUserId}, Cliente ID ${testClientId}`);

    // 2. Criar projeto usando SQL direto
    await dbConnection.execute(`
      INSERT INTO projects (name, clientId, status, planPeriodMonths, createdById, createdByRole, taxRegime, businessType, companySize, createdAt, updatedAt)
      VALUES ('Teste E2E Completo ${timestamp}', ${testClientId}, 'rascunho', 12, ${testUserId}, 'equipe_solaris', 'lucro_real', 'comercio', 'media', NOW(), NOW())
    `);
    
    const projectResult = await dbConnection.execute(`SELECT id FROM projects WHERE name = 'Teste E2E Completo ${timestamp}'`);
    const testProjectId = (projectResult as any)[0][0].id;

    console.log(`✅ Projeto criado: ID ${testProjectId}`);

    // Criar caller tRPC
    const caller = appRouter.createCaller({
      user: { id: testUserId, name: 'Test Solaris User', role: 'equipe_solaris' },
      req: {} as any,
      res: {} as any,
    });

    // 3. Salvar Assessment Fase 1
    await caller.assessmentPhase1.save({
      projectId: testProjectId,
      taxRegime: 'lucro_real',
      businessType: 'comercio',
      companySize: 'media',
      annualRevenue: '75000000',
      employeeCount: 150,
      operatingStates: ['SP', 'RJ', 'MG'],
      hasBranches: true,
    });

    console.log('✅ Assessment Fase 1 salvo');

    // 4. Completar Fase 1 (gera perguntas Fase 2)
    await caller.assessmentPhase1.complete({ projectId: testProjectId });
    console.log('✅ Fase 1 completada, perguntas Fase 2 geradas');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Buscar perguntas Fase 2
    const phase2Data = await caller.assessmentPhase2.get({ projectId: testProjectId });
    const phase2Questions = phase2Data?.generatedQuestions ? JSON.parse(phase2Data.generatedQuestions) : [];
    console.log(`✅ ${phase2Questions.length} perguntas Fase 2 recuperadas`);

    // 6. Responder perguntas Fase 2
    const phase2Answers = phase2Questions.map(q => ({
      questionId: q.id,
      answer: 'Resposta de teste para validação E2E do fluxo completo.',
    }));

    await caller.assessmentPhase2.save({
      projectId: testProjectId,
      answers: phase2Answers,
    });

    console.log('✅ Assessment Fase 2 salvo');

    // 7. Completar Fase 2
    await caller.assessmentPhase2.complete({ projectId: testProjectId });
    console.log('✅ Fase 2 completada');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 8. Gerar Briefing
    console.log('⏳ Gerando briefing via LLM...');
    await caller.briefing.generate({ projectId: testProjectId });
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    const briefing = await caller.briefing.get({ projectId: testProjectId });
    expect(briefing).toBeDefined();
    expect(briefing?.summaryText).toBeDefined();
    console.log(`✅ Briefing gerado (${briefing?.summaryText.length} caracteres)`);

    // 9. Gerar Matriz de Riscos
    console.log('⏳ Gerando matriz de riscos via LLM...');
    await caller.riskMatrix.generate({ projectId: testProjectId });
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    const risks = await caller.riskMatrix.list({ projectId: testProjectId });
    expect(risks.length).toBeGreaterThan(0);
    console.log(`✅ Matriz de riscos gerada (${risks.length} riscos identificados)`);

    // 10. Gerar Plano de Ação
    console.log('⏳ Gerando plano de ação via LLM...');
    await caller.actionPlan.generate({ projectId: testProjectId, planPeriodMonths: 12 });
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    const actionPlan = await caller.actionPlan.get({ projectId: testProjectId });
    expect(actionPlan).toBeDefined();
    expect(actionPlan?.tasks).toBeDefined();
    
    const tasks = JSON.parse(actionPlan?.tasks || '[]');
    expect(tasks.length).toBeGreaterThan(0);
    
    console.log(`✅ Plano de ação gerado (${tasks.length} tarefas)`);

    // 11. Validar estrutura do plano de ação
    const firstTask = tasks[0];
    expect(firstTask).toHaveProperty('titulo');
    expect(firstTask).toHaveProperty('descricao');
    expect(firstTask).toHaveProperty('prazo');
    expect(firstTask).toHaveProperty('responsavel');
    expect(firstTask).toHaveProperty('prioridade');
    
    console.log(`✅ Estrutura do plano de ação validada`);
    console.log(`   Primeira tarefa: "${firstTask.titulo}"`);
    console.log(`   Prioridade: ${firstTask.prioridade}, Prazo: ${firstTask.prazo}`);

    // 12. Validar status do projeto
    const finalProject = await caller.projects.getById({ id: testProjectId });
    console.log(`✅ Status final do projeto: ${finalProject.status}`);

    console.log('\n🎉 TESTE END-TO-END COMPLETO COM SUCESSO!\n');
    console.log('📊 Resumo:');
    console.log(`   - Projeto ID: ${testProjectId}`);
    console.log(`   - Briefing: ${briefing?.summaryText.substring(0, 100)}...`);
    console.log(`   - Riscos identificados: ${risks.length}`);
    console.log(`   - Tarefas no plano: ${tasks.length}`);
    console.log(`   - Status: ${finalProject.status}`);
    
  }, 300000); // Timeout de 5 minutos
});
