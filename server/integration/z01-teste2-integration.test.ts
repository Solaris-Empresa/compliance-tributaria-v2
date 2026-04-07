import { describe, it, expect } from 'vitest';
import { categorizeRisk, GapInput } from '../lib/risk-categorizer';

describe('categorizeRisk Integration Tests (TESTE2-INTEGRATION)', () => {

  // P-T1 (produto puro - alimentos)
  const P_T1_NCM_2202 = {
    ncm: '2202.10.00',
    fonte: 'rag',
    fonte_ref: 'lc214-art2-ncm2202',
    lei_ref: 'Art. 2 LC 214/2025',
    resposta: 'nao'
  };

  const P_T1_NCM_1006 = {
    ncm: '1006.40.00',
    fonte: 'rag',
    fonte_ref: 'lc214-art14-ncm1006',
    lei_ref: 'Art. 14 LC 214/2025',
    resposta: 'nao'
  };

  // P-T2 (servico puro - consultoria TI)
  const P_T2_NBS_117 = {
    nbs: '1.17.19',
    fonte: 'rag',
    fonte_ref: 'lc214-art11-nbs117',
    lei_ref: 'Art. 11 LC 214/2025',
    resposta: 'nao'
  };

  // P-T3 (mista farmacia)
  const P_T3_NCM_3004 = {
    ncm: '3004.90.99',
    fonte: 'rag',
    fonte_ref: 'lc214-art34-ncm3004',
    lei_ref: 'Art. 34 LC 214/2025',
    resposta: 'nao'
  };

  // P-T4 (produto IS - bebidas)
  const P_T4_NCM_2208 = {
    ncm: '2208.40.00',
    fonte: 'rag',
    fonte_ref: 'lc214-art2-ncm2208',
    lei_ref: 'Art. 2 LC 214/2025',
    resposta: 'nao'
  };

  it('INT-01: P-T1 NCM2202 deve ser imposto_seletivo', () => {
    const gap: GapInput = {
      id: 'gap-ncm-2202.10.00',
      fonte: P_T1_NCM_2202.fonte,
      fonte_ref: P_T1_NCM_2202.fonte_ref,
      lei_ref: P_T1_NCM_2202.lei_ref,
      ncm: P_T1_NCM_2202.ncm,
      descricao: 'Gap NCM 2202.10.00'
    };
    expect(categorizeRisk(gap)).toBe('imposto_seletivo');
  });

  it('INT-02: P-T1 NCM1006 deve ser aliquota_zero', () => {
    const gap: GapInput = {
      id: 'gap-ncm-1006.40.00',
      fonte: P_T1_NCM_1006.fonte,
      fonte_ref: P_T1_NCM_1006.fonte_ref,
      lei_ref: P_T1_NCM_1006.lei_ref,
      ncm: P_T1_NCM_1006.ncm,
      descricao: 'Gap NCM 1006.40.00'
    };
    expect(categorizeRisk(gap)).toBe('aliquota_zero');
  });

  it('INT-03: P-T2 NBS1.17 deve ser enquadramento_geral', () => {
    const gap: GapInput = {
      id: 'gap-nbs-1.17.19',
      fonte: P_T2_NBS_117.fonte,
      fonte_ref: P_T2_NBS_117.fonte_ref,
      lei_ref: P_T2_NBS_117.lei_ref,
      nbs: P_T2_NBS_117.nbs,
      descricao: 'Gap NBS 1.17.19'
    };
    expect(categorizeRisk(gap)).toBe('ibs_cbs');
  });

  it('INT-04: P-T3 NCM3004 deve ser aliquota_reduzida', () => {
    const gap: GapInput = {
      id: 'gap-ncm-3004.90.99',
      fonte: P_T3_NCM_3004.fonte,
      fonte_ref: P_T3_NCM_3004.fonte_ref,
      lei_ref: P_T3_NCM_3004.lei_ref,
      ncm: P_T3_NCM_3004.ncm,
      descricao: 'Gap NCM 3004.90.99'
    };
    expect(categorizeRisk(gap)).toBe('aliquota_reduzida');
  });

  it('INT-05: P-T4 NCM2208 deve ser imposto_seletivo', () => {
    const gap: GapInput = {
      id: 'gap-ncm-2208.40.00',
      fonte: P_T4_NCM_2208.fonte,
      fonte_ref: P_T4_NCM_2208.fonte_ref,
      lei_ref: P_T4_NCM_2208.lei_ref,
      ncm: P_T4_NCM_2208.ncm,
      descricao: 'Gap NCM 2208.40.00'
    };
    expect(categorizeRisk(gap)).toBe('imposto_seletivo');
  });
});
