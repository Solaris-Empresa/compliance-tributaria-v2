-- Migration 0067b — Sprint Z-10 PR #A — GAP-ACL
-- Adiciona campos de ACL (Access Control List) à tabela risk_categories
-- Permite filtrar categorias por domínio de negócio e tipo de gap

ALTER TABLE risk_categories
  ADD COLUMN allowed_domains JSON NULL COMMENT 'Domínios permitidos: ["contabilidade","fiscal","ti","juridico","negocio"]. NULL = todos.',
  ADD COLUMN allowed_gap_types JSON NULL COMMENT 'Tipos de gap permitidos: ["obrigacao_acessoria","apuracao","credito","transicao"]. NULL = todos.',
  ADD COLUMN rule_code VARCHAR(64) NULL COMMENT 'Código único da regra de mapeamento, ex: RC-001. NULL = sem regra específica.';
