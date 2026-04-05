/**
 * ncm-engine.ts — Decision Kernel: engine determinístico NCM
 *
 * Contrato: CNT-01a + CNT-02 + CNT-03
 * Fonte: server/lib/decision-kernel/datasets/ncm-dataset.json
 *
 * Regras obrigatórias:
 * - LLM PROIBIDO de decidir (apenas lookup estruturado)
 * - status='pending_validation' → retornar fallback com nota
 * - condicional → retornar tipo='condicional', NÃO resolver
 * - fonte legal OBRIGATÓRIA em todo output
 *
 * Aprovado: Orquestrador Claude — 2026-04-05 (Bloco C)
 */

import ncmDataset from '../datasets/ncm-dataset.json';

// ─── Tipos (CNT-01a + CNT-02) ────────────────────────────────────────────────

export interface NcmInput {
  codigo: string;   // ex: "9619.00.00"
  sistema: 'NCM';
}

export interface EngineConfianca {
  valor: number;    // 0–100
  tipo: 'deterministico' | 'regra' | 'fallback' | 'condicional';
}

export interface EngineFonte {
  lei: string;
  artigo: string;
  paragrafo: string | null;
  inciso: string | null;
}

export interface NcmEngineOutput {
  regime: string;
  anexo: string | null;
  aliquota: number | null;
  descricao: string;
  confianca: EngineConfianca;
  fonte: EngineFonte;
  nota?: string;
}

// ─── Dataset interno ─────────────────────────────────────────────────────────

interface NcmEntry {
  ncm_code: string;
  descricao: string;
  regime: string;
  aliquota: number | null;
  imposto_seletivo: boolean;
  confianca: { valor: number; tipo: string };
  condicionante?: string;
  instrucao_engine?: string;
  fonte: Record<string, unknown>;
  status: 'confirmado' | 'pending_validation';
  pendencia?: string;
}

const dataset = ncmDataset as NcmEntry[];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

function extractFonte(entry: NcmEntry): EngineFonte {
  const f = entry.fonte as Record<string, unknown>;

  // Caso simples: campo artigo direto
  if (typeof f.artigo === 'string') {
    return {
      lei: String(f.lei ?? 'LC 214/2025'),
      artigo: f.artigo,
      paragrafo: typeof f.paragrafo === 'string' ? f.paragrafo : null,
      inciso: null,
    };
  }

  // Caso NCM com múltiplos artigos (ex: 3101.00.00 — artigo_128 + artigo_138)
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
 * lookupNcm — consulta determinística no dataset NCM.
 *
 * Regra obrigatória (Orquestrador, 2026-04-05):
 *   if (entry.status === 'pending_validation') {
 *     return fallback com nota — NÃO usar em produção
 *   }
 */
export function lookupNcm(input: NcmInput): NcmEngineOutput {
  const codigo = normalizeCodigo(input.codigo);

  const entry = dataset.find(
    (e) => normalizeCodigo(e.ncm_code) === codigo
  );

  // ── Caso 1: não encontrado → fallback ────────────────────────────────────
  if (!entry) {
    return {
      regime: 'regime_geral',
      anexo: null,
      aliquota: null,
      descricao: `NCM ${codigo} não encontrado no dataset M1. Aplicar regime geral (alíquota padrão IBS/CBS).`,
      confianca: { valor: 60, tipo: 'fallback' },
      fonte: { lei: 'LC 214/2025', artigo: 'regime geral', paragrafo: null, inciso: null },
      nota: 'NCM não mapeado no dataset Milestone 1 — resultado estimado.',
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

  // ── Caso 3: condicional ──────────────────────────────────────────────────
  if (entry.regime === 'condicional') {
    return {
      regime: 'condicional',
      anexo: null,
      aliquota: null,
      descricao: `${entry.descricao} — ${entry.condicionante ?? 'verificar condicionante'}`,
      confianca: {
        valor: entry.confianca.valor,
        tipo: 'condicional',
      },
      fonte: extractFonte(entry),
      nota: entry.instrucao_engine,
    };
  }

  // ── Caso 4: confirmado → resultado determinístico ────────────────────────
  return {
    regime: entry.regime,
    anexo: null,
    aliquota: entry.aliquota ?? null,
    descricao: entry.descricao,
    confianca: {
      valor: entry.confianca.valor,
      tipo: entry.confianca.tipo as EngineConfianca['tipo'],
    },
    fonte: extractFonte(entry),
  };
}
