-- Migration 0071 — Sprint Z-11 / formalização
-- Formaliza no journal Drizzle a coluna descricao em risk_categories
-- Coluna já existe no banco (aplicada diretamente durante sessão Z-11)
-- IF NOT EXISTS garante idempotência
-- ---------------------------------------------------------------------------
ALTER TABLE risk_categories
  ADD COLUMN IF NOT EXISTS descricao TEXT NULL;
