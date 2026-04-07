import { describe, it, expect } from 'vitest';
import { categorizeRisk, GapInput } from '../../server/lib/risk-categorizer';

describe('TESTE2-CA-B: Categorização de Riscos - Alíquota Zero', () => {

  it('CA-B-01 — NCM 1006 (arroz) → aliquota_zero', () => {
    const gap: GapInput = {
      id: 'g-b01', fonte: 'rag', fonte_ref: 'lc214-art14-ncm1006',
      lei_ref: 'Art. 14 LC 214/2025', ncm: '1006.40.00',
      descricao: 'Alíquota zero do IBS/CBS para arroz não verificada'
    };
    const categoria = categorizeRisk(gap);
    expect(categoria).toBe('aliquota_zero');
  });

  it('CA-B-02 — NCM 0713 (feijão) → aliquota_zero', () => {
    const gap: GapInput = {
      id: 'g-b02', fonte: 'rag', fonte_ref: 'lc214-art14-ncm0713',
      lei_ref: 'Art. 14 LC 214/2025', ncm: '0713.33.19',
      descricao: 'Feijão não incluído na lista de alíquota zero'
    };
    const categoria = categorizeRisk(gap);
    expect(categoria).toBe('aliquota_zero');
  });

  it('CA-B-03 — lei_ref \'Art. 14 LC 214/2025\' → aliquota_zero', () => {
    const gap: GapInput = {
      id: 'g-b03', fonte: 'rag', fonte_ref: 'lc214-art14-001',
      lei_ref: 'Art. 14 LC 214/2025',
      descricao: 'Produto básico não verificado na lista de alíquota zero'
    };
    const categoria = categorizeRisk(gap);
    expect(categoria).toBe('aliquota_zero');
  });

  it('CA-B-04 — NCM 1507 (óleo de soja) → aliquota_zero ou aliquota_reduzida', () => {
    const gap: GapInput = {
      id: 'g-b04', fonte: 'rag', fonte_ref: 'lc214-art14-ncm1507',
      lei_ref: 'Art. 14 LC 214/2025', ncm: '1507.10.00',
      descricao: 'Óleo de soja: enquadramento zero/reduzida não verificado'
    };
    const categoria = categorizeRisk(gap);
    expect(['aliquota_zero', 'aliquota_reduzida']).toContain(categoria);
  });

  it('CA-B-05 — descricao contém \'alíquota zero\' → aliquota_zero', () => {
    const gap: GapInput = {
      id: 'g-b05', fonte: 'solaris', fonte_ref: 'SOL-014',
      lei_ref: 'Art. 14 LC 214/2025',
      descricao: 'Empresa não verificou lista de alíquota zero LC 214/2025'
    };
    const categoria = categorizeRisk(gap);
    expect(categoria).toBe('aliquota_zero');
  });

  it('CA-B-06 — NCM 1904 (cereais processados) → aliquota_zero', () => {
    const gap: GapInput = {
      id: 'g-b06', fonte: 'rag', fonte_ref: 'lc214-art14-ncm1904',
      lei_ref: 'Art. 14 LC 214/2025', ncm: '1904.10.00',
      descricao: 'Cereais processados: verificação alíquota zero pendente'
    };
    const categoria = categorizeRisk(gap);
    expect(categoria).toBe('aliquota_zero');
  });
});
