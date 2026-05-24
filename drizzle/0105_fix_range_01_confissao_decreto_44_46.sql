-- migration: 0105_fix_range_01_confissao_decreto_44_46.sql
-- (nº 0105 — 0104 já em main / FEAT-SCOPE-01 #1187)
-- Issue: #1191 (BUG-RANGE-01) · Auditoria Manus v3.0 Projeto 1620001
-- Migração de DADOS PURA — não toca enrichArticle/engine/briefing.
--
-- Fix cirúrgico: o bundle de confissao_automatica tinha artigos_decreto =
-- ["Art. 44","Art. 46","Art. 112"] (FIX-NORM-02 / migration 0103, #1182).
-- O formatArticleRange renderiza min-max → "Arts. 44-112" (range de 68 artigos).
-- Art. 112 Decreto = "emissão de documento fiscal" (ref. Art. 60 LC 214) = OBRIGAÇÃO
-- ACESSÓRIA, NÃO confissão. Evidência: Auditoria Manus v3.0 Projeto 1620001 (linha 55).
-- Correto: ["Art. 44","Art. 46"] → render "Arts. 44-46 Decreto 12.955/2026".
-- Idempotente (guard JSON_CONTAINS Art. 112). Reversível (DOWN abaixo).

UPDATE risk_categories
SET normative_bundle = JSON_SET(
  normative_bundle,
  '$.artigos_decreto', JSON_ARRAY('Art. 44', 'Art. 46')
)
WHERE codigo = 'confissao_automatica'
  AND JSON_CONTAINS(normative_bundle, '"Art. 112"', '$.artigos_decreto'); -- guard idempotência

-- ROLLBACK (DOWN) — Reversível:
-- UPDATE risk_categories
-- SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_decreto', JSON_ARRAY('Art. 44', 'Art. 46', 'Art. 112'))
-- WHERE codigo = 'confissao_automatica';
