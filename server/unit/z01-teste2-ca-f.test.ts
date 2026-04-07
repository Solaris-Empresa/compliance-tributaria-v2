import { describe, it, expect } from 'vitest';
import { categorizeRisk, GapInput } from '../lib/risk-categorizer';

describe('TESTE2-CA-F: Categorização de Riscos - Não-Cumulatividade e Patrimonial', () => {

  it('CA-F-01: Deve categorizar como nao_cumulatividade para Art. 28 LC 214', () => {
    const gap: GapInput = {
      id: 'gap-1',
      fonte: 'solaris',
      fonte_ref: 'SOL-001',
      lei_ref: 'Art. 28 LC 214/2025',
      descricao: 'Gap de nao cumulatividade',
    };
    expect(categorizeRisk(gap)).toBe('nao_cumulatividade');
  });

  it('CA-F-02: Deve categorizar como nao_cumulatividade para descrição com \'crédito\'', () => {
    const gap: GapInput = {
      id: 'gap-2',
      fonte: 'iagen',
      fonte_ref: 'iagen-gap-2',
      lei_ref: 'Art. 31 LC 214/2025',
      descricao: 'Crédito de PIS/COFINS',
    };
    expect(categorizeRisk(gap)).toBe('nao_cumulatividade');
  });

  it('CA-F-03: Deve categorizar como nao_cumulatividade para descrição com \'estorno\'', () => {
    const gap: GapInput = {
      id: 'gap-3',
      fonte: 'iagen',
      fonte_ref: 'iagen-gap-3',
      lei_ref: 'Art. 33 LC 214/2025',
      descricao: 'Estorno de ICMS',
    };
    expect(categorizeRisk(gap)).toBe('nao_cumulatividade');
  });

  it('CA-F-04: Deve categorizar como patrimonial para descrição com \'ativo imobilizado\'', () => {
    const gap: GapInput = {
      id: 'gap-4',
      fonte: 'solaris',
      fonte_ref: 'SOL-004',
      lei_ref: 'Art. 29 LC 214/2025',
      descricao: 'Depreciação de ativo imobilizado',
    };
    expect(categorizeRisk(gap)).toBe('patrimonial');
  });

  it('CA-F-05: Deve categorizar como patrimonial mesmo com lei_ref de nao_cumulatividade se tiver \'imobilizado\'', () => {
    const gap: GapInput = {
      id: 'gap-5',
      fonte: 'iagen',
      fonte_ref: 'iagen-gap-5',
      lei_ref: 'Art. 30 LC 214/2025',
      descricao: 'Aquisição de imobilizado',
    };
    expect(categorizeRisk(gap)).toBe('patrimonial');
  });
});
