-- migration: 0104_cnae_aplicavel_oportunidade.sql
-- (nº 0104 — 0103 já em main / FIX-NORM-02 #1182)
-- Issue: #1177 (FEAT-SCOPE-01) · sign-off P.O. 24/05/2026 · Art. 127 §1º II LC 214/2025
-- Filtro data-driven da oportunidade `aliquota_reduzida` por CNAE (sem hardcode — REGRA-ORQ-32).
-- Idempotente: CREATE TABLE IF NOT EXISTS + INSERT ... ON DUPLICATE KEY. Reversível (DOWN abaixo).

CREATE TABLE IF NOT EXISTS cnae_aplicavel_oportunidade (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  oportunidade_codigo   VARCHAR(64)  NOT NULL,
  cnae_4dig             VARCHAR(4)   NOT NULL,
  elegibilidade         ENUM('potencial','excluido','pending_legal') NOT NULL,
  conselho_profissional VARCHAR(64)  NULL,
  inciso_art127         VARCHAR(128) NULL,
  gate_especial         VARCHAR(16)  NULL,
  requer_questionario   TINYINT(1)   NOT NULL DEFAULT 1,
  fonte_normativa       VARCHAR(128) NOT NULL DEFAULT 'Art. 127 §1º II LC 214/2025',
  sign_off_autor        VARCHAR(128) NULL,
  sign_off_data         VARCHAR(10)  NULL,
  created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cnae_oport (oportunidade_codigo, cnae_4dig),
  KEY idx_cnae_oport_codigo (oportunidade_codigo)
);

-- Seed Fase 1 (#1177) — 14 linhas: 7 potenciais §1º II + 2 potenciais §3º + 5 exclusões.
-- 7490 fica em Fase 2 (pending_legal — mapeamento ⚠️); ⚠️ 7119/7120 + faltantes idem.
INSERT INTO cnae_aplicavel_oportunidade
  (oportunidade_codigo, cnae_4dig, elegibilidade, conselho_profissional, inciso_art127, gate_especial, requer_questionario, fonte_normativa, sign_off_autor, sign_off_data)
VALUES
  -- potenciais — gate questionário §1º II
  ('aliquota_reduzida','6911','potencial','OAB',        'II — Advogados',            NULL, 1, 'Art. 127 §1º II LC 214/2025','P.O. (Uires Tapajos)','2026-05-24'),
  ('aliquota_reduzida','6920','potencial','CFC',        'VII — Contabilistas',       NULL, 1, 'Art. 127 §1º II LC 214/2025','P.O. (Uires Tapajos)','2026-05-24'),
  ('aliquota_reduzida','7111','potencial','CAU',        'III — Arquitetos',          NULL, 1, 'Art. 127 §1º II LC 214/2025','P.O. (Uires Tapajos)','2026-05-24'),
  ('aliquota_reduzida','7112','potencial','CREA/CONFEA','XI — Engenheiros/Agronomos',NULL, 1, 'Art. 127 §1º II LC 214/2025','P.O. (Uires Tapajos)','2026-05-24'),
  ('aliquota_reduzida','7500','potencial','CFMV',       'XIII — Medicos veterinarios',NULL,1, 'Art. 127 §1º II LC 214/2025','P.O. (Uires Tapajos)','2026-05-24'),
  ('aliquota_reduzida','9101','potencial','CRB',        'V — Bibliotecarios',        NULL, 1, 'Art. 127 §1º II LC 214/2025','P.O. (Uires Tapajos)','2026-05-24'),
  ('aliquota_reduzida','9102','potencial','COFEM',      'XIV — Museologos',          NULL, 1, 'Art. 127 §1º II LC 214/2025','P.O. (Uires Tapajos)','2026-05-24'),
  -- potenciais — gate §3º (ed. fisica; dispensa as 4 perguntas, basta fiscalizacao CONFEF/CREF)
  ('aliquota_reduzida','9311','potencial','CREF',       'X — Ed. Fisica (§3º)',      '§3º',0, 'Art. 127 §3º LC 214/2025',   'P.O. (Uires Tapajos)','2026-05-24'),
  ('aliquota_reduzida','8591','potencial','CREF',       'X — Ed. Fisica (§3º)',      '§3º',0, 'Art. 127 §3º LC 214/2025',   'P.O. (Uires Tapajos)','2026-05-24'),
  -- exclusoes
  ('aliquota_reduzida','4120','excluido', NULL,         NULL,                        NULL, 0, 'Art. 127 §1º II LC 214/2025','P.O. (Uires Tapajos)','2026-05-24'),
  ('aliquota_reduzida','4711','excluido', NULL,         NULL,                        NULL, 0, 'Art. 127 §1º II LC 214/2025','P.O. (Uires Tapajos)','2026-05-24'),
  ('aliquota_reduzida','4930','excluido', NULL,         NULL,                        NULL, 0, 'Art. 127 §1º II LC 214/2025','P.O. (Uires Tapajos)','2026-05-24'),
  ('aliquota_reduzida','8630','excluido', 'CFM/CFO',    'Art. 128 (nao 127)',        NULL, 0, 'Art. 128 LC 214/2025',       'P.O. (Uires Tapajos)','2026-05-24'),
  ('aliquota_reduzida','8650','excluido', NULL,         'saude humana',              NULL, 0, 'Art. 127 §1º II LC 214/2025','P.O. (Uires Tapajos)','2026-05-24')
ON DUPLICATE KEY UPDATE
  elegibilidade         = VALUES(elegibilidade),
  conselho_profissional = VALUES(conselho_profissional),
  inciso_art127         = VALUES(inciso_art127),
  gate_especial         = VALUES(gate_especial),
  requer_questionario   = VALUES(requer_questionario),
  fonte_normativa       = VALUES(fonte_normativa),
  sign_off_autor        = VALUES(sign_off_autor),
  sign_off_data         = VALUES(sign_off_data),
  updated_at            = NOW();

-- ROLLBACK (DOWN):
-- DROP TABLE IF EXISTS cnae_aplicavel_oportunidade;
