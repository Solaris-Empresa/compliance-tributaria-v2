-- Migration 0068 — Sprint Z-11 / DEC-Z11-01
-- Adiciona vínculo canônico entre pergunta SOLARIS e categoria de risco
-- Gate TiDB-FK-01: verificar registros inválidos antes de aplicar
-- ---------------------------------------------------------------------------

ALTER TABLE solaris_questions
  ADD COLUMN risk_category_code VARCHAR(64) NULL,
  ADD COLUMN classification_scope ENUM('risk_engine','diagnostic_only')
    NOT NULL DEFAULT 'risk_engine',
  ADD COLUMN mapping_review_status
    ENUM('curated_internal','pending_legal','approved_legal')
    NOT NULL DEFAULT 'curated_internal',
  ADD CONSTRAINT fk_solaris_q_risk_category
    FOREIGN KEY (risk_category_code)
    REFERENCES risk_categories(codigo)
    ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX idx_solaris_q_category
  ON solaris_questions(risk_category_code);
