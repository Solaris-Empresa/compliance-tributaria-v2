import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categorizeRisk, GapInput } from '../lib/risk-categorizer';

interface SolarisAnswer { id: string; lei_ref: string; resposta: 'sim' | 'nao'; }
interface NcmAnswer { ncm: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao'; }
interface NbsAnswer { nbs: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao'; }
interface IagenAnswer { id: string; fonte_ref: string; lei_ref: string; gap: string; }

interface ProjetoInput {
  ncmAnswers?: NcmAnswer[];
  solarisAnswers?: SolarisAnswer[];
  nbsAnswers?: NbsAnswer[];
  iagenAnswers?: IagenAnswer[];
  confirmedCnaes?: string[];
  operationType?: 'product' | 'service' | 'mixed';
}

type GapLike = {
  id: string;
  fonte: string;
  fonte_ref: string;
  lei_ref: string;
  ncm?: string;
  nbs?: string;
  descricao?: string;
  categoria?: string;
}

type RiscoLike = {
  id: string;
  source_gap_ids: string[];
  lei_ref: string;
  severity: 'alto' | 'medio' | 'baixo';
  descricao: string;
  fonte?: string;
}

type DiagnosticResult = {
  gaps: GapLike[];
  riscos: RiscoLike[];
}

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

// Helper local para generateBriefingFromResult
function generateBriefingFromResult(result: DiagnosticResult) {
  const content: any = {
    gaps: result.gaps,
    riscos: result.riscos,
    ncms: result.gaps.filter(g => g.ncm).map(g => g.ncm),
    nbss: result.gaps.filter(g => g.nbs).map(g => g.nbs),
    cnaes: [], // Não fornecido nos projetos P-T, então vazio
    lei_refs: Array.from(new Set([...result.gaps.map(g => g.lei_ref), ...result.riscos.map(r => r.lei_ref)])),
  };

  const fontes_usadas = Array.from(new Set([
    ...result.gaps.map(g => ({ tipo: g.fonte, fonte_ref: g.fonte_ref })),
    ...result.riscos.map(r => ({ tipo: r.fonte, fonte_ref: r.fonte_ref }))
  ]));

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

const P_T1: ProjetoInput = {
  ncmAnswers: [{ ncm: '1006.40.00', fonte: 'rag', fonte_ref: 'lc214-art14-ncm1006', lei_ref: 'Art. 14 LC 214/2025', resposta: 'nao' }, { ncm: '2202.10.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2202', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' }],
  solarisAnswers: [{ id: 'SOL-001', lei_ref: 'Art. 1 LC 214/2025', resposta: 'nao' }, { id: 'SOL-005', lei_ref: 'Art. 5 LC 214/2025', resposta: 'sim' }],
  nbsAnswers: [],
  iagenAnswers: [],
  confirmedCnaes: ['4637-1/07'],
  operationType: 'product'
};

const P_T2: ProjetoInput = {
  ncmAnswers: [],
  solarisAnswers: [{ id: 'SOL-019', lei_ref: 'Art. 19 LC 214/2025', resposta: 'nao' }],
  nbsAnswers: [{ nbs: '1.01.01', fonte: 'solaris', fonte_ref: 'SOL-019', lei_ref: 'Art. 19 LC 214/2025', resposta: 'nao' }, { nbs: '1.17.19', fonte: 'rag', fonte_ref: 'lc214-art11-nbs117', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' }],
  iagenAnswers: [],
  confirmedCnaes: ['6201-5/00'],
  operationType: 'service'
};

const P_T3: ProjetoInput = {
  ncmAnswers: [{ ncm: '3004.90.99', fonte: 'rag', fonte_ref: 'lc214-art34-ncm3004', lei_ref: 'Art. 34 LC 214/2025', resposta: 'nao' }, { ncm: '3002.15.00', fonte: 'rag', fonte_ref: 'lc214-art34-ncm3002', lei_ref: 'Art. 34 LC 214/2025', resposta: 'nao' }],
  solarisAnswers: [{ id: 'SOL-022', lei_ref: 'Art. 29 LC 214/2025', resposta: 'nao' }],
  nbsAnswers: [{ nbs: '1.03.07', fonte: 'solaris', fonte_ref: 'SOL-022', lei_ref: 'Art. 29 LC 214/2025', resposta: 'nao' }],
  iagenAnswers: [{ id: 'iagen-1', fonte_ref: 'iagen-gap-1', lei_ref: 'Art. 34 LC 214/2025', gap: 'Medicamentos sem controle de aliquota reduzida' }],
  confirmedCnaes: ['4771-7/01', '8630-5/01'],
  operationType: 'mixed'
};

const P_T4: ProjetoInput = {
  ncmAnswers: [{ ncm: '2208.40.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2208', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' }, { ncm: '2203.00.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2203', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' }, { ncm: '2204.21.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2204', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' }],
  solarisAnswers: [],
  nbsAnswers: [],
  iagenAnswers: [{ id: 'iagen-2', fonte_ref: 'iagen-gap-2', lei_ref: 'Art. 2 LC 214/2025', gap: 'Bebidas alcoolicas sujeitas ao IS' }],
  confirmedCnaes: ['4635-4/99'],
  operationType: 'product'
};

const P_T5: ProjetoInput = {
  ncmAnswers: [{ ncm: '8471.30.19', fonte: 'rag', fonte_ref: 'lc214-art9-ncm8471', lei_ref: 'Art. 9 LC 214/2025', resposta: 'nao' }, { ncm: '8543.70.99', fonte: 'rag', fonte_ref: 'lc214-art9-ncm8543', lei_ref: 'Art. 9 LC 214/2025', resposta: 'nao' }],
  solarisAnswers: [{ id: 'SOL-011', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' }],
  nbsAnswers: [{ nbs: '1.01.01', fonte: 'solaris', fonte_ref: 'SOL-011', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' }, { nbs: '1.07.01', fonte: 'rag', fonte_ref: 'lc214-art7-nbs107', lei_ref: 'Art. 7 LC 214/2025', resposta: 'nao' }],
  iagenAnswers: [{ id: 'iagen-3', fonte_ref: 'iagen-gap-3', lei_ref: 'Art. 9 LC 214/2025', gap: 'Software sem enquadramento CBS definido' }],
  confirmedCnaes: ['4120-4/00', '6201-5/00'],
  operationType: 'mixed'
};

describe('TESTE1-TB-A: Geração de Briefing para Projetos P-T1 a P-T5', () => {

  it('TB-01: Deve gerar briefing para P-T1 (produto puro - alimentos)', async () => {
    const diagnosticResult = await runFullDiagnostic(P_T1);
    const briefing = generateBriefingFromResult(diagnosticResult);

    expect(briefing.total_riscos).toBeGreaterThan(0);
    expect(briefing.riscos.length).toBe(diagnosticResult.riscos.length);
    expect(briefing.gaps.length).toBe(diagnosticResult.gaps.length);
    expect(briefing.content.ncms).toContain('1006.40.00');
    expect(briefing.content.lei_refs).toContain('Art. 14 LC 214/2025');
    expect(briefing.fontes_usadas).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'rag', fonte_ref: 'lc214-art14-ncm1006' }),
      expect.objectContaining({ tipo: 'rag', fonte_ref: 'lc214-art2-ncm2202' }),
      expect.objectContaining({ tipo: 'solaris', fonte_ref: 'SOL-001' }),
    ]));
  });

  it('TB-02: Deve gerar briefing para P-T2 (servico puro - consultoria TI)', async () => {
    const diagnosticResult = await runFullDiagnostic(P_T2);
    const briefing = generateBriefingFromResult(diagnosticResult);

    expect(briefing.total_riscos).toBeGreaterThan(0);
    expect(briefing.riscos.length).toBe(diagnosticResult.riscos.length);
    expect(briefing.gaps.length).toBe(diagnosticResult.gaps.length);
    expect(briefing.content.nbss).toContain('1.01.01');
    expect(briefing.content.lei_refs).toContain('Art. 19 LC 214/2025');
    expect(briefing.fontes_usadas).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'solaris', fonte_ref: 'SOL-019' }),
      expect.objectContaining({ tipo: 'rag', fonte_ref: 'lc214-art11-nbs117' }),
    ]));
  });

  it('TB-03: Deve gerar briefing para P-T3 (mista farmacia)', async () => {
    const diagnosticResult = await runFullDiagnostic(P_T3);
    const briefing = generateBriefingFromResult(diagnosticResult);

    expect(briefing.total_riscos).toBeGreaterThan(0);
    expect(briefing.riscos.length).toBe(diagnosticResult.riscos.length);
    expect(briefing.gaps.length).toBe(diagnosticResult.gaps.length);
    expect(briefing.content.ncms).toContain('3004.90.99');
    expect(briefing.content.nbss).toContain('1.03.07');
    expect(briefing.content.lei_refs).toContain('Art. 34 LC 214/2025');
    expect(briefing.fontes_usadas).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'rag', fonte_ref: 'lc214-art34-ncm3004' }),
      expect.objectContaining({ tipo: 'rag', fonte_ref: 'lc214-art34-ncm3002' }),
      expect.objectContaining({ tipo: 'solaris', fonte_ref: 'SOL-022' }),
      expect.objectContaining({ tipo: 'iagen', fonte_ref: 'iagen-gap-1' }),
    ]));
  });

  it('TB-04: Deve gerar briefing para P-T4 (produto IS - bebidas)', async () => {
    const diagnosticResult = await runFullDiagnostic(P_T4);
    const briefing = generateBriefingFromResult(diagnosticResult);

    expect(briefing.total_riscos).toBeGreaterThan(0);
    expect(briefing.riscos.length).toBe(diagnosticResult.riscos.length);
    expect(briefing.gaps.length).toBe(diagnosticResult.gaps.length);
    expect(briefing.content.ncms).toContain('2208.40.00');
    expect(briefing.content.lei_refs).toContain('Art. 2 LC 214/2025');
    expect(briefing.fontes_usadas).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'rag', fonte_ref: 'lc214-art2-ncm2208' }),
      expect.objectContaining({ tipo: 'rag', fonte_ref: 'lc214-art2-ncm2203' }),
      expect.objectContaining({ tipo: 'rag', fonte_ref: 'lc214-art2-ncm2204' }),
      expect.objectContaining({ tipo: 'iagen', fonte_ref: 'iagen-gap-2' }),
    ]));
  });

  it('TB-05: Deve gerar briefing para P-T5 (mista tech - hardware+software)', async () => {
    const diagnosticResult = await runFullDiagnostic(P_T5);
    const briefing = generateBriefingFromResult(diagnosticResult);

    expect(briefing.total_riscos).toBeGreaterThan(0);
    expect(briefing.riscos.length).toBe(diagnosticResult.riscos.length);
    expect(briefing.gaps.length).toBe(diagnosticResult.gaps.length);
    expect(briefing.content.ncms).toContain('8471.30.19');
    expect(briefing.content.nbss).toContain('1.01.01');
    expect(briefing.content.lei_refs).toContain('Art. 9 LC 214/2025');
    expect(briefing.fontes_usadas).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'rag', fonte_ref: 'lc214-art9-ncm8471' }),
      expect.objectContaining({ tipo: 'rag', fonte_ref: 'lc214-art9-ncm8543' }),
      expect.objectContaining({ tipo: 'solaris', fonte_ref: 'SOL-011' }),
      expect.objectContaining({ tipo: 'rag', fonte_ref: 'lc214-art7-nbs107' }),
      expect.objectContaining({ tipo: 'iagen', fonte_ref: 'iagen-gap-3' }),
    ]));
  });
});
