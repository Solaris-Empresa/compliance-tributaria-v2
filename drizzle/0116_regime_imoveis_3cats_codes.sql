-- Migration 0116 — BUG-3 #1245: gate CNAE para as 3 categorias imobiliárias universais
-- Sintoma: regime_especifico_imoveis (359-390), _locacao (8 arts) e risco_art_269_270 (389,390)
--   foram criadas no 0107 SEM cnae_codes → universais → injetadas p/ TODOS os CNAEs não-SN.
-- Decisão P.O. 25/05/2026: gatear as 3 com cnae_codes por categoria (listas jurídicas).
-- Ref: issue #1245 · GROUNDING-SMOKE-V3 · REGRA-ORQ-32 · Lição #74 (fix completo das 3, não só 1)
-- Filename sem "cnae"/"rag" (REGRA-ORQ-FILENAME-01 / Lição #92). DML only · idempotente (JSON_SET).

-- 1. regime_especifico_imoveis — construção + imobiliário geral
UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle,
  '$.cnae_codes', JSON_ARRAY('4120-4','4110-7','6810-2','6822-6')
)
WHERE codigo = 'regime_especifico_imoveis';

-- 2. regime_especifico_imoveis_locacao — locação imobiliária
UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle,
  '$.cnae_codes', JSON_ARRAY('6810-2','6821-8','6822-6')
)
WHERE codigo = 'regime_especifico_imoveis_locacao';

-- 3. risco_art_269_270 — obra/construção (LC 269/270 cadastro)
UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle,
  '$.cnae_codes', JSON_ARRAY('4120-4','4110-7','4211-1','4213-8')
)
WHERE codigo = 'risco_art_269_270';

-- DoD verification
SELECT codigo,
  JSON_EXTRACT(normative_bundle, '$.cnae_codes') AS cnae_codes,
  JSON_LENGTH(JSON_EXTRACT(normative_bundle, '$.cnae_codes')) AS qtd
FROM risk_categories
WHERE codigo IN ('regime_especifico_imoveis','regime_especifico_imoveis_locacao','risco_art_269_270')
ORDER BY codigo;
-- Esperado:
--   regime_especifico_imoveis            -> ["4120-4","4110-7","6810-2","6822-6"] · 4
--   regime_especifico_imoveis_locacao    -> ["6810-2","6821-8","6822-6"] · 3
--   risco_art_269_270                    -> ["4120-4","4110-7","4211-1","4213-8"] · 4

-- DOWN (rollback): remover cnae_codes das 3 (volta a universal — reintroduz BUG-3).
--   UPDATE risk_categories SET normative_bundle = JSON_REMOVE(normative_bundle, '$.cnae_codes')
--   WHERE codigo IN ('regime_especifico_imoveis','regime_especifico_imoveis_locacao','risco_art_269_270');
