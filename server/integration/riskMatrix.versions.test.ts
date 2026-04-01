import { describe, it, expect, beforeEach } from 'vitest';
import * as db from '../db';

describe('Risk Matrix Versions - Database Functions', () => {
  let testProjectId: number;
  let testUserId: number;

  beforeEach(async () => {
    // Criar usuário de teste
    await db.upsertUser({
      openId: 'test-openid-versions-db',
      name: 'Test User Versions DB',
      email: 'test.versions.db@example.com',
      role: 'equipe_solaris',
    });

    const user = await db.getUserByOpenId('test-openid-versions-db');
    if (!user) throw new Error('Failed to create test user');
    testUserId = user.id;

    // Criar projeto de teste
    const project = await db.createProject({
      name: 'Projeto Teste Versões DB',
      clientId: testUserId,
      createdById: testUserId,
      createdByRole: 'equipe_solaris',
      status: 'rascunho',
    });
    testProjectId = project.id;
  });

  it('deve salvar versão da matriz de riscos', async () => {
    const versionData = {
      projectId: testProjectId,
      versionNumber: 1,
      snapshotData: JSON.stringify([
        {
          id: 1,
          projectId: testProjectId,
          riskDescription: 'Risco teste 1',
          probability: 'alta',
          impact: 'alto',
        },
      ]),
      riskCount: 1,
      createdBy: testUserId,
      createdByName: 'Test User',
      triggerType: 'auto_generation' as const,
    };

    await db.saveRiskMatrixVersion(versionData);

    const versions = await db.getRiskMatrixVersions(testProjectId);
    expect(versions.length).toBe(1);
    expect(versions[0].versionNumber).toBe(1);
    expect(versions[0].riskCount).toBe(1);
    expect(versions[0].triggerType).toBe('auto_generation');
  });

  it('deve listar versões ordenadas por número decrescente', async () => {
    // Salvar 3 versões
    for (let i = 1; i <= 3; i++) {
      await db.saveRiskMatrixVersion({
        projectId: testProjectId,
        versionNumber: i,
        snapshotData: JSON.stringify([{ riskDescription: `Risco ${i}` }]),
        riskCount: 1,
        createdBy: testUserId,
        createdByName: 'Test User',
        triggerType: 'manual_regeneration',
      });
    }

    const versions = await db.getRiskMatrixVersions(testProjectId);
    expect(versions.length).toBe(3);
    expect(versions[0].versionNumber).toBe(3);
    expect(versions[1].versionNumber).toBe(2);
    expect(versions[2].versionNumber).toBe(1);
  });

  it('deve recuperar versão específica', async () => {
    await db.saveRiskMatrixVersion({
      projectId: testProjectId,
      versionNumber: 5,
      snapshotData: JSON.stringify([{ riskDescription: 'Risco versão 5' }]),
      riskCount: 1,
      createdBy: testUserId,
      createdByName: 'Test User',
      triggerType: 'prompt_edit',
    });

    const version = await db.getRiskMatrixVersion(testProjectId, 5);
    expect(version).toBeDefined();
    expect(version?.versionNumber).toBe(5);
    expect(version?.triggerType).toBe('prompt_edit');
  });

  it('deve retornar null para versão inexistente', async () => {
    const version = await db.getRiskMatrixVersion(testProjectId, 999);
    expect(version).toBeNull();
  });

  it('deve obter último número de versão', async () => {
    // Sem versões
    const latest1 = await db.getLatestVersionNumber(testProjectId);
    expect(latest1).toBe(0);

    // Com versões
    await db.saveRiskMatrixVersion({
      projectId: testProjectId,
      versionNumber: 1,
      snapshotData: '[]',
      riskCount: 0,
      createdBy: testUserId,
      createdByName: 'Test User',
      triggerType: 'auto_generation',
    });

    await db.saveRiskMatrixVersion({
      projectId: testProjectId,
      versionNumber: 2,
      snapshotData: '[]',
      riskCount: 0,
      createdBy: testUserId,
      createdByName: 'Test User',
      triggerType: 'manual_regeneration',
    });

    const latest2 = await db.getLatestVersionNumber(testProjectId);
    expect(latest2).toBe(2);
  });

  it('deve armazenar snapshot como JSON válido', async () => {
    const risks = [
      {
        id: 1,
        projectId: testProjectId,
        riskDescription: 'Risco A',
        probability: 'alta',
        impact: 'alto',
        treatmentStrategy: 'mitigar',
        suggestedControls: 'Controles A',
        expectedEvidence: 'Evidências A',
      },
      {
        id: 2,
        projectId: testProjectId,
        riskDescription: 'Risco B',
        probability: 'media',
        impact: 'medio',
        treatmentStrategy: 'aceitar',
        suggestedControls: 'Controles B',
        expectedEvidence: 'Evidências B',
      },
    ];

    await db.saveRiskMatrixVersion({
      projectId: testProjectId,
      versionNumber: 1,
      snapshotData: JSON.stringify(risks),
      riskCount: risks.length,
      createdBy: testUserId,
      createdByName: 'Test User',
      triggerType: 'auto_generation',
    });

    const version = await db.getRiskMatrixVersion(testProjectId, 1);
    expect(version).toBeDefined();
    
    const parsedRisks = JSON.parse(version!.snapshotData);
    expect(parsedRisks.length).toBe(2);
    expect(parsedRisks[0].riskDescription).toBe('Risco A');
    expect(parsedRisks[1].riskDescription).toBe('Risco B');
  });

  it('deve armazenar metadados corretos (createdBy, triggerType)', async () => {
    await db.saveRiskMatrixVersion({
      projectId: testProjectId,
      versionNumber: 1,
      snapshotData: '[]',
      riskCount: 0,
      createdBy: testUserId,
      createdByName: 'João Silva',
      triggerType: 'manual_regeneration',
    });

    const version = await db.getRiskMatrixVersion(testProjectId, 1);
    expect(version?.createdBy).toBe(testUserId);
    expect(version?.createdByName).toBe('João Silva');
    expect(version?.triggerType).toBe('manual_regeneration');
    expect(version?.createdAt).toBeInstanceOf(Date);
  });
});
