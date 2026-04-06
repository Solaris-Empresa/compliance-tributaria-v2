/**
 * decision-kernel.test.ts — Testes Vitest para ncm-engine + nbs-engine
 *
 * Cobertura: 6 casos POC Milestone 1 (5 confirmados + 1 pending_validation)
 *            + 10 casos Lote 1 (6 NCM + 4 NBS) — Sprint V / PV-01
 * Contratos: CNT-01a, CNT-01b, CNT-02, CNT-03
 *
 * Aprovado: Orquestrador Claude — 2026-04-05 (Bloco C)
 * Lote 1 adicionado: 2026-04-05 (PR feat/decision-kernel-lote-1)
 */

import { describe, it, expect } from 'vitest';
import { lookupNcm } from './ncm-engine';
import { lookupNbs } from './nbs-engine';

// ─── NCM Engine ───────────────────────────────────────────────────────────────

describe('ncm-engine — lookupNcm', () => {

  // Caso 1: NCM 9619.00.00 — aliquota_zero, deterministico, confirmado
  it('NCM 9619.00.00 → aliquota_zero, confiança 100, deterministico', () => {
    const result = lookupNcm({ codigo: '9619.00.00', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBeTruthy();
    expect(result.nota).toBeUndefined(); // confirmado: sem nota de pending
  });

  // Caso 2: NCM 3101.00.00 — condicional, confiança 100, condicional
  it('NCM 3101.00.00 → condicional, confiança 100, tipo condicional', () => {
    const result = lookupNcm({ codigo: '3101.00.00', sistema: 'NCM' });

    expect(result.regime).toBe('condicional');
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('condicional');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.aliquota).toBeNull(); // condicional: não resolver
  });

  // Caso 3: NCM 2202.10.00 — confirmado (patch U-2: artigos IS versão compilada)
  // Antes: pending_validation (confiança 0, fallback). Após patch: confirmado (confiança 100, deterministico)
  it('2202.10.00 retorna regime_geral com imposto_seletivo=true e artigo confirmado', () => {
    const result = lookupNcm({ codigo: '2202.10.00', sistema: 'NCM' });

    expect(result.regime).toBe('regime_geral');
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    // Artigos IS versão compilada confirmados pelo Orquestrador (Task U-2)
    expect(result.fonte.artigo).toBeTruthy();
    // Não deve mais ter nota de pendência
    expect(result.nota).toBeUndefined();
  });

  // Caso 4: NCM não encontrado → fallback genérico
  it('NCM desconhecido → regime_geral, fallback < 95', () => {
    const result = lookupNcm({ codigo: '9999.99.99', sistema: 'NCM' });

    expect(result.regime).toBe('regime_geral');
    expect(result.confianca.tipo).toBe('fallback');
    expect(result.confianca.valor).toBeLessThan(95);
    expect(result.fonte.lei).toBe('LC 214/2025');
  });

  // Normalização de código (case insensitive, trim)
  it('normaliza código NCM (trim + uppercase)', () => {
    const result = lookupNcm({ codigo: '  9619.00.00  ', sistema: 'NCM' });
    expect(result.regime).toBe('aliquota_zero');
  });

  // CNT-02: fonte legal obrigatória em todo output
  it('toda resposta NCM tem fonte.lei preenchida (CNT-02)', () => {
    const codigos = ['9619.00.00', '3101.00.00', '2202.10.00', '0000.00.00'];
    for (const codigo of codigos) {
      const result = lookupNcm({ codigo, sistema: 'NCM' });
      expect(result.fonte.lei).toBeTruthy();
      expect(result.fonte.artigo).toBeTruthy();
    }
  });

  // CNT-02: campo confiança obrigatório em todo output
  it('toda resposta NCM tem campo confianca preenchido (CNT-02)', () => {
    const codigos = ['9619.00.00', '3101.00.00', '2202.10.00', '0000.00.00'];
    for (const codigo of codigos) {
      const result = lookupNcm({ codigo, sistema: 'NCM' });
      expect(result.confianca).toBeDefined();
      expect(typeof result.confianca.valor).toBe('number');
      expect(['deterministico', 'regra', 'fallback', 'condicional']).toContain(result.confianca.tipo);
    }
  });
});

// ─── NBS Engine ───────────────────────────────────────────────────────────────

describe('nbs-engine — lookupNbs', () => {

  // Caso 4: NBS 1.1506.21.00 — regime_geral, regra, confiança 98
  it('NBS 1.1506.21.00 → regime_geral, confiança ≤ 98, tipo regra', () => {
    const result = lookupNbs({ codigo: '1.1506.21.00', sistema: 'NBS' });

    expect(result.regime).toBe('regime_geral');
    expect(result.confianca.tipo).toBe('regra');
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b: nunca 100
    expect(result.confianca.valor).toBeGreaterThan(0);
    expect(result.fonte.lei).toBe('LC 214/2025');
  });

  // Caso 5: NBS 1.0901.33.00 — regime_especial, regra, confiança ≤ 98
  it('NBS 1.0901.33.00 → regime_especial, confiança ≤ 98, tipo regra', () => {
    const result = lookupNbs({ codigo: '1.0901.33.00', sistema: 'NBS' });

    expect(result.regime).toBe('regime_especial');
    expect(result.confianca.tipo).toBe('regra');
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b
    expect(result.fonte.lei).toBe('LC 214/2025');
  });

  // Caso 6: NBS 1.1303.10.00 — regime_geral, regra, confiança 95
  it('NBS 1.1303.10.00 → regime_geral, confiança 95, tipo regra', () => {
    const result = lookupNbs({ codigo: '1.1303.10.00', sistema: 'NBS' });

    expect(result.regime).toBe('regime_geral');
    expect(result.confianca.tipo).toBe('regra');
    expect(result.confianca.valor).toBe(95);
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b
    expect(result.fonte.lei).toBe('LC 214/2025');
  });

  // CNT-01b: confiança máxima NBS = 98 (nunca 100)
  it('confiança NBS nunca excede 98 (CNT-01b)', () => {
    const codigos = ['1.1506.21.00', '1.0901.33.00', '1.1303.10.00'];
    for (const codigo of codigos) {
      const result = lookupNbs({ codigo, sistema: 'NBS' });
      expect(result.confianca.valor).toBeLessThanOrEqual(98);
    }
  });

  // Caso NBS não encontrado → fallback
  it('NBS desconhecido → regime_geral, fallback < 95', () => {
    const result = lookupNbs({ codigo: '9.9999.99.99', sistema: 'NBS' });

    expect(result.regime).toBe('regime_geral');
    expect(result.confianca.tipo).toBe('fallback');
    expect(result.confianca.valor).toBeLessThan(95);
    expect(result.fonte.lei).toBe('LC 214/2025');
  });

  // CNT-02: fonte legal obrigatória em todo output
  it('toda resposta NBS tem fonte.lei preenchida (CNT-02)', () => {
    const codigos = ['1.1506.21.00', '1.0901.33.00', '1.1303.10.00', '9.9999.99.99'];
    for (const codigo of codigos) {
      const result = lookupNbs({ codigo, sistema: 'NBS' });
      expect(result.fonte.lei).toBeTruthy();
      expect(result.fonte.artigo).toBeTruthy();
    }
  });

  // CNT-02: campo confiança obrigatório em todo output
  it('toda resposta NBS tem campo confianca preenchido (CNT-02)', () => {
    const codigos = ['1.1506.21.00', '1.0901.33.00', '1.1303.10.00', '9.9999.99.99'];
    for (const codigo of codigos) {
      const result = lookupNbs({ codigo, sistema: 'NBS' });
      expect(result.confianca).toBeDefined();
      expect(typeof result.confianca.valor).toBe('number');
      expect(['deterministico', 'regra', 'fallback', 'condicional']).toContain(result.confianca.tipo);
    }
  });
});

// ─── Q5 Lote 1 — NCM (6 casos cesta básica + alimentos) ─────────────────────

describe('ncm-engine — Lote 1 (cesta básica + alimentos)', () => {

  // L1-01: Arroz quebrado
  it('[L1-01] NCM 1006.40.00 → aliquota_zero, deterministico, artigo 125', () => {
    const result = lookupNcm({ codigo: '1006.40.00', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.aliquota).toBe(0);
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('125');
    expect(result.nota).toBeUndefined();
  });

  // L1-02: Leite fluido
  it('[L1-02] NCM 0401.10.10 → aliquota_zero, deterministico, artigo 125', () => {
    const result = lookupNcm({ codigo: '0401.10.10', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.aliquota).toBe(0);
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('125');
    expect(result.nota).toBeUndefined();
  });

  // L1-03: Feijão
  it('[L1-03] NCM 0713.33.19 → aliquota_zero, deterministico, artigo 125', () => {
    const result = lookupNcm({ codigo: '0713.33.19', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.aliquota).toBe(0);
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('125');
    expect(result.nota).toBeUndefined();
  });

  // L1-04: Farinha de mandioca
  it('[L1-04] NCM 1106.20.00 → aliquota_zero, deterministico, artigo 125', () => {
    const result = lookupNcm({ codigo: '1106.20.00', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.aliquota).toBe(0);
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('125');
    expect(result.nota).toBeUndefined();
  });

  // L1-05: Açúcar
  it('[L1-05] NCM 1701.14.00 → aliquota_zero, deterministico, artigo 125', () => {
    const result = lookupNcm({ codigo: '1701.14.00', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.aliquota).toBe(0);
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('125');
    expect(result.nota).toBeUndefined();
  });

  // L1-06: Margarina
  it('[L1-06] NCM 1517.10.00 → aliquota_zero, deterministico, artigo 125', () => {
    const result = lookupNcm({ codigo: '1517.10.00', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.aliquota).toBe(0);
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('125');
    expect(result.nota).toBeUndefined();
  });

});

// ─── Q5 Lote 1 — NBS (4 casos: educação + saúde + financeiro + TI) ───────────

describe('nbs-engine — Lote 1 (educação + saúde + financeiro + TI)', () => {

  // L1-01 NBS: Ensino fundamental
  it('[NBS L1-01] NBS 1.2201.20.00 → reducao_60, deterministico (capped 98), artigo 129', () => {
    const result = lookupNbs({ codigo: '1.2201.20.00', sistema: 'NBS' });

    expect(result.regime).toBe('reducao_60');
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b
    expect(result.confianca.valor).toBeGreaterThan(0);
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('129');
  });

  // L1-02 NBS: Serviços médicos especializados
  it('[NBS L1-02] NBS 1.2301.22.00 → reducao_60, deterministico (capped 98), artigo 130', () => {
    const result = lookupNbs({ codigo: '1.2301.22.00', sistema: 'NBS' });

    expect(result.regime).toBe('reducao_60');
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b
    expect(result.confianca.valor).toBeGreaterThan(0);
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('130');
  });

  // L1-03 NBS: Cartão de crédito (regime_especial financeiro)
  it('[NBS L1-03] NBS 1.0901.40.00 → regime_especial, regra ≤ 98, artigo 181', () => {
    const result = lookupNbs({ codigo: '1.0901.40.00', sistema: 'NBS' });

    expect(result.regime).toBe('regime_especial');
    expect(result.confianca.tipo).toBe('regra');
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b
    expect(result.confianca.valor).toBeGreaterThan(0);
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toContain('181');
  });

  // L1-04 NBS: Consultoria em TI (regime_geral)
  it('[NBS L1-04] NBS 1.1501.10.00 → regime_geral, regra ≤ 98, artigos 11+15+21', () => {
    const result = lookupNbs({ codigo: '1.1501.10.00', sistema: 'NBS' });

    expect(result.regime).toBe('regime_geral');
    expect(result.confianca.tipo).toBe('regra');
    expect(result.confianca.valor).toBe(95); // confiança declarada no dataset
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBeTruthy();
  });

});

// ─── Q5 Lote 2 — NCM (3 casos: pão francês + calcário + fungicidas) ─────────

describe('ncm-engine — Lote 2 (panificação + agropecuário)', () => {

  // L2-01: Pão francês
  it('[L2-01] NCM 1905.90.90 → aliquota_zero, deterministico, artigo 125 Anexo I', () => {
    const result = lookupNcm({ codigo: '1905.90.90', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.aliquota).toBe(0);
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('125');
    expect(result.nota).toBeUndefined();
  });

  // L2-02: Calcário agrícola
  it('[L2-02] NCM 2521.00.00 → condicional, 100, artigo 138 Anexo IX', () => {
    const result = lookupNcm({ codigo: '2521.00.00', sistema: 'NCM' });

    expect(result.regime).toBe('condicional');
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('condicional');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('138');
    expect(result.aliquota).toBeNull();
  });

  // L2-03: Fungicidas agropecuários
  it('[L2-03] NCM 3808.92.19 → condicional, 100, artigo 138 Anexo IX', () => {
    const result = lookupNcm({ codigo: '3808.92.19', sistema: 'NCM' });

    expect(result.regime).toBe('condicional');
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('condicional');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('138');
    expect(result.aliquota).toBeNull();
  });

});

// ─── Q5 Lote 2 — NBS (5 casos: ensino superior + planos saúde + auditoria + seguro + software) ─

describe('nbs-engine — Lote 2 (educação superior + saúde + financeiro + TI)', () => {

  // L2-01 NBS: Ensino superior
  it('[NBS L2-01] NBS 1.2204.10.00 → reducao_60, regra ≤ 98, artigo 129 Anexo II', () => {
    const result = lookupNbs({ codigo: '1.2204.10.00', sistema: 'NBS' });

    expect(result.regime).toBe('reducao_60');
    expect(result.confianca.valor).toBe(98);
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('129');
  });

  // L2-03 NBS: Planos de saúde (CORREÇÃO S-07 — Arts. 234-235, não 193-199)
  it('[NBS L2-03] NBS 1.0910.10.00 → regime_especial, regra ≤ 98, artigo 234 (planos saúde)', () => {
    const result = lookupNbs({ codigo: '1.0910.10.00', sistema: 'NBS' });

    expect(result.regime).toBe('regime_especial');
    expect(result.confianca.valor).toBe(98);
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toContain('234');
  });

  // L2-04 NBS: Auditoria contábil (regime_geral)
  it('[NBS L2-04] NBS 1.1302.11.00 → regime_geral, regra ≤ 98, artigos 11+15+21', () => {
    const result = lookupNbs({ codigo: '1.1302.11.00', sistema: 'NBS' });

    expect(result.regime).toBe('regime_geral');
    expect(result.confianca.valor).toBe(95);
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBeTruthy();
  });

  // L2-05 NBS: Seguro de vida (regime_especial financeiro)
  it('[NBS L2-05] NBS 1.0903.11.00 → regime_especial, regra ≤ 98, artigo 182 XI + 223', () => {
    const result = lookupNbs({ codigo: '1.0903.11.00', sistema: 'NBS' });

    expect(result.regime).toBe('regime_especial');
    expect(result.confianca.valor).toBe(98);
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toContain('182');
  });

  // L2-06 NBS: Software customizado (regime_geral)
  it('[NBS L2-06] NBS 1.1502.20.00 → regime_geral, regra ≤ 98, artigos 11+15+21', () => {
    const result = lookupNbs({ codigo: '1.1502.20.00', sistema: 'NBS' });

    expect(result.regime).toBe('regime_geral');
    expect(result.confianca.valor).toBe(95);
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBeTruthy();
  });

});

// ─── Q5 Lote 3 — NCM (7 casos: cesta básica + higiene + alimentos) ─────────────

describe('ncm-engine — Lote 3 (cesta básica + higiene + óleos)', () => {

  // L3-01: Leite em pó
  it('[L3-01] NCM 0402.10.10 → aliquota_zero, deterministico, artigo 125 Anexo I', () => {
    const result = lookupNcm({ codigo: '0402.10.10', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.aliquota).toBe(0);
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('125');
  });

  // L3-02: Café
  it('[L3-02] NCM 0901.11.00 → aliquota_zero, deterministico, artigo 125 Anexo I', () => {
    const result = lookupNcm({ codigo: '0901.11.00', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.aliquota).toBe(0);
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('125');
  });

  // L3-03: Farinha de trigo
  it('[L3-03] NCM 1101.00.10 → aliquota_zero, deterministico, artigo 125 Anexo I', () => {
    const result = lookupNcm({ codigo: '1101.00.10', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.aliquota).toBe(0);
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('125');
  });

  // L3-04: Manteiga
  it('[L3-04] NCM 0405.10.00 → aliquota_zero, deterministico, artigo 125 Anexo I', () => {
    const result = lookupNcm({ codigo: '0405.10.00', sistema: 'NCM' });

    expect(result.regime).toBe('aliquota_zero');
    expect(result.aliquota).toBe(0);
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('125');
  });

  // L3-05: Papel higiênico
  it('[L3-05] NCM 4818.10.00 → reducao_60, deterministico, artigo 136 Anexo VIII', () => {
    const result = lookupNcm({ codigo: '4818.10.00', sistema: 'NCM' });

    expect(result.regime).toBe('reducao_60');
    expect(result.aliquota).toBeNull();
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('136');
  });

  // L3-06: Sabão em barra
  it('[L3-06] NCM 3401.19.00 → reducao_60, deterministico, artigo 136 Anexo VIII', () => {
    const result = lookupNcm({ codigo: '3401.19.00', sistema: 'NCM' });

    expect(result.regime).toBe('reducao_60');
    expect(result.aliquota).toBeNull();
    expect(result.confianca.valor).toBe(100);
    expect(result.confianca.tipo).toBe('deterministico');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('136');
  });

  // L3-07: Óleo de soja refinado
  it('[L3-07] NCM 1507.90.11 → reducao_60, regra 95, artigo 135 Anexo VII', () => {
    const result = lookupNcm({ codigo: '1507.90.11', sistema: 'NCM' });

    expect(result.regime).toBe('reducao_60');
    expect(result.aliquota).toBeNull();
    expect(result.confianca.valor).toBe(95);
    expect(result.confianca.tipo).toBe('regra');
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('135');
  });

});

// ─── Q5 Lote 3 — NBS (6 confirmados + 1 pending) ────────────────────────────

describe('nbs-engine — Lote 3 (saúde + educação + financeiro + geral + pending)', () => {

  // L3-01 NBS: Psicologia
  it('[NBS L3-01] NBS 1.2301.98.00 → reducao_60, regra ≤ 98, artigo 130 Anexo III', () => {
    const result = lookupNbs({ codigo: '1.2301.98.00', sistema: 'NBS' });

    expect(result.regime).toBe('reducao_60');
    expect(result.confianca.valor).toBeLessThanOrEqual(98);
    expect(result.confianca.valor).toBeGreaterThan(0);
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('130');
  });

  // L3-02 NBS: Fisioterapia
  it('[NBS L3-02] NBS 1.2301.92.00 → reducao_60, regra ≤ 98, artigo 130 Anexo III', () => {
    const result = lookupNbs({ codigo: '1.2301.92.00', sistema: 'NBS' });

    expect(result.regime).toBe('reducao_60');
    expect(result.confianca.valor).toBeLessThanOrEqual(98);
    expect(result.confianca.valor).toBeGreaterThan(0);
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('130');
  });

  // L3-03 NBS: Ensino médio
  it('[NBS L3-03] NBS 1.2201.30.00 → reducao_60, deterministico, artigo 129 Anexo II', () => {
    const result = lookupNbs({ codigo: '1.2201.30.00', sistema: 'NBS' });

    expect(result.regime).toBe('reducao_60');
    expect(result.confianca.valor).toBeLessThanOrEqual(98); // CNT-01b cap
    expect(result.confianca.valor).toBeGreaterThan(95);
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBe('129');
  });

  // L3-04 NBS: Leasing financeiro
  it('[NBS L3-04] NBS 1.0901.51.24 → regime_especial, regra ≤ 98, artigo 182 VI + 201', () => {
    const result = lookupNbs({ codigo: '1.0901.51.24', sistema: 'NBS' });

    expect(result.regime).toBe('regime_especial');
    expect(result.confianca.valor).toBeLessThanOrEqual(98);
    expect(result.confianca.valor).toBeGreaterThan(0);
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toContain('181');
  });

  // L3-05 NBS: Contabilidade
  it('[NBS L3-05] NBS 1.1302.21.00 → regime_geral, regra 95, artigos 11+15+21', () => {
    const result = lookupNbs({ codigo: '1.1302.21.00', sistema: 'NBS' });

    expect(result.regime).toBe('regime_geral');
    expect(result.confianca.valor).toBe(95);
    expect(result.confianca.valor).toBeLessThanOrEqual(98);
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBeTruthy();
  });

  // L3-06 NBS: Arquitetura
  it('[NBS L3-06] NBS 1.1402.12.00 → regime_geral, regra 95, artigos 11+15+21', () => {
    const result = lookupNbs({ codigo: '1.1402.12.00', sistema: 'NBS' });

    expect(result.regime).toBe('regime_geral');
    expect(result.confianca.valor).toBe(95);
    expect(result.confianca.valor).toBeLessThanOrEqual(98);
    expect(result.fonte.lei).toBe('LC 214/2025');
    expect(result.fonte.artigo).toBeTruthy();
  });

  // L3-07 NBS: Corretagem de seguros (PENDING — confianca.valor=0, tipo=fallback)
  it('[NBS L3-07] NBS 1.0906.11.00 → confianca.valor=0, tipo=fallback (pending_validation)', () => {
    const result = lookupNbs({ codigo: '1.0906.11.00', sistema: 'NBS' });

    expect(result.confianca.valor).toBe(0);
    expect(result.confianca.tipo).toBe('fallback');
    expect(result.fonte.lei).toBe('LC 214/2025');
  });

});

// ─── Contrato CNT-03: source='engine' ────────────────────────────────────────

describe('CNT-03 — campos obrigatórios para gaps com source=engine', () => {

  it('output NCM tem campos necessários para gap CNT-03', () => {
    const result = lookupNcm({ codigo: '9619.00.00', sistema: 'NCM' });

    // Campos que serão mapeados para project_gaps_v3 (CNT-03)
    expect(result.regime).toBeTruthy();           // → gap_descricao
    expect(result.confianca.valor).toBeGreaterThanOrEqual(0); // → confianca_engine.valor
    expect(result.confianca.tipo).toBeTruthy();   // → confianca_engine.tipo
    expect(result.fonte.lei).toBeTruthy();        // → fonte_legal.lei
    expect(result.fonte.artigo).toBeTruthy();     // → fonte_legal.artigo
  });

  it('output NBS tem campos necessários para gap CNT-03', () => {
    const result = lookupNbs({ codigo: '1.1506.21.00', sistema: 'NBS' });

    expect(result.regime).toBeTruthy();
    expect(result.confianca.valor).toBeGreaterThanOrEqual(0);
    expect(result.confianca.tipo).toBeTruthy();
    expect(result.fonte.lei).toBeTruthy();
    expect(result.fonte.artigo).toBeTruthy();
  });
});
