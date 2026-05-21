-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0101 — normative_bundle por-lei (artigos_decreto + artigos_cgibs6)
--
-- Issue: BUG-FONTES Frente B — injeção determinística (decisão P.O. 21/05/2026)
-- Ref: causa raiz confirmada (79% chunks Decreto têm cnaeGroups="" + query
--      domain-specific → 2º passe retrieval retorna ~0 em produção).
--
-- CONTEXTO:
--   Para citar Decreto 12.955 / CGIBS 6 de forma confiável, o briefing injeta
--   esses artigos DETERMINISTICAMENTE (helper fetchDeterministicGrounding,
--   padrão Frente C). Isso exige o normative_bundle estruturado por-lei.
--
-- ADITIVO (JSON_SET): adiciona apenas as chaves artigos_decreto + artigos_cgibs6.
--   Preserva artigos_lc214 + tema existentes (shape OBJETO confirmado — audit Q1
--   Manus 21/05). Artigos com prefixo "Art. N" para match direto com
--   ragDocuments.artigo (que usa "Art. N").
--
-- ESCOPO: só split_payment + credito_presumido (genérico — Opção A da A2).
--   NÃO cria credito_presumido_tac (inexistente — Lição #88, acoplamento
--   SEVERITY_TABLE). NÃO toca blocked / pending_legal_review.
--
-- Se o DoD pós-deploy mostrar artigos_decreto ausente, o shape não era objeto
-- (A2 #1148 flat-array aplicada) → re-rodar com migração de coerção.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE risk_categories
SET normative_bundle = JSON_SET(
  normative_bundle,
  '$.artigos_decreto', JSON_ARRAY('Art. 28','Art. 29','Art. 30','Art. 31','Art. 32','Art. 33','Art. 34','Art. 35','Art. 36','Art. 37'),
  '$.artigos_cgibs6', JSON_ARRAY('Art. 593','Art. 594','Art. 595')
)
WHERE codigo = 'split_payment' AND normative_status = 'confirmed';

UPDATE risk_categories
SET normative_bundle = JSON_SET(
  normative_bundle,
  '$.artigos_decreto', JSON_ARRAY('Art. 245','Art. 246','Art. 247','Art. 248','Art. 249','Art. 250','Art. 251','Art. 252','Art. 253','Art. 254','Art. 255','Art. 256','Art. 257','Art. 258'),
  '$.artigos_cgibs6', JSON_ARRAY()
)
WHERE codigo = 'credito_presumido' AND normative_status = 'confirmed';
