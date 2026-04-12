-- Migration 0074 — Sprint Z-12 (Lote D RAG)
-- Adiciona valores resolucao_cgibs_1, resolucao_cgibs_2, resolucao_cgibs_3
-- ao ENUM da coluna lei na tabela ragDocuments.
--
-- ATENÇÃO: executar ANTES de node server/rag-ingest-cgibs.mjs
-- Comando: node server/apply-0074-rag-enum.mjs

ALTER TABLE ragDocuments
  MODIFY COLUMN lei ENUM(
    'lc214',
    'ec132',
    'lc227',
    'lc224',
    'lc116',
    'lc87',
    'cg_ibs',
    'rfb_cbs',
    'conv_icms',
    'lc123',
    'resolucao_cgibs_1',
    'resolucao_cgibs_2',
    'resolucao_cgibs_3'
  ) NOT NULL;
