/**
 * nbs-engine.ts — Decision Kernel: engine interpretativo NBS
 *
 * Contrato: CNT-01b + CNT-02 + CNT-03
 * Fonte: server/lib/decision-kernel/datasets/nbs-dataset.json
 *
 * Diferença crítica NCM vs NBS (CNT-01b):
 * - NCM aparece nos Anexos I–XI da LC 214 → lookup direto → confiança 100%
 * - NBS NÃO aparece nos Anexos da LC 214 → lookup + regra interpretativa → confiança ≤ 98%
 *
 * Regras obrigatórias:
 * - LLM PROIBIDO de decidir (apenas lookup estruturado)
 * - status='pending_validation' → retornar fallback com nota
 * - confiança máxima NBS: 98% (nunca 100%)
 * - fonte legal OBRIGATÓRIA em todo output
 *
 * Aprovado: Orquestrador Claude — 2026-04-05 (Bloco C)
 */

import nbsDataset from '../datasets/nbs-dataset.json';

// ─── Tipos (CNT-01b + CNT-02) ────────────────────────────────────────────────

export interface NbsInput {
  codigo: string;   // ex: "1.1506.21.00"
  sistema: 'NBS';
}

export interface EngineConfianca {
  valor: number;    // 0–98 para NBS (nunca 100)
  tipo: 'deterministico' | 'regra' | 'fallback' | 'condicional';
}

export interface EngineFonte {
  lei: string;
  artigo: string;
  paragrafo: string | null;
  inciso: string | null;
}

export interface NbsEngineOutput {
  regime: string;
  anexo: string | null;
  aliquota: number | null;
  descricao: string;
  confianca: EngineConfianca;
  fonte: EngineFonte;
  nota?: string;
}

// ─── Dataset interno ─────────────────────────────────────────────────────────

interface NbsEntry {
  nbs_code: string;
  descricao: string;
  regime: string;
  subtipo_regime?: string;
  aliquota?: number | null;
  imposto_seletivo: boolean;
  confianca: { valor: number; tipo: string };
  nota_confianca?: string;
  nota_engine?: string;
  fonte: Record<string, unknown>;
  status: 'confirmado' | 'pending_validation';
  pendencia?: string;
}

const dataset = nbsDataset as NbsEntry[];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeCodigo(codigo: string): string {
  return codigo.trim();
}

function clampConfiancaNbs(valor: number): number {
  // CNT-01b: confiança máxima NBS = 98 (nunca 100)
  return Math.min(valor, 98);
}

function extractFonte(entry: NbsEntry): EngineFonte {
  const f = entry.fonte as Record<string, unknown>;

  // Extrair artigos presentes no objeto fonte
  const artigos = Object.entries(f)
    .filter(([k]) => k.startsWith('artigo'))
    .map(([, v]) => {
      const art = v as Record<string, unknown>;
      return String(art.numero ?? '');
    })
    .filter(Boolean);

  return {
    lei: String(f.lei ?? 'LC 214/2025'),
    artigo: artigos.join(', ') || 'ver fonte',
    paragrafo: null,
    inciso: null,
  };
}

// ─── Engine principal ─────────────────────────────────────────────────────────

/**
 * lookupNbs — consulta interpretativa no dataset NBS.
 *
 * Regra obrigatória (Orquestrador, 2026-04-05):
 *   if (entry.status === 'pending_validation') {
 *     return fallback com nota — NÃO usar em produção
 *   }
 *
 * Confiança máxima: 98 (CNT-01b — NBS é interpretativo, não determinístico puro)
 */
export function lookupNbs(input: NbsInput): NbsEngineOutput {
  const codigo = normalizeCodigo(input.codigo);

  const entry = dataset.find(
    (e) => normalizeCodigo(e.nbs_code) === codigo
  );

  // ── Caso 1: não encontrado → fallback ────────────────────────────────────
  if (!entry) {
    return {
      regime: 'regime_geral',
      anexo: null,
      aliquota: null,
      descricao: `NBS ${codigo} não encontrado no dataset M1. Aplicar regime geral (alíquota padrão IBS/CBS).`,
      confianca: { valor: 55, tipo: 'fallback' },
      fonte: { lei: 'LC 214/2025', artigo: 'regime geral', paragrafo: null, inciso: null },
      nota: 'NBS não mapeado no dataset Milestone 1 — resultado estimado.',
    };
  }

  // ── Caso 2: pending_validation → fallback com nota ───────────────────────
  if (entry.status === 'pending_validation') {
    return {
      regime: entry.regime,
      anexo: null,
      aliquota: null,
      descricao: entry.descricao,
      confianca: { valor: 0, tipo: 'fallback' },
      fonte: extractFonte(entry),
      nota: `Caso pendente de validação jurídica — não usar em produção. ${entry.pendencia ?? ''}`.trim(),
    };
  }

  // ── Caso 3: regime_especial (ex: serviços financeiros) ───────────────────
  if (entry.regime === 'regime_especial') {
    return {
      regime: 'regime_especial',
      anexo: null,
      aliquota: null,
      descricao: `${entry.descricao}${entry.nota_engine ? ' — ' + entry.nota_engine : ''}`,
      confianca: {
        valor: clampConfiancaNbs(entry.confianca.valor),
        tipo: 'regra',
      },
      fonte: extractFonte(entry),
      nota: entry.nota_confianca,
    };
  }

  // ── Caso 4: confirmado → resultado interpretativo ────────────────────────
  return {
    regime: entry.regime,
    anexo: null,
    aliquota: entry.aliquota ?? null,
    descricao: entry.descricao,
    confianca: {
      valor: clampConfiancaNbs(entry.confianca.valor),
      tipo: 'regra',
    },
    fonte: extractFonte(entry),
    nota: entry.nota_confianca,
  };
}
