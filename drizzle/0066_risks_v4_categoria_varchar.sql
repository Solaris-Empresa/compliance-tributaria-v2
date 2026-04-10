-- Migration 0066 — Sprint Z-09 / ADR-0025
-- Remove ENUM hardcoded de risks_v4.categoria
-- Substitui por VARCHAR(100) para suportar categorias configuráveis via banco
-- Depende de: 0065_risk_categories.sql (PR #A) + engine lendo do banco (PR #B)
-- ---------------------------------------------------------------------------

ALTER TABLE risks_v4
  MODIFY COLUMN categoria VARCHAR(100) NOT NULL;
