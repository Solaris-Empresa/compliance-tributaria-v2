-- migration: 0110_corr_01_aliquota_reduzida_artigos.sql
-- Issue: CORR-01 (P1, 25/05/2026) — aliquota_reduzida sai de "not_covered_materially".
-- Curadoria jurídica: CGIBS 6 Art. 202-218 operacionalizam as alíquotas reduzidas do IBS
-- (Art. 202 = 30% profissionais liberais / Art. 127 LC; Arts. 203/210/218 = 60% / Arts. 128-142 LC).
-- 17 artigos (202..218).
--
-- GATE 0 — correção da estrutura do SQL do despacho (NUNCA ASSUMA):
--   1. `artigos_cgibs6` é CHAVE do normative_bundle (JSON), NÃO coluna → usar JSON_SET
--      (o despacho usava `SET artigos_cgibs6 = ...`, que falharia: coluna inexistente).
--   2. valores como STRINGS 'Art. NNN' — deterministic-grounding.ts faz
--      `inArray(ragDocuments.artigo, cgibs6)` e `ragDocuments.artigo` é "Art. NNN";
--      números crus (202) NÃO casariam → CGIBS não seria injetada (quebra silenciosa).
--   3. COALESCE(normative_bundle, JSON_OBJECT()) — defensivo se o bundle estiver NULL.
-- normative_status: → 'confirmed' (entra no grounding determinístico, deterministic-grounding.ts:62).

-- UP
UPDATE risk_categories
SET normative_bundle = JSON_SET(COALESCE(normative_bundle, JSON_OBJECT()), '$.artigos_cgibs6',
      JSON_ARRAY('Art. 202','Art. 203','Art. 204','Art. 205','Art. 206','Art. 207','Art. 208',
                 'Art. 209','Art. 210','Art. 211','Art. 212','Art. 213','Art. 214','Art. 215',
                 'Art. 216','Art. 217','Art. 218')),
    normative_status = 'confirmed'
WHERE codigo = 'aliquota_reduzida';

-- ════════════════════════════════════════════════════════════════════════════════
-- DOWN (rollback — volta ao estado pré-CORR-01):
--   UPDATE risk_categories
--   SET normative_bundle = JSON_SET(normative_bundle, '$.artigos_cgibs6', JSON_ARRAY()),
--       normative_status = 'not_covered_materially'
--   WHERE codigo = 'aliquota_reduzida';
-- (Manus: confirmar via SQL o normative_status real pré-CORR-01 antes de rollback — REGRA-ORQ-37.)
-- ════════════════════════════════════════════════════════════════════════════════
