-- migration: 0109_bug_ibs_03_portaria7.sql
-- Issue: BUG-IBS-03 (25/05/2026) — Portaria MF/CGIBS 7/2026 (harmonização CBS↔IBS) nos bundles.
--
-- A Portaria 7 é a "ponte" entre CBS (Decreto 12.955) e IBS (Resolução CGIBS 6) — 4ª camada
-- normativa (Lição #88 da auditoria). Adiciona a chave NOVA `artigos_portaria7` ao
-- normative_bundle das 3 categorias de fluxo unificado IBS/CBS. Corpus tem Portaria Art. 1 + 2
-- (lei='portaria_mf_cgibs_7', 2 chunks) — citamos Art. 1.
--
-- Idempotente (JSON_SET sobrescreve só a chave artigos_portaria7, preserva tema/lc214/decreto/cgibs6).
-- Consumido por: enrichArticle (citação) + deterministic-grounding ([FONTE: Portaria MF/CGIBS 7]).

UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_portaria7', JSON_ARRAY('Art. 1'))
WHERE codigo = 'split_payment';

UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_portaria7', JSON_ARRAY('Art. 1'))
WHERE codigo = 'confissao_automatica';

UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_portaria7', JSON_ARRAY('Art. 1'))
WHERE codigo = 'obrigacao_acessoria';

-- ════════════════════════════════════════════════════════════════════════════════
-- DOWN (rollback — remove a chave artigos_portaria7, voltando ao estado NULL/ausente):
--   UPDATE risk_categories
--   SET normative_bundle = JSON_REMOVE(normative_bundle, '$.artigos_portaria7')
--   WHERE codigo IN ('split_payment','confissao_automatica','obrigacao_acessoria');
-- ════════════════════════════════════════════════════════════════════════════════
