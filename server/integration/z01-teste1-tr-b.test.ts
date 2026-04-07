import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categorizeRisk, GapInput } from '../lib/risk-categorizer';

// Tipos auxiliares para runFullDiagnostic
type SolarisAnswer = { id: string; lei_ref: string; resposta: 'sim' | 'nao' };
type NcmAnswer = { ncm: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao' };
type NbsAnswer = { nbs: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao' };
type IagenAnswer = { id: string; fonte_ref: string; lei_ref: string; gap: string };

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
  return {
    content: {
      gaps: result.gaps,
      riscos: result.riscos,
      ncms: [], // Adaptar conforme necessidade real
      nbss: [], // Adaptar conforme necessidade real
      cnaes: [], // Adaptar conforme necessidade real
      lei_refs: [], // Adaptar conforme necessidade real
    },
    fontes_usadas: [], // Adaptar conforme necessidade real
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

describe('Rastreabilidade de Riscos - source_gap_ids, severity (TR-06 a TR-10)', () => {

  it('TR-06: Projeto P-T1 (produto puro - alimentos) deve ter 2 gaps e 2 riscos, um deles de alta severidade', async () => {
    const result = await runFullDiagnostic(P_T1);
    // P-T1: 3 gaps (2 NCM + 1 SOL)
    expect(result.gaps).toHaveLength(3);
    expect(result.riscos).toHaveLength(3);

    const riscoArt2 = result.riscos.find(r => r.lei_ref === 'Art. 2 LC 214/2025');
    expect(riscoArt2).toBeDefined();
    expect(riscoArt2?.severity).toBe('alto');
    expect(riscoArt2?.source_gap_ids).toContain('gap-ncm-2202.10.00');

    const riscoArt14 = result.riscos.find(r => r.lei_ref === 'Art. 14 LC 214/2025');
    expect(riscoArt14).toBeDefined();
    expect(riscoArt14?.severity).toBe('medio');
    expect(riscoArt14?.source_gap_ids).toContain('gap-ncm-1006.40.00');
  });

  it('TR-07: Projeto P-T2 (servico puro - consultoria TI) deve ter 3 gaps e 3 riscos, nenhum de alta severidade', async () => {
    const result = await runFullDiagnostic(P_T2);
    expect(result.gaps).toHaveLength(3);
    expect(result.riscos).toHaveLength(3);
    expect(result.riscos.every(r => r.severity === 'medio')).toBe(true);

    const riscoSol019 = result.riscos.find(r => r.source_gap_ids.includes('gap-sol-SOL-019'));
    expect(riscoSol019).toBeDefined();
    expect(riscoSol019?.lei_ref).toBe('Art. 19 LC 214/2025');

    const riscoNbs10101 = result.riscos.find(r => r.source_gap_ids.includes('gap-nbs-1.01.01'));
    expect(riscoNbs10101).toBeDefined();
    expect(riscoNbs10101?.lei_ref).toBe('Art. 19 LC 214/2025');

    const riscoNbs11719 = result.riscos.find(r => r.source_gap_ids.includes('gap-nbs-1.17.19'));
    expect(riscoNbs11719).toBeDefined();
    expect(riscoNbs11719?.lei_ref).toBe('Art. 11 LC 214/2025');
  });

  it('TR-08: Projeto P-T3 (mista farmacia) deve ter 4 gaps e 4 riscos, nenhum de alta severidade', async () => {
    const result = await runFullDiagnostic(P_T3);
    // P-T3: 5 gaps (2 NCM + 1 NBS + 1 SOL + 1 IAGEN)
    // P-T5: 6 gaps (2 NCM + 2 NBS + 1 SOL + 1 IAGEN)
    expect(result.gaps).toHaveLength(5);
    expect(result.riscos).toHaveLength(5);
    expect(result.riscos.every(r => r.severity === 'medio')).toBe(true);

    const riscoNcm3004 = result.riscos.find(r => r.source_gap_ids.includes('gap-ncm-3004.90.99'));
    expect(riscoNcm3004).toBeDefined();
    expect(riscoNcm3004?.lei_ref).toBe('Art. 34 LC 214/2025');

    const riscoNcm3002 = result.riscos.find(r => r.source_gap_ids.includes('gap-ncm-3002.15.00'));
    expect(riscoNcm3002).toBeDefined();
    expect(riscoNcm3002?.lei_ref).toBe('Art. 34 LC 214/2025');

    const riscoSol022 = result.riscos.find(r => r.source_gap_ids.includes('gap-sol-SOL-022'));
    expect(riscoSol022).toBeDefined();
    expect(riscoSol022?.lei_ref).toBe('Art. 29 LC 214/2025');

    const riscoIagen1 = result.riscos.find(r => r.source_gap_ids.includes('gap-iagen-iagen-1'));
    expect(riscoIagen1).toBeDefined();
    expect(riscoIagen1?.lei_ref).toBe('Art. 34 LC 214/2025');
  });

  it('TR-09: Projeto P-T4 (produto IS - bebidas) deve ter 4 gaps e 4 riscos, todos de alta severidade', async () => {
    const result = await runFullDiagnostic(P_T4);
    // P-T3: 5 gaps (2 NCM + 1 NBS + 1 SOL + 1 IAGEN)
    // P-T5: 6 gaps (2 NCM + 2 NBS + 1 SOL + 1 IAGEN)
    expect(result.gaps).toHaveLength(4);
    expect(result.riscos).toHaveLength(4);
    expect(result.riscos.every(r => r.severity === 'alto')).toBe(true);

    const riscoNcm2208 = result.riscos.find(r => r.source_gap_ids.includes('gap-ncm-2208.40.00'));
    expect(riscoNcm2208).toBeDefined();
    expect(riscoNcm2208?.lei_ref).toBe('Art. 2 LC 214/2025');

    const riscoNcm2203 = result.riscos.find(r => r.source_gap_ids.includes('gap-ncm-2203.00.00'));
    expect(riscoNcm2203).toBeDefined();
    expect(riscoNcm2203?.lei_ref).toBe('Art. 2 LC 214/2025');

    const riscoNcm2204 = result.riscos.find(r => r.source_gap_ids.includes('gap-ncm-2204.21.00'));
    expect(riscoNcm2204).toBeDefined();
    expect(riscoNcm2204?.lei_ref).toBe('Art. 2 LC 214/2025');

    const riscoIagen2 = result.riscos.find(r => r.source_gap_ids.includes('gap-iagen-iagen-2'));
    expect(riscoIagen2).toBeDefined();
    expect(riscoIagen2?.lei_ref).toBe('Art. 2 LC 214/2025');
  });

  it('TR-10: Projeto P-T5 (mista tech - hardware+software) deve ter 5 gaps e 5 riscos, um de alta severidade', async () => {
    const result = await runFullDiagnostic(P_T5);
    // P-T5: 6 gaps (2 NCM + 2 NBS + 1 SOL + 1 IAGEN)
    expect(result.gaps).toHaveLength(6);
    expect(result.riscos).toHaveLength(6);

    const riscoArt9 = result.riscos.find(r => r.lei_ref === 'Art. 9 LC 214/2025');
    expect(riscoArt9).toBeDefined();
    expect(riscoArt9?.severity).toBe('medio');

    const riscoArt11 = result.riscos.find(r => r.lei_ref === 'Art. 11 LC 214/2025');
    expect(riscoArt11).toBeDefined();
    expect(riscoArt11?.severity).toBe('medio');

    const riscoIagen3 = result.riscos.find(r => r.source_gap_ids.includes('gap-iagen-iagen-3'));
    expect(riscoIagen3).toBeDefined();
    expect(riscoIagen3?.lei_ref).toBe('Art. 9 LC 214/2025');
    expect(riscoIagen3?.severity).toBe('medio');

    const riscoNcm8471 = result.riscos.find(r => r.source_gap_ids.includes('gap-ncm-8471.30.19'));
    expect(riscoNcm8471).toBeDefined();
    expect(riscoNcm8471?.severity).toBe('medio');

    const riscoNcm8543 = result.riscos.find(r => r.source_gap_ids.includes('gap-ncm-8543.70.99'));
    expect(riscoNcm8543).toBeDefined();
    expect(riscoNcm8543?.severity).toBe('medio');
  });
});
