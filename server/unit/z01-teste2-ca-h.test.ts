import { describe, it, expect } from 'vitest';
import { categorizeRisk, GapInput } from '../lib/risk-categorizer';

describe('categorizeRisk - Casos Limítrofes (CA-H)', () => {

  // CA-H-01: Fallback (enquadramento_geral)
  it('CA-H-01: Deve categorizar como enquadramento_geral para gap sem match', () => {
    const gap: GapInput = { descricao: 'Gap genérico sem match' };
    expect(categorizeRisk(gap)).toBe('enquadramento_geral');
  });

  // CA-H-02: Prioridade IS (Imposto Seletivo) - NCM 22xx tem prioridade sobre Art. 14 (aliquota_zero)
  it('CA-H-02: Deve categorizar como imposto_seletivo para NCM 22xx mesmo com lei_ref de aliquota_zero', () => {
    const gap: GapInput = { ncm: '2202.10.00', lei_ref: 'Art. 14 LC 214/2025', descricao: 'alíquota zero e imposto seletivo' };
    expect(categorizeRisk(gap)).toBe('imposto_seletivo');
  });

  // CA-H-03: NCM3002 (aliquota_reduzida)
  it('CA-H-03: Deve categorizar como aliquota_reduzida para NCM 3002', () => {
    const gap: GapInput = { ncm: '3002.15.00', lei_ref: 'Art. 34 LC 214/2025' };
    expect(categorizeRisk(gap)).toBe('aliquota_reduzida');
  });

  // CA-H-04: NBS 1.17 (não explicitamente em regime_diferenciado, deve ser enquadramento_geral)
  it('CA-H-04: Deve categorizar como enquadramento_geral para NBS 1.17 sem outras regras', () => {
    const gap: GapInput = { nbs: '1.17.19', descricao: 'Serviço de TI' };
    expect(categorizeRisk(gap)).toBe('enquadramento_geral');
  });

  // CA-H-05: NCM 8471 (não explicitamente em ibs_cbs, deve ser enquadramento_geral)
  it('CA-H-05: Deve categorizar como enquadramento_geral para NCM 8471 sem outras regras', () => {
    const gap: GapInput = { ncm: '8471.30.19', descricao: 'Hardware de computador' };
    expect(categorizeRisk(gap)).toBe('enquadramento_geral');
  });

  // CA-H-06: NCM 2208 (imposto_seletivo)
  it('CA-H-06: Deve categorizar como imposto_seletivo para NCM 2208', () => {
    const gap: GapInput = { ncm: '2208.40.00', lei_ref: 'Art. 2 LC 214/2025' };
    expect(categorizeRisk(gap)).toBe('imposto_seletivo');
  });

  // CA-H-07: Descrição com 'crédito' (nao_cumulatividade)
  it('CA-H-07: Deve categorizar como nao_cumulatividade para descrição com crédito', () => {
    const gap: GapInput = { descricao: 'Crédito de PIS/COFINS' };
    expect(categorizeRisk(gap)).toBe('nao_cumulatividade');
  });
});
