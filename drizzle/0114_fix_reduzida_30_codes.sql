-- Migration 0114 — Reconciliar cnae_codes de regime_diferenciado_aliquota_reduzida_30
-- Decisão P.O. 25/05/2026: lista autoritativa = 5 CNAEs de prod (profissionais liberais Art. 127 §1º II LC 214)
-- Drift: migration 0112 tinha 8 CNAEs (incluía engenharia/labs — menos aderente ao Art. 127)
-- Ref: issue #1242 · REGRA-ORQ-25/26 · Lição #71/#79
-- Filename sem "cnae" (REGRA-ORQ-FILENAME-01 / Lição #92 — evita REGRA 5 migration+RAG hard-block)
-- DML only · idempotente (JSON_SET sobrescreve) · reversível (ver DOWN)

UPDATE risk_categories
SET normative_bundle = JSON_SET(
  normative_bundle,
  '$.cnae_codes',
  JSON_ARRAY('6911-7','6912-5','6920-6','8650-0','8690-9')
)
WHERE codigo = 'regime_diferenciado_aliquota_reduzida_30';

-- DoD verification
SELECT
  codigo,
  JSON_EXTRACT(normative_bundle, '$.cnae_codes') AS cnae_codes,
  JSON_LENGTH(JSON_EXTRACT(normative_bundle, '$.cnae_codes')) AS qtd
FROM risk_categories
WHERE codigo = 'regime_diferenciado_aliquota_reduzida_30';
-- Esperado: ["6911-7","6912-5","6920-6","8650-0","8690-9"] · qtd = 5

-- DOWN (rollback): restaurar a lista de 8 códigos da migration 0112 (estado pré-0114 em main).
-- Reaplica o JSON_ARRAY original do 0112 (advocacia/engenharia/arq/saúde) — reintroduz o drift,
-- usar apenas em rollback. Ver migration 0112 para a lista literal dos 8.
