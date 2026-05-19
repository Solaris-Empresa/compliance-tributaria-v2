-- ─────────────────────────────────────────────────────────────────────────────
-- Cria tabela normative_service_rules para inferência de regime por NBS
-- (serviços), espelhando o padrão canônico de normative_product_rules
-- (migration 0076 — regras por NCM / produtos físicos).
-- Corpus Onda 2 — 2026-05-19.
--
-- DECISÃO DE ESCOPO (REGRA ANTI-ALUCINAÇÃO):
--   Esta migration cria APENAS a estrutura da tabela. NENHUM seed/INSERT é
--   incluído. A classificação de regime tributário por NBS (alíquota zero,
--   reduzida, etc.) e sua base legal exigem revisão da equipe jurídica
--   SOLARIS — Claude Code NÃO autora classificação normativa (Lição #61,
--   REGRA-ORQ-29, Content Engine Rule #4).
--
--   O schema de Mission 2 (aliquota_ibs/aliquota_cbs/reducao_percentual/
--   descricao/cnae_aplicavel/observacoes) foi DESCARTADO por divergir do
--   padrão real: normative_product_rules (mig 0076) é uma tabela de lookup
--   regime+legal_reference+code+match_mode, não uma tabela de alíquotas.
--   Esta tabela segue o padrão real para paridade arquitetural.
--
-- Aplicação em produção: Manus executa este arquivo diretamente.
-- Rollback: DROP TABLE normative_service_rules (tabela nova, sem dependências).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS normative_service_rules (
  id              int AUTO_INCREMENT PRIMARY KEY,
  regime          varchar(64)   NOT NULL COMMENT 'Categoria de risco: aliquota_zero, aliquota_reduzida, etc.',
  legal_reference varchar(255)  NOT NULL COMMENT 'Referência legal: ex. Art. 26 LC 214/2025',
  nbs_code        varchar(20)   NOT NULL COMMENT 'Código NBS (prefixo ou exato), ex: 1.0601.11.00',
  match_mode      enum('exact','prefix') NOT NULL DEFAULT 'exact' COMMENT 'Modo de match: exact = código exato; prefix = começa com',
  active          tinyint(1)    NOT NULL DEFAULT 1,
  source_version  varchar(64)   NOT NULL DEFAULT 'LC214_2025',
  created_at      timestamp     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_normative_svc_regime (regime),
  INDEX idx_normative_svc_nbs    (nbs_code),
  INDEX idx_normative_svc_active (active)
);

-- Sem seed: aguarda curadoria jurídica SOLARIS (NBS → regime + base legal).
-- Issue de tracking da curadoria deve ser aberta pelo Orquestrador antes da
-- ativação do consumo desta tabela pelo motor determinístico.
