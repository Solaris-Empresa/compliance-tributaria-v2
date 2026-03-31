-- Migration 0061 — G17: campo source em project_gaps_v3
-- Sprint N · Issue #259 · 2026-03-31
-- Adiciona campo source VARCHAR(20) NOT NULL DEFAULT 'v1' para distinguir
-- gaps gerados pelo pipeline V1 (questionnaireAnswersV3) dos gaps gerados
-- pelo pipeline SOLARIS (solaris_answers) — G17 integração Onda 1 → gapEngine

ALTER TABLE project_gaps_v3
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'v1' AFTER source_reference;

-- Registrar no histórico de migrations (aplicado manualmente em 2026-03-31)
-- Equivalente Drizzle: campo adicionado em drizzle/schema-compliance-engine-v3.ts
