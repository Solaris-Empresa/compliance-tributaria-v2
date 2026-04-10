-- Migration 0069 — Sprint Z-11 / DEC-Z11-02
-- Adiciona rastreabilidade de categoria na Onda 2 (IA GEN)
-- Gate TiDB-FK-01: verificar registros inválidos antes de aplicar
-- ---------------------------------------------------------------------------

ALTER TABLE iagen_answers
  ADD COLUMN risk_category_code VARCHAR(64) NULL,
  ADD COLUMN category_assignment_mode
    ENUM('llm_assigned','human_validated') NULL,
  ADD COLUMN used_profile_fields JSON NULL,
  ADD COLUMN prompt_version VARCHAR(20) NULL,
  ADD CONSTRAINT fk_iagen_risk_category
    FOREIGN KEY (risk_category_code)
    REFERENCES risk_categories(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX idx_iagen_category
  ON iagen_answers(risk_category_code);
