/**
 * Corpus RAG — Portaria Conjunta MF/CGIBS 7/2026
 * Fonte: https://www.cgibs.gov.br (Diário Oficial 30/04/2026, SEI 60959979)
 * Conteúdo: 2 artigos formalizando equivalência Decreto 12.955 Livro I ≡
 * Resolução CGIBS 6 Livro I (disposições comuns CBS+IBS).
 * CORPUS-RFC-008 — Issue #1074 (P0 fast-track ORQ-11).
 *
 * Gerado automaticamente por scripts/build-corpus-portaria-mf-cgibs-7.ts.
 * Total de entradas: 2 (2 artigos)
 * NÃO editar manualmente — re-gerar via script para preservar determinismo.
 */

import type { CorpusEntry } from './rag-corpus';

export const RAG_CORPUS_PORTARIA_7: CorpusEntry[] = [
  {
    lei: "portaria_mf_cgibs_7",
    artigo: "Art. 1",
    titulo: "Ficam reconhecidas como disposições comuns ao IBS e à CBS aquelas constantes do Livro\nI do Decreto nº 12",
    conteudo: `Art. 1º Ficam reconhecidas como disposições comuns ao IBS e à CBS aquelas constantes do Livro
I do Decreto nº 12.955, de 29 de abril de 2026, publicado no Diário Oficial da União de 30 de abril de 2026, e
da Resolução nº 6, de 30 de abril de 2026, divulgada no sítio eletrônico do Comitê Gestor do Imposto sobre
Bens e Serviços (https://www.cgibs.gov.br) em 30 de abril de 2026.
Parágrafo único. O reconhecimento de que trata este artigo não se aplica a alterações dos atos
normativos de que trata o caput.
União.`,
    topicos: "CBS, IBS, Reforma Tributária",
    cnaeGroups: "",
    chunkIndex: 0,
  },
  {
    lei: "portaria_mf_cgibs_7",
    artigo: "Art. 2",
    titulo: "Esta Portaria Conjunta entra em vigor na data de sua publicação no Diário Oficial da\n\nDARIO CARNEVALLI DURIGAN\nMinistro de Estado da Fazenda\n\nReferência",
    conteudo: `Art. 2º Esta Portaria Conjunta entra em vigor na data de sua publicação no Diário Oficial da

DARIO CARNEVALLI DURIGAN
Ministro de Estado da Fazenda

Referência: Processo nº 10265.162907/2026-51.

FLAVIO CESAR DE OLIVEIRA
Presidente do Comitê Gestor do IBS

SEI nº 60959979

https://colaboragov.sei.gov.br/sei/controlador.php?acao=documento_imprimir_web&acao_origem=arvore_visualizar&id_documento=67074983&in…

1/1`,
    topicos: "CBS, IBS, Reforma Tributária",
    cnaeGroups: "",
    chunkIndex: 0,
  },
];
