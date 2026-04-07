import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categorizeRisk } from '../lib/risk-categorizer';

// Tipos auxiliares para runFullDiagnostic
type GapInput = {
  id?: string;
  fonte?: string;
  fonte_ref?: string;
  lei_ref?: string;
  ncm?: string;
  nbs?: string;
  descricao?: string;
  categoria?: string;
  gap?: string;
};

type NcmAnswer = { ncm: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao'; };
type SolarisAnswer = { id: string; lei_ref: string; resposta: 'sim' | 'nao'; };
type NbsAnswer = { nbs: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao'; };
type IagenAnswer = { id: string; fonte_ref: string; lei_ref: string; gap: string; };

type ProjetoInput = {
  nome: string;
  operationType: 'product' | 'service' | 'mixed';
  ncmAnswers?: NcmAnswer[];
  solarisAnswers?: SolarisAnswer[];
  nbsAnswers?: NbsAnswer[];
  iagenAnswers?: IagenAnswer[];
  confirmedCnaes?: string[];
};

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
  const fontesUsadasSet = new Set<string>();
  const fontes_usadas: { tipo: string; fonte_ref: string }[] = [];

  result.gaps.forEach(gap => {
    const key = `${gap.fonte}-${gap.fonte_ref}`;
    if (!fontesUsadasSet.has(key)) {
      fontes_usadas.push({ tipo: gap.fonte, fonte_ref: gap.fonte_ref });
      fontesUsadasSet.add(key);
    }
  });

  result.riscos.forEach(risco => {
    if (risco.fonte && risco.fonte_ref) {
      const key = `${risco.fonte}-${risco.fonte_ref}`;
      if (!fontesUsadasSet.has(key)) {
        fontes_usadas.push({ tipo: risco.fonte, fonte_ref: risco.fonte_ref });
        fontesUsadasSet.add(key);
      }
    }
  });

  const ncms = result.gaps.filter(g => g.ncm).map(g => g.ncm);
  const nbss = result.gaps.filter(g => g.nbs).map(g => g.nbs);
  const lei_refs = Array.from(new Set(result.gaps.map(g => g.lei_ref).concat(result.riscos.map(r => r.lei_ref))));

  return {
    content: {
      gaps: result.gaps,
      riscos: result.riscos,
      ncms: ncms,
      nbss: nbss,
      cnaes: [], // Não temos cnaes nos gaps/riscos diretamente
      lei_refs: lei_refs,
    },
    fontes_usadas: fontes_usadas,
    cpie_score: 75,
    completeness_status: 'parcial',
    updatedAt: Date.now(),
    total_riscos: result.riscos.length,
    riscos: result.riscos,
    gaps: result.gaps,
  };
}

// PROJETOS P-T1..P-T5 (usar exatamente estes dados):
const P_T1: ProjetoInput = {
  nome: 'P-T1 (produto puro - alimentos)',
  operationType: 'product',
  ncmAnswers: [
    { ncm: '1006.40.00', fonte: 'rag', fonte_ref: 'lc214-art14-ncm1006', lei_ref: 'Art. 14 LC 214/2025', resposta: 'nao' },
    { ncm: '2202.10.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2202', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' }
  ],
  solarisAnswers: [
    { id: 'SOL-001', lei_ref: 'Art. 1 LC 214/2025', resposta: 'nao' },
    { id: 'SOL-005', lei_ref: 'Art. 5 LC 214/2025', resposta: 'sim' }
  ],
  nbsAnswers: [],
  iagenAnswers: [],
  confirmedCnaes: ['4637-1/07']
};

const P_T2: ProjetoInput = {
  nome: 'P-T2 (servico puro - consultoria TI)',
  operationType: 'service',
  ncmAnswers: [],
  solarisAnswers: [
    { id: 'SOL-019', lei_ref: 'Art. 19 LC 214/2025', resposta: 'nao' }
  ],
  nbsAnswers: [
    { nbs: '1.01.01', fonte: 'solaris', fonte_ref: 'SOL-019', lei_ref: 'Art. 19 LC 214/2025', resposta: 'nao' },
    { nbs: '1.17.19', fonte: 'rag', fonte_ref: 'lc214-art11-nbs117', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' }
  ],
  iagenAnswers: [],
  confirmedCnaes: ['6201-5/00']
};

const P_T3: ProjetoInput = {
  nome: 'P-T3 (mista farmacia)',
  operationType: 'mixed',
  ncmAnswers: [
    { ncm: '3004.90.99', fonte: 'rag', fonte_ref: 'lc214-art34-ncm3004', lei_ref: 'Art. 34 LC 214/2025', resposta: 'nao' },
    { ncm: '3002.15.00', fonte: 'rag', fonte_ref: 'lc214-art34-ncm3002', lei_ref: 'Art. 34 LC 214/2025', resposta: 'nao' }
  ],
  solarisAnswers: [
    { id: 'SOL-022', lei_ref: 'Art. 29 LC 214/2025', resposta: 'nao' }
  ],
  nbsAnswers: [
    { nbs: '1.03.07', fonte: 'solaris', fonte_ref: 'SOL-022', lei_ref: 'Art. 29 LC 214/2025', resposta: 'nao' }
  ],
  iagenAnswers: [
    { id: 'iagen-1', fonte_ref: 'iagen-gap-1', lei_ref: 'Art. 34 LC 214/2025', gap: 'Medicamentos sem controle de aliquota reduzida' }
  ],
  confirmedCnaes: ['4771-7/01', '8630-5/01']
};

const P_T4: ProjetoInput = {
  nome: 'P-T4 (produto IS - bebidas)',
  operationType: 'product',
  ncmAnswers: [
    { ncm: '2208.40.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2208', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' },
    { ncm: '2203.00.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2203', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' },
    { ncm: '2204.21.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2204', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' }
  ],
  solarisAnswers: [],
  nbsAnswers: [],
  iagenAnswers: [
    { id: 'iagen-2', fonte_ref: 'iagen-gap-2', lei_ref: 'Art. 2 LC 214/2025', gap: 'Bebidas alcoolicas sujeitas ao IS' }
  ],
  confirmedCnaes: ['4635-4/99']
};

const P_T5: ProjetoInput = {
  nome: 'P-T5 (mista tech - hardware+software)',
  operationType: 'mixed',
  ncmAnswers: [
    { ncm: '8471.30.19', fonte: 'rag', fonte_ref: 'lc214-art9-ncm8471', lei_ref: 'Art. 9 LC 214/2025', resposta: 'nao' },
    { ncm: '8543.70.99', fonte: 'rag', fonte_ref: 'lc214-art9-ncm8543', lei_ref: 'Art. 9 LC 214/2025', resposta: 'nao' }
  ],
  solarisAnswers: [
    { id: 'SOL-011', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' }
  ],
  nbsAnswers: [
    { nbs: '1.01.01', fonte: 'solaris', fonte_ref: 'SOL-011', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' },
    { nbs: '1.07.01', fonte: 'rag', fonte_ref: 'lc214-art7-nbs107', lei_ref: 'Art. 7 LC 214/2025', resposta: 'nao' }
  ],
  iagenAnswers: [
    { id: 'iagen-3', fonte_ref: 'iagen-gap-3', lei_ref: 'Art. 9 LC 214/2025', gap: 'Software sem enquadramento CBS definido' }
  ],
  confirmedCnaes: ['4120-4/00', '6201-5/00']
};

describe('TESTE1-TB-B: Geração de Briefing com fontes_usadas', () => {
  it('TB-06: Deve gerar briefing para P-T1 com fontes_usadas de SOLARIS e RAG', async () => {
    const diagnosticResult = await runFullDiagnostic(P_T1);
    const briefing = generateBriefingFromResult(diagnosticResult);

    expect(briefing.fontes_usadas).toEqual(expect.arrayContaining([
      { tipo: 'solaris', fonte_ref: 'SOL-001' },
      { tipo: 'rag', fonte_ref: 'lc214-art14-ncm1006' },
      { tipo: 'rag', fonte_ref: 'lc214-art2-ncm2202' },
    ]));
    expect(briefing.fontes_usadas.length).toBeGreaterThanOrEqual(3);
    expect(briefing.total_riscos).toBe(3);
  });

  it('TB-07: Deve gerar briefing para P-T2 com fontes_usadas de SOLARIS e RAG', async () => {
    const diagnosticResult = await runFullDiagnostic(P_T2);
    const briefing = generateBriefingFromResult(diagnosticResult);

    expect(briefing.fontes_usadas).toEqual(expect.arrayContaining([
      { tipo: 'solaris', fonte_ref: 'SOL-019' },
      { tipo: 'rag', fonte_ref: 'lc214-art11-nbs117' },
    ]));
    expect(briefing.fontes_usadas.length).toBeGreaterThanOrEqual(2);
    expect(briefing.total_riscos).toBe(3);
  });

  it('TB-08: Deve gerar briefing para P-T3 com fontes_usadas de SOLARIS, RAG e IAGEN', async () => {
    const diagnosticResult = await runFullDiagnostic(P_T3);
    const briefing = generateBriefingFromResult(diagnosticResult);

    expect(briefing.fontes_usadas).toEqual(expect.arrayContaining([
      { tipo: 'solaris', fonte_ref: 'SOL-022' },
      { tipo: 'rag', fonte_ref: 'lc214-art34-ncm3004' },
      { tipo: 'rag', fonte_ref: 'lc214-art34-ncm3002' },
      { tipo: 'iagen', fonte_ref: 'iagen-gap-1' },
    ]));
    expect(briefing.fontes_usadas.length).toBeGreaterThanOrEqual(4);
    expect(briefing.total_riscos).toBe(5); // P-T3: 5 gaps (2 NCM + 1 NBS + 1 SOL + 1 IAGEN)
  });

  it('TB-09: Deve gerar briefing para P-T4 com fontes_usadas de RAG e IAGEN', async () => {
    const diagnosticResult = await runFullDiagnostic(P_T4);
    const briefing = generateBriefingFromResult(diagnosticResult);

    expect(briefing.fontes_usadas).toEqual(expect.arrayContaining([
      { tipo: 'rag', fonte_ref: 'lc214-art2-ncm2208' },
      { tipo: 'rag', fonte_ref: 'lc214-art2-ncm2203' },
      { tipo: 'rag', fonte_ref: 'lc214-art2-ncm2204' },
      { tipo: 'iagen', fonte_ref: 'iagen-gap-2' },
    ]));
    expect(briefing.fontes_usadas.length).toBeGreaterThanOrEqual(4);
    expect(briefing.total_riscos).toBe(4);
  });

  it('TB-10: Deve gerar briefing para P-T5 com fontes_usadas de SOLARIS, RAG e IAGEN', async () => {
    const diagnosticResult = await runFullDiagnostic(P_T5);
    const briefing = generateBriefingFromResult(diagnosticResult);

    expect(briefing.fontes_usadas).toEqual(expect.arrayContaining([
      { tipo: 'solaris', fonte_ref: 'SOL-011' },
      { tipo: 'rag', fonte_ref: 'lc214-art9-ncm8471' },
      { tipo: 'rag', fonte_ref: 'lc214-art9-ncm8543' },
      { tipo: 'rag', fonte_ref: 'lc214-art7-nbs107' },
      { tipo: 'iagen', fonte_ref: 'iagen-gap-3' },
    ]));
    expect(briefing.fontes_usadas.length).toBeGreaterThanOrEqual(5);
    expect(briefing.total_riscos).toBe(6); // P-T5: 6 gaps (2 NCM + 2 NBS + 1 SOL + 1 IAGEN)
  });
});
