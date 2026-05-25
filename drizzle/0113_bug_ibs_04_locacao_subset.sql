-- migration: 0113_bug_ibs_04_locacao_subset.sql
-- Issue: FASE 4 / PR #1215 (25/05/2026) — refina regime_especifico_imoveis_locacao
-- para o SUBSET de 8 artigos curados pelo jurídico (operações de locação/cessão/arrendamento
-- de bem imóvel), em vez do range provisório do 0108.
--
-- Os 8 (verificados no corpus — Lição #61): 360 (operações imóveis), 361 (locação/cessão/
-- arrendamento residencial), 363 (fato gerador), 364 (base de cálculo), 377 (locação residencial),
-- 378 (redutor social), 379 (redução de alíquota), 382 (pessoa física contribuinte).
--
-- GATE 0: artigos_cgibs6 é CHAVE JSON do normative_bundle → JSON_SET; strings 'Art. NNN'
-- (deterministic-grounding faz inArray(ragDocuments.artigo, ...) — números não casariam).

UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_cgibs6',
      JSON_ARRAY('Art. 360','Art. 361','Art. 363','Art. 364','Art. 377','Art. 378','Art. 379','Art. 382')),
    normative_status = 'confirmed'
WHERE codigo = 'regime_especifico_imoveis_locacao';

-- ════════════════════════════════════════════════════════════════════════════════
-- DOWN (rollback — restaura o conjunto do 0108 / BUG-IBS-01 Fase 3):
--   UPDATE risk_categories
--   SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_cgibs6',
--         JSON_ARRAY('Art. 359','Art. 360','Art. 379','Art. 380','Art. 381','Art. 382',
--                    'Art. 383','Art. 384','Art. 385','Art. 386','Art. 387','Art. 388','Art. 389','Art. 390'))
--   WHERE codigo = 'regime_especifico_imoveis_locacao';
-- ════════════════════════════════════════════════════════════════════════════════
