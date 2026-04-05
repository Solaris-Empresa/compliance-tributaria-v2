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
