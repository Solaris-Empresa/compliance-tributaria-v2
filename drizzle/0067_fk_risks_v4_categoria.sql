-- Migration 0067 — GAP-CONTRACT-01
-- FK entre risks_v4.categoria e risk_categories.codigo
-- Garante que nenhum risco pode ter categoria inexistente

ALTER TABLE risks_v4
  ADD CONSTRAINT fk_risks_v4_categoria
  FOREIGN KEY (categoria)
  REFERENCES risk_categories(codigo)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;
