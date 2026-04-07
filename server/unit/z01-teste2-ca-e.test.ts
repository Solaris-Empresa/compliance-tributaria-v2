import { describe, it, expect } from 'vitest';
import { categorizeRisk, GapInput } from '../lib/risk-categorizer';

describe('TESTE2-CA-E: CA-E-01 a CA-E-06 (Cadastro Fiscal: Arts.40-45, inscricao/habilitacao/registro)', () => {

  it('CA-E-01: Deve categorizar como cadastro_fiscal para Art. 40 LC 214/2025', () => {
    const gap: GapInput = {
      id: 'gap-e-01',
      fonte: 'solaris',
      fonte_ref: 'SOL-040',
      lei_ref: 'Art. 40 LC 214/2025',
    };
    expect(categorizeRisk(gap)).toBe('cadastro_fiscal');
  });

  it('CA-E-02: Deve categorizar como cadastro_fiscal para Art. 43 LC 214/2025', () => {
    const gap: GapInput = {
      id: 'gap-e-02',
      fonte: 'rag',
      fonte_ref: 'lc214-art43-reg',
      lei_ref: 'Art. 43 LC 214/2025',
    };
    expect(categorizeRisk(gap)).toBe('cadastro_fiscal');
  });

  it('CA-E-03: Deve categorizar como cadastro_fiscal para Art. 45 LC 214/2025', () => {
    const gap: GapInput = {
      id: 'gap-e-03',
      fonte: 'solaris',
      fonte_ref: 'SOL-045',
      lei_ref: 'Art. 45 LC 214/2025',
    };
    expect(categorizeRisk(gap)).toBe('cadastro_fiscal');
  });

  it('CA-E-04: Deve categorizar como cadastro_fiscal para descricao com inscricao', () => {
    const gap: GapInput = {
      id: 'gap-e-04',
      fonte: 'iagen',
      fonte_ref: 'iagen-gap-e04',
      lei_ref: 'Art. 1 LC 214/2025',
      descricao: 'Empresa sem inscricao no cadastro do IBS',
    };
    expect(categorizeRisk(gap)).toBe('cadastro_fiscal');
  });

  it('CA-E-05: Deve categorizar como cadastro_fiscal para descricao com habilitacao', () => {
    const gap: GapInput = {
      id: 'gap-e-05',
      fonte: 'iagen',
      fonte_ref: 'iagen-gap-e05',
      lei_ref: 'Art. 1 LC 214/2025',
      descricao: 'Pendência de habilitacao tributária obrigatória',
    };
    expect(categorizeRisk(gap)).toBe('cadastro_fiscal');
  });

  it('CA-E-06: Deve categorizar como cadastro_fiscal para descricao com cadastro', () => {
    const gap: GapInput = {
      id: 'gap-e-06',
      fonte: 'iagen',
      fonte_ref: 'iagen-gap-e06',
      lei_ref: 'Art. 1 LC 214/2025',
      descricao: 'Irregularidade no cadastro fiscal do contribuinte',
    };
    expect(categorizeRisk(gap)).toBe('cadastro_fiscal');
  });

});
