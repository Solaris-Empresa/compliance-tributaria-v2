-- Migration 0124 — SEED-1 (auditoria determinística do briefing, 04/06/2026):
-- corrigir artigo_base da categoria `regime_diferenciado_transporte`.
--
-- Bug: artigo_base = 'Art. 233' + lei_codigo = 'LC-214-2025' (seed mig 0112).
--   Mas Art. 233 da LC 214/2025 trata de SERVIÇOS FINANCEIROS ("alíquotas...
--   sobre os serviços financeiros... operações de crédito das instituições
--   financeiras bancárias") — verificado contra PDF LC 214 (Art. 233).
-- Correto: Art. 157 LC 214 = "Fica isento do IBS e da CBS o fornecimento de
--   serviços de transporte público coletivo de passageiros rodoviário e
--   metroviário urbano" — verificado contra PDF LC 214 (Art. 157). É a base
--   citada pela própria Res. CGIBS 6 Art. 233 ("...(Art. 157 da LC 214/2025)").
--
-- lei_codigo já é 'LC-214-2025' (agora consistente com Art. 157).
-- normative_bundle.artigos_cgibs6 mantém 'Art. 233' (= CGIBS 6 Art. 233,
--   correto para transporte de passageiros — NÃO alterar).
--
-- DML only · idempotente (guarda AND artigo_base='Art. 233') · filename sem
--   "rag"/"cnae" (REGRA-ORQ-FILENAME-01). Ref: SEED-1 · REGRA-ORQ-32.
-- ⚠️ Validação jurídica + aplicação em produção: responsabilidade do Manus/P.O.

UPDATE risk_categories
SET artigo_base = 'Art. 157'
WHERE codigo = 'regime_diferenciado_transporte'
  AND artigo_base = 'Art. 233';

-- DoD verification (executar em staging/prod após aplicar)
SELECT
  codigo,
  artigo_base,
  lei_codigo,
  JSON_EXTRACT(normative_bundle, '$.artigos_cgibs6') AS artigos_cgibs6
FROM risk_categories
WHERE codigo = 'regime_diferenciado_transporte';
-- Esperado: artigo_base = 'Art. 157' · lei_codigo = 'LC-214-2025'
--           · artigos_cgibs6 ainda inclui 'Art. 233'

-- DOWN (rollback):
--   UPDATE risk_categories SET artigo_base = 'Art. 233'
--   WHERE codigo = 'regime_diferenciado_transporte' AND artigo_base = 'Art. 157';
