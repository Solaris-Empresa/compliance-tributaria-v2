-- migration: 0103_fix_norm_02_confissao_automatica_bundle.sql
-- (nº 0103 — 0102 já em main / FIX-NORM-01 #1181)
-- Issue: #1175 (FIX-NORM-02) · Caminho B1 (decisão P.O. 24/05)
-- Migração de DADOS PURA — não toca enrichArticle/engine/briefing.
-- Idempotente (guard WHERE normative_status='pending_document'). Reversível (DOWN abaixo).
--
-- Caminho B1 (article-level, funcional hoje):
--   artigos_decreto: ["Art. 44","Art. 46","Art. 112"] — verificados no corpus Decreto
--     (casam no deterministic-grounding inArray; renderizam "Arts. 44-112" no enrichArticle)
--   artigos_cgibs6: [] — números corretos da CGIBS 6 ainda não curados (vazio = honesto, não quebra)
--     → curadoria = FIX-NORM-02-CGIBS (gate jurídico)
--   artigos_lc214: mantém § (documentação — não é fetchado nem renderizado)
--   §-precisão (§4º/§2º/caput) em decreto/cgibs6 = diferida p/ ENG-RENDER-01 (render discreto + §)

UPDATE risk_categories
SET
  normative_bundle = JSON_OBJECT(
    'tema', 'Confissão automática de débito IBS/CBS — constituição do crédito tributário por declaração do contribuinte',
    'artigos_lc214', JSON_ARRAY(
      'Art. 45 caput', 'Art. 45 §4º', 'Art. 45 §5º',
      'Art. 46 caput', 'Art. 46 §3º', 'Art. 46 §4º', 'Art. 46 §5º'
    ),
    'artigos_decreto', JSON_ARRAY(
      'Art. 44', 'Art. 46', 'Art. 112'
    ),
    'artigos_cgibs6', JSON_ARRAY()
  ),
  normative_status = 'confirmed'
WHERE codigo = 'confissao_automatica'
  AND artigo_base = 'Art. 45 LC 214/2025'
  AND normative_status = 'pending_document'; -- guard idempotência

-- ROLLBACK (DOWN):
-- UPDATE risk_categories
-- SET normative_bundle = NULL, normative_status = 'pending_document'
-- WHERE codigo = 'confissao_automatica' AND artigo_base = 'Art. 45 LC 214/2025';
