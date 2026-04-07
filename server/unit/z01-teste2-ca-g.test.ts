import { describe, it, expect } from 'vitest';
import { categorizeRisk, GapInput } from '../lib/risk-categorizer';

describe('TESTE2-CA-G: categorizeRisk - Categorização de Riscos', () => {

  it('CA-G-01: Deve categorizar como imposto_seletivo para NCM 22xx', () => {
    const gap: GapInput = { ncm: '2208.40.00', descricao: 'Bebidas alcoólicas sujeitas ao Imposto Seletivo' };
    expect(categorizeRisk(gap)).toBe('imposto_seletivo');
  });

  it('CA-G-02: Deve categorizar como aliquota_zero para Art. 14 LC 214', () => {
    const gap: GapInput = { lei_ref: 'Art. 14 LC 214/2025', descricao: 'Produto com alíquota zero' };
    expect(categorizeRisk(gap)).toBe('aliquota_zero');
  });

  it('CA-G-03: Deve categorizar como aliquota_reduzida para NCM 30xx', () => {
    const gap: GapInput = { ncm: '3004.90.99', descricao: 'Medicamento com alíquota reduzida' };
    expect(categorizeRisk(gap)).toBe('aliquota_reduzida');
  });

  it('CA-G-04: Deve categorizar como regime_diferenciado para NBS 1.03', () => {
    const gap: GapInput = { nbs: '1.03.07', lei_ref: 'Art. 29 LC 214/2025', descricao: 'Serviço de saúde em regime diferenciado' };
    expect(categorizeRisk(gap)).toBe('regime_diferenciado');
  });

  it('CA-G-05: Deve categorizar como nao_cumulatividade para descrição com crédito', () => {
    const gap: GapInput = { descricao: 'Crédito de IBS/CBS' };
    expect(categorizeRisk(gap)).toBe('nao_cumulatividade');
  });

  it('CA-G-06: Deve categorizar como compliance para descrição com NF-e', () => {
    const gap: GapInput = { descricao: 'Emissão de NF-e incorreta' };
    expect(categorizeRisk(gap)).toBe('compliance');
  });

  it('CA-G-07: Deve categorizar como enquadramento_geral para casos sem match específico', () => {
    const gap: GapInput = { descricao: 'Outro tipo de gap não especificado' };
    expect(categorizeRisk(gap)).toBe('enquadramento_geral');
  });
});
