-- migration: 0112_bug_ibs_fase4_6cats.sql
-- Issue: FASE 4 / Passo 4 (25/05/2026) — 6 categorias NOVAS regime_diferenciado (Título V), Opção B.
-- Nº 0112 (despacho dizia 0113 — colide com locação/#1213; Lição #91#5).
--
-- Grounding-only (não no engine). Gate CNAE+vigência (Passo 2 / #1214). cnae_codes = mapeamento
-- operacional (P.O. 25/05). reduzida_60 e aliquota_zero = SEM cnae_codes (NCM/NBS-driven, transversais
-- → universais no gate). produtor_rural: Opção B (2 cats — vigência por categoria).
-- Citações (Lição #61): 200=regimes diferenciados gerais (Art.126 LC); 202=30% profissionais (Art.127);
-- 219=alíquota zero; 233=isenção transporte público coletivo; 238=produtor rural defs.
-- artigos_cgibs6 = strings 'Art. NNN'. Idempotente (WHERE NOT EXISTS). Bundle = JSON_OBJECT.

-- 1. regime_diferenciado_aliquota_reduzida_30 (200-202) — confirmed
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_status, normative_bundle)
SELECT 'regime_diferenciado_aliquota_reduzida_30', 'Regime Diferenciado — Alíquota Reduzida 30%',
  'oportunidade', 'curto_prazo', 'opportunity', 'Art. 200', 'LC-214-2025',
  '2026-04-30', NULL, 'ativo', 'lei_federal', 'nacional', 'confirmed',
  JSON_OBJECT('tema','regime_diferenciado_aliquota_reduzida_30',
    'artigos_cgibs6', JSON_ARRAY('Art. 200','Art. 201','Art. 202'),
    'cnae_codes', JSON_ARRAY('6911-7','7111-1','7112-0','8621-6','8630-5','8640-2','8650-0','8660-7'))
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'regime_diferenciado_aliquota_reduzida_30');

-- 2. regime_diferenciado_aliquota_reduzida_60 (200-201, 203-218) — confirmed, SEM cnae_codes (transversal)
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_status, normative_bundle)
SELECT 'regime_diferenciado_aliquota_reduzida_60', 'Regime Diferenciado — Alíquota Reduzida 60%',
  'oportunidade', 'curto_prazo', 'opportunity', 'Art. 203', 'LC-214-2025',
  '2026-04-30', NULL, 'ativo', 'lei_federal', 'nacional', 'confirmed',
  JSON_OBJECT('tema','regime_diferenciado_aliquota_reduzida_60',
    'artigos_cgibs6', JSON_ARRAY('Art. 200','Art. 201','Art. 203','Art. 204','Art. 205','Art. 206','Art. 207','Art. 208','Art. 209','Art. 210','Art. 211','Art. 212','Art. 213','Art. 214','Art. 215','Art. 216','Art. 217','Art. 218'))
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'regime_diferenciado_aliquota_reduzida_60');

-- 3. regime_diferenciado_aliquota_zero (200-201, 219-232) — confirmed, SEM cnae_codes (transversal)
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_status, normative_bundle)
SELECT 'regime_diferenciado_aliquota_zero', 'Regime Diferenciado — Alíquota Zero',
  'oportunidade', 'curto_prazo', 'opportunity', 'Art. 219', 'LC-214-2025',
  '2026-04-30', NULL, 'ativo', 'lei_federal', 'nacional', 'confirmed',
  JSON_OBJECT('tema','regime_diferenciado_aliquota_zero',
    'artigos_cgibs6', JSON_ARRAY('Art. 200','Art. 201','Art. 219','Art. 220','Art. 221','Art. 222','Art. 223','Art. 224','Art. 225','Art. 226','Art. 227','Art. 228','Art. 229','Art. 230','Art. 231','Art. 232'))
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'regime_diferenciado_aliquota_zero');

-- 4. regime_diferenciado_transporte (200-201, 233) — confirmed
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_status, normative_bundle)
SELECT 'regime_diferenciado_transporte', 'Regime Diferenciado — Transporte',
  'oportunidade', 'curto_prazo', 'opportunity', 'Art. 233', 'LC-214-2025',
  '2026-04-30', NULL, 'ativo', 'lei_federal', 'nacional', 'confirmed',
  JSON_OBJECT('tema','regime_diferenciado_transporte',
    'artigos_cgibs6', JSON_ARRAY('Art. 200','Art. 201','Art. 233'),
    'cnae_codes', JSON_ARRAY('4921-3','4922-1','4923-0','4929-9','4912-4','4911-6'))
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'regime_diferenciado_transporte');

-- 5. regime_diferenciado_produtor_rural (238-244) — confirmed (Opção B: vigente hoje)
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_status, normative_bundle)
SELECT 'regime_diferenciado_produtor_rural', 'Regime Diferenciado — Produtor Rural',
  'oportunidade', 'curto_prazo', 'opportunity', 'Art. 238', 'LC-214-2025',
  '2026-04-30', NULL, 'ativo', 'lei_federal', 'nacional', 'confirmed',
  JSON_OBJECT('tema','regime_diferenciado_produtor_rural',
    'artigos_cgibs6', JSON_ARRAY('Art. 238','Art. 239','Art. 240','Art. 241','Art. 242','Art. 243','Art. 244'),
    'cnae_codes', JSON_ARRAY('0111-3','0112-1','0115-6','0119-9','0121-1','0122-9','0131-8','0132-6'))
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'regime_diferenciado_produtor_rural');

-- 6. regime_diferenciado_produtor_rural_credito (245-250) — pending_vigency 2027-01-01 (Opção B)
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_status, normative_bundle)
SELECT 'regime_diferenciado_produtor_rural_credito', 'Regime Diferenciado — Produtor Rural (Crédito Presumido)',
  'oportunidade', 'curto_prazo', 'opportunity', 'Art. 245', 'LC-214-2025',
  '2027-01-01', NULL, 'ativo', 'lei_federal', 'nacional', 'pending_vigency',
  JSON_OBJECT('tema','regime_diferenciado_produtor_rural_credito',
    'artigos_cgibs6', JSON_ARRAY('Art. 245','Art. 246','Art. 247','Art. 248','Art. 249','Art. 250'),
    'cnae_codes', JSON_ARRAY('0111-3','0112-1','0115-6','0119-9','0121-1','0122-9','0131-8','0132-6'))
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'regime_diferenciado_produtor_rural_credito');

-- ════════════════════════════════════════════════════════════════════════════════
-- DOWN: DELETE FROM risk_categories WHERE codigo IN
--   ('regime_diferenciado_aliquota_reduzida_30','regime_diferenciado_aliquota_reduzida_60',
--    'regime_diferenciado_aliquota_zero','regime_diferenciado_transporte',
--    'regime_diferenciado_produtor_rural','regime_diferenciado_produtor_rural_credito');
-- ════════════════════════════════════════════════════════════════════════════════
