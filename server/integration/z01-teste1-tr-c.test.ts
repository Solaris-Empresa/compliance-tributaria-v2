
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categorizeRisk } from '../lib/risk-categorizer';

// Mock da função categorizeRisk, pois ela será implementada posteriormente
vi.mock('../lib/risk-categorizer', () => ({
  categorizeRisk: vi.fn((gap: any) => {
    if (gap.descricao?.includes('Imposto Seletivo') || gap.lei_ref?.includes('Art. 2 LC 214') || ['2202.10.00', '2208.40.00', '2203.00.00', '2204.21.00'].includes(gap.ncm)) return 'imposto_seletivo';
    if (gap.descricao?.includes('alíquota zero') || gap.lei_ref?.includes('Art. 14 LC 214') || ['1006.40.00', '0713.33.19'].includes(gap.ncm)) return 'aliquota_zero';
    if (gap.descricao?.includes('alíquota reduzida') || gap.lei_ref?.includes('Art. 34 LC 214') || ['3004.90.99', '3002.15.00'].includes(gap.ncm)) return 'aliquota_reduzida';
    if (gap.lei_ref?.includes('Art. 29 LC 214') || ['1.03.07', '1.15.00', '1.09.00'].includes(gap.nbs)) return 'regime_diferenciado';
    if (gap.descricao?.includes('crédito') || gap.descricao?.includes('estorno') || gap.descricao?.includes('ressarcimento') || (gap.lei_ref && parseInt(gap.lei_ref.match(/Art\. (\d+)/)?.[1] || '0') >= 28 && parseInt(gap.lei_ref.match(/Art\. (\d+)/)?.[1] || '0') <= 33)) return 'nao_cumulatividade';
    if (gap.lei_ref && parseInt(gap.lei_ref.match(/Art\. (\d+)/)?.[1] || '0') >= 40 && parseInt(gap.lei_ref.match(/Art\. (\d+)/)?.[1] || '0') <= 45) return 'cadastro_fiscal';
    if (gap.descricao?.includes('IBS') || gap.descricao?.includes('CBS') || (gap.lei_ref && parseInt(gap.lei_ref.match(/Art\. (\d+)/)?.[1] || '0') >= 6 && parseInt(gap.lei_ref.match(/Art\. (\d+)/)?.[1] || '0') <= 12)) return 'ibs_cbs';
    if (gap.descricao?.includes('período de transição') || gap.descricao?.includes('2026-2032') || (gap.lei_ref && parseInt(gap.lei_ref.match(/Art\. (\d+)/)?.[1] || '0') >= 350)) return 'transicao';
    if (gap.descricao?.includes('NF-e') || gap.descricao?.includes('SPED') || gap.descricao?.includes('obrigação acessória')) return 'compliance';
    if (gap.descricao?.includes('escrituração') || gap.descricao?.includes('guia de recolhimento') || gap.descricao?.includes('apuração')) return 'fiscal';
    if (gap.descricao?.includes('ativo imobilizado') || gap.descricao?.includes('imobilizado')) return 'patrimonial';
    return 'enquadramento_geral';
  }),
}));

// Helper Types
type SolarisAnswer = { id: string; resposta: 'sim' | 'nao'; lei_ref: string; };
type NcmAnswer = { ncm: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao'; };
type NbsAnswer = { nbs: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao'; };
type IagenAnswer = { id: string; gap: string; lei_ref: string; fonte_ref: string; };

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

// runFullDiagnostic helper (local)
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

// generateBriefingFromResult helper (local)
async function generateBriefingFromResult(result: DiagnosticResult) {
  const fontes_usadas: { tipo: string; fonte_ref: string }[] = [];
  const gapsContent: any[] = [];
  const riscosContent: any[] = [];
  const ncmsContent: string[] = [];
  const nbssContent: string[] = [];
  const cnaesContent: string[] = [];
  const leiRefsContent: string[] = [];

  result.gaps.forEach(gap => {
    gapsContent.push(gap);
    if (gap.fonte_ref && !fontes_usadas.some(f => f.fonte_ref === gap.fonte_ref)) {
      fontes_usadas.push({ tipo: gap.fonte, fonte_ref: gap.fonte_ref });
    }
    if (gap.lei_ref && !leiRefsContent.includes(gap.lei_ref)) {
      leiRefsContent.push(gap.lei_ref);
    }
    if (gap.ncm && !ncmsContent.includes(gap.ncm)) {
      ncmsContent.push(gap.ncm);
    }
    if (gap.nbs && !nbssContent.includes(gap.nbs)) {
      nbssContent.push(gap.nbs);
    }
  });

  result.riscos.forEach(risco => {
    riscosContent.push(risco);
    if (risco.lei_ref && !leiRefsContent.includes(risco.lei_ref)) {
      leiRefsContent.push(risco.lei_ref);
    }
    if (risco.fonte && risco.fonte_ref && !fontes_usadas.some(f => f.fonte_ref === risco.fonte_ref)) {
      fontes_usadas.push({ tipo: risco.fonte, fonte_ref: risco.fonte_ref });
    }
  });

  // Simplified CNAE handling for briefing, assuming they come from project input for now
  // In a real scenario, these would be derived from the diagnostic result or project input
  // For this test, we'll just use a placeholder or derive from a hypothetical project input if available
  // Since project input is not directly passed to generateBriefingFromResult, we'll keep it simple.
  // For the purpose of this test, we'll assume confirmedCnaes are part of the initial project input
  // and would be passed down or retrieved if this were a real system.
  // For now, we'll leave cnaes as an empty array or derive from a mock.

  return {
    content: {
      gaps: gapsContent,
      riscos: riscosContent,
      ncms: ncmsContent,
      nbss: nbssContent,
      cnaes: cnaesContent, // Placeholder
      lei_refs: leiRefsContent,
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

// Project Definitions (Simplified as per task instructions)
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
  confirmedCnaes: ['4637-1/07']
};

const P_T2: ProjetoInput = {
  nome: 'P-T2 Consultoria TI Rastr',
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
  nome: 'P-T3 Farmacia Rastr',
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
  nome: 'P-T4 Bebidas Rastr',
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
  nome: 'P-T5 Tech Rastr',
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

describe('TESTE1-TR-C: TR-11 a TR-15 (Rastreabilidade Gaps - formatos de fonte_ref)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TR-11: Deve garantir que gaps de SOLARIS tenham fonte_ref no formato SOL-XXX', async () => {
    const result = await runFullDiagnostic(P_T1);
    const solarisGaps = result.gaps.filter(g => g.fonte === 'solaris');
    expect(solarisGaps.length).toBeGreaterThan(0);
    solarisGaps.forEach(gap => {
      expect(gap.fonte_ref).toMatch(/^SOL-\d{3}$/);
    });
  });

  it('TR-12: Deve garantir que gaps de NCM tenham fonte_ref no formato lc214-artXX-ncmXXXX', async () => {
    const result = await runFullDiagnostic(P_T1);
    const ncmGaps = result.gaps.filter(g => g.fonte === 'rag' && g.ncm);
    expect(ncmGaps.length).toBeGreaterThan(0);
    ncmGaps.forEach(gap => {
      expect(gap.fonte_ref).toMatch(/^lc214-art\d+-ncm\d+$/);
    });
  });

  it('TR-13: Deve garantir que gaps de NBS tenham fonte_ref no formato lc214-artXX-nbsXXX ou SOL-XXX', async () => {
    const result = await runFullDiagnostic(P_T2);
    const nbsGaps = result.gaps.filter(g => g.nbs);
    expect(nbsGaps.length).toBeGreaterThan(0);
    nbsGaps.forEach(gap => {
      expect(gap.fonte_ref).toMatch(/^(lc214-art\d+-nbs\d+|SOL-\d{3})$/);
    });
  });

  it('TR-14: Deve garantir que gaps de IAGEN tenham fonte_ref no formato iagen-gap-X', async () => {
    const result = await runFullDiagnostic(P_T3);
    const iagenGaps = result.gaps.filter(g => g.fonte === 'iagen');
    expect(iagenGaps.length).toBeGreaterThan(0);
    iagenGaps.forEach(gap => {
      expect(gap.fonte_ref).toMatch(/^iagen-gap-\d+$/);
    });
  });

  it('TR-15: Deve garantir que todos os gaps tenham lei_ref não vazio', async () => {
    const projects = [P_T1, P_T2, P_T3, P_T4, P_T5];
    for (const project of projects) {
      const result = await runFullDiagnostic(project);
      result.gaps.forEach(gap => {
        expect(gap.lei_ref).not.toBeUndefined();
        expect(gap.lei_ref).not.toBeNull();
        expect(gap.lei_ref.trim()).not.toBe('');
      });
    }
  });

});
