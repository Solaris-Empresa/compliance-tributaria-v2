-- Migration: adicionar '180_dias' ao ENUM prazo em action_plans
-- Issue: #579 — fix(migration): prazo 180_dias em action_plans [P0 bloqueador]
-- Sprint: Z-14 | Lote: E
-- RN: RN_PLANOS_TAREFAS_V4.md — prazo = ENUM(30_dias|60_dias|90_dias|180_dias)

ALTER TABLE action_plans
  MODIFY COLUMN prazo
  ENUM('30_dias','60_dias','90_dias','180_dias')
  NOT NULL;
