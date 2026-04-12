/**
 * RAG Corpus — Resoluções CGIBS (Lote D)
 *
 * Reexporta o corpus real de rag-corpus-cgibs-lote-d.ts adaptando
 * para o formato esperado pelo script rag-ingest-cgibs.mjs.
 *
 * Corpus real: server/rag-corpus-cgibs-lote-d.ts (6 chunks, 3 resoluções)
 * Ingestão: node server/rag-ingest-cgibs.mjs
 *
 * Preenchido em: 2026-04-12 (Sprint Z-13 — Item B)
 */

import { cgibsLoteD } from './rag-corpus-cgibs-lote-d.js';

export interface CgibsCorpusEntry {
  lei: 'resolucao_cgibs_1' | 'resolucao_cgibs_2' | 'resolucao_cgibs_3';
  artigo: string;
  titulo: string;
  conteudo: string;
  topicos: string;
  cnaeGroups: string;
  chunkIndex: number;
  anchor_id?: string;
  // Metadados específicos CGIBS
  vigente: boolean;
  dependente_regulamentacao: boolean;
  data_vigencia?: string;   // ISO 8601, ex: "2026-01-01"
  autor?: string;           // "CGIBS"
  revisado_por?: string;    // responsável pela revisão do chunk
  data_revisao?: string;    // ISO 8601
}

// Adaptar cgibsLoteD para o formato CgibsCorpusEntry
export const RAG_CORPUS_CGIBS: CgibsCorpusEntry[] = cgibsLoteD.map((entry, idx) => ({
  lei: entry.lei,
  artigo: entry.artigo,
  titulo: entry.titulo,
  conteudo: entry.conteudo,
  topicos: Array.isArray(entry.topicos) ? entry.topicos.join(', ') : String(entry.topicos),
  cnaeGroups: Array.isArray(entry.cnaeGroups) ? entry.cnaeGroups.join(',') : String(entry.cnaeGroups ?? ''),
  chunkIndex: idx,
  anchor_id: entry.anchor_id,
  vigente: entry.vigente,
  dependente_regulamentacao: entry.dependente_regulamentacao,
  data_vigencia: entry.data_publicacao,
  autor: 'CGIBS',
  revisado_por: 'Manus',
  data_revisao: '2026-04-12',
}));

// Aliases por resolução
export const RAG_CORPUS_CGIBS_1 = RAG_CORPUS_CGIBS.filter(e => e.lei === 'resolucao_cgibs_1');
export const RAG_CORPUS_CGIBS_2 = RAG_CORPUS_CGIBS.filter(e => e.lei === 'resolucao_cgibs_2');
export const RAG_CORPUS_CGIBS_3 = RAG_CORPUS_CGIBS.filter(e => e.lei === 'resolucao_cgibs_3');
