-- Migration 0065 — Sprint Z-09 / ADR-0025
-- Tabela risk_categories: categorias configuráveis via banco
-- Resolve: GAP-ARCH-06 (validade temporal) · GAP-ARCH-07 (badge desatualizado)
--          GAP-ARCH-08 (SLA aprovação) · GAP-ARCH-09 (chunk de origem no painel)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS risk_categories (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  codigo           VARCHAR(64)   NOT NULL UNIQUE,
  nome             VARCHAR(255)  NOT NULL,
  severidade       ENUM('alta','media','oportunidade') NOT NULL,
  urgencia         ENUM('imediata','curto_prazo','medio_prazo') NOT NULL,
  tipo             ENUM('risk','opportunity') NOT NULL,
  artigo_base      VARCHAR(255)  NOT NULL,
  lei_codigo       VARCHAR(64)   NOT NULL,

  -- Validade temporal (GAP-ARCH-06)
  vigencia_inicio  DATE          NOT NULL,
  vigencia_fim     DATE          NULL,
  -- NULL = vigência indeterminada (não será revogada)
  -- DATE = revogação em data específica (ex: transicao_iss_ibs = 2032-12-31)

  -- Labels em português (público brasileiro)
  status   ENUM('ativo','sugerido','pendente_revisao','inativo','legado') NOT NULL DEFAULT 'ativo',
  origem   ENUM('lei_federal','regulamentacao','rag_sensor','manual')     NOT NULL,
  escopo   ENUM('nacional','estadual','setorial')                         NOT NULL DEFAULT 'nacional',

  -- Rastreabilidade de aprovação (GAP-ARCH-08 + GAP-ARCH-09)
  sugerido_por     VARCHAR(100)  NULL,
  aprovado_por     VARCHAR(100)  NULL,
  aprovado_at      TIMESTAMP     NULL,
  chunk_origem_id  INT           NULL, -- FK rag_chunks (painel admin mostra chunk de origem)

  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Seed: 10 categorias iniciais da LC 214/2025
-- transicao_iss_ibs tem vigencia_fim = 2032-12-31 (encerra com a reforma)
-- ---------------------------------------------------------------------------

INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo)
VALUES
('imposto_seletivo',
 'Imposto Seletivo',
 'alta', 'imediata', 'risk',
 'Art. 2 LC 214/2025', 'LC-214-2025',
 '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional'),

('confissao_automatica',
 'Confissão Automática',
 'alta', 'imediata', 'risk',
 'Art. 45 LC 214/2025', 'LC-214-2025',
 '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional'),

('split_payment',
 'Split Payment',
 'alta', 'imediata', 'risk',
 'Art. 9 LC 214/2025', 'LC-214-2025',
 '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional'),

('inscricao_cadastral',
 'Inscrição Cadastral IBS/CBS',
 'alta', 'imediata', 'risk',
 'Art. 213 LC 214/2025', 'LC-214-2025',
 '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional'),

('regime_diferenciado',
 'Regime Diferenciado',
 'media', 'curto_prazo', 'risk',
 'Art. 29 LC 214/2025', 'LC-214-2025',
 '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional'),

('transicao_iss_ibs',
 'Transição ISS para IBS',
 'media', 'medio_prazo', 'risk',
 'Arts. 6-12 LC 214/2025', 'LC-214-2025',
 '2026-01-01', '2032-12-31', 'ativo', 'lei_federal', 'nacional'),

('obrigacao_acessoria',
 'Obrigação Acessória',
 'media', 'curto_prazo', 'risk',
 'Art. 102 LC 214/2025', 'LC-214-2025',
 '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional'),

('aliquota_zero',
 'Alíquota Zero',
 'oportunidade', 'curto_prazo', 'opportunity',
 'Art. 14 LC 214/2025', 'LC-214-2025',
 '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional'),

('aliquota_reduzida',
 'Alíquota Reduzida',
 'oportunidade', 'curto_prazo', 'opportunity',
 'Art. 24 LC 214/2025', 'LC-214-2025',
 '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional'),

('credito_presumido',
 'Crédito Presumido',
 'oportunidade', 'curto_prazo', 'opportunity',
 'Art. 58 LC 214/2025', 'LC-214-2025',
 '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional');
