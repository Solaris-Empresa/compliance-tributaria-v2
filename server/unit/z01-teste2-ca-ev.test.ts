import { describe, it, expect } from 'vitest';
import { categorizeRisk, GapInput } from '../../server/lib/risk-categorizer';

describe('TESTE2-CA-EV', () => {
  it('EV-CAT-01: categorizeRisk deve sempre retornar uma categoria não nula', () => {
    const gap: GapInput = { descricao: 'Um gap genérico' };
    const categoria = categorizeRisk(gap);
    expect(categoria).toBeDefined();
    expect(typeof categoria).toBe('string');
    expect(categoria.length).toBeGreaterThan(0);
  });

  it('EV-CAT-02: NCMs começando com 22 devem ser categorizados como imposto_seletivo', () => {
    const gap: GapInput = { ncm: '2208.40.00', descricao: 'NCM de bebidas' };
    expect(categorizeRisk(gap)).toBe('imposto_seletivo');
  });

  it('EV-CAT-03: NCMs começando com 30 devem ser categorizados como aliquota_reduzida', () => {
    const gap: GapInput = { ncm: '3004.90.99', descricao: 'NCM de medicamentos' };
    expect(categorizeRisk(gap)).toBe('aliquota_reduzida');
  });

  it('EV-CAT-04: NBSs começando com 1.03 devem ser categorizados como regime_diferenciado', () => {
    const gap: GapInput = { nbs: '1.03.07', descricao: 'NBS de serviços de saúde' };
    expect(categorizeRisk(gap)).toBe('regime_diferenciado');
  });

  it('EV-CAT-05: Descrição contendo "imposto seletivo" deve ser categorizada como imposto_seletivo', () => {
    const gap: GapInput = { descricao: 'Gap relacionado ao imposto seletivo' };
    expect(categorizeRisk(gap)).toBe('imposto_seletivo');
  });
});
