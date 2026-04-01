import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import { db } from './db';

describe('riskMatrix.generate - Teste com SQL Direto', () => {
  it('deve gerar riscos automaticamente após criar briefing', async () => {
    // 1. Criar usuário e cliente usando SQL direto
    const timestamp = Date.now();
    
    await db.execute(`
      INSERT INTO user (openId, name, email, role, createdAt, updatedAt)
      VALUES ('test-user-${timestamp}', 'Test User Risk Gen', 'test-${timestamp}@example.com', 'equipe_solaris', NOW(), NOW())
    `);
    
    const userResult = await db.execute(`SELECT id FROM user WHERE openId = 'test-user-${timestamp}'`);
    const testUserId = (userResult as any)[0][0].id;
    
    await db.execute(`
      INSERT INTO user (openId, name, email, role, createdAt, updatedAt)
      VALUES ('test-client-${timestamp}', 'Test Client', 'client-${timestamp}@example.com', 'cliente', NOW(), NOW())
    `);
    
    const clientResult = await db.execute(`SELECT id FROM user WHERE openId = 'test-client-${timestamp}'`);
    const testClientId = (clientResult as any)[0][0].id;

    // 2. Criar projeto usando SQL direto
    await db.execute(`
      INSERT INTO projects (name, clientId, status, planPeriodMonths, createdById, createdByRole, taxRegime, businessType, companySize, createdAt, updatedAt)
      VALUES ('Teste Geração Riscos ${timestamp}', ${testClientId}, 'rascunho', 12, ${testUserId}, 'equipe_solaris', 'lucro_real', 'industria', 'media', NOW(), NOW())
    `);
    
    const projectResult = await db.execute(`SELECT id FROM projects WHERE name = 'Teste Geração Riscos ${timestamp}'`);
    const testProjectId = (projectResult as any)[0][0].id;

    console.log(`[Test] Projeto criado: ID ${testProjectId}, User: ${testUserId}, Client: ${testClientId}`);

    // 3. Salvar assessment Fase 1 usando SQL direto
    await db.execute(`
      INSERT INTO assessmentPhase1 (projectId, answers, createdAt, updatedAt)
      VALUES (${testProjectId}, '{"regime_tributario":"lucro_real","tipo_negocio":"industria","porte_empresa":"media","faturamento_anual":50000000}', NOW(), NOW())
    `);

    console.log('[Test] Assessment Fase 1 salvo');

    // 4. Gerar briefing
    const caller = appRouter.createCaller({
      user: { id: testUserId, name: 'Test User Risk Gen', role: 'equipe_solaris' },
      req: {} as any,
      res: {} as any,
    });

    await caller.briefing.generate({ projectId: testProjectId });
    console.log('[Test] Briefing gerado');

    // Aguardar briefing ser salvo
    await new Promise(resolve => setTimeout(resolve, 2000));

    const briefingResult = await db.execute(`SELECT summaryText FROM briefings WHERE projectId = ${testProjectId}`);
    expect((briefingResult as any)[0].length).toBeGreaterThan(0);
    console.log('[Test] Briefing salvo no banco');

    // 5. Gerar riscos
    console.log('[Test] Iniciando geração de riscos...');
    await caller.riskMatrix.generate({ projectId: testProjectId });

    // Aguardar riscos serem salvos
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 6. Validar riscos gerados
    const risksResult = await db.execute(`SELECT * FROM riskMatrix WHERE projectId = ${testProjectId}`);
    const risks = (risksResult as any)[0];
    
    console.log(`[Test] Riscos gerados: ${risks.length}`);

    expect(risks.length).toBeGreaterThan(0);
    expect(risks[0].riskDescription).toBeDefined();
    expect(risks[0].generatedByAI).toBe(1); // MySQL retorna 1 para true

    console.log('[Test] ✅ Geração de riscos bem-sucedida!');
    console.log(`[Test] Primeiro risco: ${risks[0].riskDescription.substring(0, 100)}...`);
  }, 180000); // Timeout de 180 segundos
});
