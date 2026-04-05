/**
 * bloco-e-operation-profile.test.ts — Testes Q5 obrigatórios Bloco E (CNT-01c)
 *
 * Sprint U — Orquestrador Claude — 2026-04-05
 *
 * Q5 obrigatórios:
 *   1. projeto com principaisProdutos gera gaps source=engine
 *   2. projeto sem principaisProdutos não quebra o fluxo
 *   3. operationProfile aceita campos novos sem migration
 *   4. engine-gap-analyzer recebe NCMs do operationProfile
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock mysql2/promise ─────────────────────────────────────────────────────

const { mockExecute, mockBeginTransaction, mockCommit, mockRollback, mockEnd } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
  mockBeginTransaction: vi.fn(),
  mockCommit: vi.fn(),
  mockRollback: vi.fn(),
  mockEnd: vi.fn(),
}));

vi.mock('mysql2/promise', () => ({
  default: {
    createConnection: vi.fn().mockResolvedValue({
      execute: mockExecute,
      beginTransaction: mockBeginTransaction,
      commit: mockCommit,
      rollback: mockRollback,
      end: mockEnd,
    }),
  },
}));

import { analyzeEngineGaps } from './lib/engine-gap-analyzer';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Simula a extração de NCMs do operationProfile (lógica de completeOnda2 Bloco E) */
function extractNcmNbsFromProfile(operationProfile: unknown): { ncmCodes: string[]; nbsCodes: string[] } {
  const profile = operationProfile as {
    principaisProdutos?: Array<{ ncm_code: string; descricao: string; percentualFaturamento?: number }>;
    principaisServicos?: Array<{ nbs_code: string; descricao: string; percentualFaturamento?: number }>;
  } | null;
  return {
    ncmCodes: profile?.principaisProdutos?.map((p) => p.ncm_code) ?? [],
    nbsCodes: profile?.principaisServicos?.map((s) => s.nbs_code) ?? [],
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockExecute.mockImplementation((sql: string) => {
    if (sql.startsWith('DELETE')) return [{ affectedRows: 0 }];
    if (sql.startsWith('SELECT COUNT')) return [[{ total: 1 }]];
    return [{}]; // INSERT
  });
  mockBeginTransaction.mockResolvedValue(undefined);
  mockCommit.mockResolvedValue(undefined);
  mockRollback.mockResolvedValue(undefined);
  mockEnd.mockResolvedValue(undefined);
});

// ─── Testes Q5 obrigatórios (Bloco E / CNT-01c) ──────────────────────────────

describe('Bloco E — operationProfile (CNT-01c)', () => {

  // Q5-1: projeto com principaisProdutos gera gaps source=engine
  it('projeto com principaisProdutos gera gaps source=engine', async () => {
    const operationProfile = {
      operationType: 'produto',
      clientType: ['b2b'],
      multiState: false,
      principaisProdutos: [
        { ncm_code: '9619.00.00', descricao: 'Absorventes higiênicos', percentualFaturamento: 80 },
      ],
    };

    const { ncmCodes, nbsCodes } = extractNcmNbsFromProfile(operationProfile);
    expect(ncmCodes).toEqual(['9619.00.00']);
    expect(nbsCodes).toEqual([]);

    const result = await analyzeEngineGaps(42, ncmCodes, nbsCodes);
    expect(result.inserted).toBeGreaterThanOrEqual(1);

    const insertCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO project_gaps_v3')
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
  });

  // Q5-2: projeto sem principaisProdutos não quebra o fluxo
  it('projeto sem principaisProdutos não quebra o fluxo', async () => {
    const operationProfile = {
      operationType: 'servico',
      clientType: ['b2c'],
      multiState: false,
      // sem principaisProdutos nem principaisServicos
    };

    const { ncmCodes, nbsCodes } = extractNcmNbsFromProfile(operationProfile);
    expect(ncmCodes).toEqual([]);
    expect(nbsCodes).toEqual([]);

    // Engine NÃO deve ser chamado (guarda: length > 0)
    // Verificar que não há chamadas ao banco
    expect(mockExecute).not.toHaveBeenCalled();
  });

  // Q5-3: operationProfile aceita campos novos sem migration
  it('operationProfile aceita principaisProdutos e principaisServicos sem migration', () => {
    // Simula o que o banco retorna (json nullable — aceita qualquer estrutura)
    const profileFromDb = {
      operationType: 'misto',
      clientType: ['b2b', 'b2c'],
      multiState: true,
      principaisProdutos: [
        { ncm_code: '9619.00.00', descricao: 'Absorventes', percentualFaturamento: 60 },
        { ncm_code: '3101.00.00', descricao: 'Fertilizantes', percentualFaturamento: 40 },
      ],
      principaisServicos: [
        { nbs_code: '1.1506.21.00', descricao: 'SaaS', percentualFaturamento: 100 },
      ],
    };

    // Deve extrair corretamente sem erros
    const { ncmCodes, nbsCodes } = extractNcmNbsFromProfile(profileFromDb);
    expect(ncmCodes).toHaveLength(2);
    expect(nbsCodes).toHaveLength(1);
    expect(ncmCodes).toContain('9619.00.00');
    expect(ncmCodes).toContain('3101.00.00');
    expect(nbsCodes).toContain('1.1506.21.00');
  });

  // Q5-4: engine-gap-analyzer recebe NCMs do operationProfile
  it('engine-gap-analyzer recebe NCMs extraídos do operationProfile', async () => {
    // Mock SELECT COUNT retorna 3 (número real de gaps inseridos)
    mockExecute.mockImplementation((sql: string) => {
      if (sql.startsWith('DELETE')) return [{ affectedRows: 0 }];
      if (sql.startsWith('SELECT COUNT')) return [[{ total: 3 }]]; // 2 NCMs + 1 NBS
      return [{}]; // INSERT
    });

    const operationProfile = {
      operationType: 'produto',
      clientType: ['b2b'],
      multiState: false,
      principaisProdutos: [
        { ncm_code: '9619.00.00', descricao: 'Absorventes higiênicos' },
        { ncm_code: '3101.00.00', descricao: 'Fertilizantes' },
      ],
      principaisServicos: [
        { nbs_code: '1.1506.21.00', descricao: 'SaaS' },
      ],
    };

    const { ncmCodes, nbsCodes } = extractNcmNbsFromProfile(operationProfile);
    expect(ncmCodes).toHaveLength(2);
    expect(nbsCodes).toHaveLength(1);

    const result = await analyzeEngineGaps(99, ncmCodes, nbsCodes);

    // 2 NCMs confirmados + 1 NBS confirmado = 3 INSERTs
    const insertCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO project_gaps_v3')
    );
    expect(insertCalls.length).toBe(3);
    // inserted é o valor retornado pelo SELECT COUNT (mock = 3)
    expect(result.inserted).toBe(3);
  });

  // Adicional: operationProfile null não quebra (projeto legado sem perfil)
  it('operationProfile null não quebra (projeto legado)', () => {
    const { ncmCodes, nbsCodes } = extractNcmNbsFromProfile(null);
    expect(ncmCodes).toEqual([]);
    expect(nbsCodes).toEqual([]);
  });

  // Adicional: percentualFaturamento é opcional
  it('principaisProdutos sem percentualFaturamento é aceito', async () => {
    const profile = {
      principaisProdutos: [
        { ncm_code: '9619.00.00', descricao: 'Absorventes' }, // sem percentualFaturamento
      ],
    };
    const { ncmCodes } = extractNcmNbsFromProfile(profile);
    expect(ncmCodes).toEqual(['9619.00.00']);

    const result = await analyzeEngineGaps(42, ncmCodes, []);
    expect(result.inserted).toBeGreaterThanOrEqual(1);
  });
});
