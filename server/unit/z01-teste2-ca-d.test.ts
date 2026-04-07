import { describe, it, expect } from 'vitest';
import { categorizeRisk, GapInput } from '../../server/lib/risk-categorizer';

describe('categorizeRisk para IBS/CBS', () => {
  // CA-D-01: Lei Art. 6 LC 214
  it('CA-D-01: deve categorizar como ibs_cbs para lei_ref Art. 6 LC 214', () => {
    const gap: GapInput = { id: '1', lei_ref: 'Art. 6 LC 214/2025' };
    expect(categorizeRisk(gap)).toBe('ibs_cbs');
  });

  // CA-D-02: Lei Art. 12 LC 214
  it('CA-D-02: deve categorizar como ibs_cbs para lei_ref Art. 12 LC 214', () => {
    const gap: GapInput = { id: '2', lei_ref: 'Art. 12 LC 214/2025' };
    expect(categorizeRisk(gap)).toBe('ibs_cbs');
  });

  // CA-D-03: Descrição contém 'IBS'
  it('CA-D-03: deve categorizar como ibs_cbs para descrição contendo IBS', () => {
    const gap: GapInput = { id: '3', descricao: 'Gap relacionado ao IBS' };
    expect(categorizeRisk(gap)).toBe('ibs_cbs');
  });

  // CA-D-04: Descrição contém 'CBS'
  it('CA-D-04: deve categorizar como ibs_cbs para descrição contendo CBS', () => {
    const gap: GapInput = { id: '4', descricao: 'Questão de CBS' };
    expect(categorizeRisk(gap)).toBe('ibs_cbs');
  });

  // CA-D-05: Lei Art. 9 LC 214
  it('CA-D-05: deve categorizar como ibs_cbs para lei_ref Art. 9 LC 214', () => {
    const gap: GapInput = { id: '5', lei_ref: 'Art. 9 LC 214/2025' };
    expect(categorizeRisk(gap)).toBe('ibs_cbs');
  });

  // CA-D-06: Descrição contém 'IBS/CBS'
  it('CA-D-06: deve categorizar como ibs_cbs para descrição contendo IBS/CBS', () => {
    const gap: GapInput = { id: '6', descricao: 'Impacto no IBS/CBS' };
    expect(categorizeRisk(gap)).toBe('ibs_cbs');
  });
});
