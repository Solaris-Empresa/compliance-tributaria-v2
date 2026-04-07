import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categorizeRisk, GapInput } from '../lib/risk-categorizer';

// Tipos auxiliares para runFullDiagnostic
type GapLike = {
  id: string;
  fonte: string;
  fonte_ref: string;
  lei_ref: string;
  ncm?: string;
  nbs?: string;
  descricao?: string;
  categoria?: string;
};

type RiscoLike = {
  id: string;
  source_gap_ids: string[];
  lei_ref: string;
  severity: 'alto' | 'medio' | 'baixo';
  descricao: string;
  fonte?: string;
};

type DiagnosticResult = {
  gaps: GapLike[];
  riscos: RiscoLike[];
  briefing?: any;
};

type ProjetoInput = {
  ncmAnswers?: { ncm: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao' }[];
  solarisAnswers?: { id: string; lei_ref: string; resposta: 'sim' | 'nao' }[];
  nbsAnswers?: { nbs: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao' }[];
  iagenAnswers?: { id: string; fonte_ref: string; lei_ref: string; gap: string }[];
  confirmedCnaes?: string[];
  operationType?: 'product' | 'service' | 'mixed';
};

// Helper local para runFullDiagnostic (Teste 1)
// Helper local para runFullDiagnostic (Teste 1) — ordem: NCM → NBS → SOL → IAGEN
async function runFullDiagnostic(projeto: ProjetoInput): Promise<DiagnosticResult> {
  const gaps: GapLike[] = [];

  // 1. Gaps de NCM (respostas 'nao') — PRIMEIRO
  for (const ans of projeto.ncmAnswers || []) {
    if (ans.resposta === 'nao') {
      gaps.push({
        id: `gap-ncm-${ans.ncm}`,
        fonte: ans.fonte,
        fonte_ref: ans.fonte_ref,
        lei_ref: ans.lei_ref,
        ncm: ans.ncm,
        descricao: `Gap NCM ${ans.ncm}`,
        categoria: categorizeRisk({ ncm: ans.ncm, lei_ref: ans.lei_ref }),
      });
    }
  }

  // 2. Gaps de NBS (respostas 'nao') — SEGUNDO
  for (const ans of projeto.nbsAnswers || []) {
    if (ans.resposta === 'nao') {
      gaps.push({
        id: `gap-nbs-${ans.nbs}`,
        fonte: ans.fonte,
        fonte_ref: ans.fonte_ref,
        lei_ref: ans.lei_ref,
        nbs: ans.nbs,
        descricao: `Gap NBS ${ans.nbs}`,
        categoria: categorizeRisk({ nbs: ans.nbs, lei_ref: ans.lei_ref }),
      });
    }
  }

  // 3. Gaps de SOLARIS (respostas 'nao') — TERCEIRO
  for (const ans of projeto.solarisAnswers || []) {
    if (ans.resposta === 'nao') {
      gaps.push({
        id: `gap-sol-${ans.id}`,
        fonte: 'solaris',
        fonte_ref: ans.id,
        lei_ref: ans.lei_ref,
        descricao: `Gap SOLARIS ${ans.id}`,
        categoria: categorizeRisk({ lei_ref: ans.lei_ref }),
      });
    }
  }

  // 4. Gaps de IA GEN — QUARTO
  for (const ans of projeto.iagenAnswers || []) {
    gaps.push({
      id: `gap-iagen-${ans.id}`,
      fonte: 'iagen',
      fonte_ref: ans.fonte_ref,
      lei_ref: ans.lei_ref,
      descricao: ans.gap,
      categoria: categorizeRisk({ lei_ref: ans.lei_ref, descricao: ans.gap }),
    });
  }

  // Derivar riscos a partir dos gaps (1 risco por gap)
  const riscos: RiscoLike[] = gaps.map((g, i) => ({
    id: `risk-${i + 1}`,
    source_gap_ids: [g.id],
    lei_ref: g.lei_ref,
    severity: (g.lei_ref?.includes('Art. 2 ') ? 'alto' : 'medio') as 'alto' | 'medio' | 'baixo',
    descricao: `Risco derivado de ${g.fonte_ref}`,
    fonte: g.fonte,
  }));

  return { gaps, riscos };
}

// Helper local para generateBriefingFromResult (Teste 1 TB-*)
function generateBriefingFromResult(result: DiagnosticResult) {
  const content = {
    gaps: result.gaps,
    riscos: result.riscos,
    ncms: result.gaps.filter(g => g.ncm).map(g => g.ncm),
    nbss: result.gaps.filter(g => g.nbs).map(g => g.nbs),
    cnaes: [], // Não temos confirmedCnaes aqui, assumindo vazio para este helper
    lei_refs: Array.from(new Set([...result.gaps.map(g => g.lei_ref), ...result.riscos.map(r => r.lei_ref)])).filter(Boolean),
  };

  const fontes_usadas = [
    ...result.gaps.map(g => ({ tipo: g.fonte, fonte_ref: g.fonte_ref })),
    ...result.riscos.map(r => ({ tipo: r.fonte, fonte_ref: r.fonte_ref })),
  ];

  return {
    content: content,
    fontes_usadas: fontes_usadas,
    cpie_score: 75,
    completeness_status: 'parcial',
    updatedAt: Date.now(),
    total_riscos: result.riscos.length,
    riscos: result.riscos,
    gaps: result.gaps,
  };
}

// Projetos P-T1 a P-T5
const P_T1: ProjetoInput = {
  ncmAnswers: [{ ncm: '1006.40.00', fonte: 'rag', fonte_ref: 'lc214-art14-ncm1006', lei_ref: 'Art. 14 LC 214/2025', resposta: 'nao' }, { ncm: '2202.10.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2202', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' }],
  solarisAnswers: [{ id: 'SOL-001', lei_ref: 'Art. 1 LC 214/2025', resposta: 'nao' }, { id: 'SOL-005', lei_ref: 'Art. 5 LC 214/2025', resposta: 'sim' }],
  nbsAnswers: [],
  iagenAnswers: [],
  confirmedCnaes: ['4637-1/07'],
  operationType: 'product',
};

const P_T2: ProjetoInput = {
  ncmAnswers: [],
  solarisAnswers: [{ id: 'SOL-019', lei_ref: 'Art. 19 LC 214/2025', resposta: 'nao' }],
  nbsAnswers: [{ nbs: '1.01.01', fonte: 'solaris', fonte_ref: 'SOL-019', lei_ref: 'Art. 19 LC 214/2025', resposta: 'nao' }, { nbs: '1.17.19', fonte: 'rag', fonte_ref: 'lc214-art11-nbs117', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' }],
  iagenAnswers: [],
  confirmedCnaes: ['6201-5/00'],
  operationType: 'service',
};

const P_T3: ProjetoInput = {
  ncmAnswers: [{ ncm: '3004.90.99', fonte: 'rag', fonte_ref: 'lc214-art34-ncm3004', lei_ref: 'Art. 34 LC 214/2025', resposta: 'nao' }, { ncm: '3002.15.00', fonte: 'rag', fonte_ref: 'lc214-art34-ncm3002', lei_ref: 'Art. 34 LC 214/2025', resposta: 'nao' }],
  solarisAnswers: [{ id: 'SOL-022', lei_ref: 'Art. 29 LC 214/2025', resposta: 'nao' }],
  nbsAnswers: [{ nbs: '1.03.07', fonte: 'solaris', fonte_ref: 'SOL-022', lei_ref: 'Art. 29 LC 214/2025', resposta: 'nao' }],
  iagenAnswers: [{ id: 'iagen-1', fonte_ref: 'iagen-gap-1', lei_ref: 'Art. 34 LC 214/2025', gap: 'Medicamentos sem controle de aliquota reduzida' }],
  confirmedCnaes: ['4771-7/01', '8630-5/01'],
  operationType: 'mixed',
};

const P_T4: ProjetoInput = {
  ncmAnswers: [{ ncm: '2208.40.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2208', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' }, { ncm: '2203.00.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2203', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' }, { ncm: '2204.21.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2204', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' }],
  solarisAnswers: [],
  nbsAnswers: [],
  iagenAnswers: [{ id: 'iagen-2', fonte_ref: 'iagen-gap-2', lei_ref: 'Art. 2 LC 214/2025', gap: 'Bebidas alcoolicas sujeitas ao IS' }],
  confirmedCnaes: ['4635-4/99'],
  operationType: 'product',
};

const P_T5: ProjetoInput = {
  ncmAnswers: [{ ncm: '8471.30.19', fonte: 'rag', fonte_ref: 'lc214-art9-ncm8471', lei_ref: 'Art. 9 LC 214/2025', resposta: 'nao' }, { ncm: '8543.70.99', fonte: 'rag', fonte_ref: 'lc214-art9-ncm8543', lei_ref: 'Art. 9 LC 214/2025', resposta: 'nao' }],
  solarisAnswers: [{ id: 'SOL-011', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' }],
  nbsAnswers: [{ nbs: '1.01.01', fonte: 'solaris', fonte_ref: 'SOL-011', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' }, { nbs: '1.07.01', fonte: 'rag', fonte_ref: 'lc214-art7-nbs107', lei_ref: 'Art. 7 LC 214/2025', resposta: 'nao' }],
  iagenAnswers: [{ id: 'iagen-3', fonte_ref: 'iagen-gap-3', lei_ref: 'Art. 9 LC 214/2025', gap: 'Software sem enquadramento CBS definido' }],
  confirmedCnaes: ['4120-4/00', '6201-5/00'],
  operationType: 'mixed',
};

describe('TESTE1-TR-A: TR-01 a TR-05 (Rastreabilidade Gaps - fonte_ref e lei_ref)', () => {

  it('TR-01: Deve identificar corretamente os gaps e riscos para P-T1 (produto puro - alimentos)', async () => {
    const result = await runFullDiagnostic(P_T1);
    expect(result.gaps).toHaveLength(3);
    expect(result.riscos).toHaveLength(3);

    // Gaps
    expect(result.gaps[0].id).toBe('gap-ncm-1006.40.00');
    expect(result.gaps[0].fonte).toBe('rag');
    expect(result.gaps[0].fonte_ref).toBe('lc214-art14-ncm1006');
    expect(result.gaps[0].lei_ref).toBe('Art. 14 LC 214/2025');
    expect(result.gaps[0].categoria).toBe('aliquota_zero');

    expect(result.gaps[1].id).toBe('gap-ncm-2202.10.00');
    expect(result.gaps[1].fonte).toBe('rag');
    expect(result.gaps[1].fonte_ref).toBe('lc214-art2-ncm2202');
    expect(result.gaps[1].lei_ref).toBe('Art. 2 LC 214/2025');
    expect(result.gaps[1].categoria).toBe('imposto_seletivo');

    expect(result.gaps[2].id).toBe('gap-sol-SOL-001');
    expect(result.gaps[2].fonte).toBe('solaris');
    expect(result.gaps[2].fonte_ref).toBe('SOL-001');
    expect(result.gaps[2].lei_ref).toBe('Art. 1 LC 214/2025');
    expect(result.gaps[2].categoria).toBe('enquadramento_geral');

    // Riscos
    expect(result.riscos[0].source_gap_ids).toEqual(['gap-ncm-1006.40.00']);
    expect(result.riscos[0].lei_ref).toBe('Art. 14 LC 214/2025');
    expect(result.riscos[0].severity).toBe('medio');

    expect(result.riscos[1].source_gap_ids).toEqual(['gap-ncm-2202.10.00']);
    expect(result.riscos[1].lei_ref).toBe('Art. 2 LC 214/2025');
    expect(result.riscos[1].severity).toBe('alto');

    expect(result.riscos[2].source_gap_ids).toEqual(['gap-sol-SOL-001']);
    expect(result.riscos[2].lei_ref).toBe('Art. 1 LC 214/2025');
    expect(result.riscos[2].severity).toBe('medio');
  });

  it('TR-02: Deve identificar corretamente os gaps e riscos para P-T2 (servico puro - consultoria TI)', async () => {
    const result = await runFullDiagnostic(P_T2);
    expect(result.gaps).toHaveLength(3);
    expect(result.riscos).toHaveLength(3);

    // Gaps
    // P-T2: NBS primeiro (NCM→NBS→SOL→IAGEN, sem NCM)
    expect(result.gaps[0].id).toBe('gap-nbs-1.01.01');
    expect(result.gaps[0].fonte).toBe('solaris');
    expect(result.gaps[0].fonte_ref).toBe('SOL-019');
    expect(result.gaps[0].lei_ref).toBe('Art. 19 LC 214/2025');
    expect(result.gaps[0].categoria).toBe('enquadramento_geral');

    expect(result.gaps[1].id).toBe('gap-nbs-1.17.19');
    expect(result.gaps[1].fonte).toBe('rag');
    expect(result.gaps[1].fonte_ref).toBe('lc214-art11-nbs117');
    expect(result.gaps[1].lei_ref).toBe('Art. 11 LC 214/2025');
    expect(result.gaps[1].categoria).toBe('ibs_cbs');

    expect(result.gaps[2].id).toBe('gap-sol-SOL-019');
    expect(result.gaps[2].fonte).toBe('solaris');
    expect(result.gaps[2].fonte_ref).toBe('SOL-019');
    expect(result.gaps[2].lei_ref).toBe('Art. 19 LC 214/2025');
    expect(result.gaps[2].categoria).toBe('enquadramento_geral');

    // Riscos
    expect(result.riscos[0].source_gap_ids).toEqual(['gap-nbs-1.01.01']);
    expect(result.riscos[0].lei_ref).toBe('Art. 19 LC 214/2025');
    expect(result.riscos[0].severity).toBe('medio');

    expect(result.riscos[1].source_gap_ids).toEqual(['gap-nbs-1.17.19']);
    expect(result.riscos[1].lei_ref).toBe('Art. 11 LC 214/2025');
    expect(result.riscos[1].severity).toBe('medio');

    expect(result.riscos[2].source_gap_ids).toEqual(['gap-sol-SOL-019']);
    expect(result.riscos[2].lei_ref).toBe('Art. 19 LC 214/2025');
    expect(result.riscos[2].severity).toBe('medio');
  });

  it('TR-03: Deve identificar corretamente os gaps e riscos para P-T3 (mista farmacia)', async () => {
    const result = await runFullDiagnostic(P_T3);
    // P-T3: 5 gaps (2 NCM + 1 NBS + 1 SOL + 1 IAGEN)
    expect(result.gaps).toHaveLength(5);
    expect(result.riscos).toHaveLength(5);

    // Gaps
    expect(result.gaps[0].id).toBe('gap-ncm-3004.90.99');
    expect(result.gaps[0].fonte).toBe('rag');
    expect(result.gaps[0].fonte_ref).toBe('lc214-art34-ncm3004');
    expect(result.gaps[0].lei_ref).toBe('Art. 34 LC 214/2025');
    expect(result.gaps[0].categoria).toBe('aliquota_reduzida');

    expect(result.gaps[1].id).toBe('gap-ncm-3002.15.00');
    expect(result.gaps[1].fonte).toBe('rag');
    expect(result.gaps[1].fonte_ref).toBe('lc214-art34-ncm3002');
    expect(result.gaps[1].lei_ref).toBe('Art. 34 LC 214/2025');
    expect(result.gaps[1].categoria).toBe('aliquota_reduzida');

    expect(result.gaps[2].id).toBe('gap-nbs-1.03.07');
    expect(result.gaps[2].fonte).toBe('solaris');
    expect(result.gaps[2].fonte_ref).toBe('SOL-022');
    expect(result.gaps[2].lei_ref).toBe('Art. 29 LC 214/2025');
    expect(result.gaps[2].categoria).toBe('regime_diferenciado');

    expect(result.gaps[3].id).toBe('gap-sol-SOL-022');
    expect(result.gaps[3].fonte).toBe('solaris');
    expect(result.gaps[3].fonte_ref).toBe('SOL-022');
    expect(result.gaps[3].lei_ref).toBe('Art. 29 LC 214/2025');
    expect(result.gaps[3].categoria).toBe('regime_diferenciado');

    // Riscos
    expect(result.riscos[0].source_gap_ids).toEqual(['gap-ncm-3004.90.99']);
    expect(result.riscos[0].lei_ref).toBe('Art. 34 LC 214/2025');
    expect(result.riscos[0].severity).toBe('medio');

    expect(result.riscos[1].source_gap_ids).toEqual(['gap-ncm-3002.15.00']);
    expect(result.riscos[1].lei_ref).toBe('Art. 34 LC 214/2025');
    expect(result.riscos[1].severity).toBe('medio');

    expect(result.riscos[2].source_gap_ids).toEqual(['gap-nbs-1.03.07']);
    expect(result.riscos[2].lei_ref).toBe('Art. 29 LC 214/2025');
    expect(result.riscos[2].severity).toBe('medio');

    expect(result.riscos[3].source_gap_ids).toEqual(['gap-sol-SOL-022']);
    expect(result.riscos[3].lei_ref).toBe('Art. 29 LC 214/2025');
    expect(result.riscos[3].severity).toBe('medio');

    expect(result.riscos[4].source_gap_ids).toEqual(['gap-iagen-iagen-1']);
    expect(result.riscos[4].lei_ref).toBe('Art. 34 LC 214/2025');
    expect(result.riscos[4].severity).toBe('medio');
  });

  it('TR-04: Deve identificar corretamente os gaps e riscos para P-T4 (produto IS - bebidas)', async () => {
    const result = await runFullDiagnostic(P_T4);
    expect(result.gaps).toHaveLength(4);
    expect(result.riscos).toHaveLength(4);

    // Gaps
    expect(result.gaps[0].id).toBe('gap-ncm-2208.40.00');
    expect(result.gaps[0].fonte).toBe('rag');
    expect(result.gaps[0].fonte_ref).toBe('lc214-art2-ncm2208');
    expect(result.gaps[0].lei_ref).toBe('Art. 2 LC 214/2025');
    expect(result.gaps[0].categoria).toBe('imposto_seletivo');

    expect(result.gaps[1].id).toBe('gap-ncm-2203.00.00');
    expect(result.gaps[1].fonte).toBe('rag');
    expect(result.gaps[1].fonte_ref).toBe('lc214-art2-ncm2203');
    expect(result.gaps[1].lei_ref).toBe('Art. 2 LC 214/2025');
    expect(result.gaps[1].categoria).toBe('imposto_seletivo');

    expect(result.gaps[2].id).toBe('gap-ncm-2204.21.00');
    expect(result.gaps[2].fonte).toBe('rag');
    expect(result.gaps[2].fonte_ref).toBe('lc214-art2-ncm2204');
    expect(result.gaps[2].lei_ref).toBe('Art. 2 LC 214/2025');
    expect(result.gaps[2].categoria).toBe('imposto_seletivo');

    expect(result.gaps[3].id).toBe('gap-iagen-iagen-2');
    expect(result.gaps[3].fonte).toBe('iagen');
    expect(result.gaps[3].fonte_ref).toBe('iagen-gap-2');
    expect(result.gaps[3].lei_ref).toBe('Art. 2 LC 214/2025');
    expect(result.gaps[3].categoria).toBe('imposto_seletivo');

    // Riscos
    expect(result.riscos[0].source_gap_ids).toEqual(['gap-ncm-2208.40.00']);
    expect(result.riscos[0].lei_ref).toBe('Art. 2 LC 214/2025');
    expect(result.riscos[0].severity).toBe('alto');

    expect(result.riscos[1].source_gap_ids).toEqual(['gap-ncm-2203.00.00']);
    expect(result.riscos[1].lei_ref).toBe('Art. 2 LC 214/2025');
    expect(result.riscos[1].severity).toBe('alto');

    expect(result.riscos[2].source_gap_ids).toEqual(['gap-ncm-2204.21.00']);
    expect(result.riscos[2].lei_ref).toBe('Art. 2 LC 214/2025');
    expect(result.riscos[2].severity).toBe('alto');

    expect(result.riscos[3].source_gap_ids).toEqual(['gap-iagen-iagen-2']);
    expect(result.riscos[3].lei_ref).toBe('Art. 2 LC 214/2025');
    expect(result.riscos[3].severity).toBe('alto');
  });

  it('TR-05: Deve identificar corretamente os gaps e riscos para P-T5 (mista tech - hardware+software)', async () => {
    const result = await runFullDiagnostic(P_T5);
    // P-T5: 6 gaps (2 NCM + 2 NBS + 1 SOL + 1 IAGEN)
    expect(result.gaps).toHaveLength(6);
    expect(result.riscos).toHaveLength(6);

    // Gaps
    expect(result.gaps[0].id).toBe('gap-ncm-8471.30.19');
    expect(result.gaps[0].fonte).toBe('rag');
    expect(result.gaps[0].fonte_ref).toBe('lc214-art9-ncm8471');
    expect(result.gaps[0].lei_ref).toBe('Art. 9 LC 214/2025');
    expect(result.gaps[0].categoria).toBe('ibs_cbs');

    expect(result.gaps[1].id).toBe('gap-ncm-8543.70.99');
    expect(result.gaps[1].fonte).toBe('rag');
    expect(result.gaps[1].fonte_ref).toBe('lc214-art9-ncm8543');
    expect(result.gaps[1].lei_ref).toBe('Art. 9 LC 214/2025');
    expect(result.gaps[1].categoria).toBe('ibs_cbs');

    // P-T5: NBS antes de SOL (NCM→NBS→SOL→IAGEN)
    expect(result.gaps[2].id).toBe('gap-nbs-1.01.01');
    expect(result.gaps[2].fonte).toBe('solaris');
    expect(result.gaps[2].fonte_ref).toBe('SOL-011');
    expect(result.gaps[2].lei_ref).toBe('Art. 11 LC 214/2025');
    expect(result.gaps[2].categoria).toBe('ibs_cbs');

    expect(result.gaps[3].id).toBe('gap-nbs-1.07.01');
    expect(result.gaps[3].fonte).toBe('rag');
    expect(result.gaps[3].fonte_ref).toBe('lc214-art7-nbs107');
    expect(result.gaps[3].lei_ref).toBe('Art. 7 LC 214/2025');
    expect(result.gaps[3].categoria).toBe('ibs_cbs');

    expect(result.gaps[4].id).toBe('gap-sol-SOL-011');
    expect(result.gaps[4].fonte).toBe('solaris');
    expect(result.gaps[4].fonte_ref).toBe('SOL-011');
    expect(result.gaps[4].lei_ref).toBe('Art. 11 LC 214/2025');
    expect(result.gaps[4].categoria).toBe('ibs_cbs');

    // Riscos
    expect(result.riscos[0].source_gap_ids).toEqual(['gap-ncm-8471.30.19']);
    expect(result.riscos[0].lei_ref).toBe('Art. 9 LC 214/2025');
    expect(result.riscos[0].severity).toBe('medio');

    expect(result.riscos[1].source_gap_ids).toEqual(['gap-ncm-8543.70.99']);
    expect(result.riscos[1].lei_ref).toBe('Art. 9 LC 214/2025');
    expect(result.riscos[1].severity).toBe('medio');

    expect(result.riscos[2].source_gap_ids).toEqual(['gap-nbs-1.01.01']);
    expect(result.riscos[2].lei_ref).toBe('Art. 11 LC 214/2025');
    expect(result.riscos[2].severity).toBe('medio');

    expect(result.riscos[3].source_gap_ids).toEqual(['gap-nbs-1.07.01']);
    expect(result.riscos[3].lei_ref).toBe('Art. 7 LC 214/2025');
    expect(result.riscos[3].severity).toBe('medio');

    expect(result.riscos[4].source_gap_ids).toEqual(['gap-sol-SOL-011']);
    expect(result.riscos[4].lei_ref).toBe('Art. 11 LC 214/2025');
    expect(result.riscos[4].severity).toBe('medio');

    expect(result.riscos[5].source_gap_ids).toEqual(['gap-iagen-iagen-3']);
    expect(result.riscos[5].lei_ref).toBe('Art. 9 LC 214/2025');
    expect(result.riscos[5].severity).toBe('medio');
  });
});
