-- migration: 0108_bug_ibs_01_fase3_cgibs6_bundles.sql
-- Issue: BUG-IBS-01 Fase 3 (24-25/05/2026) · curadoria jurídica CGIBS 6 (Lição #61 — RACI)
-- Codifica em migration reproduzível o UPDATE dos `artigos_cgibs6` que o Manus aplicou
-- ad-hoc em produção (Fase 3). SEM esta migration, db:reset/DB novo reverteria aos valores
-- antigos de 0101/0102/0103/0107 (drift) — ver crítica 25/05.
--
-- Valores ESPELHADOS do prod (SELECT JSON_EXTRACT(normative_bundle,'$.artigos_cgibs6') —
-- Manus 25/05, REGRA-ORQ-37). Idempotente (JSON_SET sobrescreve só a chave artigos_cgibs6,
-- preservando tema/artigos_lc214/artigos_decreto). Shape flat — compatível com enrichArticle
-- (risk-engine-v4.ts:407 lê bundle.artigos_cgibs6; só cita p/ regime != simples_nacional).
--
-- Categorias SEM cgibs6 (decisão jurídica documentada — NÃO atualizadas aqui):
--   imposto_seletivo            → NULL (IS é Livro II LC / federal-CBS, não operacionalizado pelo IBS/CGIBS)
--   aliquota_reduzida           → [] (not_covered_materially — aguarda curadoria artigo-a-artigo)
--   regime_diferenciado         → [] (split_required — aguarda split por subtipo: combustíveis/financeiro/imóveis/cooperativas/alimentação)

-- split_payment — Art. 28-37 (operacional, Art. 31-34 LC) + Art. 593-595 (penalidades Livro II)
UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_cgibs6',
  JSON_ARRAY('Art. 28','Art. 29','Art. 30','Art. 31','Art. 32','Art. 33','Art. 34','Art. 35','Art. 36','Art. 37','Art. 593','Art. 594','Art. 595'))
WHERE codigo = 'split_payment';

-- confissao_automatica — Art. 44-46 (apuração do saldo + apuração assistida, Art. 45-46 LC)
UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_cgibs6',
  JSON_ARRAY('Art. 44','Art. 45','Art. 46'))
WHERE codigo = 'confissao_automatica';

-- inscricao_cadastral — Art. 104-110 (cadastro com identificação única, Art. 59 LC)
UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_cgibs6',
  JSON_ARRAY('Art. 104','Art. 105','Art. 106','Art. 107','Art. 108','Art. 109','Art. 110'))
WHERE codigo = 'inscricao_cadastral';

-- obrigacao_acessoria — Art. 112-115 (doc fiscal eletrônico) + Art. 575-581 (DTE + REF fiscalização)
UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_cgibs6',
  JSON_ARRAY('Art. 112','Art. 113','Art. 114','Art. 115','Art. 575','Art. 576','Art. 577','Art. 578','Art. 579','Art. 580','Art. 581'))
WHERE codigo = 'obrigacao_acessoria';

-- credito_presumido — Art. 483-484 (resíduos/bem usado) + Art. 515,518,520,521,523 (ZFM — Art. 523 cita 515/518/520/521)
UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_cgibs6',
  JSON_ARRAY('Art. 483','Art. 484','Art. 515','Art. 518','Art. 520','Art. 521','Art. 523'))
WHERE codigo = 'credito_presumido';

-- regime_especifico_imoveis — Art. 359-390 (regime de bens imóveis; exclui 391-395 cooperativas e 396 alimentação)
UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_cgibs6',
  JSON_ARRAY('Art. 359','Art. 360','Art. 361','Art. 362','Art. 363','Art. 364','Art. 365','Art. 366','Art. 367','Art. 368','Art. 369','Art. 370','Art. 371','Art. 372','Art. 373','Art. 374','Art. 375','Art. 376','Art. 377','Art. 378','Art. 379','Art. 380','Art. 381','Art. 382','Art. 383','Art. 384','Art. 385','Art. 386','Art. 387','Art. 388','Art. 389','Art. 390'))
WHERE codigo = 'regime_especifico_imoveis';

-- regime_especifico_imoveis_locacao — subset locação (359-360 + 379-390)
UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_cgibs6',
  JSON_ARRAY('Art. 359','Art. 360','Art. 379','Art. 380','Art. 381','Art. 382','Art. 383','Art. 384','Art. 385','Art. 386','Art. 387','Art. 388','Art. 389','Art. 390'))
WHERE codigo = 'regime_especifico_imoveis_locacao';

-- risco_art_269_270 — Art. 389 (cadastro de obra/CIB, Art. 269 LC) + Art. 390 (apuração por empreendimento, Art. 270 LC)
UPDATE risk_categories
SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_cgibs6',
  JSON_ARRAY('Art. 389','Art. 390'))
WHERE codigo = 'risco_art_269_270';

-- ════════════════════════════════════════════════════════════════════════════════
-- DOWN (rollback — restaura os valores artigos_cgibs6 de pré-Fase 3 / 0101-0107):
--   split_payment            → ['Art. 593','Art. 594','Art. 595']        (0101)
--   confissao_automatica     → []                                        (0103)
--   inscricao_cadastral      → ['Art. 104','Art. 105','Art. 106','Art. 109','Art. 110'] (0102)
--   obrigacao_acessoria      → ['Art. 104','Art. 105','Art. 112','Art. 113','Art. 114'] (0102)
--   credito_presumido        → []                                        (0101)
--   regime_especifico_imoveis / _locacao / risco_art_269_270 → []        (0107)
-- (UPDATE ... JSON_SET(normative_bundle,'$.artigos_cgibs6', JSON_ARRAY(...)) por codigo.)
-- ════════════════════════════════════════════════════════════════════════════════
