-- Migration 0062 — G11: campo fonte_risco em project_risks_v3
-- Sprint O · Issue #187 · 2026-03-31
-- Adiciona campo fonte_risco VARCHAR(20) NOT NULL DEFAULT 'v1' para rastrear
-- a origem do risco: 'solaris' (pipeline SOLARIS Onda 1), 'cnae' (análise setorial),
-- 'iagen' (IA Generativa Onda 2), 'v1' (pipeline legado questionnaireAnswersV3)
-- Derivado automaticamente de project_gaps_v3.source no momento da persistência.
ALTER TABLE project_risks_v3
  ADD COLUMN fonte_risco VARCHAR(20) NOT NULL DEFAULT 'v1' AFTER source_reference;

-- Backfill: riscos com gap_id → herdar source do gap correspondente
-- Riscos sem gap_id (contextuais) → manter 'v1' (default)
UPDATE project_risks_v3 r
  INNER JOIN project_gaps_v3 g ON r.gap_id = g.id
  SET r.fonte_risco = g.source
  WHERE r.gap_id IS NOT NULL;

-- Registrar no histórico de migrations (aplicado em 2026-03-31)
-- Equivalente Drizzle: campo adicionado em drizzle/schema.ts
