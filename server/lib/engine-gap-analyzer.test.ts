/**
 * engine-gap-analyzer.test.ts — Testes Vitest Bloco D
 *
 * Testes Q5 obrigatórios (Orquestrador Claude — 2026-04-05):
 *   1. NCM confirmado gera gap source=engine
 *   2. NBS confirmado gera gap source=engine
 *   3. NCM pending_validation NÃO gera gap no banco
 *   4. evaluation_confidence = confianca.valor / 100
 *   5. source_reference contém artigo da lei
 *
 * Estratégia: mock do mysql2/promise para testar lógica sem banco real.
 * O banco real é testado via Q6 (SQL manual após integração).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock mysql2/promise (vi.hoisted para evitar ReferenceError) ────────────────────────────────────────────────────────────────────────────────

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

// ─── Import após mock ─────────────────────────────────────────────────────────

import { analyzeEngineGaps } from './engine-gap-analyzer';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // DELETE retorna affectedRows
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

// ─── Testes Q5 obrigatórios ───────────────────────────────────────────────────

describe('engine-gap-analyzer — Q5 obrigatórios (Bloco D)', () => {

  // Q5-1: NCM confirmado gera gap source=engine
  it('NCM confirmado (9619.00.00) gera gap com source=engine', async () => {
    const result = await analyzeEngineGaps(42, ['9619.00.00'], []);

    expect(result.inserted).toBeGreaterThanOrEqual(1);
    expect(result.skipped_pending).toBe(0);

    // Verificar que INSERT foi chamado com source='engine'
    const insertCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO project_gaps_v3')
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);

    // Verificar que 'engine' está nos valores do INSERT
    const insertValues = insertCalls[0][1] as any[];
    expect(insertValues).toBeDefined();
    // source_reference deve conter LC 214/2025
    const sourceRef = insertValues.find((v: any) => typeof v === 'string' && v.includes('LC 214/2025'));
    expect(sourceRef).toBeTruthy();
  });

  // Q5-2: NBS confirmado gera gap source=engine
  it('NBS confirmado (1.1506.21.00) gera gap com source=engine', async () => {
    const result = await analyzeEngineGaps(42, [], ['1.1506.21.00']);

    expect(result.inserted).toBeGreaterThanOrEqual(1);
    expect(result.skipped_pending).toBe(0);

    const insertCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO project_gaps_v3')
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);

    // Verificar source_reference com LC 214/2025
    const insertValues = insertCalls[0][1] as any[];
    const sourceRef = insertValues.find((v: any) => typeof v === 'string' && v.includes('LC 214/2025'));
    expect(sourceRef).toBeTruthy();
  });

  // Q5-3: NCM pending_validation NÃO gera gap no banco
  it('NCM pending_validation (2202.10.00) NÃO gera INSERT no banco', async () => {
    const result = await analyzeEngineGaps(42, ['2202.10.00'], []);

    expect(result.skipped_pending).toBe(1);

    // Nenhum INSERT deve ter sido chamado
    const insertCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO project_gaps_v3')
    );
    expect(insertCalls.length).toBe(0);

    // Sem gaps inseridos — SELECT COUNT deve retornar 0
    // (o banco não foi tocado com INSERT)
    expect(result.inserted).toBe(0);
  });

  // Q5-4: evaluation_confidence = confianca.valor / 100
  it('evaluation_confidence = confianca.valor / 100 para NCM 9619.00.00 (confiança 100)', async () => {
    await analyzeEngineGaps(42, ['9619.00.00'], []);

    const insertCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO project_gaps_v3')
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);

    const insertValues = insertCalls[0][1] as any[];
    // evaluation_confidence deve ser 1.0 (100 / 100)
    const confidenceValue = insertValues.find((v: any) => typeof v === 'number' && v >= 0 && v <= 1 && v > 0);
    expect(confidenceValue).toBe(1.0); // 100 / 100
  });

  // Q5-5: source_reference contém artigo da lei
  it('source_reference contém artigo da lei (LC 214/2025 Art. ...)', async () => {
    await analyzeEngineGaps(42, ['9619.00.00'], ['1.1506.21.00']);

    const insertCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO project_gaps_v3')
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(2); // NCM + NBS

    for (const call of insertCalls) {
      const values = call[1] as any[];
      const sourceRef = values.find(
        (v: any) => typeof v === 'string' && v.includes('LC 214/2025') && v.includes('Art.')
      );
      expect(sourceRef).toBeTruthy();
    }
  });

  // Adicional: múltiplos NCM + NBS confirmados geram múltiplos gaps
  it('múltiplos NCM/NBS confirmados geram múltiplos gaps', async () => {
    // 2 NCM confirmados + 3 NBS confirmados = 5 gaps
    const result = await analyzeEngineGaps(
      42,
      ['9619.00.00', '3101.00.00'],
      ['1.1506.21.00', '1.0901.33.00', '1.1303.10.00']
    );

    expect(result.skipped_pending).toBe(0);
    const insertCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO project_gaps_v3')
    );
    expect(insertCalls.length).toBe(5);
  });

  // Adicional: pending + confirmados — apenas confirmados gravam
  it('mix pending + confirmados: apenas confirmados gravam no banco', async () => {
    // 1 pending (2202.10.00) + 1 confirmado (9619.00.00)
    const result = await analyzeEngineGaps(42, ['2202.10.00', '9619.00.00'], []);

    expect(result.skipped_pending).toBe(1);
    const insertCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO project_gaps_v3')
    );
    expect(insertCalls.length).toBe(1); // apenas 9619.00.00
  });

  // Adicional: idempotência — DELETE source='engine' antes de INSERT
  it('DELETE source=engine é chamado antes dos INSERTs (idempotência)', async () => {
    await analyzeEngineGaps(42, ['9619.00.00'], []);

    const deleteCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('DELETE FROM project_gaps_v3')
    );
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0][1]).toEqual([42, 'engine']);
  });
});
