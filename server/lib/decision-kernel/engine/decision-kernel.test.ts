/**
 * decision-kernel.test.ts — Testes Vitest para ncm-engine + nbs-engine
 *
 * Cobertura: 6 casos POC Milestone 1 (5 confirmados + 1 pending_validation)
 * Contratos: CNT-01a, CNT-01b, CNT-02, CNT-03
 *
 * Aprovado: Orquestrador Claude — 2026-04-05 (Bloco C)
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

  // Caso 3: NCM 2202.10.00 — pending_validation → fallback obrigatório
  it('NCM 2202.10.00 (pending_validation) → confiança 0, tipo fallback, nota presente', () => {
    const result = lookupNcm({ codigo: '2202.10.00', sistema: 'NCM' });

    expect(result.confianca.valor).toBe(0);
    expect(result.confianca.tipo).toBe('fallback');
    expect(result.nota).toBeTruthy();
    expect(result.nota).toContain('pendente de validação');
    // regime retornado mas não deve ser usado em produção
    expect(result.regime).toBeTruthy();
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
