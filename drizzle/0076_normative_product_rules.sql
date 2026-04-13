-- Migration 0076 — Sprint Z-13.5 Tarefa B
-- Cria tabela normative_product_rules para inferência de alíquota zero
-- por NCM (cesta básica Art. 125 Anexo I + Art. 148 Anexo XV LC 214/2025).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS normative_product_rules (
  id              int AUTO_INCREMENT PRIMARY KEY,
  regime          varchar(64)   NOT NULL COMMENT 'Categoria de risco: aliquota_zero, etc.',
  legal_reference varchar(255)  NOT NULL COMMENT 'Referência legal: Art. 125 c/c Anexo I LC 214/2025',
  ncm_code        varchar(20)   NOT NULL COMMENT 'Código NCM (prefixo ou exato)',
  match_mode      enum('exact','prefix') NOT NULL DEFAULT 'exact' COMMENT 'Modo de match: exact = código exato; prefix = começa com',
  active          tinyint(1)    NOT NULL DEFAULT 1,
  source_version  varchar(64)   NOT NULL DEFAULT 'LC214_2025',
  created_at      timestamp     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_normative_regime  (regime),
  INDEX idx_normative_ncm     (ncm_code),
  INDEX idx_normative_active  (active)
);

-- Seed: NCMs da cesta básica — Art. 125 Anexo I LC 214/2025 (alíquota zero IBS/CBS)
INSERT INTO normative_product_rules (regime, legal_reference, ncm_code, match_mode, active, source_version) VALUES
  ('aliquota_zero', 'Art. 125 c/c Anexo I LC 214/2025', '1006.20',    'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 125 c/c Anexo I LC 214/2025', '1006.30',    'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 125 c/c Anexo I LC 214/2025', '1006.40.00', 'exact',  1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 125 c/c Anexo I LC 214/2025', '0401.10',    'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 125 c/c Anexo I LC 214/2025', '0401.20',    'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 125 c/c Anexo I LC 214/2025', '0402',       'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 125 c/c Anexo I LC 214/2025', '1901.10',    'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 125 c/c Anexo I LC 214/2025', '2106.90.90', 'exact',  1, 'LC214_2025'),
-- Seed: NCMs da cesta básica — Art. 148 Anexo XV LC 214/2025 (alíquota zero IBS/CBS)
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '0407.2', 'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '07.01',  'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '07.02',  'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '07.03',  'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '07.04',  'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '07.05',  'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '07.06',  'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '07.09',  'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '08.03',  'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '08.05',  'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '08.07',  'prefix', 1, 'LC214_2025'),
  ('aliquota_zero', 'Art. 148 c/c Anexo XV LC 214/2025', '08.08',  'prefix', 1, 'LC214_2025');
