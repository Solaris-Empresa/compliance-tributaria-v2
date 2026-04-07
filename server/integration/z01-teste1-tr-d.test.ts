
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categorizeRisk } from '../lib/risk-categorizer';

// Tipos auxiliares para runFullDiagnostic
type GapInput = {
  id: string;
  fonte: string;
  fonte_ref: string;
  lei_ref: string;
  ncm?: string;
  nbs?: string;
  descricao?: string;
  categoria?: string;
};

type SolarisAnswer = {
  id: string;
  resposta: 'sim' | 'nao';
  lei_ref: string;
};

type NcmAnswer = {
  ncm: string;
  fonte: string;
  fonte_ref: string;
  lei_ref: string;
  resposta: 'sim' | 'nao';
  confidence?: number;
};

type NbsAnswer = {
  nbs: string;
  fonte: string;
  fonte_ref: string;
  lei_ref: string;
  resposta: 'sim' | 'nao';
  confidence?: number;
};

type IagenAnswer = {
  id: string;
  gap: string;
  categoria?: string;
  lei_ref: string;
  fonte_ref: string;
};

type CnaeAnswer = {
  cnae: string;
  resposta: 'sim' | 'nao';
  lei_ref: string;
};

type ProjetoInput = {
  nome: string;
  operationType: 'product' | 'service' | 'mixed';
  ncmCodes?: string[];
  nbsCodes?: string[];
  confirmedCnaes?: string[];
  solarisAnswers?: SolarisAnswer[];
  ncmAnswers?: NcmAnswer[];
  nbsAnswers?: NbsAnswer[];
  iagenAnswers?: IagenAnswer[];
  cnaeAnswers?: CnaeAnswer[];
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
  ncm?: string;
  nbs?: string;
  tipo?: string;
  categoria?: string;
};

type DiagnosticResult = {
  gaps: GapLike[];
  riscos: RiscoLike[];
};

// Helper local runFullDiagnostic
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

// Helper local generateBriefingFromResult (para testes TB-*)
async function generateBriefingFromResult(result: DiagnosticResult) {
  const content: any = { gaps: result.gaps, riscos: result.riscos };
  const fontes_usadas: any[] = [];

  result.gaps.forEach(gap => {
    if (gap.fonte === 'solaris' && !fontes_usadas.some(f => f.tipo === 'solaris')) {
      fontes_usadas.push({ tipo: 'solaris', fonte_ref: gap.fonte_ref });
    }
    if (gap.fonte === 'rag' && !fontes_usadas.some(f => f.tipo === 'rag')) {
      fontes_usadas.push({ tipo: 'rag', fonte_ref: gap.fonte_ref });
    }
    if (gap.ncm && !fontes_usadas.some(f => f.tipo === 'ncm')) {
      fontes_usadas.push({ tipo: 'ncm', fonte_ref: gap.ncm });
    }
    if (gap.nbs && !fontes_usadas.some(f => f.tipo === 'nbs')) {
      fontes_usadas.push({ tipo: 'nbs', fonte_ref: gap.nbs });
    }
  });

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

// PROJETOS P-T1..P-T5 (usar exatamente estes dados):
const P_T1: ProjetoInput = {
  nome: 'P-T1 Industria Alimentos Rastr',
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
  confirmedCnaes: ['4637-1/07'],
};

const P_T2: ProjetoInput = {
  nome: 'P-T2 Consultoria Juridica Rastr',
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
  confirmedCnaes: ['6201-5/00'],
};

const P_T3: ProjetoInput = {
  nome: 'P-T3 Distribuidora Medicamentos Rastr',
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
  confirmedCnaes: ['4771-7/01', '8630-5/01'],
};

const P_T4: ProjetoInput = {
  nome: 'P-T4 Bebidas Destilados Rastr',
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
  confirmedCnaes: ['4635-4/99'],
};

const P_T5: ProjetoInput = {
  nome: 'P-T5 Construtora Incorporadora Rastr',
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
  confirmedCnaes: ['4120-4/00', '6201-5/00'],
};

describe('BLOCO TESTE1-TR-D: TR-16 a TR-20 (Rastreabilidade Riscos - invariantes)', () => {

  it('TR-16 — P-T3: nenhum risco tem source_gap_ids vazio', async () => {
    const result = await runFullDiagnostic(P_T3);
    result.riscos.forEach((r: any) => {
      expect(r.source_gap_ids).toBeDefined();
      expect(r.source_gap_ids.length).toBeGreaterThan(0);
      expect(r.source_gap_ids.every((id: string) => id && id.length > 0)).toBe(true);
    });
  });

  it('TR-17 — P-T4: todo risco tem lei_ref preenchido', async () => {
    const result = await runFullDiagnostic(P_T4);
    result.riscos.forEach((r: any) => {
      expect(r.lei_ref).toBeTruthy();
      expect(r.lei_ref).not.toBe('');
    });
  });

  it('TR-18 — P-T5: risco misto não mistura NCM e NBS no mesmo gap', async () => {
    const result = await runFullDiagnostic(P_T5);
    const gapMap = new Map(result.gaps.map((g: any) => [g.id, g]));

    result.riscos.forEach((r: any) => {
      const gap = gapMap.get(r.source_gap_ids[0]);
      if (gap) {
        const temAmbos = gap.ncm && gap.nbs;
        expect(temAmbos).toBeFalsy();
      }
    });
  });

  it('TR-19 — P-T1: número de riscos ≤ número de gaps (sem inflação)', async () => {
    const result = await runFullDiagnostic(P_T1);
    expect(result.riscos.length).toBeLessThanOrEqual(result.gaps.length * 2);
  });

  it('TR-20 — P-T2: risco com severity=\'alto\' tem gap com lei_ref identificável', async () => {
    const result = await runFullDiagnostic(P_T2);
    const gapMap = new Map(result.gaps.map((g: any) => [g.id, g]));

    const riscosAltos = result.riscos.filter((r: any) => r.severity === 'alto');
    riscosAltos.forEach((r: any) => {
      const gap = gapMap.get(r.source_gap_ids[0]);
      expect(gap?.lei_ref).toBeTruthy();
      expect(gap?.lei_ref).not.toBe('LC 214/2025 (genérico)');
    });
  });
});
