/**
 * sprint-s-lotes-ab.test.ts — Sprint S Lotes A e B
 *
 * Lote A: iagen-gap-analyzer converte iagen_answers em gaps (source='iagen')
 * Lote B: ScoreView persiste score automaticamente (cpie_score_history)
 *
 * Estes testes requerem DATABASE_URL (TiDB Cloud) — ficam em server/integration/.
 */
import { describe, it, expect, vi } from 'vitest';

// ─── Lote A: iagen-gap-analyzer ──────────────────────────────────────────────

describe('Lote A — iagen-gap-analyzer', () => {
  it('deve exportar analyzeIagenAnswers como função', async () => {
    const mod = await import('../lib/iagen-gap-analyzer');
    expect(typeof mod.analyzeIagenAnswers).toBe('function');
  });

  it('deve retornar { inserted: 0 } para projectId sem iagen_answers (mock)', async () => {
    // Mock do mysql2/promise para simular banco vazio
    vi.mock('mysql2/promise', () => ({
      default: {
        createPool: () => ({
          getConnection: async () => ({
            execute: async (sql: string) => {
              if (sql.includes('SELECT') && sql.includes('iagen_answers')) return [[], []];
              if (sql.includes('DELETE')) return [{ affectedRows: 0 }, []];
              if (sql.includes('COUNT(*)')) return [[{ total: 0 }], []];
              return [[], []];
            },
            beginTransaction: async () => {},
            commit: async () => {},
            rollback: async () => {},
            release: () => {},
          }),
          end: async () => {},
        }),
      },
    }));

    const { analyzeIagenAnswers } = await import('../lib/iagen-gap-analyzer');
    const result = await analyzeIagenAnswers(999999);
    expect(result).toEqual({ inserted: 0 });

    vi.restoreAllMocks();
  });

  it('deve detectar resposta incerta por confidence_score < 0.7', async () => {
    // Importar o módulo e testar a lógica interna via comportamento observável
    // Cria um mock com 1 resposta de baixa confiança
    vi.mock('mysql2/promise', () => ({
      default: {
        createPool: () => ({
          getConnection: async () => ({
            execute: async (sql: string, params?: any[]) => {
              if (sql.includes('SELECT') && sql.includes('iagen_answers')) {
                return [[{
                  id: 1,
                  question_text: 'Sua empresa realiza operações com IBS e CBS?',
                  resposta: 'Talvez, não tenho certeza',
                  confidence_score: '0.45', // baixa confiança → gap
                }], []];
              }
              if (sql.includes('DELETE')) return [{ affectedRows: 0 }, []];
              if (sql.includes('INSERT')) return [{ insertId: 1 }, []];
              if (sql.includes('COUNT(*)')) return [[{ total: 1 }], []];
              return [[], []];
            },
            beginTransaction: async () => {},
            commit: async () => {},
            rollback: async () => {},
            release: () => {},
          }),
          end: async () => {},
        }),
      },
    }));

    const { analyzeIagenAnswers } = await import('../lib/iagen-gap-analyzer');
    const result = await analyzeIagenAnswers(12345);
    expect(result.inserted).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });

  it('deve ignorar respostas com confidence_score >= 0.7 e sem padrão incerto', async () => {
    vi.mock('mysql2/promise', () => ({
      default: {
        createPool: () => ({
          getConnection: async () => ({
            execute: async (sql: string) => {
              if (sql.includes('SELECT') && sql.includes('iagen_answers')) {
                return [[{
                  id: 2,
                  question_text: 'Sua empresa emite NF-e?',
                  resposta: 'Sim, emitimos NF-e regularmente e estamos em conformidade.',
                  confidence_score: '0.95', // alta confiança → sem gap
                }], []];
              }
              return [[], []];
            },
            beginTransaction: async () => {},
            commit: async () => {},
            rollback: async () => {},
            release: () => {},
          }),
          end: async () => {},
        }),
      },
    }));

    const { analyzeIagenAnswers } = await import('../lib/iagen-gap-analyzer');
    const result = await analyzeIagenAnswers(12346);
    expect(result.inserted).toBe(0);

    vi.restoreAllMocks();
  });
});

// ─── Lote B: ScoreView persist automático ────────────────────────────────────

describe('Lote B — cpieRouter persistência automática', () => {
  it('cpieRouter.ts deve existir e exportar o router', async () => {
    // Verificar que o arquivo não foi corrompido pelos imports revertidos
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../server/routers/cpieRouter.ts', import.meta.url).pathname,
      'utf-8'
    );
    expect(content).toContain('export const cpieRouter');
    expect(content).not.toContain("import mysql from 'mysql2/promise';\nimport { ENV }"); // imports desnecessários removidos
  });

  it('ScoreView.tsx deve conter lógica de persistência automática', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../client/src/pages/compliance-v3/ScoreView.tsx', import.meta.url).pathname,
      'utf-8'
    );
    // Verificar que o useEffect de persistência automática foi adicionado
    expect(content).toContain('persistMutation.mutate');
    expect(content).toContain('hasData');
  });
});
