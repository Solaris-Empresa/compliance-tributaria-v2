import { describe, it, expect } from 'vitest';
import { categorizeRisk } from '../lib/risk-categorizer';

describe('TESTE2-CA-A: Categorização de Riscos - Imposto Seletivo', () => {
  // CA-A-01: NCM 22xx
  it('CA-A-01: Deve categorizar como imposto_seletivo para NCM 2208.40.00', () => {
    const result = categorizeRisk({ ncm: '2208.40.00' });
    expect(result).toContain('imposto_seletivo');
  });

  // CA-A-02: NCM 24xx
  it('CA-A-02: Deve categorizar como imposto_seletivo para NCM 2402.20.00', () => {
    const result = categorizeRisk({ ncm: '2402.20.00' });
    expect(result).toContain('imposto_seletivo');
  });

  // CA-A-03: NCM 27xx
  it('CA-A-03: Deve categorizar como imposto_seletivo para NCM 2710.12.59', () => {
    const result = categorizeRisk({ ncm: '2710.12.59' });
    expect(result).toContain('imposto_seletivo');
  });

  // CA-A-04: Lei Art. 2 LC 214
  it('CA-A-04: Deve categorizar como imposto_seletivo para lei_ref Art. 2 LC 214/2025', () => {
    const result = categorizeRisk({ lei_ref: 'Art. 2 LC 214/2025' });
    expect(result).toContain('imposto_seletivo');
  });

  // CA-A-05: Descrição contém 'Imposto Seletivo'
  it('CA-A-05: Deve categorizar como imposto_seletivo para descrição contendo Imposto Seletivo', () => {
    const result = categorizeRisk({ descricao: 'Produto sujeito ao Imposto Seletivo' });
    expect(result).toContain('imposto_seletivo');
  });

  // CA-A-06: Combinação NCM e Descrição
  it('CA-A-06: Deve categorizar como imposto_seletivo para NCM 22xx e descrição relevante', () => {
    const result = categorizeRisk({ ncm: '2203.00.00', description: 'Cerveja - Imposto Seletivo' });
    expect(result).toContain('imposto_seletivo');
  });

  // CA-A-07: Nenhuma das condições (não deve categorizar como imposto_seletivo)
  it('CA-A-07: Não deve categorizar como imposto_seletivo para condições não relacionadas', () => {
    const result = categorizeRisk({ ncm: '0101.10.00', lei_ref: 'Art. 10 LC 214/2025', description: 'Produto comum' });
    expect(result).not.toContain('imposto_seletivo');
  });

  // CA-A-08: Outra categoria presente, mas também imposto_seletivo se aplicável
  it('CA-A-08: Deve categorizar corretamente com outras categorias presentes', () => {
    const result = categorizeRisk({ ncm: '2208.40.00', lei_ref: 'Art. 14 LC 214/2025', description: 'Bebida alcoolica' });
    expect(result).toContain('imposto_seletivo');
  });
});
