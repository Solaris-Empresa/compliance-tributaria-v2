-- Migration 0125 — SEED-2 (auditoria determinística do briefing, 04/06/2026):
-- corrigir artigo_base da categoria `aliquota_zero`.
--
-- Bug: artigo_base = 'Art. 14' (seed). Mas Art. 14 da LC 214/2025 trata de
--   "alíquotas do IBS fixadas por lei específica" — NÃO é a base da alíquota
--   zero / isenção de produtos alimentares.
-- Correto: Art. 125 LC 214 = "Cesta Básica Nacional de Alimentos" — base
--   correta da isenção / alíquota zero para produtos alimentares.
--   Confirmado pelo consultor jurídico em 20/05/2026 (memo: Validação
--   Jurídica Completa).
--
-- Escopo: SOMENTE artigo_base. NÃO tocar normative_bundle (despacho P.O.).
--
-- DML only · idempotente (guarda AND artigo_base='Art. 14') · filename sem
--   "rag"/"cnae" (REGRA-ORQ-FILENAME-01). Ref: SEED-2 · Issue #1374 ·
--   mesmo padrão de SEED-1 (mig 0124, PR #1370). REGRA-ORQ-32.
-- ⚠️ Aprovado P.O. 04/06/2026. Aplicação em produção: responsabilidade
--   do Manus/P.O.

UPDATE risk_categories
SET artigo_base = 'Art. 125'
WHERE codigo = 'aliquota_zero'
  AND artigo_base = 'Art. 14';

-- DoD verification (executar em staging/prod após aplicar)
SELECT codigo, artigo_base
FROM risk_categories
WHERE codigo = 'aliquota_zero';
-- Esperado: artigo_base = 'Art. 125'

-- DOWN (rollback):
--   UPDATE risk_categories SET artigo_base = 'Art. 14'
--   WHERE codigo = 'aliquota_zero' AND artigo_base = 'Art. 125';
