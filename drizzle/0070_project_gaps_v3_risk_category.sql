-- Migration 0070 — Sprint Z-11 / formalização
-- Formaliza no journal Drizzle a coluna risk_category_code em project_gaps_v3
-- Coluna já existe no banco (aplicada diretamente durante GATE D Z-11)
-- IF NOT EXISTS garante idempotência
-- ---------------------------------------------------------------------------
ALTER TABLE project_gaps_v3
  ADD COLUMN IF NOT EXISTS risk_category_code VARCHAR(64) NULL;
