-- migration: 0102_fix_norm_01_artigo_base_bundles.sql
-- (nº 0102 — 0101 já em uso por 0101_normative_bundle_per_lei.sql / #1156)
-- Gate Zero: DESBLOQUEADO em 2026-05-24
-- Decisor: P.O. (Uires Tapajós)
-- Método: subsunção textual direta (LC 214/2025 + Decreto 12.955 + Res. CGIBS 6)
-- Issues: #1174 (FIX-NORM-01)
-- Migração de dados PURA — não toca engine/código. Reversível. Testado em ambiente isolado.
-- Idempotente: cada UPDATE usa guard WHERE artigo_base = '<valor_atual>'.

-- 1. inscricao_cadastral
-- ANTES: Art. 164 (produtor rural) — INCORRETO
-- DEPOIS: Art. 59 (cadastro com identificação única) — CONFIRMADO
UPDATE risk_categories
SET artigo_base = 'Art. 59 LC 214/2025',
    normative_bundle = JSON_SET(normative_bundle,
      '$.tema', 'Cadastro com identificação única — CPF/CNPJ/CIB',
      '$.artigos_lc214', JSON_ARRAY('Art. 59', 'Art. 59 §1º-§5º'),
      '$.artigos_decreto', JSON_ARRAY('Art. 104', 'Art. 105', 'Art. 106', 'Art. 109', 'Art. 110'),
      '$.artigos_cgibs6', JSON_ARRAY('Art. 104', 'Art. 105', 'Art. 106', 'Art. 109', 'Art. 110')
    )
WHERE codigo = 'inscricao_cadastral'
  AND artigo_base = 'Art. 164 LC 214/2025'; -- guard idempotência

-- 2. obrigacao_acessoria
-- ANTES: Art. 102 (ZPE) — INCORRETO
-- DEPOIS: Art. 60 (documento fiscal eletrônico) — CONFIRMADO
-- ACHADO GATE ZERO: artigos_cgibs6 corrigidos de 575-581 (fiscalização) → 104-114 (obrigações acessórias)
UPDATE risk_categories
SET artigo_base = 'Art. 60 LC 214/2025',
    normative_bundle = JSON_SET(normative_bundle,
      '$.tema', 'Obrigações acessórias — documento fiscal eletrônico, escrituração e DTE',
      '$.artigos_lc214', JSON_ARRAY('Art. 60', 'Art. 60 §1º-§3º'),
      '$.artigos_decreto', JSON_ARRAY('Art. 112', 'Art. 113', 'Art. 114', 'Art. 115'),
      '$.artigos_cgibs6', JSON_ARRAY('Art. 104', 'Art. 105', 'Art. 112', 'Art. 113', 'Art. 114')
    )
WHERE codigo = 'obrigacao_acessoria'
  AND artigo_base = 'Art. 102 LC 214/2025'; -- guard idempotência

-- 3. regime_diferenciado
-- ANTES: Art. 229 (criptoativos) — INCORRETO
-- DEPOIS: Art. 126 (abertura Título IV — regimes diferenciados genéricos) — CONFIRMADO
-- DECISÃO P.O. Opção C: categoria genérica mantida; regime imóveis = nova categoria (#1176)
UPDATE risk_categories
SET artigo_base = 'Art. 126 LC 214/2025',
    normative_bundle = JSON_SET(normative_bundle,
      '$.tema', 'Regimes diferenciados — alíquotas reduzidas e créditos presumidos',
      '$.artigos_lc214', JSON_ARRAY('Art. 126', 'Art. 127', 'Art. 128', 'Art. 168'),
      '$.artigos_decreto', JSON_ARRAY('Art. 200', 'Art. 201', 'Art. 203', 'Art. 245'),
      '$.artigos_cgibs6', JSON_ARRAY()
    )
WHERE codigo = 'regime_diferenciado'
  AND artigo_base = 'Art. 229 LC 214/2025'; -- guard idempotência

-- 4. transicao_iss_ibs
-- ANTES: Arts. 6-12 (normas gerais de incidência) — INCORRETO; bundle NULL
-- DEPOIS: Art. 342 (abertura Título VIII — transição) — CONFIRMADO; bundle populado
-- DECISÃO P.O. Opção A: artigo singular + bundle completo
UPDATE risk_categories
SET artigo_base = 'Art. 342 LC 214/2025',
    normative_status = 'confirmed',
    normative_bundle = JSON_OBJECT(
      'tema', 'Transição ISS/ICMS → IBS — cronograma 2026-2035',
      'artigos_lc214', JSON_ARRAY('Art. 342', 'Art. 343', 'Art. 344', 'Arts. 361-369', 'Art. 501', 'Art. 508'),
      'artigos_decreto', JSON_ARRAY(),
      'artigos_cgibs6', JSON_ARRAY('Art. 596', 'Art. 597', 'Art. 598')
    )
WHERE codigo = 'transicao_iss_ibs'
  AND artigo_base = 'Arts. 6-12 LC 214/2025'; -- guard idempotência

-- ROLLBACK (DOWN) — restaurar valores anteriores por categoria:
--   inscricao_cadastral: artigo_base='Art. 164 LC 214/2025'
--   obrigacao_acessoria: artigo_base='Art. 102 LC 214/2025'
--   regime_diferenciado: artigo_base='Art. 229 LC 214/2025'
--   transicao_iss_ibs:   artigo_base='Arts. 6-12 LC 214/2025', normative_status='pending_document', normative_bundle=NULL
