-- migration: 0111_bug_ibs_fase4_3cats.sql
-- Issue: FASE 4 / Passo 3 (25/05/2026) — 3 categorias NOVAS grounding-only (gate CNAE+vigência).
-- Nº 0111 (não 0112 do despacho — 0113 já é a locação / PR #1213; Lição #91#5 colisão).
--
-- Categorias grounding-only: NÃO entram no engine (SEVERITY_TABLE/Categoria union) — só no
-- deterministic-grounding, filtradas por cnae_codes + vigencia_inicio (gate FASE 4 Passo 2).
-- severidade/urgencia/tipo são NOT NULL (preenchidos como oportunidade — benefícios), mas NÃO
-- consumidos pela matriz (cats não geram risco). cnae_codes = mapeamento operacional (P.O. 25/05).
-- Citações verificadas (Lição #61): 234=reabilitação urbana 60% (Art.158 LC); 256=reciclagem
-- (Art.170 LC); 258=bens usados revenda (Art.171 LC).
--
-- Vigência diferida: reciclagem/bens_usados = 2027-01-01 + normative_status='pending_vigency'
-- (deterministic-grounding só injeta 'confirmed' → não aparecem até flip em 2027).
-- Idempotente (WHERE NOT EXISTS). Shape bundle: JSON_OBJECT (tema/artigos_cgibs6/cnae_codes).

-- 1. regime_diferenciado_reabilitacao_urbana (Arts. 234-237) — confirmed
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_status, normative_bundle)
SELECT
  'regime_diferenciado_reabilitacao_urbana', 'Regime Diferenciado — Reabilitação Urbana',
  'oportunidade', 'curto_prazo', 'opportunity', 'Art. 234', 'LC-214-2025',
  '2026-04-30', NULL, 'ativo', 'lei_federal', 'nacional', 'confirmed',
  JSON_OBJECT('tema','regime_diferenciado_reabilitacao_urbana',
    'artigos_cgibs6', JSON_ARRAY('Art. 234','Art. 235','Art. 236','Art. 237'),
    'cnae_codes', JSON_ARRAY('4120-4','4110-7','4211-1','4213-8'))
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'regime_diferenciado_reabilitacao_urbana');

-- 2. credito_presumido_reciclagem (Arts. 256-257) — pending_vigency 2027-01-01
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_status, normative_bundle)
SELECT
  'credito_presumido_reciclagem', 'Crédito Presumido — Reciclagem',
  'oportunidade', 'curto_prazo', 'opportunity', 'Art. 256', 'LC-214-2025',
  '2027-01-01', NULL, 'ativo', 'lei_federal', 'nacional', 'pending_vigency',
  JSON_OBJECT('tema','credito_presumido_reciclagem',
    'artigos_cgibs6', JSON_ARRAY('Art. 256','Art. 257'),
    'cnae_codes', JSON_ARRAY('3811-4','3812-2','3821-1','3822-0','3839-4','3900-5'))
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'credito_presumido_reciclagem');

-- 3. credito_presumido_bens_usados (Art. 258) — pending_vigency 2027-01-01
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_status, normative_bundle)
SELECT
  'credito_presumido_bens_usados', 'Crédito Presumido — Bens Usados',
  'oportunidade', 'curto_prazo', 'opportunity', 'Art. 258', 'LC-214-2025',
  '2027-01-01', NULL, 'ativo', 'lei_federal', 'nacional', 'pending_vigency',
  JSON_OBJECT('tema','credito_presumido_bens_usados',
    'artigos_cgibs6', JSON_ARRAY('Art. 258'),
    'cnae_codes', JSON_ARRAY('4511-1','4512-9','4785-7','4789-0'))
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'credito_presumido_bens_usados');

-- ════════════════════════════════════════════════════════════════════════════════
-- DOWN: DELETE FROM risk_categories WHERE codigo IN
--   ('regime_diferenciado_reabilitacao_urbana','credito_presumido_reciclagem','credito_presumido_bens_usados');
-- ════════════════════════════════════════════════════════════════════════════════
