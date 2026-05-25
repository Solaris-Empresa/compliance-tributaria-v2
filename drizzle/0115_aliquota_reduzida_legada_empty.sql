-- Migration 0115 — BUG-1 #1244: esvaziar artigos_cgibs6 da categoria legada aliquota_reduzida
-- Sintoma: aliquota_reduzida (universal, sem cnae_codes) injetava Art. 202-218 para TODOS os CNAEs.
-- Decisão P.O. 25/05/2026: esvaziar + marcar deprecated (substituída pelas granulares reduzida_30/60, mig 0112).
-- Ref: issue #1244 · GROUNDING-SMOKE-V3 (N1/N2) · REGRA-ORQ-32
-- Filename sem "cnae"/"rag" (REGRA-ORQ-FILENAME-01 / Lição #92). DML only · idempotente (JSON_SET).
-- Gate 0 (correção da spec): legacy_reason como string LIMPA — o '"..."' do despacho geraria
--   string JSON duplo-quotada no MySQL JSON_SET ("\"substituida...\""). JSON_SET auto-aspeia.

UPDATE risk_categories
SET normative_bundle = JSON_SET(
  normative_bundle,
  '$.artigos_cgibs6', JSON_ARRAY(),
  '$.legacy_deprecated', CAST('true' AS JSON),
  '$.legacy_reason', 'substituida_por_reduzida_30_e_reduzida_60_mig_0112'
)
WHERE codigo = 'aliquota_reduzida';

-- DoD verification
SELECT
  codigo,
  JSON_EXTRACT(normative_bundle, '$.artigos_cgibs6')     AS artigos_cgibs6,
  JSON_LENGTH(JSON_EXTRACT(normative_bundle, '$.artigos_cgibs6')) AS qtd_cgibs6,
  JSON_EXTRACT(normative_bundle, '$.legacy_deprecated')  AS deprecated,
  JSON_EXTRACT(normative_bundle, '$.legacy_reason')      AS reason
FROM risk_categories
WHERE codigo = 'aliquota_reduzida';
-- Esperado: artigos_cgibs6 = [] · qtd_cgibs6 = 0 · deprecated = true · reason = "substituida_por_..."

-- DOWN (rollback): restaurar artigos_cgibs6 = [Art. 202..218] + remover flags legacy.
--   UPDATE risk_categories SET normative_bundle = JSON_REMOVE(
--     JSON_SET(normative_bundle, '$.artigos_cgibs6', JSON_ARRAY('Art. 202', ... ,'Art. 218')),
--     '$.legacy_deprecated', '$.legacy_reason')
--   WHERE codigo = 'aliquota_reduzida';
