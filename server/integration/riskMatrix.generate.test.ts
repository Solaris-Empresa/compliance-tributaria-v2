import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import * as db from '../db';

describe('riskMatrix.generate - Teste End-to-End', () => {
  let testProjectId: number;
  let testUserId: number;
  const testUserName = 'Test User - Risk Generation';

  beforeAll(async () => {
    // Criar usuário de teste
    const user = await db.createUser({
      openId: `test-risk-gen-${Date.now()}`,
      name: testUserName,
      email: `test-risk-${Date.now()}@example.com`,
      role: 'equipe_solaris',
    });
    testUserId = user.id;

    // Criar cliente de teste primeiro
    const client = await db.createUser({
      openId: `test-client-${Date.now()}`,
      name: 'Test Client - Risk Generation',
      email: `test-client-${Date.now()}@example.com`,
      role: 'cliente',
    });

    // Criar projeto de teste
    const project = await db.createProject({
      name: `Teste Geração Riscos ${Date.now()}`,
      clientId: client.id,
      createdById: testUserId,
      createdByRole: 'equipe_solaris',
      status: 'rascunho',
      taxRegime: 'lucro_real',
      businessType: 'industria',
      companySize: 'media',
      planPeriodMonths: 12,
    });
    testProjectId = project.id;

    console.log(`[Test] Projeto criado: ID ${testProjectId}`);
  });

  it('deve gerar riscos automaticamente após criar briefing', async () => {
    // 1. Salvar assessment Fase 1
    await db.saveAssessmentPhase1({
      projectId: testProjectId,
      answers: JSON.stringify({
        regime_tributario: 'lucro_real',
        tipo_negocio: 'industria',
        porte_empresa: 'media',
        faturamento_anual: 50000000,
      }),
    });

    console.log('[Test] Assessment Fase 1 salvo');

    // 2. Gerar briefing (necessário para gerar riscos)
    const caller = appRouter.createCaller({
      user: { id: testUserId, name: testUserName, role: 'equipe_solaris' },
      req: {} as any,
      res: {} as any,
    });

    await caller.briefing.generate({ projectId: testProjectId });
    console.log('[Test] Briefing gerado');

    // Aguardar briefing ser salvo
    await new Promise(resolve => setTimeout(resolve, 1000));

    const briefing = await db.getBriefing(testProjectId);
    expect(briefing).toBeDefined();
    expect(briefing?.summaryText).toBeDefined();

    // 3. Gerar riscos
    console.log('[Test] Iniciando geração de riscos...');
    await caller.riskMatrix.generate({ projectId: testProjectId });

    // Aguardar riscos serem salvos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Validar riscos gerados
    const risks = await db.getRiskMatrix(testProjectId);
    console.log(`[Test] Riscos gerados: ${risks.length}`);

    expect(risks.length).toBeGreaterThan(0);
    expect(risks[0].riskDescription).toBeDefined();
    expect(risks[0].probability).toBeDefined();
    expect(risks[0].impact).toBeDefined();
    expect(risks[0].generatedByAI).toBe(true);

    console.log('[Test] ✅ Geração de riscos bem-sucedida!');
  }, 180000); // Timeout de 180 segundos
});
