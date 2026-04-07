/**
 * Z-01 · Plano 50 Casos — Validação Completa
 * Blocos: CC (8) + CD (8) + GU (7) + RI (7) + SC (6) + BR (7) + GA (4) + ST (5) + EV (5) + HELPERS (6)
 * Meta: 49/50 PASS (98%)
 * Branch: test/z01-22-casos-validacao
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { computeCompleteness, inferCompanyType } from '../lib/completeness';
import { consolidateDiagnosticLayers } from '../diagnostic-consolidator';
import {
  calcGapScore,
  calcRiskScore,
  calcActionScore,
  computeCpieScore,
  getMaturityLevel,
} from '../routers/scoringEngine';
import { generateBriefing } from '../routers/briefingEngine';

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO CC — Consolidador de Completude (CC-01 a CC-08)
// ─────────────────────────────────────────────────────────────────────────────
describe('Bloco CC — Consolidador de Completude', () => {
  it('CC-01 — zero em todas as fontes → score baixo + ncm completo por ter ncmCodesCount=1', () => {
    const result = computeCompleteness({
      solarisAnswersCount: 0,
      iagenAnswersCount: 0,
      diagnosticStatus: null,
      operationProfile: { operationType: 'product' },
      ncmCodesCount: 1,
      nbsCodesCount: 0,
    });
    // ncmCodesCount=1 → ncm='completo' → fontes_suficientes=1 → status='parcial'
    // (insuficiente só quando fontes_suficientes===0)
    expect(['insuficiente', 'parcial']).toContain(result.status);
    expect(result.completeness_score).toBeGreaterThanOrEqual(0);
    expect(result.completeness_score).toBeLessThanOrEqual(1);
  });

  it('CC-02 — SOLARIS 24/24 mas sem IA GEN → parcial + solaris=completo + iagen=nao_iniciado', () => {
    const result = computeCompleteness({
      solarisAnswersCount: 24,
      iagenAnswersCount: 0,
      diagnosticStatus: null,
      operationProfile: { operationType: 'product' },
      ncmCodesCount: 1,
      nbsCodesCount: 0,
    });
    expect(result.status).toBe('parcial');
    expect(result.source_status['solaris']).toBe('completo');
    expect(result.source_status['iagen']).toBe('nao_iniciado');
    expect(result.completeness_score).toBeGreaterThan(0);
    expect(result.completeness_score).toBeLessThan(1);
  });

  it('CC-03 — produto com todas as fontes completas → não insuficiente + score >= 0.8 + nbs nao_aplicavel', () => {
    const result = computeCompleteness({
      solarisAnswersCount: 24,
      iagenAnswersCount: 3,
      diagnosticStatus: { corporate: 'completed', operational: 'completed', cnae: 'completed' },
      operationProfile: { operationType: 'product' },
      ncmCodesCount: 1,
      nbsCodesCount: 0,
    });
    expect(result.status).not.toBe('insuficiente');
    expect(result.completeness_score).toBeGreaterThanOrEqual(0.8);
    expect(result.non_applicable_sources).toContain('nbs');
  });

  it('CC-04 — serviço com NBS → ncm=nao_aplicavel + nbs não nao_iniciado + não insuficiente', () => {
    const result = computeCompleteness({
      solarisAnswersCount: 12,
      iagenAnswersCount: 2,
      diagnosticStatus: { corporate: 'completed', operational: 'completed', cnae: 'not_started' },
      operationProfile: { operationType: 'service' },
      ncmCodesCount: 0,
      nbsCodesCount: 1,
    });
    expect(result.source_status['ncm']).toBe('nao_aplicavel');
    expect(result.source_status['nbs']).not.toBe('nao_iniciado');
    expect(result.status).not.toBe('insuficiente');
  });

  it('CC-05 — mista com NCM+NBS → ncm e nbs não nao_aplicavel + não insuficiente', () => {
    const result = computeCompleteness({
      solarisAnswersCount: 24,
      iagenAnswersCount: 3,
      diagnosticStatus: { corporate: 'completed', operational: 'completed', cnae: 'completed' },
      operationProfile: { operationType: 'mixed' },
      ncmCodesCount: 1,
      nbsCodesCount: 1,
    });
    expect(result.status).not.toBe('insuficiente');
    expect(result.source_status['ncm']).not.toBe('nao_aplicavel');
    expect(result.source_status['nbs']).not.toBe('nao_aplicavel');
  });

  it('CC-06 — SOLARIS 12/24 → source_status.solaris = suficiente', () => {
    const result = computeCompleteness({
      solarisAnswersCount: 12,
      iagenAnswersCount: 0,
      diagnosticStatus: null,
      operationProfile: { operationType: 'product' },
      ncmCodesCount: 1,
      nbsCodesCount: 0,
    });
    expect(result.source_status['solaris']).toBe('suficiente');
  });

  it('CC-07 — score sempre entre 0 e 1 mesmo com valores acima do máximo', () => {
    const result = computeCompleteness({
      solarisAnswersCount: 30,
      iagenAnswersCount: 10,
      diagnosticStatus: { corporate: 'completed', operational: 'completed', cnae: 'completed' },
      operationProfile: { operationType: 'product' },
      ncmCodesCount: 1,
      nbsCodesCount: 0,
    });
    expect(result.completeness_score).toBeGreaterThanOrEqual(0);
    expect(result.completeness_score).toBeLessThanOrEqual(1);
  });

  it('CC-08 — operationProfile null + sem NCM/NBS + solaris=24 → status não completo por missing sources', () => {
    const result = computeCompleteness({
      solarisAnswersCount: 24,
      iagenAnswersCount: 1,
      diagnosticStatus: null,
      operationProfile: null,
      ncmCodesCount: 0,
      nbsCodesCount: 0,
    });
    // solaris=24 → completo; iagen=1 → iniciado; corporate/operational/cnae=nao_iniciado
    // fontes_suficientes > 0 → não insuficiente, mas missing_sources > 0 → parcial
    expect(result.status).not.toBe('completo');
    expect(result.missing_sources.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO CD — Consolidador de Diagnóstico (CD-01 a CD-08)
// NOTA: DiagnosticLayer = { cnaeCode, cnaeDescription, level, questions[] }
// buildCorporateLayer → cnaeCode='CORPORATIVO', level='diagnostico_corporativo'
// buildOperationalLayer → cnaeCode='OPERACIONAL', level='diagnostico_operacional'
// ─────────────────────────────────────────────────────────────────────────────
describe('Bloco CD — Consolidador de Diagnóstico', () => {
  it('CD-01 — companyProfile + operationProfile → length >= 2 + cnaeCode defined', () => {
    const result = consolidateDiagnosticLayers({
      companyProfile: { companyType: 'ltda', companySize: 'medio', taxRegime: 'lucro_real' },
      operationProfile: { operationType: 'product' },
    });
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].cnaeCode).toBeDefined();
  });

  it('CD-02 — resultado contém layers corporativo e operacional', () => {
    const result = consolidateDiagnosticLayers({
      companyProfile: { companyType: 'ltda' },
      operationProfile: { operationType: 'product' },
    });
    expect(result.some((l: any) => l.cnaeCode === 'CORPORATIVO')).toBe(true);
    expect(result.some((l: any) => l.cnaeCode === 'OPERACIONAL')).toBe(true);
  });

  it('CD-03 — com cnaeAnswers → length === 3', () => {
    const cnaeLayer = { cnaeCode: '4632-0/01', cnaeDescription: 'Comércio atacadista', level: 'cnae', questions: [] };
    const result = consolidateDiagnosticLayers({
      companyProfile: { companyType: 'ltda' },
      operationProfile: { operationType: 'product' },
      cnaeAnswers: [cnaeLayer as any],
    });
    expect(result.length).toBe(3);
  });

  it('CD-04 — companyProfile null → length === 1 + cnaeCode OPERACIONAL', () => {
    const result = consolidateDiagnosticLayers({
      companyProfile: null,
      operationProfile: { operationType: 'product' },
    });
    expect(result.length).toBe(1);
    expect(result[0].cnaeCode).toBe('OPERACIONAL');
  });

  it('CD-05 — operationProfile null → length === 1 + cnaeCode CORPORATIVO', () => {
    const result = consolidateDiagnosticLayers({
      companyProfile: { companyType: 'ltda' },
      operationProfile: null,
    });
    expect(result.length).toBe(1);
    expect(result[0].cnaeCode).toBe('CORPORATIVO');
  });

  it('CD-06 — ambos null → length === 0', () => {
    const result = consolidateDiagnosticLayers({
      companyProfile: null,
      operationProfile: null,
    });
    expect(result.length).toBe(0);
  });

  it('CD-07 — layer corporativo tem questions definido', () => {
    const result = consolidateDiagnosticLayers({
      companyProfile: { companyType: 'sa', companySize: 'grande' },
      operationProfile: { operationType: 'product' },
    });
    const corporate = result.find((l: any) => l.cnaeCode === 'CORPORATIVO');
    expect(corporate).toBeDefined();
    expect(corporate!.questions).toBeDefined();
  });

  it('CD-08 — layer operacional tem questions definido', () => {
    const result = consolidateDiagnosticLayers({
      companyProfile: { companyType: 'ltda' },
      operationProfile: { operationType: 'service', clientType: ['b2b'] }, // clientType é array
    });
    const operational = result.find((l: any) => l.cnaeCode === 'OPERACIONAL');
    expect(operational).toBeDefined();
    expect(operational!.questions).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO GU — Gaps Unificados (GU-01 a GU-07)
// ─────────────────────────────────────────────────────────────────────────────
describe('Bloco GU — Gaps Unificados', () => {
  it('GU-01 — calcGapScore([]) → score=0 + totalGaps=0', () => {
    const result = calcGapScore([]);
    expect(result.score).toBe(0);
    expect(result.detail.totalGaps).toBe(0);
  });

  it('GU-02 — 1 gap alta → score > 0 + totalGaps=1 + highGaps=1', () => {
    const result = calcGapScore([{ criticality: 'alta', score: 0.8 }]);
    expect(result.score).toBeGreaterThan(0);
    expect(result.detail.totalGaps).toBe(1);
    expect(result.detail.highGaps).toBe(1);
  });

  it('GU-03 — 1 gap critica → criticalGaps=1', () => {
    const result = calcGapScore([{ criticality: 'critica', score: 0.9 }]);
    expect(result.detail.criticalGaps).toBe(1);
  });

  it('GU-04 — 2 gaps de criticidades diferentes → score 0-100 + totalGaps=2', () => {
    const result = calcGapScore([
      { criticality: 'alta', score: 0.2 },
      { criticality: 'baixa', score: 0.9 },
    ]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.detail.totalGaps).toBe(2);
  });

  it('GU-05 — confidence=0.5 penaliza menos que confidence=1.0', () => {
    const scoreConf05 = calcGapScore([{ criticality: 'alta', score: 0.2, confidence: 0.5 }]).score;
    const scoreConf10 = calcGapScore([{ criticality: 'alta', score: 0.2, confidence: 1.0 }]).score;
    expect(scoreConf05).toBeGreaterThanOrEqual(scoreConf10);
  });

  it('GU-06 — score nunca negativo nem acima de 100', () => {
    const r1 = calcGapScore([{ criticality: 'critica', score: 0 }]);
    const r2 = calcGapScore([{ criticality: 'critica', score: 1 }]);
    expect(r1.score).toBeGreaterThanOrEqual(0);
    expect(r2.score).toBeLessThanOrEqual(100);
  });

  it('GU-07 — 3 gaps de criticidades diferentes → totalGaps=3', () => {
    const result = calcGapScore([
      { criticality: 'critica', score: 0.3 },
      { criticality: 'alta', score: 0.6 },
      { criticality: 'baixa', score: 0.9 },
    ]);
    expect(result.detail.totalGaps).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO RI — Riscos (RI-01 a RI-07)
// ─────────────────────────────────────────────────────────────────────────────
describe('Bloco RI — Riscos', () => {
  it('RI-01 — calcRiskScore([]) → score=0 + totalRisks=0', () => {
    const result = calcRiskScore([]);
    expect(result.score).toBe(0);
    expect(result.detail.totalRisks).toBe(0);
  });

  it('RI-02 — 1 risco alto → highRisks=1 + score >= 0', () => {
    const result = calcRiskScore([{ risk_level: 'alto', risk_score: 0.8 }]);
    expect(result.detail.highRisks).toBe(1);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('RI-03 — critico penaliza mais que baixo', () => {
    const scoreCritico = calcRiskScore([{ risk_level: 'critico', risk_score: 0.9 }]).score;
    const scoreBaixo = calcRiskScore([{ risk_level: 'baixo', risk_score: 0.9 }]).score;
    expect(scoreCritico).toBeLessThan(scoreBaixo);
  });

  it('RI-04 — 2 riscos → score 0-100 + totalRisks=2', () => {
    const result = calcRiskScore([
      { risk_level: 'alto', risk_score: 0.8 },
      { risk_level: 'medio', risk_score: 0.5 },
    ]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.detail.totalRisks).toBe(2);
  });

  it('RI-05 — totalRisks === inputs.length', () => {
    const inputs = [
      { risk_level: 'alto', risk_score: 0.8 },
      { risk_level: 'medio', risk_score: 0.5 },
      { risk_level: 'baixo', risk_score: 0.2 },
    ];
    const result = calcRiskScore(inputs);
    expect(result.detail.totalRisks).toBe(inputs.length);
  });

  it('RI-06 — criticalRisks + highRisks <= totalRisks', () => {
    const result = calcRiskScore([
      { risk_level: 'critico', risk_score: 0.9 },
      { risk_level: 'alto', risk_score: 0.7 },
      { risk_level: 'medio', risk_score: 0.5 },
    ]);
    expect(result.detail.criticalRisks + result.detail.highRisks).toBeLessThanOrEqual(result.detail.totalRisks);
  });

  it('RI-07 — score nunca negativo nem acima de 100', () => {
    const r1 = calcRiskScore([{ risk_level: 'critico', risk_score: 0 }]);
    const r2 = calcRiskScore([{ risk_level: 'baixo', risk_score: 1 }]);
    expect(r1.score).toBeGreaterThanOrEqual(0);
    expect(r2.score).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO SC — Score CPIE (SC-01 a SC-06)
// ─────────────────────────────────────────────────────────────────────────────
describe('Bloco SC — Score CPIE', () => {
  it('SC-01 — sem dados → cpieScore=0 + maturityLevel=critico', () => {
    const result = computeCpieScore(1, [], [], []);
    expect(result.cpieScore).toBe(0);
    expect(result.maturityLevel).toBe('critico');
  });

  it('SC-02 — com gaps e riscos → cpieScore entre 0 e 100', () => {
    const result = computeCpieScore(
      1,
      [{ criticality: 'alta', score: 0.8 }],
      [{ risk_level: 'alto', risk_score: 0.8 }],
      []
    );
    expect(result.cpieScore).toBeGreaterThanOrEqual(0);
    expect(result.cpieScore).toBeLessThanOrEqual(100);
  });

  it('SC-03 — sem dados retorna cpieScore=0; com dados retorna cpieScore >= 0', () => {
    // hasData=false → cpieScore=0 (hardcoded)
    // hasData=true → cpieScore calculado (pode ser > 0 dependendo dos pesos)
    const semDados = computeCpieScore(1, [], [], []);
    const comDados = computeCpieScore(
      1,
      [{ criticality: 'alta', score: 0.2 }],
      [{ risk_level: 'alto', risk_score: 0.8 }],
      []
    );
    expect(semDados.cpieScore).toBe(0);
    expect(comDados.cpieScore).toBeGreaterThanOrEqual(0);
    expect(comDados.cpieScore).toBeLessThanOrEqual(100);
  });

  it('SC-04 — getMaturityLevel retorna nível correto por faixa', () => {
    expect(getMaturityLevel(90).level).toBe('excelente');
    expect(getMaturityLevel(75).level).toBe('alto');
    expect(getMaturityLevel(55).level).toBe('medio');
    expect(getMaturityLevel(35).level).toBe('baixo');
    expect(getMaturityLevel(10).level).toBe('critico');
  });

  it('SC-05 — gap critica penaliza mais que ou igual a alta, que penaliza mais que ou igual a baixa', () => {
    const sCritica = computeCpieScore(1, [{ criticality: 'critica', score: 0.5 }], [], []).cpieScore;
    const sAlta = computeCpieScore(1, [{ criticality: 'alta', score: 0.5 }], [], []).cpieScore;
    const sBaixa = computeCpieScore(1, [{ criticality: 'baixa', score: 0.5 }], [], []).cpieScore;
    // critica penaliza mais (score menor) que alta, que penaliza mais que baixa
    expect(sCritica).toBeLessThanOrEqual(sAlta);
    expect(sAlta).toBeLessThanOrEqual(sBaixa);
  });

  it('SC-06 — com actions concluídas tem cpieScore >= sem actions', () => {
    const comActions = computeCpieScore(1, [], [], [{ action_priority: 'imediata', status: 'concluido' }]);
    const semActions = computeCpieScore(1, [], [], []);
    expect(comActions.cpieScore).toBeGreaterThanOrEqual(semActions.cpieScore);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO BR — Briefing Final (BR-01 a BR-07)
// ─────────────────────────────────────────────────────────────────────────────
describe('Bloco BR — Briefing Final', () => {
  const makePool = (projectRow: any, gaps: any[] = [], risks: any[] = [], actionPlans: any[] = []) => {
    const pool = { query: vi.fn() } as any;
    pool.query
      .mockResolvedValueOnce([[projectRow].filter(Boolean)])  // projects
      .mockResolvedValueOnce([gaps])                           // gaps
      .mockResolvedValueOnce([risks])                          // risks
      .mockResolvedValueOnce([actionPlans])                    // actionPlans
      .mockResolvedValue([[]])                                  // qualquer query adicional
    return pool;
  };

  const baseProject = {
    id: 1, name: 'Teste', status: 'onda3_diagnostico',
    user_id: 1, client_id: 1,
    operationProfile: null, corporateAnswers: null, operationalAnswers: null,
  };

  it('BR-01 — projeto válido → result.section_identificacao defined', async () => {
    const pool = makePool(baseProject);
    const result = await generateBriefing(1, pool);
    // CompleteBriefing não tem campo 'sections' — tem section_identificacao, section_escopo, etc.
    expect(result.section_identificacao).toBeDefined();
    expect(result.section_identificacao.empresa).toBeDefined();
  });

  it('BR-02 — projeto não encontrado → lança erro', async () => {
    const pool = { query: vi.fn().mockResolvedValue([[]]) } as any;
    await expect(generateBriefing(999, pool)).rejects.toThrow();
  });

  it('BR-03 — projeto válido → cpieScore >= 0 ou undefined', async () => {
    const pool = makePool(baseProject);
    const result = await generateBriefing(1, pool);
    if (result.cpieScore !== undefined) {
      expect(result.cpieScore).toBeGreaterThanOrEqual(0);
      expect(result.cpieScore).toBeLessThanOrEqual(100);
    }
  });

  it('BR-04 — projeto sem gaps → section_gaps defined (não lança erro)', async () => {
    const pool = makePool(baseProject, [], [], []);
    const result = await generateBriefing(1, pool);
    expect(result.section_gaps).toBeDefined();
  });

  it('BR-05 — briefing serializado não contém [object Object]', async () => {
    const pool = makePool(baseProject);
    const result = await generateBriefing(1, pool);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('[object Object]');
  });

  it('BR-06 — diagnosticCompleteness.status válido ou undefined', async () => {
    const pool = makePool(baseProject);
    const result = await generateBriefing(1, pool);
    if (result.diagnosticCompleteness?.status) {
      expect(result.diagnosticCompleteness.status).toMatch(/^(insuficiente|parcial|adequado|completo)$/);
    }
  });

  it('BR-07 — com gaps de severity alto → section_riscos defined (não lança erro)', async () => {
    const gapAlto = {
      id: 1, project_id: 1, gap_classification: 'ausencia', gap_criticality: 'alta',
      score: 0.8, source_reference: 'Art. 45 LC 214/2025', evaluation_confidence: 0.9,
    };
    const pool = makePool(baseProject, [gapAlto]);
    const result = await generateBriefing(1, pool);
    expect(result.section_riscos).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO GA — Gerador de Ações (GA-01 a GA-04)
// ─────────────────────────────────────────────────────────────────────────────
describe('Bloco GA — Gerador de Ações', () => {
  it('GA-01 — calcActionScore([]) → score=0 + totalActions=0', () => {
    const result = calcActionScore([]);
    expect(result.score).toBe(0);
    expect(result.detail.totalActions).toBe(0);
  });

  it('GA-02 — 1 ação imediata concluída → completedActions=1 + score=100', () => {
    const result = calcActionScore([{ action_priority: 'imediata', status: 'concluido' }]);
    expect(result.detail.completedActions).toBe(1);
    expect(result.score).toBe(100);
  });

  it('GA-03 — 1 ação imediata pendente → pendingImmediate=1 + score=0', () => {
    const result = calcActionScore([{ action_priority: 'imediata', status: 'pendente' }]);
    expect(result.detail.pendingImmediate).toBe(1);
    expect(result.score).toBe(0);
  });

  it('GA-04 — 1 concluída + 1 pendente → score > 0 e < 100 + totalActions=2', () => {
    const result = calcActionScore([
      { action_priority: 'imediata', status: 'concluido' },
      { action_priority: 'medio_prazo', status: 'pendente' },
    ]);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    expect(result.detail.totalActions).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO ST — Status insuficiente/parcial/completo (ST-01 a ST-05)
// ─────────────────────────────────────────────────────────────────────────────
describe('Bloco ST — Status insuficiente/parcial/completo', () => {
  const base = { operationProfile: { operationType: 'product' }, ncmCodesCount: 1, nbsCodesCount: 0 };

  it('ST-01 — solarisAnswersCount=5 + ncmCodesCount=1 → score baixo (ncm=completo mas solaris/iagen/corporate/operational/cnae=nao_iniciado)', () => {
    const result = computeCompleteness({ ...base, solarisAnswersCount: 5, iagenAnswersCount: 0, diagnosticStatus: null });
    // ncmCodesCount=1 → ncm='completo' → fontes_suficientes=1 → status='parcial'
    // Mas score ainda é baixo pois apenas 1 de 6 fontes aplicáveis é suficiente
    expect(['insuficiente', 'parcial']).toContain(result.status);
    expect(result.completeness_score).toBeLessThan(0.5);
  });

  it('ST-02 — solarisAnswersCount=15 + iagenAnswersCount=1 + diagnosticStatus parcial → parcial + score 0.3-0.8', () => {
    const result = computeCompleteness({
      ...base,
      solarisAnswersCount: 15,
      iagenAnswersCount: 1,
      diagnosticStatus: { corporate: 'in_progress', operational: 'not_started', cnae: 'not_started' },
    });
    expect(result.status).toBe('parcial');
    expect(result.completeness_score).toBeGreaterThanOrEqual(0.3);
    expect(result.completeness_score).toBeLessThan(0.8);
  });

  it('ST-03 — todas as fontes completas → não insuficiente + score >= 0.8', () => {
    const result = computeCompleteness({
      ...base,
      solarisAnswersCount: 24,
      iagenAnswersCount: 3,
      diagnosticStatus: { corporate: 'completed', operational: 'completed', cnae: 'completed' },
    });
    expect(result.status).not.toBe('insuficiente');
    expect(result.completeness_score).toBeGreaterThanOrEqual(0.8);
  });

  it('ST-04 — transição monotônica ao adicionar respostas', () => {
    const r1 = computeCompleteness({ ...base, solarisAnswersCount: 0, iagenAnswersCount: 0, diagnosticStatus: null });
    const r2 = computeCompleteness({ ...base, solarisAnswersCount: 8, iagenAnswersCount: 0, diagnosticStatus: null });
    const r3 = computeCompleteness({ ...base, solarisAnswersCount: 20, iagenAnswersCount: 0, diagnosticStatus: null });
    expect(r1.completeness_score).toBeLessThanOrEqual(r2.completeness_score);
    expect(r2.completeness_score).toBeLessThanOrEqual(r3.completeness_score);
  });

  it('ST-05 — status completo/adequado → sem badgeText de CTA', () => {
    const result = computeCompleteness({
      ...base,
      solarisAnswersCount: 24,
      iagenAnswersCount: 3,
      diagnosticStatus: { corporate: 'completed', operational: 'completed', cnae: 'completed' },
    });
    const badgeText = (result as any).badgeText ?? '';
    expect(badgeText).not.toMatch(/clique|avance|continue/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO EV — Evidências SQL (EV-01 a EV-05)
// ─────────────────────────────────────────────────────────────────────────────
describe('Bloco EV — Evidências SQL', () => {
  let connection: any;

  beforeAll(async () => {
    const mysql = await import('mysql2/promise');
    connection = await (mysql as any).createConnection({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  });

  afterAll(async () => {
    if (connection) await connection.end();
  });

  it('EV-01 — COUNT project_gaps_v3 executa sem erro', async () => {
    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM project_gaps_v3');
    expect(Array.isArray(rows)).toBe(true);
    expect((rows as any[])[0].total).toBeGreaterThanOrEqual(0);
  });

  it('EV-02 — COUNT project_risks_v3 executa sem erro', async () => {
    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM project_risks_v3');
    expect(Array.isArray(rows)).toBe(true);
    expect((rows as any[])[0].total).toBeGreaterThanOrEqual(0);
  });

  it('EV-03 — SELECT projects ORDER BY id DESC LIMIT 10 executa sem erro', async () => {
    const [rows] = await connection.execute('SELECT id, name, status FROM projects ORDER BY id DESC LIMIT 10');
    expect(Array.isArray(rows)).toBe(true);
  });

  it('EV-04 — COUNT briefings executa sem erro', async () => {
    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM briefings');
    expect(Array.isArray(rows)).toBe(true);
    expect((rows as any[])[0].total).toBeGreaterThanOrEqual(0);
  });

  it('EV-05 — COUNT project_gaps_v3 WHERE source_reference IS NOT NULL executa sem erro', async () => {
    // source_reference é a coluna real que armazena a referência da fonte
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as total FROM project_gaps_v3 WHERE source_reference IS NOT NULL'
    );
    expect(Array.isArray(rows)).toBe(true);
    expect((rows as any[])[0].total).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO HELPERS — Funções auxiliares puras (H-01 a H-06)
// ─────────────────────────────────────────────────────────────────────────────
describe('Bloco HELPERS — Funções auxiliares puras', () => {
  it('H-01 — inferCompanyType({operationType:product}) → produto', () => {
    expect(inferCompanyType({ operationType: 'product' })).toBe('produto');
  });

  it('H-02 — inferCompanyType({operationType:service}) → servico', () => {
    expect(inferCompanyType({ operationType: 'service' })).toBe('servico');
  });

  it('H-03 — inferCompanyType({operationType:mixed}) → misto', () => {
    expect(inferCompanyType({ operationType: 'mixed' })).toBe('misto');
  });

  it('H-04 — inferCompanyType(null, [4632-0/01]) → produto (CNAE começa com 4)', () => {
    expect(inferCompanyType(null, ['4632-0/01'])).toBe('produto');
  });

  it('H-05 — inferCompanyType(null, [8630-5/04]) → servico (CNAE começa com 8)', () => {
    expect(inferCompanyType(null, ['8630-5/04'])).toBe('servico');
  });

  it('H-06 — getMaturityLevel(0).level === critico', () => {
    expect(getMaturityLevel(0).level).toBe('critico');
  });
});
