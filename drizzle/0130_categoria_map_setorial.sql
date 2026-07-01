-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0130 — B1 Fase 1: tabela cnae_categoria_map + seed (paridade)
--
-- Issue: #1663 · Spec: #1675 (aprovada despacho 01/07 12h27, D-B1-1/2/3) · Refs AS-IS #1661
-- Fase 1 de 4: SÓ cria a tabela + seed. Engine ainda NÃO lê dela (Fase 2, atrás da flag
-- ENABLE_DATADRIVEN_INFERENCE). Portanto: ZERO impacto em runtime nesta migration.
--
-- Seed = reprodução EXATA do hardcoded atual (normative-inference.ts:233-333) para paridade:
--   - Construção civil (CNAE 41/42/43/68, regime != SN): 5 universais (0.85) + 4 condicionais (0.55).
--   - Regime imóveis (regime != SN): oport (4120/4110/4121 + subclasses), locação (6810-2/02),
--     risco_art_269_270 (prefix 41).
-- Metadata (tipo/severidade/urgencia/artigo) NÃO é seedada aqui — vem de risk_categories (D-B1-3).
--
-- Refinamento Gate 0 (REGRA-ORQ-23): coluna `nota` adicionada à DB-SPEC (#1675 não previu) —
-- necessária p/ paridade das notas dos condicionais ("aplica-se apenas a...").
-- ═══════════════════════════════════════════════════════════════════════════

-- UP
CREATE TABLE cnae_categoria_map (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  cnae_prefix      VARCHAR(16)  NOT NULL,           -- "41" (prefixo) | "6810-2/01" (subclasse)
  match_mode       ENUM('prefix','exact') NOT NULL DEFAULT 'prefix',
  categoria_codigo VARCHAR(64)  NOT NULL,           -- lógico → risk_categories.codigo
  tipo             ENUM('risk','opportunity') NOT NULL DEFAULT 'risk',
  condicional      TINYINT      NOT NULL DEFAULT 0, -- 1 = risco potencial (confidence menor + nota)
  confidence       DECIMAL(3,2) NOT NULL DEFAULT 0.85,
  nota             TEXT         NULL,               -- caveat dos condicionais (paridade)
  regime_scope     VARCHAR(32)  NULL,               -- NULL=qualquer · 'exceto_simples_nacional'
  vigencia_inicio  DATE NULL,
  vigencia_fim     DATE NULL,
  ativo            TINYINT      NOT NULL DEFAULT 1,
  UNIQUE KEY uq_cnae_cat (cnae_prefix, categoria_codigo)
);

-- Seed — Construção civil: 4 prefixos (41,42,43,68) × 9 categorias = 36 linhas.
INSERT INTO cnae_categoria_map
  (cnae_prefix, match_mode, categoria_codigo, tipo, condicional, confidence, nota, regime_scope)
VALUES
-- Universais (confidence 0.85, sem nota) × {41,42,43,68}
 ('41','prefix','risco_credito_condicionado_obra','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('42','prefix','risco_credito_condicionado_obra','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('43','prefix','risco_credito_condicionado_obra','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('68','prefix','risco_credito_condicionado_obra','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('41','prefix','risco_redutor_ajuste','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('42','prefix','risco_redutor_ajuste','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('43','prefix','risco_redutor_ajuste','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('68','prefix','risco_redutor_ajuste','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('41','prefix','risco_sinter_avaliacao','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('42','prefix','risco_sinter_avaliacao','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('43','prefix','risco_sinter_avaliacao','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('68','prefix','risco_sinter_avaliacao','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('41','prefix','risco_cib_cadastro','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('42','prefix','risco_cib_cadastro','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('43','prefix','risco_cib_cadastro','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('68','prefix','risco_cib_cadastro','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('41','prefix','risco_controle_empreendimento','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('42','prefix','risco_controle_empreendimento','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('43','prefix','risco_controle_empreendimento','risk',0,0.85,NULL,'exceto_simples_nacional'),
 ('68','prefix','risco_controle_empreendimento','risk',0,0.85,NULL,'exceto_simples_nacional'),
-- Condicionais (confidence 0.55, com nota) × {41,42,43,68}
 ('41','prefix','risco_permuta_imoveis','risk',1,0.55,'Risco potencial — aplica-se apenas a quem realiza permuta de imóveis; confirmar na Fase 3b.','exceto_simples_nacional'),
 ('42','prefix','risco_permuta_imoveis','risk',1,0.55,'Risco potencial — aplica-se apenas a quem realiza permuta de imóveis; confirmar na Fase 3b.','exceto_simples_nacional'),
 ('43','prefix','risco_permuta_imoveis','risk',1,0.55,'Risco potencial — aplica-se apenas a quem realiza permuta de imóveis; confirmar na Fase 3b.','exceto_simples_nacional'),
 ('68','prefix','risco_permuta_imoveis','risk',1,0.55,'Risco potencial — aplica-se apenas a quem realiza permuta de imóveis; confirmar na Fase 3b.','exceto_simples_nacional'),
 ('41','prefix','risco_tributacao_parcelas','risk',1,0.55,'Risco potencial — aplica-se apenas a incorporação imobiliária ou parcelamento de solo; confirmar na Fase 3b.','exceto_simples_nacional'),
 ('42','prefix','risco_tributacao_parcelas','risk',1,0.55,'Risco potencial — aplica-se apenas a incorporação imobiliária ou parcelamento de solo; confirmar na Fase 3b.','exceto_simples_nacional'),
 ('43','prefix','risco_tributacao_parcelas','risk',1,0.55,'Risco potencial — aplica-se apenas a incorporação imobiliária ou parcelamento de solo; confirmar na Fase 3b.','exceto_simples_nacional'),
 ('68','prefix','risco_tributacao_parcelas','risk',1,0.55,'Risco potencial — aplica-se apenas a incorporação imobiliária ou parcelamento de solo; confirmar na Fase 3b.','exceto_simples_nacional'),
 ('41','prefix','risco_sujeicao_passiva_scp','risk',1,0.55,'Risco potencial — aplica-se apenas a quem opera via SCP (sociedade em conta de participação); confirmar na Fase 3b.','exceto_simples_nacional'),
 ('42','prefix','risco_sujeicao_passiva_scp','risk',1,0.55,'Risco potencial — aplica-se apenas a quem opera via SCP (sociedade em conta de participação); confirmar na Fase 3b.','exceto_simples_nacional'),
 ('43','prefix','risco_sujeicao_passiva_scp','risk',1,0.55,'Risco potencial — aplica-se apenas a quem opera via SCP (sociedade em conta de participação); confirmar na Fase 3b.','exceto_simples_nacional'),
 ('68','prefix','risco_sujeicao_passiva_scp','risk',1,0.55,'Risco potencial — aplica-se apenas a quem opera via SCP (sociedade em conta de participação); confirmar na Fase 3b.','exceto_simples_nacional'),
 ('41','prefix','risco_custos_historicos','risk',1,0.55,'Risco potencial — aplica-se apenas a quem tinha imóvel ou imóvel em construção antes de 2027; confirmar na Fase 3b.','exceto_simples_nacional'),
 ('42','prefix','risco_custos_historicos','risk',1,0.55,'Risco potencial — aplica-se apenas a quem tinha imóvel ou imóvel em construção antes de 2027; confirmar na Fase 3b.','exceto_simples_nacional'),
 ('43','prefix','risco_custos_historicos','risk',1,0.55,'Risco potencial — aplica-se apenas a quem tinha imóvel ou imóvel em construção antes de 2027; confirmar na Fase 3b.','exceto_simples_nacional'),
 ('68','prefix','risco_custos_historicos','risk',1,0.55,'Risco potencial — aplica-se apenas a quem tinha imóvel ou imóvel em construção antes de 2027; confirmar na Fase 3b.','exceto_simples_nacional');

-- Seed — Regime imóveis (regime != SN).
INSERT INTO cnae_categoria_map
  (cnae_prefix, match_mode, categoria_codigo, tipo, condicional, confidence, nota, regime_scope)
VALUES
-- regime_especifico_imoveis (oportunidade): prefixos 4120/4110/4121 + subclasses exatas
 ('4120','prefix','regime_especifico_imoveis','opportunity',0,0.85,NULL,'exceto_simples_nacional'),
 ('4110','prefix','regime_especifico_imoveis','opportunity',0,0.85,NULL,'exceto_simples_nacional'),
 ('4121','prefix','regime_especifico_imoveis','opportunity',0,0.85,NULL,'exceto_simples_nacional'),
 ('6810-2/01','exact','regime_especifico_imoveis','opportunity',0,0.85,NULL,'exceto_simples_nacional'),
 ('6821-8/01','exact','regime_especifico_imoveis','opportunity',0,0.85,NULL,'exceto_simples_nacional'),
-- regime_especifico_imoveis_locacao (oportunidade): subclasse 6810-2/02
 ('6810-2/02','exact','regime_especifico_imoveis_locacao','opportunity',0,0.85,NULL,'exceto_simples_nacional'),
-- risco_art_269_270 (risco): prefix 41
 ('41','prefix','risco_art_269_270','risk',0,0.85,NULL,'exceto_simples_nacional');

-- DOWN
-- DROP TABLE cnae_categoria_map;

-- DoD Fase 1 (Manus, produção): tabela criada + 43 linhas seedadas.
--   SELECT COUNT(*) FROM cnae_categoria_map;                          -- esperado: 43
--   SELECT COUNT(*) FROM cnae_categoria_map WHERE condicional=1;      -- esperado: 16 (4 cats × 4 prefixos)
--   SELECT COUNT(DISTINCT categoria_codigo) FROM cnae_categoria_map;  -- esperado: 12 (9 construção + 3 regime)
