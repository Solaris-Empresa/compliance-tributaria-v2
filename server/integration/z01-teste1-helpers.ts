/**
 * z01-teste1-helpers.ts
 * Helpers compartilhados para os testes do Teste 1 (TR-* e TB-*)
 * Ordem de processamento: NCM → NBS → SOLARIS → IAGEN
 */
import { categorizeRisk } from '../lib/risk-categorizer';

export type GapLike = {
  id: string;
  fonte: string;
  fonte_ref: string;
  lei_ref: string;
  ncm?: string;
  nbs?: string;
  descricao?: string;
  categoria?: string;
};

export type RiscoLike = {
  id: string;
  source_gap_ids: string[];
  lei_ref: string;
  severity: 'alto' | 'medio' | 'baixo';
  descricao: string;
  fonte?: string;
};

export type DiagnosticResult = {
  gaps: GapLike[];
  riscos: RiscoLike[];
  briefing?: any;
};

export type ProjetoInput = {
  ncmAnswers?: { ncm: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao' }[];
  solarisAnswers?: { id: string; lei_ref: string; resposta: 'sim' | 'nao' }[];
  nbsAnswers?: { nbs: string; fonte: string; fonte_ref: string; lei_ref: string; resposta: 'sim' | 'nao' }[];
  iagenAnswers?: { id: string; fonte_ref: string; lei_ref: string; gap: string }[];
  confirmedCnaes?: string[];
  operationType?: 'product' | 'service' | 'mixed';
};

/**
 * Ordem de processamento: NCM → NBS → SOLARIS → IAGEN
 * Garante que gaps[0] seja sempre o primeiro NCM (se existir)
 */
export async function runFullDiagnostic(projeto: ProjetoInput): Promise<DiagnosticResult> {
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
    severity: (g.lei_ref?.includes('Art. 2') ? 'alto' : 'medio') as 'alto' | 'medio' | 'baixo',
    descricao: `Risco derivado de ${g.fonte_ref}`,
    fonte: g.fonte,
  }));

  return { gaps, riscos };
}

/**
 * Gera um briefing a partir do DiagnosticResult
 * Retorna objeto compatível com CompleteBriefing-like
 */
export function generateBriefingFromResult(result: DiagnosticResult, projeto?: ProjetoInput) {
  const ncms = result.gaps.filter(g => g.ncm).map(g => g.ncm!);
  const nbss = result.gaps.filter(g => g.nbs).map(g => g.nbs!);
  const cnaes = projeto?.confirmedCnaes || [];
  const lei_refs = [...new Set(result.gaps.map(g => g.lei_ref).filter(Boolean))];

  const content = {
    gaps: result.gaps,
    riscos: result.riscos,
    ncms,
    nbss,
    cnaes,
    lei_refs,
    // Texto descritivo para facilitar asserts de conteúdo
    descricao: [
      ...ncms.map(n => `NCM ${n}`),
      ...nbss.map(n => `NBS ${n}`),
      ...lei_refs,
      ...result.gaps.map(g => g.descricao || ''),
      ...result.riscos.map(r => r.descricao || ''),
    ].join(' | '),
  };

  const fontes_usadas = result.gaps.map(g => ({
    tipo: g.fonte,
    fonte_ref: g.fonte_ref,
  }));

  return {
    content,
    fontes_usadas,
    cpie_score: 75,
    completeness_status: 'parcial' as const,
    updatedAt: Date.now(),
    total_riscos: result.riscos.length,
    riscos: result.riscos,
    gaps: result.gaps,
  };
}

// ─── Projetos P-T1..P-T5 ─────────────────────────────────────────────────────

export const P_T1: ProjetoInput = {
  ncmAnswers: [
    { ncm: '1006.40.00', fonte: 'rag', fonte_ref: 'lc214-art14-ncm1006', lei_ref: 'Art. 14 LC 214/2025', resposta: 'nao' },
    { ncm: '2202.10.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2202', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' },
  ],
  solarisAnswers: [
    { id: 'SOL-001', lei_ref: 'Art. 1 LC 214/2025', resposta: 'nao' },
    { id: 'SOL-005', lei_ref: 'Art. 5 LC 214/2025', resposta: 'sim' },
  ],
  nbsAnswers: [],
  iagenAnswers: [],
  confirmedCnaes: ['4637-1/07'],
  operationType: 'product',
};

export const P_T2: ProjetoInput = {
  ncmAnswers: [],
  solarisAnswers: [
    { id: 'SOL-019', lei_ref: 'Art. 19 LC 214/2025', resposta: 'nao' },
  ],
  nbsAnswers: [
    { nbs: '1.01.01', fonte: 'solaris', fonte_ref: 'SOL-019', lei_ref: 'Art. 19 LC 214/2025', resposta: 'nao' },
    { nbs: '1.17.19', fonte: 'rag', fonte_ref: 'lc214-art11-nbs117', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' },
  ],
  iagenAnswers: [],
  confirmedCnaes: ['6201-5/00'],
  operationType: 'service',
};

export const P_T3: ProjetoInput = {
  ncmAnswers: [
    { ncm: '3004.90.99', fonte: 'rag', fonte_ref: 'lc214-art34-ncm3004', lei_ref: 'Art. 34 LC 214/2025', resposta: 'nao' },
    { ncm: '3002.15.00', fonte: 'rag', fonte_ref: 'lc214-art34-ncm3002', lei_ref: 'Art. 34 LC 214/2025', resposta: 'nao' },
  ],
  solarisAnswers: [
    { id: 'SOL-022', lei_ref: 'Art. 29 LC 214/2025', resposta: 'nao' },
  ],
  nbsAnswers: [
    { nbs: '1.03.07', fonte: 'solaris', fonte_ref: 'SOL-022', lei_ref: 'Art. 29 LC 214/2025', resposta: 'nao' },
  ],
  iagenAnswers: [
    { id: 'iagen-1', fonte_ref: 'iagen-gap-1', lei_ref: 'Art. 34 LC 214/2025', gap: 'Medicamentos sem controle de aliquota reduzida' },
  ],
  confirmedCnaes: ['4771-7/01', '8630-5/01'],
  operationType: 'mixed',
};

export const P_T4: ProjetoInput = {
  ncmAnswers: [
    { ncm: '2208.40.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2208', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' },
    { ncm: '2203.00.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2203', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' },
    { ncm: '2204.21.00', fonte: 'rag', fonte_ref: 'lc214-art2-ncm2204', lei_ref: 'Art. 2 LC 214/2025', resposta: 'nao' },
  ],
  solarisAnswers: [],
  nbsAnswers: [],
  iagenAnswers: [
    { id: 'iagen-2', fonte_ref: 'iagen-gap-2', lei_ref: 'Art. 2 LC 214/2025', gap: 'Bebidas alcoolicas sujeitas ao IS' },
  ],
  confirmedCnaes: ['4635-4/99'],
  operationType: 'product',
};

export const P_T5: ProjetoInput = {
  ncmAnswers: [
    { ncm: '8471.30.19', fonte: 'rag', fonte_ref: 'lc214-art9-ncm8471', lei_ref: 'Art. 9 LC 214/2025', resposta: 'nao' },
    { ncm: '8543.70.99', fonte: 'rag', fonte_ref: 'lc214-art9-ncm8543', lei_ref: 'Art. 9 LC 214/2025', resposta: 'nao' },
  ],
  solarisAnswers: [
    { id: 'SOL-011', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' },
  ],
  nbsAnswers: [
    { nbs: '1.01.01', fonte: 'solaris', fonte_ref: 'SOL-011', lei_ref: 'Art. 11 LC 214/2025', resposta: 'nao' },
    { nbs: '1.07.01', fonte: 'rag', fonte_ref: 'lc214-art7-nbs107', lei_ref: 'Art. 7 LC 214/2025', resposta: 'nao' },
  ],
  iagenAnswers: [
    { id: 'iagen-3', fonte_ref: 'iagen-gap-3', lei_ref: 'Art. 9 LC 214/2025', gap: 'Software sem enquadramento CBS definido' },
  ],
  confirmedCnaes: ['4120-4/00', '6201-5/00'],
  operationType: 'mixed',
};

export const projetos: Record<string, ProjetoInput> = {
  'P-T1': P_T1,
  'P-T2': P_T2,
  'P-T3': P_T3,
  'P-T4': P_T4,
  'P-T5': P_T5,
};
