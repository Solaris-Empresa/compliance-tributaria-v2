-- DOWN para migration 0099 — REVERSÃO COMPLEXA, requer atenção
-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE A reversa: restaurar valores antigos de artigo_base
--   ATENÇÃO: reverte a CORREÇÃO. Use apenas se 0099 introduziu regressão.
-- PARTE B reversa: DROP COLUMN (perde dados normative_bundle/etc)
-- PARTE C reversa: não necessária (colunas serão dropadas)
-- ═══════════════════════════════════════════════════════════════════════════

-- PARTE A inversa — voltar aos valores antigos (intencionalmente errados, vide
-- diagnóstico Bloco C2). Use apenas em rollback de emergência.
UPDATE risk_categories SET artigo_base = 'Art. 9 LC 214/2025',     updated_at = NOW() WHERE codigo = 'split_payment';
UPDATE risk_categories SET artigo_base = 'Art. 58 LC 214/2025',    updated_at = NOW() WHERE codigo = 'credito_presumido';
UPDATE risk_categories SET artigo_base = 'Art. 213 LC 214/2025',   updated_at = NOW() WHERE codigo = 'inscricao_cadastral';
UPDATE risk_categories SET artigo_base = 'Art. 2 LC 214/2025',     updated_at = NOW() WHERE codigo = 'imposto_seletivo';
UPDATE risk_categories SET artigo_base = 'Art. 24 LC 214/2025',    updated_at = NOW() WHERE codigo = 'aliquota_reduzida';
UPDATE risk_categories SET artigo_base = 'Art. 29 LC 214/2025',    updated_at = NOW() WHERE codigo = 'regime_diferenciado';

-- PARTE B inversa — DROP COLUMNS (perde governança normativa)
ALTER TABLE `risk_categories`
  DROP COLUMN `source_basis`,
  DROP COLUMN `normative_status`,
  DROP COLUMN `legal_confidence`,
  DROP COLUMN `nature_type`,
  DROP COLUMN `normative_bundle`;
