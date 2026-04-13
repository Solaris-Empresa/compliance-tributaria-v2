-- Migration 0075 — Sprint Z-13.5 Tarefa A
-- Adiciona campos de contexto operacional e validação RAG em risks_v4.
-- Regra: ADD COLUMN apenas — nunca DROP COLUMN (ADR-0013 / bloqueio permanente).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE risks_v4
  ADD COLUMN risk_key              varchar(255)     NULL COMMENT 'Chave de dedup: {project_id}:{rule_id}:{categoria}',
  ADD COLUMN operational_context   json             NULL COMMENT 'Contexto operacional do projeto: cnaes, taxRegime, companySize, tipoOperacao, etc.',
  ADD COLUMN evidence_count        int              NOT NULL DEFAULT 0 COMMENT 'Número de gaps consolidados neste risco',
  ADD COLUMN rag_validated         tinyint(1)       NOT NULL DEFAULT 0 COMMENT '1 = validado pelo RAG; 0 = não validado',
  ADD COLUMN rag_confidence        decimal(3,2)     NOT NULL DEFAULT 0 COMMENT 'Confiança da validação RAG (0.00–1.00)',
  ADD COLUMN rag_artigo_exato      varchar(255)     NULL COMMENT 'Artigo exato encontrado no RAG',
  ADD COLUMN rag_paragrafo         varchar(100)     NULL COMMENT 'Parágrafo do artigo encontrado no RAG',
  ADD COLUMN rag_inciso            varchar(100)     NULL COMMENT 'Inciso do artigo encontrado no RAG',
  ADD COLUMN rag_trecho_legal      text             NULL COMMENT 'Trecho legal exato do documento RAG',
  ADD COLUMN rag_query             varchar(500)     NULL COMMENT 'Query usada para busca no RAG',
  ADD COLUMN rag_validation_note   text             NULL COMMENT 'Nota de validação RAG (motivo de não validação ou observações)';
