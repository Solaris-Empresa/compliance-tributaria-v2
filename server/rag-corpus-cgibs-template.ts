/**
 * RAG Corpus — Resoluções CGIBS (Lote D)
 *
 * Template para ingestão das Resoluções do Comitê Gestor do IBS (CGIBS)
 * nº 1, 2 e 3/2026.
 *
 * INSTRUÇÕES PARA O P.O.:
 * 1. Forneça os PDFs das resoluções ao Manus.
 * 2. O Manus irá extrair o texto e preencher os arrays abaixo.
 * 3. Após preenchimento, execute:
 *      node server/rag-ingest-cgibs.mjs
 *
 * METADADOS OBRIGATÓRIOS POR ENTRADA:
 *   lei:      'resolucao_cgibs_1' | 'resolucao_cgibs_2' | 'resolucao_cgibs_3'
 *   artigo:   identificador do dispositivo (ex: "Art. 1", "Art. 2, § 1")
 *   titulo:   título descritivo do dispositivo
 *   conteudo: texto integral do dispositivo
 *   topicos:  palavras-chave separadas por vírgula
 *   cnaeGroups: grupos CNAE afetados (ex: "47,49,62") ou "" para todos
 *   vigente:  true = dispositivo já vigente | false = dependente de regulamentação
 *   dependente_regulamentacao: true = aguarda ato normativo complementar
 *
 * DISTINÇÃO VIGENTE vs. DEPENDENTE DE REGULAMENTAÇÃO:
 *   - vigente=true, dependente_regulamentacao=false:
 *       Dispositivo com eficácia imediata. Incluir no corpus principal.
 *   - vigente=true, dependente_regulamentacao=true:
 *       Dispositivo vigente mas condicionado a regulamentação posterior.
 *       Incluir com flag para alerta na UI ("aguarda regulamentação").
 *   - vigente=false:
 *       Dispositivo com vacatio legis ou entrada em vigor futura.
 *       Incluir com flag para alerta na UI ("entrada em vigor: [data]").
 */

export interface CgibsCorpusEntry {
  lei: 'resolucao_cgibs_1' | 'resolucao_cgibs_2' | 'resolucao_cgibs_3';
  artigo: string;
  titulo: string;
  conteudo: string;
  topicos: string;
  cnaeGroups: string;
  chunkIndex: number;
  // Metadados específicos CGIBS
  vigente: boolean;
  dependente_regulamentacao: boolean;
  data_vigencia?: string;   // ISO 8601, ex: "2026-01-01"
  autor?: string;           // "CGIBS"
  revisado_por?: string;    // responsável pela revisão do chunk
  data_revisao?: string;    // ISO 8601
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLUÇÃO CGIBS Nº 1/2026
// Preencher após receber o PDF do P.O.
// ─────────────────────────────────────────────────────────────────────────────
export const RAG_CORPUS_CGIBS_1: CgibsCorpusEntry[] = [
  // EXEMPLO — substituir pelo conteúdo real após extração do PDF:
  // {
  //   lei: 'resolucao_cgibs_1',
  //   artigo: 'Art. 1',
  //   titulo: 'Resolução CGIBS nº 1/2026 — Objeto',
  //   conteudo: 'Art. 1º Esta Resolução dispõe sobre...',
  //   topicos: 'CGIBS, IBS, Comitê Gestor, resolução',
  //   cnaeGroups: '',
  //   chunkIndex: 0,
  //   vigente: true,
  //   dependente_regulamentacao: false,
  //   autor: 'CGIBS',
  //   data_revisao: '2026-04-11',
  // },
];

// ─────────────────────────────────────────────────────────────────────────────
// RESOLUÇÃO CGIBS Nº 2/2026
// ─────────────────────────────────────────────────────────────────────────────
export const RAG_CORPUS_CGIBS_2: CgibsCorpusEntry[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// RESOLUÇÃO CGIBS Nº 3/2026
// ─────────────────────────────────────────────────────────────────────────────
export const RAG_CORPUS_CGIBS_3: CgibsCorpusEntry[] = [];

// Corpus unificado (usado pelo script de ingestão)
export const RAG_CORPUS_CGIBS = [
  ...RAG_CORPUS_CGIBS_1,
  ...RAG_CORPUS_CGIBS_2,
  ...RAG_CORPUS_CGIBS_3,
];
