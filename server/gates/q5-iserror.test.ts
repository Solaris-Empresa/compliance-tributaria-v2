/**
 * server/gates/q5-iserror.test.ts
 *
 * Gate Q5 — isError ≠ lista vazia
 *
 * Todo componente Admin com useQuery DEVE:
 *   1. Declarar isError na desestruturação
 *   2. Ter tratamento visível (Alert, error.message ou "Erro ao")
 *   3. Se usar queryInput/queryParams com múltiplos campos, usar useMemo
 *
 * Dispensado: componentes sem useQuery.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const PAGES_DIR = resolve(__dirname, '../../client/src/pages');
const ADMIN_COMPONENTS = readdirSync(PAGES_DIR)
  .filter(f => f.startsWith('Admin') && f.endsWith('.tsx'));

describe('Gate Q5 — isError ≠ lista vazia', () => {

  ADMIN_COMPONENTS.forEach(component => {
    const content = readFileSync(resolve(PAGES_DIR, component), 'utf-8');
    if (!content.includes('useQuery') && !content.includes('.useQuery')) return;

    it(`${component} — deve declarar isError`, () => {
      expect(content.includes('isError')).toBe(true);
    });

    it(`${component} — isError deve ter tratamento visível`, () => {
      const hasVisibleError =
        content.includes('isError') && (
          content.includes('Alert') ||
          content.includes('error.message') ||
          content.includes('Erro ao')
        );
      expect(hasVisibleError).toBe(true);
    });

    it(`${component} — queryInput com múltiplos campos usa useMemo`, () => {
      const hasQueryInputVar =
        content.includes('queryInput') || content.includes('queryParams');
      if (!hasQueryInputVar) return;
      expect(content.includes('useMemo')).toBe(true);
    });
  });

  it('Nenhum componente Admin com useQuery silencia isError', () => {
    const violations: string[] = [];
    ADMIN_COMPONENTS.forEach(component => {
      const content = readFileSync(resolve(PAGES_DIR, component), 'utf-8');
      if (!content.includes('useQuery')) return;
      if (!content.includes('isError')) violations.push(component);
    });
    expect(violations).toEqual([]);
  });
});
