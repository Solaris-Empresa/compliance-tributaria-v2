import { describe, it, expect } from 'vitest';
import { categorizeRisk, GapInput } from '../lib/risk-categorizer';

describe('categorizeRisk - Teste 2 CA-C: Regime Diferenciado/Aliquota Reduzida', () => {

  it('CA-C-01: Deve categorizar como regime_diferenciado para NBS 1.03', () => {
    const gap: GapInput = { nbs: '1.03.07' };
    expect(categorizeRisk(gap)).toBe('regime_diferenciado');
  });

  it('CA-C-02: Deve categorizar como regime_diferenciado para NBS 1.15', () => {
    const gap: GapInput = { nbs: '1.15.01' };
    expect(categorizeRisk(gap)).toBe('regime_diferenciado');
  });

  it('CA-C-03: Deve categorizar como regime_diferenciado para NBS 1.09', () => {
    const gap: GapInput = { nbs: '1.09.02' };
    expect(categorizeRisk(gap)).toBe('regime_diferenciado');
  });

  it('CA-C-04: Deve categorizar como regime_diferenciado para Art. 29 LC 214', () => {
    const gap: GapInput = { lei_ref: 'Art. 29 LC 214/2025' };
    expect(categorizeRisk(gap)).toBe('regime_diferenciado');
  });

  it('CA-C-05: Deve categorizar como aliquota_reduzida para Art. 34 LC 214', () => {
    const gap: GapInput = { lei_ref: 'Art. 34 LC 214/2025' };
    expect(categorizeRisk(gap)).toBe('aliquota_reduzida');
  });

  it('CA-C-06: Deve categorizar como aliquota_reduzida para NCM 30xx', () => {
    const gap: GapInput = { ncm: '3004.90.99' };
    expect(categorizeRisk(gap)).toBe('aliquota_reduzida');
  });
});
